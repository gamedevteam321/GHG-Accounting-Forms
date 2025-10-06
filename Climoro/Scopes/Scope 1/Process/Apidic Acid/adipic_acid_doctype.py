import frappe


def ensure_doctype(name, fields, module_hint="Climoro Onboarding"):
    if frappe.db.exists("DocType", name):
        print(f"✓ DocType '{name}' already exists")
        return
    doc = frappe.new_doc("DocType")
    doc.name = name
    module_name = module_hint if frappe.db.exists("Module Def", module_hint) else (frappe.get_installed_apps()[0] if frappe.get_installed_apps() else "Core")
    doc.module = module_name
    doc.custom = 1
    doc.editable_grid = 1
    doc.engine = "InnoDB"
    doc.track_changes = 1
    for f in fields:
        doc.append("fields", f)
    doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1})
    doc.append("permissions", {"role": "All", "read": 1, "write": 1, "create": 1})
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"✓ Created DocType '{name}' in module '{module_name}'")


print("\n🚀 Creating Adipic Acid N2O Emissions DocType...")
try:
    fields = [
        {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "in_list_view": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "technology", "label": "N2O Abatement Technology", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
        {"fieldname": "adipic_acid_production_t", "label": "Adipic Acid Production", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "n2o_emission_factor", "label": "N2O Emission Factor", "fieldtype": "Float", "default": 0.30, "in_list_view": 1},
        {"fieldname": "destruction_factor_pct", "label": "Destruction Factor %", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "utilization_factor_pct", "label": "Utilization Factor %", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "potential_n2o_t", "label": "Potential N2O Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "annual_n2o_t", "label": "Annual N2O Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "gwp", "label": "GWP (N2O)", "fieldtype": "Int", "default": 310, "in_list_view": 1},
        {"fieldname": "co2e_tco2e", "label": "CO2e", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "company_unit", "label": "Company Unit", "fieldtype": "Link", "options": "Units", "in_list_view": 1, "in_standard_filter": 1},
    ]

    ensure_doctype("Adipic Acid N2O Emissions", fields)
    print("✅ Adipic Acid N2O Emissions DocType ensured.")
except Exception as e:
    print("❌ Error while creating Adipic Acid N2O Emissions DocType:", str(e))


