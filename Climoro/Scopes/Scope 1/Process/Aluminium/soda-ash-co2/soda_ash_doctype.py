import frappe

doctype_name = "Soda Ash CO2 Emissions"

try:
	if frappe.db.exists("DocType", doctype_name):
		print(f"DocType '{doctype_name}' already exists.")
	else:
		doc = frappe.get_doc({
			"doctype": "DocType",
			"name": doctype_name,
			"module": "Custom",
			"custom": 1,
			"naming_rule": "Expression",
			"autoname": "format:SODA-CO2-{date}-{####}",
			"track_changes": 1,
			"fields": [
				{"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
				{"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "reqd": 1},
				{"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
				{"fieldname": "a_qty_t", "label": "Quantity of Soda Ash (t)", "fieldtype": "Float", "reqd": 1, "precision": 4},
				{"fieldname": "b_purity", "label": "Purity (fraction)", "fieldtype": "Float", "reqd": 1, "precision": 6},
				{"fieldname": "c_fraction", "label": "Fraction calcination (fraction)", "fieldtype": "Float", "reqd": 1, "precision": 6},
				{"fieldname": "co2_t", "label": "CO2 Emissions (t)", "fieldtype": "Float", "read_only": 1, "precision": 6, "in_list_view": 1}
			],
			"permissions": [
				{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}
			]
		})
		doc.insert(ignore_permissions=True)
		frappe.db.commit()
		print(f"✅ DocType '{doctype_name}' created.")
except Exception as e:
	frappe.log_error(frappe.get_traceback(), "Soda Ash CO2 DocType Creation Error")
	print("❌ Error:", e)
