import frappe

def create_master_doctype():
    """Creates the Mobile Combustion EF Master DocType."""
    doctype_name = "Mobile Combustion EF Master"
    if frappe.db.exists("DocType", doctype_name):
        print(f"✓ DocType '{doctype_name}' already exists.")
        return

    print(f"Creating DocType '{doctype_name}'...")
    doc = frappe.new_doc("DocType")
    doc.name = doctype_name
    doc.module = "Climoro Onboarding"
    doc.custom = 1
    doc.engine = "InnoDB"
    doc.autoname = "naming_series:"
    doc.title_field = "vehicle_category"
    doc.search_fields = "vehicle_category,fuel_type,region,calculation_method"
    fields = [
        {"fieldname": "naming_series", "label": "Series", "fieldtype": "Select", "options": "MCEF-.#####", "default": "MCEF-.#####", "reqd": 1, "hidden": 1},
        {"fieldname": "calculation_method", "label": "Calculation Method", "fieldtype": "Select", "options": "Fuel-Based\nDistance-Based", "reqd": 1, "in_list_view": 1},
        {"fieldname": "region", "label": "Region", "fieldtype": "Select", "options": "US\nUK\nOther", "reqd": 1, "in_list_view": 1},
        {"fieldname": "vehicle_category", "label": "Vehicle Category", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
        {"fieldname": "vehicle_sub_category_1", "label": "Vehicle Sub-Category 1", "fieldtype": "Data"},
        {"fieldname": "vehicle_sub_category_2", "label": "Vehicle Sub-Category 2", "fieldtype": "Data"},
        {"fieldname": "fuel_type", "label": "Fuel Type", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
        {"fieldname": "ef_co2", "label": "EF CO2", "fieldtype": "Float", "precision": 6},
        {"fieldname": "ef_ch4", "label": "EF CH4", "fieldtype": "Float", "precision": 6},
        {"fieldname": "ef_n2o", "label": "EF N2O", "fieldtype": "Float", "precision": 6},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "reqd": 1},
    ]
    for field_def in fields:
        doc.append("fields", field_def)
    doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1})
    doc.append("permissions", {"role": "All", "read": 1})
    doc.insert(ignore_permissions=True)
    print(f"✓ DocType '{doctype_name}' created successfully.")

