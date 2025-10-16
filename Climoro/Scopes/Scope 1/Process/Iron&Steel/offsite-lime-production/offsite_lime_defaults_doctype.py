"""
Offsite Lime Defaults DocType Creator

Copy and paste this entire code into Frappe Console to create the DocType.
This stores default stoichiometric ratios and CaO content for different lime types.
"""

import frappe

# Create the Offsite Lime Defaults DocType
doctype_name = "Offsite Lime Defaults"

try:
    if frappe.db.exists("DocType", doctype_name):
        print(f"DocType '{doctype_name}' already exists.")
    else:
        fields = [
            {"fieldname": "lime_type", "label": "Lime Type", "fieldtype": "Data", "reqd": 1, "in_list_view": 1, "unique": 1},
            {"fieldname": "stoichiometric_ratio", "label": "Stoichiometric Ratio (fraction)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "precision": 3},
            {"fieldname": "default_cao_content", "label": "Default CaO/CaO·MgO Content (fraction)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "precision": 2},
            {"fieldname": "cao_range_min", "label": "CaO Range Min (%)", "fieldtype": "Float", "precision": 1},
            {"fieldname": "cao_range_max", "label": "CaO Range Max (%)", "fieldtype": "Float", "precision": 1},
            {"fieldname": "mgo_range_min", "label": "MgO Range Min (%)", "fieldtype": "Float", "precision": 1},
            {"fieldname": "mgo_range_max", "label": "MgO Range Max (%)", "fieldtype": "Float", "precision": 1},
            {"fieldname": "notes", "label": "Notes", "fieldtype": "Small Text"},
            {"fieldname": "is_active", "label": "Is Active", "fieldtype": "Check", "default": 1, "in_list_view": 1},
        ]

        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": doctype_name,
            "module": "Custom",
            "custom": 1,
            "is_submittable": 0,
            "track_changes": 1,
            "fields": fields,
            "permissions": [
                {
                    "role": "System Manager",
                    "read": 1,
                    "write": 1,
                    "create": 1,
                    "delete": 1
                }
            ]
        })
        
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print(f"✅ DocType '{doctype_name}' created successfully.")

        # Ensure table is created
        frappe.db.updatedb(doctype_name)
        frappe.db.commit()
        print(f"✅ Database table for '{doctype_name}' created/updated.")
        
except Exception as e:
    frappe.log_error(frappe.get_traceback(), "Offsite Lime Defaults DocType Creation Error")
    print(f"❌ Error creating DocType: {str(e)}")
    print(frappe.get_traceback())

# Seed default lime type data
try:
    print("\n🌱 Seeding default lime type data...")
    
    lime_types = [
        {
            "lime_type": "High-calcium lime",
            "stoichiometric_ratio": 0.785,
            "default_cao_content": 0.95,
            "cao_range_min": 93.0,
            "cao_range_max": 98.0,
            "mgo_range_min": 0.3,
            "mgo_range_max": 2.5,
            "notes": "Range of CaO content: 93-98%. Range of MgO content: 0.3-2.5%.",
            "is_active": 1
        },
        {
            "lime_type": "Dolomitic lime",
            "stoichiometric_ratio": 0.913,
            "default_cao_content": 0.95,
            "cao_range_min": 55.0,
            "cao_range_max": 57.0,
            "mgo_range_min": 38.0,
            "mgo_range_max": 41.0,
            "notes": "Range of CaO content: 55-57%. Range of MgO content: 38-41%. Default CaO/CaO·MgO: 0.95 (developed countries) or 0.85 (developing countries).",
            "is_active": 1
        },
        {
            "lime_type": "Hydraulic lime",
            "stoichiometric_ratio": 0.765,
            "default_cao_content": 0.75,
            "cao_range_min": 65.0,
            "cao_range_max": 92.0,
            "mgo_range_min": None,
            "mgo_range_max": None,
            "notes": "Range of CaO content: 65-92%.",
            "is_active": 1
        }
    ]
    
    for lime in lime_types:
        if not frappe.db.exists(doctype_name, {"lime_type": lime["lime_type"]}):
            doc = frappe.get_doc({
                "doctype": doctype_name,
                **lime
            })
            doc.insert(ignore_permissions=True)
            print(f"   ✓ Added: {lime['lime_type']} (Stoich: {lime['stoichiometric_ratio']}, CaO: {lime['default_cao_content']})")
        else:
            print(f"   ⊙ Already exists: {lime['lime_type']}")
    
    frappe.db.commit()
    print(f"\n🎉 Success! {len(lime_types)} lime types seeded.")
    
except Exception as e:
    frappe.log_error(frappe.get_traceback(), "Offsite Lime Defaults Seeding Error")
    print(f"❌ Error seeding data: {str(e)}")
    print(frappe.get_traceback())

print(f"\n✅ All done! You can now use the Offsite Lime Defaults in your form.")

