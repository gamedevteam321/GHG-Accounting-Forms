# Test script to try saving a record with gas_type field
# Copy and paste this entire code into your Frappe bench console

import frappe

print("🧪 TESTING GAS TYPE FIELD SAVE")
print("=" * 60)

try:
    # Try to create a test record
    test_doc = {
        "doctype": "Fugitive Scale Base",
        "s_no": 1,
        "date": "2024-01-01",
        "gas_type": "R134a",  # This should be a valid GWP Chemical name
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
    
    print("📝 Attempting to create test record...")
    print(f"  gas_type value: {test_doc['gas_type']}")
    
    # Check if R134a exists in GWP Chemical
    if frappe.db.exists("GWP Chemical", "R134a"):
        print("✅ R134a found in GWP Chemical doctype")
    else:
        print("❌ R134a not found in GWP Chemical doctype")
        # Get available chemicals
        chemicals = frappe.get_all("GWP Chemical", fields=["chemical_name"], limit=5)
        print("📋 Available chemicals:")
        for chem in chemicals:
            print(f"  • {chem.chemical_name}")
        # Use first available chemical
        if chemicals:
            test_doc["gas_type"] = chemicals[0].chemical_name
            print(f"🔄 Using first available chemical: {test_doc['gas_type']}")
    
    # Try to create the document
    doc = frappe.get_doc(test_doc)
    doc.insert(ignore_permissions=True)
    
    print("✅ Test record created successfully!")
    print(f"📄 Document name: {doc.name}")
    
    # Clean up - delete the test record
    frappe.delete_doc("Fugitive Scale Base", doc.name, force=True)
    print("🧹 Test record cleaned up")
    
except Exception as e:
    print(f"❌ Error creating test record: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("TEST COMPLETE!") 