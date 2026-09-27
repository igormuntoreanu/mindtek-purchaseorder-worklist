"use strict";

var path = require("path");
var fs = require("fs");

var engineModule;
global.sap = {
	ui: {
		define: function (deps, factory) {
			engineModule = factory();
		}
	}
};
require("../webapp/localService/engine.js");
var dataDir = path.join(__dirname, "..", "webapp", "localService", "mockdata");

function read(name) {
	return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
}

function create() {
	return engineModule.createEngine({
		metadataXml: "<edmx>test</edmx>",
		today: "2026-09-27",
		purchaseOrders: read("PurchaseOrder.json"),
		items: read("PurchaseOrderItem.json"),
		suppliers: read("Supplier.json"),
		approvalSteps: read("ApprovalStep.json"),
		rejectionReasons: read("RejectionReason.json")
	});
}

function json(response) {
	if (response.status >= 400) {
		throw new Error(response.status + " " + response.body);
	}
	return JSON.parse(response.body);
}

var failures = 0;

function assert(condition, message) {
	if (!condition) {
		failures++;
		console.error("FAIL: " + message);
	}
}

var engine = create();
var root = engineModule.SERVICE_ROOT;

var pending = json(engine.handle("GET", root + "PurchaseOrder?$count=true&$filter=Status eq 'Pending'&$orderby=DueBy asc,PurchaseOrder asc"));
assert(pending["@odata.count"] === 18, "expected 18 pending, got " + pending["@odata.count"]);
assert(pending.value[0].PurchaseOrder === "4500001216", "most overdue pending PO should be first, got " + pending.value[0].PurchaseOrder);
assert(pending.value[0].DueCriticality === 1, "overdue due criticality should be 1");
assert(pending.value.every(function (row, index) {
	if (!index) {
		return true;
	}
	return pending.value[index - 1].DueBy <= row.DueBy;
}), "pending rows should be sorted by due date");

var dueToday = pending.value.filter(function (row) {
	return row.PurchaseOrder === "4500001202";
})[0];
assert(dueToday && dueToday.DueCriticality === 2, "due today should be criticality 2");
var dueLater = pending.value.filter(function (row) {
	return row.PurchaseOrder === "4500001210";
})[0];
assert(dueLater && dueLater.DueCriticality === 0, "due in 3 days should be criticality 0");

pending.value.forEach(function (row) {
	var amount = Number(row.NetValue);
	assert(amount >= 250 && amount <= 180000, row.PurchaseOrder + " net value out of range: " + row.NetValue);
	assert(row.Currency === "GBP", "currency should be GBP");
});

var searched = json(engine.handle("GET", root + "PurchaseOrder?$search=Northbridge&$count=true"));
assert(searched["@odata.count"] >= 1, "search should find Northbridge");
assert(searched.value.every(function (row) {
	return row.SupplierName.indexOf("Northbridge") !== -1;
}), "search results should match the supplier");

var detail = json(engine.handle("GET", root + "PurchaseOrder('4500001208')?$expand=Items,Supplier,ApprovalHistory"));
assert(detail.Items.length === 6, "lab PO should have 6 items, got " + detail.Items.length);
assert(detail.Supplier.City === "Cambridge", "supplier city should expand");
assert(detail.ApprovalHistory.length === 1, "pending PO should have the submitted step");
assert(detail.Items[0].NetValue === "2520.00", "item net value should be a decimal string");

var count = engine.handle("GET", root + "PurchaseOrder/$count?$filter=Status eq 'Approved'");
assert(count.body === "4", "approved count should be 4, got " + count.body);

var reasons = json(engine.handle("GET", root + "RejectionReason"));
assert(reasons.value.length === 5, "expected 5 rejection reasons");

var missingReason = engine.handle("POST", root + "PurchaseOrder('4500001201')/mindtek.poapproval.Reject", "{}");
assert(missingReason.status === 400, "reject without a reason should be 400");

var rejected = json(engine.handle("POST", root + "PurchaseOrder('4500001201')/mindtek.poapproval.Reject", JSON.stringify({
	ReasonCode: "BUDGET",
	Comment: "Waiting for the revised forecast."
})));
assert(rejected.Status === "Rejected", "status should become Rejected");
assert(rejected.IsPending === false, "rejected PO is no longer pending");
assert(rejected.ApprovalHistory.length === 2, "rejection should add a history row");
assert(rejected.ApprovalHistory[1].Comment.indexOf("Budget exceeded") === 0, "history should start with the reason");
assert(rejected.ApprovalHistory[1].Approver === "Alex Morgan", "approver should be Alex Morgan");
var rejectHeader = missingReason.headers ? null : null;
var rejectResponse = engine.getState();
assert(rejectResponse, "state should still be available");

var approvedCall = engine.handle("POST", root + "PurchaseOrder('4500001202')/Approve", JSON.stringify({ Comment: "Agreed with the buyer." }));
var approved = json(approvedCall);
assert(approved.Status === "Approved", "status should become Approved");
assert(approvedCall.headers["sap-messages"].indexOf("Purchase order 4500001202 approved") !== -1, "success message should name the purchase order");

var again = engine.handle("POST", root + "PurchaseOrder('4500001202')/Approve", "{}");
assert(again.status === 409, "approving a non-pending PO should be rejected");

var pendingAfter = engine.handle("GET", root + "PurchaseOrder/$count?$filter=Status eq 'Pending'");
assert(pendingAfter.body === "16", "two actions should leave 16 pending, got " + pendingAfter.body);

var boundary = "batch_test";
var batchBody = [
	"--" + boundary,
	"Content-Type: application/http",
	"Content-Transfer-Encoding: binary",
	"",
	"GET PurchaseOrder?$filter=Status eq 'Rejected'&$count=true&$top=1 HTTP/1.1",
	"Accept: application/json",
	"",
	"--" + boundary,
	"Content-Type: multipart/mixed; boundary=changeset_test",
	"",
	"--changeset_test",
	"Content-Type: application/http",
	"Content-Transfer-Encoding: binary",
	"Content-ID: 0.0",
	"",
	"POST PurchaseOrder('4500001203')/mindtek.poapproval.Approve HTTP/1.1",
	"Content-Type: application/json",
	"",
	JSON.stringify({ Comment: "" }),
	"--changeset_test--",
	"--" + boundary + "--",
	""
].join("\r\n");

var batch = engine.handle("POST", root + "$batch", batchBody, {
	"Content-Type": "multipart/mixed; boundary=" + boundary
});
assert(batch.status === 200, "batch should succeed");
assert(batch.body.indexOf("4500001203") !== -1, "batch should contain the approved purchase order");
assert(batch.headers["Content-Type"].indexOf("multipart/mixed") === 0, "batch response should be multipart");
assert(engine.getState().purchaseOrders.filter(function (po) {
	return po.PurchaseOrder === "4500001203";
})[0].Status === "Approved", "changeset approve should update the purchase order");

engine.reset("2026-09-27");
var resetCount = engine.handle("GET", root + "PurchaseOrder/$count?$filter=Status eq 'Pending'");
assert(resetCount.body === "18", "reset should restore the sample data, got " + resetCount.body);

var metadata = engine.handle("GET", root + "$metadata");
assert(metadata.body.indexOf("edmx") !== -1, "metadata should be served");

if (failures) {
	console.error(failures + " assertion(s) failed");
	process.exit(1);
}
console.log("OData engine checks passed");
