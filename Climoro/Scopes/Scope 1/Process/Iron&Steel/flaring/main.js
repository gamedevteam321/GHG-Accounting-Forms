/**
 * Flaring Emissions Form - CO2 & CH4 Emissions Calculator
 * Real-time calculations with background hydrocarbon product logic
 */

(function() {
    'use strict';
    
    // ================================
    // SCOPED SELECTORS & STATE
    // ================================
    
    const $ = (selector) => root_element.querySelector(selector);
    const $$ = (selector) => root_element.querySelectorAll(selector);
    
    // Global state
    let hydrocarbonDefaults = [];
    let unitOptions = [];
    let userCompany = '';
    let entryCounter = 1;
    let entries = [];
    
    // Constants for calculations
    const CONVERSION_FACTORS = {
        SCF_TO_LBMOLE: 1/379.3,
        CO2_MOLECULAR_WEIGHT: 44,
        CH4_MOLECULAR_WEIGHT: 16,
        TONNES_CONVERSION: 1/2204.62
    };
    
    console.log('🚀 Initializing Flaring Emissions form...');
    
    // ================================
    // INITIALIZATION
    // ================================
    
    async function initializeForm() {
        try {
            await Promise.all([
                loadHydrocarbonDefaults(),
                loadUserContext()
            ]);
            
            buildUI();
            attachEventListeners();
            await loadHistory();
            
            console.log('✅ Flaring Emissions form initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing form:', error);
            frappe.msgprint({
                title: 'Initialization Error',
                indicator: 'red',
                message: 'Failed to initialize form. Please refresh and try again.'
            });
        }
    }
    
    // ================================
    // DATA LOADING
    // ================================
    
    async function loadHydrocarbonDefaults() {
        try {
            const response = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Hydrocarbon Defaults',
                    fields: ['compound_name', 'chemical_formula', 'carbon_ratio', 'is_active'],
                    filters: { is_active: 1 },
                    limit_page_length: 1000,
                    order_by: 'compound_name asc'
                }
            });
            
            hydrocarbonDefaults = response.message || [];
            console.log(`✓ Loaded ${hydrocarbonDefaults.length} hydrocarbon defaults`);
        } catch (error) {
            console.error('❌ Error loading hydrocarbon defaults:', error);
            hydrocarbonDefaults = [];
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
            
            userCompany = userResponse.message?.company || '';
            console.log(`✓ User company: ${userCompany}`);
            
            // Load units for the company
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
                unitOptions = (unitsResponse.message || []).map(u => u.name);
                console.log(`✓ Loaded ${unitOptions.length} units for company`);
            }
            
            // Fallback: load all units if no company-specific units
            if (unitOptions.length === 0) {
                const allUnitsResponse = await frappe.call({
                    method: 'frappe.client.get_list',
                    args: {
                        doctype: 'Units',
                        fields: ['name'],
                        limit_page_length: 1000
                    }
                });
                unitOptions = (allUnitsResponse.message || []).map(u => u.name);
                console.log(`✓ Loaded ${unitOptions.length} units (fallback)`);
            }
        } catch (error) {
            console.error('❌ Error loading user context:', error);
            userCompany = '';
            unitOptions = [];
        }
    }
    
    // ================================
    // UI BUILDING
    // ================================
    
    function buildUI() {
        console.log('🔨 Building UI...');
        createEntryRow();
        console.log('✓ UI built successfully');
    }
    
    function createEntryRow() {
        const tbody = $('#flaringBody');
        if (!tbody) return;
        
        // Clear any existing rows
        tbody.innerHTML = '';
        
        const row = document.createElement('tr');
        row.className = 'entry-row';
        row.id = 'mainEntryRow';
        
        // Set today's date
        const today = new Date().toISOString().split('T')[0];
        
        row.innerHTML = `
            <td>
                <span class="sno-display">1</span>
            </td>
            <td>
                <input type="date" class="form-control date-input" 
                       value="${today}" required />
            </td>
            <td>
                <select class="form-control unit-select" required>
                    <option value="">Select Unit</option>
                    ${unitOptions.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                </select>
            </td>
            <td>
                <input type="number" class="form-control volume-input" 
                       step="0.01" min="0" placeholder="0.00" required />
            </td>
            <td>
                <div class="hydrocarbon-list">
                    <div class="hydrocarbon-entry">
                        <select class="form-control hydrocarbon-select" required>
                            <option value="">Select Hydrocarbon</option>
                            ${hydrocarbonDefaults.map(hc => 
                                `<option value="${hc.compound_name}" data-carbon-ratio="${hc.carbon_ratio}">
                                    ${hc.compound_name} (${hc.chemical_formula})
                                </option>`
                            ).join('')}
                        </select>
                    </div>
                    <button type="button" class="btn-add-hydrocarbon">+ Add Hydrocarbon</button>
                </div>
            </td>
            <td>
                <div class="hydrocarbon-ratio-list">
                    <input type="number" class="form-control hc-ratio-input" 
                           step="0.000001" min="0" placeholder="0.000000" />
                </div>
            </td>
            <td>
                <div class="carbon-ratio-list">
                    <span class="calculated-value carbon-ratio-display">-</span>
                </div>
            </td>
            <td>
                <input type="number" class="form-control co2-amount-input" 
                       step="0.000001" min="0" max="1" placeholder="0.000000" 
                       title="Fraction between 0 and 1" />
            </td>
            <td>
                <input type="number" class="form-control combustion-efficiency-input" 
                       step="0.000001" min="0" max="1" placeholder="0.000000" 
                       title="Fraction between 0 and 1" />
            </td>
            <td>
                <input type="number" class="form-control uncombusted-gas-input" 
                       step="0.000001" min="0" max="1" placeholder="0.000000" 
                       title="Fraction between 0 and 1" />
            </td>
            <td>
                <input type="number" class="form-control methane-amount-input" 
                       step="0.000001" min="0" max="1" placeholder="0.000000" 
                       title="Fraction between 0 and 1" />
            </td>
            <td>
                <span class="calculated-value co2-emissions-display">0.000000</span>
            </td>
            <td>
                <span class="calculated-value ch4-emissions-display">0.000000</span>
            </td>
            <td>
                <button type="button" class="btn-add-entry">Add</button>
            </td>
        `;
        
        tbody.appendChild(row);
        
        // Attach row-specific event listeners
        attachRowEventListeners(row);
        
        // Initial check for row completion
        checkRowCompletion(row);
        
        console.log('✓ Created main entry row');
    }
    
    // ================================
    // EVENT LISTENERS
    // ================================
    
    function attachEventListeners() {
        // Modal close
        const modalClose = $('#modalClose');
        const modalOverlay = $('#modalOverlay');
        if (modalClose && modalOverlay) {
            modalClose.addEventListener('click', () => {
                modalOverlay.style.display = 'none';
            });
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    modalOverlay.style.display = 'none';
                }
            });
        }
        
        console.log('✓ Event listeners attached (scoped)');
    }
    
    function attachRowEventListeners(row) {
        // Hydrocarbon selection changes
        const hydrocarbonSelects = row.querySelectorAll('.hydrocarbon-select');
        hydrocarbonSelects.forEach(select => {
            select.addEventListener('change', () => {
                updateCarbonRatio(row);
                checkRowCompletion(row);
            });
        });
        
        // Add hydrocarbon button
        const addHydrocarbonBtn = row.querySelector('.btn-add-hydrocarbon');
        if (addHydrocarbonBtn) {
            addHydrocarbonBtn.addEventListener('click', () => addHydrocarbonEntry(row));
        }
        
        // Input changes for calculations and validation
        const calculationInputs = row.querySelectorAll('.volume-input, .hc-ratio-input, .co2-amount-input, .combustion-efficiency-input, .uncombusted-gas-input, .methane-amount-input');
        calculationInputs.forEach(input => {
            input.addEventListener('input', () => {
                validateFractionInput(input);
                calculateEmissions(row);
                checkRowCompletion(row);
            });
        });
        
        // Unit selection for save validation
        const unitSelect = row.querySelector('.unit-select');
        if (unitSelect) {
            unitSelect.addEventListener('change', () => checkRowCompletion(row));
        }
        
        // Add button functionality
        const addBtn = row.querySelector('.btn-add-entry');
        if (addBtn) {
            addBtn.addEventListener('click', () => saveEntry(row));
        }
    }
    
    // ================================
    // HYDROCARBON MANAGEMENT
    // ================================
    
    function addHydrocarbonEntry(row) {
        const hydrocarbonList = row.querySelector('.hydrocarbon-list');
        const ratioList = row.querySelector('.hydrocarbon-ratio-list');
        const carbonRatioList = row.querySelector('.carbon-ratio-list');
        
        if (!hydrocarbonList || !ratioList || !carbonRatioList) return;
        
        // Create new hydrocarbon entry
        const hydrocarbonEntry = document.createElement('div');
        hydrocarbonEntry.className = 'hydrocarbon-entry';
        hydrocarbonEntry.innerHTML = `
            <select class="form-control hydrocarbon-select">
                <option value="">Select Hydrocarbon</option>
                ${hydrocarbonDefaults.map(hc => 
                    `<option value="${hc.compound_name}" data-carbon-ratio="${hc.carbon_ratio}">
                        ${hc.compound_name} (${hc.chemical_formula})
                    </option>`
                ).join('')}
            </select>
            <button type="button" class="btn-remove-hydrocarbon">×</button>
        `;
        
        // Create corresponding ratio input
        const ratioInput = document.createElement('input');
        ratioInput.type = 'number';
        ratioInput.className = 'form-control hc-ratio-input';
        ratioInput.step = '0.000001';
        ratioInput.min = '0';
        ratioInput.placeholder = '0.000000';
        
        // Create corresponding carbon ratio display
        const carbonRatioDisplay = document.createElement('span');
        carbonRatioDisplay.className = 'calculated-value carbon-ratio-display';
        carbonRatioDisplay.textContent = '-';
        
        // Insert before the add button
        const addBtn = hydrocarbonList.querySelector('.btn-add-hydrocarbon');
        hydrocarbonList.insertBefore(hydrocarbonEntry, addBtn);
        ratioList.appendChild(ratioInput);
        carbonRatioList.appendChild(carbonRatioDisplay);
        
        // Attach event listeners
        const newSelect = hydrocarbonEntry.querySelector('.hydrocarbon-select');
        const removeBtn = hydrocarbonEntry.querySelector('.btn-remove-hydrocarbon');
        
        newSelect.addEventListener('change', () => {
            updateCarbonRatio(row);
            checkRowCompletion(row);
        });
        ratioInput.addEventListener('input', () => {
            validateFractionInput(ratioInput);
            calculateEmissions(row);
            checkRowCompletion(row);
        });
        
        removeBtn.addEventListener('click', () => {
            hydrocarbonEntry.remove();
            ratioInput.remove();
            carbonRatioDisplay.remove();
            updateCarbonRatio(row);
            calculateEmissions(row);
        });
    }
    
    function updateCarbonRatio(row) {
        const hydrocarbonSelects = row.querySelectorAll('.hydrocarbon-select');
        const carbonRatioDisplays = row.querySelectorAll('.carbon-ratio-display');
        
        hydrocarbonSelects.forEach((select, index) => {
            const carbonDisplay = carbonRatioDisplays[index];
            if (!carbonDisplay) return;
            
            const selectedOption = select.selectedOptions[0];
            if (selectedOption && selectedOption.dataset.carbonRatio) {
                carbonDisplay.textContent = selectedOption.dataset.carbonRatio;
            } else {
                carbonDisplay.textContent = '-';
            }
        });
        
        calculateEmissions(row);
    }
    
    // ================================
    // VALIDATION
    // ================================
    
    function validateFractionInput(input) {
        const value = parseFloat(input.value);
        const isFractionField = input.classList.contains('co2-amount-input') || 
                               input.classList.contains('combustion-efficiency-input') || 
                               input.classList.contains('uncombusted-gas-input') || 
                               input.classList.contains('methane-amount-input');
        
        if (isFractionField && !isNaN(value)) {
            if (value < 0) {
                input.value = 0;
                frappe.msgprint({
                    title: 'Validation Warning',
                    indicator: 'orange',
                    message: 'Fraction values cannot be negative. Value set to 0.'
                });
            } else if (value > 1) {
                input.value = 1;
                frappe.msgprint({
                    title: 'Validation Warning',
                    indicator: 'orange',
                    message: 'Fraction values cannot exceed 1. Value set to 1.'
                });
            }
        }
    }
    
    function checkRowCompletion(row) {
        const unit = row.querySelector('.unit-select')?.value || '';
        const volume = parseFloat(row.querySelector('.volume-input')?.value || 0);
        const hasHydrocarbon = row.querySelector('.hydrocarbon-select')?.value || '';
        const hasRatio = parseFloat(row.querySelector('.hc-ratio-input')?.value || 0);
        
        const addBtn = row.querySelector('.btn-add-entry');
        
        // Keep this fast; excessive logs can slow render in production
        
        if (unit && volume > 0 && hasHydrocarbon && hasRatio > 0) {
            if (addBtn) {
                addBtn.style.display = 'inline-block';
                addBtn.style.visibility = 'visible';
                addBtn.disabled = false;
            }
        } else {
            if (addBtn) {
                // Keep button visible but disabled with reduced opacity
                addBtn.style.display = 'inline-block';
                addBtn.style.opacity = '0.6';
                addBtn.disabled = true;
            }
        }
    }
    
    // ================================
    // CALCULATIONS
    // ================================
    
    function calculateEmissions(row) {
        try {
            const volume = parseFloat(row.querySelector('.volume-input')?.value || 0);
            const co2Amount = parseFloat(row.querySelector('.co2-amount-input')?.value || 0);
            const combustionEfficiency = parseFloat(row.querySelector('.combustion-efficiency-input')?.value || 0);
            const uncombustedGas = parseFloat(row.querySelector('.uncombusted-gas-input')?.value || 0);
            const methaneAmount = parseFloat(row.querySelector('.methane-amount-input')?.value || 0);
            
            // Calculate total hydrocarbon ratio (background calculation)
            let totalHydrocarbonRatio = 0;
            const ratioInputs = row.querySelectorAll('.hc-ratio-input');
            const carbonRatioDisplays = row.querySelectorAll('.carbon-ratio-display');
            
            ratioInputs.forEach((ratioInput, index) => {
                const ratio = parseFloat(ratioInput.value || 0);
                const carbonRatio = parseFloat(carbonRatioDisplays[index]?.textContent || 0);
                
                if (ratio > 0 && carbonRatio > 0) {
                    totalHydrocarbonRatio += ratio * carbonRatio;
                }
            });
            
            // CO2 emissions calculation
            // Formula: volume * (1/379.3) * ((total of hydrocarbon flared) + Amount of CO2 in flared gas) * 44 * (1/2204.62)
            const co2Emissions = volume * CONVERSION_FACTORS.SCF_TO_LBMOLE * 
                                (totalHydrocarbonRatio + co2Amount) * 
                                CONVERSION_FACTORS.CO2_MOLECULAR_WEIGHT * 
                                CONVERSION_FACTORS.TONNES_CONVERSION;
            
            // CH4 emissions calculation
            // Formula: volume * uncombusted flared gas * Amount of fraction of methane in flared gas * (1/379.3) * 16 * (1/2204.62)
            const ch4Emissions = volume * uncombustedGas * methaneAmount * 
                               CONVERSION_FACTORS.SCF_TO_LBMOLE * 
                               CONVERSION_FACTORS.CH4_MOLECULAR_WEIGHT * 
                               CONVERSION_FACTORS.TONNES_CONVERSION;
            
            // Update displays
            const co2Display = row.querySelector('.co2-emissions-display');
            const ch4Display = row.querySelector('.ch4-emissions-display');
            
            if (co2Display) {
                co2Display.textContent = co2Emissions.toFixed(6);
            }
            if (ch4Display) {
                ch4Display.textContent = ch4Emissions.toFixed(6);
            }
            
        } catch (error) {
            console.error('❌ Calculation error:', error);
        }
    }
    
    // ================================
    // SAVING
    // ================================
    
    async function saveEntry(row) {
        try {
            const date = row.querySelector('.date-input')?.value || '';
            const unit = row.querySelector('.unit-select')?.value || '';
            const volume = parseFloat(row.querySelector('.volume-input')?.value || 0);
            const co2Amount = parseFloat(row.querySelector('.co2-amount-input')?.value || 0);
            const combustionEfficiency = parseFloat(row.querySelector('.combustion-efficiency-input')?.value || 0);
            const uncombustedGas = parseFloat(row.querySelector('.uncombusted-gas-input')?.value || 0);
            const methaneAmount = parseFloat(row.querySelector('.methane-amount-input')?.value || 0);
            
            // Collect hydrocarbon data
            const hydrocarbonEntries = [];
            const hydrocarbonSelects = row.querySelectorAll('.hydrocarbon-select');
            const ratioInputs = row.querySelectorAll('.hc-ratio-input');
            const carbonRatioDisplays = row.querySelectorAll('.carbon-ratio-display');
            
            let totalHydrocarbonRatio = 0;
            hydrocarbonSelects.forEach((select, index) => {
                const hydrocarbon = select.value;
                const ratio = parseFloat(ratioInputs[index]?.value || 0);
                const carbonRatio = parseFloat(carbonRatioDisplays[index]?.textContent || 0);
                
                if (hydrocarbon && ratio > 0) {
                    const product = ratio * carbonRatio;
                    totalHydrocarbonRatio += product;
                    
                    hydrocarbonEntries.push({
                        hydrocarbon: hydrocarbon,
                        ratio: ratio,
                        carbon_ratio: carbonRatio,
                        product: product
                    });
                }
            });
            
            // Calculate emissions
            const co2Emissions = volume * CONVERSION_FACTORS.SCF_TO_LBMOLE * 
                                (totalHydrocarbonRatio + co2Amount) * 
                                CONVERSION_FACTORS.CO2_MOLECULAR_WEIGHT * 
                                CONVERSION_FACTORS.TONNES_CONVERSION;
            
            const ch4Emissions = volume * uncombustedGas * methaneAmount * 
                               CONVERSION_FACTORS.SCF_TO_LBMOLE * 
                               CONVERSION_FACTORS.CH4_MOLECULAR_WEIGHT * 
                               CONVERSION_FACTORS.TONNES_CONVERSION;
            
            // Validation
            if (!date) {
                frappe.msgprint({title: 'Validation Error', indicator: 'red', message: 'Please select a date.'});
                return;
            }
            if (!unit) {
                frappe.msgprint({title: 'Validation Error', indicator: 'red', message: 'Please select a unit.'});
                return;
            }
            if (volume <= 0) {
                frappe.msgprint({title: 'Validation Error', indicator: 'red', message: 'Please enter a valid volume.'});
                return;
            }
            if (hydrocarbonEntries.length === 0) {
                frappe.msgprint({title: 'Validation Error', indicator: 'red', message: 'Please add at least one hydrocarbon entry.'});
                return;
            }
            
            // Create DocType entry
            const entry = {
                doctype: 'Flaring Emissions',
                date: date,
                company: userCompany,
                unit: unit,
                volume_gas_flared_scf: volume,
                hydrocarbon_entries_json: JSON.stringify(hydrocarbonEntries),
                total_hydrocarbon_ratio: totalHydrocarbonRatio,
                amount_co2_in_flared_gas: co2Amount,
                flaring_combustion_efficiency: combustionEfficiency,
                uncombusted_flared_gas_fraction: uncombustedGas,
                amount_methane_in_flared_gas: methaneAmount,
                co2_emissions_tonnes: co2Emissions,
                ch4_emissions_tonnes: ch4Emissions
            };
            
            const response = await frappe.call({
                method: 'frappe.client.insert',
                args: { doc: entry }
            });
            
            if (response.message) {
                // Add entry to history table immediately (like ammonia form)
                addEntryToHistory(entry, response.message.name);
                
                frappe.msgprint({
                    title: 'Success',
                    indicator: 'green',
                    message: 'Entry saved successfully!'
                });
                
                // Clear the entry row for next entry
                clearEntryRow(row);
            }
            
        } catch (error) {
            console.error('❌ Error saving entry:', error);
            frappe.msgprint({
                title: 'Save Error',
                indicator: 'red',
                message: 'Failed to save entry. Please try again.'
            });
        }
    }
    
    function addEntryToHistory(entry, docName) {
        const tbody = $('#historyBody');
        if (!tbody) return;
        
        const currentEntries = tbody.querySelectorAll('tr').length;
        const newRow = document.createElement('tr');
        newRow.dataset.docName = docName;
        
        newRow.innerHTML = `
            <td>${currentEntries + 1}</td>
            <td>${entry.date}</td>
            <td>${entry.unit || '-'}</td>
            <td>${parseFloat(entry.volume_gas_flared_scf || 0).toFixed(2)}</td>
            <td>${parseFloat(entry.co2_emissions_tonnes || 0).toFixed(6)}</td>
            <td>${parseFloat(entry.ch4_emissions_tonnes || 0).toFixed(6)}</td>
            <td>
                <button class="btn-view" onclick="window.flaringForm.showEntryDetails('${docName}')">View</button>
                <button class="btn-delete" onclick="window.flaringForm.deleteEntryFromHistory('${docName}', this)">Delete</button>
            </td>
        `;
        
        // Insert at the top of the history
        if (tbody.firstChild) {
            tbody.insertBefore(newRow, tbody.firstChild);
            // Update S.No for all rows
            updateHistorySerialNumbers();
        } else {
            tbody.appendChild(newRow);
        }
    }
    
    function updateHistorySerialNumbers() {
        const tbody = $('#historyBody');
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const snoCell = row.querySelector('td:first-child');
            if (snoCell) {
                snoCell.textContent = index + 1;
            }
        });
    }
    
    function clearEntryRow(row) {
        // Clear all inputs except date (reset to today)
        const today = new Date().toISOString().split('T')[0];
        
        row.querySelectorAll('input, select').forEach(input => {
            if (input.classList.contains('date-input')) {
                input.value = today;
            } else {
                input.value = '';
            }
        });
        
        // Reset calculated displays
        row.querySelectorAll('.calculated-value').forEach(display => {
            display.textContent = display.classList.contains('carbon-ratio-display') ? '-' : '0.000000';
        });
        
        // Remove extra hydrocarbon entries (keep only the first one)
        const hydrocarbonList = row.querySelector('.hydrocarbon-list');
        const ratioList = row.querySelector('.hydrocarbon-ratio-list');
        const carbonRatioList = row.querySelector('.carbon-ratio-list');
        
        if (hydrocarbonList && ratioList && carbonRatioList) {
            const extraEntries = hydrocarbonList.querySelectorAll('.hydrocarbon-entry');
            const extraRatios = ratioList.querySelectorAll('.hc-ratio-input');
            const extraCarbonRatios = carbonRatioList.querySelectorAll('.carbon-ratio-display');
            
            // Keep first, remove others
            for (let i = 1; i < extraEntries.length; i++) {
                if (extraEntries[i]) extraEntries[i].remove();
            }
            for (let i = 1; i < extraRatios.length; i++) {
                if (extraRatios[i]) extraRatios[i].remove();
            }
            for (let i = 1; i < extraCarbonRatios.length; i++) {
                if (extraCarbonRatios[i]) extraCarbonRatios[i].remove();
            }
        }
        
        // Hide the add button
        const addBtn = row.querySelector('.btn-add-entry');
        if (addBtn) {
            addBtn.style.display = 'none';
        }
    }
    
    async function deleteEntryFromHistory(docName, buttonElement) {
        if (!confirm('Are you sure you want to delete this entry?')) return;
        
        try {
            await frappe.call({
                method: 'frappe.client.delete',
                args: {
                    doctype: 'Flaring Emissions',
                    name: docName
                }
            });
            
            // Remove the row from history table
            const row = buttonElement.closest('tr');
            if (row) {
                row.remove();
                // Update S.No for remaining rows
                updateHistorySerialNumbers();
            }
            
            frappe.msgprint({
                title: 'Success',
                indicator: 'green',
                message: 'Entry deleted successfully!'
            });
            
        } catch (error) {
            console.error('❌ Error deleting entry:', error);
            frappe.msgprint({
                title: 'Delete Error',
                indicator: 'red',
                message: 'Failed to delete entry.'
            });
        }
    }
    
    // ================================
    // HISTORY MANAGEMENT
    // ================================
    
    async function loadHistory() {
        try {
            const response = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Flaring Emissions',
                    fields: ['name', 'date', 'unit', 'volume_gas_flared_scf', 'co2_emissions_tonnes', 'ch4_emissions_tonnes'],
                    order_by: 'creation desc',
                    limit_page_length: 100
                }
            });
            
            const historyData = response.message || [];
            entries = historyData;
            
            const tbody = $('#historyBody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            
            historyData.forEach((entry, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${entry.date}</td>
                    <td>${entry.unit || '-'}</td>
                    <td>${parseFloat(entry.volume_gas_flared_scf || 0).toFixed(2)}</td>
                    <td>${parseFloat(entry.co2_emissions_tonnes || 0).toFixed(6)}</td>
                    <td>${parseFloat(entry.ch4_emissions_tonnes || 0).toFixed(6)}</td>
                    <td>
                        <button class="btn-view" onclick="window.flaringForm.showEntryDetails('${entry.name}')">View</button>
                        <button class="btn-delete" onclick="window.flaringForm.deleteEntry('${entry.name}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            
            console.log(`✓ Loaded ${historyData.length} history entries`);
        } catch (error) {
            console.error('❌ Error loading history:', error);
        }
    }
    
    async function showEntryDetails(entryId) {
        try {
            const response = await frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Flaring Emissions',
                    name: entryId
                }
            });
            
            const entry = response.message;
            if (!entry) return;
            
            const hydrocarbonEntries = JSON.parse(entry.hydrocarbon_entries_json || '[]');
            
            const modalBody = $('#modalBody');
            const modalOverlay = $('#modalOverlay');
            
            if (modalBody && modalOverlay) {
                modalBody.innerHTML = `
                    <div class="modal-row">
                        <span class="modal-label">Date:</span>
                        <span class="modal-value">${entry.date}</span>
                    </div>
                    <div class="modal-row">
                        <span class="modal-label">Facility:</span>
                        <span class="modal-value">${entry.unit || '-'}</span>
                    </div>
                    <div class="modal-row">
                        <span class="modal-label">Volume Gas Flared (scf):</span>
                        <span class="modal-value">${parseFloat(entry.volume_gas_flared_scf || 0).toFixed(2)}</span>
                    </div>
                    <div class="modal-section">
                        <h3>Hydrocarbon Profile</h3>
                        ${hydrocarbonEntries.map(hc => `
                            <div class="modal-row">
                                <span class="modal-label">${hc.hydrocarbon}:</span>
                                <span class="modal-value">Ratio: ${hc.ratio.toFixed(6)}, Carbon Ratio: ${hc.carbon_ratio}</span>
                            </div>
                        `).join('')}
                        <div class="modal-row">
                            <span class="modal-label">Total Hydrocarbon Ratio:</span>
                            <span class="modal-value">${parseFloat(entry.total_hydrocarbon_ratio || 0).toFixed(6)}</span>
                        </div>
                    </div>
                    <div class="modal-row">
                        <span class="modal-label">Amount of CO2 in Flared Gas:</span>
                        <span class="modal-value">${parseFloat(entry.amount_co2_in_flared_gas || 0).toFixed(6)}</span>
                    </div>
                    <div class="modal-row">
                        <span class="modal-label">Flaring Combustion Efficiency:</span>
                        <span class="modal-value">${parseFloat(entry.flaring_combustion_efficiency || 0).toFixed(6)}</span>
                    </div>
                    <div class="modal-row">
                        <span class="modal-label">Uncombusted Flared Gas:</span>
                        <span class="modal-value">${parseFloat(entry.uncombusted_flared_gas_fraction || 0).toFixed(6)}</span>
                    </div>
                    <div class="modal-row">
                        <span class="modal-label">Amount of Methane in Flared Gas:</span>
                        <span class="modal-value">${parseFloat(entry.amount_methane_in_flared_gas || 0).toFixed(6)}</span>
                    </div>
                    <div class="modal-section">
                        <h3>Calculated Emissions</h3>
                        <div class="modal-row">
                            <span class="modal-label">CO2 Emissions (tonnes):</span>
                            <span class="modal-value">${parseFloat(entry.co2_emissions_tonnes || 0).toFixed(6)}</span>
                        </div>
                        <div class="modal-row">
                            <span class="modal-label">CH4 Emissions (tonnes):</span>
                            <span class="modal-value">${parseFloat(entry.ch4_emissions_tonnes || 0).toFixed(6)}</span>
                        </div>
                    </div>
                `;
                
                modalOverlay.style.display = 'flex';
            }
        } catch (error) {
            console.error('❌ Error loading entry details:', error);
            frappe.msgprint({
                title: 'Error',
                indicator: 'red',
                message: 'Failed to load entry details.'
            });
        }
    }
    
    async function deleteEntry(entryId) {
        if (!confirm('Are you sure you want to delete this entry?')) return;
        
        try {
            await frappe.call({
                method: 'frappe.client.delete',
                args: {
                    doctype: 'Flaring Emissions',
                    name: entryId
                }
            });
            
            frappe.msgprint({
                title: 'Success',
                indicator: 'green',
                message: 'Entry deleted successfully!'
            });
            
            await loadHistory();
        } catch (error) {
            console.error('❌ Error deleting entry:', error);
            frappe.msgprint({
                title: 'Delete Error',
                indicator: 'red',
                message: 'Failed to delete entry.'
            });
        }
    }
    
    // ================================
    // GLOBAL EXPOSURE
    // ================================
    
    // Expose functions globally for onclick handlers
    window.flaringForm = {
        showEntryDetails,
        deleteEntry,
        deleteEntryFromHistory
    };
    
    // ================================
    // INITIALIZATION
    // ================================
    
    // Start initialization
    initializeForm();
    
})();