def populate_master_data():
    """Populates the Mobile Combustion EF Master DocType with data."""
    doctype_name = "Mobile Combustion EF Master"
    print(f"Populating data in '{doctype_name}'...")
    
    # Combined data from both PDFs
    all_data = [
        {"method": "Distance-Based", "region": "Other", "category": "Bus", "fuel": "Methanol", "ch4": 0.401, "n2o": 0.135, "unit": "g/km"},
        {"method": "Distance-Based", "region": "Other", "category": "Bus", "fuel": "CNG", "ch4": 7.715, "n2o": 0.101, "unit": "g/km"},
        {"method": "Distance-Based", "region": "Other", "category": "Bus", "fuel": "Ethanol", "ch4": 1.292, "n2o": 0.226, "unit": "g/km"},
        {"method": "Distance-Based", "region": "Other", "category": "Light Duty Vehicles", "fuel": "LPG", "ch4": 0.024, "n2o": 0.005, "unit": "g/km"},
        {"method": "Distance-Based", "region": "Other", "category": "Heavy Duty Vehicles", "fuel": "CNG", "ch4": 5.983, "n2o": 0.185, "unit": "g/km"},
        {"method": "Distance-Based", "region": "UK", "category": "Passenger Car", "sub1": "Small car, <1.4 litre", "fuel": "Petrol", "co2": 0.140, "ch4": 0.0128, "n2o": 0.0012, "unit": "kg/km for CO2, g/km for others"},
        {"method": "Distance-Based", "region": "UK", "category": "Passenger Car", "sub1": "Average car", "fuel": "Diesel", "co2": 0.168, "ch4": 0.00017, "n2o": 0.0063, "unit": "kg/km for CO2, g/km for others"},
        {"method": "Distance-Based", "region": "UK", "category": "Vans", "sub1": "Average (up to 3.5 tonnes)", "fuel": "Diesel", "co2": 0.230, "ch4": 0, "n2o": 0.0062, "unit": "kg/km for CO2, g/km for others"},
        {"method": "Distance-Based", "region": "UK", "category": "HGV - Rigid", "sub1": ">17 tonnes", "sub2": "Average Laden", "fuel": "Diesel", "co2": 0.964, "ch4": 0.008, "n2o": 0.0400, "unit": "kg/km for CO2, g/km for others"},
        {"method": "Distance-Based", "region": "US", "category": "Passenger Car", "sub1": "1994", "fuel": "Gasoline", "ch4": 0.062, "n2o": 0.0603, "unit": "g/mile"},
        {"method": "Distance-Based", "region": "US", "category": "Passenger Car", "sub1": "2021", "fuel": "Gasoline", "ch4": 0.0051, "n2o": 0.0014, "unit": "g/mile"},
        {"method": "Distance-Based", "region": "US", "category": "Light-Duty Trucks", "sub1": "2021", "fuel": "Gasoline", "ch4": 0.0079, "n2o": 0.0012, "unit": "g/mile"},
        {"method": "Fuel-Based", "region": "Other", "category": "General", "fuel": "Jet Kerosene", "co2": 2.57, "unit": "kg/L"},
        {"method": "Fuel-Based", "region": "Other", "category": "General", "fuel": "Motor Gasoline/Petrol", "co2": 2.29, "unit": "kg/L"},
        {"method": "Fuel-Based", "region": "Other", "category": "General", "fuel": "Compressed Natural Gas (CNG)", "co2": 1.88, "unit": "kg/m³"},
        {"method": "Fuel-Based", "region": "US", "category": "General", "fuel": "Diesel Fuel", "co2": 10.21, "unit": "kg/US Gallon"},
        {"method": "Fuel-Based", "region": "UK", "category": "General", "fuel": "Diesel (100% mineral diesel)", "co2": 2.626, "unit": "kg/L"},
        {"method": "Fuel-Based", "region": "Other", "category": "Rail", "fuel": "Diesel", "ch4": 4.15, "n2o": 28.6, "unit": "kg/TJ"},
        {"method": "Fuel-Based", "region": "US", "category": "Ship and Boat", "fuel": "Diesel Fuel", "ch4": 6.41, "n2o": 0.17, "unit": "g/US Gallon"},
    ]

    for item in all_data:
        filters = { "calculation_method": item["method"], "region": item["region"], "vehicle_category": item["category"], "fuel_type": item["fuel"], "vehicle_sub_category_1": item.get("sub1", ""), "vehicle_sub_category_2": item.get("sub2", "") }
        if not frappe.db.exists(doctype_name, filters):
            doc = frappe.new_doc(doctype_name)
            doc.naming_series = "MCEF-.#####"
            doc.calculation_method = item["method"]
            doc.region = item["region"]
            doc.vehicle_category = item["category"]
            doc.fuel_type = item["fuel"]
            doc.vehicle_sub_category_1 = item.get("sub1", "")
            doc.vehicle_sub_category_2 = item.get("sub2", "")
            doc.ef_co2 = item.get("co2", 0)
            doc.ef_ch4 = item.get("ch4", 0)
            doc.ef_n2o = item.get("n2o", 0)
            doc.ef_unit = item["unit"]
            doc.insert(ignore_permissions=True)
            print(f"  ✓ Inserted: {item['category']} - {item['fuel']}")
        else:
            print(f"  - Skipped (already exists): {item['category']} - {item['fuel']}")

