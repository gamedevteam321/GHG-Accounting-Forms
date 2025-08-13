# Usage: bench --site <yoursite> console
# exec(open(r"/Users/shobhit/Documents/Projects/Frappe/climoro-project/bench-dev/scope_code/Scope 3/Downstream/Investments/Project Finance/doctype_console.py").read())
# create_doctypes()

import frappe

CATEGORY = "Project Finance"
MODULE = "Climoro Onboarding"

TAB_CHILDREN = [
    ("Project Specific", f"{CATEGORY} Project Specific Item"),
    ("Average Data", f"{CATEGORY} Average Data Item"),
]

PARENT_DOCTYPE = f"Scope 3 - {CATEGORY}"


def _ensure_child_project_specific(name: str):
    if frappe.db.exists("DocType", name):
        return
    d = frappe.new_doc("DocType")
    d.name = name
    d.module = MODULE
    d.istable = 1
    d.custom = 1
    d.fields = [
        {"fieldname": "s_no", "label": "S No", "fieldtype": "Int", "in_list_view": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "in_list_view": 1},
        {"fieldname": "project_id", "label": "Project ID", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "share", "label": "Your Share of Project Cost (%)", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "scope1", "label": "Project Scope 1 Emissions", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "scope2", "label": "Project Scope 2 Emissions", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "co2e", "label": "Calculated Emissions (CO2e)", "fieldtype": "Float", "in_list_view": 1},
    ]
    d.permissions = [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
    d.save(ignore_permissions=True)


def _ensure_child_average_data(name: str):
    if frappe.db.exists("DocType", name):
        return
    d = frappe.new_doc("DocType")
    d.name = name
    d.module = MODULE
    d.istable = 1
    d.custom = 1
    d.fields = [
        {"fieldname": "s_no", "label": "S No", "fieldtype": "Int", "in_list_view": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "in_list_view": 1},
        {"fieldname": "project_id", "label": "Project ID", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "share", "label": "Your Share of Project Cost (%)", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "cost", "label": "Project Cost/Revenue", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "currency", "label": "Currency", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "eeio_ef", "label": "EEIO Sector EF", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "ef_unit", "label": "EF Unit", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "co2e", "label": "Calculated Emissions (CO2e)", "fieldtype": "Float", "in_list_view": 1},
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
        {"fieldname": "project_specific_sb", "label": "Project-Specific", "fieldtype": "Section Break"},
        {"fieldname": "project_specific", "label": "Project-Specific", "fieldtype": "Table", "options": f"{CATEGORY} Project Specific Item"},
        {"fieldname": "average_data_sb", "label": "Average-Data", "fieldtype": "Section Break"},
        {"fieldname": "average_data", "label": "Average-Data", "fieldtype": "Table", "options": f"{CATEGORY} Average Data Item"},
    ]

    d.fields = fields
    d.permissions = [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
    d.save(ignore_permissions=True)


def create_doctypes():
    _ensure_child_project_specific(f"{CATEGORY} Project Specific Item")
    _ensure_child_average_data(f"{CATEGORY} Average Data Item")
    _ensure_parent_doctype()
    frappe.db.commit()
    print(f"Created/updated DocTypes for: {CATEGORY}")


