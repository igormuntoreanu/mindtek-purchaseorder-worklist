sap.ui.define([
	"sap/ui/core/mvc/ControllerExtension",
	"sap/ui/core/Messaging"
], function (ControllerExtension, Messaging) {
	"use strict";

	var TABS = ["Pending", "Approved", "Rejected", "All"];

	/**
	 * Annotations cannot cover three worklist behaviours, so this extension does:
	 * 1. The dismissible demo notice (List Report setCustomMessage).
	 * 2. Emphasised Approve and negative Reject. In this UI5 version the table
	 *    toolbar does not apply DataFieldForAction/Criticality to the button type.
	 * 3. Refresh the visible table and the status-tab counts after an action.
	 *    Fiori elements re-reads a list only when the entity key changes, so a
	 *    status change would leave the purchase order on the Pending tab and
	 *    the other counts would stay stale.
	 */
	return ControllerExtension.extend("mindtek.purchaseorder.worklist.ext.controller.ListReportExt", {
		override: {
			onAfterRendering: function () {
				var extension = this;
				var view = this.base.getView();
				if (!extension._messageListener) {
					extension._messageListener = true;
					extension._seenMessages = {};
					Messaging.getMessageModel().bindList("/").attachChange(function () {
						var changed = false;
						Messaging.getMessageModel().getData().forEach(function (message) {
							var text = message.message || "";
							if (!/Purchase order \d+ (approved|rejected)/.test(text) || extension._seenMessages[text]) {
								return;
							}
							extension._seenMessages[text] = true;
							changed = true;
						});
						if (changed) {
							extension._refreshTables(view);
						}
					});
				}
				extension._whenTablesReady(view, function () {
					extension._showDemoNotice(view);
					extension._styleActions(view);
				});
			}
		},

		_whenTablesReady: function (view, callback) {
			var attempts = 0;
			function attempt() {
				var table = view.byId("fe::table::Pending::LineItem");
				if (table && table.getRowBinding && table.getRowBinding()) {
					callback();
					return;
				}
				attempts += 1;
				if (attempts < 25) {
					setTimeout(attempt, 200);
				}
			}
			attempt();
		},

		_showDemoNotice: function (view) {
			if (this._demoNoticeShown) {
				return;
			}
			var extension = this;
			var bundle = view.getModel("i18n").getResourceBundle();
			var apply = function (resourceBundle) {
				if (extension._demoNoticeShown) {
					return;
				}
				extension._demoNoticeShown = true;
				extension.base.getExtensionAPI().setCustomMessage({
					message: resourceBundle.getText("demoNotice"),
					type: "Information"
				});
			};
			if (bundle && typeof bundle.then === "function") {
				bundle.then(apply);
			} else {
				apply(bundle);
			}
		},

		_styleActions: function (view) {
			TABS.forEach(function (tab) {
				var approve = view.byId("fe::table::" + tab + "::LineItem::DataFieldForAction::PO.Approve");
				var reject = view.byId("fe::table::" + tab + "::LineItem::DataFieldForAction::PO.Reject");
				if (approve) {
					approve.setType("Emphasized");
				}
				if (reject) {
					reject.setType("Reject");
				}
			});
		},

		_refreshTables: function (view) {
			TABS.forEach(function (tab) {
				var table = view.byId("fe::table::" + tab + "::LineItem");
				var binding = table && table.getRowBinding && table.getRowBinding();
				if (binding) {
					binding.refresh();
				}
			});
			// Tab badges are not list bindings. Inactive tables have no row binding yet,
			// and Fiori elements only reloads a list when the entity key changes.
			var tabs = view.byId("fe::TabMultipleMode::Control");
			if (tabs && tabs.refreshTabsCount) {
				tabs.refreshTabsCount();
			}
		}
	});
});
