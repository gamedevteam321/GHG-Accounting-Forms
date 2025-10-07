import frappe


def ensure_doctype(name, fields, module_hint="Climoro Onboarding"):
    module_name = module_hint if frappe.db.exists("Module Def", module_hint) else "Core"
    if not frappe.db.exists("DocType", name):
        doc = frappe.new_doc("DocType")
        doc.name = name
        doc.module = module_name
        doc.custom = 1
        doc.editable_grid = 1
        doc.track_changes = 1
        for f in fields:
            doc.append("fields", f)
        doc.append("permissions", {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "export": 1, "share": 1, "print": 1, "email": 1})
        doc.append("permissions", {"role": "All", "read": 1, "write": 1, "create": 1})
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
    try:
        frappe.db.updatedb(name)
    except Exception:
        pass


print("\n🚀 Ensuring HCFC-22 DocTypes...")
try:
    ensure_doctype(
        "HCFC22 Gas Stream Emissions",
        [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "in_list_view": 1},
            {"fieldname": "stream_id", "label": "Stream ID", "fieldtype": "Data", "in_list_view": 1},
            {"fieldname": "flow_rate_m3_min", "label": "Flow Rate (m3/min)", "fieldtype": "Float"},
            {"fieldname": "concentration_g_m3", "label": "Concentration (g/m3)", "fieldtype": "Float"},
            {"fieldname": "flow_time_min", "label": "Time (min)", "fieldtype": "Float"},
            {"fieldname": "abatement_utilization_fraction", "label": "Abatement Utilization (fraction)", "fieldtype": "Float"},
            {"fieldname": "hfc23_emissions_t", "label": "HFC-23 Emissions (t)", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "co2e_t", "label": "CO2e (t)", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "gwp", "label": "GWP (HFC-23)", "fieldtype": "Int", "default": 12400, "read_only": 1},
        ],
    )

    ensure_doctype(
        "HCFC22 Balance Emissions",
        [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "in_list_view": 1},
            {"fieldname": "production_t", "label": "Production (t)", "fieldtype": "Float", "reqd": 1},
            {"fieldname": "carbon_balance_efficiency_pct", "label": "Carbon Balance Efficiency (%)", "fieldtype": "Float", "read_only": 1, "default": 100},
            {"fieldname": "fluorine_balance_efficiency_pct", "label": "Fluorine Balance Efficiency (%)", "fieldtype": "Float", "read_only": 1, "default": 90},
            {"fieldname": "carbon_content_factor", "label": "Carbon Content Factor", "fieldtype": "Float", "read_only": 1, "default": 0.81},
            {"fieldname": "fluorine_content_factor", "label": "Fluorine Content Factor", "fieldtype": "Float", "read_only": 1, "default": 0.54},
            {"fieldname": "loss_factor", "label": "Loss Factor", "fieldtype": "Float", "read_only": 1, "default": 1.0},
            {"fieldname": "emission_factor_t_per_t", "label": "HFC-23 EF (t/t)", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "untreated_fraction", "label": "Untreated Fraction", "fieldtype": "Float"},
            {"fieldname": "hfc23_emissions_t", "label": "HFC-23 Emissions (t)", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "co2e_t", "label": "CO2e (t)", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "gwp", "label": "GWP (HFC-23)", "fieldtype": "Int", "default": 12400, "read_only": 1},
        ],
    )

    ensure_doctype(
        "HCFC22 Production Emissions",
        [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "unit", "label": "Unit", "fieldtype": "Link", "options": "Units", "in_list_view": 1},
            {"fieldname": "production_t", "label": "Production (t)", "fieldtype": "Float", "reqd": 1},
            {"fieldname": "vintage", "label": "Vintage", "fieldtype": "Select", "options": "pre\npost", "in_list_view": 1},
            {"fieldname": "emission_factor_t_per_t", "label": "HFC-23 EF (t/t)", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "untreated_fraction", "label": "Untreated Fraction", "fieldtype": "Float"},
            {"fieldname": "hfc23_emissions_t", "label": "HFC-23 Emissions (t)", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "co2e_t", "label": "CO2e (t)", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "gwp", "label": "GWP (HFC-23)", "fieldtype": "Int", "default": 12400, "read_only": 1},
        ],
    )

    print("✅ HCFC-22 DocTypes ensured.")
except Exception as e:
    print("❌ Error ensuring HCFC-22 DocTypes:", str(e))


