# Setup Instructions - On-Site Coke Production Form

## ⚠️ IMPORTANT: Run These Steps BEFORE Using the Form

The form will **NOT work** until you create the required DocTypes. Follow these steps in order:

---

## Step 1: Create Carbon Content Defaults DocType

Open **Frappe Console** (bench console) and run:

```python
exec(open('/Users/vnshkumar/Documents/GHG-Accounting-Forms/Climoro/Scopes/Scope 1/Process/Iron&Steel/on-site-coke-production/carbon_defaults_doctype.py').read())
```

**Expected Output:**
```
🚀 Ensuring Carbon Content Defaults DocType...
✓ Created DocType: Carbon Content Defaults
  ✓ Created: Blast Furnace Gas
  ✓ Created: Charcoal
  ✓ Created: Coal
  ... (21 materials total)
✅ Carbon Content Defaults DocType ensured and seeded.
```

---

## Step 2: Create Coke Production Emissions DocType

In the same **Frappe Console**, run:

```python
exec(open('/Users/vnshkumar/Documents/GHG-Accounting-Forms/Climoro/Scopes/Scope 1/Process/Iron&Steel/on-site-coke-production/coke_production_doctype.py').read())
```

**Expected Output:**
```
🚀 Creating Coke Production Emissions DocType...
✓ Created DocType: Coke Production Emissions
✅ Coke Production Emissions DocType ensured.
```

---

## Step 3: Verify DocTypes Created

Check in Frappe UI:
1. Go to **DocType List**
2. Search for:
   - ✅ `Carbon Content Defaults` (should have 21 records)
   - ✅ `Coke Production Emissions` (will be empty initially)

---

## Step 4: Open the Form

Now you can open the form:
1. Navigate to the form page in your Frappe app
2. The form should load with:
   - ✅ Unit dropdown populated (from your company's Units)
   - ✅ Fuel dropdown populated (21 materials)
   - ✅ Byproduct dropdown populated (21 materials)
   - ✅ Add Fuel / Add Byproduct buttons working

---

## Troubleshooting

### Issue: "Carbon Content Defaults DocType not found"
**Solution:** Run Step 1 again

### Issue: "No units in dropdown"
**Solution:** 
1. Ensure you have created Units in the `Units` DocType
2. Ensure the Units are linked to your company
3. Check console logs for errors

### Issue: "Cannot add fuel rows"
**Solution:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify Carbon Content Defaults has 21 records
4. Refresh the page

### Issue: "Form not loading at all"
**Solution:**
1. Ensure the form is loaded within Frappe (not standalone HTML)
2. Check browser console for errors
3. Verify `frappe` object is available: type `frappe` in console

---

## Console Logs to Expect

When the form loads successfully, you should see:

```
🚀 Initializing On-Site Coke Production form...
✓ Loaded carbon defaults: 21 materials
✓ User company: Your Company Name
✓ Loaded units for company: 5
✓ Populated unit dropdown with 5 units
🔨 Building UI...
✓ Added coking coal row, total rows: 1
✓ UI built successfully
✅ Form initialized successfully
```

---

## Quick Test

After setup, test the form:
1. ✅ Select a Unit from dropdown
2. ✅ Click "Add Fuel" button → new row appears
3. ✅ Select "Coking Coal" from fuel dropdown → carbon content shows 0.7310
4. ✅ Enter amount (e.g., 100) → CO2 total updates
5. ✅ Click "Next: CH4 Emissions" → Step 2 appears
6. ✅ Enter coke amount → CH4 total updates
7. ✅ Click "Save Entry" → entry saved and appears in history

---

## Need Help?

If you encounter errors:
1. Open browser console (F12)
2. Copy all console logs (especially red errors)
3. Share the logs for debugging

---

**Remember:** The DocTypes MUST be created before the form will work!

