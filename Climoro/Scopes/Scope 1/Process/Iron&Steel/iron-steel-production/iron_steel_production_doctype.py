"""
Iron & Steel Production Emissions DocType Creator

Copy and paste this entire code into Frappe Console to create the DocType.
"""

import frappe

# Create the Iron Steel Production Emissions DocType
doctype_name = "Iron Steel Production Emissions"

try:
    if frappe.db.exists("DocType", doctype_name):
        print(f"DocType '{doctype_name}' already exists.")
    else:
        fields = [
            # Basic Information
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 0},
            {"fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "reqd": 1, "in_list_view": 1},
            
            # Step 1: CO2 Emissions
            {"fieldname": "co2_section", "label": "CO2 Emissions Data", "fieldtype": "Section Break"},
            
            # Resources consumed (stored as JSON array)
            {"fieldname": "resources_json", "label": "Resources Consumed (JSON)", "fieldtype": "Long Text"},
            {"fieldname": "total_resources_carbon_t", "label": "Total Resources Carbon (tonnes C)", "fieldtype": "Float", "precision": 6, "read_only": 1},
            
            # Steel produced at facility
            {"fieldname": "steel_amount_t", "label": "Steel Amount (tonnes)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "steel_carbon_content", "label": "Steel Carbon Content (fraction)", "fieldtype": "Float", "precision": 6},
            
            # Iron not converted into steel
            {"fieldname": "iron_amount_t", "label": "Iron Amount (tonnes)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "iron_carbon_content", "label": "Iron Carbon Content (fraction)", "fieldtype": "Float", "precision": 6},
            
            # Blast furnace gas transferred offsite
            {"fieldname": "bfg_amount_t", "label": "BFG Amount (tonnes)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "bfg_carbon_content", "label": "BFG Carbon Content (fraction)", "fieldtype": "Float", "precision": 6},
            
            # Total CO2
            {"fieldname": "total_co2_t", "label": "Total CO2 Emissions (tonnes)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "precision": 2},
            
            # Step 2: CH4 Emissions from Pig Iron Production
            {"fieldname": "ch4_section", "label": "CH4 Emissions Data", "fieldtype": "Section Break"},
            {"fieldname": "pig_iron_produced_t", "label": "Amount of Pig Iron Produced (tonnes)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "ch4_emission_factor", "label": "CH4 Emission Factor (kg/unit pig iron)", "fieldtype": "Float", "precision": 6},
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
        print(f"\n🎉 Success! You can now use the Iron & Steel Production form.")
        
except Exception as e:
    frappe.log_error(frappe.get_traceback(), "Iron Steel Production DocType Creation Error")
    print(f"❌ Error creating DocType: {str(e)}")
    print(frappe.get_traceback())

