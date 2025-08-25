import frappe

print("🚀 Creating Franchises DocTypes...")

required_doctypes = [
    {
        "name": "Downstream Franchises Franchise Specific Item",
        "title_field": "franchise_id",
        "search_fields": "date,franchise_id",
        "field_order": ["s_no","date","franchise_id","scope1","scope2","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"franchise_id","label":"Franchise ID / Name","fieldtype":"Data","in_list_view":1},
            {"fieldname":"scope1","label":"Franchisee Scope 1 Emissions","fieldtype":"Float"},
            {"fieldname":"scope2","label":"Franchisee Scope 2 Emissions","fieldtype":"Float"},
            {"fieldname":"co2e","label":"Total Emissions (CO2e)","fieldtype":"Float","in_list_view":1,"read_only":1},
        ],
    },
    {
        "name": "Downstream Franchises Average Data Item",
        "title_field": "franchise_type",
        "search_fields": "date,franchise_type",
        "field_order": ["s_no","date","franchise_type","count","avg","unit","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"franchise_type","label":"Franchise Type","fieldtype":"Data","in_list_view":1},
            {"fieldname":"count","label":"# of Franchises","fieldtype":"Float"},
            {"fieldname":"avg","label":"Average Emissions per Franchise","fieldtype":"Float"},
            {"fieldname":"unit","label":"Unit","fieldtype":"Data","default":"kg CO2e/franchise/year"},
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
print(f"🎉 Done. Created {created} Franchises DocTypes (others already existed).")
