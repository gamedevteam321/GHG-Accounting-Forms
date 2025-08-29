// Immediately execute the initialization
console.log('--- MY LATEST CODE IS RUNNING ---');
(function() {
    // Global variables
    let currentRowId = 1;
    let savedData = [];
    let customFuels = [];
    let isInitialized = false;
    let emissionFactorData = {}; // Store emission factor data
    let selectedCompany = null;
    let selectedUnit = null;

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

        console.log('Initializing stationary emissions...');
        
        // Load emission factor data first
        loadEmissionFactorData(() => {
            // Build filters, then entry row and data
            buildFilterBar(async () => {
                await initializeFiltersFromContext();
                createDataEntryRow();
                loadExistingData();
                addEventListeners();
                isInitialized = true;
                console.log('Stationary emissions initialized successfully');
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
                        fields: ['fuel_type', 'fuel_name', 'efco2_energy', 'efch4_energy', 'efn20_energy', 
                                'efco2_mass', 'efch4_mass', 'efn20_mass', 
                                'efco2_liquid', 'efch4_liquid', 'efn20_liquid',
                                'efco2_gas', 'efch4_gas', 'efn20_gas'],
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
                    efco2_energy: record.efco2_energy,
                    efch4_energy: record.efch4_energy,
                    efn20_energy: record.ef20_energy,
                    efco2_mass: record.efco2_mass,
                    efch4_mass: record.efch4_mass,
                    efn20_mass: record.efn20_mass,
                    efco2_liquid: record.efco2_liquid,
                    efch4_liquid: record.efch4_liquid,
                    efn20_liquid: record.efn20_liquid,
                    efco2_gas: record.efco2_gas,
                    efch4_gas: record.efch4_gas,
                    efn20_gas: record.efn20_gas
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
        bar.innerHTML = `
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin:8px 0;">
                <div class="company-filter" style="min-width:220px;">
                    <label style="font-size:12px; display:block;">Company</label>
                    <select class="form-control filter-company-select"></select>
                </div>
                <div class="unit-filter" style="min-width:220px;">
                    <label style="font-size:12px; display:block;">Unit</label>
                    <select class="form-control filter-unit-select"></select>
                </div>
                <div>
                    <button type="button" class="btn btn-secondary btn-sm filter-apply-btn">Apply</button>
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

    // Get available fuel types from static mappings
    function getAvailableFuelTypes() {
        return Object.keys(fuelTypeMappings);
    }

    // Get available fuels for a specific fuel type from static mappings
    function getAvailableFuels(fuelType) {
        return fuelTypeMappings[fuelType] || [];
    }

    // Get emission factors for a specific fuel from database
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
            if (unitSelection === 'kg' || unitSelection === 'Tonnes') {
                // Use mass-based factors
                return {
                    efco2: factors.efco2_mass || 0,
                    efch4: factors.efch4_mass || 0,
                    ef_n2o: factors.efn20_mass || 0
                };
            } else if (unitSelection === 'Litre') {
                // Use liquid-based factors
                return {
                    efco2: factors.efco2_liquid || 0,
                    efch4: factors.efch4_liquid || 0,
                    ef_n2o: factors.efn20_liquid || 0
                };
            } else if (unitSelection === 'm³') {
                // Use gas-based factors
                return {
                    efco2: factors.efco2_gas || 0,
                    efch4: factors.efch4_gas || 0,
                    ef_n2o: factors.efn20_gas || 0
                };
            }
        }
        
        // Default to mass-based factors if no unit selection or unknown unit
        return {
            efco2: factors.efco2_mass || 0,
            efch4: factors.efch4_mass || 0,
            ef_n2o: factors.efn20_mass || 0
        };
    }

    // Create data entry row
    function createDataEntryRow() {
        const tbody = root_element.querySelector('#emissionsTableBody');
        if (!tbody) {
            return;
        }

        // Clear existing entry row if any
        const existingEntryRow = tbody.querySelector('.data-entry-row');
        if (existingEntryRow) {
            existingEntryRow.remove();
        }

        // Get available fuel types from static mappings
        const fuelTypes = Object.keys(fuelTypeMappings);
        const fuelTypeOptions = fuelTypes.map(type => 
            `<option value="${type}">${type}</option>`
        ).join('');

        const entryRow = document.createElement('tr');
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
                    <option value="Tonnes">Tonnes</option>
                    <option value="kg">kg</option>
                    <option value="Litre">Litre</option>
                    <option value="m³">m³</option>
                </select>
            </td>
            <td><input type="number" class="form-control efco2-input" placeholder="EF CO2" step="0.0001" readonly></td>
            <td><input type="number" class="form-control efch4-input" placeholder="EF CH4" step="0.0001" readonly></td>
            <td><input type="number" class="form-control ef_n2o-input" placeholder="EF N2O" step="0.0001" readonly></td>
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
                <option value="kg">kg</option>
                <option value="Tonnes">Tonnes</option>
            `;
        } else if (fuelType === 'Liquid fossil') {
            // For liquid fuels, show kg, tonnes, and litres
            unitSelect.innerHTML += `
                <option value="kg">kg</option>
                <option value="Tonnes">Tonnes</option>
                <option value="Litre">Litre</option>
            `;
        } else if (fuelType === 'Gaseous fossil') {
            // For gaseous fuels, show kg and tonnes (m³ only for Natural gas)
            unitSelect.innerHTML += `
                <option value="kg">kg</option>
                <option value="Tonnes">Tonnes</option>
            `;
        }
    }

    // Update unit options based on specific fuel selection
    function updateUnitOptionsForFuel(fuelType, fuelName, unitSelect) {
        // Clear existing options
        unitSelect.innerHTML = '<option value="">Select Unit</option>';
        
        if (!fuelType || !fuelName) return;
        
        // Special case for Natural Gas - show kg, tonnes, and m³
        if (fuelName === 'Natural gas') {
            unitSelect.innerHTML += `
                <option value="kg">kg</option>
                <option value="Tonnes">Tonnes</option>
                <option value="m³">m³</option>
            `;
            return;
        }
        
        // For other fuels, use the general fuel type logic
        updateUnitOptions(fuelType, unitSelect);
    }

    // Setup event listeners for entry row
    function setupEntryRowEventListeners(row) {
        // Fuel type change
        const fuelTypeSelect = row.querySelector('.fuel-type-select');
        const fuelSelectionSelect = row.querySelector('.fuel-selection-select');
        const unitSelectionSelect = row.querySelector('.unit-selection-select');
        
        fuelTypeSelect.addEventListener('change', function() {
            const selectedType = this.value;
            
            // Clear fuel selection and emission factors
            fuelSelectionSelect.innerHTML = '<option value="">Select Fuel</option>';
            fuelSelectionSelect.disabled = !selectedType;
            clearEmissionFactors(row);
            
            // Update unit options based on fuel type
            updateUnitOptions(selectedType, unitSelectionSelect);
            
            if (selectedType && fuelTypeMappings[selectedType]) {
                // Populate fuel selection dropdown from static mappings
                fuelTypeMappings[selectedType].forEach(fuel => {
                    const option = document.createElement('option');
                    option.value = fuel;
                    option.textContent = fuel;
                    fuelSelectionSelect.appendChild(option);
                });
                
                console.log(`Loaded ${fuelTypeMappings[selectedType].length} fuels for ${selectedType}`);
            }
        });

        // Fuel selection change - AUTO-POPULATE EMISSION FACTORS
        fuelSelectionSelect.addEventListener('change', function() {
            const selectedFuelType = fuelTypeSelect.value;
            const selectedFuel = this.value;
            
            const efco2Input = row.querySelector('.efco2-input');
            const efch4Input = row.querySelector('.efch4-input');
            const ef_n2oInput = row.querySelector('.ef_n2o-input');
            
            // Update unit options based on specific fuel selection
            updateUnitOptionsForFuel(selectedFuelType, selectedFuel, unitSelectionSelect);
            
            if (selectedFuelType && selectedFuel) {
                // Get emission factors from loaded data (default to energy-based)
                const factors = getEmissionFactors(selectedFuelType, selectedFuel);
                
                // Populate emission factor fields
                efco2Input.value = factors.efco2;
                efch4Input.value = factors.efch4;
                ef_n2oInput.value = factors.ef_n2o;
                
                console.log(`Auto-populated emission factors for ${selectedFuel}:`, factors);
                
                // Apply appropriate styling
                if (factors.notFound) {
                    // Mark as manual entry required
                    efco2Input.classList.remove('auto-populated');
                    efch4Input.classList.remove('auto-populated');
                    ef_n2oInput.classList.remove('auto-populated');
                    efco2Input.classList.add('manual-entry');
                    efch4Input.classList.add('manual-entry');
                    ef_n2oInput.classList.add('manual-entry');
                    
                    showNotification(`No emission factors found for ${selectedFuel}. Please enter manually.`, 'warning');
                } else {
                    // Mark as auto-populated
                    efco2Input.classList.remove('manual-entry');
                    efch4Input.classList.remove('manual-entry');
                    ef_n2oInput.classList.remove('manual-entry');
                    efco2Input.classList.add('auto-populated');
                    efch4Input.classList.add('auto-populated');
                    ef_n2oInput.classList.add('auto-populated');
                    
                    showNotification(`Emission factors loaded for ${selectedFuel}`, 'success');
                }
                
                // Trigger calculation if activity data is already entered
                calculateEmissions();
            } else {
                clearEmissionFactors(row);
            }
        });

        // File upload
        const fileInput = row.querySelector('.file-input');
        const uploadBtn = row.querySelector('.upload-btn');
        const fileName = row.querySelector('.file-name');
        
        uploadBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                fileName.textContent = this.files[0].name;
                fileName.style.display = 'inline';
            }
        });

        // Auto-calculate emissions
        const activityDataInput = row.querySelector('.activity-data-input');
        const efco2Input = row.querySelector('.efco2-input');
        const efch4Input = row.querySelector('.efch4-input');
        const ef_n2oInput = row.querySelector('.ef_n2o-input');
        const eco2Input = row.querySelector('.eco2-input');
        const ech4Input = row.querySelector('.ech4-input');
        const en2oInput = row.querySelector('.en2o-input');
        const etco2eqInput = row.querySelector('.etco2eq-input');

        function calculateEmissions() {
            const activityData = parseFloat(activityDataInput.value) || 0;
            const efco2 = parseFloat(efco2Input.value) || 0;
            const efch4 = parseFloat(efch4Input.value) || 0;
            const ef_n2o = parseFloat(ef_n2oInput.value) || 0;
            const selectedUnit = unitSelectionSelect.value;

            if (activityData > 0 && selectedUnit) {
                let eco2, ech4, en2o;
                
                // Calculate emissions based on unit type
                if (selectedUnit === 'kg' || selectedUnit === 'Tonnes') {
                    // Mass-based calculation (kg CO2/tonne)
                    const massMultiplier = selectedUnit === 'kg' ? 0.001 : 1; // Convert kg to tonnes
                    eco2 = activityData * efco2 * massMultiplier;
                    ech4 = activityData * efch4 * massMultiplier;
                    en2o = activityData * ef_n2o * massMultiplier;
                } else if (selectedUnit === 'Litre') {
                    // Liquid-based calculation (kg CO2/litre)
                    eco2 = activityData * efco2;
                    ech4 = activityData * efch4;
                    en2o = activityData * ef_n2o;
                } else if (selectedUnit === 'm³') {
                    // Gas-based calculation (kg CO2/m³)
                    eco2 = activityData * efco2;
                    ech4 = activityData * efch4;
                    en2o = activityData * ef_n2o;
                } else {
                    // Default to energy-based calculation (kg CO2/TJ)
                    eco2 = activityData * efco2 / 1000; // Convert to tonnes
                    ech4 = activityData * efch4 / 1000; // Convert to tonnes
                    en2o = activityData * ef_n2o / 1000; // Convert to tonnes
                }
                
                // Calculate total CO2 equivalent using GWP values
                // GWP: CO2 = 1, CH4 = 25, N2O = 298 (IPCC AR4 values)
                const etco2eq = eco2 + (ech4 * 25) + (en2o * 298);

                // Update display values
                eco2Input.value = eco2.toFixed(8);
                ech4Input.value = ech4.toFixed(8);
                en2oInput.value = en2o.toFixed(8);
                etco2eqInput.value = etco2eq.toFixed(2);
            } else {
                // Clear calculations if no activity data or unit
                eco2Input.value = '';
                ech4Input.value = '';
                en2oInput.value = '';
                etco2eqInput.value = '';
            }
        }

        // Add calculation listeners to all relevant inputs
        [activityDataInput, efco2Input, efch4Input, ef_n2oInput].forEach(input => {
            input.addEventListener('input', calculateEmissions);
        });

        // Unit selection change - recalculate emission factors
        unitSelectionSelect.addEventListener('change', function() {
            const selectedFuelType = fuelTypeSelect.value;
            const selectedFuel = fuelSelectionSelect.value;
            const selectedUnit = this.value;
            
            if (selectedFuelType && selectedFuel && selectedUnit) {
                // Get emission factors based on unit selection
                const factors = getEmissionFactors(selectedFuelType, selectedFuel, selectedUnit);
                
                // Update emission factor fields
                efco2Input.value = factors.efco2;
                efch4Input.value = factors.efch4;
                ef_n2oInput.value = factors.ef_n2o;
                
                console.log(`Updated emission factors for ${selectedFuel} with unit ${selectedUnit}:`, factors);
                
                // Trigger calculation
                calculateEmissions();
            }
        });

        // Add row button
        const addBtn = row.querySelector('.add-row-btn');
        addBtn.addEventListener('click', () => addNewRow(row));
    }

    // Clear emission factors
    function clearEmissionFactors(row) {
        const efco2Input = row.querySelector('.efco2-input');
        const efch4Input = row.querySelector('.efch4-input');
        const ef_n2oInput = row.querySelector('.ef_n2o-input');
        
        efco2Input.value = '';
        efch4Input.value = '';
        ef_n2oInput.value = '';
        
        // Clear styling classes
        efco2Input.classList.remove('auto-populated', 'manual-entry');
        efch4Input.classList.remove('auto-populated', 'manual-entry');
        ef_n2oInput.classList.remove('auto-populated', 'manual-entry');
        
        row.querySelector('.eco2-input').value = '';
        row.querySelector('.ech4-input').value = '';
        row.querySelector('.en2o-input').value = '';
        row.querySelector('.etco2eq-input').value = '';
    }

    // Add new row with data
    function addNewRow(entryRow) {
        const formData = getFormData(entryRow);
        if (!validateFormData(formData)) return;

        // Save to doctype
        saveToDoctype(formData, (success, docName) => {
            if (success) {
                // Create display row
                createDisplayRow(formData, docName);
                
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

    // Get form data from entry row
    function getFormData(row) {
        return {
            s_no: currentRowId,
            date: row.querySelector('.date-input').value,
            invoice_no: row.querySelector('.invoice-no-input').value,
            upload_invoice: row.querySelector('.file-input').files[0] || null,
            fuel_type: row.querySelector('.fuel-type-select').value,
            fuel_selection: row.querySelector('.fuel-selection-select').value,
            activity_types: row.querySelector('.activity-types-select').value,
            activity_data: parseFloat(row.querySelector('.activity-data-input').value) || 0,
            unit_selection: row.querySelector('.unit-selection-select').value,
            efco2: parseFloat(row.querySelector('.efco2-input').value) || 0,
            efch4: parseFloat(row.querySelector('.efch4-input').value) || 0,
            ef_n2o: parseFloat(row.querySelector('.ef_n2o-input').value) || 0,
            eco2: parseFloat(row.querySelector('.eco2-input').value) || 0,
            ech4: parseFloat(row.querySelector('.ech4-input').value) || 0,
            en2o: parseFloat(row.querySelector('.en2o-input').value) || 0,
            etco2eq: parseFloat(row.querySelector('.etco2eq-input').value) || 0
        };
    }

    // Validate form data
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

    // Save to doctype
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

    // Create Stationary Emissions doctype if it doesn't exist
    function createStationaryEmissionsDoctype(callback) {
        // First, check if the doctype already exists
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'DocType',
                name: 'Stationary Emissions'
            },
            callback: function(r) {
                if (r.message) {
                    // Doctype exists, just proceed (unit options will be handled by the UI)
                    console.log('Stationary Emissions doctype already exists');
                    callback();
                } else {
                    // Doctype doesn't exist, create it
                    console.log('Creating new Stationary Emissions doctype...');
                    
                    frappe.call({
                        method: 'frappe.client.insert',
                        args: {
                            doc: {
                                doctype: 'DocType',
                                name: 'Stationary Emissions',
                                module: 'Climoro Onboarding',
                                istable: 0,
                                issingle: 0,
                                track_changes: 1,
                                fields: [
                                    {fieldname: 's_no', label: 'S.No', fieldtype: 'Int', reqd: 1},
                                    {fieldname: 'date', label: 'Date', fieldtype: 'Date', reqd: 1},
                                    {fieldname: 'invoice_no', label: 'Invoice No', fieldtype: 'Data'},
                                    {fieldname: 'upload_invoice', label: 'Upload Invoice', fieldtype: 'Data'},
                                    {fieldname: 'fuel_type', label: 'Fuel Type', fieldtype: 'Data', reqd: 1},
                                    {fieldname: 'fuel_selection', label: 'Fuel Selection', fieldtype: 'Data', reqd: 1},
                                    {fieldname: 'activity_types', label: 'Activity Types', fieldtype: 'Select', options: 'Boilers\nBurners\nGen Sets\nFurnace (Including Blast Furnace)', reqd: 1},
                                    {fieldname: 'activity_data', label: 'Activity Data', fieldtype: 'Float', reqd: 1},
                                    {fieldname: 'unit_selection', label: 'Unit Selection', fieldtype: 'Select', options: 'kg\nTonnes\nLitre\nm³', reqd: 1},
                                    {fieldname: 'efco2', label: 'EFCO2', fieldtype: 'Float'},
                                    {fieldname: 'efch4', label: 'EFCH4', fieldtype: 'Float'},
                                    {fieldname: 'ef_n2o', label: 'EFN2O', fieldtype: 'Float'},
                                    {fieldname: 'eco2', label: 'ECO2', fieldtype: 'Float'},
                                    {fieldname: 'ech4', label: 'ECH4', fieldtype: 'Float'},
                                    {fieldname: 'en2o', label: 'EN2O', fieldtype: 'Float'},
                                    {fieldname: 'etco2eq', label: 'ETCO2eq', fieldtype: 'Float'}
                                ],
                                permissions: [
                                    {role: 'System Manager', read: 1, write: 1, create: 1, delete: 1},
                                    {role: 'All', read: 1}
                                ]
                            }
                        },
                        callback: function(r2) {
                            if (r2.exc) {
                                console.error('Error creating Stationary Emissions doctype:', r2.exc);
                            } else {
                                console.log('Stationary Emissions doctype created successfully');
                            }
                            callback();
                        }
                    });
                }
            }
        });
    }



    // Upload file - Store file in browser storage for viewing
    function uploadFile(file, callback) {
        console.log('Processing file:', file.name);
        
        // Store file in browser's localStorage for viewing
        const fileKey = 'stationary_emissions_file_' + Date.now();
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
                doctype: 'Stationary Emissions',
                s_no: data.s_no,
                date: data.date,
                invoice_no: data.invoice_no,
                upload_invoice: data.upload_invoice,
                fuel_type: data.fuel_type,
                fuel_selection: data.fuel_selection,
                activity_types: data.activity_types,
                activity_data: data.activity_data,
                unit_selection: data.unit_selection,
                efco2: data.efco2,
                efch4: data.efch4,
                efn20: data.ef_n2o,
                eco2: data.eco2,
                ech4: data.ech4,
                en20: data.en2o,
                etco2eq: data.etco2eq
            };
            if (ctx.is_super) {
                if (selectedCompany) doc.company = selectedCompany;
                if (selectedUnit) doc.unit = selectedUnit;
            } else if (ctx.company) {
                doc.company = ctx.company;
                if (selectedUnit) {
                    doc.unit = selectedUnit;
                } else if (ctx.units && ctx.units.length === 1) {
                    doc.unit = ctx.units[0];
                }
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

    // Create display row - FIXED to show below form filler
    function createDisplayRow(data, docName) {
        const tbody = root_element.querySelector('#emissionsTableBody');
        const displayRow = document.createElement('tr');
        displayRow.className = 'data-display-row';
        displayRow.dataset.docName = docName;
        
        displayRow.innerHTML = `
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
            <td>${data.efco2.toFixed(4)}</td>
            <td>${data.efch4.toFixed(4)}</td>
            <td>${data.ef_n2o.toFixed(4)}</td>
            <td>${data.eco2.toFixed(8)}</td>
            <td>${data.ech4.toFixed(8)}</td>
            <td>${data.en2o.toFixed(8)}</td>
            <td>${data.etco2eq.toFixed(2)}</td>
            <td>
                <button type="button" class="btn btn-danger btn-sm delete-row-btn" data-doc-name="${docName}">
                    <i class="fa fa-trash"></i> Delete
                </button>
            </td>
        `;

        // Insert after the entry row (form filler row) instead of before
        const entryRow = tbody.querySelector('.data-entry-row');
        if (entryRow.nextSibling) {
            tbody.insertBefore(displayRow, entryRow.nextSibling);
        } else {
            tbody.appendChild(displayRow);
        }

        // Add event listeners for the new row
        setupDisplayRowEventListeners(displayRow);
    }

    // Setup event listeners for display row
    function setupDisplayRowEventListeners(row) {
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

    // View document from browser storage
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

    // Delete row and doctype record
    function deleteRow(docName, row) {
        if (confirm('Are you sure you want to delete this record?')) {
            frappe.call({
                method: 'frappe.client.delete',
                args: {
                    doctype: 'Stationary Emissions',
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

    // Clear entry row
    function clearEntryRow(row) {
        row.querySelector('.date-input').value = '';
        row.querySelector('.invoice-no-input').value = '';
        row.querySelector('.file-input').value = '';
        row.querySelector('.file-name').textContent = '';
        row.querySelector('.file-name').style.display = 'none';
        row.querySelector('.fuel-type-select').value = '';
        row.querySelector('.fuel-selection-select').value = '';
        row.querySelector('.fuel-selection-select').disabled = true;
        row.querySelector('.activity-types-select').value = '';
        row.querySelector('.activity-data-input').value = '';
        row.querySelector('.unit-selection-select').value = '';
        
        // Clear emission factors and styling
        clearEmissionFactors(row);
    }

    // Load existing data from doctype - FIXED to show below form filler
    function loadExistingData() {
        (async () => {
            const ctx = await getUserContext();
            const filters = {};
            if (ctx.is_super) {
                if (selectedCompany) filters.company = selectedCompany;
                if (selectedUnit) filters.unit = selectedUnit;
            } else if (ctx.company) {
                filters.company = ctx.company;
                if (selectedUnit) filters.unit = selectedUnit;
            }
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Stationary Emissions',
                    fields: ['name', 's_no', 'date', 'invoice_no', 'upload_invoice', 'fuel_type', 
                            'fuel_selection', 'activity_types', 'activity_data', 'unit_selection',
                            'efco2', 'efch4', 'efn20', 'eco2', 'ech4', 'en20', 'etco2eq'],
                    order_by: 'creation desc',
                    limit: 20,
                    filters
                },
                callback: function(r) {
                    if (r.message) {
                        console.log('Loaded existing data with old field names:', r.message);
                        const mappedData = r.message.map(record => ({
                            ...record,
                            ef_n2o: record.efn20,
                            en2o: record.en20
                        }));
                        processExistingData(mappedData);
                    } else {
                        console.log('No existing data found');
                    }
                }
            });
        })();
    }

    // Process existing data
    function processExistingData(data) {
        // Clear existing display rows
        const tbody = root_element.querySelector('#emissionsTableBody');
        const existingRows = tbody.querySelectorAll('.data-display-row');
        existingRows.forEach(row => row.remove());
        
        // Add display rows for existing data (reverse order to show newest first below form)
        data.reverse().forEach(record => {
            createDisplayRow(record, record.name);
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

    // Add event listeners
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

    // Debug function - can be called from console
    window.debugEmissionFactors = function() {
        console.log('=== EMISSION FACTOR DEBUG ===');
        console.log('Static fuel mappings:', fuelTypeMappings);
        console.log('Database emission factors:', emissionFactorData);
        
        // Test matching for each static fuel
        for (const fuelType in fuelTypeMappings) {
            console.log(`\n--- ${fuelType} ---`);
            fuelTypeMappings[fuelType].forEach(fuel => {
                const factors = getEmissionFactors(fuelType, fuel);
                console.log(`${fuel}: ${factors.notFound ? '❌ NOT FOUND' : '✅ FOUND'} - CO2:${factors.efco2}, CH4:${factors.efch4}, N2O:${factors.ef_n2o}`);
            });
        }
        
        // Test unit-based factors
        console.log('\n=== UNIT-BASED FACTORS TEST ===');
        const testFuel = 'Natural gas';
        const testFuelType = 'Gaseous fossil';
        console.log(`Testing ${testFuel} with different units:`);
        ['kg', 'Tonnes', 'Litre', 'm³'].forEach(unit => {
            const factors = getEmissionFactors(testFuelType, testFuel, unit);
            console.log(`${unit}: CO2:${factors.efco2}, CH4:${factors.efch4}, N2O:${factors.ef_n2o}`);
        });
    };

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