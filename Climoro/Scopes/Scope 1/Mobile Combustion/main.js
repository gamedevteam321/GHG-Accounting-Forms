// Mobile Combustion Custom Block JavaScript for Frappe (Separate DocTypes)
(function() {
    // Global variables
    let currentFuelRowId = 1;
    let currentTransportRowId = 1;
    let savedFuelData = [];
    let savedTransportData = [];
    let isInitialized = false;
    const AVERAGE_TRANSPORT_CONSTANT = 10;

    // Fuel selections will be loaded from Mobile Combustion EF Master
    let fuelSelections = [];

    // Transportation types will be loaded from Mobile Combustion EF Master
    let transportationTypes = [];

    // Updated unit options based on your spreadsheet
    const fuelUnitOptions = ['KG', 'Tonnes'];
    const transportUnitOptions = ['KM', 'Miles', 'Nautical Miles', 'ETC'];

    // Company/Unit filtering context
    let selectedCompany = null;
    let selectedUnit = null;

    // Country to region mapping for emission factors
    const countryRegionMapping = {
        'United States': 'US',
        'United Kingdom': 'UK',
        'Canada': 'US', // Using US standards for Canada
        'Australia': 'Other',
        'Germany': 'Other',
        'France': 'Other',
        'India': 'Other',
        'China': 'Other',
        'Japan': 'Other',
        'Brazil': 'Other',
        'Mexico': 'Other',
        'South Africa': 'Other'
        // Add more countries as needed
    };

    // Global variable to store user's region
    let userRegion = 'Other'; // Default fallback

    // Load fuel types from Mobile Combustion EF Master
    function loadFuelTypes() {
        return new Promise((resolve) => {
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Mobile Combustion EF Master',
                    filters: {
                        calculation_method: 'Fuel-Based'
                    },
                    fields: ['fuel_type'],
                    order_by: 'fuel_type asc',
                    limit: 50
                },
                callback: function(r) {
                    if (r.message && r.message.length > 0) {
                        // Extract unique fuel types
                        const fuelTypes = [...new Set(r.message.map(item => item.fuel_type))];
                        fuelSelections = fuelTypes.filter(type => type && type.trim() !== '');
                        console.log('Loaded fuel types from database:', fuelSelections);
                    } else {
                        // Fallback to default fuel types if no data found
                        fuelSelections = [
                            'Petrol', 'Diesel', 'CNG / LNG', 'LPG', 
                            'Aviation fuel (Jet A, Jet A-1)', 'Marine fuel oil', 'Biodiesel or ethanol blends'
                        ];
                        console.log('No fuel types found in database, using defaults:', fuelSelections);
                    }
                    resolve(fuelSelections);
                }
            });
        });
    }

    // Load transportation types from Mobile Combustion EF Master
    function loadTransportationTypes() {
        return new Promise((resolve) => {
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Mobile Combustion EF Master',
                    filters: {
                        calculation_method: 'Distance-Based'
                    },
                    fields: ['vehicle_category'],
                    order_by: 'vehicle_category asc',
                    limit: 50
                },
                callback: function(r) {
                    if (r.message && r.message.length > 0) {
                        // Extract unique transportation types
                        const transportTypes = [...new Set(r.message.map(item => item.vehicle_category))];
                        transportationTypes = transportTypes.filter(type => type && type.trim() !== '');
                        console.log('Loaded transportation types from database:', transportationTypes);
                    } else {
                        // Fallback to default transportation types if no data found
                        transportationTypes = [
                            'On-Road Transport', 'Off-Road Transport & Equipment', 'Rail Transport', 
                            'Marine Transport', 'Aviation (Owned Aircraft)', 'Mobile Generators / Temporary Engines'
                        ];
                        console.log('No transportation types found in database, using defaults:', transportationTypes);
                    }
                    resolve(transportationTypes);
                }
            });
        });
    }

    // Get user's company country and map to region
    function getUserRegion() {
        return new Promise((resolve) => {
            frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'Company',
                    filters: { name: frappe.defaults.get_default('company') },
                    fieldname: 'country'
                },
                callback: function(r) {
                    if (r.message && r.message.country) {
                        const country = r.message.country;
                        userRegion = countryRegionMapping[country] || 'Other';
                        console.log('User region detected:', userRegion, 'from country:', country);
                    } else {
                        console.log('No company country found, using default region:', userRegion);
                    }
                    resolve(userRegion);
                }
            });
        });
    }

    // Lookup emission factors from Mobile Combustion EF Master
    function lookupEmissionFactors(selectionType, calculationMethod, row) {
        console.log('Looking up emission factors for:', selectionType, 'method:', calculationMethod, 'region:', userRegion);
        
        // Show loading state
        const efco2Input = row.querySelector('.efco2-input');
        const efch4Input = row.querySelector('.efch4-input');
        const efn20Input = row.querySelector('.efn20-input');
        
        // Disable inputs during lookup and show loading indicator
        [efco2Input, efch4Input, efn20Input].forEach(input => {
            input.disabled = true;
            input.style.backgroundColor = '#f8f9fa';
            input.placeholder = 'Loading...';
        });

        // Show notification
        showNotification('Loading emission factors...', 'info');

        // Build filters based on calculation method
        let filters = {
            calculation_method: calculationMethod,
            region: userRegion
        };

        // For fuel method, filter by fuel_type
        // For transportation method, we'll search by vehicle_category or use a generic approach
        if (calculationMethod === 'Fuel-Based') {
            filters.fuel_type = selectionType;
        } else if (calculationMethod === 'Distance-Based') {
            // For transportation, we might need to map transportation types to fuel types
            // or search by vehicle_category. For now, let's try to find records that match
            // the transportation type in vehicle_category
            filters.vehicle_category = ['like', `%${selectionType}%`];
        }

        console.log('Using filters:', filters);

        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Mobile Combustion EF Master',
                filters: filters,
                fields: ['name', 'vehicle_category', 'vehicle_sub_category_1', 'vehicle_sub_category_2', 
                        'ef_co2', 'ef_ch4', 'ef_n2o', 'ef_unit'],
                order_by: 'creation desc',
                limit: 10
            },
            callback: function(r) {
                // Re-enable inputs and restore placeholders
                [efco2Input, efch4Input, efn20Input].forEach(input => {
                    input.disabled = false;
                    input.style.backgroundColor = '';
                    input.placeholder = input.classList.contains('efco2-input') ? 'EF CO2' : 
                                      input.classList.contains('efch4-input') ? 'EF CH4' : 'EF N2O';
                });

                if (r.message && r.message.length > 0) {
                    console.log('Found emission factors:', r.message);
                    
                    if (r.message.length === 1) {
                        // Auto-populate if only one result
                        const factor = r.message[0];
                        populateEmissionFactors(factor, row);
                        showNotification(`Emission factors loaded for ${selectionType} (${factor.vehicle_category})`, 'success');
                    } else {
                        // Show popup for multiple results
                        showEmissionFactorsPopup(r.message, row, selectionType);
                    }
                                    } else {
                        console.log('No emission factors found for region:', userRegion);
                        // Try with 'Other' region as fallback
                        if (userRegion !== 'Other') {
                            lookupEmissionFactorsFallback(selectionType, calculationMethod, row);
                        } else {
                            // If we're already on 'Other' region, try to find any data for this fuel type
                            lookupEmissionFactorsAnyRegion(selectionType, calculationMethod, row);
                        }
                    }
            }
        });
    }

    // Fallback lookup with 'Other' region
    function lookupEmissionFactorsFallback(selectionType, calculationMethod, row) {
        console.log('Trying fallback lookup with Other region');
        
        // Build filters based on calculation method
        let filters = {
            calculation_method: calculationMethod,
            region: 'Other'
        };

        // For fuel method, filter by fuel_type
        // For transportation method, search by vehicle_category
        if (calculationMethod === 'Fuel-Based') {
            filters.fuel_type = selectionType;
        } else if (calculationMethod === 'Distance-Based') {
            filters.vehicle_category = ['like', `%${selectionType}%`];
        }
        
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Mobile Combustion EF Master',
                filters: filters,
                fields: ['name', 'vehicle_category', 'vehicle_sub_category_1', 'vehicle_sub_category_2', 
                        'ef_co2', 'ef_ch4', 'ef_n2o', 'ef_unit'],
                order_by: 'creation desc',
                limit: 5
            },
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    console.log('Found fallback emission factors:', r.message);
                    if (r.message.length === 1) {
                        const factor = r.message[0];
                        populateEmissionFactors(factor, row);
                        showNotification(`Emission factors loaded (Other region) for ${selectionType}`, 'success');
                    } else {
                        showEmissionFactorsPopup(r.message, row, selectionType);
                    }
                } else {
                    showNotification('No emission factors found. Please enter values manually.', 'warning');
                }
            }
        });
    }

    // Lookup emission factors from any region (last resort)
    function lookupEmissionFactorsAnyRegion(selectionType, calculationMethod, row) {
        console.log('Trying to find emission factors from any region for:', selectionType);
        
        // Build filters without region restriction
        let filters = {
            calculation_method: calculationMethod
        };

        // For fuel method, filter by fuel_type
        // For transportation method, search by vehicle_category
        if (calculationMethod === 'Fuel-Based') {
            filters.fuel_type = selectionType;
        } else if (calculationMethod === 'Distance-Based') {
            filters.vehicle_category = ['like', `%${selectionType}%`];
        }
        
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Mobile Combustion EF Master',
                filters: filters,
                fields: ['name', 'vehicle_category', 'vehicle_sub_category_1', 'vehicle_sub_category_2', 
                        'ef_co2', 'ef_ch4', 'ef_n2o', 'ef_unit', 'region'],
                order_by: 'creation desc',
                limit: 5
            },
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    console.log('Found emission factors from any region:', r.message);
                    if (r.message.length === 1) {
                        const factor = r.message[0];
                        populateEmissionFactors(factor, row);
                        showNotification(`Emission factors loaded (${factor.region} region) for ${selectionType}`, 'success');
                    } else {
                        showEmissionFactorsPopup(r.message, row, selectionType);
                    }
                } else {
                    showNotification('No emission factors found in database. Please enter values manually.', 'warning');
                }
            }
        });
    }

    // Populate emission factor fields with selected values
    function populateEmissionFactors(factor, row) {
        const efco2Input = row.querySelector('.efco2-input');
        const efch4Input = row.querySelector('.efch4-input');
        const efn20Input = row.querySelector('.efn20-input');
        
        if (efco2Input && efch4Input && efn20Input) {
            efco2Input.value = factor.ef_co2 || '';
            efch4Input.value = factor.ef_ch4 || '';
            efn20Input.value = factor.ef_n2o || '';
            
            // Trigger calculation to update readonly fields
            // Check if this is fuel method or transportation method
            const fuelUsedInput = row.querySelector('.fuel-used-input');
            const distanceInput = row.querySelector('.distance-traveled-input');
            
            if (fuelUsedInput && fuelUsedInput.value) {
                // Trigger fuel calculation
                const event = new Event('input', { bubbles: true });
                fuelUsedInput.dispatchEvent(event);
            } else if (distanceInput && distanceInput.value) {
                // Trigger transportation calculation
                const event = new Event('input', { bubbles: true });
                distanceInput.dispatchEvent(event);
            }
            
            console.log('Emission factors populated:', factor);
        }
    }

    // Show popup for multiple emission factors
    function showEmissionFactorsPopup(factors, row, selectionType) {
        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'emission-factors-modal';
        modalContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 20px;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;

        // Create table for emission factors
        let tableHTML = `
            <h4>Select Emission Factors for ${selectionType}</h4>
            <p>Multiple emission factors found. Please select the most appropriate one:</p>
            <table class="table table-bordered table-hover" style="width: 100%; margin-top: 15px;">
                <thead>
                    <tr>
                        <th>Vehicle Category</th>
                        <th>Sub-Category 1</th>
                        <th>Sub-Category 2</th>
                        <th>EF CO2</th>
                        <th>EF CH4</th>
                        <th>EF N2O</th>
                        <th>Unit</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        factors.forEach((factor, index) => {
            tableHTML += `
                <tr>
                    <td>${factor.vehicle_category || '-'}</td>
                    <td>${factor.vehicle_sub_category_1 || '-'}</td>
                    <td>${factor.vehicle_sub_category_2 || '-'}</td>
                    <td>${factor.ef_co2 || '0'}</td>
                    <td>${factor.ef_ch4 || '0'}</td>
                    <td>${factor.ef_n2o || '0'}</td>
                    <td>${factor.ef_unit || '-'}</td>
                    <td>
                        <button class="btn btn-primary btn-sm select-factor-btn" data-index="${index}">
                            Select
                        </button>
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn btn-secondary" id="cancel-selection">Cancel</button>
            </div>
        `;

        modalContent.innerHTML = tableHTML;
        modalContainer.appendChild(modalContent);
        document.body.appendChild(modalContainer);

        // Add event listeners
        modalContainer.querySelectorAll('.select-factor-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                const selectedFactor = factors[index];
                populateEmissionFactors(selectedFactor, row);
                showNotification(`Emission factors selected for ${selectionType}`, 'success');
                document.body.removeChild(modalContainer);
            });
        });

        modalContainer.querySelector('#cancel-selection').addEventListener('click', function() {
            document.body.removeChild(modalContainer);
        });

        // Close modal when clicking outside
        modalContainer.addEventListener('click', function(e) {
            if (e.target === modalContainer) {
                document.body.removeChild(modalContainer);
            }
        });
    }

    // Refresh dropdown options with current data
    function refreshDropdowns() {
        // Refresh fuel selection dropdowns
        const fuelSelects = root_element.querySelectorAll('.fuel-selection-select');
        fuelSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Fuel</option>' + 
                fuelSelections.map(fuel => `<option value="${fuel}">${fuel}</option>`).join('');
            select.value = currentValue; // Restore selected value
        });

        // Refresh transportation type dropdowns
        const transportSelects = root_element.querySelectorAll('.transportation-type-select');
        transportSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Select Transportation Type</option>' + 
                transportationTypes.map(type => `<option value="${type}">${type}</option>`).join('');
            select.value = currentValue; // Restore selected value
        });

        console.log('Dropdowns refreshed with current data');
    }

    // Check if there's any data in Mobile Combustion EF Master
    function checkEmissionFactorsData() {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Mobile Combustion EF Master',
                fields: ['name', 'calculation_method', 'region', 'fuel_type', 'vehicle_category'],
                limit: 10
            },
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    console.log('Available emission factors data:', r.message);
                } else {
                    console.log('No emission factors data found in Mobile Combustion EF Master');
                }
            }
        });
    }

    // Initialize the table
    function initializeTable() {
        const container = root_element.querySelector('.mobile-combustion-container');
        if (!container || isInitialized) {
            return;
        }

        console.log('Initializing mobile combustion...');
        
        // Build filter bar first
        buildFilterBar(async () => {
        await initializeFiltersFromContext();
        // Get user's region and load fuel/transportation types first
        Promise.all([getUserRegion(), loadFuelTypes(), loadTransportationTypes()]).then(() => {
            // Check available emission factors data
            checkEmissionFactorsData();
            
            // Refresh dropdowns with loaded data
            refreshDropdowns();
            
            // Setup tab functionality
            setupTabs();
            
            // Create data entry rows
            createFuelMethodEntryRow();
            createTransportationMethodEntryRow();
            
            // Load existing data from separate doctypes
            loadExistingData();
            
            // Add event listeners
            addEventListeners();
            
            isInitialized = true;
            console.log('Mobile combustion initialized successfully with region:', userRegion, 'and fuel types:', fuelSelections);
        });
        });
    }

    // Company/Unit Filter Helpers (aligned with fugitives)
    async function getUserContextMobile() {
        try {
            const r = await frappe.call({ method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' });
            return r.message || { company: null, units: [], is_super: false };
        } catch (e) {
            console.error('Failed to fetch user context', e);
            return { company: null, units: [], is_super: false };
        }
    }

    const metaCacheMC = {};
    async function hasFieldMC(doctype, fieldname){
        try {
            if (!metaCacheMC[doctype]){
                const r = await frappe.call({ method: 'frappe.client.get', args: { doctype: 'DocType', name: doctype } });
                metaCacheMC[doctype] = r.message || {};
            }
            const fields = metaCacheMC[doctype].fields || [];
            return fields.some(f=> f.fieldname === fieldname);
        } catch(e){ return false; }
    }

    function buildFilterBar(done) {
        const container = root_element.querySelector('.mobile-combustion-container');
        const header = container ? container.querySelector('.header-section') : null;
        if (!header) { done && done(); return; }
        if (container.querySelector('.filter-bar')) { done && done(); return; }
        // Only show for System Manager or Super Admin
        (async () => {
            try {
                const ctx = await getUserContextMobile();
                const roles = (frappe && frappe.get_roles) ? frappe.get_roles() : [];
                const canShow = ctx.is_super || roles.includes('System Manager') || roles.includes('Super Admin');
                if (!canShow) { done && done(); return; }
            } catch (e) { done && done(); return; }
        })();
        const bar = document.createElement('div');
        bar.className = 'filter-bar';
        bar.innerHTML = `
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:nowrap; margin:8px 0;">
                <div class="company-filter" style="min-width:220px; display:flex; align-items:center; gap:8px;">
                    <label style="font-size:12px; margin:0; white-space:nowrap;">Company</label>
                    <select class="form-control filter-company-select" style="width:260px;"></select>
                </div>
                <div class="unit-filter" style="min-width:220px; display:flex; align-items:center; gap:8px;">
                    <label style="font-size:12px; margin:0; white-space:nowrap;">Unit</label>
                    <select class="form-control filter-unit-select" style="width:260px;"></select>
                </div>
                <div>
                    <button type="button" class="btn btn-secondary filter-apply-btn">Apply</button>
                </div>
            </div>
        `;
        header.insertAdjacentElement('afterend', bar);
        bar.querySelector('.filter-apply-btn').addEventListener('click', () => {
            const csel = bar.querySelector('.filter-company-select');
            const usel = bar.querySelector('.filter-unit-select');
            selectedCompany = csel.value || null;
            selectedUnit = usel.value || null;
            loadExistingData();
        });
        done && done();
    }

    async function fetchCompanies() {
        const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Company', fields: ['name'], limit: 500 } });
        return (r.message || []).map(r => r.name);
    }

    async function fetchUnits(company) {
        const filters = company ? { company } : {};
        const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Units', fields: ['name'], filters, limit: 500 } });
        return (r.message || []).map(r => r.name);
    }

    async function initializeFiltersFromContext() {
        const ctx = await getUserContextMobile();
        const bar = root_element.querySelector('.filter-bar');
        if (!bar) return;
        const companySelect = bar.querySelector('.filter-company-select');
        const unitSelect = bar.querySelector('.filter-unit-select');

        companySelect.innerHTML = '';
        unitSelect.innerHTML = '';

        if (ctx.is_super) {
            const companies = await fetchCompanies();
            companySelect.innerHTML = `<option value="">All Companies</option>` + companies.map(c => `<option value="${c}">${c}</option>`).join('');
            companySelect.addEventListener('change', async () => {
                selectedCompany = companySelect.value || null;
                const units = await fetchUnits(selectedCompany);
                unitSelect.innerHTML = `<option value="">All Units</option>` + units.map(u => `<option value="${u}">${u}</option>`).join('');
                selectedUnit = null;
            });
            const initialUnits = await fetchUnits(null);
            unitSelect.innerHTML = `<option value="">All Units</option>` + initialUnits.map(u => `<option value="${u}">${u}</option>`).join('');
            selectedCompany = null;
            selectedUnit = null;
        } else {
            selectedCompany = ctx.company || null;
            companySelect.innerHTML = `<option value="${selectedCompany || ''}">${selectedCompany || '-'}</option>`;
            companySelect.disabled = true;

            let units = [];
            if (ctx.units && ctx.units.length) units = ctx.units;
            else if (selectedCompany) units = await fetchUnits(selectedCompany);
            if (!units || !units.length) {
                unitSelect.innerHTML = `<option value="">All Units</option>`;
                selectedUnit = null;
            } else {
                unitSelect.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
                selectedUnit = units.length === 1 ? units[0] : units[0];
            }
            unitSelect.disabled = !(ctx.units && ctx.units.length > 1);
        }
    }

    // Setup tab functionality
    function setupTabs() {
        const tabButtons = root_element.querySelectorAll('.tab-button');
        const tabContents = root_element.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                root_element.querySelector(`#${targetTab}`).classList.add('active');
            });
        });
    }

    // Create fuel method entry row
    function createFuelMethodEntryRow() {
        const tbody = root_element.querySelector('#fuelMethodTableBody');
        if (!tbody) return;

        // Clear existing entry row if any
        const existingEntryRow = tbody.querySelector('.data-entry-row');
        if (existingEntryRow) {
            existingEntryRow.remove();
        }

        const entryRow = document.createElement('tr');
        entryRow.className = 'data-entry-row';
        entryRow.innerHTML = `
            <td><input type="number" class="form-control s-no-input" value="${currentFuelRowId}" readonly></td>
            <td><input type="date" class="form-control date-input" required></td>
            <td><input type="text" class="form-control vehicle-no-input" placeholder="e.g. ABC1234, DL01AB1234" required pattern="[A-Za-z0-9\s\-]+" title="Vehicle number can contain letters, numbers, spaces, and hyphens"></td>
            <td>
                <select class="form-control fuel-selection-select" required>
                    <option value="">Select Fuel</option>
                    ${fuelSelections.map(fuel => `<option value="${fuel}">${fuel}</option>`).join('')}
                </select>
            </td>
            <td><input type="number" class="form-control fuel-used-input" placeholder="Enter fuel used" step="0.01" required></td>
            <td>
                <select class="form-control unit-selection-select" required>
                    <option value="">Select Unit</option>
                    ${fuelUnitOptions.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                </select>
            </td>
            <td><input type="number" class="form-control efco2-input" placeholder="EF CO2" step="0.0001" readonly></td>
            <td><input type="number" class="form-control efch4-input" placeholder="EF CH4" step="0.0001" readonly></td>
            <td><input type="number" class="form-control efn20-input" placeholder="EF N2O" step="0.0001" readonly></td>
            <td><input type="number" class="form-control eco2-input" placeholder="E CO2" step="0.01" readonly></td>
            <td><input type="number" class="form-control ech4-input" placeholder="E CH4" step="0.01" readonly></td>
            <td><input type="number" class="form-control en20-input" placeholder="E N2O" step="0.01" readonly></td>
            <td><input type="number" class="form-control etco2eq-input" placeholder="ET CO2eq" step="0.01" readonly></td>
            <td>
                <button type="button" class="btn btn-success btn-sm add-row-btn" data-method="fuel">
                    <i class="fa fa-plus"></i> Add
                </button>
            </td>
        `;

        tbody.appendChild(entryRow);
        setupFuelEntryRowEventListeners(entryRow);
    }

    // Create transportation method entry row
    function createTransportationMethodEntryRow() {
        const tbody = root_element.querySelector('#transportationMethodTableBody');
        if (!tbody) return;

        // Clear existing entry row if any
        const existingEntryRow = tbody.querySelector('.data-entry-row');
        if (existingEntryRow) {
            existingEntryRow.remove();
        }

        const entryRow = document.createElement('tr');
        entryRow.className = 'data-entry-row';
        entryRow.innerHTML = `
            <td><input type="number" class="form-control s-no-input" value="${currentTransportRowId}" readonly></td>
            <td><input type="date" class="form-control date-input" required></td>
            <td><input type="text" class="form-control vehicle-no-input" placeholder="e.g. ABC1234, DL01AB1234" required pattern="[A-Za-z0-9\s\-]+" title="Vehicle number can contain letters, numbers, spaces, and hyphens"></td>
            <td>
                <select class="form-control transportation-type-select" required>
                    <option value="">Select Transportation Type</option>
                    ${transportationTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
                </select>
            </td>
            <td><input type="number" class="form-control distance-traveled-input" placeholder="Enter distance" step="0.01" required></td>
            <td>
                <select class="form-control unit-selection-select" required>
                    <option value="">Select Unit</option>
                    ${transportUnitOptions.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                </select>
            </td>
            <td><input type="number" class="form-control efco2-input" placeholder="EF CO2" step="0.0001" readonly></td>
            <td><input type="number" class="form-control efch4-input" placeholder="EF CH4" step="0.0001" readonly></td>
            <td><input type="number" class="form-control efn20-input" placeholder="EF N2O" step="0.0001" readonly></td>
            <td><input type="number" class="form-control eco2-input" placeholder="E CO2" step="0.01" readonly></td>
            <td><input type="number" class="form-control ech4-input" placeholder="E CH4" step="0.01" readonly></td>
            <td><input type="number" class="form-control en20-input" placeholder="E N2O" step="0.01" readonly></td>
            <td><input type="number" class="form-control etco2eq-input" placeholder="ET CO2eq" step="0.01" readonly></td>
            <td>
                <button type="button" class="btn btn-success btn-sm add-row-btn" data-method="transportation">
                    <i class="fa fa-plus"></i> Add
                </button>
            </td>
        `;

        tbody.appendChild(entryRow);
        setupTransportationEntryRowEventListeners(entryRow);
    }

    // Setup fuel method entry row event listeners
    function setupFuelEntryRowEventListeners(row) {
        const fuelUsedInput = row.querySelector('.fuel-used-input');
        const efco2Input = row.querySelector('.efco2-input');
        const efch4Input = row.querySelector('.efch4-input');
        const efn20Input = row.querySelector('.efn20-input');
        const eco2Input = row.querySelector('.eco2-input');
        const ech4Input = row.querySelector('.ech4-input');
        const en20Input = row.querySelector('.en20-input');
        const etco2eqInput = row.querySelector('.etco2eq-input');
        const vehicleNoInput = row.querySelector('.vehicle-no-input');

        // Fix vehicle number input focus issue - specifically for letter input
        if (vehicleNoInput) {
            vehicleNoInput.addEventListener('focus', function(e) {
                e.stopPropagation();
                this.focus();
            });
            
            // Specific handler for letter keystrokes that trigger awesome search
            vehicleNoInput.addEventListener('keydown', function(e) {
                // Check if it's a letter key that would trigger global search
                var isLetter = /^[a-zA-Z]$/.test(e.key);
                
                if (isLetter) {
                    // Stop the event from bubbling up to global search handlers
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    
                    // Ensure this field maintains focus
                    var self = this;
                    setTimeout(function() {
                        self.focus();
                    }, 1);
                }
                
                // Allow normal navigation and editing keys
                if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
                    e.key === 'Enter' || e.key === 'Escape' || e.key.startsWith('Arrow')) {
                    // Don't interfere with these keys
                    return true;
                }
            });
            
            vehicleNoInput.addEventListener('input', function(e) {
                e.stopPropagation();
                
                // Hide awesome search if it appeared
                var awesomeSearch = document.querySelector('.awesomplete ul');
                if (awesomeSearch) {
                    awesomeSearch.style.display = 'none';
                }
                
                var searchDialog = document.querySelector('.search-dialog');
                if (searchDialog) {
                    searchDialog.style.display = 'none';
                }
            });
        }

        function calculateFuelEmissions() {
            const fuelUsed = parseFloat(fuelUsedInput.value) || 0;
            const efco2 = parseFloat(efco2Input.value) || 0;
            const efch4 = parseFloat(efch4Input.value) || 0;
            const efn20 = parseFloat(efn20Input.value) || 0;

            // Formula: E = Fuel Used × EF
            const eco2 = fuelUsed * efco2;
            const ech4 = fuelUsed * efch4;
            const en20 = fuelUsed * efn20;
            const etco2eq = eco2 + ech4 + en20;

            eco2Input.value = eco2.toFixed(2);
            ech4Input.value = ech4.toFixed(2);
            en20Input.value = en20.toFixed(2);
            etco2eqInput.value = etco2eq.toFixed(2);
        }

        [fuelUsedInput, efco2Input, efch4Input, efn20Input].forEach(input => {
            input.addEventListener('input', calculateFuelEmissions);
        });

        // Add fuel selection change handler
        const fuelSelectionSelect = row.querySelector('.fuel-selection-select');
        if (fuelSelectionSelect) {
            fuelSelectionSelect.addEventListener('change', function() {
                const selectedFuel = this.value;
                if (selectedFuel) {
                    lookupEmissionFactors(selectedFuel, 'Fuel-Based', row);
                }
            });
        }

        const addBtn = row.querySelector('.add-row-btn');
        addBtn.addEventListener('click', () => addNewFuelRow(row));
    }

    // Setup transportation method entry row event listeners
    function setupTransportationEntryRowEventListeners(row) {
        const distanceInput = row.querySelector('.distance-traveled-input');
        const efco2Input = row.querySelector('.efco2-input');
        const efch4Input = row.querySelector('.efch4-input');
        const efn20Input = row.querySelector('.efn20-input');
        const eco2Input = row.querySelector('.eco2-input');
        const ech4Input = row.querySelector('.ech4-input');
        const en20Input = row.querySelector('.en20-input');
        const etco2eqInput = row.querySelector('.etco2eq-input');
        const vehicleNoInput = row.querySelector('.vehicle-no-input');

        // Fix vehicle number input focus issue - specifically for letter input
        if (vehicleNoInput) {
            vehicleNoInput.addEventListener('focus', function(e) {
                e.stopPropagation();
                this.focus();
            });
            
            // Specific handler for letter keystrokes that trigger awesome search
            vehicleNoInput.addEventListener('keydown', function(e) {
                // Check if it's a letter key that would trigger global search
                var isLetter = /^[a-zA-Z]$/.test(e.key);
                
                if (isLetter) {
                    // Stop the event from bubbling up to global search handlers
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    
                    // Ensure this field maintains focus
                    var self = this;
                    setTimeout(function() {
                        self.focus();
                    }, 1);
                }
                
                // Allow normal navigation and editing keys
                if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
                    e.key === 'Enter' || e.key === 'Escape' || e.key.startsWith('Arrow')) {
                    // Don't interfere with these keys
                    return true;
                }
            });
            
            vehicleNoInput.addEventListener('input', function(e) {
                e.stopPropagation();
                
                // Hide awesome search if it appeared
                var awesomeSearch = document.querySelector('.awesomplete ul');
                if (awesomeSearch) {
                    awesomeSearch.style.display = 'none';
                }
                
                var searchDialog = document.querySelector('.search-dialog');
                if (searchDialog) {
                    searchDialog.style.display = 'none';
                }
            });
        }

        function calculateTransportationEmissions() {
            const distance = parseFloat(distanceInput.value) || 0;
            const efco2 = parseFloat(efco2Input.value) || 0;
            const efch4 = parseFloat(efch4Input.value) || 0;
            const efn20 = parseFloat(efn20Input.value) || 0;

            // Formula: E = (Distance / Average Transport Constant) × EF
            const avgTransport = AVERAGE_TRANSPORT_CONSTANT;
            const eco2 = (distance / avgTransport) * efco2;
            const ech4 = (distance / avgTransport) * efch4;
            const en20 = (distance / avgTransport) * efn20;
            const etco2eq = eco2 + ech4 + en20;

            eco2Input.value = eco2.toFixed(2);
            ech4Input.value = ech4.toFixed(2);
            en20Input.value = en20.toFixed(2);
            etco2eqInput.value = etco2eq.toFixed(2);
        }

        [distanceInput, efco2Input, efch4Input, efn20Input].forEach(input => {
            input.addEventListener('input', calculateTransportationEmissions);
        });

        // Add transportation type change handler
        const transportationTypeSelect = row.querySelector('.transportation-type-select');
        if (transportationTypeSelect) {
            transportationTypeSelect.addEventListener('change', function() {
                const selectedTransportType = this.value;
                if (selectedTransportType) {
                    lookupEmissionFactors(selectedTransportType, 'Distance-Based', row);
                }
            });
        }

        const addBtn = row.querySelector('.add-row-btn');
        addBtn.addEventListener('click', () => addNewTransportationRow(row));
    }

    // Add new fuel row
    function addNewFuelRow(entryRow) {
        const formData = getFuelFormData(entryRow);
        if (!validateFuelFormData(formData)) return;

        // Save to Mobile Combustion Fuel Method doctype
        saveToDoctype('Mobile Combustion Fuel Method', formData, (success, docName) => {
            if (success) {
                // Create display row
                createFuelDisplayRow(formData, docName);
                
                // Clear entry row
                clearFuelEntryRow(entryRow);
                
                // Update serial number
                currentFuelRowId++;
                entryRow.querySelector('.s-no-input').value = currentFuelRowId;
                
                showNotification('Fuel method data saved successfully!', 'success');
            } else {
                showNotification('Error saving fuel method data!', 'error');
            }
        });
    }

    // Add new transportation row
    function addNewTransportationRow(entryRow) {
        const formData = getTransportationFormData(entryRow);
        if (!validateTransportationFormData(formData)) return;

        // Save to Mobile Combustion Transportation Method doctype
        saveToDoctype('Mobile Combustion Transportation Method', formData, (success, docName) => {
            if (success) {
                // Create display row
                createTransportationDisplayRow(formData, docName);
                
                // Clear entry row
                clearTransportationEntryRow(entryRow);
                
                // Update serial number
                currentTransportRowId++;
                entryRow.querySelector('.s-no-input').value = currentTransportRowId;
                
                showNotification('Transportation method data saved successfully!', 'success');
            } else {
                showNotification('Error saving transportation method data!', 'error');
            }
        });
    }

    // Get fuel form data
    function getFuelFormData(row) {
        return {
            s_no: currentFuelRowId,
            date: row.querySelector('.date-input').value,
            vehicle_no: row.querySelector('.vehicle-no-input').value,
            fuel_selection: row.querySelector('.fuel-selection-select').value,
            fuel_used: parseFloat(row.querySelector('.fuel-used-input').value) || 0,
            unit_selection: row.querySelector('.unit-selection-select').value,
            efco2: parseFloat(row.querySelector('.efco2-input').value) || 0,
            efch4: parseFloat(row.querySelector('.efch4-input').value) || 0,
            efn20: parseFloat(row.querySelector('.efn20-input').value) || 0,
            eco2: parseFloat(row.querySelector('.eco2-input').value) || 0,
            ech4: parseFloat(row.querySelector('.ech4-input').value) || 0,
            en20: parseFloat(row.querySelector('.en20-input').value) || 0,
            etco2eq: parseFloat(row.querySelector('.etco2eq-input').value) || 0
        };
    }

    // Get transportation form data
    function getTransportationFormData(row) {
        return {
            s_no: currentTransportRowId,
            date: row.querySelector('.date-input').value,
            vehicle_no: row.querySelector('.vehicle-no-input').value,
            transportation_type: row.querySelector('.transportation-type-select').value,
            distance_traveled: parseFloat(row.querySelector('.distance-traveled-input').value) || 0,
            unit_selection: row.querySelector('.unit-selection-select').value,
            efco2: parseFloat(row.querySelector('.efco2-input').value) || 0,
            efch4: parseFloat(row.querySelector('.efch4-input').value) || 0,
            efn20: parseFloat(row.querySelector('.efn20-input').value) || 0,
            eco2: parseFloat(row.querySelector('.eco2-input').value) || 0,
            ech4: parseFloat(row.querySelector('.ech4-input').value) || 0,
            en20: parseFloat(row.querySelector('.en20-input').value) || 0,
            etco2eq: parseFloat(row.querySelector('.etco2eq-input').value) || 0
        };
    }

    // Validate fuel form data
    function validateFuelFormData(data) {
        if (!data.date) {
            showNotification('Please select a date', 'error');
            return false;
        }
        if (!data.vehicle_no) {
            showNotification('Please enter vehicle number', 'error');
            return false;
        }
        if (!data.fuel_selection) {
            showNotification('Please select fuel type', 'error');
            return false;
        }
        if (!data.fuel_used || data.fuel_used <= 0) {
            showNotification('Please enter valid fuel used amount', 'error');
            return false;
        }
        if (!data.unit_selection) {
            showNotification('Please select unit', 'error');
            return false;
        }
        return true;
    }

    // Validate transportation form data
    function validateTransportationFormData(data) {
        if (!data.date) {
            showNotification('Please select a date', 'error');
            return false;
        }
        if (!data.vehicle_no) {
            showNotification('Please enter vehicle number', 'error');
            return false;
        }
        if (!data.transportation_type) {
            showNotification('Please select transportation type', 'error');
            return false;
        }
        if (!data.distance_traveled || data.distance_traveled <= 0) {
            showNotification('Please enter valid distance traveled', 'error');
            return false;
        }
        if (!data.unit_selection) {
            showNotification('Please select unit', 'error');
            return false;
        }
        return true;
    }

    // Save to doctype (for separate doctypes) with company/unit context
    function saveToDoctype(doctypeName, data, callback) {
        (async () => {
            const ctx = await getUserContextMobile();
            const doc = { doctype: doctypeName, ...data };
            const companyVal = ctx.is_super ? (selectedCompany || ctx.company || null) : (ctx.company || null);
            const unitVal = selectedUnit || (ctx.units && ctx.units.length === 1 ? ctx.units[0] : null);
            if (!companyVal) {
                frappe.show_alert({ message: 'Please select a Company in the filter.', indicator: 'red' });
                callback(false); return;
            }
            // Set both common field names to be safe
            doc.company = companyVal;
            if (unitVal) { doc.unit = unitVal; doc.company_unit = unitVal; }

            frappe.call({
                method: 'frappe.client.insert',
                args: { doc },
                callback: function(r) {
                    if (r.exc) {
                        // If unit is mandatory under a different field, try toggling
                        if (!unitVal) { frappe.show_alert({ message: 'Please select a Unit in the filter.', indicator: 'red' }); }
                        callback(false);
                    } else {
                        callback(true, r.message && r.message.name);
                    }
                }
            });
        })();
    }

    // Create fuel display row
    function createFuelDisplayRow(data, docName) {
        const tbody = root_element.querySelector('#fuelMethodTableBody');
        const displayRow = document.createElement('tr');
        displayRow.className = 'data-display-row';
        displayRow.dataset.docName = docName;
        
        displayRow.innerHTML = `
            <td>${data.s_no}</td>
            <td>${formatDate(data.date)}</td>
            <td>${data.vehicle_no}</td>
            <td>${data.fuel_selection}</td>
            <td>${data.fuel_used}</td>
            <td>${data.unit_selection}</td>
            <td>${data.efco2.toFixed(4)}</td>
            <td>${data.efch4.toFixed(4)}</td>
            <td>${data.efn20.toFixed(4)}</td>
            <td>${data.eco2.toFixed(2)}</td>
            <td>${data.ech4.toFixed(2)}</td>
            <td>${data.en20.toFixed(2)}</td>
            <td>${data.etco2eq.toFixed(2)}</td>
            <td>
                <button type="button" class="btn btn-danger btn-sm delete-row-btn" data-doc-name="${docName}" data-doctype="Mobile Combustion Fuel Method">
                    <i class="fa fa-trash"></i> Delete
                </button>
            </td>
        `;

        // Insert after the entry row (form filler row)
        const entryRow = tbody.querySelector('.data-entry-row');
        if (entryRow.nextSibling) {
            tbody.insertBefore(displayRow, entryRow.nextSibling);
        } else {
            tbody.appendChild(displayRow);
        }
        
        setupDisplayRowEventListeners(displayRow);
    }

    // Create transportation display row
    function createTransportationDisplayRow(data, docName) {
        const tbody = root_element.querySelector('#transportationMethodTableBody');
        const displayRow = document.createElement('tr');
        displayRow.className = 'data-display-row';
        displayRow.dataset.docName = docName;
        
        displayRow.innerHTML = `
            <td>${data.s_no}</td>
            <td>${formatDate(data.date)}</td>
            <td>${data.vehicle_no}</td>
            <td>${data.transportation_type}</td>
            <td>${data.distance_traveled}</td>
            <td>${data.unit_selection}</td>
            <td>${data.efco2.toFixed(4)}</td>
            <td>${data.efch4.toFixed(4)}</td>
            <td>${data.efn20.toFixed(4)}</td>
            <td>${data.eco2.toFixed(2)}</td>
            <td>${data.ech4.toFixed(2)}</td>
            <td>${data.en20.toFixed(2)}</td>
            <td>${data.etco2eq.toFixed(2)}</td>
            <td>
                <button type="button" class="btn btn-danger btn-sm delete-row-btn" data-doc-name="${docName}" data-doctype="Mobile Combustion Transportation Method">
                    <i class="fa fa-trash"></i> Delete
                </button>
            </td>
        `;

        // Insert after the entry row (form filler row)
        const entryRow = tbody.querySelector('.data-entry-row');
        if (entryRow.nextSibling) {
            tbody.insertBefore(displayRow, entryRow.nextSibling);
        } else {
            tbody.appendChild(displayRow);
        }
        
        setupDisplayRowEventListeners(displayRow);
    }

    // Setup display row event listeners
    function setupDisplayRowEventListeners(row) {
        const deleteBtn = row.querySelector('.delete-row-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                const docName = this.dataset.docName;
                const doctype = this.dataset.doctype;
                deleteRow(docName, doctype, row);
            });
        }
    }

    // Delete row and doctype record
    function deleteRow(docName, doctype, row) {
        if (confirm('Are you sure you want to delete this record?')) {
            frappe.call({
                method: 'frappe.client.delete',
                args: {
                    doctype: doctype,
                    name: docName
                },
                callback: function(r) {
                    if (r.exc) {
                        console.error('Error deleting record:', r.exc);
                        showNotification('Error deleting record', 'error');
                    } else {
                        row.remove();
                        showNotification('Record deleted successfully', 'success');
                    }
                }
            });
        }
    }

    // Clear fuel entry row
    function clearFuelEntryRow(row) {
        row.querySelector('.date-input').value = '';
        row.querySelector('.vehicle-no-input').value = '';
        row.querySelector('.fuel-selection-select').value = '';
        row.querySelector('.fuel-used-input').value = '';
        row.querySelector('.unit-selection-select').value = '';
        row.querySelector('.efco2-input').value = '';
        row.querySelector('.efch4-input').value = '';
        row.querySelector('.efn20-input').value = '';
        row.querySelector('.eco2-input').value = '';
        row.querySelector('.ech4-input').value = '';
        row.querySelector('.en20-input').value = '';
        row.querySelector('.etco2eq-input').value = '';
    }

    // Clear transportation entry row
    function clearTransportationEntryRow(row) {
        row.querySelector('.date-input').value = '';
        row.querySelector('.vehicle-no-input').value = '';
        row.querySelector('.transportation-type-select').value = '';
        row.querySelector('.distance-traveled-input').value = '';
        row.querySelector('.unit-selection-select').value = '';
        row.querySelector('.efco2-input').value = '';
        row.querySelector('.efch4-input').value = '';
        row.querySelector('.efn20-input').value = '';
        row.querySelector('.eco2-input').value = '';
        row.querySelector('.ech4-input').value = '';
        row.querySelector('.en20-input').value = '';
        row.querySelector('.etco2eq-input').value = '';
    }

    // Load existing data from separate doctypes
    function loadExistingData() {
        (async () => {
        const ctx = await getUserContextMobile();
        // Load fuel method data
        const dtFuel = 'Mobile Combustion Fuel Method';
        const filtersFuel = {};
        if (await hasFieldMC(dtFuel, 'company')) {
            filtersFuel.company = ctx.is_super ? (selectedCompany || ctx.company || undefined) : (ctx.company || undefined);
        }
        if (await hasFieldMC(dtFuel, 'company_unit')) {
            if (selectedUnit) filtersFuel.company_unit = selectedUnit;
        }
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: dtFuel,
                fields: ['name', 's_no', 'date', 'vehicle_no', 'fuel_selection', 'fuel_used', 
                        'unit_selection', 'efco2', 'efch4', 'efn20', 'eco2', 'ech4', 'en20', 'etco2eq'],
                order_by: 'creation desc',
                limit: 20,
                filters: filtersFuel
            },
            callback: function(r) {
                if (r.message) {
                    console.log('Loaded fuel method data:', r.message);
                    const tbody = root_element.querySelector('#fuelMethodTableBody');
                    const existingRows = tbody.querySelectorAll('.data-display-row');
                    existingRows.forEach(row => row.remove());
                    
                    // Add existing records below the entry row (reverse order to show newest first)
                    r.message.reverse().forEach(record => {
                        createFuelDisplayRow(record, record.name);
                        if (record.s_no >= currentFuelRowId) {
                            currentFuelRowId = record.s_no + 1;
                        }
                    });
                    
                    const entryRow = tbody.querySelector('.data-entry-row');
                    if (entryRow) {
                        entryRow.querySelector('.s-no-input').value = currentFuelRowId;
                    }
                }
            }
        });

        // Load transportation method data
        const dtTrans = 'Mobile Combustion Transportation Method';
        const filtersTrans = {};
        if (await hasFieldMC(dtTrans, 'company')) {
            filtersTrans.company = ctx.is_super ? (selectedCompany || ctx.company || undefined) : (ctx.company || undefined);
        }
        if (await hasFieldMC(dtTrans, 'company_unit')) {
            if (selectedUnit) filtersTrans.company_unit = selectedUnit;
        }
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: dtTrans,
                fields: ['name', 's_no', 'date', 'vehicle_no', 'transportation_type', 'distance_traveled', 
                        'unit_selection', 'efco2', 'efch4', 'efn20', 'eco2', 'ech4', 'en20', 'etco2eq'],
                order_by: 'creation desc',
                limit: 20,
                filters: filtersTrans
            },
            callback: function(r) {
                if (r.message) {
                    console.log('Loaded transportation method data:', r.message);
                    const tbody = root_element.querySelector('#transportationMethodTableBody');
                    const existingRows = tbody.querySelectorAll('.data-display-row');
                    existingRows.forEach(row => row.remove());
                    
                    // Add existing records below the entry row (reverse order to show newest first)
                    r.message.reverse().forEach(record => {
                        createTransportationDisplayRow(record, record.name);
                        if (record.s_no >= currentTransportRowId) {
                            currentTransportRowId = record.s_no + 1;
                        }
                    });
                    
                    const entryRow = tbody.querySelector('.data-entry-row');
                    if (entryRow) {
                        entryRow.querySelector('.s-no-input').value = currentTransportRowId;
                    }
                }
            }
        });
        })();
    }

    // Add event listeners and disable global shortcuts for letter input
    function addEventListeners() {
        console.log('Event listeners added - targeting letter input interference');
        
        // Specifically target letter input interference in vehicle number fields
        const container = root_element.querySelector('.mobile-combustion-container');
        if (container) {
            container.addEventListener('keydown', function(e) {
                // Check if user is typing in vehicle number input field
                if (e.target.classList.contains('vehicle-no-input')) {
                    // Specifically handle letter keys that trigger awesome search
                    var isLetter = /^[a-zA-Z]$/.test(e.key);
                    
                    if (isLetter) {
                        // Prevent awesome search trigger for letters
                        e.stopImmediatePropagation();
                        e.stopPropagation();
                        
                        console.log('Prevented awesome search trigger for letter:', e.key);
                        return true; // Allow normal typing
                    }
                }
            }, true); // Use capture phase to intercept early
            
            // Handle input events specifically for vehicle number fields
            container.addEventListener('input', function(e) {
                if (e.target.classList.contains('vehicle-no-input')) {
                    e.stopPropagation();
                    
                    // Explicitly hide awesome search if it appeared
                    setTimeout(function() {
                        var awesomeBar = document.querySelector('#navbar-search');
                        if (awesomeBar && awesomeBar !== document.activeElement) {
                            awesomeBar.blur();
                        }
                        
                        var awesomeDropdown = document.querySelector('.awesomplete ul');
                        if (awesomeDropdown) {
                            awesomeDropdown.style.display = 'none';
                        }
                    }, 1);
                }
            }, true);
        }
    }

    // Utility functions
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    function showNotification(message, type) {
        frappe.show_alert(message, type === 'success' ? 3 : 5);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTable);
    } else {
        initializeTable();
    }

    // Also initialize when the workspace is shown
    document.addEventListener('frappe:workspace:shown', function() {
        if (!isInitialized) {
            initializeTable();
        } else {
            loadExistingData();
        }
    });
})();