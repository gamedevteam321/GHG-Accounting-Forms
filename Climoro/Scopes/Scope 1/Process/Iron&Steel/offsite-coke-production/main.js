/* ============================================
   Offsite Coke Production - GHG Emissions
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
    
    // Fixed carbon content values for offsite production
    const OFFSITE_CARBON_CONTENT = {
        'Coke': 0.83,           // Coke produced offsite
        'Coke Oven gas': 0.47  // Coke oven gas produced offsite
    };

    // State
    let currentStep = 1;
    let currentSNo = 1;
    let carbonDefaults = {};
    let userCompany = '';
    let userUnits = [];
    let entryRows = [];
    let heatingBasis = '';

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
        
        console.log('🚀 Initializing Offsite Coke Production form...');
        
        await loadCarbonDefaults();
        await loadUserContext();
        buildUI();
        attachEventListeners();
        updateProgress();
        await loadHistory();
        
        console.log('✅ Offsite Coke Production form initialized successfully');
    } catch (error) {
        console.error('❌ Initialization Error:', error);
        frappe.msgprint({
            title: 'Initialization Error',
            indicator: 'red',
            message: `Failed to initialize form: ${error.message}`
        });
    }
}

async function loadCarbonDefaults() {
    try {
        const response = await frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Carbon Content Defaults',
                fields: ['fuel_name', 'carbon_content_kg_per_kg', 'category'],
                filters: { is_active: 1 },
                limit_page_length: 1000
            }
        });
        
        if (!response.message || response.message.length === 0) {
            console.warn('⚠️ No carbon content defaults found. Please ensure Carbon Content Defaults DocType is seeded.');
            frappe.msgprint({
                title: 'Warning',
                indicator: 'orange',
                message: 'Carbon Content Defaults DocType is empty. Please run the seeding script.'
            });
            return;
        }
        
        // Build lookup object
        carbonDefaults = {};
        response.message.forEach(item => {
            carbonDefaults[item.fuel_name] = {
                carbon_content: item.carbon_content_kg_per_kg,
                category: item.category
            };
        });
        
        console.log(`✓ Loaded ${response.message.length} carbon content defaults`);
    } catch (error) {
        console.error('❌ Error loading carbon defaults:', error);
        frappe.msgprint({
            title: 'Error',
            indicator: 'red',
            message: 'Failed to load carbon content defaults. Please ensure the DocType exists.'
        });
    }
}

async function loadUserContext() {
    try {
        // Get current user's company
        const userResponse = await frappe.call({
            method: 'frappe.client.get_value',
            args: {
                doctype: 'User',
                fieldname: 'company',
                filters: { name: frappe.session.user }
            }
        });
        
        if (userResponse.message && userResponse.message.company) {
            userCompany = userResponse.message.company;
        } else {
            // Fallback: get first company
            const companyResponse = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Company',
                    fields: ['name'],
                    limit_page_length: 1
                }
            });
            if (companyResponse.message && companyResponse.message.length > 0) {
                userCompany = companyResponse.message[0].name;
            }
        }
        
        // Get units for the company
        if (userCompany) {
            const unitsResponse = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Units',
                    fields: ['name'],
                    filters: { company: userCompany },
                    limit_page_length: 1000
                }
            });
            
            if (unitsResponse.message) {
                userUnits = unitsResponse.message;
            }
        }
        
        // Fallback: load all units if company-specific units not found
        if (userUnits.length === 0) {
            const allUnitsResponse = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Units',
                    fields: ['name'],
                    limit_page_length: 1000
                }
            });
            
            if (allUnitsResponse.message) {
                userUnits = allUnitsResponse.message;
            }
        }
        
        console.log(`✓ User context loaded: Company=${userCompany}, Units=${userUnits.length}`);
    } catch (error) {
        console.error('❌ Error loading user context:', error);
        userCompany = 'Default Company';
        userUnits = [];
    }
}

function buildUI() {
    addEntryRow();
    console.log('✓ UI built with entry row');
}

function addEntryRow() {
    const tbody = $('#cokeProductionBody');
    if (!tbody) {
        console.error('❌ Could not find cokeProductionBody');
        return;
    }
    
    // Build dropdown options
    const unitOptions = userUnits.map(unit => 
        `<option value="${unit.name}">${unit.name}</option>`
    ).join('');
    
    const fuelOptions = Object.keys(carbonDefaults).map(fuel => 
        `<option value="${fuel}">${fuel}</option>`
    ).join('');
    
    const byproductOptions = Object.keys(carbonDefaults).map(fuel => 
        `<option value="${fuel}">${fuel}</option>`
    ).join('');
    
    const row = document.createElement('tr');
    row.className = 'entry-row';
    tbody.appendChild(row);

    
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
            <div class="fuel-list">
                <select class="fuel-select" data-frappe-ignore="true">
                    <option value="">Select...</option>
                    ${fuelOptions}
                </select>
            </div>
        </td>
        <td>
            <div class="fuel-amt-list">
                <input type="number" class="fuel-amount" data-frappe-ignore="true" step="0.01" min="0" />
            </div>
        </td>
        <td>
            <div class="fuel-carbon-list">
                <span class="calculated-value fuel-carbon">-</span>
                <button type="button" class="btn-add add-fuel" title="Add fuel">+</button>
            </div>
        </td>
        <td><span class="calculated-value fuel-total-carbon">0.00</span></td>
        
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
    const fuelSelect = row.querySelector('.fuel-select');
    const fuelAmount = row.querySelector('.fuel-amount');
    const cokeAmount = row.querySelector('.coke-amount');
    const cogAmount = row.querySelector('.cog-amount');
    const byproductSelect = row.querySelector('.byproduct-select');
    const byproductAmount = row.querySelector('.byproduct-amount');
    const addFuelBtn = row.querySelector('.add-fuel');
    const addByproductBtn = row.querySelector('.add-byproduct');
    
    if (fuelSelect) fuelSelect.addEventListener('change', handleFieldChange);
    if (fuelAmount) fuelAmount.addEventListener('input', handleFieldChange);
    if (cokeAmount) cokeAmount.addEventListener('input', handleFieldChange);
    if (cogAmount) cogAmount.addEventListener('input', handleFieldChange);
    if (byproductSelect) byproductSelect.addEventListener('change', handleFieldChange);
    if (byproductAmount) byproductAmount.addEventListener('input', handleFieldChange);
    if (addFuelBtn) addFuelBtn.addEventListener('click', () => addFuelRow(row));
    if (addByproductBtn) addByproductBtn.addEventListener('click', () => addByproductRow(row));
    
    // Set fixed carbon content for coke and COG
    updateOffsiteCarbon();
    
    console.log('✓ Entry row added with event listeners');
}

function updateOffsiteCarbon() {
    const row = $('.entry-row');
    if (!row) return;
    
    // Set fixed carbon content for coke produced offsite
    const cokeCarbon = row.querySelector('.coke-carbon');
    if (cokeCarbon) {
        cokeCarbon.textContent = OFFSITE_CARBON_CONTENT['Coke'].toFixed(4);
    }
    
    // Set fixed carbon content for coke oven gas produced offsite
    const cogCarbon = row.querySelector('.cog-carbon');
    if (cogCarbon) {
        cogCarbon.textContent = OFFSITE_CARBON_CONTENT['Coke Oven gas'].toFixed(4);
    }
}

function addFuelRow(parentRow) {
    const fuelList = parentRow.querySelector('.fuel-list');
    const fuelAmtList = parentRow.querySelector('.fuel-amt-list');
    const fuelCarbonList = parentRow.querySelector('.fuel-carbon-list');
    
    if (!fuelList || !fuelAmtList || !fuelCarbonList) return;
    
    const fuelOptions = Object.keys(carbonDefaults).map(fuel => 
        `<option value="${fuel}">${fuel}</option>`
    ).join('');
    
    // Create new fuel row
    const newFuelSelect = document.createElement('select');
    newFuelSelect.className = 'fuel-select';
    newFuelSelect.setAttribute('data-frappe-ignore', 'true');
    newFuelSelect.innerHTML = `<option value="">Select...</option>${fuelOptions}`;
    newFuelSelect.addEventListener('change', handleFieldChange);
    
    const newFuelAmount = document.createElement('input');
    newFuelAmount.type = 'number';
    newFuelAmount.className = 'fuel-amount';
    newFuelAmount.setAttribute('data-frappe-ignore', 'true');
    newFuelAmount.step = '0.01';
    newFuelAmount.min = '0';
    newFuelAmount.addEventListener('input', handleFieldChange);
    
    // Create container for carbon content and remove button
    const carbonContainer = document.createElement('div');
    carbonContainer.className = 'carbon-row';
    carbonContainer.style.display = 'flex';
    carbonContainer.style.alignItems = 'center';
    carbonContainer.style.gap = '8px';
    carbonContainer.style.marginTop = '4px';
    
    const newFuelCarbon = document.createElement('span');
    newFuelCarbon.className = 'calculated-value fuel-carbon';
    newFuelCarbon.textContent = '-';
    newFuelCarbon.style.minWidth = '60px';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-mini-remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove fuel';
    removeBtn.addEventListener('click', () => {
        newFuelSelect.remove();
        newFuelAmount.remove();
        carbonContainer.remove();
        handleFieldChange();
    });
    
    carbonContainer.appendChild(newFuelCarbon);
    carbonContainer.appendChild(removeBtn);
    
    fuelList.appendChild(newFuelSelect);
    fuelAmtList.appendChild(newFuelAmount);
    fuelCarbonList.insertBefore(carbonContainer, fuelCarbonList.querySelector('.add-fuel'));
}

function addByproductRow(parentRow) {
    const byproductList = parentRow.querySelector('.byproduct-list');
    const byproductAmtList = parentRow.querySelector('.byproduct-amt-list');
    const byproductCarbonList = parentRow.querySelector('.byproduct-carbon-list');
    
    if (!byproductList || !byproductAmtList || !byproductCarbonList) return;
    
    const byproductOptions = Object.keys(carbonDefaults).map(fuel => 
        `<option value="${fuel}">${fuel}</option>`
    ).join('');
    
    // Create new byproduct row
    const newByproductSelect = document.createElement('select');
    newByproductSelect.className = 'byproduct-select';
    newByproductSelect.setAttribute('data-frappe-ignore', 'true');
    newByproductSelect.innerHTML = `<option value="">Select...</option>${byproductOptions}`;
    newByproductSelect.addEventListener('change', handleFieldChange);
    
    const newByproductAmount = document.createElement('input');
    newByproductAmount.type = 'number';
    newByproductAmount.className = 'byproduct-amount';
    newByproductAmount.setAttribute('data-frappe-ignore', 'true');
    newByproductAmount.step = '0.01';
    newByproductAmount.min = '0';
    newByproductAmount.addEventListener('input', handleFieldChange);
    
    // Create container for carbon content and remove button
    const carbonContainer = document.createElement('div');
    carbonContainer.className = 'carbon-row';
    carbonContainer.style.display = 'flex';
    carbonContainer.style.alignItems = 'center';
    carbonContainer.style.gap = '8px';
    carbonContainer.style.marginTop = '4px';
    
    const newByproductCarbon = document.createElement('span');
    newByproductCarbon.className = 'calculated-value byproduct-carbon';
    newByproductCarbon.textContent = '-';
    newByproductCarbon.style.minWidth = '60px';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-mini-remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove byproduct';
    removeBtn.addEventListener('click', () => {
        newByproductSelect.remove();
        newByproductAmount.remove();
        carbonContainer.remove();
        handleFieldChange();
    });
    
    carbonContainer.appendChild(newByproductCarbon);
    carbonContainer.appendChild(removeBtn);
    
    byproductList.appendChild(newByproductSelect);
    byproductAmtList.appendChild(newByproductAmount);
    byproductCarbonList.insertBefore(carbonContainer, byproductCarbonList.querySelector('.add-byproduct'));
}

function handleFieldChange() {
    const row = $('.entry-row');
    if (!row) return;
    
    // Update fuel carbon content displays
    const fuelSelects = row.querySelectorAll('.fuel-select');
    const fuelCarbons = row.querySelectorAll('.fuel-carbon');
    fuelSelects.forEach((select, index) => {
        if (fuelCarbons[index]) {
            const fuel = select.value;
            if (fuel && carbonDefaults[fuel]) {
                fuelCarbons[index].textContent = carbonDefaults[fuel].carbon_content.toFixed(4);
            } else {
                fuelCarbons[index].textContent = '-';
            }
        }
    });
    
    // Update byproduct carbon content displays
    const byproductSelects = row.querySelectorAll('.byproduct-select');
    const byproductCarbons = row.querySelectorAll('.byproduct-carbon');
    byproductSelects.forEach((select, index) => {
        if (byproductCarbons[index]) {
            const byproduct = select.value;
            if (byproduct && carbonDefaults[byproduct]) {
                byproductCarbons[index].textContent = carbonDefaults[byproduct].carbon_content.toFixed(4);
            } else {
                byproductCarbons[index].textContent = '-';
            }
        }
    });
    
    // Calculate total fuel carbon
    calculateTotalFuelCarbon();
    
    // Calculate CO2 for this row
    calculateRow();
}

function calculateTotalFuelCarbon() {
    const row = $('.entry-row');
    if (!row) return;
    
    let totalFuelCarbon = 0;
    const fuelSelects = row.querySelectorAll('.fuel-select');
    const fuelAmounts = row.querySelectorAll('.fuel-amount');
    
    fuelSelects.forEach((select, index) => {
        const fuel = select.value;
        const amount = parseFloat(fuelAmounts[index]?.value || '0') || 0;
        if (fuel && carbonDefaults[fuel] && amount > 0) {
            totalFuelCarbon += amount * carbonDefaults[fuel].carbon_content;
        }
    });
    
    const totalFuelCarbonDisplay = row.querySelector('.fuel-total-carbon');
    if (totalFuelCarbonDisplay) {
        totalFuelCarbonDisplay.textContent = totalFuelCarbon.toFixed(4);
    }
}

function calculateRow() {
    const row = $('.entry-row');
    if (!row) return;
    
    // Get total fuel carbon
    const totalFuelCarbon = parseFloat(row.querySelector('.fuel-total-carbon')?.textContent || '0') || 0;
    
    // Get coke produced offsite
    const cokeAmount = parseFloat(row.querySelector('.coke-amount')?.value || '0') || 0;
    const cokeCarbon = OFFSITE_CARBON_CONTENT['Coke'];
    
    // Get coke oven gas produced offsite
    const cogAmount = parseFloat(row.querySelector('.cog-amount')?.value || '0') || 0;
    const cogCarbon = OFFSITE_CARBON_CONTENT['Coke Oven gas'];
    
    // Get total byproduct carbon
    let totalByproductCarbon = 0;
    const byproductSelects = row.querySelectorAll('.byproduct-select');
    const byproductAmounts = row.querySelectorAll('.byproduct-amount');
    
    byproductSelects.forEach((select, index) => {
        const byproduct = select.value;
        const amount = parseFloat(byproductAmounts[index]?.value || '0') || 0;
        if (byproduct && carbonDefaults[byproduct] && amount > 0) {
            totalByproductCarbon += amount * carbonDefaults[byproduct].carbon_content;
        }
    });
    
    // OFFSITE FORMULA: (Total Fuel Carbon - Coke Carbon - COG Carbon - Byproduct Carbon) * (44/12)
    // Note: No Blast Furnace gas for offsite production
    const co2 = (totalFuelCarbon - (cokeAmount * cokeCarbon) - (cogAmount * cogCarbon) - totalByproductCarbon) * CO2_CONVERSION;
    
    // Update display
    const co2Display = row.querySelector('.co2-result');
    if (co2Display) {
        co2Display.textContent = Math.max(0, co2).toFixed(2);
    }
    
    console.log(`CO2 calculation: (${totalFuelCarbon} - ${cokeAmount * cokeCarbon} - ${cogAmount * cogCarbon} - ${totalByproductCarbon}) * ${CO2_CONVERSION} = ${co2.toFixed(2)}`);
}

function attachEventListeners() {
    // Tab navigation
    const nextBtn = $('#nextToCH4');
    const prevBtn = $('#prevToCO2');
    const saveBtn = $('#saveEntryBtn');
    const modalClose = $('#modalClose');
    const ch4AmountInput = $('#ch4CokeAmount');
    
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (validateStep1()) {
            goToStep(2);
        }
    });
    
    if (prevBtn) prevBtn.addEventListener('click', () => goToStep(1));
    if (saveBtn) saveBtn.addEventListener('click', saveEntry);
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (ch4AmountInput) ch4AmountInput.addEventListener('input', calculateCH4);
    
    console.log('✓ Event listeners attached (scoped)');
}

function goToStep(stepNum) {
    currentStep = stepNum;
    
    // Update tab buttons
    const tabBtns = $$('.tab-btn');
    tabBtns.forEach((btn, index) => {
        btn.classList.toggle('active', index + 1 === stepNum);
    });
    
    // Update tab content
    const tabContents = $$('.tab-content');
    tabContents.forEach((content, index) => {
        content.classList.toggle('active', index + 1 === stepNum);
    });
    
    // Update Step 2 displays if moving to Step 2
    if (stepNum === 2) {
        const date = $('#entryDate')?.value || '';
        const unit = $('#unitSelect')?.selectedOptions[0]?.text || '';
        
        const snoDisplay2 = $('#snoDisplay2');
        const dateDisplay2 = $('#dateDisplay2');
        const unitDisplay2 = $('#unitDisplay2');
        
        if (snoDisplay2) snoDisplay2.textContent = currentSNo;
        if (dateDisplay2) dateDisplay2.textContent = date ? new Date(date).toLocaleDateString() : '-';
        if (unitDisplay2) unitDisplay2.textContent = unit || '-';
    }
    
    console.log(`✓ Moved to step ${stepNum}`);
}

function updateProgress() {
    // This function can be used for progress indicators if needed
}

function validateStep1() {
    const row = $('.entry-row');
    if (!row) return false;
    
    const hb = $('#heatingBasisSelect')?.value || '';
    if (!hb) {
        frappe.msgprint({ title: 'Validation Error', indicator: 'red', message: 'Please select Basis of Heating Values (NCV or GCV).' });
        return false;
    }
    heatingBasis = hb;
    
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
    const cokeAmount = parseFloat(row.querySelector('.coke-amount')?.value || '0');
    const cogAmount = parseFloat(row.querySelector('.cog-amount')?.value || '0');
    const bypAmount = parseFloat(row.querySelector('.byproduct-amount')?.value || '0');
    const anyAmount = [fuelAmount, cokeAmount, cogAmount, bypAmount].some(v => v > 0);
    
    if (!anyAmount) {
        frappe.msgprint({ title: 'Validation Error', indicator: 'red', message: 'Please enter at least one amount in Step 1.' });
        return false;
    }
    return true;
}

function calculateCH4() {
    const cokeAmount = parseFloat($('#ch4CokeAmount')?.value || '0') || 0;
    const ch4Total = (cokeAmount * CH4_FACTOR) / 1000; // Convert g to kg
    
    const ch4Display = $('#totalCH4');
    if (ch4Display) {
        ch4Display.textContent = ch4Total.toFixed(5);
    }
}

async function saveEntry() {
    try {
        const date = $('#entryDate')?.value || '';
        const unit = $('#unitSelect')?.value || '';
        const cokeAmount = parseFloat($('#ch4CokeAmount')?.value || '0') || 0;
        
        if (!date || !unit || cokeAmount <= 0) {
            frappe.msgprint({ title: 'Validation Error', indicator: 'red', message: 'Please fill all required fields in Step 2.' });
            return;
        }
        
        // Gather coking coal data
        const row = $('.entry-row');
        const fuelSelects = row.querySelectorAll('.fuel-select');
        const fuelAmounts = row.querySelectorAll('.fuel-amount');
        const cokingCoalData = [];
        
        fuelSelects.forEach((select, index) => {
            const fuel = select.value;
            const amount = parseFloat(fuelAmounts[index]?.value || '0') || 0;
            if (fuel && amount > 0) {
                cokingCoalData.push({
                    fuel: fuel,
                    amount: amount,
                    carbon_content: carbonDefaults[fuel]?.carbon_content || 0
                });
            }
        });
        
        // Gather byproducts data
        const byproductSelects = row.querySelectorAll('.byproduct-select');
        const byproductAmounts = row.querySelectorAll('.byproduct-amount');
        const byproductsData = [];
        
        byproductSelects.forEach((select, index) => {
            const byproduct = select.value;
            const amount = parseFloat(byproductAmounts[index]?.value || '0') || 0;
            if (byproduct && amount > 0) {
                byproductsData.push({
                    byproduct: byproduct,
                    amount: amount,
                    carbon_content: carbonDefaults[byproduct]?.carbon_content || 0
                });
            }
        });
        
        // Other inputs
        const cokeProducedAmount = parseFloat($('#cokeAmount')?.value || '0') || 0;
        const cogAmount = parseFloat($('#cogAmount')?.value || '0') || 0;
        
        // Calculated totals
        const co2Total = parseFloat(row.querySelector('.co2-result')?.textContent || '0') || 0;
        const ch4Total = (cokeAmount * CH4_FACTOR) / 1000; // kg
        
        // Create DocType entry
        const doc = {
            doctype: 'Offsite Coke Production Emissions',
            date: date,
            company: userCompany,
            unit: unit,
            heating_basis: heatingBasis,
            coking_coal_consumed_json: JSON.stringify(cokingCoalData),
            coke_produced_offsite_amount: cokeProducedAmount,
            coke_produced_offsite_carbon_content: OFFSITE_CARBON_CONTENT['Coke'],
            coke_oven_gas_offsite_amount: cogAmount,
            coke_oven_gas_offsite_carbon_content: OFFSITE_CARBON_CONTENT['Coke Oven gas'],
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
        
        // Add to history optimistically
        appendHistoryRow(insertResp.message);
        
        // Clear form and reload history
        clearForm();
        await loadHistory();
        
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
    
    // Clear heating basis
    const heatingBasisSelect = $('#heatingBasisSelect');
    if (heatingBasisSelect) heatingBasisSelect.value = '';
    heatingBasis = '';
    
    // Clear Step 1 row
    const row = $('.entry-row');
    if (row) {
        row.querySelector('#entryDate').valueAsDate = new Date();
        row.querySelector('#unitSelect').value = '';
        row.querySelector('.fuel-select').value = '';
        row.querySelector('.fuel-amount').value = '';
        row.querySelector('.fuel-carbon').textContent = '-';
        row.querySelector('#cokeAmount').value = '';
        row.querySelector('.coke-carbon').textContent = OFFSITE_CARBON_CONTENT['Coke'].toFixed(4);
        row.querySelector('#cogAmount').value = '';
        row.querySelector('.cog-carbon').textContent = OFFSITE_CARBON_CONTENT['Coke Oven gas'].toFixed(4);
        row.querySelector('.byproduct-select').value = '';
        row.querySelector('.byproduct-amount').value = '';
        row.querySelector('.byproduct-carbon').textContent = '-';
        row.querySelector('.co2-result').textContent = '0.00';
        row.querySelector('.fuel-total-carbon').textContent = '0.00';
    }
    
    const ch4Amt = $('#ch4CokeAmount');
    if (ch4Amt) ch4Amt.value = '';
    const tch4 = $('#totalCH4');
    if (tch4) tch4.textContent = '0.00000';
    
    // Increment S.No
    currentSNo++;
    const snoDisp = $('#snoDisplay');
    if (snoDisp) snoDisp.textContent = currentSNo;
}

async function loadHistory() {
    try {
        const response = await frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Offsite Coke Production Emissions',
                fields: ['name', 'date', 'unit', 'co2_emissions_tonnes', 'ch4_emissions_kg', 'heating_basis'],
                filters: { company: userCompany },
                order_by: 'creation desc',
                limit_page_length: 1000
            }
        });
        
        const historyBody = $('#historyBody');
        if (!historyBody) return;
        
        historyBody.innerHTML = '';
        
        if (!response.message || response.message.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="6" class="text-center">No entries found</td></tr>';
            currentSNo = 1;
            return;
        }
        
        // Update currentSNo based on history count
        currentSNo = response.message.length + 1;
        const snoDisp = $('#snoDisplay');
        if (snoDisp) snoDisp.textContent = currentSNo;
        
        response.message.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${response.message.length - index}</td>
                <td>${new Date(entry.date).toLocaleDateString()}</td>
                <td>${entry.unit}</td>
                <td>${(entry.co2_emissions_tonnes || 0).toFixed(2)}</td>
                <td>${(entry.ch4_emissions_kg || 0).toFixed(5)}</td>
                <td>
                    <button class="btn-view" onclick="showEntryDetails('${entry.name}')">View</button>
                    <button class="btn-delete" onclick="deleteEntry('${entry.name}')">Delete</button>
                </td>
            `;
            historyBody.appendChild(row);
        });
        
        console.log(`✓ Loaded ${response.message.length} history entries`);
    } catch (error) {
        console.error('Error loading history:', error);
        const historyBody = $('#historyBody');
        if (historyBody) {
            historyBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading history</td></tr>';
        }
    }
}

function appendHistoryRow(entry) {
    const historyBody = $('#historyBody');
    if (!historyBody) return;
    
    // Remove "No entries found" row if it exists
    const noEntriesRow = historyBody.querySelector('td[colspan="6"]');
    if (noEntriesRow) {
        noEntriesRow.parentElement.remove();
    }
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${currentSNo}</td>
        <td>${new Date(entry.date).toLocaleDateString()}</td>
        <td>${entry.unit}</td>
        <td>${(entry.co2_emissions_tonnes || 0).toFixed(2)}</td>
        <td>${(entry.ch4_emissions_kg || 0).toFixed(5)}</td>
        <td>
            <button class="btn-view" onclick="showEntryDetails('${entry.name}')">View</button>
            <button class="btn-delete" onclick="deleteEntry('${entry.name}')">Delete</button>
        </td>
    `;
    historyBody.insertBefore(row, historyBody.firstChild);
}

async function showEntryDetails(entryName) {
    try {
        const response = await frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Offsite Coke Production Emissions',
                name: entryName
            }
        });
        
        const entry = response.message;
        if (!entry) return;
        
        // Parse JSON data
        const cokingCoalData = entry.coking_coal_consumed_json ? JSON.parse(entry.coking_coal_consumed_json) : [];
        const byproductsData = entry.byproducts_json ? JSON.parse(entry.byproducts_json) : [];
        
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
                <div class="modal-row">
                    <span class="modal-label">Heating Basis:</span>
                    <span class="modal-value">${entry.heating_basis || 'Not specified'}</span>
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
                    <span class="modal-label">Coke Produced Offsite:</span>
                    <span class="modal-value">${entry.coke_produced_offsite_amount} t (C: ${entry.coke_produced_offsite_carbon_content.toFixed(4)})</span>
                </div>
                <div class="modal-row">
                    <span class="modal-label">Coke Oven Gas Produced Offsite:</span>
                    <span class="modal-value">${entry.coke_oven_gas_offsite_amount} t (C: ${entry.coke_oven_gas_offsite_carbon_content.toFixed(4)})</span>
                </div>
                <div class="modal-row">
                    <span class="modal-label">Coke-oven Byproducts Produced Offsite:</span>
                </div>
                <ul class="modal-list">
                    ${byproductsData.map(item => `<li>${item.byproduct}: ${item.amount} t (C: ${item.carbon_content.toFixed(4)})</li>`).join('')}
                </ul>
                <div class="modal-row">
                    <span class="modal-label"><strong>Total CO2 Emissions:</strong></span>
                    <span class="modal-value"><strong>${(parseFloat(entry.co2_emissions_tonnes) || 0).toFixed(2)} tonnes</strong></span>
                </div>
            </div>
            
            <div class="modal-section">
                <h3>CH4 Emissions</h3>
                <div class="modal-row">
                    <span class="modal-label">Coke Produced Offsite:</span>
                    <span class="modal-value">${entry.ch4_coke_produced_tonnes} t</span>
                </div>
                <div class="modal-row">
                    <span class="modal-label">CH4 Emission Factor:</span>
                    <span class="modal-value">${entry.ch4_emission_factor} g CH4/unit coke</span>
                </div>
                <div class="modal-row">
                    <span class="modal-label"><strong>Total CH4 Emissions:</strong></span>
                    <span class="modal-value"><strong>${(parseFloat(entry.ch4_emissions_kg) || 0).toFixed(5)} kg</strong></span>
                </div>
            </div>
        `;
        
        const modal = $('#modalOverlay');
        if (modal) modal.classList.add('active');
        
    } catch (error) {
        console.error('Error loading entry details:', error);
        frappe.msgprint({
            title: 'Error',
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
                doctype: 'Offsite Coke Production Emissions',
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
    window.showEntryDetails = showEntryDetails;
    window.deleteEntry = deleteEntry;
}

})(); // Close IIFE
