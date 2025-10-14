/* ============================================
   On-Site Coke Production - GHG Emissions
   Step-by-Step Wizard Implementation
   ============================================ */

(function() {
    // Use root_element if available (for Frappe), otherwise use document
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    
    // Helper function to select elements within scope
    const $ = (selector) => scopeRoot.querySelector(selector);
    const $$ = (selector) => scopeRoot.querySelectorAll(selector);

    // Constants
    const CH4_FACTOR = 0.1; // g CH4/unit coke (fixed)
    const CO2_CONVERSION = 44 / 12; // Carbon to CO2 conversion

    // State
    let currentStep = 1;
    let currentSNo = 1;
    let carbonDefaults = {};
    let userCompany = '';
    let userUnits = [];
    let entryRows = [];

    // Initialize
    if (typeof root_element !== 'undefined' && root_element) {
        // Running in Frappe - initialize immediately
        init();
    } else {
        // Standalone - wait for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', init);
    }

async function init() {
    try {
        // Check if frappe is available
        if (typeof frappe === 'undefined') {
            console.error('❌ Frappe is not available. Please ensure this form is loaded within Frappe.');
            alert('This form requires Frappe framework. Please load it within Frappe.');
            return;
        }
        
        console.log('🚀 Initializing On-Site Coke Production form...');
        
        await loadCarbonDefaults();
        await loadUserContext();
        buildUI();
        attachEventListeners();
        updateProgress();
        await loadHistory();
        
        // Block global shortcuts
        scopeRoot.addEventListener('keydown', blockGlobalShortcuts);
        
        console.log('✅ Form initialized successfully');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        if (typeof frappe !== 'undefined') {
            frappe.msgprint({
                title: 'Initialization Error',
                indicator: 'red',
                message: 'Failed to initialize form. Please refresh the page.'
            });
        } else {
            alert('Failed to initialize form: ' + error.message);
        }
    }
}

function blockGlobalShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'f'].includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
}

/* ============================================
   Load Data
   ============================================ */

async function loadCarbonDefaults() {
    try {
        const response = await frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Carbon Content Defaults',
                fields: ['name', 'fuel_name', 'carbon_content_kg_per_kg', 'category'],
                filters: { is_active: 1 },
                limit_page_length: 0
            }
        });

        if (response.message && response.message.length > 0) {
            response.message.forEach(item => {
                carbonDefaults[item.fuel_name] = {
                    name: item.name,
                    carbon_content: item.carbon_content_kg_per_kg,
                    category: item.category
                };
            });
            console.log('✓ Loaded carbon defaults:', Object.keys(carbonDefaults).length, 'materials');
        } else {
            console.warn('⚠ No carbon defaults found. Please run carbon_defaults_doctype.py to seed data.');
            frappe.msgprint({
                title: 'Setup Required',
                indicator: 'orange',
                message: 'Carbon Content Defaults not found. Please run the setup script first.'
            });
        }
    } catch (error) {
        console.error('❌ Error loading carbon defaults:', error);
        console.error('Please ensure Carbon Content Defaults DocType exists and is seeded.');
        frappe.msgprint({
            title: 'Setup Required',
            indicator: 'red',
            message: 'Carbon Content Defaults DocType not found. Please run carbon_defaults_doctype.py in Frappe console.'
        });
    }
}

async function loadUserContext() {
    try {
        // Standard path: get user's company
        const userDoc = await frappe.call({
            method: 'frappe.client.get_value',
            args: {
                doctype: 'User',
                filters: { name: frappe.session.user },
                fieldname: ['company']
            }
        }).catch(() => null);

        if (userDoc && userDoc.message && userDoc.message.company) {
            userCompany = userDoc.message.company;
            console.log('✓ User company:', userCompany);

            // Fetch units for this company
            const unitsResp = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Units',
                    fields: ['name'],
                    filters: { company: userCompany },
                    limit_page_length: 0
                }
            }).catch(() => null);

            if (unitsResp && unitsResp.message) {
                userUnits = unitsResp.message;
                console.log('✓ Loaded units for company:', userUnits.length);
            }
        }
        
        // If still no units, try loading all units
        if (userUnits.length === 0) {
            const allUnitsResp = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Units',
                    fields: ['name'],
                    limit_page_length: 0
                }
            }).catch(() => null);

            if (allUnitsResp && allUnitsResp.message) {
                userUnits = allUnitsResp.message;
                console.log('✓ Loaded all units:', userUnits.length);
            }
        }

        if (userUnits.length === 0) {
            console.warn('⚠ No units found. Please ensure Units DocType has records.');
            frappe.msgprint({
                title: 'No Units Found',
                indicator: 'orange',
                message: 'No units available. Please create units in the Units DocType.'
            });
        }

        populateUnitDropdown();
    } catch (error) {
        console.error('❌ Error loading user context:', error);
        populateUnitDropdown(); // Still try to populate even if error
    }
}

