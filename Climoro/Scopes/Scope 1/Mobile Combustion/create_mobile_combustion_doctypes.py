# Fixed Python code to create both Mobile Combustion DocTypes
import frappe
import json

# First, define all functions
def create_mobile_combustion_fuel_method():
    """Create Mobile Combustion Fuel Method DocType"""
    
    doctype_data = {
        "name": "Mobile Combustion Fuel Method",
        "doctype": "DocType",
        "module": "Climoro Onboarding",
        "istable": 0,
        "issingle": 0,
        "istree": 0,
        "quick_entry": 1,
        "track_changes": 1,
        "allow_rename": 1,
        "allow_import": 1,
        "allow_export": 1,
        "allow_print": 1,
        "allow_email": 1,
        "allow_copy": 1,
        "editable_grid": 1,
        "engine": "InnoDB",
        "autoname": "naming_series:",
        "naming_rule": "By \"Naming Series\" field",
        "title_field": "vehicle_no",
        "search_fields": "vehicle_no,date,fuel_selection",
        "fields": [
            {
                "fieldname": "naming_series",
                "label": "Series",
                "fieldtype": "Select",
                "options": "MCFM-.YYYY.-",
                "default": "MCFM-.YYYY.-",
                "reqd": 1,
                "hidden": 1,
                "idx": 1
            },
            {
                "fieldname": "s_no",
                "label": "S.No",
                "fieldtype": "Int",
                "in_standard_filter": 1,
                "in_list_view": 1,
                "reqd": 1,
                "idx": 2
            },
            {
                "fieldname": "date",
                "label": "Date",
                "fieldtype": "Date",
                "in_standard_filter": 1,
                "in_list_view": 1,
                "reqd": 1,
                "default": "Today",
                "idx": 3
            },
            {
                "fieldname": "vehicle_no",
                "label": "Vehicle No",
                "fieldtype": "Data",
                "length": 20,
                "in_standard_filter": 1,
                "in_list_view": 1,
                "reqd": 1,
                "description": "Enter vehicle number (letters and numbers allowed, e.g. ABC1234, DL01AB1234)",
                "idx": 4
            },
            {
                "fieldname": "fuel_selection",
                "label": "Fuel Selection",
                "fieldtype": "Select",
                "options": "Petrol\nDiesel\nCNG / LNG\nLPG\nAviation fuel (Jet A, Jet A-1)\nMarine fuel oil\nBiodiesel or ethanol blends",
                "in_standard_filter": 1,
                "in_list_view": 1,
                "reqd": 1,
                "idx": 5
            },
            {
                "fieldname": "fuel_used",
                "label": "Fuel Used",
                "fieldtype": "Float",
                "precision": 2,
                "in_standard_filter": 1,
                "in_list_view": 1,
                "reqd": 1,
                "non_negative": 1,
                "idx": 6
            },
            {
                "fieldname": "unit_selection",
                "label": "Unit Selection",
                "fieldtype": "Select",
                "options": "KG\nTonnes",
                "in_standard_filter": 1,
                "in_list_view": 1,
                "reqd": 1,
                "idx": 7
            },
            {
                "fieldname": "section_break_1",
                "fieldtype": "Section Break",
                "label": "Emission Factors",
                "idx": 8
            },
            {
                "fieldname": "efco2",
                "label": "EFCO2",
                "fieldtype": "Float",
                "precision": 4,
                "in_standard_filter": 1,
                "reqd": 1,
                "non_negative": 1,
                "description": "Emission Factor for CO2",
                "idx": 9
            },
            {
                "fieldname": "efch4",
                "label": "EFCH4",
                "fieldtype": "Float",
                "precision": 4,
                "in_standard_filter": 1,
                "reqd": 1,
                "non_negative": 1,
                "description": "Emission Factor for CH4",
                "idx": 10
            },
            {
                "fieldname": "efn20",
                "label": "EFN20",
                "fieldtype": "Float",
                "precision": 4,
                "in_standard_filter": 1,
                "reqd": 1,
                "non_negative": 1,
                "description": "Emission Factor for N2O",
                "idx": 11
            },
            {
                "fieldname": "section_break_2",
                "fieldtype": "Section Break",
                "label": "Calculated Emissions",
                "collapsible": 1,
                "idx": 12
            },
            {
                "fieldname": "eco2",
                "label": "ECO2",
                "fieldtype": "Float",
                "precision": 2,
                "in_standard_filter": 1,
                "in_list_view": 1,
                "read_only": 1,
                "description": "Calculated CO2 Emission = Fuel Used × EFCO2",
                "idx": 13
            },
            {
                "fieldname": "ech4",
                "label": "ECH4",
                "fieldtype": "Float",
                "precision": 2,
                "in_standard_filter": 1,
                "in_list_view": 1,
                "read_only": 1,
                "description": "Calculated CH4 Emission = Fuel Used × EFCH4",
                "idx": 14
            },
            {
                "fieldname": "en20",
                "label": "EN20",
                "fieldtype": "Float",
                "precision": 2,
                "in_standard_filter": 1,
                "in_list_view": 1,
                "read_only": 1,
                "description": "Calculated N2O Emission = Fuel Used × EFN20",
                "idx": 15
            },
            {
                "fieldname": "etco2eq",
                "label": "ETCO2eq",
                "fieldtype": "Float",
                "precision": 2,
                "in_standard_filter": 1,
                "in_list_view": 1,
                "read_only": 1,
                "bold": 1,
                "description": "Total CO2 Equivalent = ECO2 + ECH4 + EN20",
                "idx": 16
            }
        ],
        "permissions": [
            {
                "role": "System Manager",
                "read": 1,
                "write": 1,
                "create": 1,
                "delete": 1,
                "submit": 0,
                "cancel": 0,
                "amend": 0,
                "report": 1,
                "export": 1,
                "share": 1,
                "print": 1,
                "email": 1
            },
            {
                "role": "All",
                "read": 1,
                "write": 1,
                "create": 1,
                "delete": 1,
                "submit": 0,
                "cancel": 0,
                "amend": 0,
                "report": 1,
                "export": 1,
                "share": 1,
                "print": 1,
                "email": 1
            }
        ]
    }
    
    try:
        if frappe.db.exists("DocType", "Mobile Combustion Fuel Method"):
            print("Mobile Combustion Fuel Method DocType already exists!")
            return False
        
        doc = frappe.new_doc("DocType")
        
        # Set basic properties
        for key, value in doctype_data.items():
            if key not in ["fields", "permissions"]:
                setattr(doc, key, value)
        
        # Add fields
        for field_data in doctype_data["fields"]:
            field = doc.append("fields", field_data)
        
        # Add permissions
        for perm_data in doctype_data["permissions"]:
            perm = doc.append("permissions", perm_data)
        
        doc.save(ignore_permissions=True)
        doc.create_table()
        
        print("✅ Mobile Combustion Fuel Method DocType created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating Mobile Combustion Fuel Method: {e}")
        return False

