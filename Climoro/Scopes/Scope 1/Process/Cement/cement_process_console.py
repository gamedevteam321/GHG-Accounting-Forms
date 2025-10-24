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
    
    # Section 2: Clinker and Cement Production - Clinker (Step 2)
    {"fieldname": "sb_clinker", "label": "Step 2: Clinker Production", "fieldtype": "Section Break"},
    
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
    
    # Section 3: Mineral Components for Portland and Blended Cements (Step 3)
    {"fieldname": "sb_mic_portland", "label": "Step 3: Mineral Components (MIC)", "fieldtype": "Section Break"},
    
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
    
    # MIC as Cement Substitutes (Part of Step 3)
    {"fieldname": "sb_mic_substitutes", "label": "MIC as Cement Substitutes", "fieldtype": "Section Break"},
    
    {"fieldname": "mic_consumed_pure_slag_cement", "label": "MIC Consumed (Pure Slag Cement)", "fieldtype": "Float", 
     "description": "MIC consumed for production of pure ground slag cement, containing no clinker (dry weight)", "precision": 2},
    {"fieldname": "mic_fly_ash_pozzolana_direct_sales", "label": "MIC Fly Ash/Pozzolana Direct Sales", "fieldtype": "Float", 
     "description": "Pure fly ash and pozzolana sold directly to consumers for production of concrete (dry weight)", "precision": 2},
    {"fieldname": "total_pure_mic_products_substitutes", "label": "Total Pure MIC Products (Substitutes)", "fieldtype": "Float", 
     "description": "Total pure MIC products used as cement substitutes (dry weight)", "precision": 2, "read_only": 1},
    
    # Section 4: Calcination (Step 4)
    {"fieldname": "sb_calcination", "label": "Step 4: Calcination", "fieldtype": "Section Break"},
    
    # Clinker Composition
    {"fieldname": "clinker_produced_21", "label": "Clinker Produced", "fieldtype": "Float", 
     "description": "From Step 2: Clinker Production (tonnes)", "precision": 2, "read_only": 1},
    {"fieldname": "cao_content_clinker_22", "label": "CaO Content (incl. free lime)", "fieldtype": "Percent", 
     "description": "CaO content including free lime in clinker (%)", "precision": 2},
    {"fieldname": "mgo_content_clinker_23", "label": "MgO Content", "fieldtype": "Percent", 
     "description": "MgO content in clinker (%)", "precision": 2},
    {"fieldname": "cao_amount_clinker_24", "label": "CaO Amount", "fieldtype": "Float", 
     "description": "Calculated: CaO content * Clinker produced / 100 (tonnes)", "precision": 2, "read_only": 1},
    {"fieldname": "mgo_amount_clinker_25", "label": "MgO Amount", "fieldtype": "Float", 
     "description": "Calculated: MgO content * Clinker produced / 100 (tonnes)", "precision": 2, "read_only": 1},
    
    # Raw Material Composition
    {"fieldname": "raw_material_consumed_51", "label": "Raw Material Consumed (dry weight)", "fieldtype": "Float", 
     "description": "Raw material consumed (dry weight) (tonnes)", "precision": 2},
    {"fieldname": "cao_content_raw_material_52", "label": "CaO Content", "fieldtype": "Percent", 
     "description": "CaO content in raw material (%)", "precision": 2},
    {"fieldname": "mgo_content_raw_material_53", "label": "MgO Content", "fieldtype": "Percent", 
     "description": "MgO content in raw material (%)", "precision": 2},
    {"fieldname": "cao_amount_raw_material_54", "label": "CaO Amount", "fieldtype": "Float", 
     "description": "Calculated: CaO content * Raw material consumed / 100 (tonnes)", "precision": 2, "read_only": 1},
    {"fieldname": "mgo_amount_raw_material_55", "label": "MgO Amount", "fieldtype": "Float", 
     "description": "Calculated: MgO content * Raw material consumed / 100 (tonnes)", "precision": 2, "read_only": 1},
    
    # CO2 Emissions from Raw Material Calcination
    {"fieldname": "uncorrected_co2_emissions_81", "label": "Uncorrected CO2 emissions, based on CaO- and MgO content of clinker", "fieldtype": "Float", 
     "description": "Calculated: CaO amount * (44.0/56.1) + MgO amount * (44.0/40.3) (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "correction_non_carbonate_82", "label": "Correction for non-carbonate sources of CaO and MgO", "fieldtype": "Float", 
     "description": "Calculated: Raw material CaO amount * (44.0/56.1) + Raw material MgO amount * (44.0/40.3) (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "corrected_direct_co2_emissions_83", "label": "Corrected, direct CO2 emissions", "fieldtype": "Float", 
     "description": "Calculated: Uncorrected CO2 emissions - Correction for non-carbonate sources (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "calcination_factor_uncorrected_84", "label": "Calcination factor, uncorrected", "fieldtype": "Float", 
     "description": "Calculated: (Uncorrected CO2 emissions / Clinker produced) * 1000 (kg CO2/tonne clinker)", "precision": 2, "read_only": 1},
    {"fieldname": "calcination_factor_corrected_85", "label": "Calcination factor, corrected for non-carbonate sources of CaO, MgO", "fieldtype": "Float", 
     "description": "Calculated: (Corrected direct CO2 emissions / Clinker produced) * 1000 (kg CO2/tonne clinker)", "precision": 2, "read_only": 1},
    
    # Section 5: Production Totals (Step 5)
    {"fieldname": "sb_production_totals", "label": "Step 5: Production Totals", "fieldtype": "Section Break"},
    
    {"fieldname": "total_portland_blended_cements", "label": "Total Portland/Blended Cements", "fieldtype": "Float", 
     "description": "Total cement produced (all types together except pure slag cement and direct fly ash sales)", "precision": 2, "read_only": 1},
    {"fieldname": "total_cements_substitutes_portland_blended_slag", "label": "Total Cements/Substitutes (Portland/Blended/Slag)", "fieldtype": "Float", 
     "description": "Total cements produced, exclusive clinker sold to third parties", "precision": 2, "read_only": 1},
    {"fieldname": "total_cementitious_products", "label": "Total Cementitious Products", "fieldtype": "Float", 
     "description": "Total clinker produced plus MIC consumed for blending or production of cement substitutes", "precision": 2, "read_only": 1},
    
    # Section 6: Dust Production (Step 6)
    {"fieldname": "sb_dust_production", "label": "Step 6: Dust Production", "fieldtype": "Section Break"},
    
    {"fieldname": "bypass_dust_leaving_kiln_system", "label": "Bypass Dust Leaving Kiln System", "fieldtype": "Float", 
     "description": "Only bypass dust which leaves the kiln system, e.g. for landfilling (dry weight)", "precision": 2},
    {"fieldname": "ckd_leaving_kiln_system", "label": "CKD Leaving Kiln System", "fieldtype": "Float", 
     "description": "All CKD which leaves the kiln system, e.g. for additions to cement mill, direct sale, landfilling, etc. (dry weight)", "precision": 2},
    {"fieldname": "calcination_rate_ckd", "label": "Calcination Rate of CKD", "fieldtype": "Percent", 
     "description": "Default = 100%. To be replaced with more precise data by Company if available", "default": 100},
    
    
    # Section 7: CO2 Emissions (Step 7)
    {"fieldname": "sb_co2_raw_materials", "label": "Step 7: CO2 Emissions", "fieldtype": "Section Break"},
    
    {"fieldname": "calcination_emission_factor_35a", "label": "Calcination Emission Factor, Corrected for CaO- and MgO Imports", "fieldtype": "Float", 
     "description": "Auto-populated from Step 4: Corrected calcination factor. Default = 525 kg CO2 per tonne of clinker (kg CO2/tonne clinker)", "precision": 2, "default": 525},
    {"fieldname": "organic_carbon_content_35b", "label": "Organic Carbon Content of Raw Meal (Average)", "fieldtype": "Percent", 
     "description": "Default = 0.2%. Replace with company-specific data if raw materials have substantially higher or lower organic carbon content", "precision": 2, "default": 0.2},
    {"fieldname": "raw_meal_clinker_ratio_35c", "label": "Raw Meal : Clinker Ratio", "fieldtype": "Float", 
     "description": "Default = 1.55. Replace with company-specific data (excluding fuel ash content)", "precision": 2, "default": 1.55},
    {"fieldname": "raw_meal_consumption_35d", "label": "Raw Meal Consumption", "fieldtype": "Float", 
     "description": "Calculated: Raw meal : clinker ratio * Clinker production (tonnes, dry weight)", "precision": 2, "read_only": 1},
    {"fieldname": "co2_from_calcination_clinker_36", "label": "CO2 from Calcination of Clinker", "fieldtype": "Float", 
     "description": "Calculated: (Calcination emission factor / 1000) * Clinker production (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "co2_from_calcination_bypass_dust_37", "label": "CO2 from Calcination of Bypass Dust Leaving the Kiln System", "fieldtype": "Float", 
     "description": "Calculated: (Calcination emission factor / 1000) * Bypass dust (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "co2_from_calcination_ckd_38a", "label": "CO2 from Calcination of CKD Leaving the Kiln System", "fieldtype": "Float", 
     "description": "Calculated: CKD amount × Non-linear function of calcination factor and calcination rate (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "co2_from_organic_carbon_38b", "label": "CO2 from Organic Carbon Content of Raw Meal", "fieldtype": "Float", 
     "description": "Calculated: Organic carbon content * Raw meal consumption * 3.664 (tonnes CO2)", "precision": 2, "read_only": 1},
    {"fieldname": "total_co2_from_raw_materials_39", "label": "Total CO2 from Raw Materials", "fieldtype": "Float", 
     "description": "Total (tonnes CO2)", "precision": 2, "read_only": 1},
    
    
    # Total CO2 Emissions
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
