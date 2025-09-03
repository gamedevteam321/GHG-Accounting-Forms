// Capital Goods UI and Frappe integration
(function() {
    let currentRowIds = {
        'supplier-specific': 1,
        'hybrid': 1,
        'average-data': 1,
        'spend-based': 1
    };
    let isInitialized = false;
    let activeTab = 'supplier-specific';
    let selectedCompany = null;
    let selectedUnit = null;
    let selectedDateFrom = null;
    let selectedDateTo = null;
    let isFilterVisible = false;
    const metaCache = {};

    const unitsOfMeasurement = [
        'Grams', 'Pieces', 'Milileters', 'Liters', 'Meters', 'KM', 'Miles', 'KG', 'Tonnes'
    ];

    function initializeInterface() {
        const container = root_element.querySelector('.capital-goods-container');
        if (!container || isInitialized) return;

        buildFilterBar(async ()=>{
            await initializeFiltersFromContext();
            setupTabSwitching();
            createDataEntryRow('supplier-specific');
            createDataEntryRow('hybrid');
            createDataEntryRow('average-data');
            createDataEntryRow('spend-based');
            loadExistingData();
            isInitialized = true;
        });
    }

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

    function getTableId(tabType) {
        const tableIds = {
            'supplier-specific': 'capitalSupplierSpecificTable',
            'hybrid': 'capitalHybridTable',
            'average-data': 'capitalAverageDataTable',
            'spend-based': 'capitalSpendBasedTable'
        };
        return tableIds[tabType];
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
    }

    function getEntryRowHTML(tabType) {
        const today = new Date().toISOString().split('T')[0];
        switch(tabType) {
            case 'supplier-specific':
                return `
                    <td>${currentRowIds[tabType]}</td>
                    <td><input type="date" class="form-control" value="${today}"></td>
                    <td><input type="number" class="form-control quantity" step="0.01" placeholder="0.00"></td>
                    <td>
                        <select class="form-control unit-select">
                            ${unitsOfMeasurement.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                        </select>
                    </td>
                    <td><input type="number" class="form-control emission-factor" step="0.0001" placeholder="0.0000"></td>
                    <td><span class="total-emissions">0.00</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm save-btn">Add</button>
                    </td>
                `;
            case 'hybrid':
                return `
                    <td>${currentRowIds[tabType]}</td>
                    <td><input type="date" class="form-control" value="${today}"></td>
                    <td>
                        <input type="file" class="form-control file-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="padding: 8px; height: 44px;">
                    </td>
                    <td><input type="number" class="form-control supplier-scope-1" step="0.01" placeholder="0.00"></td>
                    <td><input type="number" class="form-control supplier-scope-2" step="0.01" placeholder="0.00"></td>
                    <td>
                        <select class="form-control unit-select">
                            ${unitsOfMeasurement.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary add-material-btn" data-row="${currentRowIds[tabType]}">Add Material</button>
                        <div class="material-summary" id="material-summary-${currentRowIds[tabType]}">No items added</div>
                    </td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary add-transport-btn" data-row="${currentRowIds[tabType]}">Add Transport</button>
                        <div class="transport-summary" id="transport-summary-${currentRowIds[tabType]}">No items added</div>
                    </td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary add-waste-btn" data-row="${currentRowIds[tabType]}">Add Waste</button>
                        <div class="waste-summary" id="waste-summary-${currentRowIds[tabType]}">No items added</div>
                    </td>
                    <td><span class="total-emissions">0.00</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm save-btn">Add</button>
                    </td>
                `;
            case 'average-data':
                return `
                    <td>${currentRowIds[tabType]}</td>
                    <td><input type="date" class="form-control" value="${today}"></td>
                    <td><input type="text" class="form-control" placeholder="Enter capital good description"></td>
                    <td><input type="number" class="form-control quantity" step="0.01" placeholder="0.00"></td>
                    <td>
                        <select class="form-control unit-select">
                            ${unitsOfMeasurement.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                        </select>
                    </td>
                    <td><input type="number" class="form-control emission-factor" step="0.0001" placeholder="0.0000"></td>
                    <td><span class="total-emissions">0.00</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm save-btn">Add</button>
                    </td>
                `;
            case 'spend-based':
                return `
                    <td>${currentRowIds[tabType]}</td>
                    <td><input type="date" class="form-control" value="${today}"></td>
                    <td><input type="text" class="form-control" placeholder="Enter capital good description"></td>
                    <td><input type="number" class="form-control amount-spent" step="0.01" placeholder="0.00"></td>
                    <td>
                        <select class="form-control unit-select">
                            ${unitsOfMeasurement.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                        </select>
                    </td>
                    <td><input type="number" class="form-control emission-factor" step="0.0001" placeholder="0.0000"></td>
                    <td><span class="total-emissions">0.00</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm save-btn">Add</button>
                    </td>
                `;
        }
    }

    function setupEntryRowEventListeners(row, tabType) {
        const saveBtn = row.querySelector('.save-btn');
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const data = getFormData(row, tabType);
            if (validateFormData(data, tabType)) {
                saveToDoctype(data, tabType, (docName) => {
                    addNewRow(row, tabType, docName);
                    clearEntryRow(row, tabType);
                    frappe.show_alert('Record added successfully!', 3);
                });
            }
        });

        if (tabType === 'hybrid') {
            const inputs = [
                row.querySelector('.supplier-scope-1'),
                row.querySelector('.supplier-scope-2')
            ];
            const recalc = () => updateHybridCalculations(row);
            inputs.forEach(input => {
                input.addEventListener('input', recalc, true);
                input.addEventListener('change', recalc, true);
            });
            setupPopupFunctionality(row);
        }

        if (tabType === 'supplier-specific') setupSimpleCalc(row, '.quantity', '.emission-factor');
        if (tabType === 'average-data') setupSimpleCalc(row, '.quantity', '.emission-factor');
        if (tabType === 'spend-based') setupSimpleCalc(row, '.amount-spent', '.emission-factor');
    }

    function setupSimpleCalc(row, aSel, bSel) {
        const a = row.querySelector(aSel);
        const b = row.querySelector(bSel);
        const t = row.querySelector('.total-emissions');
        const calc = () => { const av = parseFloat(a.value)||0; const bv = parseFloat(b.value)||0; t.textContent = (av*bv).toFixed(2); };
        a.addEventListener('input', calc, true); b.addEventListener('input', calc, true);
        a.addEventListener('change', calc, true); b.addEventListener('change', calc, true);
    }

    function updateHybridCalculations(row) {
        const s1 = parseFloat(row.querySelector('.supplier-scope-1').value) || 0;
        const s2 = parseFloat(row.querySelector('.supplier-scope-2').value) || 0;
        const t = row.querySelector('.total-emissions');
        let m = 0, tr = 0, w = 0;
        const sm = row.querySelector('.material-summary');
        if (sm && sm.getAttribute('data-name')) m = (parseFloat(sm.getAttribute('data-quantity'))||0) * (parseFloat(sm.getAttribute('data-ef'))||0);
        const st = row.querySelector('.transport-summary');
        if (st && st.getAttribute('data-name')) tr = (parseFloat(st.getAttribute('data-quantity'))||0) * (parseFloat(st.getAttribute('data-ef'))||0);
        const sw = row.querySelector('.waste-summary');
        if (sw && sw.getAttribute('data-name')) w = (parseFloat(sw.getAttribute('data-quantity'))||0) * (parseFloat(sw.getAttribute('data-ef'))||0);
        t.textContent = (s1 + s2 + m + tr + w).toFixed(2);
    }

    // Popup to add Material/Transport/Waste quick summary
    let currentPopupType = null; let currentPopupRow = null;
    function setupPopupFunctionality(row) {
        if (!document.getElementById('capital-hybrid-popup-container')) {
            const pc = document.createElement('div');
            pc.id = 'capital-hybrid-popup-container';
            pc.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:none;z-index:9999;justify-content:center;align-items:center;';
            pc.innerHTML = `
                <div class="popup-content">
                    <h4 class="popup-title"></h4>
                    <div class="popup-form">
                        <div class="form-group"><label>Name:</label><input type="text" id="cap-popup-name" class="form-control" placeholder="Enter name"></div>
                        <div class="form-group"><label>Quantity:</label><input type="number" id="cap-popup-quantity" class="form-control" step="0.01" placeholder="Enter quantity"></div>
                        <div class="form-group"><label>Emission Factor (EF):</label><input type="number" id="cap-popup-ef" class="form-control" step="0.0001" placeholder="Enter EF"></div>
                        <div class="popup-buttons"><button type="button" class="btn btn-secondary cap-popup-cancel">Cancel</button><button type="button" class="btn btn-primary cap-popup-submit">Submit</button></div>
                    </div>
                </div>`;
            document.body.appendChild(pc);
            pc.querySelector('.cap-popup-cancel').addEventListener('click', closePopup);
            pc.querySelector('.cap-popup-submit').addEventListener('click', submitPopup);
        }
        const addMaterialBtn = row.querySelector('.add-material-btn');
        const addTransportBtn = row.querySelector('.add-transport-btn');
        const addWasteBtn = row.querySelector('.add-waste-btn');
        if (addMaterialBtn) addMaterialBtn.addEventListener('click', () => openPopup('material', row));
        if (addTransportBtn) addTransportBtn.addEventListener('click', () => openPopup('transport', row));
        if (addWasteBtn) addWasteBtn.addEventListener('click', () => openPopup('waste', row));
    }
    function openPopup(type, row) { currentPopupType = type; currentPopupRow = row; const pc = document.getElementById('capital-hybrid-popup-container'); pc.querySelector('.popup-title').textContent = ({material:'Add Material Item',transport:'Add Transport Item',waste:'Add Waste Item'})[type]; document.getElementById('cap-popup-name').value=''; document.getElementById('cap-popup-quantity').value=''; document.getElementById('cap-popup-ef').value=''; pc.style.display='flex'; }
    function closePopup() { const pc = document.getElementById('capital-hybrid-popup-container'); pc.style.display='none'; currentPopupType=null; currentPopupRow=null; }
    function submitPopup() {
        const name = document.getElementById('cap-popup-name').value.trim();
        const quantity = parseFloat(document.getElementById('cap-popup-quantity').value) || 0;
        const ef = parseFloat(document.getElementById('cap-popup-ef').value) || 0;
        if (!name || quantity <= 0 || ef <= 0) { alert('Please enter valid name, quantity and EF.'); return; }
        const summary = currentPopupRow.querySelector(`.${currentPopupType}-summary`);
        if (summary) {
            summary.textContent = `${name} | Qty: ${quantity} | EF: ${ef}`;
            summary.style.color = '#28a745';
            summary.style.fontWeight = 'bold';
            summary.setAttribute('data-name', name);
            summary.setAttribute('data-quantity', quantity);
            summary.setAttribute('data-ef', ef);
            updateHybridCalculations(currentPopupRow);
        }
        closePopup();
    }

    function getMethodType(tabType) {
        return {
            'supplier-specific': 'Supplier-Specific Method',
            'hybrid': 'Hybrid Method',
            'average-data': 'Average-Data Method',
            'spend-based': 'Spend-Based Method'
        }[tabType];
    }

    function getDoctypeName(tabType) {
        return {
            'supplier-specific': 'Capital Goods Supplier Specific Method',
            'hybrid': 'Capital Goods Hybrid Method',
            'average-data': 'Capital Goods Average Data Method',
            'spend-based': 'Capital Goods Spend Based Method'
        }[tabType];
    }

    function getFormData(row, tabType) {
        const data = { date: row.querySelector('input[type="date"]').value, docName: null };
        switch(tabType) {
            case 'supplier-specific':
                data.quantity = parseFloat(row.querySelector('.quantity').value) || 0;
                data.unit = row.querySelector('.unit-select').value;
                data.emission_factor = parseFloat(row.querySelector('.emission-factor').value) || 0;
                data.total_emissions = parseFloat(row.querySelector('.total-emissions').textContent) || 0;
                break;
            case 'hybrid':
                data.supplier_scope_1 = parseFloat(row.querySelector('.supplier-scope-1').value) || 0;
                data.supplier_scope_2 = parseFloat(row.querySelector('.supplier-scope-2').value) || 0;
                data.unit = row.querySelector('.unit-select').value;
                const invoiceFile = row.querySelector('input[type="file"]');
                if (invoiceFile && invoiceFile.files.length > 0) data.invoice = invoiceFile.files[0].name;
                const materialSummary = row.querySelector('.material-summary');
                if (materialSummary && materialSummary.getAttribute('data-name')) {
                    data.material_name = materialSummary.getAttribute('data-name') || '';
                    data.material_quantity = parseFloat(materialSummary.getAttribute('data-quantity')) || 0;
                    data.material_ef = parseFloat(materialSummary.getAttribute('data-ef')) || 0;
                } else { data.material_name=''; data.material_quantity=0; data.material_ef=0; }
                const transportSummary = row.querySelector('.transport-summary');
                if (transportSummary && transportSummary.getAttribute('data-name')) {
                    data.transport_name = transportSummary.getAttribute('data-name') || '';
                    data.transport_quantity = parseFloat(transportSummary.getAttribute('data-quantity')) || 0;
                    data.transport_ef = parseFloat(transportSummary.getAttribute('data-ef')) || 0;
                } else { data.transport_name=''; data.transport_quantity=0; data.transport_ef=0; }
                const wasteSummary = row.querySelector('.waste-summary');
                if (wasteSummary && wasteSummary.getAttribute('data-name')) {
                    data.waste_name = wasteSummary.getAttribute('data-name') || '';
                    data.waste_quantity = parseFloat(wasteSummary.getAttribute('data-quantity')) || 0;
                    data.waste_ef = parseFloat(wasteSummary.getAttribute('data-ef')) || 0;
                } else { data.waste_name=''; data.waste_quantity=0; data.waste_ef=0; }
                data.total_emissions = parseFloat(row.querySelector('.total-emissions').textContent) || 0;
                break;
            case 'average-data':
                data.description = row.querySelector('td:nth-child(3) input').value;
                data.quantity = parseFloat(row.querySelector('.quantity').value) || 0;
                data.unit = row.querySelector('.unit-select').value;
                data.emission_factor = parseFloat(row.querySelector('.emission-factor').value) || 0;
                data.total_emissions = parseFloat(row.querySelector('.total-emissions').textContent) || 0;
                break;
            case 'spend-based':
                data.description = row.querySelector('td:nth-child(3) input').value;
                data.amount_spent = parseFloat(row.querySelector('.amount-spent').value) || 0;
                data.unit = row.querySelector('.unit-select').value;
                data.emission_factor = parseFloat(row.querySelector('.emission-factor').value) || 0;
                data.total_emissions = parseFloat(row.querySelector('.total-emissions').textContent) || 0;
                break;
        }
        return data;
    }

    function validateFormData(data, tabType) {
        if (!data.date) { frappe.show_alert('Please select a date', 5); return false; }
        switch(tabType) {
            case 'supplier-specific': if (data.quantity <= 0 || data.emission_factor <= 0) return false; break;
            case 'hybrid': if (data.supplier_scope_1 < 0 || data.supplier_scope_2 < 0) return false; break;
            case 'average-data': if (!data.description || data.quantity <= 0 || data.emission_factor <= 0) return false; break;
            case 'spend-based': if (!data.description || data.amount_spent <= 0 || data.emission_factor <= 0) return false; break;
        }
        return true;
    }

    function saveToDoctype(data, tabType, callback) { createDoctypeRecord(data, tabType, callback); }

    function createDoctypeRecord(data, tabType, callback) {
        const doctypeName = getDoctypeName(tabType);
        const methodType = getMethodType(tabType);
        const docData = { doctype: doctypeName, date: data.date, method_type: methodType, total_emissions: data.total_emissions, ...data };
        (async ()=>{ try { const ctx = await getUserContext(); if (await hasField(doctypeName,'company')) { docData.company = ctx.is_super ? (selectedCompany || ctx.company || null) : (ctx.company || null); } if (await hasField(doctypeName,'company_unit')) { const chosenUnit = selectedUnit || (ctx.units && ctx.units.length===1 ? ctx.units[0] : null); if (chosenUnit) docData.company_unit = chosenUnit; } } catch(e){} frappe.call({ method:'frappe.client.insert', args:{ doc: docData }, callback: function(r){ if (r.message) { data.docName = r.message.name; if (callback) callback(r.message.name); } else { frappe.show_alert('Error saving data', 5); } }, error: function(){ frappe.show_alert('Network error while saving', 5); } }); })();
    }

    function createDisplayRow(data, docName, tabType) {
        let html = `<td>${currentRowIds[tabType] - 1}</td><td>${formatDate(data.date)}</td>`;
        switch(tabType) {
            case 'supplier-specific':
                html += `<td>${data.quantity || '0.00'}</td><td>${data.unit || '-'}</td><td>${data.emission_factor || '0.0000'}</td><td>${data.total_emissions || '0.00'}</td>`; break;
            case 'hybrid':
                html += `<td>${data.invoice ? `<a href="#" class="view-document">${data.invoice}</a>` : '<span class="no-file">No file uploaded</span>'}</td>` +
                        `<td>${data.supplier_scope_1 || '0.00'}</td><td>${data.supplier_scope_2 || '0.00'}</td><td>${data.unit || '-'}</td>` +
                        `<td>${data.material_name && data.material_quantity && data.material_ef ? `<span class="display-material">${data.material_name} | Qty: ${data.material_quantity} | EF: ${data.material_ef}</span>` : 'No items added'}</td>` +
                        `<td>${data.transport_name && data.transport_quantity && data.transport_ef ? `<span class="display-transport">${data.transport_name} | Qty: ${data.transport_quantity} | EF: ${data.transport_ef}</span>` : 'No items added'}</td>` +
                        `<td>${data.waste_name && data.waste_quantity && data.waste_ef ? `<span class="display-waste">${data.waste_name} | Qty: ${data.waste_quantity} | EF: ${data.waste_ef}</span>` : 'No items added'}</td>` +
                        `<td>${data.total_emissions || '0.00'}</td>`; break;
            case 'average-data':
                html += `<td>${data.description || '-'}</td><td>${data.quantity || '0.00'}</td><td>${data.unit || '-'}</td><td>${data.emission_factor || '0.0000'}</td><td>${data.total_emissions || '0.00'}</td>`; break;
            case 'spend-based':
                html += `<td>${data.description || '-'}</td><td>${data.amount_spent || '0.00'}</td><td>${data.unit || '-'}</td><td>${data.emission_factor || '0.0000'}</td><td>${data.total_emissions || '0.00'}</td>`; break;
        }
        html += `<td><button class="btn btn-danger btn-sm delete-btn" data-doc="${docName}">Delete</button></td>`;
        return html;
    }

    function addNewRow(entryRow, tabType, docName) {
        const tbody = root_element.querySelector('#' + getTableId(tabType) + 'Body');
        const data = getFormData(entryRow, tabType);
        const displayRow = document.createElement('tr');
        displayRow.className = 'data-display-row';
        displayRow.innerHTML = createDisplayRow(data, docName || data.docName || 'temp', tabType);
        tbody.insertBefore(displayRow, entryRow.nextSibling);
        setupDisplayRowEventListeners(displayRow, tabType);
        currentRowIds[tabType]++;
        entryRow.querySelector('td:first-child').textContent = currentRowIds[tabType];
    }

    function setupDisplayRowEventListeners(row, tabType) {
        const deleteBtn = row.querySelector('.delete-btn');
        if (!deleteBtn) return;
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const docName = deleteBtn.getAttribute('data-doc');
            if (!docName) return;
            if (confirm('Are you sure you want to delete this record?')) {
                const doctypeName = getDoctypeName(tabType);
                frappe.call({
                    method: 'frappe.client.delete',
                    args: { doctype: doctypeName, name: docName },
                    callback: function(r) {
                        if (!r.exc) { row.remove(); frappe.show_alert('Record deleted', 3); }
                        else { frappe.show_alert('Error deleting record', 5); }
                    },
                    error: function() { row.remove(); frappe.show_alert('Record may have been deleted. Refresh to confirm.', 5); }
                });
            }
        });
    }

    function clearEntryRow(row, tabType) {
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => { if (input.type === 'date') { input.value = new Date().toISOString().split('T')[0]; } else { input.value = ''; } });
        const selects = row.querySelectorAll('select'); selects.forEach(s => s.selectedIndex = 0);
        const total = row.querySelector('.total-emissions'); if (total) total.textContent = '0.00';
        if (tabType === 'hybrid') {
            const ms = row.querySelector('.material-summary'); if (ms) { ms.textContent='No items added'; ms.removeAttribute('data-name'); ms.removeAttribute('data-quantity'); ms.removeAttribute('data-ef'); }
            const ts = row.querySelector('.transport-summary'); if (ts) { ts.textContent='No items added'; ts.removeAttribute('data-name'); ts.removeAttribute('data-quantity'); ts.removeAttribute('data-ef'); }
            const ws = row.querySelector('.waste-summary'); if (ws) { ws.textContent='No items added'; ws.removeAttribute('data-name'); ws.removeAttribute('data-quantity'); ws.removeAttribute('data-ef'); }
        }
    }

    // Helper to apply client-side date filtering
    function applyDateFilter(records) {
        if (!selectedDateFrom && !selectedDateTo) {
            return records;
        }
        
        console.log('Capital Goods: Applying client-side date filtering...');
        console.log('Date filters - From:', selectedDateFrom, 'To:', selectedDateTo);
        
        return records.filter(record => {
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
    }

    function loadExistingData() { ['supplier-specific','hybrid','average-data','spend-based'].forEach(loadTabData); }

    function loadTabData(tabType) {
        const doctypeName = getDoctypeName(tabType);
        const methodType = getMethodType(tabType);
        let fields = ['name','date','total_emissions'];
        switch(tabType) {
            case 'supplier-specific': fields = fields.concat(['quantity','unit','emission_factor']); break;
            case 'hybrid': fields = fields.concat(['supplier_scope_1','supplier_scope_2','unit','invoice','material_name','material_quantity','material_ef','transport_name','transport_quantity','transport_ef','waste_name','waste_quantity','waste_ef']); break;
            case 'average-data': fields = fields.concat(['description','quantity','unit','emission_factor']); break;
            case 'spend-based': fields = fields.concat(['description','amount_spent','unit','emission_factor']); break;
        }
        (async ()=>{
        const ctx = await getUserContext();
        const filters = { method_type: methodType };
        if (await hasField(doctypeName,'company')) { filters.company = ctx.is_super ? (selectedCompany || ctx.company || undefined) : (ctx.company || undefined); }
        if (await hasField(doctypeName,'company_unit')) { if (selectedUnit) filters.company_unit = selectedUnit; }
        frappe.call({
            method: 'frappe.client.get_list',
            args: { doctype: doctypeName, filters, fields: fields, limit_page_length: 100 },
            callback: function(r) {
                if (r.message && r.message.length > 0) {
                    // Apply client-side date filtering
                    const filteredRecords = applyDateFilter(r.message);
                    console.log(`Capital Goods: Original records: ${r.message.length}, Filtered records: ${filteredRecords.length}`);
                    
                    const tbody = root_element.querySelector('#' + getTableId(tabType) + 'Body');
                    const entryRow = tbody.querySelector('.data-entry-row');
                    filteredRecords.forEach((doc, index) => {
                        const displayRow = document.createElement('tr');
                        displayRow.className = 'data-display-row';
                        const data = {
                            date: doc.date,
                            quantity: doc.quantity,
                            unit: doc.unit,
                            emission_factor: doc.emission_factor,
                            description: doc.description,
                            amount_spent: doc.amount_spent,
                            supplier_scope_1: doc.supplier_scope_1,
                            supplier_scope_2: doc.supplier_scope_2,
                            material_name: doc.material_name,
                            material_quantity: doc.material_quantity,
                            material_ef: doc.material_ef,
                            transport_name: doc.transport_name,
                            transport_quantity: doc.transport_quantity,
                            transport_ef: doc.transport_ef,
                            waste_name: doc.waste_name,
                            waste_quantity: doc.waste_quantity,
                            waste_ef: doc.waste_ef,
                            invoice: doc.invoice,
                            total_emissions: doc.total_emissions
                        };
                        displayRow.innerHTML = createDisplayRow(data, doc.name, tabType);
                        tbody.insertBefore(displayRow, entryRow.nextSibling);
                        setupDisplayRowEventListeners(displayRow, tabType);
                        currentRowIds[tabType] = Math.max(currentRowIds[tabType], index + 2);
                    });
                }
            }
        });
        })();
    }
    // Company/Unit Filter
    async function getUserContext(){ try { const r = await frappe.call({ method:'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' }); return r.message || { company:null, units:[], is_super:false }; } catch(e){ return { company:null, units:[], is_super:false }; } }
    async function hasField(doctype, fieldname){ try { if(!metaCache[doctype]){ const r = await frappe.call({ method:'frappe.client.get', args:{ doctype:'DocType', name: doctype } }); metaCache[doctype] = r.message || {}; } const fields = metaCache[doctype].fields||[]; return fields.some(f=> f.fieldname===fieldname); } catch(e){ return false; } }
    function buildFilterBar(done){ 
        const container = root_element.querySelector('.capital-goods-container'); 
        if(!container){ done&&done(); return; } 
        if(container.querySelector('.filter-bar')){ done&&done(); return; } 
        const bar=document.createElement('div'); 
        bar.className='filter-bar'; 
        (async()=>{ 
            try{ 
                const ctx=await getUserContext(); 
                const roles=(frappe&&frappe.get_roles)? frappe.get_roles():[]; 
                const canShow = ctx.is_super || roles.includes('System Manager') || roles.includes('Super Admin'); 
                if(!canShow){ done&&done(); return; } 
            }catch(e){ done&&done(); return; } 
        })(); 
        bar.innerHTML = `
            <div class="filter-header">
                <h3>Filters</h3>
                <button type="button" class="filter-toggle-btn">
                    <i class="fa fa-plus"></i>
                </button>
            </div>
            <div class="filter-content" style="display: none;">
                <div class="filter-row">
                    <div class="filter-group">
                        <label>Company</label>
                        <select class="form-control filter-company-select">
                            <option value="">All Companies</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Unit</label>
                        <select class="form-control filter-unit-select">
                            <option value="">All Units</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>From Date</label>
                        <input type="date" class="form-control date-from-input">
                    </div>
                    <div class="filter-group">
                        <label>To Date</label>
                        <input type="date" class="form-control date-to-input">
                    </div>
                    <div class="filter-actions">
                        <button type="button" class="btn filter-apply-btn">Apply</button>
                        <button type="button" class="btn filter-clear-btn">Clear Dates</button>
                    </div>
                </div>
            </div>
        `; 
        const header = container.querySelector('.page-header')||container.querySelector('.header-section'); 
        if(header) header.insertAdjacentElement('afterend', bar); else container.prepend(bar); 
        
        // Apply button event listener
        bar.querySelector('.filter-apply-btn')?.addEventListener('click', ()=>{
            const csel=bar.querySelector('.filter-company-select');
            const usel=bar.querySelector('.filter-unit-select');
            const fromDate = bar.querySelector('.date-from-input');
            const toDate = bar.querySelector('.date-to-input');
            
            selectedCompany = csel.value || null;
            selectedUnit = usel.value || null;
            selectedDateFrom = fromDate.value || null;
            selectedDateTo = toDate.value || null;
            
            console.log('Capital Goods Filter values:', {
                company: selectedCompany,
                unit: selectedUnit,
                dateFrom: selectedDateFrom,
                dateTo: selectedDateTo
            });
            
            ['supplier-specific','hybrid','average-data','spend-based'].forEach(t=>{ 
                const tb=root_element.querySelector('#'+getTableId(t)+'Body'); 
                tb?.querySelectorAll('.data-display-row').forEach(r=>r.remove()); 
            }); 
            loadExistingData(); 
        });
        
        // Clear dates button event listener
        bar.querySelector('.filter-clear-btn')?.addEventListener('click', ()=>{
            const fromDate = bar.querySelector('.date-from-input');
            const toDate = bar.querySelector('.date-to-input');
            
            fromDate.value = '';
            toDate.value = '';
            selectedDateFrom = null;
            selectedDateTo = null;
            
            console.log('Capital Goods Date filters cleared');
            ['supplier-specific','hybrid','average-data','spend-based'].forEach(t=>{ 
                const tb=root_element.querySelector('#'+getTableId(t)+'Body'); 
                tb?.querySelectorAll('.data-display-row').forEach(r=>r.remove()); 
            }); 
            loadExistingData();
        });
        
        // Toggle button event listener
        bar.querySelector('.filter-toggle-btn')?.addEventListener('click', ()=>{
            const content = bar.querySelector('.filter-content');
            const icon = bar.querySelector('.filter-toggle-btn i');
            
            isFilterVisible = !isFilterVisible;
            
            if (isFilterVisible) {
                content.style.display = 'block';
                icon.className = 'fa fa-minus';
            } else {
                content.style.display = 'none';
                icon.className = 'fa fa-plus';
            }
        });
        
        done&&done(); 
    }
    async function fetchCompanies(){ const r = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Company', fields:['name'], limit:500 } }); return (r.message||[]).map(x=>x.name); }
    async function fetchUnits(company){ const filters = company ? { company } : {}; const r = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Units', fields:['name'], filters, limit:500 } }); return (r.message||[]).map(x=>x.name); }
    async function initializeFiltersFromContext(){ const ctx = await getUserContext(); const bar=root_element.querySelector('.filter-bar'); if(!bar) return; const cSel=bar.querySelector('.filter-company-select'); const uSel=bar.querySelector('.filter-unit-select'); cSel.innerHTML=''; uSel.innerHTML=''; if(ctx.is_super){ const companies=await fetchCompanies(); cSel.innerHTML = `<option value=\"\">All Companies</option>` + companies.map(c=>`<option value=\"${c}\">${c}</option>`).join(''); cSel.addEventListener('change', async ()=>{ selectedCompany=cSel.value||null; const units=await fetchUnits(selectedCompany); uSel.innerHTML = `<option value=\"\">All Units</option>` + units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit=null; }); const initialUnits=await fetchUnits(null); uSel.innerHTML = `<option value=\"\">All Units</option>` + initialUnits.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedCompany=null; selectedUnit=null; } else { selectedCompany = ctx.company || null; cSel.innerHTML = `<option value=\"${selectedCompany||''}\">${selectedCompany||'-'}</option>`; cSel.disabled=true; let units=[]; if(ctx.units && ctx.units.length) units=ctx.units; else if(selectedCompany) units=await fetchUnits(selectedCompany); if(!units||!units.length){ uSel.innerHTML = `<option value=\"\">All Units</option>`; selectedUnit=null; } else { uSel.innerHTML = units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit = units.length===1 ? units[0] : units[0]; } uSel.disabled = !(ctx.units && ctx.units.length>1); } }

    function formatDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString(); }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initializeInterface); } else { initializeInterface(); }
})();

