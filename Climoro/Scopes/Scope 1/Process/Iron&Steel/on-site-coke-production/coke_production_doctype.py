"""
Coke Production Emissions DocType Creator
Stores daily entries for on-site coke production CO2 and CH4 emissions
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
    print("🚀 Creating Coke Production Emissions DocType...")
    
    fields = [
        # Basic Info
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
        {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 0},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "reqd": 1, "in_list_view": 1},
        
        # Section Break - CO2 Emissions
        {"fieldname": "co2_section", "label": "CO2 Emissions Data", "fieldtype": "Section Break"},
        
        # Coking Coal Consumed (stored as JSON array)
        {"fieldname": "coking_coal_consumed_json", "label": "Coking Coal Consumed (JSON)", "fieldtype": "Long Text"},
        
        # Blast Furnace Gas
        {"fieldname": "blast_furnace_gas_amount", "label": "Blast Furnace Gas Amount (t)", "fieldtype": "Float", "in_list_view": 0},
        {"fieldname": "blast_furnace_gas_carbon_content", "label": "BF Gas Carbon Content", "fieldtype": "Float", "read_only": 1, "precision": 4},
        
        # Coke Produced
        {"fieldname": "coke_produced_amount", "label": "Coke Produced Amount (t)", "fieldtype": "Float", "in_list_view": 0},
        {"fieldname": "coke_produced_carbon_content", "label": "Coke Carbon Content", "fieldtype": "Float", "read_only": 1, "precision": 4},
        
        # Coke Oven Gas
        {"fieldname": "coke_oven_gas_amount", "label": "Coke Oven Gas Amount (t)", "fieldtype": "Float", "in_list_view": 0},
        {"fieldname": "coke_oven_gas_carbon_content", "label": "COG Carbon Content", "fieldtype": "Float", "read_only": 1, "precision": 4},
        
        # Byproducts (stored as JSON array)
        {"fieldname": "byproducts_json", "label": "Byproducts (JSON)", "fieldtype": "Long Text"},
        
        # Column Break
        {"fieldname": "co2_column_break", "fieldtype": "Column Break"},
        
        # CO2 Total
        {"fieldname": "co2_emissions_tonnes", "label": "Total CO2 Emissions (t)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "precision": 2},
        
        # Section Break - CH4 Emissions
        {"fieldname": "ch4_section", "label": "CH4 Emissions Data", "fieldtype": "Section Break"},
        
        # CH4 Inputs
        {"fieldname": "ch4_coke_produced_tonnes", "label": "Coke Produced Onsite (t)", "fieldtype": "Float", "in_list_view": 0},
        {"fieldname": "ch4_emission_factor", "label": "CH4 Emission Factor (g/unit)", "fieldtype": "Float", "read_only": 1, "default": 0.1},
        
        # Column Break
        {"fieldname": "ch4_column_break", "fieldtype": "Column Break"},
        
        # CH4 Total
        {"fieldname": "ch4_emissions_kg", "label": "Total CH4 Emissions (kg)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "precision": 2},
    ]
    
    ensure_doctype("Coke Production Emissions", fields)
    print("✅ Coke Production Emissions DocType ensured.")
    
except Exception as e:
    print("❌ Error ensuring Coke Production Emissions DocType:", str(e))
    print(frappe.get_traceback())

