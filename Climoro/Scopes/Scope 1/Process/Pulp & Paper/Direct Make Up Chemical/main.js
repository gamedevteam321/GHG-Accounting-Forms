(function(){
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    let currentIndex = 1;
    let CHEMICAL_DEFAULTS = [];
    let currentTab = 'makeup-chemicals';

    function init(){ 
        setupTabs(); 
        ensureEntryRow(); 
        attachGlobalKeyBlockers(); 
        loadExisting();
        setupRefreshButton();
    }


    function setupTabs(){
        const tabBtns = scopeRoot.querySelectorAll('.tab-btn');
        const tabContents = scopeRoot.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                currentTab = tabId;
                
                // Update active tab button
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update active tab content
                tabContents.forEach(content => content.classList.remove('active'));
                scopeRoot.querySelector(`#${tabId}`).classList.add('active');
                
                // Ensure entry row for the active tab
                ensureEntryRow();
            });
        });
    }

    function ensureEntryRow(){
        const tableId = currentTab === 'makeup-chemicals' ? 'makeupTableBody' : 'fgdTableBody';
        const tbody = scopeRoot.querySelector(`#${tableId}`); 
        if(!tbody) return;
        const existing = tbody.querySelector('.data-entry-row'); if(existing) existing.remove();
        const row = document.createElement('tr'); row.className='data-entry-row'; const today = new Date().toISOString().split('T')[0];
        
        if(currentTab === 'makeup-chemicals') {
            row.innerHTML = `
                <td>${currentIndex}</td>
                <td><input type="date" class="form-control date-picker" data-frappe-ignore="true" value="${today}"></td>
                <td>
                    <div class="input-display">
                        <input type="number" class="form-control amount-input sodium" data-frappe-ignore="true" step="0.01" placeholder="0.00">
                        <div class="value-display">Input value <span class="input-value sodium-value">0.00</span> × <span class="const-value">0.415</span></div>
                        <div class="calculated-value sodium-co2">CO2: 0.00</div>
                    </div>
                </td>
                <td>
                    <div class="input-display">
                        <input type="number" class="form-control amount-input calcium" data-frappe-ignore="true" step="0.01" placeholder="0.00">
                        <div class="value-display">Input value <span class="input-value calcium-value">0.00</span> × <span class="const-value">0.440</span></div>
                        <div class="calculated-value calcium-co2">CO2: 0.00</div>
                    </div>
                </td>
                <td><span class="calculated-value total-co2">Total: 0.00</span></td>
                <td><input type="text" class="form-control notes" data-frappe-ignore="true" placeholder="Notes"></td>
                <td><button class="btn btn-success save-btn">Add</button></td>`;
        } else {
            row.innerHTML = `
                <td>${currentIndex}</td>
                <td><input type="date" class="form-control date-picker" data-frappe-ignore="true" value="${today}"></td>
                <td>
                    <div class="input-display">
                        <input type="number" class="form-control amount-input calcium-fgd" data-frappe-ignore="true" step="0.01" placeholder="0.00">
                        <div class="value-display">Input value <span class="input-value calcium-fgd-value">0.00</span> × <span class="const-value">0.440</span></div>
                        <div class="calculated-value calcium-fgd-co2">CO2: 0.00</div>
                    </div>
                </td>
                <td>
                    <div class="input-display">
                        <input type="number" class="form-control amount-input dolomite" data-frappe-ignore="true" step="0.01" placeholder="0.00">
                        <div class="value-display">Input value <span class="input-value dolomite-value">0.00</span> × <span class="const-value">0.477</span></div>
                        <div class="calculated-value dolomite-co2">CO2: 0.00</div>
                    </div>
                </td>
                <td><span class="calculated-value total-co2">Total: 0.00</span></td>
                <td><input type="text" class="form-control notes" data-frappe-ignore="true" placeholder="Notes"></td>
                <td><button class="btn btn-success save-btn">Add</button></td>`;
        }
        
        tbody.insertBefore(row, tbody.firstChild);
        setupRowEvents(row);
    }


    function setupRowEvents(row){
        const calc = ()=>{
            let totalCo2 = 0;
            
            if(currentTab === 'makeup-chemicals') {
                // Sodium Carbonate calculation
                const sodiumAmount = parseFloat(row.querySelector('.sodium').value) || 0;
                const sodiumCo2 = sodiumAmount * 0.415;
                row.querySelector('.sodium-value').textContent = sodiumAmount.toFixed(2);
                row.querySelector('.sodium-co2').textContent = `CO2: ${(isFinite(sodiumCo2) ? sodiumCo2 : 0).toFixed(2)}`;
                totalCo2 += sodiumCo2;
                
                // Calcium Carbonate calculation
                const calciumAmount = parseFloat(row.querySelector('.calcium').value) || 0;
                const calciumCo2 = calciumAmount * 0.440;
                row.querySelector('.calcium-value').textContent = calciumAmount.toFixed(2);
                row.querySelector('.calcium-co2').textContent = `CO2: ${(isFinite(calciumCo2) ? calciumCo2 : 0).toFixed(2)}`;
                totalCo2 += calciumCo2;
            } else {
                // Calcium Carbonate FGD calculation
                const calciumFgdAmount = parseFloat(row.querySelector('.calcium-fgd').value) || 0;
                const calciumFgdCo2 = calciumFgdAmount * 0.440;
                row.querySelector('.calcium-fgd-value').textContent = calciumFgdAmount.toFixed(2);
                row.querySelector('.calcium-fgd-co2').textContent = `CO2: ${(isFinite(calciumFgdCo2) ? calciumFgdCo2 : 0).toFixed(2)}`;
                totalCo2 += calciumFgdCo2;
                
                // Dolomite calculation
                const dolomiteAmount = parseFloat(row.querySelector('.dolomite').value) || 0;
                const dolomiteCo2 = dolomiteAmount * 0.477;
                row.querySelector('.dolomite-value').textContent = dolomiteAmount.toFixed(2);
                row.querySelector('.dolomite-co2').textContent = `CO2: ${(isFinite(dolomiteCo2) ? dolomiteCo2 : 0).toFixed(2)}`;
                totalCo2 += dolomiteCo2;
            }
            
            row.querySelector('.total-co2').textContent = `Total: ${(isFinite(totalCo2) ? totalCo2 : 0).toFixed(2)}`;
        };

        // Add event listeners to all amount inputs
        const amountInputs = row.querySelectorAll('.amount-input');
        amountInputs.forEach(input => {
            input.addEventListener('input', calc);
            input.addEventListener('change', calc);
        });
        
        calc();
        row.querySelector('.save-btn').addEventListener('click', (e)=>{ e.preventDefault(); addDisplayRow(row); });
    }

    function addDisplayRow(entryRow){
        const tbody = entryRow.parentElement; const tr = document.createElement('tr'); tr.className='data-display-row';
        const dateVal = entryRow.querySelector('.date-picker').value;
        
        let html = '';
        if(currentTab === 'makeup-chemicals') {
            html = `
                <td>${currentIndex}</td>
                <td>${formatDate(dateVal)}</td>
                <td>
                    <div>Amount: ${val(entryRow,'.sodium')}</div>
                    <div>CO2: ${entryRow.querySelector('.sodium-co2').textContent}</div>
                </td>
                <td>
                    <div>Amount: ${val(entryRow,'.calcium')}</div>
                    <div>CO2: ${entryRow.querySelector('.calcium-co2').textContent}</div>
                </td>
                <td><span class="calculated-value">${entryRow.querySelector('.total-co2').textContent}</span></td>
                <td>${val(entryRow,'.notes')}</td>
                <td><button class="btn btn-danger delete-btn">Delete</button></td>`;
        } else {
            html = `
                <td>${currentIndex}</td>
                <td>${formatDate(dateVal)}</td>
                <td>
                    <div>Amount: ${val(entryRow,'.calcium-fgd')}</div>
                    <div>CO2: ${entryRow.querySelector('.calcium-fgd-co2').textContent}</div>
                </td>
                <td>
                    <div>Amount: ${val(entryRow,'.dolomite')}</div>
                    <div>CO2: ${entryRow.querySelector('.dolomite-co2').textContent}</div>
                </td>
                <td><span class="calculated-value">${entryRow.querySelector('.total-co2').textContent}</span></td>
                <td>${val(entryRow,'.notes')}</td>
                <td><button class="btn btn-danger delete-btn">Delete</button></td>`;
        }
        
        tr.innerHTML = html; tbody.insertBefore(tr, entryRow.nextSibling);
        const payload = getPayload(entryRow, dateVal);
        saveToDoctype(payload, (docName)=>{ tr.setAttribute('data-doc', docName || ''); });
        clearEntryRow(entryRow);
        tr.querySelector('.delete-btn').addEventListener('click', ()=>{ const dn = tr.getAttribute('data-doc'); const dt = getDoctypeName(); if(dn){ frappe.call({ method:'frappe.client.delete', args:{ doctype: dt, name: dn }, callback: function(){ tr.remove(); }, error: function(){ tr.remove(); } }); } else { tr.remove(); } });
    }

    function clearEntryRow(row){ 
        const today = new Date().toISOString().split('T')[0]; 
        row.querySelector('.date-picker').value = today; 
        row.querySelector('.notes').value=''; 
        
        if(currentTab === 'makeup-chemicals') {
            row.querySelector('.sodium').value='';
            row.querySelector('.calcium').value='';
            row.querySelector('.sodium-value').textContent='0.00';
            row.querySelector('.calcium-value').textContent='0.00';
            row.querySelector('.sodium-co2').textContent='CO2: 0.00';
            row.querySelector('.calcium-co2').textContent='CO2: 0.00';
        } else {
            row.querySelector('.calcium-fgd').value='';
            row.querySelector('.dolomite').value='';
            row.querySelector('.calcium-fgd-value').textContent='0.00';
            row.querySelector('.dolomite-value').textContent='0.00';
            row.querySelector('.calcium-fgd-co2').textContent='CO2: 0.00';
            row.querySelector('.dolomite-co2').textContent='CO2: 0.00';
        }
        
        row.querySelector('.total-co2').textContent='Total: 0.00';
    }
    
    function val(scope, sel, def='-'){ 
        const el = scope.querySelector(sel); 
        if(!el) return def; 
        if(el.tagName==='SELECT') return el.value||def; 
        if(el.tagName==='INPUT') return el.type==='number'? (parseFloat(el.value)||0).toString(): (el.value||def); 
        return el.value||def; 
    }
    
    function getDoctypeName(){ return 'Direct Make-up Chemical Emissions'; }
    
    function getPayload(row, dateVal){ 
        let payload = { 
            date: dateVal, 
            form_type: currentTab === 'makeup-chemicals' ? 'Make-up Chemicals' : 'FGD Systems', 
            notes: val(row,'.notes') || '',
            total_co2_emissions: parseFloat(row.querySelector('.total-co2').textContent.replace('Total: ', '')) || 0
        }; 
        
        if(currentTab === 'makeup-chemicals') { 
            // For Make-up Chemicals tab
            payload.sodium_carbonate_amount = parseFloat(val(row,'.sodium')) || 0;
            payload.sodium_carbonate_co2 = parseFloat(row.querySelector('.sodium-co2').textContent.replace('CO2: ', '')) || 0;
            payload.calcium_carbonate_amount = parseFloat(val(row,'.calcium')) || 0;
            payload.calcium_carbonate_co2 = parseFloat(row.querySelector('.calcium-co2').textContent.replace('CO2: ', '')) || 0;
            payload.dolomite_amount = 0;
            payload.dolomite_co2 = 0;
        } else { 
            // For FGD Systems tab
            payload.sodium_carbonate_amount = 0;
            payload.sodium_carbonate_co2 = 0;
            payload.calcium_carbonate_amount = parseFloat(val(row,'.calcium-fgd')) || 0;
            payload.calcium_carbonate_co2 = parseFloat(row.querySelector('.calcium-fgd-co2').textContent.replace('CO2: ', '')) || 0;
            payload.dolomite_amount = parseFloat(val(row,'.dolomite')) || 0;
            payload.dolomite_co2 = parseFloat(row.querySelector('.dolomite-co2').textContent.replace('CO2: ', '')) || 0;
        } 
        
        return payload; 
    }

    async function saveToDoctype(data, callback){ 
        const dt = getDoctypeName(); 
        
        // Try to save directly first
        saveRecord(data, callback);
    }
    
    function saveRecord(data, callback) {
        const dt = getDoctypeName();
        
        // Save directly to the new DocType structure
        const doc = { doctype: dt, ...data };
        frappe.call({ 
            method:'frappe.client.insert', 
            args:{ doc }, 
            callback: function(saveR){ 
                if(saveR.message && saveR.message.name) {
                    if(callback) callback(saveR.message.name);
                } else {
                    console.log('Record saved successfully');
                    if(callback) callback('saved');
                }
            }, 
            error: function(saveErr){ 
                console.log('Error saving record:', saveErr);
                saveToLocalStorage(data, callback);
            } 
        });
    }
    
    
    function saveToLocalStorage(data, callback) {
        console.log('Saving to localStorage as fallback...');
        const key = `makeup_emission_${Date.now()}`;
        localStorage.setItem(key, JSON.stringify(data));
        if(callback) callback('local_saved');
    }
    
    
    function loadExisting(){
        // Load existing records from the DocType
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Direct Make-up Chemical Emissions',
                fields: ['name', 'date', 'form_type', 'sodium_carbonate_amount', 'sodium_carbonate_co2', 'calcium_carbonate_amount', 'calcium_carbonate_co2', 'dolomite_amount', 'dolomite_co2', 'total_co2_emissions', 'notes'],
                order_by: 'creation desc',
                limit: 50
            },
            callback: function(r) {
                if(r.message && r.message.length > 0) {
                    console.log('Loaded existing records:', r.message.length);
                    displayExistingRecords(r.message);
                } else {
                    console.log('No existing records found');
                }
            },
            error: function(err) {
                console.log('Error loading existing records:', err);
            }
        });
    }
    
    function displayExistingRecords(records) {
        // Clear existing display rows
        const makeupTableBody = scopeRoot.querySelector('#makeupTableBody');
        const fgdTableBody = scopeRoot.querySelector('#fgdTableBody');
        
        if(makeupTableBody) {
            const existingRows = makeupTableBody.querySelectorAll('.data-display-row');
            existingRows.forEach(row => row.remove());
        }
        
        if(fgdTableBody) {
            const existingRows = fgdTableBody.querySelectorAll('.data-display-row');
            existingRows.forEach(row => row.remove());
        }
        
        // Add records to appropriate tables
        records.forEach((record, index) => {
            const tableBody = record.form_type === 'Make-up Chemicals' ? makeupTableBody : fgdTableBody;
            if(!tableBody) return;
            
            const tr = document.createElement('tr');
            tr.className = 'data-display-row';
            tr.setAttribute('data-doc', record.name);
            
            let html = '';
            if(record.form_type === 'Make-up Chemicals') {
                html = `
                    <td>${index + 1}</td>
                    <td>${formatDate(record.date)}</td>
                    <td>
                        <div>Input: ${record.sodium_carbonate_amount || 0}</div>
                        <div>CO2: ${record.sodium_carbonate_co2 || 0}</div>
                    </td>
                    <td>
                        <div>Input: ${record.calcium_carbonate_amount || 0}</div>
                        <div>CO2: ${record.calcium_carbonate_co2 || 0}</div>
                    </td>
                    <td><span class="calculated-value">${record.total_co2_emissions || 0}</span></td>
                    <td>${record.notes || ''}</td>
                    <td><button class="btn btn-danger delete-btn">Delete</button></td>`;
            } else {
                html = `
                    <td>${index + 1}</td>
                    <td>${formatDate(record.date)}</td>
                    <td>
                        <div>Input: ${record.calcium_carbonate_amount || 0}</div>
                        <div>CO2: ${record.calcium_carbonate_co2 || 0}</div>
                    </td>
                    <td>
                        <div>Input: ${record.dolomite_amount || 0}</div>
                        <div>CO2: ${record.dolomite_co2 || 0}</div>
                    </td>
                    <td><span class="calculated-value">${record.total_co2_emissions || 0}</span></td>
                    <td>${record.notes || ''}</td>
                    <td><button class="btn btn-danger delete-btn">Delete</button></td>`;
            }
            
            tr.innerHTML = html;
            
            // Insert after the entry row
            const entryRow = tableBody.querySelector('.data-entry-row');
            if(entryRow) {
                tableBody.insertBefore(tr, entryRow.nextSibling);
            } else {
                tableBody.appendChild(tr);
            }
            
            // Add delete functionality
            tr.querySelector('.delete-btn').addEventListener('click', () => {
                const docName = tr.getAttribute('data-doc');
                if(docName) {
                    frappe.call({
                        method: 'frappe.client.delete',
                        args: { doctype: 'Direct Make-up Chemical Emissions', name: docName },
                        callback: function() {
                            tr.remove();
                            console.log('Record deleted successfully');
                        },
                        error: function(err) {
                            console.log('Error deleting record:', err);
                            tr.remove(); // Remove from UI anyway
                        }
                    });
                } else {
                    tr.remove();
                }
            });
        });
        
        // Update current index
        currentIndex = records.length + 1;
    }
    
    function setupRefreshButton() {
        const refreshBtn = scopeRoot.querySelector('#refresh-btn');
        if(refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('Refreshing records...');
                loadExisting();
            });
        }
    }
    
    function formatDate(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }
    
    function createDocTypesIfNeeded(){
        // Check if chemical data exists and load it
        frappe.call({
            method: 'frappe.client.get_list',
            args: { 
                doctype: 'Make-up Chemical Defaults',
                fields: ['chemical_name', 'emission_factor_kg_co2_per_kg'],
                filters: { 'is_active': 1 }
            },
            callback: function(r) {
                if(r.message && r.message.length > 0) {
                    console.log('Chemical data loaded successfully');
                    CHEMICAL_DEFAULTS = r.message;
                    // Ensure all required chemicals exist
                    ensureRequiredChemicals();
                } else {
                    console.log('No chemical data found, seeding...');
                    seedChemicalData();
                }
            },
            error: function(err) {
                console.log('Error loading chemical data:', err);
                // Try to seed the data anyway
                seedChemicalData();
            }
        });
    }
    
    function ensureRequiredChemicals() {
        const requiredChemicals = [
            { name: 'Sodium Carbonate', factor: 0.415 },
            { name: 'Calcium Carbonate', factor: 0.440 },
            { name: 'Dolomite', factor: 0.477 }
        ];
        
        requiredChemicals.forEach(chemical => {
            const exists = CHEMICAL_DEFAULTS.some(c => c.chemical_name === chemical.name);
            if (!exists) {
                console.log(`Creating missing chemical: ${chemical.name}`);
                createChemical(chemical.name, chemical.factor);
            }
        });
    }
    
    function createDocTypes(){
        // Create Make-up Chemical Defaults DocType
        const defaultsDoc = {
            doctype: 'DocType',
            name: 'Make-up Chemical Defaults',
            module: 'Climoro Onboarding',
            custom: 1,
            editable_grid: 1,
            track_changes: 1,
            fields: [
                { fieldname: 'chemical_name', label: 'Chemical Name', fieldtype: 'Data', reqd: 1, in_list_view: 1, unique: 1 },
                { fieldname: 'emission_factor_kg_co2_per_kg', label: 'Emission Factor (kg CO2/kg chemical)', fieldtype: 'Float', reqd: 1, in_list_view: 1 },
                { fieldname: 'is_active', label: 'Active', fieldtype: 'Check', default: 1, in_list_view: 1 }
            ],
            permissions: [
                { role: 'System Manager', read: 1, write: 1, create: 1, delete: 1, report: 1, export: 1, share: 1, print: 1, email: 1 },
                { role: 'All', read: 1, write: 1, create: 1 }
            ]
        };
        
        frappe.call({
            method: 'frappe.client.insert',
            args: { doc: defaultsDoc },
            callback: function(r) {
                console.log('Created Make-up Chemical Defaults DocType');
                seedChemicalData();
            },
            error: function(err) {
                console.log('Error creating DocType:', err);
            }
        });
    }
    
    function seedChemicalData(){
        const chemicals = [
            { chemical_name: 'Sodium Carbonate', emission_factor_kg_co2_per_kg: 0.415, is_active: 1 },
            { chemical_name: 'Calcium Carbonate', emission_factor_kg_co2_per_kg: 0.440, is_active: 1 },
            { chemical_name: 'Dolomite', emission_factor_kg_co2_per_kg: 0.477, is_active: 1 }
        ];
        
        chemicals.forEach(chemical => {
            // Check if chemical already exists
            frappe.call({
                method: 'frappe.client.get_list',
                args: { 
                    doctype: 'Make-up Chemical Defaults',
                    fields: ['name'],
                    filters: { 'chemical_name': chemical.chemical_name }
                },
                callback: function(r) {
                    if(r.message && r.message.length > 0) {
                        console.log(`${chemical.chemical_name} already exists`);
                        // Update the emission factor if needed
                        frappe.call({
                            method: 'frappe.client.set_value',
                            args: {
                                doctype: 'Make-up Chemical Defaults',
                                name: r.message[0].name,
                                fieldname: 'emission_factor_kg_co2_per_kg',
                                value: chemical.emission_factor_kg_co2_per_kg
                            },
                            callback: function(updateR) {
                                console.log(`Updated ${chemical.chemical_name} emission factor`);
                            }
                        });
                    } else {
                        // Create new chemical
                        frappe.call({
                            method: 'frappe.client.insert',
                            args: { doc: { doctype: 'Make-up Chemical Defaults', ...chemical } },
                            callback: function(createR) {
                                console.log(`Created ${chemical.chemical_name}`);
                            },
                            error: function(createErr) {
                                console.log(`Error creating ${chemical.chemical_name}:`, createErr);
                            }
                        });
                    }
                },
                error: function(err) {
                    console.log(`Error checking ${chemical.chemical_name}:`, err);
                }
            });
        });
    }
    
    function attachGlobalKeyBlockers(){ 
        const container = scopeRoot.querySelector('.makeup-chemicals-container'); 
        if(!container) return; 
        const handler = (e) => { 
            if(!container.contains(e.target)) return; 
            e.stopPropagation(); 
            if((e.ctrlKey || e.metaKey) || e.key === '/' || e.key === '?'){ e.preventDefault(); } 
        }; 
        ['keydown','keypress','keyup'].forEach(ev => { document.addEventListener(ev, handler, true); }); 
    }

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', ()=> init()); } else { init(); }
})();
