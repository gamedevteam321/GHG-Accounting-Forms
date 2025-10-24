# DocType: Default CO2 Emissions
# Run in bench console to create once

import frappe

doctype_name = "Default CO2 Emissions"

try:
	if frappe.db.exists("DocType", doctype_name):
		print(f"DocType '{doctype_name}' already exists.")
	else:
		doc = frappe.get_doc({
			"doctype": "DocType",
			"name": doctype_name,
			"module": "Custom",
			"custom": 1,
			"is_submittable": 0,
			"track_changes": 1,
			"naming_rule": "Expression",
			"autoname": "format:DEF-CO2-{date}-{####}",
			"fields": [
				{"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
				{"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "reqd": 1},
				{"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
				{"fieldname": "type", "label": "Type", "fieldtype": "Select", "options": "Soderberg\nPrebake", "reqd": 1, "in_list_view": 1},
				{"fieldname": "weight_al_t", "label": "Weight of Aluminium (t)", "fieldtype": "Float", "reqd": 1, "precision": 3},
				{"fieldname": "default_ef", "label": "Default EF (t CO2/t Al)", "fieldtype": "Float", "read_only": 1, "precision": 3},
				{"fieldname": "custom_ef", "label": "Custom EF (t CO2/t Al)", "fieldtype": "Float", "precision": 3},
				{"fieldname": "ef_used", "label": "EF Used (t CO2/t Al)", "fieldtype": "Float", "read_only": 1, "precision": 3},
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
	frappe.log_error(frappe.get_traceback(), "Default CO2 DocType Creation Error")
	print("❌ Error:", e)
