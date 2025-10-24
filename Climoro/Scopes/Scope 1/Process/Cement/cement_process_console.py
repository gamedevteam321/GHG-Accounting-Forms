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
    
    
    # Section 9: Clinker Production and Composition
    {"fieldname": "sb_clinker_composition", "label": "Clinker Production and Composition", "fieldtype": "Section Break"},
    
    # Clinker #1
    {"fieldname": "clinker1_produced", "label": "Clinker #1 Produced", "fieldtype": "Float", 
     "description": "Clinker production for type 1 (tonnes)", "precision": 2},
    {"fieldname": "clinker1_cao_content", "label": "Clinker #1 CaO Content (incl. free lime)", "fieldtype": "Percent", 
     "description": "CaO content percentage for clinker type 1", "precision": 2},
    {"fieldname": "clinker1_mgo_content", "label": "Clinker #1 MgO Content", "fieldtype": "Percent", 
     "description": "MgO content percentage for clinker type 1", "precision": 2},
    {"fieldname": "clinker1_cao_amount", "label": "Clinker #1 CaO Amount", "fieldtype": "Float", 
     "description": "Calculated: Clinker produced × CaO content / 100 (tonnes)", "precision": 2, "read_only": 1},
    {"fieldname": "clinker1_mgo_amount", "label": "Clinker #1 MgO Amount", "fieldtype": "Float", 
     "description": "Calculated: Clinker produced × MgO content / 100 (tonnes)", "precision": 2, "read_only": 1},
    
    # Clinker #2
    {"fieldname": "clinker2_produced", "label": "Clinker #2 Produced", "fieldtype": "Float", 
     "description": "Clinker production for type 2 (tonnes)", "precision": 2},
    {"fieldname": "clinker2_cao_content", "label": "Clinker #2 CaO Content (incl. free lime)", "fieldtype": "Percent", 
     "description": "CaO content percentage for clinker type 2", "precision": 2},
    {"fieldname": "clinker2_mgo_content", "label": "Clinker #2 MgO Content", "fieldtype": "Percent", 
     "description": "MgO content percentage for clinker type 2", "precision": 2},
    {"fieldname": "clinker2_cao_amount", "label": "Clinker #2 CaO Amount", "fieldtype": "Float", 
     "description": "Calculated: Clinker produced × CaO content / 100 (tonnes)", "precision": 2, "read_only": 1},
    {"fieldname": "clinker2_mgo_amount", "label": "Clinker #2 MgO Amount", "fieldtype": "Float", 
     "description": "Calculated: Clinker produced × MgO content / 100 (tonnes)", "precision": 2, "read_only": 1},
    
    # Total Clinker
    {"fieldname": "total_clinker_produced_composition", "label": "Total Clinker Produced (Composition)", "fieldtype": "Float", 
     "description": "Sum of all clinker types (tonnes)", "precision": 2, "read_only": 1},
    {"fieldname": "average_cao_content", "label": "Average CaO Content (incl. free lime)", "fieldtype": "Percent", 
     "description": "Weighted average CaO content (%)", "precision": 2, "read_only": 1},
    {"fieldname": "average_mgo_content", "label": "Average MgO Content", "fieldtype": "Percent", 
     "description": "Weighted average MgO content (%)", "precision": 2, "read_only": 1},
    {"fieldname": "total_cao_amount", "label": "Total CaO Amount", "fieldtype": "Float", 
     "description": "Sum of all CaO amounts (tonnes)", "precision": 2, "read_only": 1},
    {"fieldname": "total_mgo_amount", "label": "Total MgO Amount", "fieldtype": "Float", 
     "description": "Sum of all MgO amounts (tonnes)", "precision": 2, "read_only": 1},
    
    # Section 10: Correction for Non-carbonate Sources
    {"fieldname": "sb_non_carbonate_sources", "label": "Correction for Non-carbonate Sources of CaO, MgO found in Clinker", "fieldtype": "Section Break"},
    
    # Raw Material #1
    {"fieldname": "raw_material1_consumed", "label": "Raw Material #1 Consumed (dry weight)", "fieldtype": "Float", 
     "description": "Raw material consumption for type 1 (tonnes)", "precision": 2},
    {"fieldname": "raw_material1_cao_content", "label": "Raw Material #1 CaO Content", "fieldtype": "Percent", 
     "description": "CaO content percentage for raw material type 1", "precision": 2},
    {"fieldname": "raw_material1_mgo_content", "label": "Raw Material #1 MgO Content", "fieldtype": "Percent", 
     "description": "MgO content percentage for raw material type 1", "precision": 2},
    {"fieldname": "raw_material1_cao_amount", "label": "Raw Material #1 CaO Amount", "fieldtype": "Float", 
     "description": "Calculated: Raw material consumed × CaO content / 100 (tonnes)", "precision": 2, "read_only": 1},
    {"fieldname": "raw_material1_mgo_amount", "label": "Raw Material #1 MgO Amount", "fieldtype": "Float", 
     "description": "Calculated: Raw material consumed × MgO content / 100 (tonnes)", "precision": 2, "read_only": 1},
    
    # Raw Material #2
    {"fieldname": "raw_material2_consumed", "label": "Raw Material #2 Consumed (dry weight)", "fieldtype": "Float", 
     "description": "Raw material consumption for type 2 (tonnes)", "precision": 2},
    {"fieldname": "raw_material2_cao_content", "label": "Raw Material #2 CaO Content", "fieldtype": "Percent", 
     "description": "CaO content percentage for raw material type 2", "precision": 2},
    {"fieldname": "raw_material2_mgo_content", "label": "Raw Material #2 MgO Content", "fieldtype": "Percent", 
     "description": "MgO content percentage for raw material type 2", "precision": 2},
    {"fieldname": "raw_material2_cao_amount", "label": "Raw Material #2 CaO Amount", "fieldtype": "Float", 
     "description": "Calculated: Raw material consumed × CaO content / 100 (tonnes)", "precision": 2, "read_only": 1},
    {"fieldname": "raw_material2_mgo_amount", "label": "Raw Material #2 MgO Amount", "fieldtype": "Float", 
     "description": "Calculated: Raw material consumed × MgO content / 100 (tonnes)", "precision": 2, "read_only": 1},
    
    # Total Raw Materials
    {"fieldname": "total_raw_material_consumed", "label": "Total Raw Material Consumed (dry weight)", "fieldtype": "Float", 
     "description": "Sum of all raw materials (tonnes)", "precision": 2, "read_only": 1},
    {"fieldname": "average_raw_material_cao_content", "label": "Average Raw Material CaO Content", "fieldtype": "Percent", 
     "description": "Weighted average CaO content (%)", "precision": 2, "read_only": 1},
    {"fieldname": "average_raw_material_mgo_content", "label": "Average Raw Material MgO Content", "fieldtype": "Percent", 
     "description": "Weighted average MgO content (%)", "precision": 2, "read_only": 1},
    {"fieldname": "total_raw_material_cao_amount", "label": "Total Raw Material CaO Amount", "fieldtype": "Float", 
     "description": "Sum of all CaO amounts from raw materials (tonnes)", "precision": 2, "read_only": 1},
    {"fieldname": "total_raw_material_mgo_amount", "label": "Total Raw Material MgO Amount", "fieldtype": "Float", 
     "description": "Sum of all MgO amounts from raw materials (tonnes)", "precision": 2, "read_only": 1},
    
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
    
    {"fieldname": "calcination_emission_factor_35a", "label": "Calcination Emission Factor, Corrected for CaO- and MgO Imports", "fieldtype": "Float", 
     "description": "Default = 525 kg CO2 per tonne of clinker (kg CO2/tonne clinker)", "precision": 2, "default": 525},
    {"fieldname": "organic_carbon_content_35b", "label": "Organic Carbon Content of Raw Meal (Average)", "fieldtype": "Percent", 
     "description": "Default = 0.2%. Replace with company-specific data if raw materials have substantially higher or lower organic carbon content", "precision": 2, "default": 0.2},
    {"fieldname": "raw_meal_clinker_ratio_35c", "label": "Raw Meal : Clinker Ratio", "fieldtype": "Float", 
     "description": "Default = 1.55. Replace with company-specific data (excluding fuel ash content)", "precision": 2, "default": 1.55},
    {"fieldname": "raw_meal_consumption_35d", "label": "Raw Meal Consumption", "fieldtype": "Float", 
     "description": "Calculated: Raw meal:clinker ratio × Clinker production (tonnes, dry weight)", "precision": 2, "read_only": 1},
    {"fieldname": "co2_from_calcination_clinker_36", "label": "CO2 from Calcination of Clinker", "fieldtype": "Float", 
     "description": "Calculated: (35a / 1000) × Clinker production (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "co2_from_calcination_bypass_dust_37", "label": "CO2 from Calcination of Bypass Dust Leaving the Kiln System", "fieldtype": "Float", 
     "description": "Calculated: (35a / 1000) × Bypass dust (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "co2_from_calcination_ckd_38a", "label": "CO2 from Calcination of CKD Leaving the Kiln System", "fieldtype": "Float", 
     "description": "Calculated: CKD amount × Non-linear function of calcination factor and calcination rate (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "co2_from_organic_carbon_38b", "label": "CO2 from Organic Carbon Content of Raw Meal", "fieldtype": "Float", 
     "description": "Calculated: 35b × 35d × 3.664 (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "total_co2_from_raw_materials_39", "label": "Total CO2 from Raw Materials", "fieldtype": "Float", 
     "description": "Total (tonnes CO2)", "precision": 2, "read_only": 1},
    
    
    # Section 14: Total CO2 Emissions
    {"fieldname": "sb_total_co2_emissions", "label": "Total CO2 Emissions", "fieldtype": "Section Break"},
    
    {"fieldname": "emission_factor_bought_clinker", "label": "Emission Factor for Bought Clinker", "fieldtype": "Float", 
     "description": "Default = 862 kg CO2 per tonne of clinker (average from several cement companies) (kg CO2/t cli)", "precision": 2, "default": 862},
    {"fieldname": "co2_from_net_clinker_imports", "label": "CO2 from Net Clinker Imports/Exports", "fieldtype": "Float", 
     "description": "Calculated: (Clinker bought - Clinker sold) × Emission factor / 1000 (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "total_direct_co2_48", "label": "Total Direct CO2: All Sources", "fieldtype": "Float", 
     "description": "Sum of total CO2 from raw materials (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "total_indirect_co2", "label": "Total Indirect CO2 (Main Sources)", "fieldtype": "Float", 
     "description": "Sum of CO2 from net clinker imports/exports (tonnes CO2)", "precision": 2, "read_only": 1},
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
print("  • Dust production tracking")
print("  • Clinker composition analysis (CaO/MgO content)")
print("  • Non-carbonate source corrections")
print("  • CO2 emissions from raw material calcination")
print("  • Specific and absolute CO2 emission calculations")
print("  • Auto-calculated totals and derived fields")
print("  • Company and unit-based data organization")
print("  • Flexible duration types (Daily/Monthly/Yearly)")
print("  • Industry-standard default values and emission factors")
