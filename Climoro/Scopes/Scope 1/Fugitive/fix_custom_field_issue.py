# Console script to fix the gas_type_custom field issue
# Copy and paste this entire code into your Frappe bench console

import frappe

print("🔧 FIXING GAS_TYPE_CUSTOM FIELD ISSUE")
print("=" * 60)

try:
    # Check for custom fields on Fugitive Scale Base
    print("📝 Checking for custom fields...")
    
    custom_fields = frappe.get_all("Custom Field", 
        filters={"dt": "Fugitive Scale Base"}, 
        fields=["name", "fieldname", "label", "fieldtype", "options"]
    )
    
    if custom_fields:
        print(f"📋 Found {len(custom_fields)} custom field(s):")
        for cf in custom_fields:
            print(f"  • {cf.fieldname} ({cf.label}) - {cf.fieldtype}")
            
        # Find the problematic gas_type_custom field
        gas_type_custom = None
        for cf in custom_fields:
            if cf.fieldname == "gas_type_custom":
                gas_type_custom = cf
                break
        
        if gas_type_custom:
            print(f"\n❌ Found problematic field: {gas_type_custom.fieldname}")
            print(f"  • Label: {gas_type_custom.label}")
            print(f"  • Fieldtype: {gas_type_custom.fieldtype}")
            print(f"  • Options: {gas_type_custom.options}")
            
            # Delete the custom field
            print(f"\n🗑️  Deleting custom field '{gas_type_custom.name}'...")
            frappe.delete_doc("Custom Field", gas_type_custom.name, force=True)
            frappe.db.commit()
            
            print("✅ Custom field deleted successfully!")
            
        else:
            print("✅ No gas_type_custom field found")
            
    else:
        print("✅ No custom fields found")
    
    # Now test saving a record again
    print("\n🧪 Testing record creation again...")
    
    # Get a valid chemical name
    chemicals = frappe.get_all("GWP Chemical", fields=["chemical_name"], limit=1)
    if chemicals:
        test_chemical = chemicals[0].chemical_name
        print(f"📋 Using chemical: {test_chemical}")
        
        # Try to create a test record
        test_doc = {
            "doctype": "Fugitive Scale Base",
            "s_no": 1,
            "date": "2024-01-01",
            "gas_type": test_chemical,
            "unit_selection": "kg",
            "inventory_start": 100,
            "inventory_close": 90,
            "decreased_inventory": 10,
            "purchase": 0,
            "returned_user": 0,
            "returned_recycling": 0,
            "total_returned": 0,
            "charged_equipment": 0,
            "delivered_user": 0,
            "returned_producer": 0,
            "sent_offsite": 0,
            "sent_destruction": 0,
            "total_distributed": 0,
            "refrigerant_emission": 10,
            "x5_conversion": 0.001,
            "etco2eq": 0.01,
            "approach_type": "Scale Base Approach"
        }
        
        # Try to create the document
        doc = frappe.get_doc(test_doc)
        doc.insert(ignore_permissions=True)
        
        print("✅ Test record created successfully!")
        print(f"📄 Document name: {doc.name}")
        
        # Clean up - delete the test record
        frappe.delete_doc("Fugitive Scale Base", doc.name, force=True)
        print("🧹 Test record cleaned up")
        
    else:
        print("❌ No GWP Chemical records found!")
    
    print("\n" + "=" * 60)
    print("FIX COMPLETE!")
    print("🔄 Please refresh your browser and try the form again")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc() 