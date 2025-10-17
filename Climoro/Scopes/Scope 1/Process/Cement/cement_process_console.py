#!/usr/bin/env python3
"""
Cement Process DocType
Comprehensive cement production data management
"""

import frappe

# Delete existing DocType if it exists
doctype_name = "Cement Process"
if frappe.db.exists("DocType", doctype_name):
    frappe.delete_doc("DocType", doctype_name, force=True)
    frappe.db.commit()
    print("✅ Old DocType deleted")

# Create new DocType
doc = frappe.new_doc("DocType")
doc.name = doctype_name
doc.module = "Climoro Onboarding"
doc.custom = 1
doc.autoname = "hash"
doc.title_field = "company"

# Define fields
fields = [
    # Basic Information Section
    {"fieldname": "sb_basic", "label": "Basic Information", "fieldtype": "Section Break"},
    
    # Company and Unit Information
    {"fieldname": "company", "label": "Company", "fieldtype": "Link", 
     "options": "Company", "reqd": 1, "in_list_view": 1},
    {"fieldname": "company_unit", "label": "Company Unit", "fieldtype": "Data", 
     "description": "Specific unit or plant within the company", "in_list_view": 1},
    {"fieldname": "date_of_input", "label": "Date of Input", "fieldtype": "Date", 
     "reqd": 1, "description": "The date corresponding to the data entry", "in_list_view": 1},
    {"fieldname": "duration_type", "label": "Duration Type", "fieldtype": "Select", 
     "options": "Daily\nMonthly\nYearly", "reqd": 1, "default": "Yearly", "in_list_view": 1},
    
    # Section 1: Clinker and Cement Production - Clinker
    {"fieldname": "sb_clinker", "label": "Clinker and Cement Production - Clinker", "fieldtype": "Section Break"},
    
    {"fieldname": "clinker_production", "label": "Clinker Production", "fieldtype": "Float", 
     "description": "Actual clinker production of active kilns", "precision": 2},
    {"fieldname": "clinker_bought", "label": "Clinker Bought", "fieldtype": "Float", 
     "description": "Amount of clinker purchased from other plants or companies", "precision": 2},
    {"fieldname": "clinker_sold", "label": "Clinker Sold", "fieldtype": "Float", 
     "description": "Amount of clinker sold to other plants or companies", "precision": 2},
    {"fieldname": "change_in_clinker_stocks", "label": "Change in Clinker Stocks", "fieldtype": "Float", 
     "description": "Amount of clinker added to stocks (positive) or taken from stocks (negative)", "precision": 2},
    {"fieldname": "total_clinker_consumed", "label": "Total Clinker Consumed", "fieldtype": "Float", 
     "description": "Calculated: clinker_production + clinker_bought - clinker_sold - change_in_clinker_stocks", 
     "precision": 2, "read_only": 1},
    
    # Section 2: Mineral Components for Portland and Blended Cements
    {"fieldname": "sb_mic_portland", "label": "Mineral Components (MIC) for Portland and Blended Cements", "fieldtype": "Section Break"},
    
    {"fieldname": "mic_gypsum", "label": "MIC Gypsum", "fieldtype": "Float", 
     "description": "Gypsum consumed for Portland and blended cements (dry weight)", "precision": 2},
    {"fieldname": "mic_limestone", "label": "MIC Limestone", "fieldtype": "Float", 
     "description": "Limestone consumed for Portland and blended cements (dry weight)", "precision": 2},
    {"fieldname": "mic_slag_portland_blended", "label": "MIC Slag (Portland/Blended)", "fieldtype": "Float", 
     "description": "Slag consumed for Portland and blended cements (dry weight)", "precision": 2},
    {"fieldname": "mic_fly_ash_blending", "label": "MIC Fly Ash Blending", "fieldtype": "Float", 
     "description": "Fly ash consumed for blending in Portland and blended cements (dry weight)", "precision": 2},
    {"fieldname": "mic_pozzolana_blending", "label": "MIC Pozzolana Blending", "fieldtype": "Float", 
     "description": "Pozzolana consumed for blending in Portland and blended cements (dry weight)", "precision": 2},
    {"fieldname": "mic_others_cement_mill", "label": "MIC Others (Cement Mill)", "fieldtype": "Float", 
     "description": "Other mineral components (e.g., CKD) added to cement mill for Portland and blended cements (dry weight)", "precision": 2},
    {"fieldname": "total_mic_consumed_portland_blended", "label": "Total MIC Consumed (Portland/Blended)", "fieldtype": "Float", 
     "description": "Total MIC consumed for Portland and blended cements (dry weight)", "precision": 2, "read_only": 1},
    
    # Section 3: Mineral Components as Cement Substitutes
    {"fieldname": "sb_mic_substitutes", "label": "Mineral Components (MIC) as Cement Substitutes", "fieldtype": "Section Break"},
    
    {"fieldname": "mic_consumed_pure_slag_cement", "label": "MIC Consumed (Pure Slag Cement)", "fieldtype": "Float", 
     "description": "MIC consumed for production of pure ground slag cement, containing no clinker (dry weight)", "precision": 2},
    {"fieldname": "mic_fly_ash_pozzolana_direct_sales", "label": "MIC Fly Ash/Pozzolana Direct Sales", "fieldtype": "Float", 
     "description": "Pure fly ash and pozzolana sold directly to consumers for production of concrete (dry weight)", "precision": 2},
    {"fieldname": "total_pure_mic_products_substitutes", "label": "Total Pure MIC Products (Substitutes)", "fieldtype": "Float", 
     "description": "Total pure MIC products used as cement substitutes (dry weight)", "precision": 2, "read_only": 1},
    
    # Section 4: Production Totals
    {"fieldname": "sb_production_totals", "label": "Production Totals", "fieldtype": "Section Break"},
    
    {"fieldname": "total_portland_blended_cements", "label": "Total Portland/Blended Cements", "fieldtype": "Float", 
     "description": "Total cement produced (all types together except pure slag cement and direct fly ash sales)", "precision": 2, "read_only": 1},
    {"fieldname": "total_cements_substitutes_portland_blended_slag", "label": "Total Cements/Substitutes (Portland/Blended/Slag)", "fieldtype": "Float", 
     "description": "Total cements produced, exclusive clinker sold to third parties", "precision": 2, "read_only": 1},
    {"fieldname": "total_cementitious_products", "label": "Total Cementitious Products", "fieldtype": "Float", 
     "description": "Total clinker produced plus MIC consumed for blending or production of cement substitutes", "precision": 2, "read_only": 1},
    
    # Section 5: Dust Production
    {"fieldname": "sb_dust_production", "label": "Dust Production (Dry Weight)", "fieldtype": "Section Break"},
    
    {"fieldname": "bypass_dust_leaving_kiln_system", "label": "Bypass Dust Leaving Kiln System", "fieldtype": "Float", 
     "description": "Only bypass dust which leaves the kiln system, e.g. for landfilling (dry weight)", "precision": 2},
    {"fieldname": "ckd_leaving_kiln_system", "label": "CKD Leaving Kiln System", "fieldtype": "Float", 
     "description": "All CKD which leaves the kiln system, e.g. for additions to cement mill, direct sale, landfilling, etc. (dry weight)", "precision": 2},
    {"fieldname": "calcination_rate_ckd", "label": "Calcination Rate of CKD", "fieldtype": "Percent", 
     "description": "Default = 100%. To be replaced with more precise data by Company if available", "default": 100},
    
    # Section 6: Kiln Fuel Consumption
    {"fieldname": "sb_kiln_fuel", "label": "Kiln Fuel Consumption (Aggregate)", "fieldtype": "Section Break"},
    
    {"fieldname": "kiln_total_heat_consumption", "label": "Total Heat Consumption of Kilns", "fieldtype": "Float", 
     "description": "Sum of conventional fossil fuels, alternative fossil fuels, and biomass fuels (TJ/yr)", "precision": 2},
    {"fieldname": "kiln_conventional_fossil_fuels", "label": "Conventional Fossil Fuels", "fieldtype": "Float", 
     "description": "Calculated based on consumption of individual fuels and their lower heating values (TJ/yr)", "precision": 2},
    {"fieldname": "kiln_alternative_fossil_fuels", "label": "Alternative Fossil Fuels", "fieldtype": "Float", 
     "description": "Calculated based on consumption of individual fuels and their lower heating values (TJ/yr)", "precision": 2},
    {"fieldname": "kiln_biomass_fuels", "label": "Biomass Fuels", "fieldtype": "Float", 
     "description": "Calculated based on consumption of individual fuels and their lower heating values (TJ/yr)", "precision": 2},
    
    # Section 7: Non-Kiln Fuel Consumption
    {"fieldname": "sb_non_kiln_fuel", "label": "Non-Kiln Fuel Consumption", "fieldtype": "Section Break"},
    
    {"fieldname": "non_kiln_equipment_vehicles_fuel", "label": "Equipment and On-site Vehicles", "fieldtype": "Float", 
     "description": "Fuel used for quarry equipment and vehicles for internal transport (TJ/yr)", "precision": 2},
    {"fieldname": "non_kiln_room_heating_cooling_fuel", "label": "Room Heating/Cooling", "fieldtype": "Float", 
     "description": "Fuel used for office heating (TJ/yr)", "precision": 2},
    {"fieldname": "non_kiln_drying_raw_materials_fuel", "label": "Drying of Raw Materials and Mineral Components", "fieldtype": "Float", 
     "description": "Fuel used for drying of raw materials and mineral components (TJ/yr)", "precision": 2},
    {"fieldname": "non_kiln_onsite_power_generation_fuel", "label": "On-site Power Generation", "fieldtype": "Float", 
     "description": "Fuel used for power generation on site (autoproduction) (TJ/yr)", "precision": 2},
    {"fieldname": "non_kiln_total_fuel_consumption", "label": "Total Non-Kiln Fuel Consumption", "fieldtype": "Float", 
     "description": "Sum of all non-kiln fuel consumption (TJ/yr)", "precision": 2, "read_only": 1},
    
    # Section 8: Power Consumption
    {"fieldname": "sb_power_consumption", "label": "Power Consumption", "fieldtype": "Section Break"},
    
    {"fieldname": "power_onsite_consumption", "label": "Consumption of Power Produced On-site", "fieldtype": "Float", 
     "description": "Consumption of power produced on site (= from autoproduction) (MWh/yr)", "precision": 2},
    {"fieldname": "power_onsite_co2_per_unit", "label": "CO2 per Power Unit Produced On-site", "fieldtype": "Float", 
     "description": "Calculated based on CO2 from on-site power generation and amount of power produced on-site (kg CO2/MWh)", "precision": 2},
    {"fieldname": "power_external_consumption", "label": "Consumption of Power Produced Externally", "fieldtype": "Float", 
     "description": "Consumption of grid power (MWh/yr)", "precision": 2},
    {"fieldname": "power_external_co2_per_unit", "label": "CO2 per Power Unit Produced Externally", "fieldtype": "Float", 
     "description": "Specific CO2 emission per unit grid power, to be obtained from power supplier or national authorities (kg CO2/MWh)", "precision": 2},
    {"fieldname": "power_total_plant_consumption", "label": "Total Plant Power Consumption", "fieldtype": "Float", 
     "description": "Sum of on-site and external power consumption (MWh/yr)", "precision": 2, "read_only": 1},
    
    # Section 9: Clinker Production and Composition
    {"fieldname": "sb_clinker_composition", "label": "Clinker Production and Composition", "fieldtype": "Section Break"},
    
    # Clinker #1
    {"fieldname": "clinker1_produced", "label": "Clinker #1 Produced", "fieldtype": "Float", 
     "description": "Clinker production for type 1 (t/yr)", "precision": 2},
    {"fieldname": "clinker1_cao_content", "label": "Clinker #1 CaO Content (incl. free lime)", "fieldtype": "Percent", 
     "description": "CaO content percentage for clinker type 1", "precision": 2},
    {"fieldname": "clinker1_mgo_content", "label": "Clinker #1 MgO Content", "fieldtype": "Percent", 
     "description": "MgO content percentage for clinker type 1", "precision": 2},
    {"fieldname": "clinker1_cao_amount", "label": "Clinker #1 CaO Amount", "fieldtype": "Float", 
     "description": "Calculated: Clinker produced × CaO content / 100 (t/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "clinker1_mgo_amount", "label": "Clinker #1 MgO Amount", "fieldtype": "Float", 
     "description": "Calculated: Clinker produced × MgO content / 100 (t/yr)", "precision": 2, "read_only": 1},
    
    # Clinker #2
    {"fieldname": "clinker2_produced", "label": "Clinker #2 Produced", "fieldtype": "Float", 
     "description": "Clinker production for type 2 (t/yr)", "precision": 2},
    {"fieldname": "clinker2_cao_content", "label": "Clinker #2 CaO Content (incl. free lime)", "fieldtype": "Percent", 
     "description": "CaO content percentage for clinker type 2", "precision": 2},
    {"fieldname": "clinker2_mgo_content", "label": "Clinker #2 MgO Content", "fieldtype": "Percent", 
     "description": "MgO content percentage for clinker type 2", "precision": 2},
    {"fieldname": "clinker2_cao_amount", "label": "Clinker #2 CaO Amount", "fieldtype": "Float", 
     "description": "Calculated: Clinker produced × CaO content / 100 (t/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "clinker2_mgo_amount", "label": "Clinker #2 MgO Amount", "fieldtype": "Float", 
     "description": "Calculated: Clinker produced × MgO content / 100 (t/yr)", "precision": 2, "read_only": 1},
    
    # Total Clinker
    {"fieldname": "total_clinker_produced_composition", "label": "Total Clinker Produced (Composition)", "fieldtype": "Float", 
     "description": "Sum of all clinker types (t/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "average_cao_content", "label": "Average CaO Content (incl. free lime)", "fieldtype": "Percent", 
     "description": "Weighted average CaO content (%)", "precision": 2, "read_only": 1},
    {"fieldname": "average_mgo_content", "label": "Average MgO Content", "fieldtype": "Percent", 
     "description": "Weighted average MgO content (%)", "precision": 2, "read_only": 1},
    {"fieldname": "total_cao_amount", "label": "Total CaO Amount", "fieldtype": "Float", 
     "description": "Sum of all CaO amounts (t/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "total_mgo_amount", "label": "Total MgO Amount", "fieldtype": "Float", 
     "description": "Sum of all MgO amounts (t/yr)", "precision": 2, "read_only": 1},
    
    # Section 10: Correction for Non-carbonate Sources
    {"fieldname": "sb_non_carbonate_sources", "label": "Correction for Non-carbonate Sources of CaO, MgO found in Clinker", "fieldtype": "Section Break"},
    
    # Raw Material #1
    {"fieldname": "raw_material1_consumed", "label": "Raw Material #1 Consumed (dry weight)", "fieldtype": "Float", 
     "description": "Raw material consumption for type 1 (t/yr)", "precision": 2},
    {"fieldname": "raw_material1_cao_content", "label": "Raw Material #1 CaO Content", "fieldtype": "Percent", 
     "description": "CaO content percentage for raw material type 1", "precision": 2},
    {"fieldname": "raw_material1_mgo_content", "label": "Raw Material #1 MgO Content", "fieldtype": "Percent", 
     "description": "MgO content percentage for raw material type 1", "precision": 2},
    {"fieldname": "raw_material1_cao_amount", "label": "Raw Material #1 CaO Amount", "fieldtype": "Float", 
     "description": "Calculated: Raw material consumed × CaO content / 100 (t/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "raw_material1_mgo_amount", "label": "Raw Material #1 MgO Amount", "fieldtype": "Float", 
     "description": "Calculated: Raw material consumed × MgO content / 100 (t/yr)", "precision": 2, "read_only": 1},
    
    # Raw Material #2
    {"fieldname": "raw_material2_consumed", "label": "Raw Material #2 Consumed (dry weight)", "fieldtype": "Float", 
     "description": "Raw material consumption for type 2 (t/yr)", "precision": 2},
    {"fieldname": "raw_material2_cao_content", "label": "Raw Material #2 CaO Content", "fieldtype": "Percent", 
     "description": "CaO content percentage for raw material type 2", "precision": 2},
    {"fieldname": "raw_material2_mgo_content", "label": "Raw Material #2 MgO Content", "fieldtype": "Percent", 
     "description": "MgO content percentage for raw material type 2", "precision": 2},
    {"fieldname": "raw_material2_cao_amount", "label": "Raw Material #2 CaO Amount", "fieldtype": "Float", 
     "description": "Calculated: Raw material consumed × CaO content / 100 (t/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "raw_material2_mgo_amount", "label": "Raw Material #2 MgO Amount", "fieldtype": "Float", 
     "description": "Calculated: Raw material consumed × MgO content / 100 (t/yr)", "precision": 2, "read_only": 1},
    
    # Total Raw Materials
    {"fieldname": "total_raw_material_consumed", "label": "Total Raw Material Consumed (dry weight)", "fieldtype": "Float", 
     "description": "Sum of all raw materials (t/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "average_raw_material_cao_content", "label": "Average Raw Material CaO Content", "fieldtype": "Percent", 
     "description": "Weighted average CaO content (%)", "precision": 2, "read_only": 1},
    {"fieldname": "average_raw_material_mgo_content", "label": "Average Raw Material MgO Content", "fieldtype": "Percent", 
     "description": "Weighted average MgO content (%)", "precision": 2, "read_only": 1},
    {"fieldname": "total_raw_material_cao_amount", "label": "Total Raw Material CaO Amount", "fieldtype": "Float", 
     "description": "Sum of all CaO amounts from raw materials (t/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "total_raw_material_mgo_amount", "label": "Total Raw Material MgO Amount", "fieldtype": "Float", 
     "description": "Sum of all MgO amounts from raw materials (t/yr)", "precision": 2, "read_only": 1},
    
    # Section 11: CO2 Emissions from Raw Material Calcination
    {"fieldname": "sb_co2_calcination", "label": "CO2 Emissions from Raw Material Calcination", "fieldtype": "Section Break"},
    
    # Absolute CO2 Emissions
    {"fieldname": "uncorrected_co2_emissions", "label": "Uncorrected CO2 Emissions, based on CaO- and MgO content of clinker", "fieldtype": "Float", 
     "description": "Calculated from total CaO and MgO amounts in clinker (t CO2/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "correction_non_carbonate_sources", "label": "Correction for Non-carbonate Sources of CaO and MgO", "fieldtype": "Float", 
     "description": "Calculated from CaO and MgO amounts in pre-calcined raw materials (t CO2/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "corrected_direct_co2_emissions", "label": "Corrected, Direct CO2 Emissions", "fieldtype": "Float", 
     "description": "Line 81 - Line 82 (t CO2/yr)", "precision": 2, "read_only": 1},
    
    # Specific CO2 Emissions per Ton of Clinker
    {"fieldname": "calcination_factor_uncorrected", "label": "Calcination Factor, Uncorrected", "fieldtype": "Float", 
     "description": "Uncorrected CO2 emissions / Total clinker produced × 1000 (kg CO2/t cli)", "precision": 2, "read_only": 1},
    {"fieldname": "calcination_factor_corrected", "label": "Calcination Factor, Corrected for Non-carbonate Sources", "fieldtype": "Float", 
     "description": "Corrected CO2 emissions / Total clinker produced × 1000 (kg CO2/t cli)", "precision": 2, "read_only": 1},
    
    # Section 12: CO2 from Raw Materials (Original Section)
    {"fieldname": "sb_co2_raw_materials", "label": "CO2 from Raw Materials (Original Section)", "fieldtype": "Section Break"},
    
    {"fieldname": "calcination_emission_factor", "label": "Calcination Emission Factor", "fieldtype": "Float", 
     "description": "Default = 525 kg CO2 per tonne of clinker. Replace with company-specific data if available (kg CO2/t cli)", "precision": 2, "default": 525},
    {"fieldname": "organic_carbon_content", "label": "Organic Carbon Content of Raw Meal", "fieldtype": "Percent", 
     "description": "Default = 0.2%. Replace with company-specific data if raw materials have substantially higher or lower organic carbon content", "precision": 2, "default": 0.2},
    {"fieldname": "raw_meal_clinker_ratio", "label": "Raw Meal : Clinker Ratio", "fieldtype": "Float", 
     "description": "Default = 1.55. Replace with company-specific data (excluding fuel ash content)", "precision": 2, "default": 1.55},
    {"fieldname": "raw_meal_consumption", "label": "Raw Meal Consumption", "fieldtype": "Float", 
     "description": "Calculated: Raw meal:clinker ratio × Clinker production (t/yr, dry weight)", "precision": 2, "read_only": 1},
    {"fieldname": "co2_from_calcination_clinker", "label": "CO2 from Calcination of Clinker", "fieldtype": "Float", 
     "description": "Calculated: Calcination emission factor × Clinker production / 1000 (t CO2/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "co2_from_organic_carbon", "label": "CO2 from Organic Carbon Content of Raw Meal", "fieldtype": "Float", 
     "description": "Calculated: Organic carbon content × Raw meal consumption × 3.664 (t CO2/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "total_co2_from_raw_materials", "label": "Total CO2 from Raw Materials", "fieldtype": "Float", 
     "description": "Sum of CO2 from calcination and organic carbon (t CO2/yr)", "precision": 2, "read_only": 1},
    
    # Section 13: CO2 from Fuels
    {"fieldname": "sb_co2_fuels", "label": "CO2 from Fuels", "fieldtype": "Section Break"},
    
    {"fieldname": "co2_from_conventional_fossil_fuels", "label": "CO2 from Conventional Fossil Fuels", "fieldtype": "Float", 
     "description": "Sum of CO2 emissions from conventional fossil fuels (t CO2/yr)", "precision": 2},
    {"fieldname": "co2_from_alternative_fossil_fuels", "label": "CO2 from Alternative Fossil Fuels", "fieldtype": "Float", 
     "description": "Sum of CO2 emissions from alternative fossil fuels (t CO2/yr)", "precision": 2},
    {"fieldname": "co2_from_equipment_vehicles", "label": "CO2 from Equipment and On-site Vehicles", "fieldtype": "Float", 
     "description": "Sum of CO2 emissions from equipment and on-site vehicles (t CO2/yr)", "precision": 2},
    {"fieldname": "co2_from_room_heating_cooling", "label": "CO2 from Room Heating/Cooling", "fieldtype": "Float", 
     "description": "Sum of CO2 emissions from room heating and cooling (t CO2/yr)", "precision": 2},
    {"fieldname": "co2_from_drying_materials", "label": "CO2 from Drying of Raw Materials and Mineral Components", "fieldtype": "Float", 
     "description": "Sum of CO2 emissions from drying of raw materials and mineral components (t CO2/yr)", "precision": 2},
    {"fieldname": "co2_from_onsite_power_generation", "label": "CO2 from On-site Power Generation", "fieldtype": "Float", 
     "description": "Sum of CO2 emissions from on-site power generation (excluding biomass CO2) (t CO2/yr)", "precision": 2},
    
    # Section 14: Total CO2 Emissions
    {"fieldname": "sb_total_co2_emissions", "label": "Total CO2 Emissions", "fieldtype": "Section Break"},
    
    {"fieldname": "total_co2_from_fossil_kiln_fuels", "label": "Total CO2 from Fossil-based Kiln Fuels", "fieldtype": "Float", 
     "description": "Sum of CO2 from conventional and alternative fossil fuels (t CO2/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "total_co2_from_non_kiln_fuels", "label": "Total CO2 from Non-Kiln Fuels", "fieldtype": "Float", 
     "description": "Sum of CO2 from equipment, heating, drying, and power generation (t CO2/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "co2_from_external_power", "label": "CO2 from External Power Generation", "fieldtype": "Float", 
     "description": "Calculated: External power consumption × CO2 per unit / 1000 (t CO2/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "emission_factor_bought_clinker", "label": "Emission Factor for Bought Clinker", "fieldtype": "Float", 
     "description": "Default = 862 kg CO2 per tonne of clinker (average from several cement companies) (kg CO2/t cli)", "precision": 2, "default": 862},
    {"fieldname": "co2_from_net_clinker_imports", "label": "CO2 from Net Clinker Imports/Exports", "fieldtype": "Float", 
     "description": "Calculated: (Clinker bought - Clinker sold) × Emission factor / 1000 (t CO2/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "total_direct_co2", "label": "Total Direct CO2: All Sources", "fieldtype": "Float", 
     "description": "Sum of total CO2 from raw materials, kiln fuels, and non-kiln fuels (t CO2/yr)", "precision": 2, "read_only": 1},
    {"fieldname": "total_indirect_co2", "label": "Total Indirect CO2 (Main Sources)", "fieldtype": "Float", 
     "description": "Sum of CO2 from external power and net clinker imports/exports (t CO2/yr)", "precision": 2, "read_only": 1},
]

# Add fields to doctype
for field in fields:
    doc.append("fields", field)

# Permissions
doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1})
doc.append("permissions", {"role": "All", "read": 1})

# Save doctype
doc.insert(ignore_permissions=True)
frappe.db.commit()
print("✅ Cement Process DocType created successfully!")

print("\n🎯 Cement Process features:")
print("  • Comprehensive cement production data management")
print("  • Clinker and cement production tracking")
print("  • Mineral component consumption monitoring")
print("  • Dust production and fuel consumption tracking")
print("  • Power consumption and CO2 emissions data")
print("  • Clinker composition analysis (CaO/MgO content)")
print("  • Non-carbonate source corrections")
print("  • CO2 emissions from raw material calcination")
print("  • Specific and absolute CO2 emission calculations")
print("  • Auto-calculated totals and derived fields")
print("  • Company and unit-based data organization")
print("  • Flexible duration types (Daily/Monthly/Yearly)")
print("  • Industry-standard default values and emission factors")
