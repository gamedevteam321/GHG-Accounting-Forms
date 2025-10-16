import frappe

# --- 1. Define the DocType Name ---
doctype_name = "Stationary Emissions"

# --- 2. Check if the DocType already exists and update if needed ---
if frappe.db.exists("DocType", doctype_name):
    print(f"✅ DocType '{doctype_name}' already exists. Updating with new fields...")
    try:
        # Get existing DocType
        doc = frappe.get_doc("DocType", doctype_name)
        
        # Check if company and company_unit fields exist
        existing_fields = [field.fieldname for field in doc.fields]
        
        if 'company' not in existing_fields or 'company_unit' not in existing_fields:
            print("Adding missing company and company_unit fields...")
            
            # Add company field if it doesn't exist
            if 'company' not in existing_fields:
                doc.append("fields", {
                    "fieldname": "company", 
                    "label": "Company", 
                    "fieldtype": "Link", 
                    "options": "Company", 
                    "in_list_view": 1
                })
                print("✅ Added company field")
            
            # Add company_unit field if it doesn't exist
            if 'company_unit' not in existing_fields:
                doc.append("fields", {
                    "fieldname": "company_unit", 
                    "label": "Company Unit", 
                    "fieldtype": "Link", 
                    "options": "Units", 
                    "in_list_view": 1
                })
                print("✅ Added company_unit field")
            
            # Save the updated DocType
            doc.save(ignore_permissions=True)
            frappe.db.commit()
            print(f"✅ DocType '{doctype_name}' updated successfully with new fields!")
        else:
            print("✅ All required fields already exist. No updates needed.")
            
    except Exception as e:
        print(f"❌ An error occurred during DocType update: {e}")
else:
    # --- If it doesn't exist, create it ---
    print(f"DocType '{doctype_name}' not found. Creating it now...")
    try:
        # --- 3. Create a new DocType document ---
        doc = frappe.new_doc("DocType")
        doc.name = doctype_name
        doc.module = "Climoro Onboarding"
        doc.custom = 0

        # --- 4. Define All Fields based on the provided image ---
        # Using the safe "ef_n2o" and "en2o" naming
        fields_list = [
            {"fieldname": "s_no", "label": "S. No", "fieldtype": "Int", "reqd": 1, "in_list_view": 1},
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "invoice_no", "label": "Invoice No", "fieldtype": "Data", "in_list_view": 1},
            {"fieldname": "upload_invoice", "label": "Upload Invoice", "fieldtype": "Attach", "in_list_view": 1},
            {"fieldname": "fuel_type", "label": "Fuel Type", "fieldtype": "Select", "reqd": 1, "in_list_view": 1,
             "options": "Solid fossil\nLiquid fossil\nGaseous fossil\nBiomass\nOther"},
            {"fieldname": "fuel_selection", "label": "Fuel Selection", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
            {"fieldname": "activity_types", "label": "Activity Types", "fieldtype": "Select", "reqd": 1, "in_list_view": 1,
             "options": "Boilers\nBurners\nGen Sets\nFurnace (Including Blast Furnace)"},
            {"fieldname": "activity_data", "label": "Activity Data", "fieldtype": "Float", "reqd": 1, "in_list_view": 1},
            {"fieldname": "unit_selection", "label": "Unit Selection", "fieldtype": "Select", "reqd": 1,
             "options": "Tonnes\nkg\nLitre\nm³"},
            {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 1},
            {"fieldname": "company_unit", "label": "Company Unit", "fieldtype": "Link", "options": "Units", "in_list_view": 1},
            {"fieldname": "efco2", "label": "EFCO2", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "efch4", "label": "EFCH4", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "ef_n2o", "label": "EFN2O", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "eco2", "label": "ECO2", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "ech4", "label": "ECH4", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "en2o", "label": "EN2O", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "etco2eq", "label": "ETCO2eq", "fieldtype": "Float", "read_only": 1}
        ]

        for field_data in fields_list:
            doc.append("fields", field_data)

        # --- 5. Define Permissions ---
        doc.append("permissions", {
            "role": "System Manager",
            "read": 1, "write": 1, "create": 1, "delete": 1, "submit": 1, "cancel": 1, "amend": 1
        })
        doc.append("permissions", {
            "role": "All",
            "read": 1
        })

        # --- 6. Insert the new DocType into the database ---
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        print(f"✅ DocType '{doctype_name}' created successfully!")

    except Exception as e:
        print(f"❌ An error occurred during DocType creation: {e}")