#step 1

import frappe

# --- STEP 1: DELETE AND RECREATE DOCTYPE ---

# Delete the existing DocType if it exists
doctype_name = "Emission Factor Master"
if frappe.db.exists("DocType", doctype_name):
    # It's safer to just delete the DocType definition
    # The table will be dropped automatically
    frappe.delete_doc("DocType", doctype_name, force=True)
    frappe.db.commit()
    print("✅ Old DocType and its data deleted")

# Define the DocType with the new, safe fieldnames
doc = frappe.new_doc("DocType")
doc.name = doctype_name
doc.module = "Custom"
doc.custom = 1
doc.autoname = "field:fuel_name"
doc.title_field = "fuel_name"

# Define fields to match the emission factor tables structure
fields = [
    # Basic fuel information
    {"fieldname": "fuel_type", "label": "Fuel Type", "fieldtype": "Select",
     "options": "Solid fossil\nLiquid fossil\nGaseous fossil\nBiomass\nOther",
     "reqd": 1, "in_list_view": 1},
    {"fieldname": "fuel_name", "label": "Fuel Name", "fieldtype": "Data",
     "reqd": 1, "unique": 1, "in_list_view": 1},
    
    # Lower Heating Value (LHV) or NCV
    {"fieldname": "lhv_ncv", "label": "Lower Heating Value (LHV) or NCV (TJ/Gg)", 
     "fieldtype": "Float", "precision": 1, "in_list_view": 1},
    
    # Section break for CO2 emission factors
    {"fieldname": "sb_co2", "label": "CO2 Emission Factors", "fieldtype": "Section Break"},
    
    # CO2 emission factors by measurement basis
    {"fieldname": "efco2_energy", "label": "CO2 Energy Basis (kg CO2/TJ)", 
     "fieldtype": "Float", "precision": 0},
    {"fieldname": "efco2_mass", "label": "CO2 Mass Basis (kg CO2/tonne)", 
     "fieldtype": "Float", "precision": 2},
    {"fieldname": "efco2_liquid", "label": "CO2 Liquid Basis (kg CO2/litre)", 
     "fieldtype": "Float", "precision": 6},
    {"fieldname": "efco2_gas", "label": "CO2 Gas Basis (kg CO2/m³)", 
     "fieldtype": "Float", "precision": 6},
    
    # Section break for CH4 emission factors
    {"fieldname": "sb_ch4", "label": "CH4 Emission Factors", "fieldtype": "Section Break"},
    
    # CH4 emission factors by measurement basis
    {"fieldname": "efch4_energy", "label": "CH4 Energy Basis (kg CH4/TJ)", 
     "fieldtype": "Float", "precision": 0},
    {"fieldname": "efch4_mass", "label": "CH4 Mass Basis (kg CH4/tonne)", 
     "fieldtype": "Float", "precision": 2},
    {"fieldname": "efch4_liquid", "label": "CH4 Liquid Basis (kg CH4/litre)", 
     "fieldtype": "Float", "precision": 6},
    {"fieldname": "efch4_gas", "label": "CH4 Gas Basis (kg CH4/m³)", 
     "fieldtype": "Float", "precision": 6},
    
    # Section break for N2O emission factors
    {"fieldname": "sb_n2o", "label": "N2O Emission Factors", "fieldtype": "Section Break"},
    
    # N2O emission factors by measurement basis
    {"fieldname": "efn2o_energy", "label": "N2O Energy Basis (kg N2O/TJ)", 
     "fieldtype": "Float", "precision": 1},
    {"fieldname": "efn2o_mass", "label": "N2O Mass Basis (kg N2O/tonne)", 
     "fieldtype": "Float", "precision": 2},
    {"fieldname": "efn2o_liquid", "label": "N2O Liquid Basis (kg N2O/litre)", 
     "fieldtype": "Float", "precision": 6},
    {"fieldname": "efn2o_gas", "label": "N2O Gas Basis (kg N2O/m³)", 
     "fieldtype": "Float", "precision": 6},
    
    # Section break for fuel density information
    {"fieldname": "sb_density", "label": "Fuel Density Information", "fieldtype": "Section Break"},
    
    # Fuel density fields
    {"fieldname": "density_liquid", "label": "Density of Liquids (kg/litre fuel)", 
     "fieldtype": "Float", "precision": 2},
    {"fieldname": "density_gas", "label": "Density of Gases (kg/m³ of fuel)", 
     "fieldtype": "Float", "precision": 2},
    
    # Metadata fields
    {"fieldname": "total_emission_factors", "label": "Total Emission Factors", 
     "fieldtype": "Int", "read_only": 1},
    {"fieldname": "last_updated", "label": "Last Updated", 
     "fieldtype": "Datetime", "read_only": 1},
]

