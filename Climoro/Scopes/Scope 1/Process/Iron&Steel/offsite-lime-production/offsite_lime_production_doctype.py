"""
Offsite Lime Production Emissions DocType Creator

Copy and paste this entire code into Frappe Console to create the DocType.
"""

import frappe

# Create the Offsite Lime Production Emissions DocType
doctype_name = "Offsite Lime Production Emissions"

try:
    if frappe.db.exists("DocType", doctype_name):
        print(f"DocType '{doctype_name}' already exists.")
    else:
        fields = [
            # Basic Information
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 0},
            {"fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "reqd": 1, "in_list_view": 1},
            
            # Lime Properties
            {"fieldname": "lime_section", "label": "Lime Properties", "fieldtype": "Section Break"},
            {"fieldname": "lime_type", "label": "Lime Type", "fieldtype": "Link", "options": "Offsite Lime Defaults", "reqd": 1, "in_list_view": 1},
            {"fieldname": "amount_produced_t", "label": "Amount Produced (tonnes)", "fieldtype": "Float", "reqd": 1, "precision": 6},
            {"fieldname": "cao_content", "label": "CaO / CaO·MgO Content (fraction)", "fieldtype": "Float", "read_only": 1, "precision": 2},
            {"fieldname": "country_type", "label": "Country Type (for Dolomitic)", "fieldtype": "Data"},
            
            # Stoichiometric Ratio
            {"fieldname": "stoich_section", "label": "Stoichiometric Ratio", "fieldtype": "Section Break"},
            {"fieldname": "stoichiometric_ratio", "label": "Stoichiometric Ratio (fraction)", "fieldtype": "Float", "read_only": 1, "precision": 3},
            
            # Correction for Hydrated Lime
            {"fieldname": "hydrated_section", "label": "Correction for Hydrated Lime", "fieldtype": "Section Break"},
            {"fieldname": "hydrated_proportion", "label": "Proportion of Hydrated Lime Produced (fraction)", "fieldtype": "Float", "read_only": 1, "default": 0.1, "precision": 1},
            {"fieldname": "water_content", "label": "Water Content of Hydrated Lime (fraction)", "fieldtype": "Float", "read_only": 1, "default": 0.28, "precision": 2},
            {"fieldname": "lkd_correction", "label": "Correction for Lime Kiln Dust (LKD) (fraction)", "fieldtype": "Float", "read_only": 1, "default": 1.02, "precision": 2},
            
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
        print(f"\n🎉 Success! You can now use the Offsite Lime Production form.")
        
except Exception as e:
    frappe.log_error(frappe.get_traceback(), "Offsite Lime Production DocType Creation Error")
    print(f"❌ Error creating DocType: {str(e)}")
    print(frappe.get_traceback())

