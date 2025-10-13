# Direct Make-up Chemical Emissions DocType Creation
# Run this in Frappe console: bench --site localhost console

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

print("\n🚀 Ensuring Direct Make-up Chemical Emissions DocType...")
try:
    ensure_doctype(
        "Direct Make-up Chemical Emissions",
        [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "form_type", "label": "Form Type", "fieldtype": "Select", "options": "Make-up Chemicals\nFGD Systems", "reqd": 1, "in_list_view": 1},
            {"fieldname": "sodium_carbonate_amount", "label": "Sodium Carbonate Amount (metric tons/year)", "fieldtype": "Float", "default": 0, "in_list_view": 1},
            {"fieldname": "sodium_carbonate_co2", "label": "Sodium Carbonate CO2 (metric tons CO2/year)", "fieldtype": "Float", "read_only": 1, "default": 0, "in_list_view": 1},
            {"fieldname": "calcium_carbonate_amount", "label": "Calcium Carbonate Amount (metric tons/year)", "fieldtype": "Float", "default": 0, "in_list_view": 1},
            {"fieldname": "calcium_carbonate_co2", "label": "Calcium Carbonate CO2 (metric tons CO2/year)", "fieldtype": "Float", "read_only": 1, "default": 0, "in_list_view": 1},
            {"fieldname": "dolomite_amount", "label": "Dolomite Amount (metric tons/year)", "fieldtype": "Float", "default": 0, "in_list_view": 1},
            {"fieldname": "dolomite_co2", "label": "Dolomite CO2 (metric tons CO2/year)", "fieldtype": "Float", "read_only": 1, "default": 0, "in_list_view": 1},
            {"fieldname": "total_co2_emissions", "label": "Total CO2 Emissions (metric tons CO2/year)", "fieldtype": "Float", "read_only": 1, "default": 0, "in_list_view": 1},
            {"fieldname": "notes", "label": "Notes", "fieldtype": "Text", "in_list_view": 1},
        ],
    )
    print("✅ Direct Make-up Chemical Emissions DocType ensured.")
except Exception as e:
    print("❌ Error ensuring Direct Make-up Chemical Emissions DocType:", str(e))