def create_mobile_combustion_transportation_method():
    """Create Mobile Combustion Transportation Method DocType"""
    
    doctype_data = {
        "name": "Mobile Combustion Transportation Method",
        "doctype": "DocType",
        "module": "Climoro Onboarding",
        "istable": 0,
        "issingle": 0,
        "istree": 0,
        "quick_entry": 1,
        "track_changes": 1,
        "allow_rename": 1,
        "allow_import": 1,
        "allow_export": 1,
        "allow_print": 1,
        "allow_email": 1,
        "allow_copy": 1,
        "editable_grid": 1,
        "engine": "InnoDB",
        "autoname": "naming_series:",
        "naming_rule": "By \"Naming Series\" field",
        "title_field": "vehicle_no",
        "search_fields": "vehicle_no,date,transportation_type",
        "fields": [
            {
                "fieldname": "naming_series",
                "label": "Series",
                "fieldtype": "Select",
                "options": "MCTM-.YYYY.-",
                "default": "MCTM-.YYYY.-",
                "reqd": 1,
                "hidden": 1,
                "idx": 1
            },
            {
                "fieldname": "s_no",
                "label": "S.No",
                "fieldtype": "Int",
                "in_standard_filter": 1,
                "in_list_view": 1,
                "reqd": 1,
                "idx": 2
            },
            {
                "fieldname": "date",
                "label": "Date",
                "fieldtype": "Date",
                "in_standard_filter": 1,
                "in_list_view": 1,
                "reqd": 1,
                "default": "Today",
                "idx": 3
            },
            {
                "fieldname": "vehicle_no",
                "label": "Vehicle No",
                "fieldtype": "Data",
                "length": 20,
                "in_standard_filter": 1,
                "in_list_view": 1,
                "reqd": 1,
                "description": "Enter vehicle number (letters and numbers allowed, e.g. ABC1234, DL01AB1234)",
                "idx": 4
            },
            {
                "fieldname": "transportation_type",
                "label": "Transportation Type",
                "fieldtype": "Select",
                "options": "On-Road Transport\nOff-Road Transport & Equipment\nRail Transport\nMarine Transport\nAviation (Owned Aircraft)\nMobile Generators / Temporary Engines",
                "in_standard_filter": 1,
                "in_list_view": 1,
                "reqd": 1,
                "idx": 5
            },
            {
                "fieldname": "distance_traveled",
                "label": "Distance Traveled",
                "fieldtype": "Float",
                "precision": 2,
                "in_standard_filter": 1,
                "in_list_view": 1,
                "reqd": 1,
                "non_negative": 1,
                "idx": 6
            },
            {
                "fieldname": "unit_selection",
                "label": "Unit Selection",
                "fieldtype": "Select",
                "options": "KM\nMiles\nNautical Miles\nETC",
                "in_standard_filter": 1,
                "in_list_view": 1,
                "reqd": 1,
                "idx": 7
            },
            {
                "fieldname": "section_break_1",
                "fieldtype": "Section Break",
                "label": "Emission Factors",
                "idx": 8
            },
            {
                "fieldname": "efco2",
                "label": "EFCO2",
                "fieldtype": "Float",
                "precision": 4,
                "in_standard_filter": 1,
                "reqd": 1,
                "non_negative": 1,
                "description": "Emission Factor for CO2",
                "idx": 9
            },
            {
                "fieldname": "efch4",
                "label": "EFCH4",
                "fieldtype": "Float",
                "precision": 4,
                "in_standard_filter": 1,
                "reqd": 1,
                "non_negative": 1,
                "description": "Emission Factor for CH4",
                "idx": 10
            },
            {
                "fieldname": "efn20",
                "label": "EFN20",
                "fieldtype": "Float",
                "precision": 4,
                "in_standard_filter": 1,
                "reqd": 1,
                "non_negative": 1,
                "description": "Emission Factor for N2O",
                "idx": 11
            },
            {
                "fieldname": "section_break_2",
                "fieldtype": "Section Break",
                "label": "Calculated Emissions",
                "collapsible": 1,
                "description": "Note: Average transport constant = 10 is used for calculations",
                "idx": 12
            },
            {
                "fieldname": "eco2",
                "label": "ECO2",
                "fieldtype": "Float",
                "precision": 2,
                "in_standard_filter": 1,
                "in_list_view": 1,
                "read_only": 1,
                "description": "Calculated CO2 Emission = (Distance Traveled / 10) × EFCO2",
                "idx": 13
            },
            {
                "fieldname": "ech4",
                "label": "ECH4",
                "fieldtype": "Float",
                "precision": 2,
                "in_standard_filter": 1,
                "in_list_view": 1,
                "read_only": 1,
                "description": "Calculated CH4 Emission = (Distance Traveled / 10) × EFCH4",
                "idx": 14
            },
            {
                "fieldname": "en20",
                "label": "EN20",
                "fieldtype": "Float",
                "precision": 2,
                "in_standard_filter": 1,
                "in_list_view": 1,
                "read_only": 1,
                "description": "Calculated N2O Emission = (Distance Traveled / 10) × EFN20",
                "idx": 15
            },
            {
                "fieldname": "etco2eq",
                "label": "ETCO2eq",
                "fieldtype": "Float",
                "precision": 2,
                "in_standard_filter": 1,
                "in_list_view": 1,
                "read_only": 1,
                "bold": 1,
                "description": "Total CO2 Equivalent = ECO2 + ECH4 + EN20",
                "idx": 16
            }
        ],
        "permissions": [
            {
                "role": "System Manager",
                "read": 1,
                "write": 1,
                "create": 1,
                "delete": 1,
                "submit": 0,
                "cancel": 0,
                "amend": 0,
                "report": 1,
                "export": 1,
                "share": 1,
                "print": 1,
                "email": 1
            },
            {
                "role": "All",
                "read": 1,
                "write": 1,
                "create": 1,
                "delete": 1,
                "submit": 0,
                "cancel": 0,
                "amend": 0,
                "report": 1,
                "export": 1,
                "share": 1,
                "print": 1,
                "email": 1
            }
        ]
    }
    
    try:
        if frappe.db.exists("DocType", "Mobile Combustion Transportation Method"):
            print("Mobile Combustion Transportation Method DocType already exists!")
            return False
        
        doc = frappe.new_doc("DocType")
        
        # Set basic properties
        for key, value in doctype_data.items():
            if key not in ["fields", "permissions"]:
                setattr(doc, key, value)
        
        # Add fields
        for field_data in doctype_data["fields"]:
            field = doc.append("fields", field_data)
        
        # Add permissions
        for perm_data in doctype_data["permissions"]:
            perm = doc.append("permissions", perm_data)
        
        doc.save(ignore_permissions=True)
        doc.create_table()
        
        print("✅ Mobile Combustion Transportation Method DocType created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating Mobile Combustion Transportation Method: {e}")
        return False

