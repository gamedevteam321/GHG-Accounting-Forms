import frappe

"""
Default PFC Emissions entries DocType. Paste entire script in bench console.
"""

DTYPE = "Default PFC Emissions"

if not frappe.db.exists("DocType", DTYPE):
    doc = frappe.get_doc({
        "doctype": "DocType",
        "module": "Custom",
        "name": DTYPE,
        "custom": 1,
        "track_changes": 1,
        "fields": [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "reqd": 1},
            {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
            {"fieldname": "technology", "label": "Technology", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
            {"fieldname": "production_t", "label": "Weight of Al produced (t)", "fieldtype": "Float", "precision": 6, "reqd": 1},
            {"fieldname": "ef_cf4_kg_tal", "label": "EF CF4 (kg/t Al)", "fieldtype": "Float", "precision": 6, "read_only": 1},
            {"fieldname": "cf4_kg", "label": "Weight of CF4 Emitted (kg)", "fieldtype": "Float", "precision": 6, "read_only": 1},
            {"fieldname": "ef_c2f6_kg_tal", "label": "EF C2F6 (kg/t Al)", "fieldtype": "Float", "precision": 6, "read_only": 1},
            {"fieldname": "c2f6_kg", "label": "Weight of C2F6 Emitted (kg)", "fieldtype": "Float", "precision": 6, "read_only": 1},
            {"fieldname": "total_co2_t", "label": "Total CO2 Emissions (t)", "fieldtype": "Float", "precision": 6, "read_only": 1, "in_list_view": 1},
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}],
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"✅ Created DocType '{DTYPE}'")
else:
    print(f"✅ DocType '{DTYPE}' already exists")


