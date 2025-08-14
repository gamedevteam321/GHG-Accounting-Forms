import frappe

print("🚀 Creating Processing of Sold Products DocTypes...")

required_doctypes = [
    {
        "name": "Downstream Processing of Sold Products Site Specific Item",
        "title_field": "sold_product",
        "search_fields": "date,sold_product",
        "field_order": ["s_no","date","method","sold_product","mass","unit","processing_ef_note","ef_value","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"method","label":"Method","fieldtype":"Data","default":"Site-Specific"},
            {"fieldname":"sold_product","label":"Sold Product","fieldtype":"Data","in_list_view":1},
            {"fieldname":"mass","label":"Mass","fieldtype":"Float"},
            {"fieldname":"unit","label":"Unit","fieldtype":"Data","default":"tonne"},
            {"fieldname":"processing_ef_note","label":"Processing EF","fieldtype":"Data"},
            {"fieldname":"ef_value","label":"EF Value","fieldtype":"Float"},
            {"fieldname":"co2e","label":"Calculated Emissions (CO2e)","fieldtype":"Float","in_list_view":1,"read_only":1},
        ],
    },
    {
        "name": "Downstream Processing of Sold Products Average Data Item",
        "title_field": "sold_product",
        "search_fields": "date,sold_product",
        "field_order": ["s_no","date","method","sold_product","mass","unit","processing_ef_note","ef_value","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"method","label":"Method","fieldtype":"Data","default":"Average-Data"},
            {"fieldname":"sold_product","label":"Sold Product","fieldtype":"Data","in_list_view":1},
            {"fieldname":"mass","label":"Mass","fieldtype":"Float"},
            {"fieldname":"unit","label":"Unit","fieldtype":"Data","default":"tonne"},
            {"fieldname":"processing_ef_note","label":"Processing EF","fieldtype":"Data"},
            {"fieldname":"ef_value","label":"EF Value","fieldtype":"Float"},
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
print(f"🎉 Done. Created {created} POSP DocTypes (others already existed).")
