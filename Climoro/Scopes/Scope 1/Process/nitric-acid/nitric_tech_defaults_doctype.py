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
        ("Atmospheric pressure plant (low pressure)", 5.00),
        ("Plants with NSCR (all processes)", 2.00),
        ("Plants with process-integrated or tailgas N2O destruction", 2.50),
        ("Medium pressure combustion plant", 7.00),
        ("High pressure plants", 9.00),
    ]
    for tech, ef in rows:
        existing = frappe.get_all("Nitric Acid Technology Defaults", fields=["name"], filters={"technology_name": tech}, limit=1)
        if existing:
            doc = frappe.get_doc("Nitric Acid Technology Defaults", existing[0]["name"])
            doc.default_ef_kg_per_t = ef
            doc.is_active = 1
            doc.save(ignore_permissions=True)
        else:
            d = frappe.new_doc("Nitric Acid Technology Defaults")
            d.technology_name = tech
            d.default_ef_kg_per_t = ef
            d.is_active = 1
            d.insert(ignore_permissions=True)
    frappe.db.commit()


print("\n🚀 Ensuring Nitric Acid Technology Defaults...")
try:
    ensure_doctype(
        "Nitric Acid Technology Defaults",
        [
            {"fieldname": "technology_name", "label": "Technology", "fieldtype": "Data", "reqd": 1, "in_list_view": 1, "unique": 1},
            {"fieldname": "default_ef_kg_per_t", "label": "Default EF (kg N2O/t HNO3)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
            {"fieldname": "is_active", "label": "Active", "fieldtype": "Check", "default": 1, "in_list_view": 1},
        ],
    )
    seed_defaults()
    print("✅ Nitric Acid Technology Defaults ensured.")
except Exception as e:
    print("❌ Error ensuring Nitric Acid Technology Defaults:", str(e))


