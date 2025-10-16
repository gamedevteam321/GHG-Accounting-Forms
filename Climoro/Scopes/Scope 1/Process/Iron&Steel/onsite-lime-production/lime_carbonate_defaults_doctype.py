"""
Lime Carbonate Defaults DocType Creator

Copy and paste this entire code into Frappe Console to create the DocType.
This stores default emission factors for different carbonates used in lime production.
"""

import frappe

# Create the Lime Carbonate Defaults DocType
doctype_name = "Lime Carbonate Defaults"

try:
    if frappe.db.exists("DocType", doctype_name):
        print(f"DocType '{doctype_name}' already exists.")
    else:
        fields = [
            {"fieldname": "carbonate_name", "label": "Carbonate Name", "fieldtype": "Data", "reqd": 1, "in_list_view": 1, "unique": 1},
            {"fieldname": "mineral_name", "label": "Mineral Name(s)", "fieldtype": "Data", "in_list_view": 1},
            {"fieldname": "emission_factor", "label": "Emission Factor (tonnes CO2/tonne carbonate)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "precision": 2},
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
    frappe.log_error(frappe.get_traceback(), "Lime Carbonate Defaults DocType Creation Error")
    print(f"❌ Error creating DocType: {str(e)}")
    print(frappe.get_traceback())

# Seed default carbonate data
try:
    print("\n🌱 Seeding default carbonate data...")
    
    carbonates = [
        {
            "carbonate_name": "CaCO3",
            "mineral_name": "Calcite or aragonite",
            "emission_factor": 0.44,
            "notes": "",
            "is_active": 1
        },
        {
            "carbonate_name": "MgCO3",
            "mineral_name": "Magnesite",
            "emission_factor": 0.52,
            "notes": "",
            "is_active": 1
        },
        {
            "carbonate_name": "Ca(Mg(CO3)2",
            "mineral_name": "Dolomite",
            "emission_factor": 0.48,
            "notes": "",
            "is_active": 1
        },
        {
            "carbonate_name": "FeCO3",
            "mineral_name": "Siderite",
            "emission_factor": 0.38,
            "notes": "",
            "is_active": 1
        },
        {
            "carbonate_name": "Ca(Fe,Mg,Mn)(CO3)2",
            "mineral_name": "Ankerite",
            "emission_factor": 0.44,
            "notes": "Average value used from range 0.40-0.48. You can change or request if you have proof of higher or lower EF value for Ankerite.",
            "is_active": 1
        },
        {
            "carbonate_name": "Na2CO3",
            "mineral_name": "Sodium carbonate or soda ash",
            "emission_factor": 0.38,
            "notes": "",
            "is_active": 1
        },
        {
            "carbonate_name": "MnCO3",
            "mineral_name": "Rhodochrosite",
            "emission_factor": 0.41,
            "notes": "",
            "is_active": 1
        }
    ]
    
    for carb in carbonates:
        if not frappe.db.exists(doctype_name, {"carbonate_name": carb["carbonate_name"]}):
            doc = frappe.get_doc({
                "doctype": doctype_name,
                **carb
            })
            doc.insert(ignore_permissions=True)
            print(f"   ✓ Added: {carb['carbonate_name']} (EF: {carb['emission_factor']})")
        else:
            print(f"   ⊙ Already exists: {carb['carbonate_name']}")
    
    frappe.db.commit()
    print(f"\n🎉 Success! {len(carbonates)} carbonate types seeded.")
    
except Exception as e:
    frappe.log_error(frappe.get_traceback(), "Lime Carbonate Defaults Seeding Error")
    print(f"❌ Error seeding data: {str(e)}")
    print(frappe.get_traceback())

print(f"\n✅ All done! You can now use the Lime Carbonate Defaults in your form.")

