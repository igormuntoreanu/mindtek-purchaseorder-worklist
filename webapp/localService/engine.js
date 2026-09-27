sap.ui.define([], function () {
	"use strict";

	var SERVICE_ROOT = "/sap/opu/odata4/sap/po_approval/srvd/sap/poapproval/0001/";
	var DECIMAL_SCALE_2 = {
		PurchaseOrder: { NetValue: true },
		PurchaseOrderItem: { NetPrice: true, NetValue: true }
	};

	function clone(value) {
		return JSON.parse(JSON.stringify(value));
	}

	function pad(n) {
		return n < 10 ? "0" + n : String(n);
	}

	function todayISO(date) {
		var d = date || new Date();
		return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
	}

	function addDays(iso, days) {
		var parts = iso.split("-");
		var date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
		date.setUTCDate(date.getUTCDate() + days);
		return date.toISOString().slice(0, 10);
	}

	function round2(n) {
		return Math.round(n * 100) / 100;
	}

	function money(n) {
		return round2(n).toFixed(2);
	}

	function quantityString(n) {
		var rounded = Math.round(n * 1000) / 1000;
		return String(rounded);
	}

	function jsonHeaders(extra) {
		var headers = {
			"Content-Type": "application/json;odata.metadata=minimal;IEEE754Compatible=true;charset=utf-8",
			"OData-Version": "4.0",
			"X-CSRF-Token": "mock-token"
		};
		if (extra) {
			Object.keys(extra).forEach(function (key) {
				headers[key] = extra[key];
			});
		}
		return headers;
	}

	function textHeaders() {
		return {
			"Content-Type": "text/plain;charset=utf-8",
			"OData-Version": "4.0",
			"X-CSRF-Token": "mock-token"
		};
	}

	function xmlHeaders() {
		return {
			"Content-Type": "application/xml;charset=utf-8",
			"OData-Version": "4.0",
			"X-CSRF-Token": "mock-token"
		};
	}

	function odataError(status, code, message, target) {
		var statusText = "Error";
		if (status === 400) {
			statusText = "Bad Request";
		} else if (status === 404) {
			statusText = "Not Found";
		} else if (status === 409) {
			statusText = "Conflict";
		} else if (status === 405) {
			statusText = "Method Not Allowed";
		}
		return {
			status: status,
			statusText: statusText,
			headers: jsonHeaders(),
			body: JSON.stringify({
				error: {
					code: code,
					message: message,
					target: target || ""
				}
			})
		};
	}

	function formatMessage(template, value) {
		return template.replace("{0}", value);
	}

	function dueCriticality(dueBy, today) {
		if (!dueBy) {
			return 0;
		}
		if (dueBy < today) {
			return 1;
		}
		if (dueBy <= addDays(today, 2)) {
			return 2;
		}
		return 0;
	}

	function refreshDerived(state) {
		state.purchaseOrders.forEach(function (po) {
			po.HeaderTitle = po.PurchaseOrder;
			po.IsPending = po.Status === "Pending";
			po.StatusCriticality = po.Status === "Approved" ? 3 : po.Status === "Rejected" ? 1 : 2;
			po.PriorityCriticality = po.Priority === "High" ? 1 : po.Priority === "Medium" ? 2 : 3;
			po.DueCriticality = dueCriticality(po.DueBy, state.today);
			po.Currency = "GBP";
		});
		state.approvalSteps.forEach(function (step) {
			step.ActionCriticality = step.Action === "Approved" ? 3 : step.Action === "Rejected" ? 1 : 0;
			if (step.Action === "Submitted") {
				step.ActionCriticality = 5;
			}
		});
	}

	function normalize(state) {
		state.purchaseOrders.forEach(function (po) {
			if (po.RequestOffset !== undefined) {
				po.RequestDate = addDays(state.today, po.RequestOffset);
				delete po.RequestOffset;
			}
			if (po.DueOffset !== undefined) {
				po.DueBy = addDays(state.today, po.DueOffset);
				delete po.DueOffset;
			}
			if (po.DeliveryOffset !== undefined) {
				po.DeliveryDate = addDays(state.today, po.DeliveryOffset);
				delete po.DeliveryOffset;
			}
		});
		state.items.forEach(function (item) {
			if (item.DeliveryOffset !== undefined) {
				item.DeliveryDate = addDays(state.today, item.DeliveryOffset);
				delete item.DeliveryOffset;
			}
			item.Currency = "GBP";
			item.NetValue = round2(item.Quantity * item.NetPrice);
		});
		state.purchaseOrders.forEach(function (po) {
			var items = state.items.filter(function (item) {
				return item.PurchaseOrder === po.PurchaseOrder;
			});
			po.NetValue = round2(items.reduce(function (sum, item) {
				return sum + item.NetValue;
			}, 0));
			po.Currency = "GBP";
		});
		state.approvalSteps.forEach(function (step) {
			if (step.ChangedOffset !== undefined) {
				step.ChangedAt = addDays(state.today, step.ChangedOffset) + "T" + (step.ChangedTime || "08:30:00") + "Z";
				delete step.ChangedOffset;
				delete step.ChangedTime;
			}
		});
		refreshDerived(state);
	}

	function entityId(entity, row) {
		if (entity === "PurchaseOrder") {
			return "PurchaseOrder('" + row.PurchaseOrder + "')";
		}
		if (entity === "PurchaseOrderItem") {
			return "PurchaseOrderItem(PurchaseOrder='" + row.PurchaseOrder + "',ItemNumber='" + row.ItemNumber + "')";
		}
		if (entity === "Supplier") {
			return "Supplier('" + row.SupplierID + "')";
		}
		if (entity === "ApprovalStep") {
			return "ApprovalStep('" + row.ID + "')";
		}
		if (entity === "RejectionReason") {
			return "RejectionReason('" + row.ReasonCode + "')";
		}
		return entity;
	}

	function serialize(entity, row, expanded) {
		var out = { "@odata.id": entityId(entity, row) };
		Object.keys(row).forEach(function (key) {
			var value = row[key];
			if (value && typeof value === "object") {
				return;
			}
			if (DECIMAL_SCALE_2[entity] && DECIMAL_SCALE_2[entity][key] && typeof value === "number") {
				out[key] = money(value);
			} else if (entity === "PurchaseOrderItem" && key === "Quantity" && typeof value === "number") {
				out[key] = quantityString(value);
			} else {
				out[key] = value;
			}
		});
		if (expanded) {
			Object.keys(expanded).forEach(function (key) {
				out[key] = expanded[key];
			});
		}
		return out;
	}

	function itemsOf(state, poNumber) {
		return state.items.filter(function (item) {
			return item.PurchaseOrder === poNumber;
		}).sort(function (a, b) {
			return a.ItemNumber < b.ItemNumber ? -1 : a.ItemNumber > b.ItemNumber ? 1 : 0;
		});
	}

	function stepsOf(state, poNumber) {
		return state.approvalSteps.filter(function (step) {
			return step.PurchaseOrder === poNumber;
		}).sort(function (a, b) {
			return a.Step - b.Step;
		});
	}

	function supplierOf(state, supplierId) {
		for (var i = 0; i < state.suppliers.length; i++) {
			if (state.suppliers[i].SupplierID === supplierId) {
				return state.suppliers[i];
			}
		}
		return null;
	}

	function findPo(state, key) {
		var id = key[""] || key.PurchaseOrder;
		for (var i = 0; i < state.purchaseOrders.length; i++) {
			if (state.purchaseOrders[i].PurchaseOrder === id) {
				return state.purchaseOrders[i];
			}
		}
		return null;
	}

	function expandPurchaseOrder(state, po, names) {
		var expanded = {};
		names.forEach(function (name) {
			if (name === "Items") {
				expanded.Items = itemsOf(state, po.PurchaseOrder).map(function (item) {
					return serialize("PurchaseOrderItem", item);
				});
			} else if (name === "Supplier") {
				var supplier = supplierOf(state, po.SupplierID);
				expanded.Supplier = supplier ? serialize("Supplier", supplier) : null;
			} else if (name === "ApprovalHistory") {
				expanded.ApprovalHistory = stepsOf(state, po.PurchaseOrder).map(function (step) {
					return serialize("ApprovalStep", step);
				});
			}
		});
		return expanded;
	}

	function tokenize(input) {
		var tokens = [];
		var i = 0;
		while (i < input.length) {
			var ch = input.charAt(i);
			if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
				i++;
				continue;
			}
			if (ch === "(" || ch === ")" || ch === ",") {
				tokens.push({ type: ch, value: ch });
				i++;
				continue;
			}
			if (ch === "'") {
				var text = "";
				i++;
				while (i < input.length) {
					if (input.charAt(i) === "'" && input.charAt(i + 1) === "'") {
						text += "'";
						i += 2;
						continue;
					}
					if (input.charAt(i) === "'") {
						i++;
						break;
					}
					text += input.charAt(i);
					i++;
				}
				tokens.push({ type: "string", value: text });
				continue;
			}
			var start = i;
			while (i < input.length && " \t\n\r(),'".indexOf(input.charAt(i)) === -1) {
				i++;
			}
			tokens.push({ type: "word", value: input.slice(start, i) });
		}
		return tokens;
	}

	function compileFilter(expression) {
		var tokens = tokenize(expression);
		var index = 0;

		function peek() {
			return tokens[index];
		}

		function take() {
			return tokens[index++];
		}

		function coerce(token) {
			if (!token) {
				return null;
			}
			if (token.type === "string") {
				return token.value;
			}
			var value = token.value;
			if (value === "true") {
				return true;
			}
			if (value === "false") {
				return false;
			}
			if (value === "null") {
				return null;
			}
			if (/^-?\d+(\.\d+)?$/.test(value)) {
				return Number(value);
			}
			return value;
		}

		function parseValue() {
			var token = take();
			if (token && token.type === "word" && token.value.toLowerCase() === "tolower") {
				if (peek() && peek().type === "(") {
					take();
				}
				var inner = parseValue();
				if (peek() && peek().type === ")") {
					take();
				}
				return function (row) {
					var value = inner(row);
					return value == null ? "" : String(value).toLowerCase();
				};
			}
			if (token && token.type === "word") {
				var field = token.value;
				return function (row) {
					return row[field];
				};
			}
			var literal = coerce(token);
			return function () {
				return literal;
			};
		}

		function parsePrimary() {
			if (peek() && peek().type === "(") {
				take();
				var grouped = parseOr();
				if (peek() && peek().type === ")") {
					take();
				}
				return grouped;
			}
			var first = take();
			if (!first) {
				return function () {
					return true;
				};
			}
			var word = first.value;
			var fn = word.toLowerCase();
			if (fn === "contains" || fn === "startswith" || fn === "endswith") {
				if (peek() && peek().type === "(") {
					take();
				}
				var haystack = parseValue();
				if (peek() && peek().type === ",") {
					take();
				}
				var needleToken = take();
				if (peek() && peek().type === ")") {
					take();
				}
				var needle = String(coerce(needleToken)).toLowerCase();
				return function (row) {
					var hay = String(haystack(row) == null ? "" : haystack(row)).toLowerCase();
					if (fn === "contains") {
						return hay.indexOf(needle) !== -1;
					}
					if (fn === "startswith") {
						return hay.indexOf(needle) === 0;
					}
					return hay.length >= needle.length && hay.lastIndexOf(needle) === hay.length - needle.length;
				};
			}
			var opToken = take();
			var literalToken = take();
			var op = opToken ? opToken.value.toLowerCase() : "eq";
			var expected = coerce(literalToken);
			return function (row) {
				var actual = row[word];
				if (op === "eq") {
					return actual === expected || String(actual) === String(expected);
				}
				if (op === "ne") {
					return String(actual) !== String(expected);
				}
				if (actual == null || expected == null) {
					return false;
				}
				if (op === "gt") {
					return actual > expected;
				}
				if (op === "ge") {
					return actual >= expected;
				}
				if (op === "lt") {
					return actual < expected;
				}
				if (op === "le") {
					return actual <= expected;
				}
				return false;
			};
		}

		function parseNot() {
			if (peek() && peek().type === "word" && peek().value.toLowerCase() === "not") {
				take();
				var inner = parseNot();
				return function (row) {
					return !inner(row);
				};
			}
			return parsePrimary();
		}

		function parseAnd() {
			var left = parseNot();
			while (peek() && peek().type === "word" && peek().value.toLowerCase() === "and") {
				take();
				var right = parseNot();
				var current = left;
				left = function (row) {
					return current(row) && right(row);
				};
			}
			return left;
		}

		function parseOr() {
			var left = parseAnd();
			while (peek() && peek().type === "word" && peek().value.toLowerCase() === "or") {
				take();
				var right = parseAnd();
				var current = left;
				left = function (row) {
					return current(row) || right(row);
				};
			}
			return left;
		}

		if (!expression || !String(expression).trim()) {
			return function () {
				return true;
			};
		}
		return parseOr();
	}

	function matchesSearch(row, term) {
		if (!term) {
			return true;
		}
		var text = String(term).replace(/^"|"$/g, "").trim().toLowerCase();
		if (!text) {
			return true;
		}
		var blob = Object.keys(row).map(function (key) {
			var value = row[key];
			if (value == null || typeof value === "object") {
				return "";
			}
			return String(value);
		}).join("\n").toLowerCase();
		return text.split(/\s+/).every(function (word) {
			return blob.indexOf(word) !== -1;
		});
	}

	function parseOrderBy(value) {
		if (!value) {
			return [];
		}
		return value.split(",").map(function (part) {
			var bits = part.trim().split(/\s+/);
			return {
				field: bits[0],
				desc: (bits[1] || "").toLowerCase() === "desc"
			};
		}).filter(function (entry) {
			return !!entry.field;
		});
	}

	function compareValues(a, b) {
		if (a == null && b == null) {
			return 0;
		}
		if (a == null) {
			return -1;
		}
		if (b == null) {
			return 1;
		}
		if (typeof a === "number" && typeof b === "number") {
			return a - b;
		}
		var as = String(a);
		var bs = String(b);
		if (as < bs) {
			return -1;
		}
		if (as > bs) {
			return 1;
		}
		return 0;
	}

	function sortRows(rows, order) {
		var copy = rows.slice();
		copy.sort(function (a, b) {
			for (var i = 0; i < order.length; i++) {
				var result = compareValues(a[order[i].field], b[order[i].field]);
				if (result) {
					return order[i].desc ? -result : result;
				}
			}
			return 0;
		});
		return copy;
	}

	function parseExpand(value) {
		if (!value) {
			return [];
		}
		var names = [];
		var current = "";
		var depth = 0;
		for (var i = 0; i < value.length; i++) {
			var ch = value.charAt(i);
			if (ch === "(") {
				if (depth === 0 && current.trim()) {
					names.push(current.trim());
					current = "";
				}
				depth++;
				continue;
			}
			if (ch === ")") {
				depth = Math.max(0, depth - 1);
				continue;
			}
			if (ch === "," && depth === 0) {
				if (current.trim()) {
					names.push(current.trim());
				}
				current = "";
				continue;
			}
			if (depth === 0) {
				current += ch;
			}
		}
		if (current.trim()) {
			names.push(current.trim());
		}
		return names;
	}

	function parseQuery(query) {
		var params = {};
		if (!query) {
			return params;
		}
		query.split("&").forEach(function (pair) {
			if (!pair) {
				return;
			}
			var eq = pair.indexOf("=");
			var key = decodeURIComponent(eq >= 0 ? pair.slice(0, eq) : pair);
			var value = eq >= 0 ? pair.slice(eq + 1) : "";
			value = decodeURIComponent(value.replace(/\+/g, " "));
			params[key] = value;
		});
		return params;
	}

	function splitResource(path) {
		var segments = [];
		var i = 0;
		while (i < path.length) {
			if (path.charAt(i) === "/") {
				i++;
				continue;
			}
			var start = i;
			while (i < path.length && path.charAt(i) !== "/" && path.charAt(i) !== "(") {
				i++;
			}
			var name = decodeURIComponent(path.slice(start, i));
			var key = null;
			if (path.charAt(i) === "(") {
				var depth = 0;
				var keyStart = i + 1;
				for (; i < path.length; i++) {
					if (path.charAt(i) === "(") {
						depth++;
					} else if (path.charAt(i) === ")") {
						depth--;
						if (depth === 0) {
							i++;
							break;
						}
					}
				}
				key = path.slice(keyStart, i - 1);
			}
			if (name) {
				segments.push({ name: name, key: key });
			}
		}
		return segments;
	}

	function parseKey(raw) {
		if (raw == null) {
			return null;
		}
		var text = decodeURIComponent(raw).trim();
		if (!text) {
			return {};
		}
		if (text.charAt(0) === "'") {
			return { "": unquote(text) };
		}
		var result = {};
		var parts = [];
		var current = "";
		var quoted = false;
		for (var i = 0; i < text.length; i++) {
			var ch = text.charAt(i);
			if (ch === "'" && text.charAt(i + 1) === "'") {
				current += "''";
				i++;
				continue;
			}
			if (ch === "'") {
				quoted = !quoted;
				current += ch;
				continue;
			}
			if (ch === "," && !quoted) {
				parts.push(current);
				current = "";
				continue;
			}
			current += ch;
		}
		if (current) {
			parts.push(current);
		}
		parts.forEach(function (part) {
			var eq = part.indexOf("=");
			if (eq === -1) {
				result[""] = unquote(part.trim());
				return;
			}
			result[part.slice(0, eq).trim()] = unquote(part.slice(eq + 1).trim());
		});
		return result;
	}

	function unquote(value) {
		if (value.length >= 2 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
			return value.slice(1, -1).replace(/''/g, "'");
		}
		return value;
	}

	function queryRows(rows, query, defaultOrder) {
		var predicate = query.$filter ? compileFilter(query.$filter) : function () {
			return true;
		};
		var filtered = rows.filter(function (row) {
			return predicate(row) && matchesSearch(row, query.$search);
		});
		var order = parseOrderBy(query.$orderby);
		if (!order.length && defaultOrder) {
			order = defaultOrder;
		}
		var sorted = sortRows(filtered, order);
		var skip = parseInt(query.$skip || "0", 10);
		if (isNaN(skip) || skip < 0) {
			skip = 0;
		}
		var top = query.$top === undefined || query.$top === "" ? sorted.length : parseInt(query.$top, 10);
		if (isNaN(top) || top < 0) {
			top = sorted.length;
		}
		return {
			total: sorted.length,
			rows: sorted.slice(skip, skip + top)
		};
	}

	function collectionResponse(context, query, result, mapRow) {
		var payload = {
			"@odata.context": context,
			value: result.rows.map(mapRow)
		};
		if (query.$count === "true") {
			payload["@odata.count"] = result.total;
		}
		return {
			status: 200,
			statusText: "OK",
			headers: jsonHeaders(),
			body: JSON.stringify(payload)
		};
	}

	function entityResponse(context, row, message) {
		var payload = serializeRowWithContext(context, row);
		var headers = jsonHeaders();
		if (message) {
			headers["sap-messages"] = JSON.stringify([{
				code: "PO_APPROVAL",
				message: message,
				numericSeverity: 1,
				target: ""
			}]);
		}
		return {
			status: 200,
			statusText: "OK",
			headers: headers,
			body: JSON.stringify(payload)
		};
	}

	function serializeRowWithContext(context, row) {
		var payload = {};
		Object.keys(row).forEach(function (key) {
			payload[key] = row[key];
		});
		payload["@odata.context"] = context;
		return payload;
	}

	function addStep(state, po, action, comment) {
		var next = stepsOf(state, po.PurchaseOrder).reduce(function (max, step) {
			return Math.max(max, step.Step);
		}, 0) + 1;
		state.approvalSteps.push({
			ID: po.PurchaseOrder + "-" + next,
			PurchaseOrder: po.PurchaseOrder,
			Step: next,
			Approver: state.approverName,
			Action: action,
			ChangedAt: new Date().toISOString(),
			Comment: comment || "",
			ActionCriticality: action === "Approved" ? 3 : 1
		});
	}

	function applyAction(state, key, action, body, messages) {
		var po = findPo(state, key);
		if (!po) {
			return odataError(404, "NOT_FOUND", "Purchase order was not found.");
		}
		if (po.Status !== "Pending") {
			return odataError(409, "NOT_PENDING", "Purchase order " + po.PurchaseOrder + " is not pending approval.");
		}
		var comment = body && body.Comment ? String(body.Comment).trim() : "";
		if (action === "Reject") {
			var code = body && body.ReasonCode ? String(body.ReasonCode).trim() : "";
			var reason = null;
			for (var i = 0; i < state.reasons.length; i++) {
				if (state.reasons[i].ReasonCode === code) {
					reason = state.reasons[i];
				}
			}
			if (!reason) {
				return odataError(400, "REQUIRED", "Enter a reason for rejection.", "ReasonCode");
			}
			po.Status = "Rejected";
			addStep(state, po, "Rejected", reason.Description + (comment ? ". " + comment : ""));
		} else {
			po.Status = "Approved";
			addStep(state, po, "Approved", comment);
		}
		refreshDerived(state);
		var template = action === "Reject" ? messages.rejected : messages.approved;
		var serialized = serialize("PurchaseOrder", po, expandPurchaseOrder(state, po, ["Items", "Supplier", "ApprovalHistory"]));
		return entityResponse("$metadata#PurchaseOrder/$entity", serialized, formatMessage(template, po.PurchaseOrder));
	}

	function purchaseOrderPayload(state, po, expandNames) {
		return serialize("PurchaseOrder", po, expandPurchaseOrder(state, po, expandNames));
	}

	function handleEntity(state, segments, method, query, body, messages) {
		var root = segments[0];
		var sets = {
			PurchaseOrder: state.purchaseOrders,
			PurchaseOrderItem: state.items,
			Supplier: state.suppliers,
			ApprovalStep: state.approvalSteps,
			RejectionReason: state.reasons
		};
		if (!sets[root.name] && root.name !== "$metadata") {
			return odataError(404, "NOT_FOUND", "Resource " + root.name + " was not found.");
		}
		if (segments.length === 1 && segments[0].name === "$count") {
			return odataError(404, "NOT_FOUND", "Resource was not found.");
		}
		var count = segments.length > 1 && segments[segments.length - 1].name === "$count";
		var resource = count ? segments.slice(0, -1) : segments;
		var nav = resource.length > 1 ? resource[1] : null;
		var actionName = nav && (nav.name === "Approve" || nav.name === "Reject" || /\.Approve$/.test(nav.name) || /\.Reject$/.test(nav.name))
			? (/\.Reject$/.test(nav.name) || nav.name === "Reject" ? "Reject" : "Approve")
			: null;

		if (method === "POST" && root.name === "PurchaseOrder" && root.key && actionName) {
			var parsed = {};
			if (body) {
				try {
					parsed = JSON.parse(body);
				} catch (error) {
					return odataError(400, "BAD_BODY", "The request body is not valid JSON.");
				}
			}
			return applyAction(state, parseKey(root.key), actionName, parsed, messages);
		}
		if (method !== "GET" && method !== "HEAD") {
			return odataError(405, "NOT_ALLOWED", "This demo only supports reading purchase orders and the approval actions.");
		}

		if (root.name === "PurchaseOrder" && !root.key) {
			var poResult = queryRows(sets.PurchaseOrder, query, [
				{ field: "DueBy", desc: false },
				{ field: "PurchaseOrder", desc: false }
			]);
			if (count) {
				return { status: 200, statusText: "OK", headers: textHeaders(), body: String(poResult.total) };
			}
			var expand = parseExpand(query.$expand);
			return collectionResponse("$metadata#PurchaseOrder", query, poResult, function (po) {
				return purchaseOrderPayload(state, po, expand);
			});
		}

		if (root.name === "PurchaseOrder" && root.key) {
			var po = findPo(state, parseKey(root.key));
			if (!po) {
				return odataError(404, "NOT_FOUND", "Purchase order was not found.");
			}
			if (nav && nav.name === "Items") {
				var itemRows = queryRows(itemsOf(state, po.PurchaseOrder), query, [{ field: "ItemNumber", desc: false }]);
				if (count) {
					return { status: 200, statusText: "OK", headers: textHeaders(), body: String(itemRows.total) };
				}
				return collectionResponse("$metadata#PurchaseOrderItem", query, itemRows, function (item) {
					return serialize("PurchaseOrderItem", item);
				});
			}
			if (nav && nav.name === "ApprovalHistory") {
				var stepRows = queryRows(stepsOf(state, po.PurchaseOrder), query, [{ field: "Step", desc: false }]);
				if (count) {
					return { status: 200, statusText: "OK", headers: textHeaders(), body: String(stepRows.total) };
				}
				return collectionResponse("$metadata#ApprovalStep", query, stepRows, function (step) {
					return serialize("ApprovalStep", step);
				});
			}
			if (nav && nav.name === "Supplier") {
				var supplier = supplierOf(state, po.SupplierID);
				if (!supplier) {
					return odataError(404, "NOT_FOUND", "Supplier was not found.");
				}
				var supplierPayload = serialize("Supplier", supplier);
				supplierPayload["@odata.context"] = "$metadata#Supplier/$entity";
				return {
					status: 200,
					statusText: "OK",
					headers: jsonHeaders(),
					body: method === "HEAD" ? "" : JSON.stringify(supplierPayload)
				};
			}
			var one = purchaseOrderPayload(state, po, parseExpand(query.$expand));
			one["@odata.context"] = "$metadata#PurchaseOrder/$entity";
			return {
				status: 200,
				statusText: "OK",
				headers: jsonHeaders(),
				body: method === "HEAD" ? "" : JSON.stringify(one)
			};
		}

		var entityName = root.name;
		var rows = sets[entityName] || [];
		if (root.key) {
			var key = parseKey(root.key);
			var found = rows.filter(function (row) {
				if (entityName === "PurchaseOrderItem") {
					return row.PurchaseOrder === (key.PurchaseOrder || key[""]) && row.ItemNumber === key.ItemNumber;
				}
				if (entityName === "Supplier") {
					return row.SupplierID === (key.SupplierID || key[""]);
				}
				if (entityName === "ApprovalStep") {
					return row.ID === (key.ID || key[""]);
				}
				if (entityName === "RejectionReason") {
					return row.ReasonCode === (key.ReasonCode || key[""]);
				}
				return false;
			})[0];
			if (!found) {
				return odataError(404, "NOT_FOUND", entityName + " was not found.");
			}
			var single = serialize(entityName, found);
			single["@odata.context"] = "$metadata#" + entityName + "/$entity";
			return {
				status: 200,
				statusText: "OK",
				headers: jsonHeaders(),
				body: method === "HEAD" ? "" : JSON.stringify(single)
			};
		}
		var result = queryRows(rows, query, entityName === "ApprovalStep" ? [{ field: "Step", desc: false }] : entityName === "PurchaseOrderItem" ? [{ field: "ItemNumber", desc: false }] : []);
		if (count) {
			return { status: 200, statusText: "OK", headers: textHeaders(), body: String(result.total) };
		}
		return collectionResponse("$metadata#" + entityName, query, result, function (row) {
			return serialize(entityName, row);
		});
	}

	function headerValue(headers, name) {
		var found = Object.keys(headers || {}).filter(function (key) {
			return key.toLowerCase() === name;
		})[0];
		return found ? headers[found] : "";
	}

	function boundaryOf(contentType) {
		var match = /boundary="?([^";]+)"?/i.exec(contentType || "");
		return match ? match[1] : "";
	}

	function splitParts(body, boundary) {
		var marker = "--" + boundary;
		var chunks = String(body).split(marker);
		var parts = [];
		for (var i = 1; i < chunks.length; i++) {
			var chunk = chunks[i];
			if (chunk.indexOf("--") === 0) {
				continue;
			}
			parts.push(chunk.replace(/^\r?\n/, ""));
		}
		return parts;
	}

	function parseHeaders(block) {
		var headers = {};
		String(block || "").split(/\r?\n/).forEach(function (line) {
			var idx = line.indexOf(":");
			if (idx > 0) {
				headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
			}
		});
		return headers;
	}

	function parseHttpRequest(http) {
		var sep = http.indexOf("\r\n\r\n");
		var sepLen = 4;
		if (sep < 0) {
			sep = http.indexOf("\n\n");
			sepLen = 2;
		}
		var head = sep < 0 ? http : http.slice(0, sep);
		var payload = sep < 0 ? "" : http.slice(sep + sepLen).replace(/\r?\n$/, "");
		var lines = head.split(/\r?\n/);
		var request = /^(\w+)\s+(\S+)\s+HTTP/i.exec(lines[0] || "");
		return {
			method: request ? request[1].toUpperCase() : "GET",
			url: request ? request[2] : "",
			headers: parseHeaders(lines.slice(1).join("\n")),
			body: payload
		};
	}

	function parseMimePart(text) {
		var sep = text.indexOf("\r\n\r\n");
		var sepLen = 4;
		if (sep < 0) {
			sep = text.indexOf("\n\n");
			sepLen = 2;
		}
		var mime = sep < 0 ? text : text.slice(0, sep);
		var rest = sep < 0 ? "" : text.slice(sep + sepLen);
		var headers = parseHeaders(mime);
		var contentType = headerValue(headers, "content-type");
		if (contentType.toLowerCase().indexOf("multipart/mixed") === 0) {
			return {
				changeset: true,
				contentId: headerValue(headers, "content-id"),
				parts: parseBatch(rest, contentType)
			};
		}
		return {
			changeset: false,
			contentId: headerValue(headers, "content-id"),
			request: parseHttpRequest(rest)
		};
	}

	function parseBatch(body, contentType) {
		var boundary = boundaryOf(contentType);
		if (!boundary) {
			throw new Error("Missing $batch boundary");
		}
		return splitParts(body, boundary).map(parseMimePart);
	}

	function httpPart(response, contentId) {
		var lines = [
			"Content-Type: application/http",
			"Content-Transfer-Encoding: binary"
		];
		if (contentId) {
			lines.push("Content-ID: " + contentId);
		}
		lines.push("");
		var statusLine = "HTTP/1.1 " + response.status + " " + (response.statusText || "OK");
		var headerLines = Object.keys(response.headers || {}).map(function (key) {
			return key + ": " + response.headers[key];
		});
		lines.push([statusLine].concat(headerLines).join("\r\n") + "\r\n\r\n" + (response.body || ""));
		return lines.join("\r\n");
	}

	function serializeBatch(responses) {
		var boundary = "batchresp_" + Math.random().toString(16).slice(2);
		var chunks = [];
		responses.forEach(function (response) {
			chunks.push("--" + boundary);
			if (response.changeset) {
				var changeBoundary = "changesetresp_" + Math.random().toString(16).slice(2);
				chunks.push("Content-Type: multipart/mixed; boundary=" + changeBoundary);
				chunks.push("");
				response.parts.forEach(function (part) {
					chunks.push("--" + changeBoundary);
					chunks.push(httpPart(part.response, part.contentId || "0.0"));
				});
				chunks.push("--" + changeBoundary + "--");
			} else {
				chunks.push(httpPart(response.response));
			}
		});
		chunks.push("--" + boundary + "--");
		return {
			contentType: "multipart/mixed; boundary=" + boundary,
			body: chunks.join("\r\n")
		};
	}

	function createEngine(options) {
		var source = {
			metadataXml: options.metadataXml || "",
			purchaseOrders: clone(options.purchaseOrders || []),
			items: clone(options.items || []),
			suppliers: clone(options.suppliers || []),
			approvalSteps: clone(options.approvalSteps || []),
			reasons: clone(options.rejectionReasons || []),
			approverName: options.approverName || "Alex Morgan",
			messages: options.messages || {
				approved: "Purchase order {0} approved",
				rejected: "Purchase order {0} rejected"
			},
			serviceRoot: options.serviceRoot || SERVICE_ROOT
		};
		var state = null;

		function boot(today) {
			state = clone(source);
			state.today = today || options.today || todayISO();
			state.purchaseOrders = state.purchaseOrders;
			normalize(state);
		}

		boot();

		function normalizeUrl(url) {
			var text = String(url || "");
			var hash = text.indexOf("#");
			if (hash >= 0) {
				text = text.slice(0, hash);
			}
			var queryIndex = text.indexOf("?");
			var path = queryIndex >= 0 ? text.slice(0, queryIndex) : text;
			var query = queryIndex >= 0 ? text.slice(queryIndex + 1) : "";
			var root = state.serviceRoot;
			var at = path.indexOf(root);
			if (at >= 0) {
				path = path.slice(at + root.length);
			}
			path = path.replace(/^\/+/, "");
			try {
				path = decodeURI(path);
			} catch (error) {
				// Keep the raw path when a sequence is not valid URI encoding.
			}
			return { path: path, query: parseQuery(query) };
		}

		function dispatch(method, url, body) {
			var target = normalizeUrl(url);
			if (!target.path || target.path === "/") {
				return {
					status: 200,
					statusText: "OK",
					headers: jsonHeaders(),
					body: JSON.stringify({
						"@odata.context": "$metadata",
						value: [
							{ name: "PurchaseOrder", kind: "EntitySet", url: "PurchaseOrder" },
							{ name: "PurchaseOrderItem", kind: "EntitySet", url: "PurchaseOrderItem" },
							{ name: "Supplier", kind: "EntitySet", url: "Supplier" },
							{ name: "ApprovalStep", kind: "EntitySet", url: "ApprovalStep" },
							{ name: "RejectionReason", kind: "EntitySet", url: "RejectionReason" }
						]
					})
				};
			}
			if (target.path === "$metadata") {
				return {
					status: 200,
					statusText: "OK",
					headers: xmlHeaders(),
					body: method === "HEAD" ? "" : state.metadataXml
				};
			}
			if (target.path === "$batch") {
				if (method !== "POST") {
					return odataError(405, "NOT_ALLOWED", "$batch must be posted.");
				}
				return null;
			}
			var segments = splitResource(target.path);
			if (segments.length && segments[segments.length - 1].name === "$count" && segments.length >= 2) {
				return handleEntity(state, segments, method, target.query, body, state.messages);
			}
			return handleEntity(state, segments, method, target.query, body, state.messages);
		}

		return {
			serviceRoot: source.serviceRoot,
			reset: function (today) {
				boot(today);
			},
			getState: function () {
				return state;
			},
			handle: function (method, url, body, headers) {
				var verb = String(method || "GET").toUpperCase();
				if (normalizeUrl(url).path === "$batch") {
					var contentType = headerValue(headers || {}, "content-type");
					var parts = parseBatch(body || "", contentType);
					var responses = parts.map(function (part) {
						if (part.changeset) {
							return {
								changeset: true,
								parts: part.parts.map(function (inner, innerIndex) {
									var request = inner.request;
									return {
										contentId: inner.contentId || (innerIndex + ".0"),
										response: dispatch(request.method, request.url, request.body)
									};
								})
							};
						}
						return {
							changeset: false,
							response: dispatch(part.request.method, part.request.url, part.request.body)
						};
					});
					var batch = serializeBatch(responses);
					return {
						status: 200,
						statusText: "OK",
						headers: {
							"Content-Type": batch.contentType,
							"OData-Version": "4.0",
							"X-CSRF-Token": "mock-token"
						},
						body: batch.body
					};
				}
				var response = dispatch(verb, url, body);
				if (verb === "HEAD" && response && response.body && response.headers["Content-Type"] && response.headers["Content-Type"].indexOf("application/json") === 0) {
					response = {
						status: response.status,
						statusText: response.statusText,
						headers: response.headers,
						body: ""
					};
				}
				return response;
			}
		};
	}

	return {
		SERVICE_ROOT: SERVICE_ROOT,
		createEngine: createEngine,
		compileFilter: compileFilter
	};
});