def create_client_scripts():
    """Create client scripts for automatic calculations and UI enhancements"""
    
    # Client script for Fuel Method calculations
    fuel_script = '''
frappe.ui.form.on('Mobile Combustion Fuel Method', {
    fuel_used: function(frm) {
        calculate_fuel_emissions(frm);
    },
    efco2: function(frm) {
        calculate_fuel_emissions(frm);
    },
    efch4: function(frm) {
        calculate_fuel_emissions(frm);
    },
    efn20: function(frm) {
        calculate_fuel_emissions(frm);
    }
});

function calculate_fuel_emissions(frm) {
    var fuel_used = frm.doc.fuel_used || 0;
    var efco2 = frm.doc.efco2 || 0;
    var efch4 = frm.doc.efch4 || 0;
    var efn20 = frm.doc.efn20 || 0;
    
    // Calculate emissions: E = Fuel Used × EF
    var eco2 = fuel_used * efco2;
    var ech4 = fuel_used * efch4;
    var en20 = fuel_used * efn20;
    var etco2eq = eco2 + ech4 + en20;
    
    frm.set_value('eco2', eco2);
    frm.set_value('ech4', ech4);
    frm.set_value('en20', en20);
    frm.set_value('etco2eq', etco2eq);
}
'''
    
    # Client script for Transportation Method calculations
    transport_script = '''
frappe.ui.form.on('Mobile Combustion Transportation Method', {
    distance_traveled: function(frm) {
        calculate_transport_emissions(frm);
    },
    efco2: function(frm) {
        calculate_transport_emissions(frm);
    },
    efch4: function(frm) {
        calculate_transport_emissions(frm);
    },
    efn20: function(frm) {
        calculate_transport_emissions(frm);
    }
});

function calculate_transport_emissions(frm) {
    var distance = frm.doc.distance_traveled || 0;
    var efco2 = frm.doc.efco2 || 0;
    var efch4 = frm.doc.efch4 || 0;
    var efn20 = frm.doc.efn20 || 0;
    
    // Calculate emissions: E = (Distance / 10) × EF
    var avg_transport_constant = 10;
    var eco2 = (distance / avg_transport_constant) * efco2;
    var ech4 = (distance / avg_transport_constant) * efch4;
    var en20 = (distance / avg_transport_constant) * efn20;
    var etco2eq = eco2 + ech4 + en20;
    
    frm.set_value('eco2', eco2);
    frm.set_value('ech4', ech4);
    frm.set_value('en20', en20);
    frm.set_value('etco2eq', etco2eq);
}
'''
    
    try:
        # Create Fuel Method client script
        if not frappe.db.exists("Client Script", {"name": "Mobile Combustion Fuel Method Auto Calculate"}):
            fuel_client_script = frappe.new_doc("Client Script")
            fuel_client_script.name = "Mobile Combustion Fuel Method Auto Calculate"
            fuel_client_script.dt = "Mobile Combustion Fuel Method"
            fuel_client_script.view = "Form"
            fuel_client_script.script = fuel_script
            fuel_client_script.enabled = 1
            fuel_client_script.save(ignore_permissions=True)
            print("✅ Fuel Method client script created")
        
        # Create Transportation Method client script
        if not frappe.db.exists("Client Script", {"name": "Mobile Combustion Transportation Method Auto Calculate"}):
            transport_client_script = frappe.new_doc("Client Script")
            transport_client_script.name = "Mobile Combustion Transportation Method Auto Calculate"
            transport_client_script.dt = "Mobile Combustion Transportation Method"
            transport_client_script.view = "Form"
            transport_client_script.script = transport_script
            transport_client_script.enabled = 1
            transport_client_script.save(ignore_permissions=True)
            print("✅ Transportation Method client script created")
            
        return True
        
    except Exception as e:
        print(f"❌ Error creating client scripts: {e}")
        return False

