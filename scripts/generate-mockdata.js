"use strict";

var fs = require("fs");
var path = require("path");

var OUT = path.join(__dirname, "..", "webapp", "localService", "mockdata");

var ORG = "MTPO — MindTek Purchasing UK";
var COMPANY = "MT01 — MindTek Ltd";
var GROUPS = {
	P01: "P01 — Direct materials",
	P02: "P02 — Indirect",
	P03: "P03 — Services"
};
var TERMS = {
	NT14: "Payable within 14 days",
	NT30: "Payable within 30 days",
	NT45: "Payable within 45 days"
};
var INCO = {
	DAP: "DAP — delivered at place",
	EXW: "EXW — ex works",
	FCA: "FCA — free carrier"
};
var SITES = {
	manchester: "MindTek Ltd, Unit 4 Wharf Lane, Manchester M3 4LQ",
	birmingham: "MindTek Ltd, 18 Canal Street, Birmingham B1 2HJ",
	london: "MindTek Ltd, 7 Coppergate Walk, London EC2A 4BX",
	leeds: "MindTek Ltd, 22 Calls Landing, Leeds LS1 4AW",
	bristol: "MindTek Ltd, 9 Harbour Road, Bristol BS1 6AH"
};
var PLANTS = {
	manchester: "Manchester (GB02)",
	birmingham: "Birmingham (GB03)",
	london: "London (GB01)",
	leeds: "Leeds (GB04)",
	bristol: "Bristol (GB05)"
};

var suppliers = [
	{ SupplierID: "SUP001", Name: "Northbridge Office Supplies", Contact: "Jane Holt", Email: "jane.holt@northbridge-supplies.example", City: "Leeds", Country: "United Kingdom" },
	{ SupplierID: "SUP002", Name: "Calder & Wren Packaging", Contact: "Owen Price", Email: "owen.price@calderwren.example", City: "Bristol", Country: "United Kingdom" },
	{ SupplierID: "SUP003", Name: "Harrowfield Industrial", Contact: "Amira Khan", Email: "amira.khan@harrowfield.example", City: "Birmingham", Country: "United Kingdom" },
	{ SupplierID: "SUP004", Name: "Pembroke Print Studio", Contact: "Evan Rees", Email: "evan.rees@pembroke-print.example", City: "Cardiff", Country: "United Kingdom" },
	{ SupplierID: "SUP005", Name: "Ashcombe Facilities", Contact: "Helen Ward", Email: "helen.ward@ashcombe-facilities.example", City: "Reading", Country: "United Kingdom" },
	{ SupplierID: "SUP006", Name: "Rivermead Catering", Contact: "Sam Iqbal", Email: "sam.iqbal@rivermead-catering.example", City: "Oxford", Country: "United Kingdom" },
	{ SupplierID: "SUP007", Name: "Thornbury Safety Gear", Contact: "Luke Byrne", Email: "luke.byrne@thornbury-safety.example", City: "Sheffield", Country: "United Kingdom" },
	{ SupplierID: "SUP008", Name: "Loxley Laboratory", Contact: "Nina Patel", Email: "nina.patel@loxley-lab.example", City: "Cambridge", Country: "United Kingdom" },
	{ SupplierID: "SUP009", Name: "Greystone Maintenance", Contact: "Paul Adey", Email: "paul.adey@greystone-maintenance.example", City: "Nottingham", Country: "United Kingdom" },
	{ SupplierID: "SUP010", Name: "Whitlow Electrical", Contact: "Rachel Moss", Email: "rachel.moss@whitlow-electrical.example", City: "Newcastle", Country: "United Kingdom" },
	{ SupplierID: "SUP011", Name: "Marlowe Stationery", Contact: "Chris Nolan", Email: "chris.nolan@marlowe-stationery.example", City: "Norwich", Country: "United Kingdom" },
	{ SupplierID: "SUP012", Name: "Fenwick Logistics", Contact: "Grace Cole", Email: "grace.cole@fenwick-logistics.example", City: "Southampton", Country: "United Kingdom" }
];

function supplierName(id) {
	return suppliers.filter(function (supplier) {
		return supplier.SupplierID === id;
	})[0].Name;
}

function item(no, material, description, qty, unit, price, plant, deliveryOffset) {
	return {
		ItemNumber: no,
		Material: material,
		Description: description,
		Quantity: qty,
		QuantityUnit: unit,
		NetPrice: price,
		Plant: plant,
		DeliveryOffset: deliveryOffset
	};
}

