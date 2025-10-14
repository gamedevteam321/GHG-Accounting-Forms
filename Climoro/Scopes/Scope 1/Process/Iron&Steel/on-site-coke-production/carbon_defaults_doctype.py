"""
Carbon Content Defaults DocType Creator and Seeder
Global DocType for storing carbon content values for all Iron & Steel materials
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


def seed_carbon_defaults():
    """Seed Carbon Content Defaults with all 21 materials from Appendix C"""
    
    materials = [
        # Material Name, Carbon Content (kg C/kg), Category
        ("Blast Furnace Gas", 0.2600, "gas"),
        ("Charcoal", 0.7490, "solid"),
        ("Coal", 0.7310, "solid"),
        ("Coal tar", 0.6200, "liquid"),
        ("Coke", 0.8250, "solid"),
        ("Coke Oven gas", 0.3500, "gas"),
        ("Coking Coal", 0.7310, "solid"),
        ("Direct reduced Iron (DRI)", 0.0200, "solid"),
        ("Dolomite", 0.1300, "solid"),
        ("EAF Carbon Electrodes", 0.9980, "solid"),
        ("EAF Charge Carbon", 0.0080, "solid"),
        ("Fuel Oil", 0.7700, "liquid"),
        ("Gas Coke", 0.8250, "solid"),
        ("Hot Briquetted iron", 0.0200, "solid"),
        ("Limestone", 0.1200, "solid"),
        ("Natural Gas", 0.7300, "gas"),
        ("Oxygen Steel Furnace Gas", 0.4750, "gas"),
        ("Petroleum Coke", 0.8750, "solid"),
        ("Purchased pig Iron", 0.0450, "solid"),
        ("Scrap Iron", 0.0080, "solid"),
        ("Steel", 0.0080, "solid"),
    ]
    
    for fuel_name, carbon_content, category in materials:
        try:
            # Check if exists
            if frappe.db.exists("Carbon Content Defaults", {"fuel_name": fuel_name}):
                # Update existing
                doc = frappe.get_doc("Carbon Content Defaults", {"fuel_name": fuel_name})
                doc.carbon_content_kg_per_kg = carbon_content
                doc.category = category
                doc.is_active = 1
                doc.save(ignore_permissions=True)
                print(f"  ↻ Updated: {fuel_name}")
            else:
                # Create new
                doc = frappe.get_doc({
                    "doctype": "Carbon Content Defaults",
                    "fuel_name": fuel_name,
                    "carbon_content_kg_per_kg": carbon_content,
                    "category": category,
                    "is_active": 1
                })
                doc.insert(ignore_permissions=True)
                print(f"  ✓ Created: {fuel_name}")
            
            frappe.db.commit()
        except Exception as e:
            print(f"  ❌ Error seeding {fuel_name}:", str(e))
            continue
    
    print("✓ Seeded Carbon Content Defaults")


# Main execution
try:
    print("🚀 Ensuring Carbon Content Defaults DocType...")
    
    fields = [
        {"fieldname": "fuel_name", "label": "Fuel/Material Name", "fieldtype": "Data", "reqd": 1, "unique": 1, "in_list_view": 1},
        {"fieldname": "carbon_content_kg_per_kg", "label": "Carbon Content (kg C/kg)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "precision": 4},
        {"fieldname": "category", "label": "Category", "fieldtype": "Select", "options": "solid\nliquid\ngas", "in_list_view": 1},
        {"fieldname": "is_active", "label": "Active", "fieldtype": "Check", "default": 1, "in_list_view": 1},
    ]
    
    ensure_doctype("Carbon Content Defaults", fields)
    seed_carbon_defaults()
    
    print("✅ Carbon Content Defaults DocType ensured and seeded.")
    
except Exception as e:
    print("❌ Error ensuring Carbon Content Defaults:", str(e))
    print(frappe.get_traceback())

