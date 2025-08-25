import frappe


def ensure_doctype(name, fields, module_hint="Climoro Onboarding"):
    if frappe.db.exists("DocType", name):
        print(f"✓ DocType '{name}' already exists"); return
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
    # Permissions
    doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1})
    doc.append("permissions", {"role": "All", "read": 1, "write": 1, "create": 1})
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"✓ Created DocType '{name}' in module '{module_name}'")


print("\n🚀 Creating Waste Operations DocTypes...")
try:
    common = [
        {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "waste_type", "label": "Waste Type", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "treatment_method", "label": "Treatment Method", "fieldtype": "Data"},
        {"fieldname": "mass", "label": "Activity Data (Mass)", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "default": "tonne"},
        {"fieldname": "emission_factor", "label": "Emission Factor", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "default": "kg CO2e/tonne"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1}
    ]

    ensure_doctype("Waste Operations Supplier Specific", list(common))
    ensure_doctype("Waste Operations Waste Type Specific", list(common))
    ensure_doctype("Waste Operations Average Data", list(common))

    print("✅ Waste Operations DocTypes ensured.")
except Exception as e:
    print("❌ Error while creating Waste Operations DocTypes:", str(e))


