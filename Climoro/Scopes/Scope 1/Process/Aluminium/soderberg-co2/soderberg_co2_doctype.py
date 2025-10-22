# Soderberg CO2 Emissions DocType Creation Script
# Run this in Frappe Console: bench console

import frappe

doctype_name = "Soderberg CO2 Emissions"

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
            "autoname": "format:SOD-{date}-{####}",
            "fields": [
                # Basic Info
                {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
                {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "reqd": 1},
                {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
                
                # Column A: Type
                {"fieldname": "column_break_1", "fieldtype": "Column Break"},
                {"fieldname": "type_line", "label": "Type of Soderberg Line", "fieldtype": "Select", "options": "HSS\nVSS", "reqd": 1, "in_list_view": 1},
                
                # Column B: Weight of Al
                {"fieldname": "column_break_2", "fieldtype": "Column Break"},
                {"fieldname": "al_weight_t", "label": "Weight of Aluminium Produced (t Al)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column C: Paste consumption
                {"fieldname": "column_break_3", "fieldtype": "Column Break"},
                {"fieldname": "paste_consumption", "label": "Paste Consumption (t paste/t Al)", "fieldtype": "Float", "reqd": 1, "precision": 4},
                
                # Column D: Cyclohexane (readonly)
                {"fieldname": "column_break_4", "fieldtype": "Column Break"},
                {"fieldname": "cyclohexane_kg_per_t", "label": "Emissions of Cyclohexane Soluble Matter (kg/t Al)", "fieldtype": "Float", "read_only": 1, "precision": 1},
                
                # Column E: Binder content
                {"fieldname": "section_break_1", "fieldtype": "Section Break", "label": "Paste Composition"},
                {"fieldname": "binder_content_pct", "label": "Average Binder Content in Paste (%)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column F: Pitch properties
                {"fieldname": "section_break_2", "fieldtype": "Section Break", "label": "Pitch Properties"},
                {"fieldname": "pitch_sulphur_pct", "label": "Sulphur Content in Pitch (wt %)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                {"fieldname": "column_break_5", "fieldtype": "Column Break"},
                {"fieldname": "pitch_ash_pct", "label": "Ash Content in Pitch (wt %)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                {"fieldname": "column_break_6", "fieldtype": "Column Break"},
                {"fieldname": "pitch_hydrogen_pct", "label": "Hydrogen Content in Pitch (wt %)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column G: Coke properties
                {"fieldname": "section_break_3", "fieldtype": "Section Break", "label": "Calcined Coke Properties"},
                {"fieldname": "coke_sulphur_pct", "label": "Sulphur Content in Calcined Coke (wt %)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                {"fieldname": "column_break_7", "fieldtype": "Column Break"},
                {"fieldname": "coke_ash_pct", "label": "Ash Content in Calcined Coke (wt %)", "fieldtype": "Float", "reqd": 1, "precision": 2},
                
                # Column H: Carbon dust
                {"fieldname": "section_break_4", "fieldtype": "Section Break", "label": "Carbon Dust"},
                {"fieldname": "carbon_dust", "label": "Carbon Dust from Soderberg Anode (t dust/t Al)", "fieldtype": "Float", "reqd": 1, "precision": 4},
                
                # Column I: CO2 Emissions (calculated)
                {"fieldname": "section_break_5", "fieldtype": "Section Break", "label": "Calculated Emissions"},
                {"fieldname": "co2_emissions_t", "label": "CO2 Emissions (t CO2)", "fieldtype": "Float", "read_only": 1, "precision": 2, "in_list_view": 1},
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
        print(f"\n🎉 Success! You can now use the Soderberg CO2 Emissions form.")

except Exception as e:
    frappe.log_error(frappe.get_traceback(), "Soderberg CO2 DocType Creation Error")
    print(f"❌ Error creating DocType: {str(e)}")
    print(frappe.get_traceback())

