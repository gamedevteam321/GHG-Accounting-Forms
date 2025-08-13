import frappe

# --- 1. Define the DocType Name ---
doctype_name = "Stationary Emissions"

# --- 2. Verify if the DocType already exists ---
if frappe.db.exists("DocType", doctype_name):
    print(f"✅ Verification complete: DocType '{doctype_name}' already exists. No changes were made.")
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