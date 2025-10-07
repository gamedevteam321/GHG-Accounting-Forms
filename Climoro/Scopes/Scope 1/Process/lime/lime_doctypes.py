import frappe


def ensure_doctype(name, fields, module_hint="Climoro Onboarding"):
    module_name = module_hint if frappe.db.exists("Module Def", module_hint) else "Core"
    if not frappe.db.exists("DocType", name):
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
    try:
        frappe.db.updatedb(name)
    except Exception:
        pass


print("\n🚀 Ensuring Lime DocTypes...")
try:
    # Lime Defaults
    ensure_doctype(
        "Lime Defaults",
        [
            {"fieldname": "default_type", "label": "Default Type", "fieldtype": "Select", "options": "lime_type\ncarbonate\nglobal", "in_list_view": 1},
            {"fieldname": "lime_type", "label": "Lime Type", "fieldtype": "Data"},
            {"fieldname": "stoichiometric_ratio", "label": "Stoichiometric Ratio", "fieldtype": "Float"},
            {"fieldname": "cao_ratio_developed", "label": "CaO/(CaO+MgO) Developed", "fieldtype": "Float"},
            {"fieldname": "cao_ratio_developing", "label": "CaO/(CaO+MgO) Developing", "fieldtype": "Float"},
            {"fieldname": "cao_ratio_single", "label": "CaO/(CaO+MgO)", "fieldtype": "Float"},
            {"fieldname": "hydrated_proportion_default", "label": "Hydrated Proportion Default", "fieldtype": "Float"},
            {"fieldname": "hydrated_water_content_default", "label": "Hydrated Water Content Default", "fieldtype": "Float"},
            {"fieldname": "lkd_correction_default", "label": "LKD Correction Default", "fieldtype": "Float"},
            {"fieldname": "lkd_weight_fraction_default", "label": "LKD Weight Fraction Default", "fieldtype": "Float"},
            {"fieldname": "carbonate", "label": "Carbonate", "fieldtype": "Data"},
            {"fieldname": "emission_factor_tco2_per_t", "label": "EF (t CO2/t)", "fieldtype": "Float"},
        ],
    )

    # Approach 1
    ensure_doctype(
        "Lime Emissions Approach 1",
        [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "in_list_view": 1},
            {"fieldname": "lime_type", "label": "Lime Type", "fieldtype": "Data", "in_list_view": 1},
            {"fieldname": "country_type", "label": "Country Type", "fieldtype": "Select", "options": "developed\ndeveloping", "in_list_view": 1},
            {"fieldname": "production_t", "label": "Production (t)", "fieldtype": "Float", "reqd": 1},
            {"fieldname": "cao_ratio", "label": "CaO/(CaO+MgO)", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "stoichiometric_ratio", "label": "Stoichiometric Ratio", "fieldtype": "Float"},
            {"fieldname": "hydrated_proportion", "label": "Hydrated Proportion", "fieldtype": "Float"},
            {"fieldname": "hydrated_water_content", "label": "Hydrated Water Content", "fieldtype": "Float"},
            {"fieldname": "lkd_factor", "label": "LKD Factor", "fieldtype": "Float"},
            {"fieldname": "co2_emissions_t", "label": "CO2 Emissions (t)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        ],
    )

    # Approach 2
    ensure_doctype(
        "Lime Emissions Approach 2",
        [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "in_list_view": 1},
            {"fieldname": "carbonate", "label": "Carbonate", "fieldtype": "Data", "in_list_view": 1},
            {"fieldname": "emission_factor_tco2_per_t", "label": "EF (t CO2/t)", "fieldtype": "Float"},
            {"fieldname": "amount_t", "label": "Amount (t)", "fieldtype": "Float"},
            {"fieldname": "fraction_calcination_carbonate", "label": "Frac calcination (carbonate)", "fieldtype": "Float"},
            {"fieldname": "lkd_amount_t", "label": "LKD amount (t)", "fieldtype": "Float"},
            {"fieldname": "lkd_weight_fraction", "label": "LKD weight fraction", "fieldtype": "Float"},
            {"fieldname": "fraction_calcination_lkd", "label": "Frac calcination (LKD)", "fieldtype": "Float"},
            {"fieldname": "co2_emissions_t", "label": "CO2 Emissions (t)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        ],
    )

    # LKD helper (optional)
    ensure_doctype(
        "Lime LKD Factor",
        [
            {"fieldname": "weight_lkd_not_recycled_t", "label": "Weight LKD not recycled (t)", "fieldtype": "Float"},
            {"fieldname": "weight_lime_produced_t", "label": "Weight of lime produced (t)", "fieldtype": "Float"},
            {"fieldname": "frac_original_carbonate_lkd", "label": "Frac original carbonate in LKD", "fieldtype": "Float"},
            {"fieldname": "frac_calcination_lkd", "label": "Frac calcination in LKD", "fieldtype": "Float"},
            {"fieldname": "custom_lkd_factor", "label": "Custom LKD factor", "fieldtype": "Float", "read_only": 1},
        ],
    )

    # --- Seed Defaults ---
    def upsert_defaults(filters: dict, values: dict):
        existing = frappe.get_all("Lime Defaults", fields=["name"], filters=filters, limit=1)
        if existing:
            doc = frappe.get_doc("Lime Defaults", existing[0]["name"])
            for k, v in values.items():
                setattr(doc, k, v)
            doc.save(ignore_permissions=True)
        else:
            doc = frappe.new_doc("Lime Defaults")
            for k, v in {**filters, **values}.items():
                setattr(doc, k, v)
            doc.insert(ignore_permissions=True)

    # Global defaults
    upsert_defaults(
        {"default_type": "global"},
        {
            "hydrated_proportion_default": 0.10,
            "hydrated_water_content_default": 0.28,
            "lkd_correction_default": 1.02,
            "lkd_weight_fraction_default": 0.90,
        },
    )

    # Lime type defaults
    upsert_defaults(
        {"default_type": "lime_type", "lime_type": "High-calcium"},
        {"stoichiometric_ratio": 0.785, "cao_ratio_single": 0.95},
    )
    upsert_defaults(
        {"default_type": "lime_type", "lime_type": "Dolomitic"},
        {"stoichiometric_ratio": 0.913, "cao_ratio_developed": 0.95, "cao_ratio_developing": 0.85},
    )
    upsert_defaults(
        {"default_type": "lime_type", "lime_type": "Hydraulic"},
        {"stoichiometric_ratio": 0.785, "cao_ratio_single": 0.75},
    )

    # Carbonate EF defaults
    carbonate_efs = [
        ("CaCO3", 0.44),
        ("MgCO3", 0.52),
        ("CaMg(CO3)2", 0.48),
        ("FeCO3", 0.38),
        ("Ca(Fe,Mg,Mn)(CO3)2", 0.44),
        ("Na2CO3", 0.38),
        ("MnCO3", 0.41),
    ]
    for carb, ef in carbonate_efs:
        upsert_defaults(
            {"default_type": "carbonate", "carbonate": carb},
            {"emission_factor_tco2_per_t": ef},
        )

    frappe.db.commit()
    print("✅ Lime DocTypes ensured and defaults seeded.")
except Exception as e:
    print("❌ Error ensuring Lime DocTypes:", str(e))