function po(def) {
	return {
		PurchaseOrder: def.id,
		SupplierID: def.supplier,
		SupplierName: supplierName(def.supplier),
		RequestedBy: def.by,
		RequestOffset: def.request,
		CostCentre: def.cost,
		DueOffset: def.due,
		DeliveryOffset: def.delivery,
		Priority: def.priority,
		Status: def.status,
		PurchasingOrganisation: ORG,
		PurchasingGroup: GROUPS[def.group],
		CompanyCode: COMPANY,
		PaymentTerms: TERMS[def.terms],
		Incoterms: INCO[def.inco],
		DeliveryAddress: SITES[def.site],
		Notes: def.notes,
		items: def.items,
		rejectComment: def.rejectComment || ""
	};
}

var orders = [
	po({
		id: "4500001201", supplier: "SUP001", by: "Priya Shah", request: -9, due: -4, delivery: 12,
		cost: "CC2100 — Operations", priority: "High", status: "Pending", group: "P02", terms: "NT30", inco: "DAP", site: "manchester",
		notes: "The Manchester office has run out of paper and toner. Please approve so the replenishment can leave Leeds this week.",
		items: [
			item("00010", "MAT-4401", "A4 recycled copy paper, box of 5 reams", 40, "EA", 18.5, PLANTS.manchester, 12),
			item("00020", "MAT-4408", "Black toner cartridge", 24, "EA", 62, PLANTS.manchester, 12),
			item("00030", "MAT-4412", "Desk trays, set of 3", 30, "SET", 14.75, PLANTS.manchester, 14)
		]
	}),
	po({
		id: "4500001202", supplier: "SUP002", by: "Owen Clarke", request: -5, due: 0, delivery: 7,
		cost: "CC2100 — Operations", priority: "High", status: "Pending", group: "P01", terms: "NT30", inco: "DAP", site: "bristol",
		notes: "Outbound cartons for the Bristol despatch lane. The current stock covers only two more working days.",
		items: [
			item("00010", "PKG-2201", "Corrugated outer carton, 400 x 300 x 200 mm", 2000, "EA", 4.85, PLANTS.bristol, 7),
			item("00020", "PKG-2214", "Pallet stretch wrap, 400 mm", 200, "EA", 13.5, PLANTS.bristol, 7)
		]
	}),
	po({
		id: "4500001203", supplier: "SUP003", by: "Hannah Brooks", request: -6, due: 1, delivery: 21,
		cost: "CC3300 — IT", priority: "High", status: "Pending", group: "P02", terms: "NT30", inco: "DAP", site: "birmingham",
		notes: "Replacement laptops for the Birmingham project team. The old devices are out of support at the end of the month.",
		items: [
			item("00010", "IT-1104", "14 inch laptop, 16 GB", 60, "EA", 1150, PLANTS.birmingham, 21),
			item("00020", "IT-1180", "27 inch monitor", 60, "EA", 220, PLANTS.birmingham, 21),
			item("00030", "IT-1202", "USB-C docking station", 60, "EA", 165, PLANTS.birmingham, 21),
			item("00040", "IT-1308", "Noise-cancelling headset", 80, "EA", 72, PLANTS.birmingham, 18)
		]
	}),
	po({
		id: "4500001204", supplier: "SUP004", by: "Lewis Grant", request: -4, due: 2, delivery: 16,
		cost: "CC1000 — Marketing", priority: "Medium", status: "Pending", group: "P02", terms: "NT30", inco: "DAP", site: "london",
		notes: "Print for the autumn customer event. Artwork is signed off and the printer needs the order today to hold the slot.",
		items: [
			item("00010", "PRN-3002", "A5 brochure, 16 pages, full colour", 8000, "EA", 0.28, PLANTS.london, 16),
			item("00020", "PRN-3044", "A1 poster set", 40, "SET", 22.75, PLANTS.london, 16)
		]
	}),
	po({
		id: "4500001205", supplier: "SUP005", by: "Megan Walsh", request: -8, due: -1, delivery: 10,
		cost: "CC4400 — Facilities", priority: "Medium", status: "Pending", group: "P03", terms: "NT30", inco: "DAP", site: "manchester",
		notes: "Refurbishment of the second-floor meeting rooms. The contractor can start next week if this is approved.",
		items: [
			item("00010", "FAC-5001", "Planned maintenance visit", 1, "EA", 8400, PLANTS.manchester, 10),
			item("00020", "FAC-5110", "LED panel light", 120, "EA", 62, PLANTS.manchester, 10),
			item("00030", "FAC-5204", "Carpet tile", 400, "EA", 22.5, PLANTS.manchester, 12),
			item("00040", "FAC-5302", "Emulsion paint, 10 litres", 60, "EA", 28, PLANTS.manchester, 8),
			item("00050", "FAC-5408", "Door closer", 24, "EA", 45, PLANTS.manchester, 10)
		]
	}),
	po({
		id: "4500001206", supplier: "SUP006", by: "Tom Adeyemi", request: -2, due: 5, delivery: 6,
		cost: "CC2100 — Operations", priority: "Low", status: "Pending", group: "P03", terms: "NT14", inco: "DAP", site: "leeds",
		notes: "Working lunch for the shift handover briefing in Leeds.",
		items: [
			item("00010", "CAT-0104", "Working lunch for 40 people", 1, "EA", 890, PLANTS.leeds, 6)
		]
	}),
	po({
		id: "4500001207", supplier: "SUP007", by: "Sophie Kerr", request: -3, due: 1, delivery: 5,
		cost: "CC4400 — Facilities", priority: "High", status: "Pending", group: "P01", terms: "NT14", inco: "DAP", site: "birmingham",
		notes: "Personal protective equipment for the new warehouse starters. Induction is on Thursday.",
		items: [
			item("00010", "SAF-2101", "Safety boots", 80, "EA", 48, PLANTS.birmingham, 5),
			item("00020", "SAF-2144", "Hi-vis jacket", 60, "EA", 26, PLANTS.birmingham, 5),
			item("00030", "SAF-2180", "Cut-resistant gloves, box of 12", 40, "BOX", 21, PLANTS.birmingham, 5)
		]
	}),
	po({
		id: "4500001208", supplier: "SUP008", by: "Daniel Okonkwo", request: -14, due: -8, delivery: 20,
		cost: "CC5500 — Research", priority: "High", status: "Pending", group: "P01", terms: "NT30", inco: "FCA", site: "london",
		notes: "Laboratory equipment for the materials trial. The centrifuge has a 3-week lead time, so this is already late.",
		items: [
			item("00010", "LAB-1002", "Pipette set", 6, "SET", 420, PLANTS.london, 14),
			item("00020", "LAB-1118", "Laboratory solvent, 2.5 litres", 20, "EA", 85, PLANTS.london, 10),
			item("00030", "LAB-1204", "Assay kit", 40, "EA", 310, PLANTS.london, 18),
			item("00040", "LAB-1306", "Glassware set", 15, "SET", 96, PLANTS.london, 12),
			item("00050", "LAB-1410", "Lab coat", 30, "EA", 38, PLANTS.london, 8),
			item("00060", "LAB-1502", "Benchtop centrifuge", 2, "EA", 11000, PLANTS.london, 20)
		]
	}),
	po({
		id: "4500001209", supplier: "SUP009", by: "Freya Bennett", request: -1, due: 10, delivery: 14,
		cost: "CC4400 — Facilities", priority: "Low", status: "Pending", group: "P03", terms: "NT30", inco: "DAP", site: "manchester",
		notes: "Quarterly grounds contract for the Manchester site, covering October to December.",
		items: [
			item("00010", "GRD-3001", "Grounds maintenance, October to December", 1, "EA", 15750, PLANTS.manchester, 14)
		]
	}),
	po({
		id: "4500001210", supplier: "SUP010", by: "Callum Hughes", request: -4, due: 3, delivery: 11,
		cost: "CC3300 — IT", priority: "Medium", status: "Pending", group: "P03", terms: "NT30", inco: "DAP", site: "leeds",
		notes: "Electrical fit-out of the new comms room in Leeds. The racks arrive next week.",
		items: [
			item("00010", "ELC-4008", "Data cable drum, 305 m", 8, "EA", 240, PLANTS.leeds, 11),
			item("00020", "ELC-4120", "Distribution board", 4, "EA", 890, PLANTS.leeds, 11),
			item("00030", "ELC-4202", "LED batten", 30, "EA", 75, PLANTS.leeds, 9),
			item("00040", "ELC-4315", "Cable trunking, 3 m", 50, "EA", 45, PLANTS.leeds, 9)
		]
	}),
	po({
		id: "4500001211", supplier: "SUP011", by: "Priya Shah", request: -2, due: 0, delivery: 4,
		cost: "CC1000 — Marketing", priority: "Medium", status: "Pending", group: "P02", terms: "NT14", inco: "DAP", site: "london",
		notes: "Notebooks for the visitor workshop on Friday. A small order, but the cupboard is empty.",
		items: [
			item("00010", "STA-0108", "A5 hardcover notebook", 40, "EA", 10.5, PLANTS.london, 4)
		]
	}),
	po({
		id: "4500001212", supplier: "SUP012", by: "Owen Clarke", request: -7, due: -2, delivery: 3,
		cost: "CC2100 — Operations", priority: "High", status: "Pending", group: "P03", terms: "NT30", inco: "FCA", site: "bristol",
		notes: "Inbound freight for the container arriving at Southampton. The haulier will not collect it without a purchase order.",
		items: [
			item("00010", "LOG-6001", "Inbound road freight, Southampton to Bristol", 1, "EA", 62300, PLANTS.bristol, 3)
		]
	}),
	po({
		id: "4500001213", supplier: "SUP001", by: "Hannah Brooks", request: -2, due: 14, delivery: 9,
		cost: "CC6600 — Finance", priority: "Low", status: "Pending", group: "P02", terms: "NT30", inco: "DAP", site: "london",
		notes: "Archive boxes and files for the year-end store. There is no urgency beyond this month.",
		items: [
			item("00010", "STA-2204", "Archive box with lid", 80, "EA", 8.5, PLANTS.london, 9),
			item("00020", "STA-2218", "Lever arch file, pack of 10", 20, "EA", 25, PLANTS.london, 9)
		]
	}),
	po({
		id: "4500001214", supplier: "SUP002", by: "Lewis Grant", request: -3, due: 2, delivery: 8,
		cost: "CC2100 — Operations", priority: "Medium", status: "Pending", group: "P01", terms: "NT30", inco: "DAP", site: "manchester",
		notes: "Extra cartons and tape for the month-end promotion pack.",
		items: [
			item("00010", "PKG-2302", "Postal carton, 300 x 200 x 150 mm", 1200, "EA", 4.2, PLANTS.manchester, 8),
			item("00020", "PKG-2406", "Buff packing tape, pack of 6", 200, "EA", 18, PLANTS.manchester, 8)
		]
	}),
	po({
		id: "4500001215", supplier: "SUP003", by: "Megan Walsh", request: -6, due: 6, delivery: 28,
		cost: "CC3300 — IT", priority: "Medium", status: "Pending", group: "P01", terms: "NT45", inco: "DAP", site: "london",
		notes: "Server refresh for the London computer room. Quotes were compared and this is the agreed configuration.",
		items: [
			item("00010", "IT-8001", "Rack server", 4, "EA", 18500, PLANTS.london, 28),
			item("00020", "IT-8104", "Storage array", 2, "EA", 22000, PLANTS.london, 28),
			item("00030", "IT-8208", "Network switch, 48 port", 8, "EA", 2400, PLANTS.london, 21),
			item("00040", "IT-8302", "Server rack, 42U", 4, "EA", 3100, PLANTS.london, 21),
			item("00050", "IT-8406", "Uninterruptible power supply", 2, "EA", 2200, PLANTS.london, 21)
		]
	}),
	po({
		id: "4500001216", supplier: "SUP004", by: "Tom Adeyemi", request: -18, due: -12, delivery: 7,
		cost: "CC1000 — Marketing", priority: "Low", status: "Pending", group: "P02", terms: "NT30", inco: "DAP", site: "leeds",
		notes: "Event banners for the careers fair. The request was missed in the last approval cycle.",
		items: [
			item("00010", "PRN-4102", "Roller banner, 2 m", 8, "EA", 255, PLANTS.leeds, 7)
		]
	}),
	po({
		id: "4500001217", supplier: "SUP005", by: "Sophie Kerr", request: -5, due: 4, delivery: 9,
		cost: "CC4400 — Facilities", priority: "High", status: "Pending", group: "P03", terms: "NT14", inco: "EXW", site: "birmingham",
		notes: "Boiler parts for Birmingham. The heat exchanger is failing and the building has no backup.",
		items: [
			item("00010", "FAC-6101", "Annual boiler service", 1, "EA", 2400, PLANTS.birmingham, 4),
			item("00020", "FAC-6120", "Heat exchanger", 1, "EA", 8600, PLANTS.birmingham, 9),
			item("00030", "FAC-6144", "Circulating pump", 2, "EA", 2750, PLANTS.birmingham, 9),
			item("00040", "FAC-6160", "Isolation valve", 10, "EA", 300, PLANTS.birmingham, 6)
		]
	}),
	po({
		id: "4500001218", supplier: "SUP006", by: "Daniel Okonkwo", request: -2, due: 1, delivery: 2,
		cost: "CC2100 — Operations", priority: "Medium", status: "Pending", group: "P03", terms: "NT14", inco: "DAP", site: "manchester",
		notes: "Catering for the operations away day. The headcount is confirmed at 80.",
		items: [
			item("00010", "CAT-0208", "Away-day catering for 80 people", 1, "EA", 3360, PLANTS.manchester, 2)
		]
	}),
	po({
		id: "4500001219", supplier: "SUP007", by: "Freya Bennett", request: -12, due: -6, delivery: 4,
		cost: "CC4400 — Facilities", priority: "Low", status: "Approved", group: "P02", terms: "NT30", inco: "DAP", site: "leeds",
		notes: "Hearing and eye protection for the Leeds workshop.",
		items: [
			item("00010", "SAF-3102", "Ear defenders", 100, "EA", 18, PLANTS.leeds, 4),
			item("00020", "SAF-3128", "Safety glasses", 120, "EA", 27.5, PLANTS.leeds, 4)
		]
	}),
	po({
		id: "4500001220", supplier: "SUP008", by: "Callum Hughes", request: -10, due: -3, delivery: 18,
		cost: "CC5500 — Research", priority: "Medium", status: "Approved", group: "P01", terms: "NT30", inco: "DAP", site: "london",
		notes: "Microscope and calibration for the inspection bench.",
		items: [
			item("00010", "LAB-2104", "Inspection microscope", 1, "EA", 14500, PLANTS.london, 18),
			item("00020", "LAB-2140", "Slide and coverslip pack", 20, "EA", 65, PLANTS.london, 8),
			item("00030", "LAB-2188", "Annual calibration visit", 1, "EA", 7000, PLANTS.london, 12)
		]
	}),
	po({
		id: "4500001221", supplier: "SUP009", by: "Priya Shah", request: -9, due: 8, delivery: 6,
		cost: "CC4400 — Facilities", priority: "Low", status: "Approved", group: "P03", terms: "NT30", inco: "DAP", site: "bristol",
		notes: "Roof inspection and local repairs after the last storm.",
		items: [
			item("00010", "GRD-4102", "Roof inspection and repair", 1, "EA", 7450, PLANTS.bristol, 6)
		]
	}),
	po({
		id: "4500001222", supplier: "SUP010", by: "Owen Clarke", request: -8, due: -1, delivery: 10,
		cost: "CC3300 — IT", priority: "Medium", status: "Approved", group: "P03", terms: "NT30", inco: "DAP", site: "manchester",
		notes: "Emergency lighting on the Manchester mezzanine.",
		items: [
			item("00010", "ELC-5104", "Emergency light fitting", 16, "EA", 180, PLANTS.manchester, 10),
			item("00020", "ELC-5180", "Installation", 40, "H", 208, PLANTS.manchester, 10)
		]
	}),
	po({
		id: "4500001223", supplier: "SUP011", by: "Hannah Brooks", request: -7, due: -2, delivery: 5,
		cost: "CC1000 — Marketing", priority: "Low", status: "Rejected", group: "P02", terms: "NT14", inco: "DAP", site: "london",
		notes: "Branded notebooks for a campaign that has since been cancelled.",
		rejectComment: "Budget exceeded",
		items: [
			item("00010", "STA-3301", "Branded notebook", 80, "EA", 12.5, PLANTS.london, 5),
			item("00020", "STA-3314", "Branded pen, box of 50", 40, "BOX", 16, PLANTS.london, 5)
		]
	}),
	po({
		id: "4500001224", supplier: "SUP012", by: "Lewis Grant", request: -6, due: 2, delivery: 4,
		cost: "CC2100 — Operations", priority: "High", status: "Rejected", group: "P03", terms: "NT30", inco: "FCA", site: "bristol",
		notes: "Second freight booking for the same container. Raised in error alongside 4500001212.",
		rejectComment: "Duplicate request",
		items: [
			item("00010", "LOG-6102", "Road freight, Southampton to Bristol", 1, "EA", 48000, PLANTS.bristol, 4)
		]
	}),
	po({
		id: "4500001225", supplier: "SUP001", by: "Megan Walsh", request: -5, due: 3, delivery: 6,
		cost: "CC6600 — Finance", priority: "Low", status: "Rejected", group: "P02", terms: "NT30", inco: "DAP", site: "london",
		notes: "Binders requested against the finance cost centre. The cost belongs to marketing.",
		rejectComment: "Wrong cost centre",
		items: [
			item("00010", "STA-4402", "Presentation binder, pack of 10", 60, "EA", 16, PLANTS.london, 6)
		]
	})
];

