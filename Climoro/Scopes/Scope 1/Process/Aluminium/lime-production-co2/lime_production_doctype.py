import frappe

doctype_name = "Lime Production CO2 Emissions"

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
			"autoname": "format:LIME-CO2-{date}-{####}",
			"track_changes": 1,
			"fields": [
				{"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
				{"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "reqd": 1},
				{"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
				{"fieldname": "lime_type", "label": "Lime Type", "fieldtype": "Select", "options": "High-calcium\nDolomitic\nHydraulic", "reqd": 1, "in_list_view": 1},
				{"fieldname": "country_type", "label": "Country Type", "fieldtype": "Select", "options": "Developed\nDeveloping", "in_list_view": 0},
				{"fieldname": "amount_t", "label": "Amount produced (t)", "fieldtype": "Float", "reqd": 1, "precision": 3},
				{"fieldname": "content_frac", "label": "CaO/CaO·MgO content (fraction)", "fieldtype": "Float", "read_only": 1, "precision": 6},
				{"fieldname": "stoich_ratio", "label": "Stoichiometric ratio (fraction)", "fieldtype": "Float", "read_only": 1, "precision": 6},
				{"fieldname": "prop_h", "label": "Proportion of hydrated lime (H)", "fieldtype": "Float", "read_only": 1, "precision": 6},
				{"fieldname": "water_h2o", "label": "Water content of hydrated lime (H2O)", "fieldtype": "Float", "read_only": 1, "precision": 6},
				{"fieldname": "cf", "label": "LKD correction factor (CF)", "fieldtype": "Float", "read_only": 1, "precision": 6},
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
	frappe.log_error(frappe.get_traceback(), "Lime Production CO2 DocType Creation Error")
	print("❌ Error:", e)
