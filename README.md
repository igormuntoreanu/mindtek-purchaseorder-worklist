# Purchase Orders to Approve

A public **SAP Fiori elements** worklist for approving purchase orders. It uses the List Report in worklist mode and an Object Page, on **SAPUI5 1.136** with the Horizon theme. The data is fictional. There is no SAP system behind it, and anything you approve or reject is forgotten when you reload the page.

This is the same shape as the other MindTek showcase apps (UI5 CLI, `webapp/` layout, an in-browser mock, and a static GitHub Pages deploy). Those apps are OData V2. This one is **OData V4**, because the worklist actions, value help and side effects are V4 features. The mock still runs in the browser, so the published site stays a static `webapp` folder.

## Run locally

```bash
npm install
npm start
```

Opens [http://localhost:8084/index.html](http://localhost:8084/index.html).

Regenerate the sample purchase orders, or check the mock:

```bash
npm run generate-mockdata
npm test
```

## What you can do

- Open **Pending** (the default), **Approved**, **Rejected** or **All**. Pending is sorted with the most urgent due date first.
- Search from the field on the table. There is no filter bar and no variant management.
- Approve or reject one purchase order, or several pending ones together. Reject asks for a reason.
- Open a purchase order for the supplier, the lines, the requester's note and the approval history.

A message strip on the list says that this is sample data.

## Publishing on the MindTek site

The Work page lives in [mindtek](https://github.com/igormuntoreanu/mindtek), not in this repository. Its GitHub Pages workflow checks out each showcase app and copies `webapp/` into the site. To show this app at `https://mindtek-ltd.com/purchaseorder-worklist/`:

1. In `.github/workflows/pages.yml`, check out this repository next to the others:

```yaml
      - uses: actions/checkout@v4
        with:
          repository: igormuntoreanu/mindtek-purchaseorder-worklist
          path: vendor/purchaseorder-worklist
```

2. Copy it into the site output, with the other showcase folders:

```yaml
          mkdir -p dist/purchaseorder-worklist
          cp -a vendor/purchaseorder-worklist/webapp/. dist/purchaseorder-worklist/
```

3. In `webapp/controller/Portfolio.controller.js`, point the Approvals Worklist tile at this app and replace its description:

```javascript
			var sApprovalsUrl = this._showcaseUrl(
				"http://localhost:8084/index.html",
				"https://mindtek-ltd.com/purchaseorder-worklist/"
			);
```

```javascript
					{
						key: "worklist",
						title: "Approvals Worklist",
						floorplan: "Worklist",
						icon: "sap-icon://approvals",
						description: "A Fiori elements Worklist for approving purchase orders: pending items by urgency, a detailed Object Page, and approve or reject with a reason and audit trail.",
						url: sApprovalsUrl
					},
```

The workflow checks out the default branch, so this repository needs the app on `main` before that MindTek build will pick it up. Locally, run this app on port 8084 and the MindTek site on port 8080.
