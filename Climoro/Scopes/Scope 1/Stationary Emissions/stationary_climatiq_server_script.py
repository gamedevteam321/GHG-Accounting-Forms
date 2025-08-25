"""
Paste this file's content into a Frappe Server Script (Type: API)

- Script Type: API
- API Method: climoro_get_stationary_fuel_efs

Prereqs:
- Add key to site_config.json: "climatiq_api_key": "YOUR_KEY"
- Ensure DocType "EF Master" exists with fields like Emission Factor Master:
  fuel_type, fuel_name, efco2_energy, efch4_energy, efn20_energy,
  efco2_mass, efch4_mass, efn20_mass, efco2_liquid, efch4_liquid, efn20_liquid,
  efco2_gas, efch4_gas, efn20_gas
"""

import os
import json
import frappe
import requests


def get_api_key():
    key = getattr(frappe, "conf", {}).get("climatiq_api_key")
    if not key:
        key = os.environ.get("CLIMATIQ_API_KEY")
    if not key:
        raise frappe.ValidationError("Missing Climatiq API key (site_config climatiq_api_key)")
    return key


def request_json(path, params=None, method="GET"):
    url = "https://api.climatiq.io" + path
    headers = {
        "Authorization": "Bearer " + get_api_key(),
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, params=params, timeout=15)
        else:
            resp = requests.request(method, url, headers=headers, params=params, timeout=15)
    except requests.RequestException as exc:
        raise frappe.ValidationError(f"Climatiq request failed: {exc}")

    if resp.status_code == 429:
        raise frappe.ValidationError("Climatiq rate limited (429)")
    if resp.status_code >= 400:
        try:
            data = resp.json()
            msg = data.get("message") or data.get("error") or resp.text
        except Exception:
            msg = resp.text
        raise frappe.ValidationError(f"Climatiq error {resp.status_code}: {msg}")

    try:
        return resp.json()
    except json.JSONDecodeError:
        raise frappe.ValidationError("Climatiq returned invalid JSON")


def extract_unit_basis(item):
    result = {}
    gases = (item.get("constituent_gases") or [])
    unit = (item.get("unit") or "").lower()

    basis = None
    if "/tj" in unit:
        basis = "energy"
    elif "/tonne" in unit or "/t" in unit:
        basis = "mass"
    elif "/litre" in unit or "/liter" in unit:
        basis = "liquid"
    elif "/m3" in unit or "/m³" in unit:
        basis = "gas"
    if not basis:
        return result

    def set_val(g, val):
        if val is None:
            return
        key = None
        if g == "co2":
            key = f"efco2_{basis}"
        elif g == "ch4":
            key = f"efch4_{basis}"
        elif g == "n2o":
            key = f"efn20_{basis}"
        if key:
            result[key] = val

    for g in gases:
        gas_name = (g.get("gas") or "").lower()
        value = g.get("value")
        if "co2" in gas_name:
            set_val("co2", value)
        elif "ch4" in gas_name:
            set_val("ch4", value)
        elif "n2o" in gas_name:
            set_val("n2o", value)

    # fallback if only CO2 factor present
    if not result and "co2" in unit and item.get("value") is not None:
        set_val("co2", item["value"])

    return result


def upsert_ef_master(values):
    existing = frappe.db.get_value("EF Master", {"fuel_type": values["fuel_type"], "fuel_name": values["fuel_name"]}, "name")
    if existing:
        doc = frappe.get_doc("EF Master", existing)
        for k, v in values.items():
            if k in doc.as_dict():
                setattr(doc, k, v)
        doc.save(ignore_permissions=True)
        return doc.as_dict()
    doc = frappe.get_doc({"doctype": "EF Master", **values})
    doc.insert(ignore_permissions=True)
    return doc.as_dict()


@frappe.whitelist()
def climoro_get_stationary_fuel_efs(fuel_type, fuel_name, unit_preference=None, region="IN"):
    # 1) Cache lookup
    cached = frappe.db.get_value(
        "EF Master",
        {"fuel_type": fuel_type, "fuel_name": fuel_name},
        [
            "name",
            "fuel_type",
            "fuel_name",
            "efco2_energy",
            "efch4_energy",
            "efn20_energy",
            "efco2_mass",
            "efch4_mass",
            "efn20_mass",
            "efco2_liquid",
            "efch4_liquid",
            "efn20_liquid",
            "efco2_gas",
            "efch4_gas",
            "efn20_gas",
        ],
        as_dict=True,
    )
    if cached:
        cached["source"] = "cache"
        return cached

    # 2) Query Climatiq
    queries = [
        f"stationary combustion {fuel_name}",
        f"{fuel_name} combustion",
        f"{fuel_name}",
    ]

    aggregated = {}
    for q in queries:
        data = request_json("/emission-factors", params={"query": q, "region": region, "limit": 25})
        items = data.get("results") or data.get("items") or []
        for item in items:
            unit_map = extract_unit_basis(item)
            for k, v in unit_map.items():
                if k not in aggregated:
                    aggregated[k] = v
        if aggregated:
            break

    if not aggregated:
        return {"not_found": True, "source": "climatiq"}

    values = {"fuel_type": fuel_type, "fuel_name": fuel_name}
    values.update(aggregated)
    rec = upsert_ef_master(values)
    rec["source"] = "climatiq"
    return rec


