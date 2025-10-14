"""
Hydrocarbon Defaults DocType Creator
Stores hydrocarbon compounds with their carbon ratios for flaring calculations
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

def seed_hydrocarbons():
    """Seed the hydrocarbon defaults"""
    hydrocarbons = [
        {"compound_name": "Methane", "chemical_formula": "CH4", "carbon_ratio": 1},
        {"compound_name": "Ethane", "chemical_formula": "C2H6", "carbon_ratio": 2},
        {"compound_name": "Propane", "chemical_formula": "C3H8", "carbon_ratio": 3},
        {"compound_name": "Butane", "chemical_formula": "C4H10", "carbon_ratio": 4},
        {"compound_name": "Pentane", "chemical_formula": "C5H12", "carbon_ratio": 5},
        {"compound_name": "Hexane", "chemical_formula": "C6H14", "carbon_ratio": 6},
        {"compound_name": "Ethylene (Ethene)", "chemical_formula": "C2H4", "carbon_ratio": 2},
        {"compound_name": "Propylene (Propene)", "chemical_formula": "C3H6", "carbon_ratio": 3},
        {"compound_name": "Butadiene", "chemical_formula": "C4H6", "carbon_ratio": 4},
        {"compound_name": "Benzene", "chemical_formula": "C6H6", "carbon_ratio": 6},
        {"compound_name": "Toluene", "chemical_formula": "C7H8", "carbon_ratio": 7},
        {"compound_name": "Xylenes", "chemical_formula": "C8H10", "carbon_ratio": 8},
        {"compound_name": "Naphthalene", "chemical_formula": "C10H8", "carbon_ratio": 10}
    ]
    
    for hc in hydrocarbons:
        try:
            # Check if already exists
            if not frappe.db.exists("Hydrocarbon Defaults", hc["compound_name"]):
                doc = frappe.get_doc({
                    "doctype": "Hydrocarbon Defaults",
                    "compound_name": hc["compound_name"],
                    "chemical_formula": hc["chemical_formula"],
                    "carbon_ratio": hc["carbon_ratio"],
                    "is_active": 1
                })
                doc.insert(ignore_permissions=True)
                print(f"  ✓ Created: {hc['compound_name']} ({hc['chemical_formula']})")
            else:
                print(f"  - Already exists: {hc['compound_name']}")
        except Exception as e:
            print(f"  ❌ Error creating {hc['compound_name']}: {str(e)}")
    
    frappe.db.commit()

# Main execution
try:
    print("🚀 Creating Hydrocarbon Defaults DocType...")
    
    fields = [
        {"fieldname": "compound_name", "label": "Compound Name", "fieldtype": "Data", "reqd": 1, "unique": 1, "in_list_view": 1},
        {"fieldname": "chemical_formula", "label": "Chemical Formula", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
        {"fieldname": "carbon_ratio", "label": "Carbon Ratio", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "precision": 0},
        {"fieldname": "is_active", "label": "Active", "fieldtype": "Check", "default": 1, "in_list_view": 1}
    ]
    
    ensure_doctype("Hydrocarbon Defaults", fields)
    
    print("🌱 Seeding hydrocarbon data...")
    seed_hydrocarbons()
    
    print("✅ Hydrocarbon Defaults DocType created and seeded successfully.")
    
except Exception as e:
    print("❌ Error ensuring Hydrocarbon Defaults DocType:", str(e))
    print(frappe.get_traceback())
