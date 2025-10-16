// Unified Stationary Combustion - JavaScript
// Matches the existing project structure and theme

// Immediately execute the initialization
console.log('--- UNIFIED STATIONARY COMBUSTION CODE IS RUNNING ---');
(function() {
    // Global variables
    let currentRowId = 1;
    let savedData = [];
    let customFuels = [];
    let isInitialized = false;
    let emissionFactorData = {}; // Store emission factor data
    let selectedCompany = null;
    let selectedUnit = null;
    let selectedDateFrom = null;
    let selectedDateTo = null;
    let isFilterVisible = true;
    
    // root_element is already defined in Frappe context

    // Fuel type mappings (static as requested)
    const fuelTypeMappings = {
        'Solid fossil': [
            'Anthracite', 'Bitumen', 'Brown coal', 'Briquettes', 'Coal tar', 
            'Coke oven coke', 'Coking coal', 'Gas coke', 'Lignite'
        ],
        'Liquid fossil': [
            'Aviation gasoline', 'Crude oil', 'Ethane', 'Gas/Diesel oil', 
            'Jet gasoline', 'Jet kerosene', 'Liquefied Petroleum Gases', 'Lubricants'
        ],
        'Gaseous fossil': [
            'Blast furnace gas', 'Coke oven gas', 'Gas works gas', 
            'Natural gas', 'Oxygen steel furnace gas'
        ],
        'Biomass': [
            'Biodiesels', 'Biogasoline', 'Charcoal', 'Landfill gas', 
            'Municipal waste', 'Other liquid biofuels', 'Other primary solid biofuels'
        ]
    };

    // Initialize the table
    function initializeTable() {
        const container = root_element.querySelector('.stationary-emissions-container');
        if (!container || isInitialized) {
            return;
        }

        console.log('Initializing unified stationary combustion...');
        
        // Load emission factor data first
        loadEmissionFactorData(() => {
            // Build filters, then entry row and data
            buildFilterBar(async () => {
                await initializeFiltersFromContext();
                createDataEntryRow();
                loadExistingData();
                addEventListeners();
                isInitialized = true;
                console.log('Unified stationary combustion initialized successfully');
            });
        });
    }

    // Load emission factor data using pagination to bypass server limits
    async function loadEmissionFactorData(callback) {
        console.log('Loading emission factor data using pagination...');
        emissionFactorData = {};
        let allRecords = [];
        let start = 0;
        const pageSize = 20; // Fetch in chunks of 20
        let lastBatchSize = 0;

        try {
            // Loop to fetch data in pages
            do {
                const records = await frappe.call({
                    method: 'frappe.client.get_list',
                    args: {
                        doctype: 'Emission Factor Master',
                        fields: ['fuel_type', 'fuel_name', 'lhv_ncv', 'density_liquid', 'density_gas',
                                'efco2_energy', 'efch4_energy', 'efn2o_energy', 
                                'efco2_mass', 'efch4_mass', 'efn2o_mass', 
                                'efco2_liquid', 'efch4_liquid', 'efn2o_liquid',
                                'efco2_gas', 'efch4_gas', 'efn2o_gas'],
                        limit_start: start, // The starting point of the page
                        limit_page_length: pageSize // The size of the page
                    }
                });

                if (records.message && records.message.length > 0) {
                    allRecords = allRecords.concat(records.message);
                    lastBatchSize = records.message.length;
                    start += pageSize; // Move to the next page for the next loop
                } else {
                    lastBatchSize = 0; // No more records found, stop the loop
                }
            } while (lastBatchSize === pageSize); // Continue as long as we get a full page

            console.log(`Successfully fetched a total of ${allRecords.length} records.`);

            // Process all the fetched records
            allRecords.forEach(record => {
                if (!emissionFactorData[record.fuel_type]) {
                    emissionFactorData[record.fuel_type] = {};
                }
                emissionFactorData[record.fuel_type][record.fuel_name] = {
                    lhv_ncv: record.lhv_ncv,
                    density_liquid: record.density_liquid,
                    density_gas: record.density_gas,
                    efco2_energy: record.efco2_energy,
                    efch4_energy: record.efch4_energy,
                    efn2o_energy: record.efn2o_energy,
                    efco2_mass: record.efco2_mass,
                    efch4_mass: record.efch4_mass,
                    efn2o_mass: record.efn2o_mass,
                    efco2_liquid: record.efco2_liquid,
                    efch4_liquid: record.efch4_liquid,
                    efn2o_liquid: record.efn2o_liquid,
                    efco2_gas: record.efco2_gas,
                    efch4_gas: record.efch4_gas,
                    efn2o_gas: record.efn2o_gas
                };
            });

            console.log('Emission factor data loaded:', emissionFactorData);

        } catch (err) {
            console.error('API error during paginated fetch:', err);
        } finally {
            // This ensures the rest of your table initialization runs
            // whether the fetch succeeded or failed.
            callback();
        }
    }

    // Helper: fetch current user company and units
    async function getUserContext() {
        try {
            const r = await frappe.call({
                method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units'
            });
            return r.message || { company: null, units: [], is_super: false };
        } catch (e) {
            console.error('Failed to fetch user context', e);
            return { company: null, units: [], is_super: false };
        }
    }

    function buildFilterBar(done) {
        const container = root_element.querySelector('.stationary-emissions-container');
        const header = container.querySelector('.header-section');
        if (!header) { done && done(); return; }
        const bar = document.createElement('div');
        bar.className = 'filter-bar';
        // Only show filter for System Manager or Super Admin
        (async () => {
            try {
                const ctx = await getUserContext();
                const roles = (frappe && frappe.get_roles) ? frappe.get_roles() : [];
                const canShow = ctx.is_super || roles.includes('System Manager') || roles.includes('Super Admin');
                if (!canShow) { done && done(); return; }
            } catch (e) { done && done(); return; }
        })();
        bar.innerHTML = `
            <div class="filter-header">
                <div class="filter-title">
                    <span class="filter-icon">🔍</span>
                    <span class="filter-text">Filters</span>
                </div>
                <button type="button" class="btn btn-toggle filter-toggle-btn">
                    <span class="toggle-icon">−</span>
                </button>
            </div>
            <div class="filter-content">
                <div class="filter-group">
                    <div class="company-filter">
                        <label>Company</label>
                        <select class="form-control filter-company-select"></select>
                    </div>
                    <div class="unit-filter">
                        <label>Unit</label>
                        <select class="form-control filter-unit-select"></select>
                    </div>
                    <div class="date-from-filter">
                        <label>From Date</label>
                        <input type="date" class="form-control filter-date-from">
                    </div>
                    <div class="date-to-filter">
                        <label>To Date</label>
                        <input type="date" class="form-control filter-date-to">
                    </div>
                </div>
                <div class="filter-actions">
                    <button type="button" class="btn filter-apply-btn">Apply</button>
                    <button type="button" class="btn btn-outline filter-clear-btn">Clear Dates</button>
                </div>
            </div>
        `;
        header.insertAdjacentElement('afterend', bar);
        bar.querySelector('.filter-apply-btn').addEventListener('click', () => {
            const csel = bar.querySelector('.filter-company-select');
            const usel = bar.querySelector('.filter-unit-select');
            const dateFrom = bar.querySelector('.filter-date-from');
            const dateTo = bar.querySelector('.filter-date-to');
            
            selectedCompany = csel.value || null;
            selectedUnit = usel.value || null;
            selectedDateFrom = dateFrom.value || null;
            selectedDateTo = dateTo.value || null;
            
            console.log('Filter values:', {
                company: selectedCompany,
                unit: selectedUnit,
                dateFrom: selectedDateFrom,
                dateTo: selectedDateTo
            });
            
            // Test date format
            if (selectedDateFrom) {
                console.log('Date From format test:', {
                    original: selectedDateFrom,
                    type: typeof selectedDateFrom,
                    isValid: !isNaN(Date.parse(selectedDateFrom))
                });
            }
            if (selectedDateTo) {
                console.log('Date To format test:', {
                    original: selectedDateTo,
                    type: typeof selectedDateTo,
                    isValid: !isNaN(Date.parse(selectedDateTo))
                });
            }
            
            loadExistingData();
        });
        
        // Clear only date fields
        bar.querySelector('.filter-clear-btn').addEventListener('click', () => {
            const dateFrom = bar.querySelector('.filter-date-from');
            const dateTo = bar.querySelector('.filter-date-to');
            
            // Clear only date fields
            dateFrom.value = '';
            dateTo.value = '';
            
            // Update selected date variables
            selectedDateFrom = null;
            selectedDateTo = null;
            
            console.log('Date fields cleared. Company:', selectedCompany, 'Unit:', selectedUnit);
            
            // Reload data with remaining filters
            loadExistingData();
        });
        
        // Toggle filter visibility
        bar.querySelector('.filter-toggle-btn').addEventListener('click', () => {
            const content = bar.querySelector('.filter-content');
            const toggleIcon = bar.querySelector('.toggle-icon');
            
            isFilterVisible = !isFilterVisible;
            
            if (isFilterVisible) {
                content.style.display = 'flex';
                toggleIcon.textContent = '−';
                bar.classList.remove('filter-collapsed');
            } else {
                content.style.display = 'none';
                toggleIcon.textContent = '+';
                bar.classList.add('filter-collapsed');
            }
        });
        
        done && done();
    }

    async function fetchCompanies() {
        const r = await frappe.call({
            method: 'frappe.client.get_list',
            args: { doctype: 'Company', fields: ['name'], limit: 500 }
        });
        return (r.message || []).map(r => r.name);
    }

    async function fetchUnits(company) {
        const filters = company ? { company } : {};
        const r = await frappe.call({
            method: 'frappe.client.get_list',
            args: { doctype: 'Units', fields: ['name'], filters, limit: 500 }
        });
        return (r.message || []).map(r => r.name);
    }

    async function initializeFiltersFromContext() {
        const ctx = await getUserContext();
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
            if (ctx.units && ctx.units.length) {
                units = ctx.units;
            } else if (selectedCompany) {
                units = await fetchUnits(selectedCompany);
            }
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

    function createDataEntryRow() {
        const tbody = root_element.querySelector('#emissionsTableBody');
        if (!tbody) {
            return;
        }

        // Check if entry row already exists (from HTML)
        let entryRow = tbody.querySelector('.data-entry-row');
        
        if (!entryRow) {
            // Create new entry row if it doesn't exist
            const fuelTypes = Object.keys(fuelTypeMappings);
            const fuelTypeOptions = fuelTypes.map(type => 
                `<option value="${type}">${type}</option>`
            ).join('');

            entryRow = document.createElement('tr');
            entryRow.className = 'data-entry-row';
            entryRow.innerHTML = `
                <td><input type="number" class="form-control s-no-input" placeholder="Auto" readonly></td>
                <td><input type="date" class="form-control date-input" required></td>
                <td><input type="text" class="form-control invoice-no-input" placeholder="Enter invoice number"></td>
                <td>
                    <input type="file" class="form-control file-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display: none;">
                    <button type="button" class="btn btn-outline-secondary btn-sm upload-btn">
                        <i class="fa fa-upload"></i> Upload
                    </button>
                    <span class="file-name"></span>
                </td>
                <td>
                    <select class="form-control fuel-type-select">
                        <option value="">Select Fuel Type</option>
                        ${fuelTypeOptions}
                    </select>
                </td>
                <td>
                    <select class="form-control fuel-selection-select" disabled>
                        <option value="">Select Fuel</option>
                    </select>
                </td>
                <td>
                    <select class="form-control activity-types-select">
                        <option value="">Select Activity</option>
                        <option value="Boilers">Boilers</option>
                        <option value="Burners">Burners</option>
                        <option value="Gen Sets">Gen Sets</option>
                        <option value="Furnace (Including Blast Furnace)">Furnace (Including Blast Furnace)</option>
                    </select>
                </td>
                <td><input type="number" class="form-control activity-data-input" placeholder="Enter activity data" step="0.01"></td>
                <td>
                    <select class="form-control unit-selection-select">
                        <option value="">Select Unit</option>
                        <option value="TJ">TJ (Terajoule - Energy Content)</option>
                        <option value="GJ">GJ (Gigajoule - Energy Content)</option>
                        <option value="kg">kg (Kilogram - Mass)</option>
                        <option value="litre">Litre (Volume - Liquid)</option>
                        <option value="m³">m³ (Cubic Meter - Volume)</option>
                        <option value="tonne">Tonne (Metric Ton - Mass)</option>
                    </select>
                </td>
                <td><input type="number" class="form-control efco2-input" placeholder="EF CO2" step="0.0001" readonly></td>
                <td><input type="number" class="form-control efch4-input" placeholder="EF CH4" step="0.0001" readonly></td>
                <td><input type="number" class="form-control efn2o-input" placeholder="EF N2O" step="0.0001" readonly></td>
                <td><input type="number" class="form-control eco2-input" placeholder="E CO2" step="0.00000001" readonly></td>
                <td><input type="number" class="form-control ech4-input" placeholder="E CH4" step="0.00000001" readonly></td>
                <td><input type="number" class="form-control en2o-input" placeholder="E N2O" step="0.00000001" readonly></td>
                <td><input type="number" class="form-control etco2eq-input" placeholder="ET CO2eq" step="0.01" readonly></td>
                <td>
                    <button type="button" class="btn btn-success btn-sm add-row-btn">
                        <i class="fa fa-plus"></i> Add
                    </button>
                </td>
            `;

            tbody.appendChild(entryRow);
        }
        
        // Always set up event listeners (whether row existed or was created)
        setupEntryRowEventListeners(entryRow);
        
        // Set initial serial number
        entryRow.querySelector('.s-no-input').value = currentRowId;
    }

    // Update unit options based on fuel type
    function updateUnitOptions(fuelType, unitSelect) {
        // Clear existing options
        unitSelect.innerHTML = '<option value="">Select Unit</option>';
        
        if (!fuelType) return;
        
        // Add units based on fuel type
        if (fuelType === 'Solid fossil' || fuelType === 'Biomass') {
            // For solid fuels and biomass, show kg and tonnes
            unitSelect.innerHTML += `
                <option value="kg">kg (Kilogram - Mass)</option>
                <option value="tonne">Tonne (Metric Ton - Mass)</option>
                <option value="TJ">TJ (Terajoule - Energy Content)</option>
                <option value="GJ">GJ (Gigajoule - Energy Content)</option>
            `;
        } else if (fuelType === 'Liquid fossil') {
            // For liquid fuels, show litre, kg, tonnes, TJ, GJ
            unitSelect.innerHTML += `
                <option value="litre">Litre (Volume - Liquid)</option>
                <option value="kg">kg (Kilogram - Mass)</option>
                <option value="tonne">Tonne (Metric Ton - Mass)</option>
                <option value="TJ">TJ (Terajoule - Energy Content)</option>
                <option value="GJ">GJ (Gigajoule - Energy Content)</option>
            `;
        } else if (fuelType === 'Gaseous fossil') {
            // For gaseous fuels, show m³, kg, TJ, GJ
            unitSelect.innerHTML += `
                <option value="m³">m³ (Cubic Meter - Volume)</option>
                <option value="kg">kg (Kilogram - Mass)</option>
                <option value="TJ">TJ (Terajoule - Energy Content)</option>
                <option value="GJ">GJ (Gigajoule - Energy Content)</option>
            `;
        } else {
            // Default options for other types
            unitSelect.innerHTML += `
                <option value="kg">kg (Kilogram - Mass)</option>
                <option value="tonne">Tonne (Metric Ton - Mass)</option>
                <option value="TJ">TJ (Terajoule - Energy Content)</option>
                <option value="GJ">GJ (Gigajoule - Energy Content)</option>
            `;
        }
    }

    function setupEntryRowEventListeners(entryRow) {
        // Fuel type change
        const fuelTypeSelect = entryRow.querySelector('.fuel-type-select');
        const fuelSelectionSelect = entryRow.querySelector('.fuel-selection-select');
        const unitSelect = entryRow.querySelector('.unit-selection-select');
        
        fuelTypeSelect.addEventListener('change', function() {
            const fuelType = this.value;
            fuelSelectionSelect.innerHTML = '<option value="">Select Fuel</option>';
            fuelSelectionSelect.disabled = !fuelType;
            
            // Clear emission factors when fuel type changes
            clearEmissionFactors(entryRow);
            
            if (fuelType && fuelTypeMappings[fuelType]) {
                fuelTypeMappings[fuelType].forEach(fuel => {
                    const option = document.createElement('option');
                    option.value = fuel;
                    option.textContent = fuel;
                    fuelSelectionSelect.appendChild(option);
                });
                console.log(`Loaded ${fuelTypeMappings[fuelType].length} fuels for ${fuelType}`);
            }
            
            // Update unit options based on fuel type
            updateUnitOptions(fuelType, unitSelect);
        });

        // Fuel selection change - AUTO-POPULATE EMISSION FACTORS
        fuelSelectionSelect.addEventListener('change', function() {
            const selectedFuelType = fuelTypeSelect.value;
            const selectedFuel = this.value;
            
            const efco2Input = entryRow.querySelector('.efco2-input');
            const efch4Input = entryRow.querySelector('.efch4-input');
            const efn2oInput = entryRow.querySelector('.efn2o-input');
            
            // Update unit options based on specific fuel selection
            updateUnitOptionsForFuel(selectedFuelType, selectedFuel, unitSelect);
            
            if (selectedFuelType && selectedFuel) {
                // Get emission factors from loaded data
                const factors = getEmissionFactors(selectedFuelType, selectedFuel);
                
                // Populate emission factor fields
                efco2Input.value = factors.efco2;
                efch4Input.value = factors.efch4;
                efn2oInput.value = factors.ef_n2o;
                
                console.log(`Auto-populated emission factors for ${selectedFuel}:`, factors);
                
                // Apply appropriate styling
                if (factors.notFound) {
                    // Mark as manual entry required
                    efco2Input.classList.remove('auto-populated');
                    efch4Input.classList.remove('auto-populated');
                    efn2oInput.classList.remove('auto-populated');
                    efco2Input.classList.add('manual-entry');
                    efch4Input.classList.add('manual-entry');
                    efn2oInput.classList.add('manual-entry');
                    
                    showNotification(`No emission factors found for ${selectedFuel}. Please enter manually.`, 'warning');
                } else {
                    // Mark as auto-populated
                    efco2Input.classList.remove('manual-entry');
                    efch4Input.classList.remove('manual-entry');
                    efn2oInput.classList.remove('manual-entry');
                    efco2Input.classList.add('auto-populated');
                    efch4Input.classList.add('auto-populated');
                    efn2oInput.classList.add('auto-populated');
                    
                    showNotification(`Emission factors loaded for ${selectedFuel}`, 'success');
                }
                
                // Trigger calculation if quantity is already entered
                calculateEmissions(entryRow);
            } else {
                clearEmissionFactors(entryRow);
            }
        });

        // Unit selection change - recalculate emission factors
        unitSelect.addEventListener('change', function() {
            const selectedFuelType = fuelTypeSelect.value;
            const selectedFuel = fuelSelectionSelect.value;
            const selectedUnit = this.value;
            
            if (selectedFuelType && selectedFuel && selectedUnit) {
                // Get emission factors based on unit selection
                const factors = getEmissionFactors(selectedFuelType, selectedFuel, selectedUnit);
                
                // Update emission factor fields
                const efco2Input = entryRow.querySelector('.efco2-input');
                const efch4Input = entryRow.querySelector('.efch4-input');
                const efn2oInput = entryRow.querySelector('.efn2o-input');
                
                efco2Input.value = factors.efco2;
                efch4Input.value = factors.efch4;
                efn2oInput.value = factors.ef_n2o;
                
                console.log(`Updated emission factors for ${selectedFuel} with unit ${selectedUnit}:`, factors);
                
                // Trigger calculation
                calculateEmissions(entryRow);
            }
        });

        // Activity data change - auto-calculate emissions
        const activityDataInput = entryRow.querySelector('.activity-data-input');
        activityDataInput.addEventListener('input', function() {
            calculateEmissions(entryRow);
        });

        // Unit selection change - handle heating value basis and recalculate emission factors
        unitSelect.addEventListener('change', function() {
            const selectedFuelType = fuelTypeSelect.value;
            const selectedFuel = fuelSelectionSelect.value;
            const selectedUnit = this.value;
            const heatingValueBasisSelect = entryRow.querySelector('.heating-value-basis-select');
            
            // Handle heating value basis field based on unit selection
            if (['TJ', 'GJ'].includes(selectedUnit)) {
                // Energy units - restore original options and set default to "Lower"
                heatingValueBasisSelect.disabled = false;
                heatingValueBasisSelect.style.backgroundColor = '';
                heatingValueBasisSelect.style.color = '';
                
                // Restore original options for energy units
                heatingValueBasisSelect.innerHTML = `
                    <option value="">Select Basis</option>
                    <option value="Lower">Lower</option>
                    <option value="Higher">Higher</option>
                `;
                if (!heatingValueBasisSelect.value) {
                    heatingValueBasisSelect.value = 'Lower';
                }
            } else {
                // Non-energy units - dynamically update options to show only "NA"
                heatingValueBasisSelect.disabled = true;
                heatingValueBasisSelect.style.backgroundColor = '';
                heatingValueBasisSelect.style.color = '';
                
                // Clear existing options and add only "NA"
                heatingValueBasisSelect.innerHTML = `
                    <option value="">Select Basis</option>
                    <option value="NA">NA</option>
                `;
                heatingValueBasisSelect.value = 'NA';
            }
            
            if (selectedFuelType && selectedFuel && selectedUnit) {
                // Get emission factors based on unit selection
                const factors = getEmissionFactors(selectedFuelType, selectedFuel, selectedUnit);
                
                // Update emission factor fields
                const efco2Input = entryRow.querySelector('.efco2-input');
                const efch4Input = entryRow.querySelector('.efch4-input');
                const efn2oInput = entryRow.querySelector('.efn2o-input');
                
                efco2Input.value = factors.efco2;
                efch4Input.value = factors.efch4;
                efn2oInput.value = factors.ef_n2o;
                
                console.log(`Updated emission factors for ${selectedFuel} with unit ${selectedUnit}:`, factors);
                
                // Trigger calculation
                calculateEmissions(entryRow);
            }
        });

        // Add calculation listeners to all relevant inputs
        const efco2Input = entryRow.querySelector('.efco2-input');
        const efch4Input = entryRow.querySelector('.efch4-input');
        const efn2oInput = entryRow.querySelector('.efn2o-input');
        
        [activityDataInput, efco2Input, efch4Input, efn2oInput].forEach(input => {
            input.addEventListener('input', function() {
                calculateEmissions(entryRow);
            });
        });

        // Add button
        const addBtn = entryRow.querySelector('.add-row-btn');
        addBtn.addEventListener('click', function() {
            addEmissionEntry(entryRow);
        });

        // File upload - following mai.js pattern
        const fileInput = entryRow.querySelector('.file-input');
        const uploadBtn = entryRow.querySelector('.upload-btn');
        const fileName = entryRow.querySelector('.file-name');
        
        uploadBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                fileName.textContent = this.files[0].name;
                fileName.style.display = 'inline';
            }
        });
    }

    // Get emission factors for a specific fuel from database - following mai.js pattern
    function getEmissionFactors(fuelType, fuelName, unitSelection = null) {
        let factors = null;
        
        // First try exact match in the specified fuel type
        if (emissionFactorData[fuelType] && emissionFactorData[fuelType][fuelName]) {
            console.log(`Found exact match for ${fuelName} in ${fuelType}`);
            factors = emissionFactorData[fuelType][fuelName];
        } else {
            // Try to find across all fuel types with exact name match
            for (const dbFuelType in emissionFactorData) {
                if (emissionFactorData[dbFuelType][fuelName]) {
                    console.log(`Found ${fuelName} in ${dbFuelType} instead of ${fuelType}`);
                    factors = emissionFactorData[dbFuelType][fuelName];
                    break;
                }
            }
        }
        
        // If no exact match, try partial matches
        if (!factors) {
            const fuelNameVariations = [
                fuelName.replace('Liquefied', 'Liquified'),
                fuelName.replace('Liquified', 'Liquefied'),
                fuelName.replace(/^Gas\//, 'Gas/'), // Handle Gas/Diesel variations
                fuelName.replace(/^Gas\/Diesel oil$/, 'Gas/Diesel oil'),
                fuelName + 's', // Try plural
                fuelName.replace(/s$/, ''), // Try singular
                fuelName.replace(' ', ''), // Remove spaces
                fuelName.replace(/\s+/g, ' ') // Normalize spaces
            ];
            
            // Search through all fuel types in database for partial matches
            for (const dbFuelType in emissionFactorData) {
                for (const dbFuelName in emissionFactorData[dbFuelType]) {
                    // Try exact variations first
                    for (const variation of fuelNameVariations) {
                        if (dbFuelName === variation) {
                            console.log(`Found emission factors for ${fuelName} using exact variation ${dbFuelName}`);
                            factors = emissionFactorData[dbFuelType][dbFuelName];
                            break;
                        }
                    }
                    
                    if (factors) break;
                    
                    // Try substring matches
                    for (const variation of fuelNameVariations) {
                        if (dbFuelName.toLowerCase().includes(variation.toLowerCase()) || 
                            variation.toLowerCase().includes(dbFuelName.toLowerCase())) {
                            console.log(`Found emission factors for ${fuelName} using substring match ${dbFuelName}`);
                            factors = emissionFactorData[dbFuelType][dbFuelName];
                            break;
                        }
                    }
                    
                    if (factors) break;
                }
                if (factors) break;
            }
        }
        
        // If still no match, try some specific mappings for common mismatches
        if (!factors) {
            const specificMappings = {
                'Brown coal': 'Lignite',
                'Briquettes': 'Brown coal briquettes',
                'Municipal waste': 'Municipal wastes (Biomass fraction)',
                'Other liquid biofuels': 'Other liquid biofuels',
                'Other primary solid biofuels': 'Other primary solid biomass fuels'
            };
            
            if (specificMappings[fuelName]) {
                const mappedName = specificMappings[fuelName];
                for (const dbFuelType in emissionFactorData) {
                    if (emissionFactorData[dbFuelType][mappedName]) {
                        console.log(`Found emission factors for ${fuelName} using specific mapping ${mappedName}`);
                        factors = emissionFactorData[dbFuelType][mappedName];
                        break;
                    }
                }
            }
        }
        
        if (!factors) {
            console.warn(`No emission factors found for ${fuelName} in any fuel type`);
            return { efco2: 0, efch4: 0, ef_n2o: 0, notFound: true };
        }
        
        // Select appropriate emission factors based on unit selection
        if (unitSelection) {
            if (unitSelection === 'kg' || unitSelection === 'tonne') {
                // Use mass-based factors
                return {
                    efco2: factors.efco2_mass || 0,
                    efch4: factors.efch4_mass || 0,
                    ef_n2o: factors.efn2o_mass || 0
                };
            } else if (unitSelection === 'litre') {
                // Use liquid-based factors
                return {
                    efco2: factors.efco2_liquid || 0,
                    efch4: factors.efch4_liquid || 0,
                    ef_n2o: factors.efn2o_liquid || 0
                };
            } else if (unitSelection === 'm³') {
                // Use gas-based factors
                return {
                    efco2: factors.efco2_gas || 0,
                    efch4: factors.efch4_gas || 0,
                    ef_n2o: factors.efn2o_gas || 0
                };
            } else if (['TJ', 'GJ'].includes(unitSelection)) {
                // Use energy-based factors
                return {
                    efco2: factors.efco2_energy || 0,
                    efch4: factors.efch4_energy || 0,
                    ef_n2o: factors.efn2o_energy || 0
                };
            }
        }
        
        // Default to energy-based factors if no unit selection or unknown unit
        return {
            efco2: factors.efco2_energy || 0,
            efch4: factors.efch4_energy || 0,
            ef_n2o: factors.efn2o_energy || 0
        };
    }

    // Update unit options based on specific fuel selection - following mai.js pattern
    function updateUnitOptionsForFuel(fuelType, fuelName, unitSelect) {
        // Clear existing options
        unitSelect.innerHTML = '<option value="">Select Unit</option>';
        
        if (!fuelType || !fuelName) return;
        
        // Special case for Natural Gas - show kg, tonnes, and m³
        if (fuelName === 'Natural gas') {
            unitSelect.innerHTML += `
                <option value="kg">kg (Kilogram - Mass)</option>
                <option value="tonne">Tonne (Metric Ton - Mass)</option>
                <option value="m³">m³ (Cubic Meter - Volume)</option>
                <option value="TJ">TJ (Terajoule - Energy Content)</option>
                <option value="GJ">GJ (Gigajoule - Energy Content)</option>
            `;
            return;
        }
        
        // For other fuels, use the general fuel type logic
        updateUnitOptions(fuelType, unitSelect);
    }

    // Clear emission factors - following mai.js pattern
    function clearEmissionFactors(entryRow) {
        const efco2Input = entryRow.querySelector('.efco2-input');
        const efch4Input = entryRow.querySelector('.efch4-input');
        const efn2oInput = entryRow.querySelector('.efn2o-input');
        
        efco2Input.value = '';
        efch4Input.value = '';
        efn2oInput.value = '';
        
        // Clear styling classes
        efco2Input.classList.remove('auto-populated', 'manual-entry');
        efch4Input.classList.remove('auto-populated', 'manual-entry');
        efn2oInput.classList.remove('auto-populated', 'manual-entry');
        
        entryRow.querySelector('.eco2-input').value = '';
        entryRow.querySelector('.ech4-input').value = '';
        entryRow.querySelector('.en2o-input').value = '';
        entryRow.querySelector('.etco2eq-input').value = '';
    }

    // Show notification - following mai.js pattern
    function showNotification(message, type) {
        if (typeof frappe !== 'undefined' && frappe.show_alert) {
            frappe.show_alert(message, type === 'success' ? 3 : 5);
        } else {
            // Fallback for standalone use
            alert(message);
        }
    }

    function calculateEmissions(entryRow) {
        const quantity = parseFloat(entryRow.querySelector('.activity-data-input').value) || 0;
        const unit = entryRow.querySelector('.unit-selection-select').value;
        const efco2 = parseFloat(entryRow.querySelector('.efco2-input').value) || 0;
        const efch4 = parseFloat(entryRow.querySelector('.efch4-input').value) || 0;
        const efn2o = parseFloat(entryRow.querySelector('.efn2o-input').value) || 0;

        if (quantity > 0 && unit && (efco2 > 0 || efch4 > 0 || efn2o > 0)) {
            let eco2, ech4, en2o;
            
            if (['TJ', 'GJ'].includes(unit)) {
                // Energy-based calculation following the 3-step process from the image
                console.log('Using energy-based calculation (3-step process)');
                
                // Step 1: Quantity of fuel burned
                // Step 2: Emission factors are stored as kg GHG/TJ in database
                // Step 3: Emissions calculation
                
                if (unit === 'TJ') {
                    // For TJ: EF is already in kg GHG/TJ, so direct calculation
                    // CO2 emissions in metric tonnes = (Quantity TJ * EF CO2) / 1000
                    eco2 = (quantity * efco2) / 1000;
                    ech4 = (quantity * efch4) / 1000;
                    en2o = (quantity * efn2o) / 1000;
                    console.log(`Energy calculation (TJ): ${quantity} TJ * EF CO2 ${efco2} = ${eco2} tonnes CO2`);
                } else if (unit === 'GJ') {
                    // For GJ: Convert EF from kg GHG/TJ to kg GHG/GJ (divide by 1000)
                    // CO2 emissions in metric tonnes = (Quantity GJ * EF CO2/1000) / 1000
                    eco2 = (quantity * efco2) / 1000000; // Divide by 1,000,000 (1000 * 1000)
                    ech4 = (quantity * efch4) / 1000000;
                    en2o = (quantity * efn2o) / 1000000;
                    console.log(`Energy calculation (GJ): ${quantity} GJ * EF CO2 ${efco2/1000} = ${eco2} tonnes CO2`);
                }
                
            } else {
                // Simple calculation for mass/volume units
                console.log('Using simple calculation (direct multiplication)');
                eco2 = quantity * efco2;
                ech4 = quantity * efch4;
                en2o = quantity * efn2o;
            }

            // Calculate total CO2 equivalent (using GWP values: CH4=28, N2O=265)
            const etco2eq = eco2 + (ech4 * 28) + (en2o * 265);

            // Update form fields
            entryRow.querySelector('.eco2-input').value = formatNumber(eco2, 2);
            entryRow.querySelector('.ech4-input').value = formatNumber(ech4, 2);
            entryRow.querySelector('.en2o-input').value = formatNumber(en2o, 2);
            entryRow.querySelector('.etco2eq-input').value = formatNumber(etco2eq, 2);
            
            console.log(`Final emissions: CO2=${eco2.toFixed(2)}, CH4=${ech4.toFixed(2)}, N2O=${en2o.toFixed(2)}, Total=${etco2eq.toFixed(2)}`);
        } else {
            // Clear calculations if no valid data
            entryRow.querySelector('.eco2-input').value = '';
            entryRow.querySelector('.ech4-input').value = '';
            entryRow.querySelector('.en2o-input').value = '';
            entryRow.querySelector('.etco2eq-input').value = '';
        }
    }

    function addEmissionEntry(entryRow) {
        // Get form data from entry row - following mai.js pattern
        const formData = getFormData(entryRow);
        if (!validateFormData(formData)) return;

        // Save to doctype
        saveToDoctype(formData, (success, docName) => {
            if (success) {
                // Create display row
                createDataRow(formData, docName);
                
                // Clear entry row
                clearEntryRow(entryRow);
                
                // Update serial number
                currentRowId++;
                entryRow.querySelector('.s-no-input').value = currentRowId;
                
                showNotification('Data saved successfully!', 'success');
            } else {
                showNotification('Error saving data!', 'error');
            }
        });
    }

    // Save to doctype - following mai.js pattern
    function saveToDoctype(data, callback) {
        // First upload file if exists
        if (data.upload_invoice) {
            uploadFile(data.upload_invoice, (fileUrl) => {
                if (fileUrl) {
                    data.upload_invoice = fileUrl;
                    createDoctypeRecord(data, callback);
                } else {
                    // Continue without file if upload fails
                    data.upload_invoice = null;
                    createDoctypeRecord(data, callback);
                }
            });
        } else {
            createDoctypeRecord(data, callback);
        }
    }

    // Upload file - Store file in browser storage for viewing
    function uploadFile(file, callback) {
        console.log('Processing file:', file.name);
        
        // Store file in browser's localStorage for viewing
        const fileKey = 'unified_stationary_combustion_file_' + Date.now();
        const fileData = {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        };
        
        // Store file metadata
        localStorage.setItem(fileKey, JSON.stringify(fileData));
        
        // Store file content as base64
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Data = e.target.result;
            localStorage.setItem(fileKey + '_data', base64Data);
            console.log('File stored for viewing:', file.name);
            callback(fileKey); // Return the storage key
        };
        reader.readAsDataURL(file);
    }

    // Create doctype record
    function createDoctypeRecord(data, callback) {
        (async () => {
            const ctx = await getUserContext();
            const doc = {
                doctype: 'Unified Stationary Combustion',
                s_no: data.s_no,
                date: data.date,
                invoice_no: data.invoice_no,
                upload_invoice: data.upload_invoice,
                fuel_type: data.fuel_type,
                fuel_selection: data.fuel_selection,
                activity_types: data.activity_types,
                activity_data: data.activity_data,
                unit_selection: data.unit_selection,
                heating_value_basis: data.heating_value_basis,
                efco2: data.efco2,
                efch4: data.efch4,
                efn2o: data.ef_n2o,
                eco2: data.eco2,
                ech4: data.ech4,
                en2o: data.en2o,
                etco2eq: data.etco2eq
            };
            if (ctx.is_super) {
                if (selectedCompany) doc.company = selectedCompany;
                if (selectedUnit) { doc.company_unit = selectedUnit; }
            } else if (ctx.company) {
                doc.company = ctx.company;
                if (selectedUnit) { doc.company_unit = selectedUnit; }
                else if (ctx.units && ctx.units.length === 1) { doc.company_unit = ctx.units[0]; }
            }
            frappe.call({
                method: 'frappe.client.insert',
                args: { doc },
                callback: function(r) {
                    if (r.exc) {
                        console.error('Error creating record:', r.exc);
                        callback(false);
                    } else {
                        callback(true, r.message.name);
                    }
                }
            });
        })();
    }

    // Get form data from entry row - following mai.js pattern
    function getFormData(entryRow) {
        const heatingValueBasis = entryRow.querySelector('.heating-value-basis-select').value;
        return {
            s_no: currentRowId,
            date: entryRow.querySelector('.date-input').value,
            invoice_no: entryRow.querySelector('.invoice-no-input').value,
            upload_invoice: entryRow.querySelector('.file-input').files[0] || null,
            fuel_type: entryRow.querySelector('.fuel-type-select').value,
            fuel_selection: entryRow.querySelector('.fuel-selection-select').value,
            activity_types: entryRow.querySelector('.activity-types-select').value,
            activity_data: parseFloat(entryRow.querySelector('.activity-data-input').value) || 0,
            unit_selection: entryRow.querySelector('.unit-selection-select').value,
            heating_value_basis: heatingValueBasis || 'NA',
            efco2: parseFloat(entryRow.querySelector('.efco2-input').value) || 0,
            efch4: parseFloat(entryRow.querySelector('.efch4-input').value) || 0,
            ef_n2o: parseFloat(entryRow.querySelector('.efn2o-input').value) || 0,
            eco2: parseFloat(entryRow.querySelector('.eco2-input').value) || 0,
            ech4: parseFloat(entryRow.querySelector('.ech4-input').value) || 0,
            en2o: parseFloat(entryRow.querySelector('.en2o-input').value) || 0,
            etco2eq: parseFloat(entryRow.querySelector('.etco2eq-input').value) || 0
        };
    }

    // Validate form data - following mai.js pattern
    function validateFormData(data) {
        if (!data.date) {
            showNotification('Please select a date', 'error');
            return false;
        }
        if (!data.fuel_type) {
            showNotification('Please select fuel type', 'error');
            return false;
        }
        if (!data.fuel_selection) {
            showNotification('Please select fuel', 'error');
            return false;
        }
        if (!data.activity_types) {
            showNotification('Please select activity type', 'error');
            return false;
        }
        if (!data.activity_data || data.activity_data <= 0) {
            showNotification('Please enter valid activity data', 'error');
            return false;
        }
        if (!data.unit_selection) {
            showNotification('Please select unit', 'error');
            return false;
        }
        // Allow manual entry of emission factors if auto-population failed
        if (!data.efco2 && !data.efch4 && !data.ef_n2o) {
            showNotification('Please enter emission factors (EFCO2, EFCH4, EFN2O)', 'error');
            return false;
        }
        return true;
    }

    function createDataRow(data, docName = null) {
        console.log('Creating data row with data:', data);
        const tbody = root_element.querySelector('#emissionsTableBody');
        const dataRow = document.createElement('tr');
        dataRow.className = 'data-row';
        if (docName) dataRow.dataset.docName = docName;
        dataRow.innerHTML = `
            <td>${data.s_no}</td>
            <td>${formatDate(data.date)}</td>
            <td>${data.invoice_no || '-'}</td>
            <td>
                ${data.upload_invoice ? 
                    `<button type="button" class="btn btn-link btn-sm view-doc-btn" data-file-key="${data.upload_invoice}">
                        <i class="fa fa-eye"></i> View
                    </button>` : 
                    '-'
                }
            </td>
            <td>${data.fuel_type}</td>
            <td>${data.fuel_selection}</td>
            <td>${data.activity_types}</td>
            <td>${data.activity_data}</td>
            <td>${data.unit_selection}</td>
            <td>${data.heating_value_basis || 'NA'}</td>
            <td>${formatNumber((data.efco2 || 0), 2)}</td>
            <td>${formatNumber((data.efch4 || 0), 2)}</td>
            <td>${formatNumber((data.efn2o || data.ef_n2o || 0), 2)}</td>
            <td>${formatNumber((data.eco2 || 0), 2)}</td>
            <td>${formatNumber((data.ech4 || 0), 2)}</td>
            <td>${formatNumber((data.en2o || 0), 2)}</td>
            <td>${formatNumber((data.etco2eq || 0), 2)}</td>
            <td>
                <button class="btn btn-danger btn-sm delete-row-btn" data-doc-name="${docName || ''}">
                    <i class="fa fa-trash"></i> Delete
                </button>
            </td>
        `;
        
        // Insert after the entry row (form filler row) instead of before
        const entryRow = tbody.querySelector('.data-entry-row');
        if (entryRow.nextSibling) {
            tbody.insertBefore(dataRow, entryRow.nextSibling);
        } else {
            tbody.appendChild(dataRow);
        }
        
        // Add event listeners for the new row
        setupDataRowEventListeners(dataRow, data);
    }

    // Setup event listeners for data row - following mai.js pattern
    function setupDataRowEventListeners(row, data) {
        // View document button
        const viewDocBtn = row.querySelector('.view-doc-btn');
        if (viewDocBtn) {
            viewDocBtn.addEventListener('click', function() {
                const fileKey = this.dataset.fileKey;
                viewDocument(fileKey);
            });
        }

        // Delete row button
        const deleteBtn = row.querySelector('.delete-row-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
                const docName = this.dataset.docName;
                deleteRow(docName, row);
            });
        }
    }

    // View document from browser storage - following mai.js pattern
    function viewDocument(fileKey) {
        if (!fileKey) return;
        
        try {
            // Get file metadata
            const fileData = JSON.parse(localStorage.getItem(fileKey));
            const fileContent = localStorage.getItem(fileKey + '_data');
            
            if (fileData && fileContent) {
                console.log('Opening file:', fileData.name);
                
                // Create a blob URL for the file
                const byteCharacters = atob(fileContent.split(',')[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: fileData.type });
                
                // Create URL and open in new tab
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                
                // Clean up the URL after a delay
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
                showNotification('File not found', 'error');
            }
        } catch (error) {
            console.error('Error viewing file:', error);
            showNotification('Error viewing file', 'error');
        }
    }

    // Delete row and doctype record - following mai.js pattern
    function deleteRow(docName, row) {
        if (confirm('Are you sure you want to delete this record?')) {
            frappe.call({
                method: 'frappe.client.delete',
                args: {
                    doctype: 'Unified Stationary Combustion',
                    name: docName
                },
                callback: function(r) {
                    if (r.exc) {
                        console.error('Error deleting record:', r.exc);
                        showNotification('Error deleting record', 'error');
                    } else {
                        // Also delete the associated file from storage
                        const viewDocBtn = row.querySelector('.view-doc-btn');
                        if (viewDocBtn) {
                            const fileKey = viewDocBtn.dataset.fileKey;
                            if (fileKey) {
                                localStorage.removeItem(fileKey);
                                localStorage.removeItem(fileKey + '_data');
                            }
                        }
                        
                        row.remove();
                        showNotification('Record deleted successfully', 'success');
                    }
                }
            });
        }
    }

    // Format number to hide decimal if it's zero
    function formatNumber(value, decimals) {
        if (value === null || value === undefined || isNaN(value)) return '0';
        const formatted = parseFloat(value).toFixed(decimals);
        // Remove trailing zeros and decimal point if not needed
        return parseFloat(formatted).toString();
    }

    // Format date - following mai.js pattern
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    function clearEntryRow(entryRow) {
        // Clear all inputs except serial number - following mai.js pattern
        entryRow.querySelector('.date-input').value = '';
        entryRow.querySelector('.invoice-no-input').value = '';
        entryRow.querySelector('.file-input').value = '';
        entryRow.querySelector('.file-name').textContent = '';
        entryRow.querySelector('.file-name').style.display = 'none';
        entryRow.querySelector('.fuel-type-select').value = '';
        entryRow.querySelector('.fuel-selection-select').value = '';
        entryRow.querySelector('.fuel-selection-select').disabled = true;
        entryRow.querySelector('.activity-types-select').value = '';
        entryRow.querySelector('.activity-data-input').value = '';
        entryRow.querySelector('.unit-selection-select').value = '';
        entryRow.querySelector('.heating-value-basis-select').value = '';
        entryRow.querySelector('.heating-value-basis-select').style.backgroundColor = '';
        entryRow.querySelector('.heating-value-basis-select').style.color = '';
        
        // Clear emission factors and styling
        clearEmissionFactors(entryRow);
    }

    // Load existing data from doctype - following mai.js pattern
    function loadExistingData() {
        (async () => {
            const ctx = await getUserContext();
            const filters = {};
            if (ctx.is_super) {
                if (selectedCompany) filters.company = selectedCompany;
                if (selectedUnit) filters.company_unit = selectedUnit;
            } else if (ctx.company) {
                filters.company = ctx.company;
                if (selectedUnit) filters.company_unit = selectedUnit;
            }
            
            console.log('Applied filters:', filters);
            console.log('Date filters - From:', selectedDateFrom, 'To:', selectedDateTo);
            
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Unified Stationary Combustion',
                    fields: ['name', 's_no', 'date', 'invoice_no', 'upload_invoice', 'fuel_type', 
                            'fuel_selection', 'activity_types', 'activity_data', 'unit_selection', 'heating_value_basis',
                            'efco2', 'efch4', 'efn2o', 'eco2', 'ech4', 'en2o', 'etco2eq'],
                    order_by: 'creation desc',
                    limit: 20,
                    filters: filters
                },
                callback: function(r) {
                    if (r.message) {
                        console.log('Loaded existing data:', r.message);
                        console.log('Number of records returned:', r.message.length);
                        
                        // Apply client-side date filtering
                        let filteredData = r.message;
                        
                        if (selectedDateFrom || selectedDateTo) {
                            console.log('Applying client-side date filtering...');
                            console.log('Date filters - From:', selectedDateFrom, 'To:', selectedDateTo);
                            
                            filteredData = r.message.filter(record => {
                                const recordDate = new Date(record.date);
                                let includeRecord = true;
                                
                                if (selectedDateFrom) {
                                    const fromDate = new Date(selectedDateFrom);
                                    includeRecord = includeRecord && recordDate >= fromDate;
                                    console.log(`Record ${record.name} date ${record.date} >= ${selectedDateFrom}:`, recordDate >= fromDate);
                                }
                                
                                if (selectedDateTo) {
                                    const toDate = new Date(selectedDateTo);
                                    includeRecord = includeRecord && recordDate <= toDate;
                                    console.log(`Record ${record.name} date ${record.date} <= ${selectedDateTo}:`, recordDate <= toDate);
                                }
                                
                                console.log(`Record ${record.name} included:`, includeRecord);
                                return includeRecord;
                            });
                            
                            console.log('Filtered data:', filteredData);
                            console.log('Number of records after date filtering:', filteredData.length);
                        }
                        
                        console.log('Final data to display:', filteredData);
                        processExistingData(filteredData);
                    } else {
                        console.log('No existing data found');
                    }
                }
            });
        })();
    }

    // Process existing data - following mai.js pattern
    function processExistingData(data) {
        // Clear existing display rows
        const tbody = root_element.querySelector('#emissionsTableBody');
        const existingRows = tbody.querySelectorAll('.data-row');
        existingRows.forEach(row => row.remove());
        
        // Add display rows for existing data (reverse order to show newest first below form)
        data.reverse().forEach(record => {
            createDataRow(record, record.name);
            if (record.s_no > currentRowId) {
                currentRowId = record.s_no;
            }
        });
        currentRowId++;
        
        // Update entry row serial number
        const entryRow = tbody.querySelector('.data-entry-row');
        if (entryRow) {
            entryRow.querySelector('.s-no-input').value = currentRowId;
        }
        
        console.log(`Displayed ${data.length} existing records below form filler`);
    }

    function addEventListeners() {
        // Custom fuel functionality (if needed)
        const customFuelInput = root_element.querySelector('#customFuelInput');
        const addCustomFuelBtn = root_element.querySelector('.custom-fuel-section .btn');
        
        if (addCustomFuelBtn) {
            addCustomFuelBtn.addEventListener('click', function() {
                const fuelName = customFuelInput.value.trim();
                if (fuelName && !customFuels.includes(fuelName)) {
                    customFuels.push(fuelName);
                    customFuelInput.value = '';
                    showNotification('Custom fuel added!', 'success');
                }
            });
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
            // Reload data when workspace is shown again
            loadExistingData();
        }
    });

})();