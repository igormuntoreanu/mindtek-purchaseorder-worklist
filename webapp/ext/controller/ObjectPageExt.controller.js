sap.ui.define([
	"sap/ui/core/mvc/ControllerExtension"
], function (ControllerExtension) {
	"use strict";

	/**
	 * Criticality Positive on the object-page action becomes an Accept button.
	 * This approval step should be the emphasised primary action, matching the list.
	 */
	return ControllerExtension.extend("mindtek.purchaseorder.worklist.ext.controller.ObjectPageExt", {
		override: {
			onAfterRendering: function () {
				var view = this.base.getView();
				var attempts = 0;
				function style() {
					var approve = view.byId("fe::DataFieldForAction::PO.Approve");
					if (approve) {
						approve.setType("Emphasized");
						return;
					}
					attempts += 1;
					if (attempts < 20) {
						setTimeout(style, 200);
					}
				}
				style();
			}
		}
	});
});
