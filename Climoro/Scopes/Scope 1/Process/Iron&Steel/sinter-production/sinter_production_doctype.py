"""
Sinter Production Emissions DocType Creator
"""

import frappe


def ensure_doctype(doctype_name, fields):
	try:
		frappe.db.connect()
		if frappe.db.exists("DocType", doctype_name):
			print(f"✓ DocType '{doctype_name}' already exists")
			return
		module = "climoro_onboarding" if frappe.db.exists("Module Def", "climoro_onboarding") else "Core"
		doc = frappe.get_doc({
			"doctype": "DocType",
			"name": doctype_name,
			"module": module,
			"custom": 1,
			"is_submittable": 0,
			"track_changes": 1,
			"fields": fields,
			"permissions": [
				{ "role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1 }
			]
		})
		doc.insert(ignore_permissions=True)
		frappe.db.commit()
		frappe.db.updatedb(doctype_name)
		frappe.db.commit()
		print(f"✓ Created DocType: {doctype_name}")
	except Exception as e:
		print(f"❌ Error creating DocType {doctype_name}: {str(e)}")
		print(frappe.get_traceback())
		raise


try:
	print("🚀 Ensuring Sinter Production Emissions DocType...")
	fields = [
		# meta
		{ "fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1 },
		{ "fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 0 },
		{ "fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "reqd": 1, "in_list_view": 1 },

		# Section CO2
		{ "fieldname": "co2_section", "label": "CO2 Emissions", "fieldtype": "Section Break" },

		# Materials JSON
		{ "fieldname": "process_materials_json", "label": "Process Materials (JSON)", "fieldtype": "Long Text" },
		# Off-gas
		{ "fieldname": "offgas_amount_t", "label": "Off-gas Amount (t)", "fieldtype": "Float" },
		{ "fieldname": "offgas_carbon_content", "label": "Off-gas Carbon Content (kg C/kg)", "fieldtype": "Float", "precision": 6 },
		{ "fieldname": "offgas_carbon_t", "label": "Off-gas Carbon (t)", "fieldtype": "Float", "read_only": 1, "precision": 6 },

		{ "fieldname": "co2_column_break", "fieldtype": "Column Break" },
		{ "fieldname": "sinter_produced_t", "label": "Amount of Sinter Produced (t)", "fieldtype": "Float" },
		{ "fieldname": "total_co2_t", "label": "Total CO2 Emissions (t)", "fieldtype": "Float", "read_only": 1, "precision": 2, "in_list_view": 1 },

		# Section CH4
		{ "fieldname": "ch4_section", "label": "CH4 Emissions", "fieldtype": "Section Break" },
		{ "fieldname": "ch4_ef_kg_per_unit", "label": "CH4 Emission Factor (kg CH4 / unit sinter)", "fieldtype": "Float", "precision": 6, "default": 0.07, "read_only": 1 },
		{ "fieldname": "total_ch4_kg", "label": "Total CH4 Emissions (kg)", "fieldtype": "Float", "precision": 5, "read_only": 1, "in_list_view": 1 },
	]
	ensure_doctype("Sinter Production Emissions", fields)
	print("✅ Sinter Production Emissions DocType ensured.")
except Exception as e:
	print("❌ Error ensuring Sinter Production Emissions DocType:", str(e))
	print(frappe.get_traceback())
