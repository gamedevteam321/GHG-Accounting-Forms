#!/usr/bin/env python3
"""
Unified Stationary Combustion DocType
Combines both old and new approaches based on unit selection
"""

import frappe

# Delete existing DocType if it exists
doctype_name = "Unified Stationary Combustion"
if frappe.db.exists("DocType", doctype_name):
    frappe.delete_doc("DocType", doctype_name, force=True)
    frappe.db.commit()
    print("✅ Old DocType deleted")

# Create new unified DocType
doc = frappe.new_doc("DocType")
doc.name = doctype_name
doc.module = "Custom"
doc.custom = 1
doc.autoname = "hash"
doc.title_field = "activity_data"

# Define fields that work for both approaches
fields = [
    # Basic Information Section
    {"fieldname": "sb_basic", "label": "Basic Information", "fieldtype": "Section Break"},
    
    # Serial Number and Date
    {"fieldname": "s_no", "label": "S. No", "fieldtype": "Int", "reqd": 1, "in_list_view": 1},
    {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
    {"fieldname": "invoice_no", "label": "Invoice No", "fieldtype": "Data", "in_list_view": 1},
    {"fieldname": "upload_invoice", "label": "Upload Invoice", "fieldtype": "Attach"},
    
    # Activity Information
    {"fieldname": "activity_data", "label": "Activity Data", "fieldtype": "Data", 
     "reqd": 1, "in_list_view": 1, "placeholder": "Enter activity description"},
    {"fieldname": "activity_types", "label": "Activity Types", "fieldtype": "Select", 
     "reqd": 1, "in_list_view": 1,
     "options": "Boilers\nBurners\nGen Sets\nFurnace (Including Blast Furnace)\nOther"},
    
    # Company Information
    {"fieldname": "company", "label": "Company", "fieldtype": "Link", 
     "options": "Company", "in_list_view": 1},
    {"fieldname": "company_unit", "label": "Company Unit", "fieldtype": "Link", 
     "options": "Units", "in_list_view": 1},
    
    # Fuel Information Section
    {"fieldname": "sb_fuel", "label": "Fuel Information", "fieldtype": "Section Break"},
    
    # Fuel Type and Selection
    {"fieldname": "fuel_type", "label": "Fuel Type", "fieldtype": "Select",
     "options": "Solid fossil\nLiquid fossil\nGaseous fossil\nBiomass\nOther",
     "reqd": 1, "in_list_view": 1},
    {"fieldname": "fuel_selection", "label": "Fuel Selection", "fieldtype": "Link",
     "options": "Emission Factor Master", "reqd": 1, "in_list_view": 1,
     "depends_on": "eval:doc.fuel_type"},
    
    # Unit Selection - This determines which calculation method to use
    {"fieldname": "unit_selection", "label": "Unit Selection", "fieldtype": "Select",
     "options": "TJ\nGJ\nkg\nlitre\nm³\ntonne", "reqd": 1, "in_list_view": 1},
    
        # Heating Value Basis - Intractable for energy units
        {"fieldname": "heating_value_basis", "label": "Heating Value Basis", "fieldtype": "Select",
         "options": "Lower\nHigher\nNA", "in_list_view": 1},
    
    
    # Conditional Section for Energy Units (TJ, GJ) - Advanced Method
    {"fieldname": "sb_energy_method", "label": "Energy-Based Calculation (TJ/GJ)", 
     "fieldtype": "Section Break", "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    
    # LHV and Density for Energy Units
    {"fieldname": "lhv_ncv", "label": "Lower Heating Value (LHV) (TJ/Gg)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "density_liquid", "label": "Density of Liquids (kg/litre)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "density_gas", "label": "Density of Gases (kg/m³)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    
    # CO2 Emission Factors for Energy Units
    {"fieldname": "sb_co2_energy", "label": "CO2 Emission Factors (Energy Basis)", 
     "fieldtype": "Section Break", "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "efco2_energy", "label": "EF CO2 Energy (kg CO2/TJ)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "efco2_mass", "label": "EF CO2 Mass (kg CO2/tonne)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "efco2_liquid", "label": "EF CO2 Liquid (kg CO2/litre)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "efco2_gas", "label": "EF CO2 Gas (kg CO2/m³)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    
    # CH4 Emission Factors for Energy Units
    {"fieldname": "sb_ch4_energy", "label": "CH4 Emission Factors (Energy Basis)", 
     "fieldtype": "Section Break", "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "efch4_energy", "label": "EF CH4 Energy (kg CH4/TJ)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "efch4_mass", "label": "EF CH4 Mass (kg CH4/tonne)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "efch4_liquid", "label": "EF CH4 Liquid (kg CH4/litre)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "efch4_gas", "label": "EF CH4 Gas (kg CH4/m³)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    
    # N2O Emission Factors for Energy Units
    {"fieldname": "sb_n2o_energy", "label": "N2O Emission Factors (Energy Basis)", 
     "fieldtype": "Section Break", "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "efn2o_energy", "label": "EF N2O Energy (kg N2O/TJ)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "efn2o_mass", "label": "EF N2O Mass (kg N2O/tonne)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "efn2o_liquid", "label": "EF N2O Liquid (kg N2O/litre)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    {"fieldname": "efn2o_gas", "label": "EF N2O Gas (kg N2O/m³)", 
     "fieldtype": "Float", "precision": 2, "read_only": 1,
     "depends_on": "eval:doc.unit_selection in ['TJ', 'GJ']"},
    
    # Conditional Section for Mass/Volume Units (kg, litre, m³, tonne) - Simple Method
    {"fieldname": "sb_simple_method", "label": "Mass/Volume-Based Calculation (kg/litre/m³/tonne)", 
     "fieldtype": "Section Break", "depends_on": "eval:doc.unit_selection in ['kg', 'litre', 'm³', 'tonne']"},
    
    # Simple Emission Factors for Mass/Volume Units
    {"fieldname": "efco2", "label": "EF CO2 (kg CO2/unit)", "fieldtype": "Float", 
     "precision": 2, "read_only": 1, "depends_on": "eval:doc.unit_selection in ['kg', 'litre', 'm³', 'tonne']"},
    {"fieldname": "efch4", "label": "EF CH4 (kg CH4/unit)", "fieldtype": "Float", 
     "precision": 2, "read_only": 1, "depends_on": "eval:doc.unit_selection in ['kg', 'litre', 'm³', 'tonne']"},
    {"fieldname": "efn2o", "label": "EF N2O (kg N2O/unit)", "fieldtype": "Float", 
     "precision": 2, "read_only": 1, "depends_on": "eval:doc.unit_selection in ['kg', 'litre', 'm³', 'tonne']"},
    
    # Calculated Emissions Section (Common for both methods)
    {"fieldname": "sb_emissions", "label": "Calculated Emissions", "fieldtype": "Section Break"},
    
    # Individual Emissions (Common for both methods)
    {"fieldname": "eco2", "label": "E CO2 (kg CO2)", "fieldtype": "Float", 
     "precision": 8, "read_only": 1, "in_list_view": 1},
    {"fieldname": "ech4", "label": "E CH4 (kg CH4)", "fieldtype": "Float", 
     "precision": 8, "read_only": 1, "in_list_view": 1},
    {"fieldname": "en2o", "label": "E N2O (kg N2O)", "fieldtype": "Float", 
     "precision": 8, "read_only": 1, "in_list_view": 1},
    
    # Total CO2 Equivalent (Common for both methods)
    {"fieldname": "etco2eq", "label": "ET CO2eq (kg CO2 equivalent)", "fieldtype": "Float", 
     "precision": 2, "read_only": 1, "in_list_view": 1},
    
    # Calculation Method Indicator
    {"fieldname": "calculation_method", "label": "Calculation Method", "fieldtype": "Data", 
     "read_only": 1, "in_list_view": 1},
    
    # Metadata
    {"fieldname": "total_emission_factors", "label": "Total Emission Factors", 
     "fieldtype": "Int", "read_only": 1},
    {"fieldname": "last_updated", "label": "Last Updated", 
     "fieldtype": "Datetime", "read_only": 1},
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
print("✅ Unified Stationary Combustion DocType created successfully!")

print("\n🎯 Unified Stationary Combustion features:")
print("  • Energy units (TJ, GJ) → Advanced method with LHV and detailed emission factors")
print("  • Mass/Volume units (kg, litre, m³, tonne) → Simple method with basic emission factors")
print("  • Automatic calculation method selection based on unit type")
print("  • Conditional field visibility based on unit selection")
print("  • Common emission calculation results for both methods")