def create_sample_data():
    """Create sample data for testing"""
    try:
        # Sample Fuel Method data
        if not frappe.db.exists("Mobile Combustion Fuel Method", {"vehicle_no": "ABC1234"}):
            fuel_sample = frappe.new_doc("Mobile Combustion Fuel Method")
            fuel_sample.s_no = 1
            fuel_sample.date = "2024-01-15"
            fuel_sample.vehicle_no = "ABC1234"
            fuel_sample.fuel_selection = "Petrol"
            fuel_sample.fuel_used = 50.0
            fuel_sample.unit_selection = "KG"
            fuel_sample.efco2 = 2.31
            fuel_sample.efch4 = 0.003
            fuel_sample.efn20 = 0.0003
            fuel_sample.eco2 = 115.5
            fuel_sample.ech4 = 0.15
            fuel_sample.en20 = 0.015
            fuel_sample.etco2eq = 115.665
            fuel_sample.save(ignore_permissions=True)
            print("✅ Sample fuel method data created")
        
        # Sample Transportation Method data
        if not frappe.db.exists("Mobile Combustion Transportation Method", {"vehicle_no": "XYZ789"}):
            transport_sample = frappe.new_doc("Mobile Combustion Transportation Method")
            transport_sample.s_no = 1
            transport_sample.date = "2024-01-15"
            transport_sample.vehicle_no = "XYZ789"
            transport_sample.transportation_type = "On-Road Transport"
            transport_sample.distance_traveled = 100.0
            transport_sample.unit_selection = "KM"
            transport_sample.efco2 = 0.21
            transport_sample.efch4 = 0.0001
            transport_sample.efn20 = 0.00001
            transport_sample.eco2 = 2.1
            transport_sample.ech4 = 0.001
            transport_sample.en20 = 0.0001
            transport_sample.etco2eq = 2.1011
            transport_sample.save(ignore_permissions=True)
            print("✅ Sample transportation method data created")
            
        return True
        
    except Exception as e:
        print(f"⚠️  Error creating sample data: {e}")
        return False

