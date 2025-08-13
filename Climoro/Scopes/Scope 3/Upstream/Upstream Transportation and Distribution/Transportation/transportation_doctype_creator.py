import frappe


def ensure_doctype(name: str, fields: list):
    if frappe.db.exists("DocType", name):
        print(f"✅ DocType '{name}' already exists")
        return
    # Build DocType
    doc = frappe.new_doc("DocType")
    doc.name = name
    module_name = "Climoro Onboarding" if frappe.db.exists("Module Def", "Climoro Onboarding") else (frappe.get_installed_apps()[0] if frappe.get_installed_apps() else "Core")
    doc.module = module_name
    # Create as custom so it's editable via UI
    doc.custom = 1
    doc.editable_grid = 1
    doc.engine = "InnoDB"
    doc.track_changes = 1
    # Fields
    for f in fields:
        doc.append("fields", f)
    # Permissions
    doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1})
    doc.append("permissions", {"role": "All", "read": 1, "write": 1, "create": 1, "delete": 0, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1})
    # Save
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"✅ Created DocType '{name}' in module '{module_name}'")


def create_all():
    common = [
        {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "description", "label": "Description", "fieldtype": "Data", "in_list_view": 1},
    ]

    # Fuel-Based
    ensure_doctype("Transportation Fuel Based", common + [
        {"fieldname": "quantity", "label": "Quantity", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data"},
        {"fieldname": "emission_factor", "label": "Emission Factor", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    # Distance-Based
    ensure_doctype("Transportation Distance Based", common + [
        {"fieldname": "mass", "label": "Mass", "fieldtype": "Float"},
        {"fieldname": "distance", "label": "Distance", "fieldtype": "Float"},
        {"fieldname": "mode", "label": "Mode", "fieldtype": "Data"},
        {"fieldname": "emission_factor", "label": "Emission Factor", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    # Spend-Based
    ensure_doctype("Transportation Spend Based", common + [
        {"fieldname": "amount", "label": "Amount Spent", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data"},
        {"fieldname": "emission_factor", "label": "EEIO EF", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

print("\n🚀 Creating Transportation DocTypes...")
try:
    common = [
        {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "description", "label": "Description", "fieldtype": "Data", "in_list_view": 1},
    ]

    ensure_doctype("Transportation Fuel Based", common + [
        {"fieldname": "quantity", "label": "Quantity", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data"},
        {"fieldname": "emission_factor", "label": "Emission Factor", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    ensure_doctype("Transportation Distance Based", common + [
        {"fieldname": "mass", "label": "Mass", "fieldtype": "Float"},
        {"fieldname": "distance", "label": "Distance", "fieldtype": "Float"},
        {"fieldname": "mode", "label": "Mode", "fieldtype": "Data"},
        {"fieldname": "emission_factor", "label": "Emission Factor", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    ensure_doctype("Transportation Spend Based", common + [
        {"fieldname": "amount", "label": "Amount Spent", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data"},
        {"fieldname": "emission_factor", "label": "EEIO EF", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    print("✅ Transportation DocTypes ensured.")
except Exception as e:
    print("❌ Error while creating Transportation DocTypes:", str(e))


