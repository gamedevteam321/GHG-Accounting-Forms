# Make-up Chemical Defaults DocType Creation
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

def seed_defaults():
    rows = [
        ("Sodium Carbonate", 0.415),
        ("Calcium Carbonate", 0.440),
        ("Dolomite", 0.477),
    ]
    for chemical, ef in rows:
        existing = frappe.get_all("Make-up Chemical Defaults", fields=["name"], filters={"chemical_name": chemical}, limit=1)
        if existing:
            doc = frappe.get_doc("Make-up Chemical Defaults", existing[0]["name"])
            doc.emission_factor_kg_co2_per_kg = ef
            doc.is_active = 1
            doc.save(ignore_permissions=True)
        else:
            d = frappe.new_doc("Make-up Chemical Defaults")
            d.chemical_name = chemical
            d.emission_factor_kg_co2_per_kg = ef
            d.is_active = 1
            d.insert(ignore_permissions=True)
    frappe.db.commit()

print("\n🚀 Ensuring Make-up Chemical Defaults...")
try:
    ensure_doctype(
        "Make-up Chemical Defaults",
        [
            {"fieldname": "chemical_name", "label": "Chemical Name", "fieldtype": "Data", "reqd": 1, "in_list_view": 1, "unique": 1},
            {"fieldname": "emission_factor_kg_co2_per_kg", "label": "Emission Factor (kg CO2/kg chemical)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
            {"fieldname": "is_active", "label": "Active", "fieldtype": "Check", "default": 1, "in_list_view": 1},
        ],
    )
    seed_defaults()
    print("✅ Make-up Chemical Defaults ensured.")
except Exception as e:
    print("❌ Error ensuring Make-up Chemical Defaults:", str(e))

