import frappe


def ensure_doctype(name, fields, module_hint="Climoro Onboarding"):
    frappe.db.connect()
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
        doc.append("permissions", {"role": "All", "read": 1})
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
    try:
        frappe.db.updatedb(name)
    except Exception:
        pass


print("\n🚀 Ensuring Semiconductor PFC Defaults DocType...")
try:
    ensure_doctype(
        "Semiconductor PFC Defaults",
        [
            {"fieldname": "chemical_name", "label": "Chemical Name", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
            {"fieldname": "gwp", "label": "GWP100", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
            {"fieldname": "ci_utilization", "label": "Ci (Utilization Factor)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
            {"fieldname": "one_minus_ci", "label": "(1-Ci)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
            {"fieldname": "ai_destruction_efficiency", "label": "ai.j (Destruction Efficiency %)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
            {"fieldname": "byproduct_ef_bi", "label": "Bi (Byproduct EF)", "fieldtype": "Float", "default": 0, "in_list_view": 1},
            {"fieldname": "is_active", "label": "Active", "fieldtype": "Check", "default": 1, "in_list_view": 1},
        ],
    )

    # Seed data
    def upsert_chemical(chem_name, gwp, ci, ai_j, bi=0):
        filters = {"chemical_name": chem_name}
        existing = frappe.get_all("Semiconductor PFC Defaults", fields=["name"], filters=filters, limit=1)
        one_minus_ci = 1 - ci
        if existing:
            doc = frappe.get_doc("Semiconductor PFC Defaults", existing[0]["name"])
            doc.gwp = gwp
            doc.ci_utilization = ci
            doc.one_minus_ci = one_minus_ci
            doc.ai_destruction_efficiency = ai_j
            doc.byproduct_ef_bi = bi
            doc.is_active = 1
            doc.save(ignore_permissions=True)
        else:
            doc = frappe.new_doc("Semiconductor PFC Defaults")
            doc.chemical_name = chem_name
            doc.gwp = gwp
            doc.ci_utilization = ci
            doc.one_minus_ci = one_minus_ci
            doc.ai_destruction_efficiency = ai_j
            doc.byproduct_ef_bi = bi
            doc.is_active = 1
            doc.insert(ignore_permissions=True)

    # Seed all 7 chemicals
    upsert_chemical("C2F6", 9200, 0.30, 90.0, 0.10)
    upsert_chemical("CF4", 6500, 0.20, 90.0, 0)
    upsert_chemical("CHF3", 11700, 0.70, 90.0, 0)
    upsert_chemical("SF6", 23900, 0.50, 90.0, 0)
    upsert_chemical("NF3", 8000, 0.80, 90.0, 0)
    upsert_chemical("C3F8", 7000, 0.60, 90.0, 0.20)
    upsert_chemical("C4F8", 8700, 0.70, 90.0, 0)

    frappe.db.commit()
    print("✅ Semiconductor PFC Defaults DocType ensured and seeded.")
except Exception as e:
    print("❌ Error ensuring Semiconductor PFC Defaults DocType:", str(e))
    print(frappe.get_traceback())

