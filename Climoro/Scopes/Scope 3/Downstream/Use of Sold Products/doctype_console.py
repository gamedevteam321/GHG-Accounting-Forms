import frappe

print("🚀 Creating Use of Sold Products DocType...")

name = "Downstream Use of Sold Products Item"

if not frappe.db.exists("DocType", name):
    d = frappe.new_doc("DocType")
    d.name = name
    d.module = "Climoro Onboarding"
    d.custom = 1
    d.istable = 0
    d.issingle = 0
    d.quick_entry = 1
    d.track_changes = 1
    d.allow_rename = 1
    d.allow_import = 1
    d.allow_export = 1
    d.allow_print = 1
    d.allow_email = 1
    d.allow_copy = 1
    d.editable_grid = 1
    d.engine = "InnoDB"
    d.title_field = "product_type"
    d.search_fields = "date,product_type"
    d.field_order = ["s_no","date","company","company_unit","product_type","sold","activity_data","unit","ef","ef_unit","co2e"]
    for f in [
        {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
        {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
        {"fieldname":"product_type","label":"Product Type","fieldtype":"Data","in_list_view":1},
        {"fieldname":"company","label":"Company","fieldtype":"Data","in_list_view":1,"in_standard_filter":1},
        {"fieldname":"company_unit","label":"Company Unit","fieldtype":"Data","in_list_view":1,"in_standard_filter":1},
        {"fieldname":"sold","label":"# Sold This Year","fieldtype":"Float"},
        {"fieldname":"activity_data","label":"Activity Data","fieldtype":"Data"},
        {"fieldname":"unit","label":"Unit","fieldtype":"Data"},
        {"fieldname":"ef","label":"Emission Factor","fieldtype":"Float"},
        {"fieldname":"ef_unit","label":"EF Unit","fieldtype":"Data"},
        {"fieldname":"co2e","label":"Calculated Emissions (CO2e)","fieldtype":"Float","in_list_view":1,"read_only":1},
    ]:
        d.append("fields", f)
    for p in (
        {"role":"System Manager","read":1,"write":1,"create":1,"delete":1,"report":1,"export":1,"share":1,"print":1,"email":1},
        {"role":"All","read":1,"write":1,"create":1,"delete":1,"report":1,"export":1,"share":1,"print":1,"email":1},
    ):
        d.append("permissions", p)
    d.save(ignore_permissions=True)
    print(f"✅ Created: {name}")
else:
    print(f"⚠️  DocType '{name}' already exists. Skipping...")

frappe.clear_cache()
frappe.db.commit()
print("🎉 Done. Use of Sold Products DocType is ready.")
