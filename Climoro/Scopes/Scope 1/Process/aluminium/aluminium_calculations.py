"""
Aluminium Production CO2 Emissions Calculation API
Contains formulas for both Part A (Prebake Anode Electrolysis) and Part B (Green Anode Baking Furnace)
"""

import frappe
from frappe import _

def calculate_part_a_emissions(metal_production, net_anode_consumption, sulphur_content, ash_content):
    """
    Calculate CO2 emissions from Prebake Anode Electrolysis Cells
    
    Formula: Eco2 = [MP x NAC x (100 - S - Ash) / 100] x 44/12
    
    Args:
        metal_production (float): Total metal production, tonnes aluminium per year
        net_anode_consumption (float): Net anode consumption, tonnes per tonne aluminium
        sulphur_content (float): Sulphur content in baked anodes, wt %
        ash_content (float): Ash content in baked anodes, wt %
    
    Returns:
        float: CO2 emissions in tonnes per year
    """
    try:
        # Validate inputs
        if not all(isinstance(x, (int, float)) for x in [metal_production, net_anode_consumption, sulphur_content, ash_content]):
            raise ValueError("All inputs must be numeric values")
        
        if metal_production < 0 or net_anode_consumption < 0:
            raise ValueError("Metal production and net anode consumption must be positive")
        
        if sulphur_content < 0 or ash_content < 0:
            raise ValueError("Sulphur and ash content must be non-negative")
        
        if sulphur_content + ash_content > 100:
            raise ValueError("Combined sulphur and ash content cannot exceed 100%")
        
        # Calculate CO2 emissions
        # Eco2 = [MP x NAC x (100 - S - Ash) / 100] x 44/12
        carbon_content = (100 - sulphur_content - ash_content) / 100
        co2_emissions = metal_production * net_anode_consumption * carbon_content * (44/12)
        
        return round(co2_emissions, 2)
        
    except Exception as e:
        frappe.log_error(f"Error in Part A calculation: {str(e)}", "Aluminium Calculations")
        raise frappe.ValidationError(f"Calculation error: {str(e)}")

def calculate_part_b_emissions(green_anode_weight, baked_anode_weight, baked_anode_production, 
                              loaded_green_anodes, hydrogen_content, waste_tar_collected,
                              packing_coke_consumption, sulphur_content_packing, ash_content_packing):
    """
    Calculate CO2 emissions from Green Anode Baking Furnace
    
    Formula: Eco2 = [GA - (GAW / BAW) x BA] x H x 44/12 + additional terms for packing coke
    
    Args:
        green_anode_weight (float): Initial weight of green anodes, tonnes
        baked_anode_weight (float): Baked anode weight, tonnes
        baked_anode_production (float): Baked anode production, tonnes baked anode per year
        loaded_green_anodes (float): Weight of loaded green anodes, tonnes
        hydrogen_content (float): Hydrogen content in green anodes, weight percent
        waste_tar_collected (float): Waste tar collected, tonnes
        packing_coke_consumption (float): Packing coke consumption, tonnes coke/t BA
        sulphur_content_packing (float): Sulphur content of packing coke, weight percent
        ash_content_packing (float): Ash content of packing coke, weight percent
    
    Returns:
        dict: Contains 'volatile_matter_emissions', 'packing_coke_emissions', and 'total_emissions'
    """
    try:
        # Validate inputs
        inputs = [green_anode_weight, baked_anode_weight, baked_anode_production, 
                 loaded_green_anodes, hydrogen_content, waste_tar_collected,
                 packing_coke_consumption, sulphur_content_packing, ash_content_packing]
        
        if not all(isinstance(x, (int, float)) for x in inputs):
            raise ValueError("All inputs must be numeric values")
        
        if any(x < 0 for x in inputs):
            raise ValueError("All inputs must be non-negative")
        
        if baked_anode_weight == 0:
            raise ValueError("Baked anode weight cannot be zero")
        
        # Calculate anode baking weightloss factor
        weightloss_factor = green_anode_weight / baked_anode_weight if baked_anode_weight != 0 else 0
        
        # Calculate volatile matter emissions from pitch coking
        # Eco2 = [GA - (GAW / BAW) x BA] x H x 44/12
        volatile_matter_emissions = (loaded_green_anodes - (green_anode_weight / baked_anode_weight) * baked_anode_production) * (hydrogen_content / 100) * (44/12)
        
        # Calculate packing coke emissions
        # Additional CO2 from packing coke consumption
        packing_coke_carbon_content = (100 - sulphur_content_packing - ash_content_packing) / 100
        packing_coke_emissions = baked_anode_production * packing_coke_consumption * packing_coke_carbon_content * (44/12)
        
        # Total emissions
        total_emissions = volatile_matter_emissions + packing_coke_emissions
        
        return {
            'weightloss_factor': round(weightloss_factor, 3),
            'volatile_matter_emissions': round(volatile_matter_emissions, 2),
            'packing_coke_emissions': round(packing_coke_emissions, 2),
            'total_emissions': round(total_emissions, 2)
        }
        
    except Exception as e:
        frappe.log_error(f"Error in Part B calculation: {str(e)}", "Aluminium Calculations")
        raise frappe.ValidationError(f"Calculation error: {str(e)}")