function populateUnitDropdown() {
    // Not needed since units are added per row
    console.log('✓ Unit dropdown will be populated in entry rows');
}

/* ============================================
   Build UI
   ============================================ */

function buildUI() {
    console.log('🔨 Building UI...');
    // Add single entry row (always visible)
    addEntryRow();
    console.log('✓ UI built successfully');
    console.log('ℹ️ Single entry row created - no add button needed');
}

function addEntryRow() {
    const tbody = $('#cokeProductionBody');
    if (!tbody) {
        console.error('❌ Table tbody not found');
        return;
    }
    
    const row = tbody.insertRow();
    row.className = 'entry-row';
    
    const fuelOptions = Object.keys(carbonDefaults)
        .sort()
        .map(fuel => `<option value="${fuel}">${fuel}</option>`)
        .join('');
    
    const byproductOptions = Object.keys(carbonDefaults)
        .sort()
        .map(bp => `<option value="${bp}">${bp}</option>`)
        .join('');
    
    const unitOptions = userUnits
        .map(unit => `<option value="${unit.name}">${unit.name}</option>`)
        .join('');
    
    if (Object.keys(carbonDefaults).length === 0) {
        console.warn('⚠ No carbon defaults available for dropdowns');
    }
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    row.innerHTML = `
        <td><span class="sno-display" id="snoDisplay">${currentSNo}</span></td>
        <td><input type="date" class="entry-date" id="entryDate" value="${today}" /></td>
        <td>
            <select class="unit-select" id="unitSelect">
                <option value="">Select...</option>
                ${unitOptions}
            </select>
        </td>
        
        <td>
            <select class="fuel-select" data-frappe-ignore="true">
                <option value="">Select...</option>
                ${fuelOptions}
            </select>
        </td>
        <td><input type="number" class="fuel-amount" data-frappe-ignore="true" step="0.01" min="0" /></td>
        <td><span class="calculated-value fuel-carbon">-</span></td>
        
        <td><input type="number" class="bf-amount" id="bfAmount" data-frappe-ignore="true" step="0.01" min="0" /></td>
        <td><span class="readonly-value">Tonnes</span></td>
        <td><span class="calculated-value bf-carbon">-</span></td>
        
        <td><input type="number" class="coke-amount" id="cokeAmount" data-frappe-ignore="true" step="0.01" min="0" /></td>
        <td><span class="calculated-value coke-carbon">-</span></td>
        
        <td><input type="number" class="cog-amount" id="cogAmount" data-frappe-ignore="true" step="0.01" min="0" /></td>
        <td><span class="calculated-value cog-carbon">-</span></td>
        
        <td>
            <div class="byproduct-list">
                <select class="byproduct-select" data-frappe-ignore="true">
                    <option value="">Select...</option>
                    ${byproductOptions}
                </select>
            </div>
        </td>
        <td>
            <div class="byproduct-amt-list">
                <input type="number" class="byproduct-amount" data-frappe-ignore="true" step="0.01" min="0" />
            </div>
        </td>
        <td>
            <div class="byproduct-carbon-list">
                <span class="calculated-value byproduct-carbon">-</span>
                <button type="button" class="btn-add add-byproduct" title="Add byproduct">+</button>
            </div>
        </td>
        
        <td><span class="calculated-value co2-result">0.00</span></td>
    `;
    
    // Attach event listeners programmatically
    row.querySelector('.fuel-select').addEventListener('change', function() { handleFieldChange(this); });
    // Initial byproduct listeners
    row.querySelector('.byproduct-select').addEventListener('change', function() { handleFieldChange(this); });
    row.querySelector('.fuel-amount').addEventListener('input', function() { calculateRow(this); });
    row.querySelector('.bf-amount').addEventListener('input', function() { calculateRow(this); });
    row.querySelector('.coke-amount').addEventListener('input', function() { calculateRow(this); });
    row.querySelector('.cog-amount').addEventListener('input', function() { calculateRow(this); });
    row.querySelector('.byproduct-amount').addEventListener('input', function() { calculateRow(this); });
    const addBtn = row.querySelector('.add-byproduct');
    if (addBtn) addBtn.addEventListener('click', () => addByproductRow(row, byproductOptions));
    
    const rowData = {
        row,
        sno: currentSNo,
        date: today,
        unit: '',
        fuel: '', fuelAmount: 0, fuelCarbon: 0,
        bfAmount: 0, bfCarbon: carbonDefaults['Blast Furnace Gas']?.carbon_content || 0,
        cokeAmount: 0, cokeCarbon: carbonDefaults['Coke']?.carbon_content || 0,
        cogAmount: 0, cogCarbon: carbonDefaults['Coke Oven gas']?.carbon_content || 0,
        byproducts: [],
        co2: 0
    };
    
    entryRows.push(rowData);
    currentSNo++;
    
    // Set initial carbon contents
    updateCarbonContent(row);
    
    console.log('✓ Added entry row, total rows:', entryRows.length);
}

