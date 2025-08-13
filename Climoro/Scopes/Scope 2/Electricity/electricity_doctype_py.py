# Create Electricity Purchased doctype using console
import frappe
import json

# Define the doctype structure
doctype_data = {
    "name": "Electricity Purchased",
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
    "field_order": [
        "s_no",
        "date",
        "invoice_no",
        "upload_invoice",
        "activity_types",
        "activity_data",
        "no_of_units",
        "unit_selection",
        "ef",
        "etco2eq"
    ],
    "fields": [
        {
            "fieldname": "s_no",
            "label": "S.no",
            "fieldtype": "Int",
            "in_standard_filter": 1,
            "in_list_view": 1,
            "reqd": 1,
            "idx": 1
        },
        {
            "fieldname": "date",
            "label": "Date",
            "fieldtype": "Date",
            "in_standard_filter": 1,
            "in_list_view": 1,
            "reqd": 1,
            "idx": 2
        },
        {
            "fieldname": "invoice_no",
            "label": "Invoice No",
            "fieldtype": "Data",
            "in_standard_filter": 1,
            "in_list_view": 1,
            "reqd": 1,
            "idx": 3
        },
        {
            "fieldname": "upload_invoice",
            "label": "Upload Invoice",
            "fieldtype": "Attach",
            "idx": 4
        },
        {
            "fieldname": "activity_types",
            "label": "Activity TYPES",
            "fieldtype": "Select",
            "options": "Office Buildings\nManufacturing Facilities\nWarehouses\nData Centers\nRetail Stores\nHealthcare Facilities\nEducational Institutions\nResidential Buildings\nOther",
            "in_standard_filter": 1,
            "in_list_view": 1,
            "reqd": 1,
            "idx": 5
        },
        {
            "fieldname": "activity_data",
            "label": "Activity Data (A)",
            "fieldtype": "Float",
            "in_standard_filter": 1,
            "in_list_view": 1,
            "reqd": 1,
            "idx": 6
        },
        {
            "fieldname": "no_of_units",
            "label": "No of Units",
            "fieldtype": "Float",
            "in_standard_filter": 1,
            "in_list_view": 1,
            "reqd": 1,
            "idx": 7
        },
        {
            "fieldname": "unit_selection",
            "label": "Unit Selection",
            "fieldtype": "Select",
            "options": "Tonnes\nkg",
            "in_standard_filter": 1,
            "in_list_view": 1,
            "reqd": 1,
            "idx": 8
        },
        {
            "fieldname": "ef",
            "label": "EF (B)",
            "fieldtype": "Float",
            "in_standard_filter": 1,
            "in_list_view": 1,
            "reqd": 1,
            "idx": 9
        },
        {
            "fieldname": "etco2eq",
            "label": "ETCO2eq",
            "fieldtype": "Float",
            "in_standard_filter": 1,
            "in_list_view": 1,
            "read_only": 1,
            "idx": 10
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

# Create the doctype
try:
    # Check if doctype already exists
    if frappe.db.exists("DocType", "Electricity Purchased"):
        print("Doctype 'Electricity Purchased' already exists!")
    else:
        # Create new doctype
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
        
        # Save the doctype
        doc.save(ignore_permissions=True)
        
        # Create the database table
        doc.create_table()
        
        print("✓ Electricity Purchased doctype created successfully!")
        print(f"✓ Module: {doc.module}")
        print(f"✓ Fields: {len(doc.fields)}")
        print(f"✓ Permissions: {len(doc.permissions)}")
        
except Exception as e:
    print(f"Error creating doctype: {e}")