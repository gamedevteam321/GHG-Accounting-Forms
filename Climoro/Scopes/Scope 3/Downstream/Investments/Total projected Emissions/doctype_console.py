# Usage: bench --site <yoursite> console
# exec(open(r"/Users/shobhit/Documents/Projects/Frappe/climoro-project/bench-dev/scope_code/Scope 3/Downstream/Investments/Total Projected Emissions/doctype_console.py").read())
# create_doctypes()

import frappe

CATEGORY = "Project Finance - Total Projected Emissions"
MODULE = "Climoro Onboarding"

PARENT_DOCTYPE = f"Scope 3 - {CATEGORY}"
CHILD = f"{CATEGORY} Item"


def _ensure_child():
    if frappe.db.exists("DocType", CHILD):
        return
    d = frappe.new_doc("DocType")
    d.name = CHILD
    d.module = MODULE
    d.istable = 1
    d.custom = 1
    d.fields = [
        {"fieldname": "s_no", "label": "S No", "fieldtype": "Int", "in_list_view": 1},
        {"fieldname": "date", "label": "Date", "fieldtype": "Date", "in_list_view": 1},
        {"fieldname": "project_id", "label": "Project ID", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "share", "label": "Your Share of Cost (%)", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "annual", "label": "Projected Annual Emissions", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "lifetime", "label": "Projected Lifetime (Years)", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "co2e", "label": "Calculated Lifetime Emissions (CO2e)", "fieldtype": "Float", "in_list_view": 1},
    ]
    d.permissions = [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
    d.save(ignore_permissions=True)


def _ensure_parent():
    if frappe.db.exists("DocType", PARENT_DOCTYPE):
        return
    d = frappe.new_doc("DocType")
    d.name = PARENT_DOCTYPE
    d.module = MODULE
    d.custom = 1
    d.fields = [
        {"fieldname": "title", "label": "Title", "fieldtype": "Data"},
        {"fieldname": "period_start", "label": "Period Start", "fieldtype": "Date"},
        {"fieldname": "period_end", "label": "Period End", "fieldtype": "Date"},
        {"fieldname": "items", "label": "Items", "fieldtype": "Table", "options": CHILD},
    ]
    d.permissions = [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
    d.save(ignore_permissions=True)


def create_doctypes():
    _ensure_child()
    _ensure_parent()
    frappe.db.commit()
    print(f"Created/updated DocTypes for: {CATEGORY}")


