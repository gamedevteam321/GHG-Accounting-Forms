import frappe


def ensure_doctype(name: str, fields: list):
    if frappe.db.exists("DocType", name):
        print(f"✅ DocType '{name}' already exists")
        return
    doc = frappe.new_doc("DocType")
    doc.name = name
    doc.module = "Climoro Onboarding"
    doc.custom = 0
    for f in fields:
        doc.append("fields", f)
    doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1})
    doc.append("permissions", {"role": "All", "read": 1, "write": 1, "create": 1})
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"🎯 Created DocType '{name}'")


def create_all():
    # Shared leading fields
    common = [
        {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
    ]

    # A. Upstream emissions of purchased fuels
    ensure_doctype("Fuel Energy Upstream Fuels", common + [
        {"fieldname": "energy_type", "label": "Energy Type", "fieldtype": "Select", "in_list_view": 1,
         "options": "Solid fossil\nLiquid fossil\nGaseous fossil\nBiomass\nElectricity\nOther", "reqd": 1},
        {"fieldname": "sub_energy", "label": "Sub-Energy", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
        {"fieldname": "quantity", "label": "Quantity Consumed (from Scope 1/2)", "fieldtype": "Float", "reqd": 1},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Select", "options": "kg\nTonnes\nLitre\nm³\nkWh"},
        {"fieldname": "upstream_ef", "label": "Upstream Emission Factor", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data"},
        {"fieldname": "calculated_emissions", "label": "Calculated Emissions (CO2e)", "fieldtype": "Float", "read_only": 1},
    ])

    # B. Upstream emissions of purchased electricity
    ensure_doctype("Fuel Energy Upstream Electricity", common + [
        {"fieldname": "energy_type", "label": "Energy Type", "fieldtype": "Data", "default": "Electricity", "read_only": 1},
        {"fieldname": "sub_energy", "label": "Sub-Energy", "fieldtype": "Data", "default": "Grid electricity"},
        {"fieldname": "quantity", "label": "Quantity Consumed", "fieldtype": "Float", "reqd": 1},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "default": "kWh", "read_only": 1},
        {"fieldname": "upstream_ef", "label": "Upstream Emission Factor (kgCO2/kWh)", "fieldtype": "Float", "default": 0.82},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "default": "kgCO2/kWh"},
        {"fieldname": "calculated_emissions", "label": "Calculated Emissions (CO2e)", "fieldtype": "Float", "read_only": 1},
    ])

    # C. T&D losses
    ensure_doctype("Fuel Energy T&D Losses", common + [
        {"fieldname": "energy_type", "label": "Energy Type", "fieldtype": "Data", "default": "Electricity", "read_only": 1},
        {"fieldname": "sub_energy", "label": "Sub-Energy", "fieldtype": "Data", "default": "Grid electricity", "read_only": 1},
        {"fieldname": "quantity", "label": "Quantity Consumed (from Scope 2)", "fieldtype": "Float", "reqd": 1},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "default": "kWh", "read_only": 1},
        {"fieldname": "grid_life_cycle_ef", "label": "Grid Life Cycle EF (kgCO2/kWh)", "fieldtype": "Float", "default": 0.82},
        {"fieldname": "tnd_loss_rate", "label": "T&D Loss Rate (%)", "fieldtype": "Float"},
        {"fieldname": "calculated_emissions", "label": "Calculated Emissions (CO2e)", "fieldtype": "Float", "read_only": 1},
    ])

    # D. Generation of purchased electricity (utilities only)
    ensure_doctype("Fuel Energy Generation Purchased Electricity", common + [
        {"fieldname": "source_of_purchased_power", "label": "Source of Purchased Power", "fieldtype": "Data"},
        {"fieldname": "quantity", "label": "Electricity Purchased for Resale", "fieldtype": "Float", "reqd": 1},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "default": "kWh", "read_only": 1},
        {"fieldname": "life_cycle_ef", "label": "Life Cycle Emission Factor (kgCO2/kWh)", "fieldtype": "Float"},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "default": "kgCO2/kWh"},
        {"fieldname": "calculated_emissions", "label": "Calculated Emissions (CO2e)", "fieldtype": "Float", "read_only": 1},
    ])


if __name__ == "__main__":
    create_all()


