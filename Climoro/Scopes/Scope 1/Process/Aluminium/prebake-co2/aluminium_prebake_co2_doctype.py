"""
Aluminium Prebake CO2 Emissions DocType Creator

Copy and paste this entire code into Frappe Console to create the DocType.
This form handles both Part A (Electrolysis) and Part B (Anode Baking) emissions.
"""

import frappe

# Create the Aluminium Prebake CO2 Emissions DocType
doctype_name = "Aluminium Prebake CO2 Emissions"

try:
    if frappe.db.exists("DocType", doctype_name):
        print(f"DocType '{doctype_name}' already exists.")
    else:
        fields = [
            # Basic Information
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 0},
            {"fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "reqd": 1, "in_list_view": 1},
            
            # Part A: Electrolysis Emissions (stored as JSON array)
            {"fieldname": "parta_section", "label": "Part A: Electrolysis Emissions", "fieldtype": "Section Break"},
            {"fieldname": "parta_entries_json", "label": "Part A Entries (JSON)", "fieldtype": "Long Text"},
            {"fieldname": "parta_total_co2_t", "label": "Part A Total CO2 (tonnes)", "fieldtype": "Float", "read_only": 1, "precision": 2},
            
            # Part B: Anode Baking Emissions (stored as JSON array)
            {"fieldname": "partb_section", "label": "Part B: Anode Baking Emissions", "fieldtype": "Section Break"},
            {"fieldname": "partb_entries_json", "label": "Part B Entries (JSON)", "fieldtype": "Long Text"},
            {"fieldname": "partb_total_co2_t", "label": "Part B Total CO2 (tonnes)", "fieldtype": "Float", "read_only": 1, "precision": 2},
            
            # Total CO2 Emissions
            {"fieldname": "total_section", "label": "Total Emissions", "fieldtype": "Section Break"},
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
        print(f"\n🎉 Success! You can now use the Aluminium Prebake CO2 Emissions form.")
        
except Exception as e:
    frappe.log_error(frappe.get_traceback(), "Aluminium Prebake CO2 DocType Creation Error")
    print(f"❌ Error creating DocType: {str(e)}")
    print(frappe.get_traceback())

