import frappe
import json

def add_company_unit_fields_to_doctypes():
    """Add company and company_unit fields to all scope DocTypes"""
    
    # List of all scope DocTypes that need company and company_unit fields
    scope_doctypes = [
        # Scope 1 - Direct Emissions
        "Stationary Emissions",
        "Mobile Combustion Fuel Method",
        "Mobile Combustion Average Data Method", 
        "Fugitive Simple",
        "Fugitive Screening",
        "Fugitive Scale Base",
        "Process Emissions",
        
        # Scope 2 - Indirect Emissions
        "Electricity Purchased",
        
        # Scope 3 - Upstream Categories
        "Purchased Goods Supplier Specific Method",
        "Purchased Goods Hybrid Method",
        "Purchased Goods Average Data Method",
        "Purchased Goods Spend Based Method",
        "Capital Goods Supplier Specific Method",
        "Capital Goods Hybrid Method",
        "Capital Goods Average Data Method",
        "Capital Goods Spend Based Method",
        "Fuel Energy Supplier Specific Method",
        "Fuel Energy Hybrid Method",
        "Fuel Energy Average Data Method",
        "Fuel Energy Spend Based Method",
        "Upstream Transportation Supplier Specific Method",
        "Upstream Transportation Hybrid Method",
        "Upstream Transportation Average Data Method",
        "Upstream Transportation Spend Based Method",
        "Waste Generated Supplier Specific Method",
        "Waste Generated Hybrid Method",
        "Waste Generated Average Data Method",
        "Waste Generated Spend Based Method",
        "Business Travel Supplier Specific Method",
        "Business Travel Hybrid Method",
        "Business Travel Average Data Method",
        "Business Travel Spend Based Method",
        "Employee Commuting Supplier Specific Method",
        "Employee Commuting Hybrid Method",
        "Employee Commuting Average Data Method",
        "Employee Commuting Spend Based Method",
        "Upstream Leased Assets Supplier Specific Method",
        "Upstream Leased Assets Hybrid Method",
        "Upstream Leased Assets Average Data Method",
        "Upstream Leased Assets Spend Based Method",
        
        # Scope 3 - Downstream Categories
        "Downstream Transportation Supplier Specific Method",
        "Downstream Transportation Hybrid Method",
        "Downstream Transportation Average Data Method",
        "Downstream Transportation Spend Based Method",
        "Use of Sold Products Supplier Specific Method",
        "Use of Sold Products Hybrid Method",
        "Use of Sold Products Average Data Method",
        "Use of Sold Products Spend Based Method",
        "Processing of Sold Products Supplier Specific Method",
        "Processing of Sold Products Hybrid Method",
        "Processing of Sold Products Average Data Method",
        "Processing of Sold Products Spend Based Method",
        "End of Life Treatment Supplier Specific Method",
        "End of Life Treatment Hybrid Method",
        "End of Life Treatment Average Data Method",
        "End of Life Treatment Spend Based Method",
        "Downstream Leased Assets Supplier Specific Method",
        "Downstream Leased Assets Hybrid Method",
        "Downstream Leased Assets Average Data Method",
        "Downstream Leased Assets Spend Based Method",
        "Franchises Franchise Specific Item",
        "Franchises Average Data Item",
        "Investments Supplier Specific Method",
        "Investments Hybrid Method",
        "Investments Average Data Method",
        "Investments Spend Based Method"
    ]
    
    print(f"🚀 Starting to add company and company_unit fields to {len(scope_doctypes)} scope DocTypes...")
    
    success_count = 0
    error_count = 0
    
    for doctype_name in scope_doctypes:
        try:
            if not frappe.db.exists("DocType", doctype_name):
                print(f"⚠️  DocType '{doctype_name}' not found, skipping...")
                continue
                
            print(f"🔧 Processing: {doctype_name}")
            
            # Get the DocType
            doctype = frappe.get_doc("DocType", doctype_name)
            
            # Check if fields already exist
            existing_fields = [field.fieldname for field in doctype.fields]
            
            if "company" in existing_fields and "company_unit" in existing_fields:
                print(f"   ✅ Fields already exist in {doctype_name}, skipping...")
                continue
            
            # Add company field if it doesn't exist
            if "company" not in existing_fields:
                company_field = {
                    "fieldname": "company",
                    "label": "Company",
                    "fieldtype": "Data",
                    "reqd": 1,
                    "in_standard_filter": 1,
                    "in_list_view": 1,
                    "description": "Company name for scope reporting"
                }
                doctype.append("fields", company_field)
                print(f"   ➕ Added company field")
            
            # Add company_unit field if it doesn't exist
            if "company_unit" not in existing_fields:
                unit_field = {
                    "fieldname": "company_unit",
                    "label": "Company Unit",
                    "fieldtype": "Data",
                    "reqd": 1,
                    "in_standard_filter": 1,
                    "in_list_view": 1,
                    "description": "Unit identifier for scope reporting"
                }
                doctype.append("fields", unit_field)
                print(f"   ➕ Added unit field")
            
            # Update field order to place company and company_unit after date field
            if hasattr(doctype, 'field_order') and doctype.field_order:
                field_order = doctype.field_order
                
                # Find the position after 'date' field
                try:
                    date_index = field_order.index("date")
                    # Insert company and company_unit after date
                    field_order.insert(date_index + 1, "company")
                    field_order.insert(date_index + 2, "company_unit")
                    print(f"   📍 Updated field order")
                except ValueError:
                    # If date field not found, add at beginning
                    field_order.insert(0, "company")
                    field_order.insert(1, "company_unit")
                    print(f"   📍 Added fields to beginning of field order")
            else:
                # If no field_order, create one
                doctype.field_order = ["company", "company_unit"]
                print(f"   📍 Created new field order")
            
            # Save the DocType
            doctype.save(ignore_permissions=True)
            print(f"   💾 Saved {doctype_name}")
            
            success_count += 1
            
        except Exception as e:
            print(f"   ❌ Error processing {doctype_name}: {str(e)}")
            error_count += 1
    
    print(f"\n🎉 **Implementation Complete!**")
    print(f"✅ Successfully updated: {success_count} DocTypes")
    if error_count > 0:
        print(f"❌ Errors encountered: {error_count} DocTypes")
    
    print(f"\n�� **Next Steps:**")
    print(f"1. Restart your Frappe bench: bench restart")
    print(f"2. Clear cache: bench --site localhost clear-cache")
    print(f"3. Test the new fields in scope forms")

# Execute the function
if __name__ == "__main__":
    add_company_unit_fields_to_doctypes()