for field in fields:
    doc.append("fields", field)

# Permissions
doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1})
doc.append("permissions", {"role": "All", "read": 1})

doc.insert(ignore_permissions=True)
frappe.db.commit()
print("✅ New DocType created successfully with safe names!")

#step 2

import frappe

fuel_data = {
        # Fuel Name: {type, lhv, efco2_e, efch4_e, efn2o_e, efco2_m, efch4_m, efn2o_m, efco2_l, efch4_l, efn2o_l, efco2_g, efch4_g, efn2o_g, density_liquid, density_gas}
        
        # --- Liquid Fossil Fuels ---
        "Crude oil": {"type": "Liquid fossil", "vals": [42.3, 73200, 10, 0.6, 3100.50, 0.43, 0.03, 2.708, 0.00037, 0.00002, 0, 0, 0, 0.87, 0]},
        "Orimulsion": {"type": "Liquid fossil", "vals": [27.5, 77000, 10, 0.6, 2117.5, 0.28, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Natural Gas Liquids": {"type": "Liquid fossil", "vals": [44.2, 64200, 10, 0.6, 2837.64, 0.44, 0.03, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Motor gasoline": {"type": "Liquid fossil", "vals": [43.3, 69300, 10, 0.6, 3069.99, 0.44, 0.03, 2.288, 0.00033, 0.00002, 0, 0, 0, 0.75, 0]},
        "Aviation gasoline": {"type": "Liquid fossil", "vals": [44.3, 70000, 10, 0.6, 3101.0, 0.44, 0.03, 2.185, 0.00031, 0.00002, 0, 0, 0, 0.78, 0]},
        "Jet gasoline": {"type": "Liquid fossil", "vals": [44.3, 70000, 10, 0.6, 3101.0, 0.44, 0.03, 2.185, 0.00031, 0.00002, 0, 0, 0, 0.78, 0]},
        "Jet kerosene": {"type": "Liquid fossil", "vals": [44.1, 71500, 10, 0.6, 3153.15, 0.44, 0.03, 2.572, 0.00036, 0.00002, 0, 0, 0, 0.8, 0]},
        "Other kerosene": {"type": "Liquid fossil", "vals": [43.8, 71900, 10, 0.6, 3149.22, 0.44, 0.03, 2.672, 0.00037, 0.00002, 0, 0, 0, 0.81, 0]},
        "Shale oil": {"type": "Liquid fossil", "vals": [38.1, 73300, 10, 0.6, 2792.73, 0.38, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Gas/Diesel oil": {"type": "Liquid fossil", "vals": [43.0, 74100, 10, 0.6, 3186.3, 0.43, 0.03, 2.91, 0.00039, 0.00002, 0, 0, 0, 0.84, 0]},
        "Residual fuel oil": {"type": "Liquid fossil", "vals": [40.4, 77400, 10, 0.6, 3126.96, 0.4, 0.02, 3.005, 0.00039, 0.00002, 0, 0, 0, 0.99, 0]},
        "Liquified Petroleum Gases": {"type": "Liquid fossil", "vals": [47.3, 63100, 5, 0.1, 2984.63, 0.24, 0.0, 1.473, 0.00012, 0.0, 0, 0, 0, 0.54, 0]},
        "Ethane": {"type": "Liquid fossil", "vals": [46.4, 61600, 5, 0.1, 2858.24, 0.23, 0.0, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Naphtha": {"type": "Liquid fossil", "vals": [44.5, 73300, 10, 0.6, 3261.85, 0.45, 0.03, 2.376, 0.00032, 0.00002, 0, 0, 0, 0.7, 0]},
        "Bitumen": {"type": "Liquid fossil", "vals": [40.2, 80700, 10, 0.6, 3244.14, 0.4, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Lubricants": {"type": "Liquid fossil", "vals": [40.2, 73300, 10, 0.6, 2946.66, 0.4, 0.02, 2.647, 0.00036, 0.00002, 0, 0, 0, 0.9, 0]},
        "Petroleum coke": {"type": "Liquid fossil", "vals": [32.5, 97500, 10, 0.6, 3168.75, 0.33, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Refinery feedstocks": {"type": "Liquid fossil", "vals": [43.0, 73300, 10, 0.6, 3151.9, 0.43, 0.03, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Paraffin waxes": {"type": "Liquid fossil", "vals": [40.2, 73300, 10, 0.6, 2946.66, 0.4, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]},
        "White Spirit/SBP": {"type": "Liquid fossil", "vals": [40.2, 73300, 10, 0.6, 2946.66, 0.4, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Other petroleum products": {"type": "Liquid fossil", "vals": [40.2, 73300, 10, 0.6, 2946.66, 0.4, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]},

        # --- Solid Fossil Fuels ---
        "Anthracite": {"type": "Solid fossil", "vals": [26.7, 98300, 10, 1.5, 2624.61, 0.27, 0.04, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Coking coal": {"type": "Solid fossil", "vals": [28.2, 94600, 10, 1.5, 2667.72, 0.28, 0.04, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Other bituminous coal": {"type": "Solid fossil", "vals": [25.8, 94600, 10, 1.5, 2440.68, 0.26, 0.04, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Sub bituminous coal": {"type": "Solid fossil", "vals": [18.9, 96100, 10, 1.5, 1816.29, 0.19, 0.03, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Lignite": {"type": "Solid fossil", "vals": [11.9, 101000, 10, 1.5, 1201.9, 0.12, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Oil shale and tar sands": {"type": "Solid fossil", "vals": [8.9, 107000, 10, 1.5, 952.3, 0.09, 0.01, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Brown coal briquettes": {"type": "Solid fossil", "vals": [20.7, 97500, 10, 1.5, 2018.25, 0.21, 0.03, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Patent fuel": {"type": "Solid fossil", "vals": [20.7, 97500, 10, 1.5, 2018.25, 0.21, 0.03, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Coke oven coke": {"type": "Solid fossil", "vals": [28.2, 107000, 10, 1.5, 3017.4, 0.28, 0.04, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Lignite coke": {"type": "Solid fossil", "vals": [28.2, 107000, 10, 1.5, 3017.4, 0.28, 0.04, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Gas coke": {"type": "Solid fossil", "vals": [28.2, 107000, 5, 0.1, 3017.4, 0.14, 0.003, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Coal tar": {"type": "Liquid fossil", "vals": [28.0, 80700, 5, 1.5, 2259.6, 0.14, 0.04, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Peat": {"type": "Other", "vals": [9.8, 106000, 10, 1.4, 1034.56, 0.1, 0.01, 0, 0, 0, 0, 0, 0, 0, 0]},

        # --- Gaseous Fossil Fuels ---
        "Refinery gas": {"type": "Gaseous fossil", "vals": [49.5, 57600, 5, 0.1, 2851.2, 0.25, 0.005, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Gas works gas": {"type": "Gaseous fossil", "vals": [38.7, 44400, 5, 0.1, 1718.28, 0.19, 0.004, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Coke oven gas": {"type": "Gaseous fossil", "vals": [38.7, 44400, 5, 0.1, 1718.28, 0.19, 0.004, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Blast furnace gas": {"type": "Gaseous fossil", "vals": [2.5, 260000, 5, 0.1, 642.2, 0.01, 0.0, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Oxygen steel furnace gas": {"type": "Gaseous fossil", "vals": [7.1, 182000, 5, 0.1, 1284.92, 0.04, 0.001, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Natural gas": {"type": "Gaseous fossil", "vals": [48.0, 56100, 5, 0.1, 2692.8, 0.24, 0.005, 0, 0, 0, 1.885, 0.000168, 0.00000336, 0, 0.8]},

        # --- Other Wastes ---
        "Municipal waste (Non biomass fraction)": {"type": "Other", "vals": [10.0, 91700, 300, 4, 917.0, 3.0, 0.04, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Industrial wastes": {"type": "Other", "vals": [0, 143000, 300, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Waste oils": {"type": "Other", "vals": [40.2, 73300, 300, 4, 2946.66, 12.06, 0.16, 0, 0, 0, 0, 0, 0, 0, 0]},

        # --- Biomass Fuels ---
        "Wood or Wood waste": {"type": "Biomass", "vals": [19.0, 0, 300, 4, 1747.2, 4.68, 0.06, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Sulphite lyes (Black liquor)": {"type": "Biomass", "vals": [26.5, 0, 3, 2, 1124.54, 0.04, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Other primary solid biomass fuels": {"type": "Biomass", "vals": [19.0, 0, 30, 4, 1160.0, 3.48, 0.05, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Charcoal": {"type": "Biomass", "vals": [31.1, 0, 200, 1, 3304.0, 5.9, 0.03, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Biogasoline": {"type": "Biomass", "vals": [44.1, 0, 10, 0.6, 1911.6, 0.27, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Biodiesels": {"type": "Biomass", "vals": [37.0, 0, 10, 0.6, 1911.6, 0.27, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Other liquid biofuels": {"type": "Biomass", "vals": [49.0, 0, 10, 0.6, 2181.04, 0.27, 0.02, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Landfill gas": {"type": "Biomass", "vals": [58.1, 0, 5, 0.1, 2751.84, 0.25, 0.01, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Sludge gas": {"type": "Biomass", "vals": [58.1, 0, 5, 0.1, 2751.84, 0.25, 0.01, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Other biogas": {"type": "Biomass", "vals": [58.1, 0, 5, 0.1, 2751.84, 0.25, 0.01, 0, 0, 0, 0, 0, 0, 0, 0]},
        "Municipal wastes (Biomass fraction)": {"type": "Biomass", "vals": [19.0, 0, 300, 4, 1160.0, 3.48, 0.05, 0, 0, 0, 0, 0, 0, 0, 0]},
    }

inserted = 0
updated = 0

for fuel_name, data in fuel_data.items():
    fuel_type = data["type"]
    vals = data["vals"]
    vals += [0] * (15 - len(vals))
    total_factors = sum(1 for v in vals if v > 0)

    # Map the values to the new field structure
    doc_data = {
        "doctype": "Emission Factor Master",
        "fuel_name": fuel_name, # autoname will use this for the 'name' field
        "fuel_type": fuel_type,
        "lhv_ncv": vals[0],  # Lower Heating Value
        "efco2_energy": vals[1],  # CO2 Energy basis
        "efch4_energy": vals[2],  # CH4 Energy basis
        "efn2o_energy": vals[3],  # N2O Energy basis
        "efco2_mass": vals[4],    # CO2 Mass basis
        "efch4_mass": vals[5],    # CH4 Mass basis
        "efn2o_mass": vals[6],    # N2O Mass basis
        "efco2_liquid": vals[7],  # CO2 Liquid basis
        "efch4_liquid": vals[8],  # CH4 Liquid basis
        "efn2o_liquid": vals[9],  # N2O Liquid basis
        "efco2_gas": vals[10],    # CO2 Gas basis
        "efch4_gas": vals[11],    # CH4 Gas basis
        "efn2o_gas": vals[12],    # N2O Gas basis
        "density_liquid": vals[13], # Density of liquids
        "density_gas": vals[14],    # Density of gases
        "total_emission_factors": total_factors,
        "last_updated": frappe.utils.now()
    }

    try:
        # Check if record already exists
        if frappe.db.exists("Emission Factor Master", fuel_name):
            # Update existing record
            doc = frappe.get_doc("Emission Factor Master", fuel_name)
            for key, value in doc_data.items():
                if key not in ["doctype", "fuel_name"]:  # Skip doctype and name fields
                    doc.set(key, value)
            doc.save(ignore_permissions=True)
            updated += 1
            print(f"🔄 Updated: {fuel_name}")
        else:
            # Insert new record
            doc = frappe.get_doc(doc_data)
            doc.insert(ignore_permissions=True)
            inserted += 1
            print(f"✅ Inserted: {fuel_name}")
    except Exception as e:
        print(f"❌ Error for {fuel_name}: {e}")

frappe.db.commit()
print(f"\n🎯 Done — Inserted: {inserted}, Updated: {updated}, Total: {inserted + updated}")
