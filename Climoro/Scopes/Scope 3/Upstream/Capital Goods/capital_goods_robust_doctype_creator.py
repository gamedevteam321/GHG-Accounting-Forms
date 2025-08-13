# Copy and paste this entire script into your Frappe bench console
# This script will delete, recreate, and configure all Capital Goods DocTypes

print("🚀 Starting Capital Goods robust DocType creation and visibility setup...")

required_doctypes = [
    {
        "name": "Capital Goods Supplier Specific Method",
        "description": "Supplier-Specific Method for calculating emissions from capital goods",
        "icon": "fa-handshake",
        "color": "#3b82f6",
        "title_field": "date",
        "search_fields": "date",
        "fields": [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1, "width": 100, "idx": 1},
            {"fieldname": "method_type", "label": "Method Type", "fieldtype": "Data", "default": "Supplier-Specific Method", "read_only": 1, "hidden": 1, "idx": 2},
            {"fieldname": "quantity", "label": "Quantity of Capital Goods Purchased (A)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "width": 120, "idx": 3},
            {"fieldname": "unit", "label": "Unit Selection", "fieldtype": "Select", "options": "Grams\nPieces\nMilileters\nLiters\nMeters\nKM\nMiles\nKG\nTonnes", "reqd": 1, "in_list_view": 1, "width": 100, "idx": 4},
            {"fieldname": "emission_factor", "label": "EF (Supplier-specific) (B)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "width": 150, "idx": 5},
            {"fieldname": "total_emissions", "label": "ETCO2eq", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "width": 120, "idx": 6},
            {"fieldname": "notes", "label": "Notes", "fieldtype": "Text Editor", "width": 300, "idx": 7}
        ]
    },
    {
        "name": "Capital Goods Hybrid Method",
        "description": "Hybrid Method for calculating emissions from capital goods",
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
        "name": "Capital Goods Average Data Method",
        "description": "Average-Data Method for calculating emissions from capital goods",
        "icon": "fa-chart-bar",
        "color": "#10b981",
        "title_field": "description",
        "search_fields": "description",
        "fields": [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1, "width": 100, "idx": 1},
            {"fieldname": "method_type", "label": "Method Type", "fieldtype": "Data", "default": "Average-Data Method", "read_only": 1, "hidden": 1, "idx": 2},
            {"fieldname": "description", "label": "Capital Good Description", "fieldtype": "Text", "reqd": 1, "in_list_view": 1, "width": 200, "idx": 3},
            {"fieldname": "quantity", "label": "Quantity Purchased (A)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "width": 120, "idx": 4},
            {"fieldname": "unit", "label": "Unit Selection", "fieldtype": "Select", "options": "Tonnes\nGrams\nPieces\nMilileters\nLiters\nMeters\nKM\nMiles\nKG", "reqd": 1, "in_list_view": 1, "width": 100, "idx": 5},
            {"fieldname": "emission_factor", "label": "average EF per mass (B)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "width": 150, "idx": 6},
            {"fieldname": "total_emissions", "label": "ETCO2eq", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "width": 120, "idx": 7},
            {"fieldname": "notes", "label": "Notes", "fieldtype": "Text Editor", "width": 300, "idx": 8}
        ]
    },
    {
        "name": "Capital Goods Spend Based Method",
        "description": "Spend-Based Method for calculating emissions from capital goods",
        "icon": "fa-dollar-sign",
        "color": "#f59e0b",
        "title_field": "description",
        "search_fields": "description",
        "fields": [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1, "width": 100, "idx": 1},
            {"fieldname": "method_type", "label": "Method Type", "fieldtype": "Data", "default": "Spend-Based Method", "read_only": 1, "hidden": 1, "idx": 2},
            {"fieldname": "description", "label": "Capital Good Description", "fieldtype": "Text", "reqd": 1, "in_list_view": 1, "width": 200, "idx": 3},
            {"fieldname": "amount_spent", "label": "Value of Capital Good (A)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "width": 120, "idx": 4},
            {"fieldname": "unit", "label": "Unit Selection", "fieldtype": "Select", "options": "Tonnes\nGrams\nPieces\nMilileters\nLiters\nMeters\nKM\nMiles\nKG", "reqd": 1, "in_list_view": 1, "width": 100, "idx": 5},
            {"fieldname": "emission_factor", "label": "EEIO EF (B)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1, "width": 150, "idx": 6},
            {"fieldname": "total_emissions", "label": "ETCO2eq", "fieldtype": "Float", "read_only": 1, "in_list_view": 1, "width": 120, "idx": 7},
            {"fieldname": "notes", "label": "Notes", "fieldtype": "Text Editor", "width": 300, "idx": 8}
        ]
    }
]

print("🗑️  Step 1: Deleting existing DocTypes...")
for doctype_config in required_doctypes:
    doctype_name = doctype_config["name"]
    try:
        if frappe.db.exists("DocType", doctype_name):
            frappe.delete_doc("DocType", doctype_name, force=True)
            print(f"   ✅ Deleted: {doctype_name}")
        else:
            print(f"   ℹ️  Not found: {doctype_name}")
    except Exception as e:
        print(f"   ⚠️  Error deleting {doctype_name}: {str(e)}")

print("\n🔧 Step 2: Creating new DocTypes with proper visibility...")
for doctype_config in required_doctypes:
    doctype_name = doctype_config["name"]
    print(f"\n📝 Creating: {doctype_name}")
    try:
        doc = frappe.new_doc("DocType")
        doc.name = doctype_name
        doc.module = "Climoro Onboarding"
        doc.custom = 1
        doc.istable = 0
        doc.issingle = 0
        doc.quick_entry = 0
        doc.track_changes = 0
        doc.engine = "InnoDB"
        doc.title_field = doctype_config["title_field"]
        doc.search_fields = doctype_config["search_fields"]
        doc.description = doctype_config["description"]
        doc.icon = doctype_config["icon"]
        doc.color = doctype_config["color"]
        doc.in_list = 1; doc.in_menu = 1; doc.in_desktop = 1; doc.in_sidebar = 1
        doc.in_global_search = 1; doc.in_quick_entry = 1; doc.in_grid_view = 1; doc.in_list_view = 1
        doc.in_dashboard = 1; doc.in_custom = 1; doc.in_preview = 1; doc.in_search = 1
        doc.in_filter = 1; doc.in_help = 1; doc.in_navbar = 1
        for field_config in doctype_config["fields"]:
            field = doc.append("fields", {})
            for key, value in field_config.items():
                setattr(field, key, value)
        perm = doc.append("permissions", {})
        perm.role = "System Manager"; perm.read = 1; perm.write = 1; perm.create = 1; perm.delete = 1
        perm.submit = 0; perm.cancel = 0; perm.amend = 0; perm.report = 1; perm.export = 1; perm.share = 1; perm.print = 1; perm.email = 1
        doc.insert(ignore_permissions=True)
        print(f"   ✅ Created: {doctype_name}")
    except Exception as e:
        print(f"   ❌ Error creating {doctype_name}: {str(e)}")

print("\n🧹 Step 3: Clearing all caches...")
frappe.clear_cache()

print("\n🔧 Step 4: Force updating visibility in database...")
for doctype_config in required_doctypes:
    doctype_name = doctype_config["name"]
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
        print(f"   ✅ Updated visibility for: {doctype_name}")
    except Exception as e:
        print(f"   ⚠️  Error updating {doctype_name}: {str(e)}")

print("\n🔍 Step 5: Final verification...")
all_exist = True
for doctype_config in required_doctypes:
    doctype_name = doctype_config["name"]
    if frappe.db.exists("DocType", doctype_name):
        doc = frappe.get_doc("DocType", doctype_name)
        if doc.in_list == 1 and doc.in_menu == 1:
            print(f"   ✅ {doctype_name} - READY")
        else:
            print(f"   ⚠️  {doctype_name} - EXISTS BUT NOT VISIBLE")
            all_exist = False
    else:
        print(f"   ❌ {doctype_name} - MISSING")
        all_exist = False

print("\n🎉 Process completed!")
if all_exist:
    print("✅ All DocTypes are ready and visible!")
    print("📋 Available DocTypes:")
    for doctype_config in required_doctypes:
        print(f"   - {doctype_config['name']}")
    print("\n💡 Next steps:\n   1. bench restart\n   2. Clear browser cache and refresh\n   3. Check DocType list in Frappe desk")
else:
    print("❌ Some DocTypes are still missing or not visible.")

print("\n🔗 DocType routes for browser access:")
for doctype_config in required_doctypes:
    route = doctype_config["name"].lower().replace(" ", "-")
    print(f"   - /app/{route}")


