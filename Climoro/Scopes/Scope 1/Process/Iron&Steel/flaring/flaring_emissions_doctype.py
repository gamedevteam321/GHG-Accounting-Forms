"""
Flaring Emissions DocType Creator
Stores daily entries for flaring CO2 and CH4 emissions
"""

import frappe

def ensure_doctype(doctype_name, fields):
    """Create or update a DocType"""
    try:
        frappe.db.connect()  # Ensure connection
        
        if frappe.db.exists("DocType", doctype_name):
            print(f"✓ DocType '{doctype_name}' already exists")
            return
        
        # Determine module
        module = "climoro_onboarding" if frappe.db.exists("Module Def", "climoro_onboarding") else "Core"
        
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": doctype_name,
            "module": module,
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
        print(f"✓ Created DocType: {doctype_name}")
        
        # Ensure table is created
        frappe.db.updatedb(doctype_name)
        frappe.db.commit()
        
    except Exception as e:
        print(f"❌ Error creating DocType {doctype_name}:", str(e))
        print(frappe.get_traceback())
        raise

# Main execution
try:
    print("🚀 Creating Flaring Emissions DocType...")
    
    fields = [
        # Basic Info
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
        {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 0},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "reqd": 1, "in_list_view": 1},
        
        # Section Break - Flaring Data
        {"fieldname": "flaring_section", "label": "Flaring Emissions Data", "fieldtype": "Section Break"},
        
        # Volume gas flared
        {"fieldname": "volume_gas_flared_scf", "label": "Volume Gas Flared (scf)", "fieldtype": "Float", "reqd": 1, "in_list_view": 0, "precision": 2},
        
        # Hydrocarbon entries (stored as JSON array)
        {"fieldname": "hydrocarbon_entries_json", "label": "Hydrocarbon Entries (JSON)", "fieldtype": "Long Text"},
        
        # Total hydrocarbon ratio (calculated)
        {"fieldname": "total_hydrocarbon_ratio", "label": "Total Hydrocarbon Ratio", "fieldtype": "Float", "read_only": 1, "precision": 6},
        
        # Column Break
        {"fieldname": "flaring_column_break", "fieldtype": "Column Break"},
        
        # CO2 related inputs
        {"fieldname": "amount_co2_in_flared_gas", "label": "Amount of CO2 in Flared Gas", "fieldtype": "Float", "in_list_view": 0, "precision": 6},
        {"fieldname": "flaring_combustion_efficiency", "label": "Flaring Combustion Efficiency for CO2", "fieldtype": "Float", "in_list_view": 0, "precision": 6},
        
        # CH4 related inputs  
        {"fieldname": "uncombusted_flared_gas_fraction", "label": "Uncombusted Flared Gas (Fraction)", "fieldtype": "Float", "in_list_view": 0, "precision": 6},
        {"fieldname": "amount_methane_in_flared_gas", "label": "Amount of Methane in Flared Gas", "fieldtype": "Float", "in_list_view": 0, "precision": 6},
        
        # Section Break - Results
        {"fieldname": "results_section", "label": "Calculated Results", "fieldtype": "Section Break"},
        
        # Calculated emissions
        {"fieldname": "co2_emissions_tonnes", "label": "CO2 Emissions (tonnes)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "precision": 6},
        
        # Column Break
        {"fieldname": "results_column_break", "fieldtype": "Column Break"},
        
        {"fieldname": "ch4_emissions_tonnes", "label": "CH4 Emissions (tonnes)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "precision": 6}
    ]
    
    ensure_doctype("Flaring Emissions", fields)
    print("✅ Flaring Emissions DocType created successfully.")
    
except Exception as e:
    print("❌ Error ensuring Flaring Emissions DocType:", str(e))
    print(frappe.get_traceback())
