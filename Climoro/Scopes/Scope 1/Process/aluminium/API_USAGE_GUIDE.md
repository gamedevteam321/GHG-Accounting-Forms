# Aluminium Production CO2 Emissions Calculation API Usage Guide

## Overview
This API provides calculation functions for CO2 emissions from aluminium production processes, specifically for prebake anode electrolysis and green anode baking furnace processes.

## API Endpoints

### 1. Calculate Aluminium Emissions (Main Endpoint)
**Method:** `calculate_aluminium_emissions`  
**Description:** Main API endpoint for calculating aluminium production emissions

#### Parameters
- `process_type` (string): Either 'part_a' or 'part_b'
- Additional parameters depend on the process type (see below)

#### Usage Examples

##### Part A: Prebake Anode Electrolysis Cells
```python
# Using frappe.call from JavaScript
frappe.call({
    method: 'aluminium_calculations.calculate_aluminium_emissions',
    args: {
        process_type: 'part_a',
        metal_production: 1000,        # tonnes Al
        net_anode_consumption: 0.42,   # t anode/t Al
        sulphur_content: 2.0,          # wt%
        ash_content: 0.4               # wt%
    },
    callback: function(response) {
        console.log('CO2 Emissions:', response.message.co2_emissions);
    }
});
```

##### Part B: Green Anode Baking Furnace
```python
# Using frappe.call from JavaScript
frappe.call({
    method: 'aluminium_calculations.calculate_aluminium_emissions',
    args: {
        process_type: 'part_b',
        green_anode_weight: 1000,           # t
        baked_anode_weight: 948,            # t
        baked_anode_production: 475,        # t
        loaded_green_anodes: 501,           # t
        hydrogen_content: 0.5,              # wt%
        waste_tar_collected: 0,             # t
        packing_coke_consumption: 0.015,    # t coke/t BA
        sulphur_content_packing: 2.0,       # wt%
        ash_content_packing: 2.5            # wt%
    },
    callback: function(response) {
        console.log('Total CO2 Emissions:', response.message.total_emissions);
        console.log('Weightloss Factor:', response.message.weightloss_factor);
    }
});
```

### 2. Get Industry Typical Values
**Method:** `get_typical_values`  
**Description:** Returns industry typical values for reference

```python
# Using frappe.call from JavaScript
frappe.call({
    method: 'aluminium_calculations.get_typical_values',
    callback: function(response) {
        console.log('Typical values:', response.message);
    }
});
```

## Direct Python Function Usage

### Part A Calculation
```python
from aluminium_calculations import calculate_part_a_emissions

# Calculate CO2 emissions for Part A
co2_emissions = calculate_part_a_emissions(
    metal_production=1000,        # tonnes Al
    net_anode_consumption=0.42,   # t anode/t Al
    sulphur_content=2.0,          # wt%
    ash_content=0.4               # wt%
)

print(f"CO2 Emissions: {co2_emissions} t CO2")
```

### Part B Calculation
```python
from aluminium_calculations import calculate_part_b_emissions

# Calculate CO2 emissions for Part B
results = calculate_part_b_emissions(
    green_anode_weight=1000,           # t
    baked_anode_weight=948,            # t
    baked_anode_production=475,        # t
    loaded_green_anodes=501,           # t
    hydrogen_content=0.5,              # wt%
    waste_tar_collected=0,             # t
    packing_coke_consumption=0.015,    # t coke/t BA
    sulphur_content_packing=2.0,       # wt%
    ash_content_packing=2.5            # wt%
)

print(f"Weightloss Factor: {results['weightloss_factor']}")
print(f"Volatile Matter Emissions: {results['volatile_matter_emissions']} t CO2")
print(f"Packing Coke Emissions: {results['packing_coke_emissions']} t CO2")
print(f"Total CO2 Emissions: {results['total_emissions']} t CO2")
```

## Response Format

### Part A Response
```json
{
    "success": true,
    "process_type": "part_a",
    "co2_emissions": 1503.0,
    "unit": "t CO2"
}
```

### Part B Response
```json
{
    "success": true,
    "process_type": "part_b",
    "weightloss_factor": 1.055,
    "volatile_matter_emissions": 95.5,
    "packing_coke_emissions": 15.5,
    "total_emissions": 111.0,
    "unit": "t CO2"
}
```

### Error Response
```json
{
    "success": false,
    "error": "Error message describing what went wrong"
}
```

## Formulas Used

### Part A: Prebake Anode Electrolysis Cells
```
Eco2 = [MP × NAC × (100 - S - Ash) / 100] × 44/12
```

Where:
- `Eco2`: CO2 emissions in tonnes per year
- `MP`: Total metal production, tonnes aluminium per year
- `NAC`: Net anode consumption, tonnes per tonne aluminium
- `S`: Sulphur content in baked anodes, wt %
- `Ash`: Ash content in baked anodes, wt %
- `44/12`: CO2 Molecular Mass : Carbon Atomic Mass Ratio, dimensionless

### Part B: Green Anode Baking Furnace
```
Eco2 = [GA - (GAW / BAW) × BA] × H × 44/12 + Packing Coke Emissions
```

Where:
- `Eco2`: CO2 emissions in tonnes per year
- `GA`: Initial weight of green anodes, tonnes green anode per year
- `GAW`: Green anode weight, tonnes
- `BAW`: Baked anode weight, tonnes
- `BA`: Baked anode production, tonnes baked anode per year
- `H`: Hydrogen content in green anodes, wt %
- `WT`: Waste tar collected, tonnes
- `44/12`: CO2 Molecular Mass : Carbon Atomic Mass Ratio, dimensionless

## Input Validation

The API includes comprehensive input validation:

1. **Numeric Validation**: All inputs must be numeric values
2. **Range Validation**: 
   - Metal production and net anode consumption must be positive
   - Sulphur and ash content must be non-negative
   - Combined sulphur and ash content cannot exceed 100%
3. **Zero Division Protection**: Baked anode weight cannot be zero for Part B calculations

## Error Handling

The API provides detailed error messages for:
- Missing required fields
- Invalid data types
- Out-of-range values
- Mathematical errors (e.g., division by zero)

## Integration Steps

### 1. Import the Module
```python
# In your Frappe app
from aluminium_calculations import calculate_aluminium_emissions
```

### 2. Create API Method
```python
# In your app's api.py
@frappe.whitelist()
def calculate_emissions(process_type, **kwargs):
    return calculate_aluminium_emissions(process_type, **kwargs)
```

### 3. Call from Frontend
```javascript
// In your JavaScript
frappe.call({
    method: 'your_app.api.calculate_emissions',
    args: {
        process_type: 'part_a',
        // ... other parameters
    },
    callback: function(response) {
        // Handle response
    }
});
```

## Testing

### Test with Industry Typical Values
```python
from aluminium_calculations import get_industry_typical_values

# Get typical values
typical = get_industry_typical_values()

# Test Part A
part_a_result = calculate_part_a_emissions(
    typical['part_a']['metal_production'],
    typical['part_a']['net_anode_consumption'],
    typical['part_a']['sulphur_content'],
    typical['part_a']['ash_content']
)

print(f"Expected: {typical['part_a']['expected_co2_emissions']}")
print(f"Calculated: {part_a_result}")
```

## Notes

1. All calculations return values rounded to 2 decimal places
2. The API logs errors to Frappe's error log for debugging
3. Input validation prevents invalid calculations
4. The API is designed to be called from both Python and JavaScript contexts
5. All units are clearly documented in the parameter descriptions
