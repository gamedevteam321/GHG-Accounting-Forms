import frappe


def ensure_doctype(name, fields, module_hint="Climoro Onboarding"):
    if frappe.db.exists("DocType", name):
        print(f"✓ DocType '{name}' already exists")
        return
    doc = frappe.new_doc("DocType")
    doc.name = name
    module_name = module_hint if frappe.db.exists("Module Def", module_hint) else (frappe.get_installed_apps()[0] if frappe.get_installed_apps() else "Core")
    doc.module = module_name
    doc.custom = 1
    doc.editable_grid = 1
    doc.engine = "InnoDB"
    doc.track_changes = 1
    for f in fields:
        doc.append("fields", f)
    doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1})
    doc.append("permissions", {"role": "All", "read": 1, "write": 1, "create": 1})
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"✓ Created DocType '{name}' in module '{module_name}'")


print("\n🚀 Creating Aluminium Production DocTypes...")
try:
    # Common fields for both processes
    common_fields = [
        {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "description", "label": "Description", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "company_unit", "label": "Company Unit", "fieldtype": "Link", "options": "Units", "in_list_view": 1, "in_standard_filter": 1},
    ]

    # Part A: Prebake Anode Electrolysis Cells
    part_a_fields = common_fields + [
        {"fieldname": "potline_period", "label": "Potline/Period", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "metal_production", "label": "Weight of aluminium produced", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "metal_production_unit", "label": "Unit", "fieldtype": "Data", "default": "tonnes Al", "read_only": 1},
        {"fieldname": "net_anode_consumption", "label": "Net anode consumption", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "net_anode_consumption_unit", "label": "Unit", "fieldtype": "Data", "default": "t anode/t Al", "read_only": 1},
        {"fieldname": "sulphur_content", "label": "Sulphur content", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "sulphur_content_unit", "label": "Unit", "fieldtype": "Data", "default": "wt%", "read_only": 1},
        {"fieldname": "ash_content", "label": "Ash content", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "ash_content_unit", "label": "Unit", "fieldtype": "Data", "default": "wt%", "read_only": 1},
        {"fieldname": "co2_emissions", "label": "CO2 Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "co2_emissions_unit", "label": "Unit", "fieldtype": "Data", "default": "t CO2", "read_only": 1},
    ]

    # Part B: Green Anode Baking Furnace
    part_b_fields = common_fields + [
        {"fieldname": "furnace_period", "label": "Furnace/Period", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "green_anode_weight", "label": "Green anode weight (A1)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "green_anode_weight_unit", "label": "Unit", "fieldtype": "Data", "default": "t", "read_only": 1},
        {"fieldname": "baked_anode_weight", "label": "Baked anode weight (A2)", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "baked_anode_weight_unit", "label": "Unit", "fieldtype": "Data", "default": "t", "read_only": 1},
        {"fieldname": "weightloss_factor", "label": "Anode baking weightloss factor", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "weightloss_factor_unit", "label": "Unit", "fieldtype": "Data", "default": "dimensionless", "read_only": 1},
        {"fieldname": "baked_anode_production", "label": "Baked anode production", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "baked_anode_production_unit", "label": "Unit", "fieldtype": "Data", "default": "t", "read_only": 1},
        {"fieldname": "loaded_green_anodes", "label": "Weight of loaded green anodes", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "loaded_green_anodes_unit", "label": "Unit", "fieldtype": "Data", "default": "t", "read_only": 1},
        {"fieldname": "hydrogen_content", "label": "Hydrogen content in green anodes", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "hydrogen_content_unit", "label": "Unit", "fieldtype": "Data", "default": "weight percent", "read_only": 1},
        {"fieldname": "waste_tar_collected", "label": "Waste Tar Collected", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "waste_tar_collected_unit", "label": "Unit", "fieldtype": "Data", "default": "t", "read_only": 1},
        {"fieldname": "packing_coke_consumption", "label": "Packing coke consumption", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "packing_coke_consumption_unit", "label": "Unit", "fieldtype": "Data", "default": "t coke/t BA", "read_only": 1},
        {"fieldname": "sulphur_content_packing", "label": "Sulphur content of packing coke", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "sulphur_content_packing_unit", "label": "Unit", "fieldtype": "Data", "default": "weight percent", "read_only": 1},
        {"fieldname": "ash_content_packing", "label": "Ash content of packing coke", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
        {"fieldname": "ash_content_packing_unit", "label": "Unit", "fieldtype": "Data", "default": "weight percent", "read_only": 1},
        {"fieldname": "volatile_matter_emissions", "label": "Volatile Matter CO2 Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "packing_coke_emissions", "label": "Packing Coke CO2 Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "total_co2_emissions", "label": "Total CO2 Emissions", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
        {"fieldname": "total_co2_emissions_unit", "label": "Unit", "fieldtype": "Data", "default": "t CO2", "read_only": 1},
    ]

    # Create DocTypes
    ensure_doctype("Aluminium Part A Prebake Anode", part_a_fields)
    ensure_doctype("Aluminium Part B Green Anode Baking", part_b_fields)

    print("✅ Aluminium Production DocTypes ensured.")
except Exception as e:
    print("❌ Error while creating Aluminium Production DocTypes:", str(e))
