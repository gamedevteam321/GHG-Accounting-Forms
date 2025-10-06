import frappe


def ensure_doctype(name, fields, module_hint="Climoro Onboarding"):
    # Ensure DB connection is alive in long-lived shells/console sessions
    try:
        frappe.db.sql("select 1")
    except Exception:
        try:
            frappe.db.connect()
        except Exception:
            pass
    if frappe.db.exists("DocType", name):
        print(f"✓ DocType '{name}' already exists")
        return
    doc = frappe.new_doc("DocType")
    doc.name = name
    # Use provided module if it exists, otherwise fall back to Core (safe default)
    module_name = module_hint if frappe.db.exists("Module Def", module_hint) else "Core"
    doc.module = module_name
    doc.custom = 1
    doc.editable_grid = 1
    doc.track_changes = 1
    doc.istable = 0
    doc.is_submittable = 0
    for f in fields:
        doc.append("fields", f)
    doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1})
    doc.append("permissions", {"role": "All", "read": 1, "write": 1, "create": 1})
    try:
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception:
        print("--- DocType creation traceback ---")
        try:
            print(frappe.get_traceback())
        except Exception:
            pass
        raise
    print(f"✓ Created DocType '{name}' in module '{module_name}'")


print("\n🚀 Creating Ammonia Production CO2 Emissions DocType...")
try:
    fields = [
        {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "in_list_view": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "company_unit", "label": "Company Unit", "fieldtype": "Link", "options": "Units", "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "production_process", "label": "Production Process", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "nh3_production_t", "label": "NH3 Production (t)", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "fuel_type", "label": "Fuel Type", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "fuel_requirement_gj_per_t", "label": "Fuel Requirement (GJ/t NH3)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "carbon_content_kg_per_gj", "label": "Carbon Content (kg C/GJ)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "oxidation_factor", "label": "Oxidation Factor", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "co2_from_nh3_t", "label": "CO2 from NH3 (t)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "urea_co2_t", "label": "Urea CO2 (t)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "css_t", "label": "CSS (t)", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "total_co2_t", "label": "Total CO2 (t)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
    ]

    ensure_doctype("Ammonia Production CO2 Emissions", fields)
    print("✅ Ammonia Production CO2 Emissions DocType ensured.")
except Exception as e:
    try:
        print(frappe.get_traceback())
    except Exception:
        pass
    print("❌ Error while creating Ammonia Production CO2 Emissions DocType:", str(e))