function updateCarbonContent(row) {
    // Set fixed carbon contents
    const bfCarbon = carbonDefaults['Blast Furnace Gas']?.carbon_content || 0;
    const cokeCarbon = carbonDefaults['Coke']?.carbon_content || 0;
    const cogCarbon = carbonDefaults['Coke Oven gas']?.carbon_content || 0;
    
    row.querySelector('.bf-carbon').textContent = bfCarbon.toFixed(4);
    row.querySelector('.coke-carbon').textContent = cokeCarbon.toFixed(4);
    row.querySelector('.cog-carbon').textContent = cogCarbon.toFixed(4);
}

function addByproductRow(row, byproductOptionsHtml) {
    const list = row.querySelector('.byproduct-list');
    const amtList = row.querySelector('.byproduct-amt-list');
    const carbonList = row.querySelector('.byproduct-carbon-list');
    if (!list || !amtList || !carbonList) return;
    const idx = list.children.length; // current items
    // Create elements
    const sel = document.createElement('select');
    sel.className = 'byproduct-select';
    sel.setAttribute('data-frappe-ignore', 'true');
    sel.innerHTML = `<option value="">Select...</option>${byproductOptionsHtml}`;
    list.appendChild(sel);

    const amt = document.createElement('input');
    amt.type = 'number';
    amt.className = 'byproduct-amount';
    amt.setAttribute('data-frappe-ignore', 'true');
    amt.step = '0.01';
    amt.min = '0';
    amtList.appendChild(amt);

    const wrap = document.createElement('div');
    wrap.className = 'bp-carbon-row';
    const span = document.createElement('span');
    span.className = 'calculated-value byproduct-carbon';
    span.textContent = '-';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-delete btn-mini-remove';
    removeBtn.textContent = '×';
    wrap.appendChild(span);
    wrap.appendChild(removeBtn);
    carbonList.insertBefore(wrap, carbonList.querySelector('.add-byproduct'));

    // Listeners
    sel.addEventListener('change', function() { handleFieldChange(this); });
    amt.addEventListener('input', function() { calculateRow(this); });
    removeBtn.addEventListener('click', function() {
        const i = Array.from(list.children).indexOf(sel);
        list.removeChild(sel);
        amtList.removeChild(amt);
        carbonList.removeChild(wrap);
        calculateRow(amtList); // trigger recalc
    });
}

function clearEntryRow(btn) {
    const row = btn.closest('tr');
    const index = Array.from(row.parentElement.children).indexOf(row);
    
    // Clear the row fields
    row.querySelector('.entry-date').value = new Date().toISOString().split('T')[0];
    row.querySelector('.unit-select').value = '';
    row.querySelector('.fuel-select').value = '';
    row.querySelector('.fuel-amount').value = '';
    row.querySelector('.fuel-carbon').textContent = '-';
    row.querySelector('.bf-amount').value = '';
    row.querySelector('.coke-amount').value = '';
    row.querySelector('.cog-amount').value = '';
    row.querySelector('.byproduct-select').value = '';
    row.querySelector('.byproduct-amount').value = '';
    row.querySelector('.byproduct-carbon').textContent = '-';
    row.querySelector('.co2-result').textContent = '0.00';
    
    // Reset row data
    entryRows[index] = {
        ...entryRows[index],
        date: new Date().toISOString().split('T')[0],
        unit: '',
        fuel: '', fuelAmount: 0, fuelCarbon: 0,
        bfAmount: 0,
        cokeAmount: 0,
        cogAmount: 0,
        byproduct: '', byproductAmount: 0, byproductCarbon: 0,
        co2: 0
    };
    
    calculateTotalCO2();
    console.log('✓ Cleared entry row');
}

