### Stationary Emissions – Climatiq EF Integration

This HTML Block pulls emission factors (EF) for CO2, CH4, and N2O from Climatiq and caches them in the Frappe site so repeated selections don’t call the API again.

### What happens now
- When you select a Fuel Type and Fuel in the Stationary Emissions UI (`mai.js`):
  - It first looks for matching EF values in the site’s `EF Master` DocType (cache).
  - If not found, it calls a Server Script API `climoro_get_stationary_fuel_efs` (region `IN`).
  - The server script queries Climatiq, parses constituent gases per unit basis (energy/mass/liquid/gas), stores them into `EF Master`, and returns the values to the UI.
  - The UI fills `EF CO2`, `EF CH4`, `EF N2O` according to the chosen unit with sensible fallbacks (exact basis → fallback to energy).

### Files in this folder
- `mai.js`: UI logic. Calls the server script and applies EF values. Includes a small fix to use `efn20_energy` correctly.
- `stationary_climatiq_server_script.py`: Paste into a Frappe Server Script (Type: API) with API Method `climoro_get_stationary_fuel_efs`.
- `index.html`, `main.css`: UI layout and styles.

### Prerequisites on the Frappe site
1) Enable Server Scripts (System Settings) or in `site_config.json`:
```json
{
  "server_script_enabled": 1,
  "climatiq_api_key": "YOUR_CLIMATIQ_API_KEY"
}
```
Restart bench after editing `site_config.json`.

2) Ensure the `EF Master` DocType exists with these fields (similar to Emission Factor Master):
- `fuel_type` (Select/Data)
- `fuel_name` (Data)
- `efco2_energy`, `efch4_energy`, `efn20_energy` (Float)
- `efco2_mass`, `efch4_mass`, `efn20_mass` (Float)
- `efco2_liquid`, `efch4_liquid`, `efn20_liquid` (Float)
- `efco2_gas`, `efch4_gas`, `efn20_gas` (Float)

### Server Script setup (once per site)
1) Desk → Server Script → New
- Script Type: `API`
- API Method: `climoro_get_stationary_fuel_efs`
- Paste all of `stationary_climatiq_server_script.py` into the Script box
- Save

### How unit selection maps to EF fields
- Unit = `kg` or `Tonnes` → mass basis: `efco2_mass`, `efch4_mass`, `efn20_mass`
- Unit = `Litre` → liquid basis: `efco2_liquid`, `efch4_liquid`, `efn20_liquid`
- Unit = `m³` → gas basis: `efco2_gas`, `efch4_gas`, `efn20_gas`
- If the specific basis isn’t available, the UI falls back to energy basis (`*_energy`).

### Testing
1) Hard refresh the Stationary Emissions page
2) Pick a Fuel Type (e.g., `Gaseous fossil`) and Fuel (e.g., `Natural gas`)
3) Set Unit (e.g., `m³`). The EF fields should auto-populate
4) Verify a new row appears in `EF Master` for the selected fuel
5) Reselect the same fuel: values should load instantly from cache (no new API call)

### Troubleshooting
- 401/403 from server script: check `climatiq_api_key` in `site_config.json` and restart bench
- 429 rate limit: retry later; values will cache once fetched
- “not_found” in response: try a nearby/common fuel name (e.g., “Gas/Diesel oil” vs “Diesel”)
- Ensure `EF Master` field names exactly match those listed above

### Notes
- The old `api/` Python package was removed from this repo. All backend logic lives in the site’s Server Script.
- Region default is `IN`. Change in the JS call or script if needed.


