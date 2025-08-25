import frappe

print("🚀 Creating Downstream Transportation DocTypes...")

required_doctypes = [
    {
        "name": "Downstream Transportation Fuel Based Item",
        "title_field": "description",
        "search_fields": "date,description",
        "field_order": ["s_no","date","description","fuel_litres","unit","ef","ef_unit","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"description","label":"Description","fieldtype":"Data","in_list_view":1},
            {"fieldname":"fuel_litres","label":"Fuel Consumed","fieldtype":"Float"},
            {"fieldname":"unit","label":"Unit","fieldtype":"Data","default":"litres"},
            {"fieldname":"ef","label":"Emission Factor","fieldtype":"Float"},
            {"fieldname":"ef_unit","label":"EF Unit","fieldtype":"Data","default":"kg CO2e/litre"},
            {"fieldname":"co2e","label":"Calculated Emissions (CO2e)","fieldtype":"Float","in_list_view":1,"read_only":1},
        ],
    },
    {
        "name": "Downstream Transportation Distance Based Item",
        "title_field": "description",
        "search_fields": "date,description",
        "field_order": ["s_no","date","description","mass","distance","mode","unit","ef","ef_unit","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"description","label":"Description","fieldtype":"Data","in_list_view":1},
            {"fieldname":"mass","label":"Mass","fieldtype":"Float"},
            {"fieldname":"distance","label":"Distance","fieldtype":"Float"},
            {"fieldname":"mode","label":"Mode","fieldtype":"Data"},
            {"fieldname":"unit","label":"Unit","fieldtype":"Data","default":"kg km"},
            {"fieldname":"ef","label":"Emission Factor","fieldtype":"Float"},
            {"fieldname":"ef_unit","label":"EF Unit","fieldtype":"Data","default":"kg CO2e/kg-km"},
            {"fieldname":"co2e","label":"Calculated Emissions (CO2e)","fieldtype":"Float","in_list_view":1,"read_only":1},
        ],
    },
    {
        "name": "Downstream Transportation Spend Based Item",
        "title_field": "description",
        "search_fields": "date,description",
        "field_order": ["s_no","date","description","amount","unit","ef","ef_unit","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"description","label":"Description","fieldtype":"Data","in_list_view":1},
            {"fieldname":"amount","label":"Amount Spent","fieldtype":"Float"},
            {"fieldname":"unit","label":"Unit","fieldtype":"Data","default":"$"},
            {"fieldname":"ef","label":"EEIO EF","fieldtype":"Float"},
            {"fieldname":"ef_unit","label":"EF Unit","fieldtype":"Data","default":"kg CO2e/$"},
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
print(f"🎉 Done. Created {created} Transportation DocTypes (others already existed).")