/* ============================================
   Event Handlers
   ============================================ */

function attachEventListeners() {
    // Navigation buttons
    const nextBtn = $('#nextToCH4');
    if (nextBtn) nextBtn.addEventListener('click', () => { if (validateStep1()) goToStep(2); });

    const prevBtn = $('#prevToCO2');
    if (prevBtn) prevBtn.addEventListener('click', () => goToStep(1));

    const saveBtn = $('#saveEntryBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveEntry);

    // Modal
    const modalClose = $('#modalClose');
    if (modalClose) modalClose.addEventListener('click', closeModal);
    const modalOverlay = $('#modalOverlay');
    if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') closeModal(); });

    // Input listener for CH4 section
    const ch4Amount = $('#ch4CokeAmount');
    if (ch4Amount) ch4Amount.addEventListener('input', calculateCH4);

    // Tab button clicks
    $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const step = parseInt(btn.dataset.step);
            if (step === 2 && !validateStep1()) return; // keep flow step-wise if needed
            goToStep(step);
        });
    });

    console.log('✓ Event listeners attached (scoped)');
}

function handleFieldChange(select) {
    const row = select.closest('tr');
    const index = Array.from(row.parentElement.children).indexOf(row);
    
    if (select.classList.contains('fuel-select')) {
        const fuelName = select.value;
        if (fuelName && carbonDefaults[fuelName]) {
            const carbon = carbonDefaults[fuelName].carbon_content;
            row.querySelector('.fuel-carbon').textContent = carbon.toFixed(4);
            entryRows[index].fuel = fuelName;
            entryRows[index].fuelCarbon = carbon;
        } else {
            row.querySelector('.fuel-carbon').textContent = '-';
            entryRows[index].fuel = '';
            entryRows[index].fuelCarbon = 0;
        }
    } else if (select.classList.contains('byproduct-select')) {
        // Map to corresponding carbon span at same index
        const list = row.querySelector('.byproduct-list');
        const carbonList = row.querySelectorAll('.byproduct-carbon-list .byproduct-carbon');
        const i = Array.from(list.children).indexOf(select);
        const byproductName = select.value;
        const targetSpan = carbonList[i];
        if (targetSpan) {
            if (byproductName && carbonDefaults[byproductName]) {
                const carbon = carbonDefaults[byproductName].carbon_content;
                targetSpan.textContent = carbon.toFixed(4);
            } else {
                targetSpan.textContent = '-';
            }
        }
    }
    
    calculateRow(select);
}

function calculateRow(element) {
    const row = element.closest('tr');
    const index = Array.from(row.parentElement.children).indexOf(row);
    const rowData = entryRows[index];
    
    // Get all values
    const fuelAmount = parseFloat(row.querySelector('.fuel-amount').value) || 0;
    const bfAmount = parseFloat(row.querySelector('.bf-amount').value) || 0;
    const cokeAmount = parseFloat(row.querySelector('.coke-amount').value) || 0;
    const cogAmount = parseFloat(row.querySelector('.cog-amount').value) || 0;
    // Sum over all byproducts
    const bySel = Array.from(row.querySelectorAll('.byproduct-list .byproduct-select'));
    const byAmtInputs = Array.from(row.querySelectorAll('.byproduct-amt-list .byproduct-amount'));
    const byCarbonSpans = Array.from(row.querySelectorAll('.byproduct-carbon-list .byproduct-carbon'));
    
    // Update row data
    rowData.fuelAmount = fuelAmount;
    rowData.bfAmount = bfAmount;
    rowData.cokeAmount = cokeAmount;
    rowData.cogAmount = cogAmount;
    // Build byproducts and compute sum
    const byproducts = [];
    let byproductCarbonSum = 0;
    bySel.forEach((sel, i) => {
        const name = sel.value;
        const amt = parseFloat(byAmtInputs[i]?.value || '0') || 0;
        const carbonPerKg = parseFloat((byCarbonSpans[i]?.textContent || '').replace(/[^0-9.\-]/g, '')) || 0;
        if (name && amt > 0 && carbonPerKg > 0) {
            byproducts.push({ name, amount: amt, carbon: carbonPerKg });
            byproductCarbonSum += amt * carbonPerKg;
        }
    });
    rowData.byproducts = byproducts;

    // Calculate CO2 for this row
    const fuelCarbon = fuelAmount * rowData.fuelCarbon;
    const bfCarbon = bfAmount * rowData.bfCarbon;
    const cokeCarbon = cokeAmount * rowData.cokeCarbon;
    const cogCarbon = cogAmount * rowData.cogCarbon;
    const byproductCarbon = byproductCarbonSum;
    
    const netCarbon = fuelCarbon + bfCarbon - cokeCarbon - cogCarbon - byproductCarbon;
    const co2 = netCarbon * CO2_CONVERSION;
    
    rowData.co2 = co2;
    row.querySelector('.co2-result').textContent = co2.toFixed(2);
    
    // Calculate total
    calculateTotalCO2();
}

