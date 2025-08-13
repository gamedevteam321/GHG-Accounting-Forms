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
    doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1})
    doc.append("permissions", {"role": "All", "read": 1, "write": 1, "create": 1})
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"✓ Created DocType '{name}' in module '{module_name}'")


print("\n🚀 Creating Upstream Leased Assets DocTypes...")
try:
    s_no_date = [
        {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
    ]

    ensure_doctype("Upstream Leased Asset Specific", s_no_date + [
        {"fieldname": "leased_asset_id", "label": "Leased Asset ID", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "emission_source", "label": "Emission Source", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "activity_data", "label": "Activity Data", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data"},
        {"fieldname": "emission_factor", "label": "Emission Factor", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    ensure_doctype("Upstream Leased Lessor Specific", s_no_date + [
        {"fieldname": "leased_asset_id", "label": "Leased Asset ID", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "lessor_provided_emissions", "label": "Lessor-Provided Emissions", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "default": "kg CO2e"},
        {"fieldname": "your_share_pct", "label": "Your Share (%)", "fieldtype": "Float"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    ensure_doctype("Upstream Leased Average Data", s_no_date + [
        {"fieldname": "asset_type", "label": "Asset Type", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "description", "label": "Description", "fieldtype": "Data"},
        {"fieldname": "activity_data", "label": "Activity Data", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data"},
        {"fieldname": "average_emission_factor", "label": "Average Emission Factor", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    print("✅ Upstream Leased Assets DocTypes ensured.")
except Exception as e:
    print("❌ Error while creating Upstream Leased Assets DocTypes:", str(e))


