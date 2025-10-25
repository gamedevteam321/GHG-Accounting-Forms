import frappe

# Paste the entire block in bench console and run.
EM_DTYPE = "PFC Emissions"

if not frappe.db.exists("DocType", EM_DTYPE):
    doc = frappe.get_doc({
        "doctype": "DocType",
        "module": "Custom",
        "name": EM_DTYPE,
        "custom": 1,
        "track_changes": 1,
        "fields": [
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "reqd": 1},
            {"fieldname": "unit", "label": "Unit", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
            {"fieldname": "method", "label": "Method", "fieldtype": "Select", "options": "Slope\nOvervoltage", "reqd": 1, "in_list_view": 1},
            {"fieldname": "cell_type", "label": "Cell Type", "fieldtype": "Data", "reqd": 1, "in_list_view": 1},
            {"fieldname": "production_t", "label": "Production (t Al)", "fieldtype": "Float", "precision": 3, "reqd": 1},
            {"fieldname": "aem_min_per_cell_day", "label": "AEM (min per cell-day)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "aef_per_cell_per_day", "label": "AEF (AE per cell per day)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "aef_eq2", "label": "AEF (Eq2)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "aeo_mv_per_cell", "label": "AEO (mV per cell)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "current_eff_pct", "label": "Current efficiency (%)", "fieldtype": "Float", "precision": 6},
            {"fieldname": "used_coeff", "label": "Used coefficient", "fieldtype": "Float", "precision": 6, "read_only": 1},
            {"fieldname": "used_weight_frac", "label": "Used weight fraction C2F6/CF4", "fieldtype": "Float", "precision": 6, "read_only": 1},
            {"fieldname": "cf4_kg", "label": "CF4 Emissions (kg)", "fieldtype": "Float", "precision": 6, "read_only": 1, "in_list_view": 1},
            {"fieldname": "c2f6_kg", "label": "C2F6 Emissions (kg)", "fieldtype": "Float", "precision": 6, "read_only": 1},
            {"fieldname": "co2_total_t", "label": "Total CO2 Emissions (t)", "fieldtype": "Float", "precision": 6, "read_only": 1, "in_list_view": 1},
            {"fieldname": "notes", "label": "Notes", "fieldtype": "Small Text"},
        ],
        "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}],
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print(f"✅ Created DocType '{EM_DTYPE}'")
else:
    print(f"✅ DocType '{EM_DTYPE}' already exists")
