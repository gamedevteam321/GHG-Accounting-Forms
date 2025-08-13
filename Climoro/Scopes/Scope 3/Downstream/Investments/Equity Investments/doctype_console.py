# Usage: bench --site <yoursite> console
# In console: exec(open(r"/Users/shobhit/Documents/Projects/Frappe/climoro-project/bench-dev/scope_code/Scope 3/Downstream/Investments/Equity Investments/doctype_console.py").read())
# Then run: create_doctypes()

import frappe

CATEGORY = "Equity Investments"
MODULE = "Climoro Onboarding"

# Two methods (tabs): Investment-Specific and Average-Data
TAB_CHILDREN = [
    ("Investment Specific", f"{CATEGORY} Investment Specific Item"),
    ("Average Data", f"{CATEGORY} Average Data Item"),
]

PARENT_DOCTYPE = f"Scope 3 - {CATEGORY}"


def _ensure_child_investment_specific(name: str):
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
        {"fieldname": "company", "label": "Investee Company", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "share", "label": "Your Equity Share (%)", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "scope1", "label": "Investee Scope 1 Emissions", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "scope2", "label": "Investee Scope 2 Emissions", "fieldtype": "Float", "in_list_view": 1},
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
        {"fieldname": "company", "label": "Investee Company", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "share", "label": "Your Equity Share (%)", "fieldtype": "Float", "in_list_view": 1},
        {"fieldname": "revenue", "label": "Investee Revenue", "fieldtype": "Float", "in_list_view": 1},
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
    ]

    # Add sections and tables for both methods
    fields.extend([
        {"fieldname": "investment_specific_sb", "label": "Investment-Specific", "fieldtype": "Section Break"},
        {"fieldname": "investment_specific", "label": "Investment-Specific", "fieldtype": "Table", "options": f"{CATEGORY} Investment Specific Item"},
        {"fieldname": "average_data_sb", "label": "Average-Data", "fieldtype": "Section Break"},
        {"fieldname": "average_data", "label": "Average-Data", "fieldtype": "Table", "options": f"{CATEGORY} Average Data Item"},
    ])

    d.fields = fields
    d.permissions = [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
    d.save(ignore_permissions=True)


def create_doctypes():
    _ensure_child_investment_specific(f"{CATEGORY} Investment Specific Item")
    _ensure_child_average_data(f"{CATEGORY} Average Data Item")
    _ensure_parent_doctype()
    frappe.db.commit()
    print(f"Created/updated DocTypes for: {CATEGORY}")


