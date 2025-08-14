import frappe

print("🚀 Creating Total Projected Emissions DocType...")

name = "Downstream Project Finance Total Projected Emissions Item"

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
    d.title_field = "project_id"
    d.search_fields = "date,project_id"
    d.field_order = ["s_no","date","project_id","share","annual","lifetime","co2e"]
    for f in [
        {"fieldname":"s_no","label":"S No","fieldtype":"Int","in_list_view":1},
        {"fieldname":"date","label":"Date","fieldtype":"Date","in_list_view":1},
        {"fieldname":"project_id","label":"Project ID","fieldtype":"Data","in_list_view":1},
        {"fieldname":"share","label":"Your Share of Cost (%)","fieldtype":"Float"},
        {"fieldname":"annual","label":"Projected Annual Emissions","fieldtype":"Float"},
        {"fieldname":"lifetime","label":"Projected Lifetime (Years)","fieldtype":"Float"},
        {"fieldname":"co2e","label":"Calculated Lifetime Emissions (CO2e)","fieldtype":"Float","in_list_view":1,"read_only":1},
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
print("🎉 Done. Total Projected Emissions DocType is ready.")


