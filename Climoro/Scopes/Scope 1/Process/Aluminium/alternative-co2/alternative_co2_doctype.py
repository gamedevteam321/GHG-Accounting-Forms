# Alternative Electrolysis CO2 Emissions DocType Creation Script
# Run this in Frappe Console: bench console

import frappe

doctype_name = "Alternative Electrolysis CO2 Emissions"

try:
    if frappe.db.exists("DocType", doctype_name):
        print(f"DocType '{doctype_name}' already exists.")
    else:
        doctype_dict = {
            "doctype": "DocType",
            "name": doctype_name,
            "module": "Custom",
            "custom": 1,
            "is_submittable": 0,
            "track_changes": 1,
            "naming_rule": "Expression",
            "autoname": "format:ALT-CO2-{date}-{####}",
            "fields": [
                # Basic Info
                {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
                {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "reqd": 1},
                {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
                
                # Column A: Total pitch consumption
                {"fieldname": "section_break_1", "fieldtype": "Section Break", "label": "Carbon Materials Consumption"},
                {"fieldname": "total_pitch_consumption", "label": "Total Pitch Consumption (t)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column B: Carbon content of pitch
                {"fieldname": "column_break_1", "fieldtype": "Column Break"},
                {"fieldname": "carbon_content_pitch", "label": "Carbon Content of Pitch (%)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column C: Total coke consumption
                {"fieldname": "column_break_2", "fieldtype": "Column Break"},
                {"fieldname": "total_coke_consumption", "label": "Total Coke Consumption (t)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column D: Carbon content of coke
                {"fieldname": "section_break_2", "fieldtype": "Section Break"},
                {"fieldname": "carbon_content_coke", "label": "Carbon Content of Coke (%)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column E: Total packing coke consumption
                {"fieldname": "column_break_3", "fieldtype": "Column Break"},
                {"fieldname": "total_packing_coke", "label": "Total Packing Coke Consumption (t)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column F: Carbon content of packing coke
                {"fieldname": "column_break_4", "fieldtype": "Column Break"},
                {"fieldname": "carbon_content_packing_coke", "label": "Carbon Content of Packing Coke (%)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column G: Total carbon by-products/waste
                {"fieldname": "section_break_3", "fieldtype": "Section Break", "label": "Carbon By-products and Anodes"},
                {"fieldname": "total_carbon_waste", "label": "Total Carbon By-products/Waste (t)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column H: Total mass of purchased anodes
                {"fieldname": "column_break_5", "fieldtype": "Column Break"},
                {"fieldname": "total_purchased_anodes", "label": "Total Mass of Purchased Anodes (t)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column I: Carbon content of purchased anodes
                {"fieldname": "column_break_6", "fieldtype": "Column Break"},
                {"fieldname": "carbon_content_purchased_anodes", "label": "Carbon Content of Purchased Anodes (%)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column J: Mass of sold anodes
                {"fieldname": "section_break_4", "fieldtype": "Section Break"},
                {"fieldname": "mass_sold_anodes", "label": "Mass of Sold Anodes (t)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column K: Carbon content of sold anodes
                {"fieldname": "column_break_7", "fieldtype": "Column Break"},
                {"fieldname": "carbon_content_sold_anodes", "label": "Carbon Content of Sold Anodes (%)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column L: CO2 Emissions (calculated)
                {"fieldname": "section_break_5", "fieldtype": "Section Break", "label": "Calculated Emissions"},
                {"fieldname": "co2_emissions", "label": "CO2 Emissions (t CO2)", "fieldtype": "Float", "read_only": 1, "precision": 2, "in_list_view": 1},
            ],
            "permissions": [
                {
                    "role": "System Manager",
                    "read": 1,
                    "write": 1,
                    "create": 1,
                    "delete": 1,
                }
            ],
        }
        
        doc = frappe.get_doc(doctype_dict)
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        
        print(f"✅ DocType '{doctype_name}' created successfully!")
        print(f"\n🎉 Success! You can now use the Alternative CO2 Emissions form.")

except Exception as e:
    frappe.log_error(frappe.get_traceback(), "Alternative CO2 DocType Creation Error")
    print(f"❌ Error creating DocType: {str(e)}")
    print(frappe.get_traceback())

