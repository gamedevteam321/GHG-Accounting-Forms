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


print("\n🚀 Creating Employee Commuting DocTypes...")
try:
    # Common starting fields
    s_no_date = [
        {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
    ]

    # Method 1: Fuel-Based
    ensure_doctype("Employee Commuting Fuel Based", s_no_date + [
        {"fieldname": "employee_department", "label": "Employee/Department", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "transport_mode", "label": "Transport Mode", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "fuel_type", "label": "Fuel Type", "fieldtype": "Data"},
        {"fieldname": "fuel_consumed", "label": "Fuel consumed", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "default": "litres"},
        {"fieldname": "emission_factor", "label": "Fuel Life Cycle EF", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "default": "kg CO2e/litre"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    # Method 2: Distance-Based (from Surveys)
    ensure_doctype("Employee Commuting Distance Based", s_no_date + [
        {"fieldname": "transport_mode", "label": "Transport Mode", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "total_annual_distance", "label": "Total Annual Distance", "fieldtype": "Float"},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "default": "passenger-km"},
        {"fieldname": "vehicle_specific_emission_factor", "label": "Vehicle-Specific Emission Factor", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "default": "kg CO2e/p-km"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    # Method 3: Average-Data
    ensure_doctype("Employee Commuting Average Data", s_no_date + [
        {"fieldname": "transport_mode", "label": "Transport Mode", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "num_employees", "label": "# of Employees", "fieldtype": "Int"},
        {"fieldname": "pct_using_mode", "label": "% Using Mode", "fieldtype": "Float"},
        {"fieldname": "avg_commute_distance", "label": "Avg. Commute Distance (km)", "fieldtype": "Float"},
        {"fieldname": "work_days_per_year", "label": "Work Days/Year", "fieldtype": "Int"},
        {"fieldname": "emission_factor", "label": "Emission Factor", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "default": "kg CO2e/p-km"},
        {"fieldname": "total_emissions", "label": "Total Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ])

    print("✅ Employee Commuting DocTypes ensured.")
except Exception as e:
    print("❌ Error while creating Employee Commuting DocTypes:", str(e))


