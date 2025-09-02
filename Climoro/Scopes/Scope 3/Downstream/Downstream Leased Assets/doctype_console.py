import frappe

print("🚀 Creating Downstream Leased Assets DocTypes...")

required_doctypes = [
    {
        "name": "Downstream Leased Assets Asset Specific Item",
        "title_field": "asset_id",
        "search_fields": "date,asset_id,source",
        "field_order": ["s_no","date","company","company_unit","asset_id","source","activity","unit","ef","ef_unit","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"company","label":"Company","fieldtype":"Data","in_list_view":1,"in_standard_filter":1},
            {"fieldname":"company_unit","label":"Company Unit","fieldtype":"Data","in_list_view":1,"in_standard_filter":1},
            {"fieldname":"asset_id","label":"Leased Asset ID","fieldtype":"Data","in_list_view":1},
            {"fieldname":"source","label":"Emission Source","fieldtype":"Data"},
            {"fieldname":"activity","label":"Activity Data","fieldtype":"Float"},
            {"fieldname":"unit","label":"Unit","fieldtype":"Data"},
            {"fieldname":"ef","label":"Emission Factor","fieldtype":"Float"},
            {"fieldname":"ef_unit","label":"EF Unit","fieldtype":"Data"},
            {"fieldname":"co2e","label":"Calculated Emissions (CO2e)","fieldtype":"Float","in_list_view":1,"read_only":1},
        ],
    },
    {
        "name": "Downstream Leased Assets Lessee Specific Item",
        "title_field": "asset_id",
        "search_fields": "date,asset_id",
        "field_order": ["s_no","date","company","company_unit","asset_id","lessee_emission","unit","share","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"company","label":"Company","fieldtype":"Data","in_list_view":1,"in_standard_filter":1},
            {"fieldname":"company_unit","label":"Company Unit","fieldtype":"Data","in_list_view":1,"in_standard_filter":1},
            {"fieldname":"asset_id","label":"Leased Asset ID","fieldtype":"Data","in_list_view":1},
            {"fieldname":"lessee_emission","label":"Lessee-Reported Emissions","fieldtype":"Float"},
            {"fieldname":"unit","label":"Unit","fieldtype":"Data","default":"kg CO2e"},
            {"fieldname":"share","label":"Your Ownership Share (%)","fieldtype":"Float"},
            {"fieldname":"co2e","label":"Calculated Emissions (CO2e)","fieldtype":"Float","in_list_view":1,"read_only":1},
        ],
    },
    {
        "name": "Downstream Leased Assets Average Data Item",
        "title_field": "asset_type",
        "search_fields": "date,asset_type,desc",
        "field_order": ["s_no","date","company","company_unit","asset_type","desc","activity","unit","avg_ef","ef_unit","co2e"],
        "fields": [
            {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
            {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
            {"fieldname":"company","label":"Company","fieldtype":"Data","in_list_view":1,"in_standard_filter":1},
            {"fieldname":"company_unit","label":"Company Unit","fieldtype":"Data","in_list_view":1,"in_standard_filter":1},
            {"fieldname":"asset_type","label":"Asset Type","fieldtype":"Data","in_list_view":1},
            {"fieldname":"desc","label":"Description","fieldtype":"Data"},
            {"fieldname":"activity","label":"Activity Data","fieldtype":"Float"},
            {"fieldname":"unit","label":"Unit","fieldtype":"Data"},
            {"fieldname":"avg_ef","label":"Average Emission Factor","fieldtype":"Float"},
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
print(f"🎉 Done. Created {created} Downstream Leased Assets DocTypes (others already existed).")
