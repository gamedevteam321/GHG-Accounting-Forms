# Console script to check GWP Chemical doctype and Fugitive Scale Base
# Copy and paste this entire code into your Frappe bench console

import frappe

print("🔍 CHECKING GWP CHEMICAL AND FUGITIVE SCALE BASE")
print("=" * 60)

# Check GWP Chemical doctype
print("\n1. Checking GWP Chemical doctype...")
if frappe.db.exists("DocType", "GWP Chemical"):
    print("✅ GWP Chemical doctype exists")
    
    # Check if it has data
    gwp_count = frappe.db.count("GWP Chemical")
    print(f"📊 GWP Chemical records: {gwp_count}")
    
    if gwp_count > 0:
        # Show first few records
        gwp_chemicals = frappe.get_all("GWP Chemical", fields=["chemical_name", "gwp_ar6"], limit=5)
        print("📋 Sample GWP Chemicals:")
        for chem in gwp_chemicals:
            print(f"  • {chem.chemical_name} (GWP AR6: {chem.gwp_ar6})")
    else:
        print("⚠️  No GWP Chemical records found!")
        
else:
    print("❌ GWP Chemical doctype does not exist!")

# Check Fugitive Scale Base doctype
print("\n2. Checking Fugitive Scale Base doctype...")
if frappe.db.exists("DocType", "Fugitive Scale Base"):
    print("✅ Fugitive Scale Base doctype exists")
    
    # Get the doctype and check gas_type field
    doc = frappe.get_doc("DocType", "Fugitive Scale Base")
    print(f"📋 Doctype custom: {doc.custom}")
    
    # Find gas_type field
    gas_type_field = None
    for field in doc.fields:
        if field.fieldname == "gas_type":
            gas_type_field = field
            break
    
    if gas_type_field:
        print(f"✅ gas_type field found:")
        print(f"  • Label: {gas_type_field.label}")
        print(f"  • Fieldtype: {gas_type_field.fieldtype}")
        print(f"  • Options: {gas_type_field.options}")
        print(f"  • Required: {gas_type_field.reqd}")
        print(f"  • Description: {gas_type_field.description}")
    else:
        print("❌ gas_type field not found!")
        
    # Check if there are any records
    scale_base_count = frappe.db.count("Fugitive Scale Base")
    print(f"📊 Fugitive Scale Base records: {scale_base_count}")
    
else:
    print("❌ Fugitive Scale Base doctype does not exist!")

print("\n" + "=" * 60)
print("CHECK COMPLETE!") 