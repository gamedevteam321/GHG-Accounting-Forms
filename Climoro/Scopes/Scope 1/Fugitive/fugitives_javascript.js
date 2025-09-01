// Immediately execute the initialization
(function() {
    // =================================================================
    // Global Variables
    // =================================================================
    let currentRowIds = {
        'scale-base': 1,
        'screening': 1,
        'simple': 1
    };
    let isInitialized = false;
    let activeTab = 'scale-base';

    // *** NEW: To hold dynamically fetched GWP data ***
    let gwpChemicals = {};

    // *** NEW: Company/Unit filtering context ***
    let selectedCompany = null;
    let selectedUnit = null;

    // *** REMOVED: The old hardcoded gasTypes array is no longer needed.

    // These hardcoded arrays are still used by the other tabs
    const refrigerationEquipment = [
        'Commercial Refrigeration', 'Industrial Refrigeration', 'Air Conditioning Systems',
        'Heat Pumps', 'Transport Refrigeration', 'Marine Refrigeration', 'Other'
    ];
    const refrigerationTypes = [
        'R134a', 'R404A', 'R410A', 'R407C', 'R22', 'R507',
        'R717 (Ammonia)', 'R744 (CO2)', 'Other'
    ];

    const GWP_CONSTANT = 10;

    // =================================================================
    // Core Initialization
    // =================================================================

    // *** NEW: Function to fetch GWP data from the backend ***
    function loadGwpData(callback) {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'GWP Chemical',
                fields: ['chemical_name', 'gwp_ar6', 'gwp_ar5', 'gwp_ar4'],
                limit_page_length: 500
            },
            callback: function(r) {
                if (r.message) {
                    gwpChemicals = {};
                    r.message.forEach(chem => {
                        gwpChemicals[chem.chemical_name] = chem;
                    });
                    console.log('GWP Chemicals data loaded successfully:', gwpChemicals);
                }
                if (callback) callback();
            }
        });
    }

    // *** MODIFIED: Initialization is now wrapped in the async data loader and filter bar setup ***
    function initializeInterface() {
        const container = root_element.querySelector('.refrigeration-fugitives-container');
        if (!container || isInitialized) return;

        console.log('Initializing refrigeration fugitives...');

        // Build filter bar first, then load data and UI
        buildFilterBar(() => {
            (async () => {
                await initializeFiltersFromContext();
                loadGwpData(() => {
                    setupTabSwitching();
                    createDataEntryRow('scale-base');
                    createDataEntryRow('screening');
                    createDataEntryRow('simple');
                    loadExistingData();
                    isInitialized = true;
                    console.log('Refrigeration fugitives initialized successfully');
                });
            })();
        });
    }

    // =================================================================
    // UI and Event Handlers
    // =================================================================

    function setupTabSwitching() {
        const tabBtns = root_element.querySelectorAll('.tab-btn');
        const tabContents = root_element.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                root_element.querySelector('#' + targetTab + '-tab').classList.add('active');
                activeTab = targetTab;
            });
        });
    }

    function createDataEntryRow(tabType) {
        const tbody = root_element.querySelector('#' + getTableId(tabType) + 'Body');
        if (!tbody) return;
        const existingEntryRow = tbody.querySelector('.data-entry-row');
        if (existingEntryRow) existingEntryRow.remove();
        const entryRow = document.createElement('tr');
        entryRow.className = 'data-entry-row';
        entryRow.innerHTML = getEntryRowHTML(tabType);
        tbody.appendChild(entryRow);
        setupEntryRowEventListeners(entryRow, tabType);
        entryRow.querySelector('.s-no-input').value = currentRowIds[tabType];
    }

    function getTableId(tabType) {
        return { 'scale-base': 'scaleBaseTable', 'screening': 'screeningTable', 'simple': 'simpleTable' }[tabType];
    }

    function getEntryRowHTML(tabType) {
        switch(tabType) {
            case 'scale-base':
                // *** MODIFIED: Populates dropdown from the new gwpChemicals object ***
                const gasOptions = Object.keys(gwpChemicals).sort().map(type => `<option value="${type}">${type}</option>`).join('');
                return `
                    <td><input type="number" class="form-control s-no-input" placeholder="Auto" readonly></td>
                    <td><input type="date" class="form-control date-input" required></td>
                    <td><select class="form-control gas-type-select"><option value="">Select a Gas...</option>${gasOptions}<option value="Other">Other</option></select></td>
                    <td><select class="form-control unit-selection-select"><option value="">Select a Unit...</option><option value="kg">kg</option></select></td>
                    <td><input type="number" class="form-control inventory-start-input" placeholder="Auto populate (First time manual)" step="0.01"></td>
                    <td><input type="number" class="form-control inventory-close-input" placeholder="Numeric" step="0.01"></td>
                    <td><input type="number" class="form-control decreased-inventory-input" placeholder="Auto (X1)" step="0.01" readonly></td>
                    <td><input type="number" class="form-control purchase-input" placeholder="Numeric" step="0.01"></td>
                    <td><input type="number" class="form-control returned-user-input" placeholder="Numeric" step="0.01"></td>
                    <td><input type="number" class="form-control returned-recycling-input" placeholder="Numeric" step="0.01"></td>
                    <td><input type="number" class="form-control total-returned-input" placeholder="Auto (X2)" step="0.01" readonly></td>
                    <td><input type="number" class="form-control charged-equipment-input" placeholder="Numeric" step="0.01"></td>
                    <td><input type="number" class="form-control delivered-user-input" placeholder="Numeric" step="0.01"></td>
                    <td><input type="number" class="form-control returned-producer-input" placeholder="Numeric" step="0.01"></td>
                    <td><input type="number" class="form-control sent-offsite-input" placeholder="Numeric" step="0.01"></td>
                    <td><input type="number" class="form-control sent-destruction-input" placeholder="Numeric" step="0.01"></td>
                    <td><input type="number" class="form-control total-distributed-input" placeholder="Auto (X3)" step="0.01" readonly></td>
                    <td><input type="number" class="form-control refrigerant-emission-input" placeholder="Auto (X4)" step="0.01" readonly></td>
                    <td><input type="number" class="form-control x5-conversion-input" placeholder="X5 conversion" step="0.01" readonly></td>
                    <td><input type="number" class="form-control etco2eq-input" placeholder="X5*GWP" step="0.01" readonly></td>
                    <td><button type="button" class="btn btn-success btn-sm add-row-btn add-btn"><i class="fa fa-plus"></i> Add</button></td>
                `;
            case 'screening':
                return `
                    <td><input type="number" class="form-control s-no-input" placeholder="Auto" readonly></td>
                    <td><input type="date" class="form-control date-input" required></td>
                    <td><select class="form-control equipment-selection-input"><option value="">Select a Equipment...</option>${refrigerationEquipment.map(eq => `<option value="${eq}">${eq}</option>`).join('')}</select></td>
                    <td><select class="form-control type-refrigeration-input"><option value="">Select a Type of Refrigeration...</option>${refrigerationTypes.map(type => `<option value="${type}">${type}</option>`).join('')}</select></td>
                    <td><input type="number" class="form-control gwp-refrigeration-input" placeholder="Constant (10)" step="1" value="10"></td>
                    <td><input type="number" class="form-control no-units-input" placeholder="Numeric" step="1"></td>
                    <td><select class="form-control unit-selection-select"><option value="">Select a Unit...</option><option value="Tonnes">Tonnes</option><option value="kg">kg</option></select></td>
                    <td><input type="number" class="form-control original-charge-input" placeholder="Numeric" step="0.01"></td>
                    <td><input type="number" class="form-control assembly-ef-input" placeholder="Numeric" step="0.0001"></td>
                    <td><input type="number" class="form-control etco2eq-input" placeholder="C*D*E*F" step="0.01" readonly></td>
                    <td><button type="button" class="btn btn-success btn-sm add-row-btn add-btn"><i class="fa fa-plus"></i> Add</button></td>
                `;
            case 'simple':
                return `
                    <td><input type="number" class="form-control s-no-input" placeholder="Auto" readonly></td>
                    <td><input type="date" class="form-control date-input" required></td>
                    <td><input type="text" class="form-control invoice-no-input" placeholder="TEXT FIELD"></td>
                    <td><input type="file" class="form-control file-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display: none;"><button type="button" class="btn btn-outline-secondary btn-sm upload-btn"><i class="fa fa-upload"></i> Upload docs</button><span class="file-name"></span></td>
                    <td><select class="form-control type-refrigeration-input"><option value="">Select a Type of Refrigeration...</option>${refrigerationTypes.map(type => `<option value="${type}">${type}</option>`).join('')}</select></td>
                    <td><input type="number" class="form-control amount-purchased-input" placeholder="Numeric" step="0.01"></td>
                    <td><input type="number" class="form-control no-units-input" placeholder="Numeric" step="1"></td>
                    <td><select class="form-control unit-selection-select"><option value="">Select a Unit...</option><option value="Tonnes">Tonnes</option><option value="kg">kg</option></select></td>
                    <td><input type="number" class="form-control gwp-input" placeholder="Constant (10)" step="1" value="10"></td>
                    <td><input type="number" class="form-control etco2eq-input" placeholder="A*B" step="0.01" readonly></td>
                    <td><button type="button" class="btn btn-success btn-sm add-row-btn add-btn"><i class="fa fa-plus"></i> Add</button></td>
                `;
            default: return '';
        }
    }

    function setupEntryRowEventListeners(row, tabType) {
        row.querySelector('.add-row-btn').addEventListener('click', () => addNewRow(row, tabType));
        if (tabType === 'simple') {
            const fileInput = row.querySelector('.file-input'), uploadBtn = row.querySelector('.upload-btn'), fileName = row.querySelector('.file-name');
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', function() { if (this.files.length > 0) { fileName.textContent = this.files[0].name; fileName.style.display = 'inline'; } });
        }
        switch(tabType) {
            case 'scale-base': setupScaleBaseCalculations(row); break;
            case 'screening': setupScreeningCalculations(row); break;
            case 'simple': setupSimpleCalculations(row); break;
        }
    }

    // =================================================================
    // Calculation Logic
    // =================================================================

    // *** MODIFIED: Uses dynamic GWP with fallback for calculations ***
    function setupScaleBaseCalculations(row) {
        const gwpDisplay = root_element.querySelector('#scale-base-gwp-display');
        const allInputs = row.querySelectorAll('input, select');

        function calculateAll() {
            const inventoryStart = parseFloat(row.querySelector('.inventory-start-input').value) || 0;
            const inventoryClose = parseFloat(row.querySelector('.inventory-close-input').value) || 0;
            const purchase = parseFloat(row.querySelector('.purchase-input').value) || 0;
            const returnedUser = parseFloat(row.querySelector('.returned-user-input').value) || 0;
            const returnedRecycling = parseFloat(row.querySelector('.returned-recycling-input').value) || 0;
            const chargedEquipment = parseFloat(row.querySelector('.charged-equipment-input').value) || 0;
            const deliveredUser = parseFloat(row.querySelector('.delivered-user-input').value) || 0;
            const returnedProducer = parseFloat(row.querySelector('.returned-producer-input').value) || 0;
            const sentOffsite = parseFloat(row.querySelector('.sent-offsite-input').value) || 0;
            const sentDestruction = parseFloat(row.querySelector('.sent-destruction-input').value) || 0;

            const decreasedInventory = inventoryStart - inventoryClose;
            const totalReturned = purchase + returnedUser + returnedRecycling;
            const totalDistributed = chargedEquipment + deliveredUser + returnedProducer + sentOffsite + sentDestruction;
            const refrigerantEmission = decreasedInventory + totalReturned - totalDistributed;
            
            const selectedGas = row.querySelector('.gas-type-select').value;
            let gwp = 0;
            if (selectedGas) {
                if (selectedGas === 'Other') {
                    gwp = 10;
                } else if (gwpChemicals[selectedGas]) {
                    const chem = gwpChemicals[selectedGas];
                    gwp = chem.gwp_ar6 || chem.gwp_ar5 || chem.gwp_ar4 || 0;
                }
            }
            
            row.querySelector('.decreased-inventory-input').value = decreasedInventory.toFixed(2);
            row.querySelector('.total-returned-input').value = totalReturned.toFixed(2);
            row.querySelector('.total-distributed-input').value = totalDistributed.toFixed(2);
            row.querySelector('.refrigerant-emission-input').value = refrigerantEmission.toFixed(2);
            row.querySelector('.x5-conversion-input').value = refrigerantEmission.toFixed(2);
            gwpDisplay.textContent = gwp;
            
            const etco2eq = refrigerantEmission * gwp;
            row.querySelector('.etco2eq-input').value = etco2eq.toFixed(2);
        }
        allInputs.forEach(input => input.addEventListener('input', calculateAll));
        calculateAll();
    }
    
    // Original calculation functions from your file are preserved below
    function setupScreeningCalculations(row) {
        const gwpRefrigerationInput = row.querySelector('.gwp-refrigeration-input'), noUnitsInput = row.querySelector('.no-units-input'), originalChargeInput = row.querySelector('.original-charge-input'), assemblyEfInput = row.querySelector('.assembly-ef-input'), etco2eqInput = row.querySelector('.etco2eq-input');
        function calculateScreening() {
            const gwpRefrigeration = parseFloat(gwpRefrigerationInput.value) || 0, noUnits = parseFloat(noUnitsInput.value) || 0, originalCharge = parseFloat(originalChargeInput.value) || 0, assemblyEf = parseFloat(assemblyEfInput.value) || 0;
            etco2eqInput.value = (gwpRefrigeration * noUnits * originalCharge * assemblyEf).toFixed(2);
        }
        [gwpRefrigerationInput, noUnitsInput, originalChargeInput, assemblyEfInput].forEach(input => input.addEventListener('input', calculateScreening));
    }

    function setupSimpleCalculations(row) {
        const amountPurchasedInput = row.querySelector('.amount-purchased-input'), gwpInput = row.querySelector('.gwp-input'), etco2eqInput = row.querySelector('.etco2eq-input');
        function calculateSimple() {
            const amountPurchased = parseFloat(amountPurchasedInput.value) || 0, gwp = parseFloat(gwpInput.value) || 0;
            etco2eqInput.value = (amountPurchased * gwp).toFixed(2);
        }
        [amountPurchasedInput, gwpInput].forEach(input => input.addEventListener('input', calculateSimple));
    }
    
    // =================================================================
    // Data Handling (Your original working functions are now all here)
    // =================================================================

    function addNewRow(entryRow, tabType) {
        const formData = getFormData(entryRow, tabType);
        if (!validateFormData(formData, tabType)) return;
        saveToDoctype(formData, tabType, (success, docName) => {
            if (success) {
                createDisplayRow(formData, docName, tabType);
                clearEntryRow(entryRow, tabType);
                currentRowIds[tabType]++;
                entryRow.querySelector('.s-no-input').value = currentRowIds[tabType];
                showNotification('Data saved successfully!', 'success');
            } else { showNotification('Error saving data!', 'error'); }
        });
    }

    function getFormData(row, tabType) {
        const baseData = { s_no: currentRowIds[tabType], date: row.querySelector('.date-input').value, approach_type: getApproachType(tabType) };
        switch(tabType) {
            case 'scale-base': return { ...baseData, gas_type: row.querySelector('.gas-type-select').value, unit_selection: row.querySelector('.unit-selection-select').value, inventory_start: parseFloat(row.querySelector('.inventory-start-input').value) || 0, inventory_close: parseFloat(row.querySelector('.inventory-close-input').value) || 0, decreased_inventory: parseFloat(row.querySelector('.decreased-inventory-input').value) || 0, purchase: parseFloat(row.querySelector('.purchase-input').value) || 0, returned_user: parseFloat(row.querySelector('.returned-user-input').value) || 0, returned_recycling: parseFloat(row.querySelector('.returned-recycling-input').value) || 0, total_returned: parseFloat(row.querySelector('.total-returned-input').value) || 0, charged_equipment: parseFloat(row.querySelector('.charged-equipment-input').value) || 0, delivered_user: parseFloat(row.querySelector('.delivered-user-input').value) || 0, returned_producer: parseFloat(row.querySelector('.returned-producer-input').value) || 0, sent_offsite: parseFloat(row.querySelector('.sent-offsite-input').value) || 0, sent_destruction: parseFloat(row.querySelector('.sent-destruction-input').value) || 0, total_distributed: parseFloat(row.querySelector('.total-distributed-input').value) || 0, refrigerant_emission: parseFloat(row.querySelector('.refrigerant-emission-input').value) || 0, x5_conversion: parseFloat(row.querySelector('.x5-conversion-input').value) || 0, etco2eq: parseFloat(row.querySelector('.etco2eq-input').value) || 0 };
            case 'screening': return { ...baseData, equipment_selection: row.querySelector('.equipment-selection-input').value, type_refrigeration: row.querySelector('.type-refrigeration-input').value, gwp_refrigeration: parseFloat(row.querySelector('.gwp-refrigeration-input').value) || 0, no_of_units: parseFloat(row.querySelector('.no-units-input').value) || 0, unit_selection: row.querySelector('.unit-selection-select').value, original_charge: parseFloat(row.querySelector('.original-charge-input').value) || 0, assembly_ef: parseFloat(row.querySelector('.assembly-ef-input').value) || 0, etco2eq: parseFloat(row.querySelector('.etco2eq-input').value) || 0 };
            case 'simple': return { ...baseData, invoice_no: row.querySelector('.invoice-no-input').value, upload_invoice: row.querySelector('.file-input').files[0] || null, type_refrigeration: row.querySelector('.type-refrigeration-input').value, amount_purchased: parseFloat(row.querySelector('.amount-purchased-input').value) || 0, no_of_units: parseFloat(row.querySelector('.no-units-input').value) || 0, unit_selection: row.querySelector('.unit-selection-select').value, gwp: parseFloat(row.querySelector('.gwp-input').value) || 0, etco2eq: parseFloat(row.querySelector('.etco2eq-input').value) || 0 };
            default: return baseData;
        }
    }

    function getApproachType(tabType) { return { 'scale-base': 'Scale Base Approach', 'screening': 'Screening Method', 'simple': 'Simple Method' }[tabType]; }
    function validateFormData(data, tabType) { if (!data.date) { showNotification('Please select a date', 'error'); return false; } return true; }

    function saveToDoctype(data, tabType, callback) {
        if (tabType === 'simple' && data.upload_invoice) {
            uploadFile(data.upload_invoice, (fileUrl) => {
                data.upload_invoice = fileUrl || null;
                createDoctypeRecord(data, tabType, callback);
            });
        } else { createDoctypeRecord(data, tabType, callback); }
    }

    function uploadFile(file, callback) {
        const fileKey = 'refrigeration_fugitives_file_' + Date.now();
        localStorage.setItem(fileKey, JSON.stringify({ name: file.name, type: file.type, size: file.size, lastModified: file.lastModified }));
        const reader = new FileReader();
        reader.onload = e => { localStorage.setItem(fileKey + '_data', e.target.result); callback(fileKey); };
        reader.readAsDataURL(file);
    }

    function createDoctypeRecord(data, tabType, callback) {
        (async () => {
            const ctx = await getUserContext();
            const doc = { doctype: getDoctypeName(tabType), ...data };
            const companyVal = ctx.is_super ? (selectedCompany || ctx.company || null) : (ctx.company || null);
            const unitVal = selectedUnit || (ctx.units && ctx.units.length === 1 ? ctx.units[0] : null);
            if (!companyVal) { showNotification('Please select a Company in the filter.', 'error'); callback(false); return; }
            doc.company = companyVal;
            if (unitVal) { doc.unit = unitVal; }
            frappe.call({
                method: 'frappe.client.insert',
                args: { doc },
                callback: r => r.exc ? (console.error('Error creating record:', r.exc), callback(false)) : callback(true, r.message.name)
            });
        })();
    }

    function getDoctypeName(tabType) { return { 'scale-base': 'Fugitive Scale Base', 'screening': 'Fugitive Screening', 'simple': 'Fugitive Simple' }[tabType]; }

    function createDisplayRow(data, docName, tabType) {
        const tbody = root_element.querySelector('#' + getTableId(tabType) + 'Body');
        const displayRow = document.createElement('tr');
        displayRow.className = 'data-display-row';
        displayRow.dataset.docName = docName;
        const deleteBtn = `<button type="button" class="btn btn-danger btn-sm delete-row-btn" data-doc-name="${docName}"><i class="fa fa-trash"></i></button>`;
        switch(tabType) {
            case 'scale-base': displayRow.innerHTML = `<td>${data.s_no}</td><td>${formatDate(data.date)}</td><td>${data.gas_type}</td><td>${data.unit_selection}</td><td>${data.inventory_start}</td><td>${data.inventory_close}</td><td>${data.decreased_inventory}</td><td>${data.purchase}</td><td>${data.returned_user}</td><td>${data.returned_recycling}</td><td>${data.total_returned}</td><td>${data.charged_equipment}</td><td>${data.delivered_user}</td><td>${data.returned_producer}</td><td>${data.sent_offsite}</td><td>${data.sent_destruction}</td><td>${data.total_distributed}</td><td>${data.refrigerant_emission}</td><td>${data.x5_conversion}</td><td><strong>${data.etco2eq}</strong></td><td>${deleteBtn}</td>`; break;
            case 'screening': displayRow.innerHTML = `<td>${data.s_no}</td><td>${formatDate(data.date)}</td><td>${data.equipment_selection}</td><td>${data.type_refrigeration}</td><td>${data.gwp_refrigeration}</td><td>${data.no_of_units}</td><td>${data.unit_selection}</td><td>${data.original_charge}</td><td>${data.assembly_ef}</td><td><strong>${data.etco2eq}</strong></td><td>${deleteBtn}</td>`; break;
            case 'simple': displayRow.innerHTML = `<td>${data.s_no}</td><td>${formatDate(data.date)}</td><td>${data.invoice_no || '-'}</td><td>${data.upload_invoice ? `<button type="button" class="btn btn-link btn-sm view-doc-btn" data-file-key="${data.upload_invoice}"><i class="fa fa-eye"></i> View</button>` : '-'}</td><td>${data.type_refrigeration}</td><td>${data.amount_purchased}</td><td>${data.no_of_units}</td><td>${data.unit_selection}</td><td>${data.gwp}</td><td><strong>${data.etco2eq}</strong></td><td>${deleteBtn}</td>`; break;
        }
        const entryRow = tbody.querySelector('.data-entry-row');
        if (entryRow.nextSibling) tbody.insertBefore(displayRow, entryRow.nextSibling);
        else tbody.appendChild(displayRow);
        setupDisplayRowEventListeners(displayRow, tabType);
    }

    function setupDisplayRowEventListeners(row, tabType) {
        const deleteBtn = row.querySelector('.delete-row-btn');
        if (deleteBtn) deleteBtn.addEventListener('click', function() { deleteRow(this.dataset.docName, row, tabType); });
        const viewDocBtn = row.querySelector('.view-doc-btn');
        if (viewDocBtn) viewDocBtn.addEventListener('click', function() { viewDocument(this.dataset.fileKey); });
    }

    function viewDocument(fileKey) {
        if (!fileKey) return;
        try {
            const fileData = JSON.parse(localStorage.getItem(fileKey)), fileContent = localStorage.getItem(fileKey + '_data');
            if (fileData && fileContent) {
                const byteCharacters = atob(fileContent.split(',')[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                const byteArray = new Uint8Array(byteNumbers), blob = new Blob([byteArray], { type: fileData.type });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else showNotification('File not found', 'error');
        } catch (error) { console.error('Error viewing file:', error); showNotification('Error viewing file', 'error'); }
    }

    function deleteRow(docName, row, tabType) {
        if (confirm('Are you sure you want to delete this record?')) {
            frappe.call({
                method: 'frappe.client.delete',
                args: { doctype: getDoctypeName(tabType), name: docName },
                callback: function(r) {
                    if (r.exc) { showNotification('Error deleting record', 'error'); }
                    else {
                        const viewDocBtn = row.querySelector('.view-doc-btn');
                        if (viewDocBtn && viewDocBtn.dataset.fileKey) { localStorage.removeItem(viewDocBtn.dataset.fileKey); localStorage.removeItem(viewDocBtn.dataset.fileKey + '_data'); }
                        row.remove();
                        showNotification('Record deleted successfully', 'success');
                    }
                }
            });
        }
    }

    function clearEntryRow(row, tabType) {
        row.querySelectorAll('input:not(.s-no-input), select').forEach(input => {
            if (input.type === 'file') {
                input.value = '';
                const fileName = row.querySelector('.file-name');
                if (fileName) { fileName.textContent = ''; fileName.style.display = 'none'; }
            } else if (input.tagName === 'SELECT') input.value = '';
            else if (!input.readOnly) input.value = '';
        });
        if (tabType === 'screening') row.querySelector('.gwp-refrigeration-input').value = '10';
        if (tabType === 'simple') row.querySelector('.gwp-input').value = '10';
    }

    function loadExistingData() {
        ['scale-base', 'screening', 'simple'].forEach(loadTabData);
    }

    function loadTabData(tabType) {
        (async () => {
            const ctx = await getUserContext();
            const maybeCompany = ctx.is_super ? (selectedCompany || ctx.company || null) : (ctx.company || null);
            const maybeUnit = selectedUnit || null;
            const tryFetch = (filters) => new Promise((resolve)=>{
                frappe.call({
                    method: 'frappe.client.get_list',
                    args: { doctype: getDoctypeName(tabType), fields: ['*'], order_by: 'creation desc', limit: 20, filters },
                    callback: r => resolve({ ok: true, res: r }),
                    error: () => resolve({ ok: false })
                });
            });
            // First attempt with filters, fallback to none on permission errors
            const filters = {};
            if (maybeCompany) filters.company = maybeCompany;
            if (maybeUnit) { filters.unit = maybeUnit; }
            let result = await tryFetch(filters);
            if (!result.ok) result = await tryFetch({});
            const r = result.res;
            if (r && r.message) {
                const tbody = root_element.querySelector('#' + getTableId(tabType) + 'Body');
                tbody.querySelectorAll('.data-display-row').forEach(row => row.remove());
                r.message.reverse().forEach(record => {
                    createDisplayRow(record, record.name, tabType);
                    if (record.s_no > currentRowIds[tabType]) currentRowIds[tabType] = record.s_no;
                });
                currentRowIds[tabType]++;
                const entryRow = tbody.querySelector('.data-entry-row');
                if (entryRow) entryRow.querySelector('.s-no-input').value = currentRowIds[tabType];
            }
        })();
    }

    function formatDate(dateString) { if (!dateString) return '-'; return new Date(dateString).toLocaleDateString(); }
    function showNotification(message, type) { frappe.show_alert(message, type === 'success' ? 3 : 5); }
    
    // =================================================================
    // Initializer
    // =================================================================
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initializeInterface); }
    else { initializeInterface(); }
    document.addEventListener('frappe:workspace:shown', () => { if (!isInitialized) initializeInterface(); else loadExistingData(); });
    
    // =================================================================
    // Company/Unit Filter Helpers (reused from stationary emissions)
    // =================================================================
    async function getUserContext() {
        try {
            const r = await frappe.call({ method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' });
            return r.message || { company: null, units: [], is_super: false };
        } catch (e) {
            console.error('Failed to fetch user context', e);
            return { company: null, units: [], is_super: false };
        }
    }

    function buildFilterBar(done) {
        const container = root_element.querySelector('.refrigeration-fugitives-container');
        const header = container ? container.querySelector('.header-section') : null;
        if (!header) { done && done(); return; }
        if (container.querySelector('.filter-bar')) { done && done(); return; }
        // Only show filter for System Manager or Super Admin
        (async () => {
            try {
                const ctx = await getUserContext();
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
})();