# Now execute the script immediately
print("CREATING MOBILE COMBUSTION DOCTYPES")
print("=" * 60)

try:
    # Create both doctypes
    print("\n1. Creating Mobile Combustion Fuel Method DocType...")
    fuel_success = create_mobile_combustion_fuel_method()
    
    print("\n2. Creating Mobile Combustion Transportation Method DocType...")
    transport_success = create_mobile_combustion_transportation_method()
    
    print("\n3. Creating client scripts for automatic calculations...")
    scripts_success = create_client_scripts()
    
    print("\n4. Creating sample data...")
    sample_success = create_sample_data()
    
    # Summary
    print("\n" + "=" * 60)
    print("CREATION SUMMARY:")
    print(f"✅ Fuel Method DocType: {'Created' if fuel_success else 'Exists/Failed'}")
    print(f"✅ Transportation Method DocType: {'Created' if transport_success else 'Exists/Failed'}")
    print(f"✅ Client Scripts: {'Created' if scripts_success else 'Failed'}")
    print(f"✅ Sample Data: {'Created' if sample_success else 'Failed'}")
    
    if fuel_success or transport_success:
        print("\n📋 DOCTYPE FEATURES:")
        print("🔹 Vehicle Number: Data type (accepts alphanumeric input like ABC1234)")
        print("🔹 Automatic Calculations: Client scripts for emission calculations")
        print("🔹 Dropdown Options: Updated with your Google Sheets values")
        print("🔹 Validation: Non-negative values for quantities and factors")
        print("🔹 Search: Vehicle number, date, and type fields are searchable")
        
        print("\n🔧 FIELD CONFIGURATIONS:")
        print("Fuel Method:")
        print("  - Fuel Selection: Petrol, Diesel, CNG/LNG, LPG, Aviation fuel, Marine fuel oil, Biodiesel")
        print("  - Unit Selection: KG, Tonnes")
        print("  - Formula: E = Fuel Used × Emission Factor")
        
        print("\nTransportation Method:")
        print("  - Transportation Type: On-Road, Off-Road, Rail, Marine, Aviation, Mobile Generators")
        print("  - Unit Selection: KM, Miles, Nautical Miles, ETC")
        print("  - Formula: E = (Distance / 10) × Emission Factor")
        
        print("\n🚀 NEXT STEPS:")
        print("1. Refresh your browser")
        print("2. Go to DocType list to see the new doctypes")
        print("3. Test creating records with alphanumeric vehicle numbers")
        print("4. Use the custom block HTML and JavaScript for the interface")
        
    print("\n✅ SETUP COMPLETE!")
    
except Exception as e:
    print(f"\n❌ MAIN EXECUTION ERROR: {e}")
    import traceback
    traceback.print_exc()