def create_data_entry_doctypes():
    """Creates the two DocTypes for user data entry."""
    # Definition for Mobile Combustion Fuel Method
    fuel_method_def = {
        "name": "Mobile Combustion Fuel Method", "module": "Climoro Onboarding", "autoname": "naming_series:",
        "fields": [
            {"fieldname": "naming_series", "label": "Series", "fieldtype": "Select", "options": "MCFM-.YYYY.-", "default": "MCFM-.YYYY.-", "reqd": 1, "hidden": 1},
            {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "in_list_view": 1, "reqd": 1},
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "in_list_view": 1, "reqd": 1, "default": "Today"},
            {"fieldname": "vehicle_no", "label": "Vehicle No", "fieldtype": "Data", "in_list_view": 1, "reqd": 1},
            {"fieldname": "fuel_selection", "label": "Fuel Selection", "fieldtype": "Select", "options": "Petrol\nDiesel\nCNG / LNG\nLPG\nAviation fuel (Jet A, Jet A-1)\nMarine fuel oil\nBiodiesel or ethanol blends", "in_list_view": 1, "reqd": 1},
            {"fieldname": "fuel_used", "label": "Fuel Used", "fieldtype": "Float", "in_list_view": 1, "reqd": 1},
            {"fieldname": "unit_selection", "label": "Unit Selection", "fieldtype": "Select", "options": "KG\nTonnes", "in_list_view": 1, "reqd": 1},
            {"fieldname": "efco2", "label": "EFCO2", "fieldtype": "Float", "precision": 4},
            {"fieldname": "efch4", "label": "EFCH4", "fieldtype": "Float", "precision": 4},
            {"fieldname": "efn20", "label": "EFN20", "fieldtype": "Float", "precision": 4},
            {"fieldname": "eco2", "label": "ECO2", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "ech4", "label": "ECH4", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "en20", "label": "EN20", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "etco2eq", "label": "ETCO2eq", "fieldtype": "Float", "read_only": 1, "in_list_view": 1}
        ]
    }

    # Definition for Mobile Combustion Transportation Method
    transport_method_def = {
        "name": "Mobile Combustion Transportation Method", "module": "Climoro Onboarding", "autoname": "naming_series:",
        "fields": [
            {"fieldname": "naming_series", "label": "Series", "fieldtype": "Select", "options": "MCTM-.YYYY.-", "default": "MCTM-.YYYY.-", "reqd": 1, "hidden": 1},
            {"fieldname": "s_no", "label": "S.No", "fieldtype": "Int", "in_list_view": 1, "reqd": 1},
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "in_list_view": 1, "reqd": 1, "default": "Today"},
            {"fieldname": "vehicle_no", "label": "Vehicle No", "fieldtype": "Data", "in_list_view": 1, "reqd": 1},
            {"fieldname": "transportation_type", "label": "Transportation Type", "fieldtype": "Select", "options": "On-Road Transport\nOff-Road Transport & Equipment\nRail Transport\nMarine Transport\nAviation (Owned Aircraft)\nMobile Generators / Temporary Engines", "in_list_view": 1, "reqd": 1},
            {"fieldname": "distance_traveled", "label": "Distance Traveled", "fieldtype": "Float", "in_list_view": 1, "reqd": 1},
            {"fieldname": "unit_selection", "label": "Unit Selection", "fieldtype": "Select", "options": "KM\nMiles\nNautical Miles\nETC", "in_list_view": 1, "reqd": 1},
            {"fieldname": "efco2", "label": "EFCO2", "fieldtype": "Float", "precision": 4},
            {"fieldname": "efch4", "label": "EFCH4", "fieldtype": "Float", "precision": 4},
            {"fieldname": "efn20", "label": "EFN20", "fieldtype": "Float", "precision": 4},
            {"fieldname": "eco2", "label": "ECO2", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "ech4", "label": "ECH4", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "en20", "label": "EN20", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "etco2eq", "label": "ETCO2eq", "fieldtype": "Float", "read_only": 1, "in_list_view": 1}
        ]
    }
    
    for doctype_def in [fuel_method_def, transport_method_def]:
        doctype_name = doctype_def["name"]
        if frappe.db.exists("DocType", doctype_name):
            print(f"✓ DocType '{doctype_name}' already exists.")
            continue
        
        print(f"Creating DocType '{doctype_name}'...")
        doc = frappe.new_doc("DocType")
        doc.name = doctype_name
        doc.module = doctype_def["module"]
        doc.autoname = doctype_def["autoname"]
        for field in doctype_def["fields"]:
            doc.append("fields", field)
        doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1})
        doc.append("permissions", {"role": "All", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1})
        doc.insert(ignore_permissions=True)
        print(f"✓ DocType '{doctype_name}' created successfully.")