def get_industry_typical_values():
    """
    Get industry typical values for reference
    
    Returns:
        dict: Contains typical values for both Part A and Part B
    """
    return {
        'part_a': {
            'metal_production': 1000,  # tonnes Al
            'net_anode_consumption': 0.42,  # t anode/t Al
            'sulphur_content': 2.0,  # wt%
            'ash_content': 0.4,  # wt%
            'expected_co2_emissions': 1503  # t CO2
        },
        'part_b': {
            'green_anode_weight': 1000,  # t
            'baked_anode_weight': 948,  # t
            'baked_anode_production': 475,  # t
            'loaded_green_anodes': 501,  # t
            'hydrogen_content': 0.5,  # wt%
            'waste_tar_collected': 0,  # t
            'packing_coke_consumption': 0.015,  # t coke/t BA
            'sulphur_content_packing': 2.0,  # wt%
            'ash_content_packing': 2.5,  # wt%
            'expected_co2_emissions': 111  # t CO2
        }
    }

@frappe.whitelist()
def calculate_aluminium_emissions(process_type, **kwargs):
    """
    Main API endpoint for calculating aluminium production emissions
    
    Args:
        process_type (str): 'part_a' or 'part_b'
        **kwargs: Process-specific parameters
    
    Returns:
        dict: Calculation results
    """
    try:
        if process_type == 'part_a':
            required_fields = ['metal_production', 'net_anode_consumption', 'sulphur_content', 'ash_content']
            missing_fields = [field for field in required_fields if field not in kwargs]
            if missing_fields:
                raise ValueError(f"Missing required fields for Part A: {', '.join(missing_fields)}")
            
            co2_emissions = calculate_part_a_emissions(
                float(kwargs['metal_production']),
                float(kwargs['net_anode_consumption']),
                float(kwargs['sulphur_content']),
                float(kwargs['ash_content'])
            )
            
            return {
                'success': True,
                'process_type': 'part_a',
                'co2_emissions': co2_emissions,
                'unit': 't CO2'
            }
            
        elif process_type == 'part_b':
            required_fields = ['green_anode_weight', 'baked_anode_weight', 'baked_anode_production',
                             'loaded_green_anodes', 'hydrogen_content', 'waste_tar_collected',
                             'packing_coke_consumption', 'sulphur_content_packing', 'ash_content_packing']
            missing_fields = [field for field in required_fields if field not in kwargs]
            if missing_fields:
                raise ValueError(f"Missing required fields for Part B: {', '.join(missing_fields)}")
            
            results = calculate_part_b_emissions(
                float(kwargs['green_anode_weight']),
                float(kwargs['baked_anode_weight']),
                float(kwargs['baked_anode_production']),
                float(kwargs['loaded_green_anodes']),
                float(kwargs['hydrogen_content']),
                float(kwargs['waste_tar_collected']),
                float(kwargs['packing_coke_consumption']),
                float(kwargs['sulphur_content_packing']),
                float(kwargs['ash_content_packing'])
            )
            
            return {
                'success': True,
                'process_type': 'part_b',
                'weightloss_factor': results['weightloss_factor'],
                'volatile_matter_emissions': results['volatile_matter_emissions'],
                'packing_coke_emissions': results['packing_coke_emissions'],
                'total_emissions': results['total_emissions'],
                'unit': 't CO2'
            }
        
        else:
            raise ValueError("Invalid process_type. Must be 'part_a' or 'part_b'")
            
    except Exception as e:
        frappe.log_error(f"Error in calculate_aluminium_emissions: {str(e)}", "Aluminium Calculations")
        return {
            'success': False,
            'error': str(e)
        }

@frappe.whitelist()
def get_typical_values():
    """Get industry typical values for reference"""
    return get_industry_typical_values()
