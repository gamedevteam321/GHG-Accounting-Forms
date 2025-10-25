import frappe

"""
Default PFC EF Defaults
Copy/paste this entire script in bench console. It creates the DocType (if missing)
and upserts the default EF rows per technology. Safe to re-run.
"""

DTYPE = "Default PFC EF Defaults"

DEFAULTS = [
    ("Center Work Prebake", 0.4, 0.04),
    ("Side Work Prebake", 1.6, 0.4),
    ("Vertical Stud Soderberg", 0.8, 0.04),
    ("Horizontal Stud Soderberg", 0.4, 0.03),
]

if not frappe.db.exists("DocType", DTYPE):
    doc = frappe.get_doc({
        "doctype": "DocType",
        "module": "Custom",
        "name": DTYPE,
        "custom": 1,
        "track_changes": 1,
        "fields": [
            {"fieldname": "technology", "label": "Technology", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
            {"fieldname": "ef_cf4_kg_tal", "label": "EF CF4 (kg/t Al)", "fieldtype": "Float", "precision": 6, "reqd": 1, "in_list_view": 1},
            {"fieldname": "ef_c2f6_kg_tal", "label": "EF C2F6 (kg/t Al)", "fieldtype": "Float", "precision": 6, "reqd": 1, "in_list_view": 1},
            {"fieldname": "notes", "label": "Notes", "fieldtype": "Small Text"},
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}],
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"✅ Created DocType '{DTYPE}'")
else:
    print(f"✅ DocType '{DTYPE}' already exists")

for tech, cf4, c2f6 in DEFAULTS:
    existing = frappe.get_all(DTYPE, filters={"technology": tech}, limit=1)
    if existing:
        doc = frappe.get_doc(DTYPE, existing[0].name)
        doc.ef_cf4_kg_tal = cf4
        doc.ef_c2f6_kg_tal = c2f6
        doc.save(ignore_permissions=True)
        print(f"🔁 Updated EF for {tech}")
    else:
        row = frappe.get_doc({
            "doctype": DTYPE,
            "technology": tech,
            "ef_cf4_kg_tal": cf4,
            "ef_c2f6_kg_tal": c2f6,
        })
        row.insert(ignore_permissions=True)
        print(f"➕ Inserted EF for {tech}")

frappe.db.commit()
print("✅ Default PFCS EF defaults seeded")


