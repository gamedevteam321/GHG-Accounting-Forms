// Immediately execute the initialization
(function() {
    // Global variables
    let currentRowId = 1;
    let isInitialized = false;
    let selectedCompany = null;
    let selectedUnit = null;
    const metaCache = {};

    const activityTypes = [
        'Office Buildings', 'Manufacturing Facilities', 'Warehouses', 'Data Centers',
        'Retail Stores', 'Healthcare Facilities', 'Educational Institutions',
        'Residential Buildings', 'Other'
    ];
    const EMISSION_FACTOR = 0.757;

    // Initialize the table
    function initializeTable() {
        const container = root_element.querySelector('.electricity-purchased-container');
        if (!container || isInitialized) return;
        console.log('Initializing electricity purchased...');
        buildFilterBar(async () => {
            await initializeFiltersFromContext();
            createDataEntryRow();
            if (typeof loadExistingData === 'function') {
                try { loadExistingData(); } catch(e) {}
            }
            isInitialized = true;
            console.log('Electricity purchased initialized successfully');
        });
    }

    // Create data entry row
    function createDataEntryRow() {
        const tbody = root_element.querySelector('#electricityTableBody');
        if (!tbody) return;

        const existingEntryRow = tbody.querySelector('.data-entry-row');
        if (existingEntryRow) existingEntryRow.remove();

        const entryRow = document.createElement('tr');
        entryRow.className = 'data-entry-row';
        
        entryRow.innerHTML = `
            <td><input type="number" class="form-control s-no-input" placeholder="Auto" readonly></td>
            <td><input type="date" class="form-control date-input" required></td>
            <td><input type="text" class="form-control invoice-no-input" placeholder="Enter invoice number"></td>
            <td>
                <input type="file" class="form-control file-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display: none;">
                <button type="button" class="btn btn-outline-secondary btn-sm upload-btn"><i class="fa fa-upload"></i> Upload</button>
                <span class="file-name"></span>
            </td>
            <td>
                <select class="form-control activity-types-select">
                    <option value="">Select Activity...</option>
                    ${activityTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
                </select>
            </td>
            <td><input type="number" class="form-control activity-data-input" placeholder="Enter kWh" step="0.01"></td>
            
            <td><input type="number" class="form-control no-units-input" placeholder="Numeric" step="1"></td>

            <td><input type="text" class="form-control unit-selection-input" value="kWh" readonly></td>
            <td><input type="number" class="form-control ef-input" value="${EMISSION_FACTOR}" step="0.0001" readonly></td>
            
            <td><input type="number" class="form-control etco2eq-input" placeholder="Auto calculated" step="0.01" readonly></td>
            <td><button type="button" class="btn btn-success btn-sm add-row-btn"><i class="fa fa-plus"></i> Add</button></td>
        `;

        tbody.appendChild(entryRow);
        setupEntryRowEventListeners(entryRow);
        entryRow.querySelector('.s-no-input').value = currentRowId;
    }

    // Setup event listeners for entry row
    function setupEntryRowEventListeners(row) {
        const fileInput = row.querySelector('.file-input'), uploadBtn = row.querySelector('.upload-btn'), fileName = row.querySelector('.file-name');
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', function() { if (this.files.length > 0) { fileName.textContent = this.files[0].name; fileName.style.display = 'inline'; } });

        const activityDataInput = row.querySelector('.activity-data-input');
        const etco2eqInput = row.querySelector('.etco2eq-input');

        function calculateEmissions() {
            const activityData = parseFloat(activityDataInput.value) || 0;
            const etco2eq = activityData * EMISSION_FACTOR;
            etco2eqInput.value = etco2eq.toFixed(2);
        }

        activityDataInput.addEventListener('input', calculateEmissions);
        row.querySelector('.add-row-btn').addEventListener('click', () => addNewRow(row));
    }

    // Add new row with data
    function addNewRow(entryRow) {
        const formData = getFormData(entryRow);
        if (!validateFormData(formData)) return;
        saveToDoctype(formData, (success, docName) => {
            if (success) {
                createDisplayRow(formData, docName);
                clearEntryRow(entryRow);
                currentRowId++;
                entryRow.querySelector('.s-no-input').value = currentRowId;
                showNotification('Data saved successfully!', 'success');
            } else {
                showNotification('Error saving data!', 'error');
            }
        });
    }

    // *** RE-ADDED 'no_of_units' to form data collection ***
    function getFormData(row) {
        return {
            s_no: currentRowId,
            date: row.querySelector('.date-input').value,
            invoice_no: row.querySelector('.invoice-no-input').value,
            upload_invoice: row.querySelector('.file-input').files[0] || null,
            activity_types: row.querySelector('.activity-types-select').value,
            activity_data: parseFloat(row.querySelector('.activity-data-input').value) || 0,
            no_of_units: parseFloat(row.querySelector('.no-units-input').value) || 0,
            unit_selection: row.querySelector('.unit-selection-input').value,
            ef: parseFloat(row.querySelector('.ef-input').value) || 0,
            etco2eq: parseFloat(row.querySelector('.etco2eq-input').value) || 0
        };
    }

    // Validate form data
    function validateFormData(data) {
        if (!data.date) { showNotification('Please select a date', 'error'); return false; }
        if (!data.activity_types) { showNotification('Please select an activity type', 'error'); return false; }
        if (!data.activity_data || data.activity_data <= 0) { showNotification('Please enter valid activity data (kWh)', 'error'); return false; }
        // The 'no_of_units' field is not part of the calculation, so we can make its validation optional or specific if needed.
        // For now, we assume it can be 0.
        return true;
    }

    // Save to doctype
    function saveToDoctype(data, callback) {
        if (data.upload_invoice) {
            uploadFile(data.upload_invoice, (fileUrl) => {
                data.upload_invoice = fileUrl;
                createDoctypeRecord(data, callback);
            });
        } else {
            createDoctypeRecord(data, callback);
        }
    }
    
    function uploadFile(file, callback) { /* same as before */ }

    // *** RE-ADDED 'no_of_units' to the data sent to the backend ***
    function createDoctypeRecord(data, callback) {
        (async ()=>{
            const doctypeName = 'Electricity Purchased';
            const doc = {
                doctype: doctypeName,
                s_no: data.s_no,
                date: data.date,
                invoice_no: data.invoice_no,
                upload_invoice: data.upload_invoice,
                activity_types: data.activity_types,
                activity_data: data.activity_data,
                no_of_units: data.no_of_units,
                unit_selection: data.unit_selection,
                ef: data.ef,
                etco2eq: data.etco2eq
            };
            try {
                const ctx = await getUserContext();
                if (await hasField(doctypeName, 'company')) {
                    doc.company = ctx.is_super ? (selectedCompany || ctx.company || null) : (ctx.company || null);
                }
                if (await hasField(doctypeName, 'company_unit')) {
                    const chosenUnit = selectedUnit || (ctx.units && ctx.units.length === 1 ? ctx.units[0] : null);
                    if (chosenUnit) doc.company_unit = chosenUnit;
                }
            } catch(e) {}
            frappe.call({
                method: 'frappe.client.insert',
                args: { doc },
                callback: r => r.exc ? (console.error('Error creating record:', r.exc), callback(false)) : callback(true, r.message.name)
            });
        })();
    }
    
    // *** RE-ADDED 'no_of_units' to the display row ***
    function createDisplayRow(data, docName) {
        const tbody = root_element.querySelector('#electricityTableBody');
        const displayRow = document.createElement('tr');
        displayRow.className = 'data-display-row';
        displayRow.dataset.docName = docName;
        displayRow.innerHTML = `
            <td>${data.s_no}</td>
            <td>${formatDate(data.date)}</td>
            <td>${data.invoice_no || '-'}</td>
            <td>${data.upload_invoice ? `<button type="button" class="btn btn-link btn-sm view-doc-btn" data-file-key="${data.upload_invoice}"><i class="fa fa-eye"></i> View</button>` : '-'}</td>
            <td>${data.activity_types}</td>
            <td>${data.activity_data}</td>
            <td>${data.no_of_units}</td>
            <td>${data.unit_selection}</td>
            <td>${data.ef.toFixed(4)}</td>
            <td>${data.etco2eq.toFixed(2)}</td>
            <td><button type="button" class="btn btn-danger btn-sm delete-row-btn" data-doc-name="${docName}"><i class="fa fa-trash"></i> Delete</button></td>
        `;
        const entryRow = tbody.querySelector('.data-entry-row');
        if (entryRow.nextSibling) tbody.insertBefore(displayRow, entryRow.nextSibling);
        else tbody.appendChild(displayRow);
        setupDisplayRowEventListeners(displayRow);
    }

    function setupDisplayRowEventListeners(row) { /* same as before */ }
    function viewDocument(fileKey) { /* same as before */ }
    function deleteRow(docName, row) { /* same as before */ }

    // *** RE-ADDED 'no_of_units' to the clear function ***
    function clearEntryRow(row) {
        row.querySelector('.date-input').value = '';
        row.querySelector('.invoice-no-input').value = '';
        row.querySelector('.file-input').value = '';
        row.querySelector('.file-name').textContent = '';
        row.querySelector('.file-name').style.display = 'none';
        row.querySelector('.activity-types-select').value = '';
        row.querySelector('.activity-data-input').value = '';
        row.querySelector('.no-units-input').value = '';
        row.querySelector('.etco2eq-input').value = '';
    }

    function loadExistingData() { /* same as before */ }
    
    function formatDate(dateString) { if (!dateString) return '-'; return new Date(dateString).toLocaleDateString(); }
    function showNotification(message, type) { frappe.show_alert({message: message, indicator: type === 'success' ? 'green' : 'red'}); }

    // Initialize when DOM is ready or workspace is shown
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeTable);
    else initializeTable();
    document.addEventListener('frappe:workspace:shown', () => isInitialized ? loadExistingData() : initializeTable());

    // ============ Company/Unit Filter Helpers ============
    async function getUserContext(){
        try { const r = await frappe.call({ method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' }); return r.message || { company: null, units: [], is_super: false }; }
        catch(e){ return { company: null, units: [], is_super: false }; }
    }
    async function hasField(doctype, fieldname){
        try {
            if (!metaCache[doctype]){
                const r = await frappe.call({ method: 'frappe.desk.form.load.getdoctype', args: { doctype } });
                metaCache[doctype] = (r.message && r.message.docs && r.message.docs[0]) || {};
            }
            const fields = metaCache[doctype].fields || [];
            return fields.some(f=> f.fieldname === fieldname);
        } catch(e){ return false; }
    }
    function buildFilterBar(done){
        const container = root_element.querySelector('.electricity-purchased-container');
        if (!container){ done && done(); return; }
        if (container.querySelector('.filter-bar')){ done && done(); return; }
        const bar = document.createElement('div');
        bar.className = 'filter-bar';
        (async ()=>{ try{ const ctx = await getUserContext(); const roles = (frappe && frappe.get_roles)? frappe.get_roles(): []; const canShow = ctx.is_super || roles.includes('System Manager') || roles.includes('Super Admin'); if(!canShow){ done&&done(); return; } } catch(e){ done&&done(); return; } })();
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
            </div>`;
        const header = root_element.querySelector('.page-header') || root_element.querySelector('.header-section');
        if (header) header.insertAdjacentElement('afterend', bar); else container.prepend(bar);
        bar.querySelector('.filter-apply-btn')?.addEventListener('click', ()=>{
            const csel = bar.querySelector('.filter-company-select');
            const usel = bar.querySelector('.filter-unit-select');
            selectedCompany = csel.value || null;
            selectedUnit = usel.value || null;
            container.querySelectorAll('.data-display-row').forEach(r=>r.remove());
            if (typeof loadExistingData === 'function') { try { loadExistingData(); } catch(e){} }
        });
        done && done();
    }
    async function fetchCompanies(){ const r = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Company', fields:['name'], limit:500 } }); return (r.message||[]).map(x=>x.name); }
    async function fetchUnits(company){ const filters = company ? { company } : {}; const r = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Units', fields:['name'], filters, limit:500 } }); return (r.message||[]).map(x=>x.name); }
    async function initializeFiltersFromContext(){
        const ctx = await getUserContext();
        const bar = root_element.querySelector('.filter-bar');
        if (!bar) return;
        const companySelect = bar.querySelector('.filter-company-select');
        const unitSelect = bar.querySelector('.filter-unit-select');
        companySelect.innerHTML=''; unitSelect.innerHTML='';
        if (ctx.is_super){
            const companies = await fetchCompanies();
            companySelect.innerHTML = `<option value="">All Companies</option>` + companies.map(c=>`<option value="${c}">${c}</option>`).join('');
            companySelect.addEventListener('change', async ()=>{
                selectedCompany = companySelect.value || null;
                const units = await fetchUnits(selectedCompany);
                unitSelect.innerHTML = `<option value="">All Units</option>` + units.map(u=>`<option value="${u}">${u}</option>`).join('');
                selectedUnit = null;
            });
            const initialUnits = await fetchUnits(null);
            unitSelect.innerHTML = `<option value="">All Units</option>` + initialUnits.map(u=>`<option value="${u}">${u}</option>`).join('');
            selectedCompany = null; selectedUnit = null;
        } else {
            selectedCompany = ctx.company || null;
            companySelect.innerHTML = `<option value="${selectedCompany||''}">${selectedCompany||'-'}</option>`;
            companySelect.disabled = true;
            let units=[];
            if (ctx.units && ctx.units.length) units = ctx.units;
            else if (selectedCompany) units = await fetchUnits(selectedCompany);
            if (!units || !units.length){ unitSelect.innerHTML = `<option value="">All Units</option>`; selectedUnit = null; }
            else { unitSelect.innerHTML = units.map(u=>`<option value="${u}">${u}</option>`).join(''); selectedUnit = units.length===1 ? units[0] : units[0]; }
            unitSelect.disabled = !(ctx.units && ctx.units.length>1);
        }
    }
})();