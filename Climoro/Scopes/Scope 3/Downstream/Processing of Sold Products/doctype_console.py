# Usage: bench --site <yoursite> console
# In console: exec(open(r"/Users/shobhit/Documents/Projects/Frappe/climoro-project/bench-dev/scope_code/Scope 3/Processing of Sold Products/doctype_console.py").read())
# Then run: create_doctypes()

import frappe

CATEGORY = "Processing of Sold Products"
MODULE = "Climoro Onboarding"

# If the PDF defines multiple logical tabs for this category, add them here.
# Each entry creates a child table doctype referenced in the parent.
TAB_CHILDREN = [
    ("Activity Data", f"{CATEGORY} Activity Data Item"),
    ("Emission Factors", f"{CATEGORY} Emission Factor Item"),
    ("Results", f"{CATEGORY} Result Item"),
]

PARENT_DOCTYPE = f"Scope 3 - {CATEGORY}"


def _ensure_child_doctype(name: str):
    if frappe.db.exists("DocType", name):
        d = frappe.get_doc("DocType", name)
        # Ensure the new Date field exists on existing doctypes
        if not any(getattr(f, "fieldname", None) == "date" for f in d.fields):
            d.append("fields", {"fieldname": "date", "label": "Date", "fieldtype": "Date", "in_list_view": 1})
            d.save(ignore_permissions=True)
        return
    d = frappe.new_doc("DocType")
    d.name = name
    d.module = MODULE
    d.istable = 1
    d.custom = 1
    d.fields = [
        {"fieldname": "parameter", "label": "Parameter", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "in_list_view": 1},
        {"fieldname": "value", "label": "Value", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "unit", "label": "Unit", "fieldtype": "Data"},
        {"fieldname": "note", "label": "Note", "fieldtype": "Small Text"},
    ]
    d.permissions = [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
    d.save(ignore_permissions=True)


def _ensure_parent_doctype():
    if frappe.db.exists("DocType", PARENT_DOCTYPE):
        return
    d = frappe.new_doc("DocType")
    d.name = PARENT_DOCTYPE
    d.module = MODULE
    d.custom = 1

    fields = [
        {"fieldname": "title", "label": "Title", "fieldtype": "Data"},
        {"fieldname": "period_start", "label": "Period Start", "fieldtype": "Date"},
        {"fieldname": "period_end", "label": "Period End", "fieldtype": "Date"},
    ]

    # Add a section and table for each tab
    for section_label, child_name in TAB_CHILDREN:
        fields.extend([
            {"fieldname": frappe.scrub(section_label) + "_sb", "label": section_label, "fieldtype": "Section Break"},
            {"fieldname": frappe.scrub(section_label), "label": section_label, "fieldtype": "Table", "options": child_name},
        ])

    d.fields = fields
    d.permissions = [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
    d.save(ignore_permissions=True)


def create_doctypes():
    for _, child_dt in TAB_CHILDREN:
        _ensure_child_doctype(child_dt)
    _ensure_parent_doctype()
    frappe.db.commit()
    print(f"Created/updated DocTypes for: {CATEGORY}")
