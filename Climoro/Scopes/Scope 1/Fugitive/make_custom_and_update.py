# Console script to make doctype custom and update gas_type field
# Copy and paste this entire code into your Frappe bench console

import frappe

print("🔄 MAKING DOCTYPE CUSTOM AND UPDATING GAS TYPE")
print("=" * 60)

doctype_name = "Fugitive Scale Base"

try:
    # Check if doctype exists
    if not frappe.db.exists("DocType", doctype_name):
        print(f"❌ Doctype '{doctype_name}' does not exist!")
    else:
        print(f"📝 Making '{doctype_name}' doctype custom...")
        
        # Get the existing doctype
        doc = frappe.get_doc("DocType", doctype_name)
        
        # Make it custom
        doc.custom = 1
        doc.save(ignore_permissions=True)
        
        print(f"✅ Successfully made '{doctype_name}' custom!")
        
        # Now update the gas_type field
        print(f"📝 Updating gas_type field in '{doctype_name}' doctype...")
        
        # Find and update the gas_type field
        field_updated = False
        for field in doc.fields:
            if field.fieldname == "gas_type":
                print(f"  Found gas_type field: {field.label}")
                print(f"  Current fieldtype: {field.fieldtype}")
                print(f"  Current options: {field.options}")
                
                # Update the field
                field.fieldtype = "Link"
                field.options = "GWP Chemical"
                field.description = "Link to GWP Chemical doctype for dynamic GWP values"
                
                print(f"  Updated to fieldtype: {field.fieldtype}")
                print(f"  Updated options: {field.options}")
                field_updated = True
                break
        
        if not field_updated:
            print(f"❌ gas_type field not found in '{doctype_name}' doctype!")
        else:
            # Save the updated doctype
            doc.save(ignore_permissions=True)
            
            # Update the database table structure by running migrate
            print("🔄 Updating database structure...")
            frappe.db.commit()
            
            print(f"✅ Successfully updated gas_type field in '{doctype_name}' doctype!")
            print("🔄 Please refresh your browser to see the changes.")
            
            print("\n" + "=" * 60)
            print("UPDATE SUMMARY:")
            print("✓ Fugitive Scale Base: Made custom and updated")
            
            print("\n📋 CHANGES MADE:")
            print("🔹 Made doctype custom (custom = 1)")
            print("🔹 Changed gas_type field from Select to Link")
            print("🔹 Field now links to GWP Chemical doctype")
            print("🔹 Dynamic GWP values instead of hardcoded constant")
            
            print("\n🚀 NEXT STEPS:")
            print("1. Refresh your browser")
            print("2. Test the gas type dropdown - it should now show GWP Chemical options")
            print("3. Verify that GWP values are dynamically fetched")
            print("4. Update any existing records if needed")
            
            print("\n✅ UPDATE COMPLETE!")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc() 