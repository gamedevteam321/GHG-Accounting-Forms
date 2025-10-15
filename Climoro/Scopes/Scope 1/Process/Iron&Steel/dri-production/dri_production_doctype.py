"""
Direct Reduced Iron (DRI) Production Emissions DocType Creator

Copy and paste this entire code into Frappe Console to create the DocType.
"""

import frappe

# Create the DRI Production Emissions DocType
doctype_name = "DRI Production Emissions"

try:
    if frappe.db.exists("DocType", doctype_name):
        print(f"DocType '{doctype_name}' already exists.")
    else:
        fields = [
            # Basic Information
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 0},
            {"fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "reqd": 1, "in_list_view": 1},
            
            # Step 1: CO2 Emissions - Natural Gas
            {"fieldname": "co2_section", "label": "CO2 Emissions Data", "fieldtype": "Section Break"},
            {"fieldname": "natural_gas_amount_t", "label": "Natural Gas Amount (tonnes)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "natural_gas_carbon_content", "label": "Natural Gas Carbon Content (fraction)", "fieldtype": "Float", "precision": 6},
            
            # Coke Breeze
            {"fieldname": "coke_breeze_amount_t", "label": "Coke Breeze Amount (tonnes)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "coke_breeze_carbon_content", "label": "Coke Breeze Carbon Content (fraction)", "fieldtype": "Float", "precision": 6},
            
            # Metallurgical Coke
            {"fieldname": "metallurgical_coke_amount_t", "label": "Metallurgical Coke Amount (tonnes)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "metallurgical_coke_carbon_content", "label": "Metallurgical Coke Carbon Content (fraction)", "fieldtype": "Float", "precision": 6},
            
            # Total CO2
            {"fieldname": "total_co2_t", "label": "Total CO2 Emissions (tonnes)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "precision": 2},
            
            # Step 2: CH4 Emissions
            {"fieldname": "ch4_section", "label": "CH4 Emissions Data", "fieldtype": "Section Break"},
            {"fieldname": "dri_produced_t", "label": "Amount of DRI Produced (tonnes)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "ch4_emission_factor", "label": "CH4 Emission Factor (kg/unit DRI)", "fieldtype": "Float", "default": 1, "precision": 6},
            {"fieldname": "total_ch4_kg", "label": "Total CH4 Emissions (kg)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "precision": 5},
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
        print(f"\n🎉 Success! You can now use the DRI Production form.")
        
except Exception as e:
    frappe.log_error(frappe.get_traceback(), "DRI Production DocType Creation Error")
    print(f"❌ Error creating DocType: {str(e)}")
    print(frappe.get_traceback())
