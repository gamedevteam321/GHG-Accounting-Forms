# Copy and paste this entire script into your Frappe bench console
# This script will verify and create all Purchased Goods and Services DocTypes

print("🚀 Starting comprehensive DocType verification and creation...")

# Define all required DocTypes
required_doctypes = [
    {
        "name": "Purchased Goods Supplier Specific Method",
        "description": "Supplier-Specific Method for calculating emissions from purchased goods and services",
        "icon": "fa-handshake",
        "color": "#3b82f6",
        "title_field": "date",
        "search_fields": "date",
        "fields": [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1, "width": 100, "idx": 1},
            {"fieldname": "method_type", "label": "Method Type", "fieldtype": "Data", "default": "Supplier-Specific Method", "read_only": 1, "hidden": 1, "idx": 2},
            {"fieldname": "quantity", "label": "Quantity of Goods/Services Purchased (A)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "width": 120, "idx": 3},
            {"fieldname": "unit", "label": "Unit Selection", "fieldtype": "Select", "options": "Grams\nPieces\nMilileters\nLiters\nMeters\nKM\nMiles\nKG\nTonnes", "reqd": 1, "in_list_view": 1, "width": 100, "idx": 4},
            {"fieldname": "emission_factor", "label": "EF (Supplier-specific) (B)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "width": 150, "idx": 5},
            {"fieldname": "total_emissions", "label": "ETCO2eq", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "width": 120, "idx": 6},
            {"fieldname": "notes", "label": "Notes", "fieldtype": "Text Editor", "width": 300, "idx": 7}
        ]
    },
    {
        "name": "Purchased Goods Hybrid Method",
        "description": "Hybrid Method for calculating emissions from purchased goods and services",
        "icon": "fa-cogs",
        "color": "#8b5cf6",
        "title_field": "date",
        "search_fields": "date",
        "fields": [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1, "width": 100, "idx": 1},
            {"fieldname": "invoice", "label": "Invoice", "fieldtype": "Attach", "in_list_view": 1, "width": 120, "idx": 2},
            {"fieldname": "method_type", "label": "Method Type", "fieldtype": "Data", "default": "Hybrid Method", "read_only": 1, "hidden": 1, "idx": 3},
            {"fieldname": "supplier_scope_1", "label": "Supplier Scope 1", "fieldtype": "Float", "default": 0, "in_list_view": 1, "width": 120, "idx": 4},
            {"fieldname": "supplier_scope_2", "label": "Supplier Scope 2", "fieldtype": "Float", "default": 0, "in_list_view": 1, "width": 120, "idx": 5},
            {"fieldname": "unit", "label": "Unit Selection", "fieldtype": "Select", "options": "Tonnes\nGrams\nPieces\nMilileters\nLiters\nMeters\nKM\nMiles\nKG", "reqd": 1, "in_list_view": 1, "width": 100, "idx": 6},
            {"fieldname": "material_name", "label": "Material Name", "fieldtype": "Data", "in_list_view": 1, "width": 150, "idx": 7},
            {"fieldname": "material_quantity", "label": "Material Quantity", "fieldtype": "Float", "default": 0, "in_list_view": 1, "width": 120, "idx": 8},
            {"fieldname": "material_ef", "label": "Material EF", "fieldtype": "Float", "default": 0, "in_list_view": 1, "width": 120, "idx": 9},
            {"fieldname": "transport_name", "label": "Transport Name", "fieldtype": "Data", "in_list_view": 1, "width": 150, "idx": 10},
            {"fieldname": "transport_quantity", "label": "Transport Quantity", "fieldtype": "Float", "default": 0, "in_list_view": 1, "width": 120, "idx": 11},
            {"fieldname": "transport_ef", "label": "Transport EF", "fieldtype": "Float", "default": 0, "in_list_view": 1, "width": 120, "idx": 12},
            {"fieldname": "waste_name", "label": "Waste Name", "fieldtype": "Data", "in_list_view": 1, "width": 150, "idx": 13},
            {"fieldname": "waste_quantity", "label": "Waste Quantity", "fieldtype": "Float", "default": 0, "in_list_view": 1, "width": 120, "idx": 14},
            {"fieldname": "waste_ef", "label": "Waste EF", "fieldtype": "Float", "default": 0, "in_list_view": 1, "width": 120, "idx": 15},
            {"fieldname": "total_emissions", "label": "ETCO2eq", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "width": 120, "idx": 16},
            {"fieldname": "notes", "label": "Notes", "fieldtype": "Text Editor", "width": 300, "idx": 17}
        ]
    },
    {
        "name": "Purchased Goods Average Data Method",
        "description": "Average-Data Method for calculating emissions from purchased goods and services",
        "icon": "fa-chart-bar",
        "color": "#10b981",
        "title_field": "description",
        "search_fields": "description",
        "fields": [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1, "width": 100, "idx": 1},
            {"fieldname": "method_type", "label": "Method Type", "fieldtype": "Data", "default": "Average-Data Method", "read_only": 1, "hidden": 1, "idx": 2},
            {"fieldname": "description", "label": "Good/Service Description", "fieldtype": "Text", "reqd": 1, "in_list_view": 1, "width": 200, "idx": 3},
            {"fieldname": "quantity", "label": "Quantity of Goods/Services Purchased (A)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "width": 120, "idx": 4},
            {"fieldname": "unit", "label": "Unit Selection", "fieldtype": "Select", "options": "Tonnes\nGrams\nPieces\nMilileters\nLiters\nMeters\nKM\nMiles\nKG", "reqd": 1, "in_list_view": 1, "width": 100, "idx": 5},
            {"fieldname": "emission_factor", "label": "average EF per mass (B)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "width": 150, "idx": 6},
            {"fieldname": "total_emissions", "label": "ETCO2eq", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "width": 120, "idx": 7},
            {"fieldname": "notes", "label": "Notes", "fieldtype": "Text Editor", "width": 300, "idx": 8}
        ]
    },
    {
        "name": "Purchased Goods Spend Based Method",
        "description": "Spend-Based Method for calculating emissions from purchased goods and services",
        "icon": "fa-dollar-sign",
        "color": "#f59e0b",
        "title_field": "description",
        "search_fields": "description",
        "fields": [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1, "width": 100, "idx": 1},
            {"fieldname": "method_type", "label": "Method Type", "fieldtype": "Data", "default": "Spend-Based Method", "read_only": 1, "hidden": 1, "idx": 2},
            {"fieldname": "description", "label": "Good/Service Description", "fieldtype": "Text", "reqd": 1, "in_list_view": 1, "width": 200, "idx": 3},
            {"fieldname": "amount_spent", "label": "Value of purchased goods/Services (A)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "width": 120, "idx": 4},
            {"fieldname": "unit", "label": "Unit Selection", "fieldtype": "Select", "options": "Tonnes\nGrams\nPieces\nMilileters\nLiters\nMeters\nKM\nMiles\nKG", "reqd": 1, "in_list_view": 1, "width": 100, "idx": 5},
            {"fieldname": "emission_factor", "label": "EEIO EF (B)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "width": 150, "idx": 6},
            {"fieldname": "total_emissions", "label": "ETCO2eq", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "width": 120, "idx": 7},
            {"fieldname": "notes", "label": "Notes", "fieldtype": "Text Editor", "width": 300, "idx": 8}
        ]
    }
]

# Function to create a DocType
def create_doctype(doctype_config):
    doctype_name = doctype_config["name"]
    
    if frappe.db.exists("DocType", doctype_name):
        print(f"⚠️  DocType '{doctype_name}' already exists. Skipping...")
        return False
    
    print(f"🔧 Creating DocType: {doctype_name}")
    
    try:
        doc = frappe.new_doc("DocType")
        
        # Set basic properties
        doc.name = doctype_name
        doc.module = "Climoro Onboarding"
        doc.custom = 1
        doc.istable = 0
        doc.issingle = 0
        doc.istree = 0
        doc.quick_entry = 1
        doc.track_changes = 1
        doc.allow_rename = 1
        doc.allow_import = 1
        doc.allow_export = 1
        doc.allow_print = 1
        doc.allow_email = 1
        doc.allow_copy = 1
        doc.editable_grid = 1
        doc.engine = "InnoDB"
        doc.title_field = doctype_config["title_field"]
        doc.search_fields = doctype_config["search_fields"]
        doc.description = doctype_config["description"]
        doc.icon = doctype_config["icon"]
        doc.color = doctype_config["color"]
        
        # Add fields
        for field_data in doctype_config["fields"]:
            field = doc.append("fields", field_data)
        
        # Add permissions
        permissions_data = [
            {
                "role": "System Manager",
                "read": 1, "write": 1, "create": 1, "delete": 1,
                "submit": 0, "cancel": 0, "amend": 0,
                "report": 1, "export": 1, "share": 1, "print": 1, "email": 1
            },
            {
                "role": "All",
                "read": 1, "write": 1, "create": 1, "delete": 1,
                "submit": 0, "cancel": 0, "amend": 0,
                "report": 1, "export": 1, "share": 1, "print": 1, "email": 1
            }
        ]
        
        for perm_data in permissions_data:
            perm = doc.append("permissions", perm_data)
        
        # Save the doctype
        doc.save(ignore_permissions=True)
        print(f"✅ Successfully created: {doctype_name}")
        return True
        
    except Exception as e:
        print(f"❌ Error creating {doctype_name}: {str(e)}")
        return False

# Function to update visibility settings
def update_visibility(doctype_name):
    try:
        doc = frappe.get_doc("DocType", doctype_name)
        
        # Update visibility settings
        visibility_attrs = [
            'in_list', 'in_menu', 'in_desktop', 'in_sidebar', 'in_global_search',
            'in_quick_entry', 'in_grid_view', 'in_list_view', 'in_dashboard',
            'in_custom', 'in_preview', 'in_search', 'in_filter', 'in_help', 'in_navbar'
        ]
        
        updated = False
        for attr in visibility_attrs:
            if hasattr(doc, attr) and getattr(doc, attr) == 0:
                setattr(doc, attr, 1)
                updated = True
        
        if updated:
            doc.save(ignore_permissions=True)
            print(f"   ✅ Updated visibility settings for: {doctype_name}")
        
    except Exception as e:
        print(f"   ⚠️  Could not update visibility for {doctype_name}: {str(e)}")

# Main execution
print("\n🔍 Step 1: Checking existing DocTypes...")
existing_doctypes = []
missing_doctypes = []

for doctype_config in required_doctypes:
    doctype_name = doctype_config["name"]
    if frappe.db.exists("DocType", doctype_name):
        existing_doctypes.append(doctype_name)
        print(f"✅ Found: {doctype_name}")
    else:
        missing_doctypes.append(doctype_config)
        print(f"❌ Missing: {doctype_name}")

print(f"\n📋 Summary:")
print(f"   - Existing DocTypes: {len(existing_doctypes)}")
print(f"   - Missing DocTypes: {len(missing_doctypes)}")

# Create missing DocTypes
if missing_doctypes:
    print(f"\n🔧 Step 2: Creating missing DocTypes...")
    created_count = 0
    
    for doctype_config in missing_doctypes:
        if create_doctype(doctype_config):
            created_count += 1
    
    print(f"✅ Created {created_count} new DocTypes")
else:
    print(f"\n✅ All DocTypes already exist!")

# Update visibility for all DocTypes
print(f"\n🔧 Step 3: Updating visibility settings...")
for doctype_config in required_doctypes:
    update_visibility(doctype_config["name"])

# Clear cache
print(f"\n🧹 Step 4: Clearing cache...")
frappe.clear_cache()

# Final verification
print(f"\n🔍 Step 5: Final verification...")
all_exist = True
for doctype_config in required_doctypes:
    doctype_name = doctype_config["name"]
    if frappe.db.exists("DocType", doctype_name):
        print(f"   ✅ {doctype_name} - READY")
    else:
        print(f"   ❌ {doctype_name} - MISSING")
        all_exist = False

print(f"\n🎉 Process completed!")
if all_exist:
    print(f"✅ All DocTypes are ready for use!")
    print(f"📋 Available DocTypes:")
    for doctype_config in required_doctypes:
        print(f"   - {doctype_config['name']}")
    print(f"\n💡 Next steps:")
    print(f"   1. Restart Frappe bench: bench restart")
    print(f"   2. Refresh your browser")
    print(f"   3. Test the form with the JavaScript")
else:
    print(f"❌ Some DocTypes are still missing. Please check the errors above.")

print(f"\n🔗 DocType routes for browser access:")
for doctype_config in required_doctypes:
    route = doctype_config["name"].lower().replace(" ", "-")
    print(f"   - /app/{route}") 