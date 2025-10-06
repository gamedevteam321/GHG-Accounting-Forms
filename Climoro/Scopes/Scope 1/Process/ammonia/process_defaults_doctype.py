import frappe


def ensure_doctype(name, fields, module_hint="Climoro Onboarding"):
    module_name = module_hint if frappe.db.exists("Module Def", module_hint) else "Core"
    if frappe.db.exists("DocType", name):
        print(f"✓ DocType '{name}' already exists")
        try:
            frappe.db.updatedb(name)
        except Exception:
            pass
    else:
        doc = frappe.new_doc("DocType")
        doc.name = name
        doc.module = module_name
        doc.custom = 1
        doc.editable_grid = 1
        doc.track_changes = 1
        for f in fields:
            doc.append("fields", f)
        doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1})
        doc.append("permissions", {"role": "All", "read": 1, "write": 1, "create": 1})
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print(f"✓ Created DocType '{name}' in module '{module_name}'")
        try:
            frappe.db.updatedb(name)
        except Exception:
            pass


def seed_processes():
    rows = [
        ("Modern plants: Europe", "Conventional reforming", 30.2, "Natural gas"),
        ("Modern plants: Europe", "Excess air reforming", 29.7, "Natural gas"),
        ("Modern plants: Europe", "Autothermal reforming", 30.2, "Natural gas"),
        ("Modern plants: Europe", "Partial oxidation", 36.0, "Fuel oil"),
        ("Mixed population plants (old and modern plants)", "Conventional reforming", 37.5, "Natural gas"),
        ("Mixed population plants (old and modern plants)", "Excess air reforming", 37.5, "Natural gas"),
        ("Mixed population plants (old and modern plants)", "Autothermal reforming", 37.5, "Natural gas"),
        ("Mixed population plants (old and modern plants)", "Partial oxidation", 42.5, "Fuel oil"),
    ]
    def resolve_fuel(link_label):
        # Try by fuel_name first, then by record name
        rec = frappe.get_all("Ammonia Fuel Carbon Defaults", fields=["name"], filters={"fuel_name": link_label}, limit=1)
        if rec:
            return rec[0]["name"]
        rec = frappe.get_all("Ammonia Fuel Carbon Defaults", fields=["name"], filters={"name": link_label}, limit=1)
        if rec:
            return rec[0]["name"]
        return None

    for group, process, fuel_req, default_fuel in rows:
        name = f"{group} - {process}"
        link_name = resolve_fuel(default_fuel)

        existing = frappe.get_all("Ammonia Production Process Default", fields=["name"], filters={"process": process}, limit=1)
        if existing:
            doc = frappe.get_doc("Ammonia Production Process Default", existing[0]["name"])
            doc.group = group
            doc.fuel_requirement_gj_per_t = fuel_req
            doc.default_fuel = link_name or None
            doc.is_active = 1
            doc.save(ignore_permissions=True)
        else:
            doc = frappe.new_doc("Ammonia Production Process Default")
            doc.name = name
            doc.group = group
            doc.process = process
            doc.fuel_requirement_gj_per_t = fuel_req
            doc.default_fuel = link_name or None
            doc.is_active = 1
            doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print("✓ Seeded Ammonia Production Process Default")


print("\n🚀 Ensuring Ammonia Production Process Default...")
try:
    ensure_doctype(
        "Ammonia Production Process Default",
        [
            {"fieldname": "group", "label": "Group", "fieldtype": "Data", "in_list_view": 1},
            {"fieldname": "process", "label": "Process", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
            {"fieldname": "fuel_requirement_gj_per_t", "label": "Fuel Requirement (GJ/t NH3)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
            {"fieldname": "default_fuel", "label": "Default Fuel", "fieldtype": "Link", "options": "Ammonia Fuel Carbon Defaults", "in_list_view": 1},
            {"fieldname": "is_active", "label": "Active", "fieldtype": "Check", "default": 1, "in_list_view": 1},
        ],
    )
    seed_processes()
    print("✅ Ammonia Production Process Default ensured.")
except Exception as e:
    print("❌ Error ensuring Ammonia Production Process Default:", str(e))