function round2(n) {
	return Math.round(n * 100) / 100;
}

var purchaseOrders = [];
var items = [];
var steps = [];

orders.forEach(function (order) {
	var net = 0;
	order.items.forEach(function (line) {
		var value = round2(line.Quantity * line.NetPrice);
		net += value;
		items.push({
			PurchaseOrder: order.PurchaseOrder,
			ItemNumber: line.ItemNumber,
			Material: line.Material,
			Description: line.Description,
			Quantity: line.Quantity,
			QuantityUnit: line.QuantityUnit,
			NetPrice: line.NetPrice,
			Plant: line.Plant,
			DeliveryOffset: line.DeliveryOffset
		});
	});
	net = round2(net);
	if (net < 250 || net > 180000) {
		throw new Error(order.PurchaseOrder + " net value " + net + " is outside GBP 250 to 180,000");
	}
	if (order.items.length < 1 || order.items.length > 6) {
		throw new Error(order.PurchaseOrder + " has " + order.items.length + " items");
	}
	var header = Object.assign({}, order);
	delete header.items;
	delete header.rejectComment;
	purchaseOrders.push(header);

	steps.push({
		ID: order.PurchaseOrder + "-1",
		PurchaseOrder: order.PurchaseOrder,
		Step: 1,
		Approver: order.RequestedBy,
		Action: "Submitted",
		ChangedOffset: order.RequestOffset,
		ChangedTime: "08:30:00",
		Comment: "Submitted for approval."
	});
	if (order.Status === "Approved") {
		steps.push({
			ID: order.PurchaseOrder + "-2",
			PurchaseOrder: order.PurchaseOrder,
			Step: 2,
			Approver: "Alex Morgan",
			Action: "Approved",
			ChangedOffset: order.RequestOffset + 1,
			ChangedTime: "14:05:00",
			Comment: "Approved."
		});
	}
	if (order.Status === "Rejected") {
		steps.push({
			ID: order.PurchaseOrder + "-2",
			PurchaseOrder: order.PurchaseOrder,
			Step: 2,
			Approver: "Alex Morgan",
			Action: "Rejected",
			ChangedOffset: order.RequestOffset + 1,
			ChangedTime: "11:20:00",
			Comment: order.rejectComment
		});
	}
});

var reasons = [
	{ ReasonCode: "BUDGET", Description: "Budget exceeded" },
	{ ReasonCode: "COSTCENTRE", Description: "Wrong cost centre" },
	{ ReasonCode: "PRICE", Description: "Price not agreed" },
	{ ReasonCode: "DUPLICATE", Description: "Duplicate request" },
	{ ReasonCode: "OTHER", Description: "Other" }
];

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "PurchaseOrder.json"), JSON.stringify(purchaseOrders, null, "\t") + "\n");
fs.writeFileSync(path.join(OUT, "PurchaseOrderItem.json"), JSON.stringify(items, null, "\t") + "\n");
fs.writeFileSync(path.join(OUT, "Supplier.json"), JSON.stringify(suppliers, null, "\t") + "\n");
fs.writeFileSync(path.join(OUT, "ApprovalStep.json"), JSON.stringify(steps, null, "\t") + "\n");
fs.writeFileSync(path.join(OUT, "RejectionReason.json"), JSON.stringify(reasons, null, "\t") + "\n");

var counts = purchaseOrders.reduce(function (acc, order) {
	acc[order.Status] = (acc[order.Status] || 0) + 1;
	return acc;
}, {});
console.log("Wrote " + purchaseOrders.length + " purchase orders", counts);
