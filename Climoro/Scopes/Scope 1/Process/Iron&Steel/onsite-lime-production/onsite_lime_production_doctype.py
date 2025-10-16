"""
Onsite Lime Production Emissions DocType Creator

Copy and paste this entire code into Frappe Console to create the DocType.
"""

import frappe

# Create the Onsite Lime Production Emissions DocType
doctype_name = "Onsite Lime Production Emissions"

try:
    if frappe.db.exists("DocType", doctype_name):
        print(f"DocType '{doctype_name}' already exists.")
    else:
        fields = [
            # Basic Information
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 0},
            {"fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "reqd": 1, "in_list_view": 1},
            
            # Carbonate Properties
            {"fieldname": "carbonate_section", "label": "Carbonate Properties", "fieldtype": "Section Break"},
            {"fieldname": "carbonate", "label": "Carbonate", "fieldtype": "Link", "options": "Lime Carbonate Defaults", "reqd": 1, "in_list_view": 1},
            {"fieldname": "emission_factor", "label": "Carbonate-specific Emission Factor", "fieldtype": "Float", "read_only": 1, "precision": 2},
            {"fieldname": "carbonate_amount_t", "label": "Amount of Carbonate Used (tonnes)", "fieldtype": "Float", "reqd": 1, "precision": 6},
            {"fieldname": "fraction_calc_carbonate", "label": "Fraction Calcination Achieved for Carbonate (fraction)", "fieldtype": "Float", "read_only": 1, "default": 1.0, "precision": 6},
            
            # LKD Properties
            {"fieldname": "lkd_section", "label": "Lime Kiln Dust (LKD) Properties", "fieldtype": "Section Break"},
            {"fieldname": "lkd_amount_t", "label": "Amount of LKD (tonnes)", "fieldtype": "Float", "reqd": 1, "precision": 6},
            {"fieldname": "weight_fraction_lkd", "label": "Weight Fraction of Original Carbonate in LKD (fraction)", "fieldtype": "Float", "reqd": 1, "precision": 6},
            {"fieldname": "fraction_calc_lkd", "label": "Fraction Calcination Achieved for LKD (fraction)", "fieldtype": "Float", "reqd": 1, "default": 1.0, "precision": 6},
            
            # CO2 Emissions
            {"fieldname": "emissions_section", "label": "CO2 Emissions", "fieldtype": "Section Break"},
            {"fieldname": "total_co2_t", "label": "Total CO2 Emissions (tonnes)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "precision": 2},
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
        print(f"\n🎉 Success! You can now use the Onsite Lime Production form.")
        
except Exception as e:
    frappe.log_error(frappe.get_traceback(), "Onsite Lime Production DocType Creation Error")
    print(f"❌ Error creating DocType: {str(e)}")
    print(frappe.get_traceback())

