import frappe

doctype_name = "Coke Calcination CO2 Emissions"

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
			"autoname": "format:CC-CO2-{date}-{####}",
			"track_changes": 1,
			"fields": [
				{"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
				{"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "reqd": 1},
				{"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
				{"fieldname": "gc_t", "label": "Green coke calcined (t)", "fieldtype": "Float", "reqd": 1, "precision": 3},
				{"fieldname": "hgc_pct", "label": "Humidity in green coke (%)", "fieldtype": "Float", "precision": 3},
				{"fieldname": "vgc_pct", "label": "Volatiles in green coke (%)", "fieldtype": "Float", "precision": 3},
				{"fieldname": "sgc_pct", "label": "Sulphur in green coke (%)", "fieldtype": "Float", "precision": 3},
				{"fieldname": "cc_t", "label": "Calcined coke produced (t)", "fieldtype": "Float", "reqd": 1, "precision": 3},
				{"fieldname": "scc_pct", "label": "Sulphur in calcined coke (%)", "fieldtype": "Float", "precision": 3},
				{"fieldname": "ucc_t", "label": "Undercalcined coke collected (t)", "fieldtype": "Float", "precision": 3},
				{"fieldname": "de_t", "label": "Coke dust emissions (t)", "fieldtype": "Float", "precision": 3},
				{"fieldname": "co2_t", "label": "CO2 Emissions (t)", "fieldtype": "Float", "read_only": 1, "precision": 3, "in_list_view": 1}
			],
			"permissions": [
				{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}
			]
		})
		doc.insert(ignore_permissions=True)
		frappe.db.commit()
		print(f"✅ DocType '{doctype_name}' created.")
except Exception as e:
	frappe.log_error(frappe.get_traceback(), "Coke Calcination DocType Creation Error")
	print("❌ Error:", e)
