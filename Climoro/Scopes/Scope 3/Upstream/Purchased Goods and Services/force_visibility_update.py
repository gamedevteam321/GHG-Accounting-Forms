# Copy and paste this entire script into your Frappe bench console
# This script will force update visibility settings for all DocTypes

print("🔧 Force updating visibility settings for all DocTypes...")

doctype_names = [
    "Purchased Goods Supplier Specific Method",
    "Purchased Goods Hybrid Method", 
    "Purchased Goods Average Data Method",
    "Purchased Goods Spend Based Method"
]

for doctype_name in doctype_names:
    try:
        print(f"\n📝 Processing: {doctype_name}")
        
        # Check if DocType exists
        if not frappe.db.exists("DocType", doctype_name):
            print(f"   ❌ DocType '{doctype_name}' does not exist!")
            continue
            
        # Get the DocType
        doc = frappe.get_doc("DocType", doctype_name)
        print(f"   ✅ Found DocType: {doctype_name}")
        
        # Force update all visibility settings
        visibility_updated = False
        
        # Set all visibility flags to 1
        visibility_fields = [
            'in_list', 'in_menu', 'in_desktop', 'in_sidebar', 'in_global_search',
            'in_quick_entry', 'in_grid_view', 'in_list_view', 'in_dashboard',
            'in_custom', 'in_preview', 'in_search', 'in_filter', 'in_help', 'in_navbar'
        ]
        
        for field in visibility_fields:
            if hasattr(doc, field):
                if getattr(doc, field) != 1:
                    setattr(doc, field, 1)
                    visibility_updated = True
                    print(f"   🔧 Updated {field}: 0 → 1")
        
        # Also ensure module is set correctly
        if doc.module != "Climoro Onboarding":
            doc.module = "Climoro Onboarding"
            visibility_updated = True
            print(f"   🔧 Updated module: {doc.module} → Climoro Onboarding")
        
        # Save if any changes were made
        if visibility_updated:
            doc.save(ignore_permissions=True)
            print(f"   ✅ Saved visibility updates for: {doctype_name}")
        else:
            print(f"   ℹ️  No visibility updates needed for: {doctype_name}")
            
        # Also try direct database update as backup
        try:
            frappe.db.sql(f"""
                UPDATE `tabDocType` 
                SET in_list = 1, in_menu = 1, in_desktop = 1, in_sidebar = 1, 
                    in_global_search = 1, in_quick_entry = 1, in_grid_view = 1, 
                    in_list_view = 1, in_dashboard = 1, in_custom = 1, 
                    in_preview = 1, in_search = 1, in_filter = 1, in_help = 1, 
                    in_navbar = 1, module = 'Climoro Onboarding'
                WHERE name = '{doctype_name}'
            """)
            print(f"   🔧 Direct DB update applied for: {doctype_name}")
        except Exception as e:
            print(f"   ⚠️  Direct DB update failed: {str(e)}")
            
    except Exception as e:
        print(f"   ❌ Error processing {doctype_name}: {str(e)}")

# Clear all caches
print(f"\n🧹 Clearing all caches...")
frappe.clear_cache()

# Force refresh desk
print(f"\n🔄 Forcing desk refresh...")
try:
    # Clear desk cache
    frappe.db.sql("DELETE FROM `tabDesk Page` WHERE name LIKE '%purchased%'")
    print("   ✅ Cleared desk cache")
except Exception as e:
    print(f"   ⚠️  Could not clear desk cache: {str(e)}")

print(f"\n🎉 Visibility update process completed!")
print(f"📋 Next steps:")
print(f"   1. Restart Frappe bench: bench restart")
print(f"   2. Clear browser cache and refresh")
print(f"   3. Check DocType list in Frappe desk")
print(f"   4. If still not visible, try: bench clear-cache")

print(f"\n🔗 Direct DocType URLs to test:")
for doctype_name in doctype_names:
    route = doctype_name.lower().replace(" ", "-")
    print(f"   - /app/{route}") 