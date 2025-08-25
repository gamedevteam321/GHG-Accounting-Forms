import frappe

print("🚀 Creating Debt Investments DocTypes...")

required_doctypes = [
    {
        "name": "Downstream Debt Investments Project Specific Item",
        "title_field": "project_id",
        "search_fields": "date,project_id",
        "field_order": ["s_no","date","project_id","share","scope1","scope2","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"project_id","label":"Project ID","fieldtype":"Data","in_list_view":1},
            {"fieldname":"share","label":"Your Share of Project Cost (%)","fieldtype":"Float"},
            {"fieldname":"scope1","label":"Project Scope 1 Emissions","fieldtype":"Float"},
            {"fieldname":"scope2","label":"Project Scope 2 Emissions","fieldtype":"Float"},
            {"fieldname":"co2e","label":"Calculated Emissions (CO2e)","fieldtype":"Float","in_list_view":1,"read_only":1},
        ],
    },
    {
        "name": "Downstream Debt Investments Average Data Item",
        "title_field": "project_id",
        "search_fields": "date,project_id",
        "field_order": ["s_no","date","project_id","share","cost","currency","eeio_ef","ef_unit","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"project_id","label":"Project ID","fieldtype":"Data","in_list_view":1},
            {"fieldname":"share","label":"Your Share of Project Cost (%)","fieldtype":"Float"},
            {"fieldname":"cost","label":"Project Cost/Revenue","fieldtype":"Float"},
            {"fieldname":"currency","label":"Currency","fieldtype":"Data"},
            {"fieldname":"eeio_ef","label":"EEIO Sector EF","fieldtype":"Float"},
            {"fieldname":"ef_unit","label":"EF Unit","fieldtype":"Data"},
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
print(f"🎉 Done. Created {created} Debt Investments DocTypes (others already existed).")