/* ============================================
   Calculations
   ============================================ */

function calculateTotalCO2() {
    const totalCO2 = entryRows.reduce((sum, row) => sum + row.co2, 0);
    const totalEl = document.getElementById('totalCO2');
    if (totalEl) totalEl.textContent = totalCO2.toFixed(2);
}

function calculateCH4() {
    const cokeAmount = parseFloat($('#ch4CokeAmount')?.value || '0') || 0;
    // CH4 factor is in g CH4 per unit coke; convert g -> kg by /1000
    const ch4 = (cokeAmount * CH4_FACTOR) / 1000; // kg CH4
    const out = $('#totalCH4');
    if (out) out.textContent = ch4.toFixed(2);
}

/* ============================================
   Step Navigation
   ============================================ */

function goToStep(stepNum) {
    currentStep = stepNum;
    
    // Update tab content visibility
    $$('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const activeContent = $(`.tab-content[data-step="${stepNum}"]`);
    if (activeContent) activeContent.classList.add('active');
    
    // Update tab button states
    $$('.tab-btn').forEach(btn => {
        const btnStep = parseInt(btn.dataset.step);
        btn.classList.remove('active', 'completed', 'disabled');
        
        if (btnStep === stepNum) {
            btn.classList.add('active');
        } else if (btnStep < stepNum) {
            btn.classList.add('completed');
        } else {
            btn.classList.add('disabled');
        }
    });
    
    // Update progress
    updateProgress();
    
    // If moving to step 2, sync basic info
    if (stepNum === 2) { syncStep2BasicInfo(); }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
    const progressBar = document.getElementById('progressBar');
    const stepCounter = document.getElementById('stepCounter');
    if (!progressBar || !stepCounter) return; // No progress UI on this form
    const progress = (currentStep / 2) * 100;
    progressBar.style.width = `${progress}%`;
    stepCounter.textContent = `Step ${currentStep} of 2`;
}

function syncStep2BasicInfo() {
    const sno = $('#snoDisplay')?.textContent || '-';
    const date = $('#entryDate')?.value || '';
    const unitSel = $('#unitSelect');
    const unit = unitSel ? unitSel.options[unitSel.selectedIndex]?.text || '-' : '-';
    const sno2 = $('#snoDisplay2');
    const date2 = $('#dateDisplay2');
    const unit2 = $('#unitDisplay2');
    if (sno2) sno2.textContent = sno;
    if (date2) date2.textContent = date ? new Date(date).toLocaleDateString() : '-';
    if (unit2) unit2.textContent = unit;
}

/* ============================================
   Validation
   ============================================ */

function validateStep1() {
    const row = $('.entry-row');
    if (!row) return false;
    const date = $('#entryDate')?.value || '';
    const unit = $('#unitSelect')?.value || '';
    if (!date) {
        frappe.msgprint({ title: 'Validation Error', indicator: 'red', message: 'Please select a date.' });
        return false;
    }
    if (!unit) {
        frappe.msgprint({ title: 'Validation Error', indicator: 'red', message: 'Please select a unit.' });
        return false;
    }
    const fuelAmount = parseFloat(row.querySelector('.fuel-amount')?.value || '0');
    const bfAmount = parseFloat(row.querySelector('.bf-amount')?.value || '0');
    const cokeAmount = parseFloat(row.querySelector('.coke-amount')?.value || '0');
    const cogAmount = parseFloat(row.querySelector('.cog-amount')?.value || '0');
    const bypAmount = parseFloat(row.querySelector('.byproduct-amount')?.value || '0');
    const anyAmount = [fuelAmount, bfAmount, cokeAmount, cogAmount, bypAmount].some(v => v > 0);
    if (!anyAmount) {
        frappe.msgprint({ title: 'Validation Error', indicator: 'red', message: 'Please enter at least one amount in Step 1.' });
        return false;
    }
    return true;
}

/* ============================================
   Save Entry
   ============================================ */

async function saveEntry() {
    try {
        // Validate
        const cokeAmount = parseFloat($('#ch4CokeAmount')?.value || '0') || 0;
        if (cokeAmount <= 0) {
            frappe.msgprint({
                title: 'Validation Error',
                indicator: 'red',
                message: 'Please enter coke produced amount for CH4 calculation.'
            });
            return;
        }
        
        // Gather data
        const date = $('#entryDate')?.value || '';
        const unit = $('#unitSelect')?.value || '';

        // From single entry row
        const row = $('.entry-row');
        const rowData = entryRows[0] || {};
        const fuel = rowData.fuel;
        const fuelAmount = parseFloat(row.querySelector('.fuel-amount')?.value || '0');
        const fuelCarbon = rowData.fuelCarbon || 0;
        const cokingCoalData = (fuel && fuelAmount > 0) ? [{ fuel, amount: fuelAmount, carbon_content: fuelCarbon }] : [];

        // Byproducts (support multiple)
        const byproductsData = (rowData.byproducts || []).map(b => ({
            byproduct: b.name,
            amount: b.amount,
            carbon_content: b.carbon
        }));

        // Other CO2 inputs
        const bfAmount = parseFloat($('#bfAmount')?.value || '0') || 0;
        const bfCarbon = carbonDefaults['Blast Furnace Gas']?.carbon_content || 0;
        const cokeProducedAmount = parseFloat($('#cokeAmount')?.value || '0') || 0;
        const cokeCarbon = carbonDefaults['Coke']?.carbon_content || 0;
        const cogAmount = parseFloat($('#cogAmount')?.value || '0') || 0;
        const cogCarbon = carbonDefaults['Coke Oven gas']?.carbon_content || 0;
        
        // Calculated totals (sum from state, not from DOM)
        const co2Total = entryRows.reduce((sum, r) => sum + (r?.co2 || 0), 0);
        // Ensure CH4 total uses current input and fixed EF
        const ch4Total = (cokeAmount * CH4_FACTOR) / 1000; // kg
        
        // Create DocType entry
        const doc = {
            doctype: 'Coke Production Emissions',
            date: date,
            company: userCompany,
            unit: unit,
            coking_coal_consumed_json: JSON.stringify(cokingCoalData),
            blast_furnace_gas_amount: bfAmount,
            blast_furnace_gas_carbon_content: bfCarbon,
            coke_produced_amount: cokeProducedAmount,
            coke_produced_carbon_content: cokeCarbon,
            coke_oven_gas_amount: cogAmount,
            coke_oven_gas_carbon_content: cogCarbon,
            byproducts_json: JSON.stringify(byproductsData),
            co2_emissions_tonnes: co2Total,
            ch4_coke_produced_tonnes: cokeAmount,
            ch4_emission_factor: CH4_FACTOR,
            ch4_emissions_kg: ch4Total
        };
        
        const insertResp = await frappe.call({
            method: 'frappe.client.insert',
            args: { doc: doc }
        });
        
        frappe.msgprint({
            title: 'Success',
            indicator: 'green',
            message: 'Entry saved successfully!'
        });
        
        // Optimistically append to history table
        if (insertResp && insertResp.message) {
            appendHistoryRow(insertResp.message);
        }

        // Clear form and reload
        clearForm();
        loadHistory();
    } catch (error) {
        console.error('Error saving entry:', error);
        frappe.msgprint({
            title: 'Save Error',
            indicator: 'red',
            message: `Failed to save entry: ${error.message || 'Unknown error'}`
        });
    }
}

function clearForm() {
    // Reset to step 1
    goToStep(1);
    // Clear Step 1 row
    const row = $('.entry-row');
    if (row) {
        row.querySelector('#entryDate').valueAsDate = new Date();
        row.querySelector('#unitSelect').value = '';
        row.querySelector('.fuel-select').value = '';
        row.querySelector('.fuel-amount').value = '';
        row.querySelector('.fuel-carbon').textContent = '-';
        row.querySelector('#bfAmount').value = '';
        row.querySelector('.bf-carbon').textContent = '-';
        row.querySelector('#cokeAmount').value = '';
        row.querySelector('.coke-carbon').textContent = '-';
        row.querySelector('#cogAmount').value = '';
        row.querySelector('.cog-carbon').textContent = '-';
        row.querySelector('.byproduct-select').value = '';
        row.querySelector('.byproduct-amount').value = '';
        row.querySelector('.byproduct-carbon').textContent = '-';
        row.querySelector('.co2-result').textContent = '0.00';
    }
    const tco2 = $('#totalCO2');
    if (tco2) tco2.textContent = '0.00';
    const ch4Amt = $('#ch4CokeAmount');
    if (ch4Amt) ch4Amt.value = '';
    const tch4 = $('#totalCH4');
    if (tch4) tch4.textContent = '0.00';
    // Increment S.No
    currentSNo++;
    const snoDisp = $('#snoDisplay');
    if (snoDisp) snoDisp.textContent = currentSNo;
}

/* ============================================
   History
   ============================================ */

async function loadHistory() {
    try {
        const response = await frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Coke Production Emissions',
                fields: ['name', 'date', 'unit', 'company', 'co2_emissions_tonnes', 'ch4_emissions_kg'],
                filters: userCompany ? { company: userCompany } : {},
                order_by: 'date desc',
                limit_page_length: 1000
            }
        });
        
        const tbody = $('#historyBody');
        if (!tbody) return; // history not present on this page
        tbody.innerHTML = '';
        
        if (response.message && response.message.length > 0) {
            // Update S.No based on history count
            currentSNo = response.message.length + 1;
            const snoDispEl = document.getElementById('snoDisplay');
            if (snoDispEl) snoDispEl.textContent = currentSNo;

            response.message.forEach((entry, idx) => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${response.message.length - idx}</td>
                    <td>${new Date(entry.date).toLocaleDateString()}</td>
                    <td>${entry.unit}</td>
                    <td>${Number(entry.co2_emissions_tonnes || 0).toFixed(2)}</td>
                    <td>${Number(entry.ch4_emissions_kg || 0).toFixed(2)}</td>
                    <td>
                        <button class="btn-expand" onclick="showEntryDetails('${entry.name}')">👁 View</button>
                        <button class="btn-history-delete" onclick="deleteEntry('${entry.name}')">🗑 Delete</button>
                    </td>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No entries yet. Start by filling the form above.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function appendHistoryRow(entry) {
    const tbody = $('#historyBody');
    if (!tbody || !entry) return;
    // Prepend new row
    const row = tbody.insertRow(0);
    row.innerHTML = `
        <td>—</td>
        <td>${entry.date ? new Date(entry.date).toLocaleDateString() : '-'}</td>
        <td>${entry.unit || '-'}</td>
        <td>${(entry.co2_emissions_tonnes ?? 0).toFixed ? entry.co2_emissions_tonnes.toFixed(2) : Number(entry.co2_emissions_tonnes || 0).toFixed(2)}</td>
        <td>${(entry.ch4_emissions_kg ?? 0).toFixed ? entry.ch4_emissions_kg.toFixed(2) : Number(entry.ch4_emissions_kg || 0).toFixed(2)}</td>
        <td>
            <button class="btn-expand" onclick="showEntryDetails('${entry.name}')">👁 View</button>
            <button class="btn-history-delete" onclick="deleteEntry('${entry.name}')">🗑 Delete</button>
        </td>
    `;
}

async function showEntryDetails(entryName) {
    try {
        const response = await frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Coke Production Emissions',
                name: entryName
            }
        });
        
        const entry = response.message;
        const cokingCoalData = JSON.parse(entry.coking_coal_consumed_json || '[]');
        const byproductsData = JSON.parse(entry.byproducts_json || '[]');
        const hasByp = Array.isArray(byproductsData) && byproductsData.length > 0;
        
        const modalBody = $('#modalBody');
        if (!modalBody) return;
        modalBody.innerHTML = `
            <div class="modal-section">
                <h3>Basic Information</h3>
                <div class="modal-row">
                    <span class="modal-label">Date:</span>
                    <span class="modal-value">${new Date(entry.date).toLocaleDateString()}</span>
                </div>
                <div class="modal-row">
                    <span class="modal-label">Unit:</span>
                    <span class="modal-value">${entry.unit}</span>
                </div>
            </div>
            
            <div class="modal-section">
                <h3>CO2 Emissions</h3>
                <div class="modal-row">
                    <span class="modal-label">Coking Coal Consumed:</span>
                </div>
                <ul class="modal-list">
                    ${cokingCoalData.map(item => `<li>${item.fuel}: ${item.amount} t (C: ${item.carbon_content.toFixed(4)})</li>`).join('')}
                </ul>
                <div class="modal-row">
                    <span class="modal-label">Blast Furnace Gas:</span>
                    <span class="modal-value">${entry.blast_furnace_gas_amount} t (C: ${entry.blast_furnace_gas_carbon_content.toFixed(4)})</span>
                </div>
                <div class="modal-row">
                    <span class="modal-label">Coke Produced:</span>
                    <span class="modal-value">${entry.coke_produced_amount} t (C: ${entry.coke_produced_carbon_content.toFixed(4)})</span>
                </div>
                <div class="modal-row">
                    <span class="modal-label">Coke Oven Gas:</span>
                    <span class="modal-value">${entry.coke_oven_gas_amount} t (C: ${entry.coke_oven_gas_carbon_content.toFixed(4)})</span>
                </div>
                <div class="modal-row">
                    <span class="modal-label">Coke-oven Byproducts transferred offsite:</span>
                </div>
                ${hasByp ? `
                <ul class="modal-list">
                    ${byproductsData.map(item => `<li>${item.byproduct}: ${item.amount} t (C: ${item.carbon_content.toFixed(4)})</li>`).join('')}
                </ul>
                ` : `<div class="modal-row"><span class="modal-value">—</span></div>`}
                <div class="modal-row" style="border-top: 2px solid #667eea; margin-top: 10px; padding-top: 10px;">
                    <span class="modal-label" style="font-size: 16px; font-weight: 700;">Total CO2:</span>
                    <span class="modal-value" style="font-size: 16px; font-weight: 700; color: #667eea;">${Number(entry.co2_emissions_tonnes || 0).toFixed(2)} tonnes</span>
                </div>
            </div>
            
            <div class="modal-section">
                <h3>CH4 Emissions</h3>
                <div class="modal-row">
                    <span class="modal-label">Coke Produced Onsite:</span>
                    <span class="modal-value">${entry.ch4_coke_produced_tonnes} t</span>
                </div>
                <div class="modal-row">
                    <span class="modal-label">Emission Factor:</span>
                    <span class="modal-value">${entry.ch4_emission_factor} g CH4/unit</span>
                </div>
                <div class="modal-row" style="border-top: 2px solid #667eea; margin-top: 10px; padding-top: 10px;">
                    <span class="modal-label" style="font-size: 16px; font-weight: 700;">Total CH4:</span>
                    <span class="modal-value" style="font-size: 16px; font-weight: 700; color: #667eea;">${entry.ch4_emissions_kg.toFixed(2)} kg</span>
                </div>
            </div>
        `;
        
        const overlay = $('#modalOverlay');
        if (overlay) overlay.classList.add('active');
    } catch (error) {
        console.error('Error loading entry details:', error);
        frappe.msgprint({
            title: 'Load Error',
            indicator: 'red',
            message: 'Failed to load entry details.'
        });
    }
}

function closeModal() {
    const overlay = $('#modalOverlay');
    if (overlay) overlay.classList.remove('active');
}

async function deleteEntry(entryName) {
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
        return;
    }
    
    try {
        await frappe.call({
            method: 'frappe.client.delete',
            args: {
                doctype: 'Coke Production Emissions',
                name: entryName
            }
        });
        
        frappe.msgprint({
            title: 'Success',
            indicator: 'green',
            message: 'Entry deleted successfully.'
        });
        
        loadHistory();
    } catch (error) {
        console.error('Error deleting entry:', error);
        frappe.msgprint({
            title: 'Delete Error',
            indicator: 'red',
            message: 'Failed to delete entry.'
        });
    }
}

// Make functions globally accessible for inline event handlers
if (typeof window !== 'undefined') {
    window.handleFieldChange = handleFieldChange;
    window.calculateRow = calculateRow;
    window.clearEntryRow = clearEntryRow;
    window.showEntryDetails = showEntryDetails;
    window.deleteEntry = deleteEntry;
}

})(); // Close IIFE
