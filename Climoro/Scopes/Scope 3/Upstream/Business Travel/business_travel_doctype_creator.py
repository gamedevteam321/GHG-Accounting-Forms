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


print("\n🚀 Creating Business Travel DocTypes...")
try:
    # Common starting fields
    s_no_date = [
        {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
    ]

    # Fuel-Based
    ensure_doctype("Business Travel Fuel Based", s_no_date + [
        {"fieldname": "description", "label": "Description", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "fuel_type", "label": "Fuel Type", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "fuel_consumed", "label": "Fuel consumed", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "default": "litres"},
        {"fieldname": "emission_factor", "label": "Fuel Life Cycle EF", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "default": "kg CO2e/litre"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    # Distance-Based
    ensure_doctype("Business Travel Distance Based", s_no_date + [
        {"fieldname": "description", "label": "Description", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "transport_mode", "label": "Transport Mode", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "distance_traveled", "label": "Distance traveled", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "default": "passenger-km"},
        {"fieldname": "emission_factor", "label": "Emission Factor (by class)", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "default": "kg CO2e/p-km"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    # Spend-Based
    ensure_doctype("Business Travel Spend Based", s_no_date + [
        {"fieldname": "description", "label": "Description", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "amount_spent", "label": "Amount spent", "fieldtype": "Float"},
        {"fieldname": "currency", "label": "Currency", "fieldtype": "Data", "default": "$"},
        {"fieldname": "eeio_ef", "label": "EEIO EF", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "default": "kg CO2e/$"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    print("✅ Business Travel DocTypes ensured.")
except Exception as e:
    print("❌ Error while creating Business Travel DocTypes:", str(e))