def create_client_scripts():
    """Creates client scripts for automatic calculations."""
    print("Creating Client Scripts...")

    # Client script for Fuel Method
    fuel_script_name = "Mobile Combustion Fuel Method Auto-Calc"
    if not frappe.db.exists("Client Script", fuel_script_name):
        frappe.get_doc({
            "doctype": "Client Script",
            "name": fuel_script_name,
            "dt": "Mobile Combustion Fuel Method",
            "script": """
frappe.ui.form.on('Mobile Combustion Fuel Method', {
    refresh(frm) {
        frm.trigger('fuel_used');
    },
    fuel_used(frm) {
        calculate_emissions(frm);
    },
    efco2(frm) {
        calculate_emissions(frm);
    },
    efch4(frm) {
        calculate_emissions(frm);
    },
    efn20(frm) {
        calculate_emissions(frm);
    }
});

function calculate_emissions(frm) {
    if (!frm.doc.fuel_used || !frm.doc.efco2) return;
    let eco2 = frm.doc.fuel_used * frm.doc.efco2;
    let ech4 = frm.doc.fuel_used * frm.doc.efch4;
    let en20 = frm.doc.fuel_used * frm.doc.efn20;
    frm.set_value('eco2', eco2);
    frm.set_value('ech4', ech4);
    frm.set_value('en20', en20);
    frm.set_value('etco2eq', eco2 + (ech4 * 25) + (en20 * 298));
}
            """
        }).insert(ignore_permissions=True)
        print("✓ Client Script for Fuel Method created.")
    else:
        print("✓ Client Script for Fuel Method already exists.")

    # Client script for Transportation Method
    transport_script_name = "Mobile Combustion Transport Auto-Calc"
    if not frappe.db.exists("Client Script", transport_script_name):
        frappe.get_doc({
            "doctype": "Client Script",
            "name": transport_script_name,
            "dt": "Mobile Combustion Transportation Method",
            "script": """
frappe.ui.form.on('Mobile Combustion Transportation Method', {
    refresh(frm) {
        frm.trigger('distance_traveled');
    },
    distance_traveled(frm) {
        calculate_emissions(frm);
    },
    efco2(frm) {
        calculate_emissions(frm);
    },
    efch4(frm) {
        calculate_emissions(frm);
    },
    efn20(frm) {
        calculate_emissions(frm);
    }
});

function calculate_emissions(frm) {
    if (!frm.doc.distance_traveled || !frm.doc.efco2) return;
    const AVG_TRANSPORT_CONST = 10;
    let eco2 = (frm.doc.distance_traveled / AVG_TRANSPORT_CONST) * frm.doc.efco2;
    let ech4 = (frm.doc.distance_traveled / AVG_TRANSPORT_CONST) * frm.doc.efch4;
    let en20 = (frm.doc.distance_traveled / AVG_TRANSPORT_CONST) * frm.doc.efn20;
    frm.set_value('eco2', eco2);
    frm.set_value('ech4', ech4);
    frm.set_value('en20', en20);
    frm.set_value('etco2eq', eco2 + (ech4 * 25) + (en20 * 298));
}
            """
        }).insert(ignore_permissions=True)
        print("✓ Client Script for Transportation Method created.")
    else:
        print("✓ Client Script for Transportation Method already exists.")


# --- Main Execution Block ---
try:
    print("--- Starting Full Mobile Combustion Setup ---")
    create_master_doctype()
    populate_master_data()
    create_data_entry_doctypes()
    create_client_scripts()
    frappe.db.commit()
    print("\n--- ✅ SETUP COMPLETE! ---")
    print("All necessary DocTypes and data for Mobile Combustion have been created.")
except Exception as e:
    print(f"\n❌ An error occurred during setup: {e}")
    frappe.db.rollback()