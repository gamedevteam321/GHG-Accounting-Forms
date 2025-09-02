import frappe

module = "Climoro Onboarding"

def single_has_any_value(dt):
    # consider Single unused unless it has any value set
    return bool(frappe.db.get_all("Singles", filters={"doctype": dt}, limit=1))

def incoming_links(dt):
    return frappe.get_all(
        "DocField",
        filters={"fieldtype": ["in", ["Link","Table","Table MultiSelect"]], "options": dt},
        pluck="parent",
        distinct=True,
    )

unused, zero_but_linked, singles_with_values = [], [], []

for d in frappe.get_all("DocType", filters={"module": module}, fields=["name","issingle","istable"]):
    name, issingle, istable = d.name, int(d.issingle or 0), int(d.istable or 0)
    links = incoming_links(name)

    if issingle:
        if single_has_any_value(name):
            singles_with_values.append(name)
        else:
            if not links:
                unused.append(name)  # Single with no values and no links
            else:
                zero_but_linked.append(name)
        continue

    # normal (non-single) doctypes
    try:
        cnt = frappe.db.count(name)
    except Exception:
        cnt = 0  # guard against broken doctypes

    if cnt == 0:
        if links:
            zero_but_linked.append(name)
        else:
            unused.append(name)

print("=== UNUSED (0 records, no incoming links) ===")
print("\n".join(sorted(unused)) or "- none -")

print("\n=== ZERO RECORDS BUT HAS INCOMING LINKS (inspect before delete) ===")
print("\n".join(sorted(zero_but_linked)) or "- none -")

print("\n=== SINGLE DOCTYPES WITH VALUES (kept) ===")
print("\n".join(sorted(singles_with_values)) or "- none -")