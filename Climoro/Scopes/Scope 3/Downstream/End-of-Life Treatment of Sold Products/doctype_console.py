import frappe

print("🚀 Creating End-of-Life Treatment of Sold Products DocTypes...")

required_doctypes = [
    {
        "name": "Downstream EOL Supplier Specific Item",
        "title_field": "product",
        "search_fields": "date,product,handler",
        "field_order": ["s_no","date","product","handler","mass","unit","ef","ef_unit","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"product","label":"Product & Packaging","fieldtype":"Data","in_list_view":1},
            {"fieldname":"handler","label":"Waste Handler","fieldtype":"Data"},
            {"fieldname":"mass","label":"Total Mass Sold","fieldtype":"Float"},
            {"fieldname":"unit","label":"Unit","fieldtype":"Data","default":"tonne"},
            {"fieldname":"ef","label":"Handler-Specific EF","fieldtype":"Float"},
            {"fieldname":"ef_unit","label":"EF Unit","fieldtype":"Data","default":"kg CO2e/tonne"},
            {"fieldname":"co2e","label":"Calculated Emissions (CO2e)","fieldtype":"Float","in_list_view":1,"read_only":1},
        ],
    },
    {
        "name": "Downstream EOL Waste Type Specific Item",
        "title_field": "product",
        "search_fields": "date,product,material,method",
        "field_order": ["s_no","date","product","material","mass","method","pct","ef","ef_unit","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"product","label":"Product & Packaging","fieldtype":"Data","in_list_view":1},
            {"fieldname":"material","label":"Material Type","fieldtype":"Data"},
            {"fieldname":"mass","label":"Total Mass Sold","fieldtype":"Float"},
            {"fieldname":"method","label":"Treatment Method","fieldtype":"Data"},
            {"fieldname":"pct","label":"% Sent to Treatment","fieldtype":"Float"},
            {"fieldname":"ef","label":"Waste Treatment EF","fieldtype":"Float"},
            {"fieldname":"ef_unit","label":"EF Unit","fieldtype":"Data","default":"kg CO2e/tonne"},
            {"fieldname":"co2e","label":"Calculated Emissions (CO2e)","fieldtype":"Float","in_list_view":1,"read_only":1},
        ],
    },
    {
        "name": "Downstream EOL Average Data Item",
        "title_field": "product",
        "search_fields": "date,product,method",
        "field_order": ["s_no","date","product","mass","unit","method","pct","ef","ef_unit","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"product","label":"Product & Packaging","fieldtype":"Data","in_list_view":1},
            {"fieldname":"mass","label":"Total Mass Sold","fieldtype":"Float"},
            {"fieldname":"unit","label":"Unit","fieldtype":"Data","default":"tonne"},
            {"fieldname":"method","label":"Treatment Method","fieldtype":"Data"},
            {"fieldname":"pct","label":"% Sent to Treatment","fieldtype":"Float"},
            {"fieldname":"ef","label":"Average Waste Treatment EF","fieldtype":"Float"},
            {"fieldname":"ef_unit","label":"EF Unit","fieldtype":"Data","default":"kg CO2e/tonne"},
            {"fieldname":"co2e","label":"Calculated Emissions (CO2e)","fieldtype":"Float","in_list_view":1,"read_only":1},
        ],
    },
]

def create_doctype(cfg):
    name = cfg["name"]
    if frappe.db.exists("DocType", name):
        print(f"⚠️  DocType '{name}' already exists. Skipping...")
        return False
    doc = frappe.new_doc("DocType")
    doc.name = name
    doc.module = "Climoro Onboarding"
    doc.custom = 1
    doc.istable = 0
    doc.issingle = 0
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
    doc.title_field = cfg["title_field"]
    doc.search_fields = cfg["search_fields"]
    doc.field_order = cfg["field_order"]
    for f in cfg["fields"]:
        doc.append("fields", f)
    perms = [
        {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1},
        {"role": "All", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1},
    ]
    for p in perms:
        doc.append("permissions", p)
    doc.save(ignore_permissions=True)
    print(f"✅ Created: {name}")
    return True

created = 0
for cfg in required_doctypes:
    if create_doctype(cfg):
        created += 1

frappe.clear_cache()
frappe.db.commit()
print(f"🎉 Done. Created {created} EOL DocTypes (others already existed).")
