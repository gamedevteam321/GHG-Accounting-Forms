import frappe


def ensure_doctype(name, fields, module_hint="Climoro Onboarding"):
    module_name = module_hint if frappe.db.exists("Module Def", module_hint) else "Core"
    if not frappe.db.exists("DocType", name):
        doc = frappe.new_doc("DocType")
        doc.name = name
        doc.module = module_name
        doc.custom = 1
        doc.editable_grid = 1
        doc.track_changes = 1
        for f in fields:
            doc.append("fields", f)
        doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1})
        doc.append("permissions", {"role": "All", "read": 1, "write": 1, "create": 1})
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
    try:
        frappe.db.updatedb(name)
    except Exception:
        pass


print("\n🚀 Ensuring Nitric Acid N2O Emissions DocType...")
try:
    ensure_doctype(
        "Nitric Acid N2O Emissions",
        [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "technology", "label": "Technology", "fieldtype": "Link", "options": "Nitric Acid Technology Defaults", "reqd": 1, "in_list_view": 1},
            {"fieldname": "production_t", "label": "Production (t HNO3)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
            {"fieldname": "default_ef_kg_per_t", "label": "Default EF (kg N2O/t HNO3)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
            {"fieldname": "ef_used_kg_per_t", "label": "EF Used (kg N2O/t HNO3)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
            {"fieldname": "destruction_pct", "label": "N2O Destruction (%)", "fieldtype": "Float", "in_list_view": 1},
            {"fieldname": "utilization_pct", "label": "Abatement Utilization (%)", "fieldtype": "Float", "in_list_view": 1},
            {"fieldname": "n2o_emissions_t", "label": "N2O Emissions (t)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
            {"fieldname": "co2e_t", "label": "CO2e (t)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
            {"fieldname": "gwp_fixed", "label": "GWP (N2O)", "fieldtype": "Int", "default": 265, "read_only": 1},
        ],
    )
    print("✅ Nitric Acid N2O Emissions DocType ensured.")
except Exception as e:
    print("❌ Error ensuring Nitric Acid N2O Emissions DocType:", str(e))


