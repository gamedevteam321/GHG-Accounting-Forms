import frappe
from frappe.modules.export_file import export_to_files

def export_module_doctypes(module="Climoro Onboarding"):
    frappe.only_for("System Manager")
    if not frappe.conf.get("developer_mode"):
        frappe.throw("Enable developer_mode=1 in site_config.json")

    doctypes = frappe.get_all("DocType", filters={"module": module}, pluck="name")
    reverted = []

    for name in doctypes:
        dt = frappe.get_doc("DocType", name)
        was_custom = bool(dt.custom)
        if was_custom:
            dt.custom = 0
            dt.save(ignore_permissions=True)
            reverted.append(name)

        # export_to_files signature: export_to_files(record_list, record_module, ...)
        export_to_files([("DocType", name)], module, create_init=True)

    for name in reverted:
        dt = frappe.get_doc("DocType", name)
        dt.custom = 1
        dt.save(ignore_permissions=True)

    frappe.db.commit()
    return {"exported": doctypes, "reverted_to_custom_true": reverted}

if __name__ == "__main__":
    # Allows running this file directly; in bench console simply import and call
    export_module_doctypes()


# to run in bench console=>copy following code in bench console
#   from frappe.modules.export_file import export_to_files  # ensure symbol exists in session
#   %run [full path to this file] => %run /Users/shobhit/Documents/Projects/Frappe/climoro-project/bench-dev/scope_code/Scripts/ToggleCustomOfDoctype.py
#   export_module_doctypes("Climoro Onboarding")