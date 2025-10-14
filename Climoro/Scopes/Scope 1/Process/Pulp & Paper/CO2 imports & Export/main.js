(function(){
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    let currentIndex = 1;
    let currentTab = 'co2-imports';

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
        const tableId = currentTab === 'co2-imports' ? 'importsTableBody' : 'exportsTableBody';
        const tbody = scopeRoot.querySelector(`#${tableId}`); 
        if(!tbody) {
            console.log('Table body not found:', tableId);
            return;
        }
        const existing = tbody.querySelector('.data-entry-row'); if(existing) existing.remove();
        const row = document.createElement('tr'); row.className='data-entry-row'; const today = new Date().toISOString().split('T')[0];
        
        console.log('Creating entry row for tab:', currentTab);
        
        if(currentTab === 'co2-imports') {
            row.innerHTML = `
                <td>${currentIndex}</td>
                <td><input type="date" class="form-control date-picker" data-frappe-ignore="true" value="${today}"></td>
                <td><input type="number" class="form-control amount-input" step="0.01" min="0" placeholder="Enter amount"></td>
                <td><input type="text" class="form-control notes" placeholder="Enter notes"></td>
                <td>
                    <button class="btn btn-success save-btn">Save</button>
                    <button class="btn btn-danger" onclick="clearEntryRow()">Clear</button>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td>${currentIndex}</td>
                <td><input type="date" class="form-control date-picker" data-frappe-ignore="true" value="${today}"></td>
                <td><input type="number" class="form-control amount-input total-co2-generated" step="0.01" min="0" placeholder="Enter amount"></td>
                <td><input type="number" class="form-control amount-input fraction-sent" step="0.01" min="0" max="1" placeholder="0.0 - 1.0"></td>
                <td><span class="calculated-value fossil-co2-exports">0</span></td>
                <td><input type="text" class="form-control notes" placeholder="Enter notes"></td>
                <td>
                    <button class="btn btn-success save-btn">Save</button>
                    <button class="btn btn-danger" onclick="clearEntryRow()">Clear</button>
                </td>
            `;
        }
        
        console.log('Row HTML created:', row.innerHTML);
        // Insert at the top of the table (first child)
        const firstChild = tbody.firstChild;
        if(firstChild) {
            tbody.insertBefore(row, firstChild);
        } else {
            tbody.appendChild(row);
        }
        setupRowEvents(row);
    }

    function setupRowEvents(row){
        const calc = () => {
            if(currentTab === 'co2-exports') {
                // Get the input values using specific selectors
                const totalCo2Generated = parseFloat(val(row, '.total-co2-generated')) || 0;
                const fractionSentToPcc = parseFloat(val(row, '.fraction-sent')) || 0;
                
                // Calculate fossil CO2 exports
                const fossilCo2Exports = totalCo2Generated * fractionSentToPcc;
                
                // Update display value
                const calculatedValue = row.querySelector('.fossil-co2-exports');
                if(calculatedValue) {
                    calculatedValue.textContent = (isFinite(fossilCo2Exports) ? fossilCo2Exports : 0).toFixed(2);
                    console.log(`Calculated: ${totalCo2Generated} × ${fractionSentToPcc} = ${fossilCo2Exports}`);
                }
            }
        };

        // Add event listeners to all amount inputs
        const amountInputs = row.querySelectorAll('.amount-input');
        amountInputs.forEach(input => {
            input.addEventListener('input', calc);
            input.addEventListener('change', calc);
        });
        
        // Add save button event listener
        const saveBtn = row.querySelector('.save-btn');
        if(saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                addDisplayRow(row);
            });
        }
        
        // Run calculation once on setup
        calc();
    }

    function addDisplayRow(entryRow){
        const tbody = entryRow.parentElement; 
        const tr = document.createElement('tr'); 
        tr.className='data-display-row';
        const dateVal = entryRow.querySelector('.date-picker').value;
        
        let html = '';
        if(currentTab === 'co2-imports') {
            html = `
                <td>${currentIndex}</td>
                <td>${formatDate(dateVal)}</td>
                <td><span class="calculated-value">${val(entryRow,'.amount-input')}</span></td>
                <td>${val(entryRow,'.notes')}</td>
                <td><button class="btn btn-danger delete-btn">Delete</button></td>`;
        } else {
            html = `
                <td>${currentIndex}</td>
                <td>${formatDate(dateVal)}</td>
                <td><span class="calculated-value">${val(entryRow,'.total-co2-generated')}</span></td>
                <td><span class="calculated-value">${val(entryRow,'.fraction-sent')}</span></td>
                <td><span class="calculated-value">${entryRow.querySelector('.fossil-co2-exports').textContent}</span></td>
                <td>${val(entryRow,'.notes')}</td>
                <td><button class="btn btn-danger delete-btn">Delete</button></td>`;
        }
        
        tr.innerHTML = html; 
        // Insert after the entry row (entry row should be at top)
        tbody.insertBefore(tr, entryRow.nextSibling);
        const payload = getPayload(entryRow, dateVal);
        saveToDoctype(payload, (docName)=>{ tr.setAttribute('data-doc', docName || ''); });
        clearEntryRow(entryRow);
        tr.querySelector('.delete-btn').addEventListener('click', ()=>{ 
            const dn = tr.getAttribute('data-doc'); 
            if(dn){ 
                frappe.call({ 
                    method:'frappe.client.delete', 
                    args:{ doctype: 'CO2 Imports and Exports', name: dn }, 
                    callback: function(){ tr.remove(); }, 
                    error: function(){ tr.remove(); } 
                }); 
            } else { 
                tr.remove(); 
            } 
        });
    }

    function clearEntryRow(){
        const row = scopeRoot.querySelector('.data-entry-row');
        if(!row) return;
        
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            if(input.type === 'date') {
                input.value = new Date().toISOString().split('T')[0];
            } else {
                input.value = '';
            }
        });
        
        const calculatedValue = row.querySelector('.calculated-value');
        if(calculatedValue) calculatedValue.textContent = '0';
    }

    function val(scope, sel, def='-'){ 
        const el = scope.querySelector(sel); 
        if(!el) return def; 
        if(el.tagName==='SELECT') return el.value||def; 
        if(el.tagName==='INPUT') return el.type==='number'? (parseFloat(el.value)||0).toString(): (el.value||def); 
        return el.value||def; 
    }

    function getPayload(row, dateVal){ 
        let payload = { 
            date: dateVal, 
            form_type: currentTab === 'co2-imports' ? 'CO2 Imports' : 'CO2 Exports to PCC', 
            notes: val(row,'.notes') || ''
        }; 
        
        if(currentTab === 'co2-imports') { 
            payload.total_co2_imported = parseFloat(val(row,'.amount-input')) || 0;
            payload.total_co2_generated = 0;
            payload.fraction_sent_to_pcc = 0;
            payload.fossil_co2_exports = 0;
            payload.biomass_co2_approximation = 0;
        } else { 
            payload.total_co2_imported = 0;
            payload.total_co2_generated = parseFloat(val(row,'.total-co2-generated')) || 0;
            payload.fraction_sent_to_pcc = parseFloat(val(row,'.fraction-sent')) || 0;
            payload.fossil_co2_exports = parseFloat(row.querySelector('.fossil-co2-exports').textContent) || 0;
            payload.biomass_co2_approximation = 0;
        }
        
        return payload;
    }

    function saveToDoctype(payload, callback){
        frappe.call({
            method: 'frappe.client.insert',
            args: {
                doc: {
                    doctype: 'CO2 Imports and Exports',
                    ...payload
                }
            },
            callback: function(r) {
                if(r.message) {
                    console.log('Record saved successfully:', r.message);
                    currentIndex++;
                    if(callback) callback(r.message.name);
                }
            },
            error: function(err) {
                console.log('Error saving record:', err);
                alert('Error saving record. Please try again.');
            }
        });
    }

    function saveRecord(){
        const payload = getPayload();
        if(payload) {
            saveToDoctype(payload);
        }
    }

    function loadExisting(){
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'CO2 Imports and Exports',
                fields: ['name', 'date', 'form_type', 'total_co2_imported', 'total_co2_generated', 'fraction_sent_to_pcc', 'fossil_co2_exports', 'biomass_co2_approximation', 'notes'],
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
        const importsTableBody = scopeRoot.querySelector('#importsTableBody');
        const exportsTableBody = scopeRoot.querySelector('#exportsTableBody');

        if(importsTableBody) {
            const existingRows = importsTableBody.querySelectorAll('.data-display-row');
            existingRows.forEach(row => row.remove());
        }

        if(exportsTableBody) {
            const existingRows = exportsTableBody.querySelectorAll('.data-display-row');
            existingRows.forEach(row => row.remove());
        }

        // Add records to appropriate tables
        records.forEach((record, index) => {
            addExistingRecord(record, index);
        });

        // Update current index
        currentIndex = records.length + 1;
    }

    function addExistingRecord(record, index) {
        const tableId = record.form_type === 'CO2 Imports' ? 'importsTableBody' : 'exportsTableBody';
        const tbody = scopeRoot.querySelector(`#${tableId}`);
        if(!tbody) return;
        
        const tr = document.createElement('tr');
        tr.className = 'data-display-row';
        tr.setAttribute('data-doc', record.name);
        
        if(record.form_type === 'CO2 Imports') {
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${formatDate(record.date)}</td>
                <td><span class="calculated-value">${record.total_co2_imported || 0}</span></td>
                <td>${record.notes || ''}</td>
                <td><button class="btn btn-danger delete-btn">Delete</button></td>
            `;
        } else {
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${formatDate(record.date)}</td>
                <td><span class="calculated-value">${record.total_co2_generated || 0}</span></td>
                <td><span class="calculated-value">${record.fraction_sent_to_pcc || 0}</span></td>
                <td><span class="calculated-value">${record.fossil_co2_exports || 0}</span></td>
                <td>${record.notes || ''}</td>
                <td><button class="btn btn-danger delete-btn">Delete</button></td>
            `;
        }
        
        // Insert after the entry row (entry row should be at top)
        const entryRow = tbody.querySelector('.data-entry-row');
        if(entryRow) {
            tbody.insertBefore(tr, entryRow.nextSibling);
        } else {
            // If no entry row, add at the beginning
            const firstChild = tbody.firstChild;
            if(firstChild) {
                tbody.insertBefore(tr, firstChild);
            } else {
                tbody.appendChild(tr);
            }
        }
        
        // Add delete functionality
        tr.querySelector('.delete-btn').addEventListener('click', () => {
            const docName = tr.getAttribute('data-doc');
            if(docName) {
                frappe.call({
                    method: 'frappe.client.delete',
                    args: { doctype: 'CO2 Imports and Exports', name: docName },
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
    }

    function setupRefreshButton() {
        const refreshBtn = scopeRoot.querySelector('#refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadExisting();
            });
        }
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    function attachGlobalKeyBlockers(){
        document.addEventListener('keydown', function(e) {
            if(e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                return false;
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Make functions globally available
    window.saveRecord = saveRecord;
    window.clearEntryRow = clearEntryRow;
})();