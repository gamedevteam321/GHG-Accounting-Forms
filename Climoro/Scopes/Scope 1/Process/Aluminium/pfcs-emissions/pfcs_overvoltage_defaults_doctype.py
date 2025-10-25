import frappe

"""
Copy/paste the entire block in bench console.
Idempotent: creates DocType if missing and upserts default rows.
"""

OV_DTYPE = "PFC Overvoltage Defaults"
DEFAULTS = [
    ("Center Work Prebake", 1.16, 0.121),
    ("Side Work Prebake", 3.65, 0.252),
]

# Create DocType if missing
if not frappe.db.exists("DocType", OV_DTYPE):
    _doc = frappe.get_doc({
        "doctype": "DocType",
        "module": "Custom",
        "name": OV_DTYPE,
        "custom": 1,
        "track_changes": 1,
        "fields": [
            {"fieldname": "cell_type", "label": "Cell Type", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
            {"fieldname": "cf4_overvoltage_coeff", "label": "CF4 Overvoltage Coefficient", "fieldtype": "Float", "precision": 6, "reqd": 1, "in_list_view": 1},
            {"fieldname": "weight_fraction_c2f6_cf4", "label": "Weight Fraction C2F6/CF4", "fieldtype": "Float", "precision": 6, "reqd": 1, "in_list_view": 1},
            {"fieldname": "notes", "label": "Notes", "fieldtype": "Small Text"},
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}],
    })
    _doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"✅ Created DocType '{OV_DTYPE}'")
else:
    print(f"✅ DocType '{OV_DTYPE}' already exists")

# Upsert defaults
for cell_type, coeff, frac in DEFAULTS:
    existing = frappe.get_all(OV_DTYPE, filters={"cell_type": cell_type}, limit=1)
    if existing:
        doc = frappe.get_doc(OV_DTYPE, existing[0].name)
        doc.cf4_overvoltage_coeff = coeff
        doc.weight_fraction_c2f6_cf4 = frac
        doc.save(ignore_permissions=True)
        print(f"🔁 Updated default for {cell_type}")
    else:
        row = frappe.get_doc({
            "doctype": OV_DTYPE,
            "cell_type": cell_type,
            "cf4_overvoltage_coeff": coeff,
            "weight_fraction_c2f6_cf4": frac,
        })
        row.insert(ignore_permissions=True)
        print(f"➕ Inserted default for {cell_type}")

frappe.db.commit()
print("✅ Overvoltage defaults seeded")
