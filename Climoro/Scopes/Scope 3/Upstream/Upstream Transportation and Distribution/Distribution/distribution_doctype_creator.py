import frappe


def ensure_doctype(name: str, fields: list):
    if frappe.db.exists("DocType", name):
        print(f"✅ DocType '{name}' already exists")
        return
    doc = frappe.new_doc("DocType")
    doc.name = name
    module_name = "Climoro Onboarding" if frappe.db.exists("Module Def", "Climoro Onboarding") else (frappe.get_installed_apps()[0] if frappe.get_installed_apps() else "Core")
    doc.module = module_name
    doc.custom = 1
    doc.editable_grid = 1
    doc.engine = "InnoDB"
    doc.track_changes = 1
    for f in fields:
        doc.append("fields", f)
    doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1})
    doc.append("permissions", {"role": "All", "read": 1, "write": 1, "create": 1, "delete": 0, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1})
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"✅ Created DocType '{name}' in module '{module_name}'")


print("\n🚀 Creating Distribution DocTypes...")
try:
    common = [
        {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "description", "label": "Description", "fieldtype": "Data", "in_list_view": 1},
    ]

    # Site-Specific – activity data is already kg CO2e
    ensure_doctype("Distribution Site Specific", common + [
        {"fieldname": "activity_data", "label": "Activity Data", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "default": "kg CO2e"},
        {"fieldname": "emission_factor", "label": "Emission Factor", "fieldtype": "Data", "default": "Calculated"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "default": "N/A"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    # Average-Data – volume-days × EF
    ensure_doctype("Distribution Average Data", common + [
        {"fieldname": "volume_days", "label": "Volume Days Stored", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "default": "pallet days"},
        {"fieldname": "emission_factor", "label": "Storage EF", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "default": "kg CO2e/pallet-day"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    print("✅ Distribution DocTypes ensured.")
except Exception as e:
    print("❌ Error while creating Distribution DocTypes:", str(e))


