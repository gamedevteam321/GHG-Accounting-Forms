import frappe


def ensure_doctype(name, fields, module_hint="Climoro Onboarding"):
    module_name = module_hint if frappe.db.exists("Module Def", module_hint) else "Core"
    if frappe.db.exists("DocType", name):
        print(f"✓ DocType '{name}' already exists")
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


def seed_fuels():
    rows = [
        ("Crude oil", 20.0, 1.0, "fossil"),
        ("Natural gas liquids", 17.5, 1.0, "fossil"),
        ("Motor gasoline", 18.9, 1.0, "fossil"),
        ("Aviation gasoline", 19.1, 1.0, "fossil"),
        ("Jet Kerosene", 19.1, 1.0, "fossil"),
        ("Other Kerosene", 19.5, 1.0, "fossil"),
        ("Gas/diesel oil", 20.2, 1.0, "fossil"),
        ("Residual fuel oil", 21.1, 1.0, "fossil"),
        ("Fuel oil", 21.1, 1.0, "fossil"),
        ("Liquefied Petroleum Gases (LPG)", 17.6, 1.0, "fossil"),
        ("Ethane", 18.0, 1.0, "fossil"),
        ("Naphtha", 20.8, 1.0, "fossil"),
        ("Lubricants", 26.0, 1.0, "fossil"),
        ("Petroleum coke", 26.6, 1.0, "fossil"),
        ("Refinery coke", 26.6, 1.0, "fossil"),
        ("Refinery gas", 20.0, 1.0, "fossil"),
        ("Paraffin waxes", 25.7, 1.0, "fossil"),
        ("Other petroleum products", 20.0, 1.0, "fossil"),
        ("Anthracite", 26.8, 1.0, "coal"),
        ("Coking coal", 27.8, 1.0, "coal"),
        ("Other bituminous coal", 26.9, 1.0, "coal"),
        ("Sub-bituminous coal", 26.8, 1.0, "coal"),
        ("Lignite", 25.2, 1.0, "coal"),
        ("Coke oven coke and Lignite coke", 29.2, 1.0, "coal"),
        ("Coke oven gas", 12.1, 1.0, "coal"),
        ("Blast furnace gas", 7.0, 1.0, "coal"),
        ("Natural gas", 15.3, 0.995, "natural_gas"),
        ("Waste oils", 24.0, 0.99, "other_fossil"),
        ("Peat", 28.9, 0.95, "peat"),
        ("Wood (solid wood)", 29.0, 0.95, "biomass"),
        ("Charcoal", 29.5, 0.99, "biomass"),
        ("Biodiesel", 19.3, 1.0, "biomass"),
        ("Other liquid biofuels", 23.0, 0.99, "biomass"),
    ]
    for fuel_name, carbon, oxidation, category in rows:
        # Find by fuel_name irrespective of the current name
        existing = frappe.get_all(
            "Ammonia Fuel Carbon Defaults", fields=["name"], filters={"fuel_name": fuel_name}, limit=1
        )
        if existing:
            rec_name = existing[0]["name"]
            doc = frappe.get_doc("Ammonia Fuel Carbon Defaults", rec_name)
            doc.carbon_content_kg_per_gj = carbon
            doc.oxidation_factor = oxidation
            doc.category = category
            doc.is_active = 1
            doc.save(ignore_permissions=True)
        else:
            doc = frappe.new_doc("Ammonia Fuel Carbon Defaults")
            doc.fuel_name = fuel_name
            doc.carbon_content_kg_per_gj = carbon
            doc.oxidation_factor = oxidation
            doc.category = category
            doc.is_active = 1
            doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print("✓ Seeded Ammonia Fuel Carbon Defaults")


print("\n🚀 Ensuring Ammonia Fuel Carbon Defaults...")
try:
    ensure_doctype(
        "Ammonia Fuel Carbon Defaults",
        [
            {"fieldname": "fuel_name", "label": "Fuel Name", "fieldtype": "Data", "reqd": 1, "unique": 1, "in_list_view": 1},
            {"fieldname": "carbon_content_kg_per_gj", "label": "Carbon Content (kg C/GJ)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
            {"fieldname": "oxidation_factor", "label": "Oxidation Factor", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
            {"fieldname": "category", "label": "Category", "fieldtype": "Select", "options": "fossil\ncoal\nnatural_gas\nbiomass\nother_fossil\npeat", "in_list_view": 1},
            {"fieldname": "is_active", "label": "Active", "fieldtype": "Check", "default": 1, "in_list_view": 1},
        ],
    )
    seed_fuels()
    print("✅ Ammonia Fuel Carbon Defaults ensured.")
except Exception as e:
    print("❌ Error ensuring Ammonia Fuel Carbon Defaults:", str(e))


