import frappe


def ensure_doctype(name, fields, module_hint="Climoro Onboarding"):
    frappe.db.connect()
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


print("\n🚀 Ensuring Semiconductor PFC Emissions DocType...")
try:
    ensure_doctype(
        "Semiconductor PFC Emissions",
        [
            # Basic info
            {"fieldname": "date", "label": "Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1},
            {"fieldname": "reporting_year", "label": "Reporting Year", "fieldtype": "Int", "reqd": 1, "in_list_view": 1},
            {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "in_list_view": 1},
            
            # Step 1 - Gas Purchased (kgsi)
            {"fieldname": "section_step1", "label": "Step 1: Gas Purchased (kgsi)", "fieldtype": "Section Break"},
            {"fieldname": "kgsi_c2f6", "label": "C2F6 (kg)", "fieldtype": "Float", "default": 0},
            {"fieldname": "kgsi_cf4", "label": "CF4 (kg)", "fieldtype": "Float", "default": 0},
            {"fieldname": "kgsi_chf3", "label": "CHF3 (kg)", "fieldtype": "Float", "default": 0},
            {"fieldname": "kgsi_sf6", "label": "SF6 (kg)", "fieldtype": "Float", "default": 0},
            {"fieldname": "kgsi_nf3", "label": "NF3 (kg)", "fieldtype": "Float", "default": 0},
            {"fieldname": "kgsi_c3f8", "label": "C3F8 (kg)", "fieldtype": "Float", "default": 0},
            {"fieldname": "kgsi_c4f8", "label": "C4F8 (kg)", "fieldtype": "Float", "default": 0},
            
            # Step 2 - Abatement Fraction (Va)
            {"fieldname": "section_step2", "label": "Step 2: Abatement Fraction (Va)", "fieldtype": "Section Break"},
            {"fieldname": "va_c2f6", "label": "C2F6 Va", "fieldtype": "Float", "default": 0},
            {"fieldname": "va_cf4", "label": "CF4 Va", "fieldtype": "Float", "default": 0},
            {"fieldname": "va_chf3", "label": "CHF3 Va", "fieldtype": "Float", "default": 0},
            {"fieldname": "va_sf6", "label": "SF6 Va", "fieldtype": "Float", "default": 0},
            {"fieldname": "va_nf3", "label": "NF3 Va", "fieldtype": "Float", "default": 0},
            {"fieldname": "va_c3f8", "label": "C3F8 Va", "fieldtype": "Float", "default": 0},
            {"fieldname": "va_c4f8", "label": "C4F8 Va", "fieldtype": "Float", "default": 0},
            
            # Step 3 - Wafer Data (JSON stored as Text)
            {"fieldname": "section_step3", "label": "Step 3: Wafer Data", "fieldtype": "Section Break"},
            {"fieldname": "wafer_data_json", "label": "Wafer Sizes (JSON)", "fieldtype": "Long Text"},
            {"fieldname": "total_surface_area_m2", "label": "Total Surface Area (m²)", "fieldtype": "Float", "read_only": 1},
            
            # Calculated Intermediate Values
            {"fieldname": "section_intermediate", "label": "Intermediate Calculations", "fieldtype": "Section Break"},
            {"fieldname": "ai_c2f6", "label": "Ai C2F6", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "ai_cf4", "label": "Ai CF4", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "ai_chf3", "label": "Ai CHF3", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "ai_sf6", "label": "Ai SF6", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "ai_nf3", "label": "Ai NF3", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "ai_c3f8", "label": "Ai C3F8", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "ai_c4f8", "label": "Ai C4F8", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "acf4_c2f6", "label": "ACF4 C2F6", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "acf4_c3f8", "label": "ACF4 C3F8", "fieldtype": "Float", "read_only": 1},
            
            # Emissions - Primary
            {"fieldname": "section_primary", "label": "Primary Emissions (t CO2e)", "fieldtype": "Section Break"},
            {"fieldname": "emissions_primary_c2f6", "label": "C2F6 Primary", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "emissions_primary_cf4", "label": "CF4 Primary", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "emissions_primary_chf3", "label": "CHF3 Primary", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "emissions_primary_sf6", "label": "SF6 Primary", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "emissions_primary_nf3", "label": "NF3 Primary", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "emissions_primary_c3f8", "label": "C3F8 Primary", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "emissions_primary_c4f8", "label": "C4F8 Primary", "fieldtype": "Float", "read_only": 1},
            
            # Emissions - Byproduct CF4
            {"fieldname": "section_byproduct", "label": "Byproduct CF4 Emissions (t CO2e)", "fieldtype": "Section Break"},
            {"fieldname": "emissions_byproduct_c2f6", "label": "C2F6 → CF4", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "emissions_byproduct_c3f8", "label": "C3F8 → CF4", "fieldtype": "Float", "read_only": 1},
            
            # Total Emissions per Gas
            {"fieldname": "section_total_per_gas", "label": "Total Emissions per Gas (t CO2e)", "fieldtype": "Section Break"},
            {"fieldname": "emissions_total_c2f6", "label": "C2F6 Total", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
            {"fieldname": "emissions_total_cf4", "label": "CF4 Total", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "emissions_total_chf3", "label": "CHF3 Total", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "emissions_total_sf6", "label": "SF6 Total", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "emissions_total_nf3", "label": "NF3 Total", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "emissions_total_c3f8", "label": "C3F8 Total", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "emissions_total_c4f8", "label": "C4F8 Total", "fieldtype": "Float", "read_only": 1},
            
            # Summary
            {"fieldname": "section_summary", "label": "Summary", "fieldtype": "Section Break"},
            {"fieldname": "total_emissions_tco2e", "label": "Total Emissions (Tons CO2e)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
            {"fieldname": "total_emissions_mtce", "label": "Total Emissions (MTCE)", "fieldtype": "Float", "read_only": 1, "in_list_view": 1},
            {"fieldname": "normalized_ner_tco2e", "label": "Normalized NER (Tons CO2e/m² Si)", "fieldtype": "Float", "read_only": 1},
            {"fieldname": "normalized_ner_mtce", "label": "Normalized NER (MTCE/m² Si)", "fieldtype": "Float", "read_only": 1},
        ],
    )

    frappe.db.commit()
    print("✅ Semiconductor PFC Emissions DocType ensured.")
except Exception as e:
    print("❌ Error ensuring Semiconductor PFC Emissions DocType:", str(e))
    print(frappe.get_traceback())

