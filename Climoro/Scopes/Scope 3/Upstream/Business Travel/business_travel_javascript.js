(function(){
    let currentRowIds = { 'fuel-based': 1, 'distance-based': 1, 'spend-based': 1 };
    let isInitialized = false;
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    let selectedCompany = null;
    let selectedUnit = null;
    let selectedDateFrom = null;
    let selectedDateTo = null;
    let isFilterVisible = false;
    const metaCache = {};

    async function hasField(doctype, fieldname){
        try {
            if (!metaCache[doctype]){
                const r = await frappe.call({ method: 'frappe.client.get', args: { doctype: 'DocType', name: doctype } });
                metaCache[doctype] = r.message || {};
            }
            const fields = metaCache[doctype].fields || [];
            return fields.some(f=> f.fieldname === fieldname);
        } catch(e){ return false; }
    }

    function init(){ if(isInitialized) return; buildFilterBar(async ()=>{ await initializeFiltersFromContext(); }); setupTabs(); createEntryRow('fuel-based'); createEntryRow('distance-based'); createEntryRow('spend-based'); attachGlobalKeyBlockers(); loadExisting(); isInitialized = true; }

    function setupTabs(){
        const container = scopeRoot.querySelector('.business-travel-container'); if(!container) return;
        const buttons = container.querySelectorAll('.tab-btn');
        const tabs = { 'fuel-based': container.querySelector('#fuel-based-tab'), 'distance-based': container.querySelector('#distance-based-tab'), 'spend-based': container.querySelector('#spend-based-tab') };
        buttons.forEach(btn=>{ btn.addEventListener('click', ()=>{ buttons.forEach(b=>b.classList.remove('active')); btn.classList.add('active'); Object.values(tabs).forEach(el=>el.classList.remove('active')); const id = btn.dataset.tab; if(tabs[id]) tabs[id].classList.add('active'); }); });
    }

    function attachGlobalKeyBlockers(){
        const container = scopeRoot.querySelector('.business-travel-container'); if(!container) return;
        const handler = (e)=>{ if(!container.contains(e.target)) return; e.stopPropagation(); if((e.ctrlKey||e.metaKey) || e.key==='/' || e.key==='?'){ e.preventDefault(); } };
        ['keydown','keypress','keyup'].forEach(ev=>document.addEventListener(ev, handler, true));
    }

    function getBodyId(tab){ return { 'fuel-based':'fuelBasedBTTableBody', 'distance-based':'distanceBasedBTTableBody', 'spend-based':'spendBasedBTTableBody' }[tab]; }

    function createEntryRow(tab){
        const tbody = scopeRoot.querySelector('#' + getBodyId(tab)); if(!tbody) return; const existing = tbody.querySelector('.data-entry-row'); if(existing) existing.remove();
        const row = document.createElement('tr'); row.className='data-entry-row'; const today = new Date().toISOString().split('T')[0];
        if(tab==='fuel-based'){
            row.innerHTML = `
                <td>${currentRowIds[tab]}</td>
                <td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td>
                <td><input type="text" class="form-control desc isolated-input" data-frappe-ignore="true" placeholder="e.g., Rental Car Fuel"></td>
                <td><input type="text" class="form-control fuel-type isolated-input" data-frappe-ignore="true" placeholder="e.g., Gasoline"></td>
                <td><input type="number" class="form-control fuel-consumed isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="text" class="form-control unit isolated-input" data-frappe-ignore="true" value="litres"></td>
                <td><input type="number" class="form-control ef isolated-input" data-frappe-ignore="true" step="0.0001" placeholder="0.0000"></td>
                <td><input type="text" class="form-control ef-unit isolated-input" data-frappe-ignore="true" value="kg CO2e/litre"></td>
                <td><span class="total-emissions">0.00</span></td>
                <td><button class="btn btn-success save-btn">Add</button></td>`;
        } else if(tab==='distance-based'){
            row.innerHTML = `
                <td>${currentRowIds[tab]}</td>
                <td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td>
                <td><input type="text" class="form-control desc isolated-input" data-frappe-ignore="true" placeholder="e.g., Flight LHR-JFK"></td>
                <td>
                    <select class="form-control mode isolated-input" data-frappe-ignore="true">
                        <option value="Air">Air</option>
                        <option value="Rail">Rail</option>
                        <option value="Road">Road</option>
                    </select>
                </td>
                <td><input type="number" class="form-control distance isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="text" class="form-control unit isolated-input" data-frappe-ignore="true" value="passenger-km"></td>
                <td><input type="number" class="form-control ef isolated-input" data-frappe-ignore="true" step="0.0001" placeholder="0.0000"></td>
                <td><input type="text" class="form-control ef-unit isolated-input" data-frappe-ignore="true" value="kg CO2e/p-km"></td>
                <td><span class="total-emissions">0.00</span></td>
                <td><button class="btn btn-success save-btn">Add</button></td>`;
        } else {
            row.innerHTML = `
                <td>${currentRowIds[tab]}</td>
                <td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td>
                <td><input type="text" class="form-control desc isolated-input" data-frappe-ignore="true" placeholder="e.g., Air Travel Q2"></td>
                <td><input type="number" class="form-control amount isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="text" class="form-control currency isolated-input" data-frappe-ignore="true" value="$"></td>
                <td><input type="number" class="form-control eeio isolated-input" data-frappe-ignore="true" step="0.0001" placeholder="0.0000"></td>
                <td><input type="text" class="form-control ef-unit isolated-input" data-frappe-ignore="true" value="kg CO2e/$"></td>
                <td><span class="total-emissions">0.00</span></td>
                <td><button class="btn btn-success save-btn">Add</button></td>`;
        }
        tbody.appendChild(row); isolateInputs(row); setupRowEvents(row, tab);
    }

    function setupRowEvents(row, tab){
        const calc = ()=>{
            let total = 0;
            if(tab==='fuel-based'){
                const q = parseFloat(row.querySelector('.fuel-consumed').value)||0; const ef = parseFloat(row.querySelector('.ef').value)||0; total = q*ef;
            } else if(tab==='distance-based'){
                const d = parseFloat(row.querySelector('.distance').value)||0; const ef = parseFloat(row.querySelector('.ef').value)||0; total = d*ef;
            } else {
                const a = parseFloat(row.querySelector('.amount').value)||0; const ef = parseFloat(row.querySelector('.eeio').value)||0; total = a*ef;
            }
            row.querySelector('.total-emissions').textContent = (isFinite(total)?total:0).toFixed(2);
        };
        row.querySelectorAll('input,select').forEach(el=>{ el.addEventListener('input', calc); el.addEventListener('change', calc); ['keydown','keypress','keyup'].forEach(ev=>el.addEventListener(ev,(e)=>{ e.stopPropagation(); }, true)); });
        const saveBtn = row.querySelector('.save-btn'); if(saveBtn){ saveBtn.addEventListener('click', (e)=>{ e.preventDefault(); addDisplayRow(row, tab); }); }
    }

    function addDisplayRow(entryRow, tab){
        const tbody = entryRow.parentElement; const display = document.createElement('tr'); display.className='data-display-row';
        const dateVal = entryRow.querySelector('input[type="date"]').value; let html = `<td>${currentRowIds[tab]}</td><td>${formatDate(dateVal)}</td>`;
        if(tab==='fuel-based'){
            html += `<td>${val(entryRow,'.desc')}</td><td>${val(entryRow,'.fuel-type')}</td><td>${val(entryRow,'.fuel-consumed')}</td><td>${val(entryRow,'.unit','litres')}</td><td>${val(entryRow,'.ef')}</td><td>${val(entryRow,'.ef-unit')}</td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        } else if(tab==='distance-based'){
            html += `<td>${val(entryRow,'.desc')}</td><td>${entryRow.querySelector('.mode').value}</td><td>${val(entryRow,'.distance')}</td><td>${val(entryRow,'.unit','passenger-km')}</td><td>${val(entryRow,'.ef')}</td><td>${val(entryRow,'.ef-unit')}</td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        } else {
            html += `<td>${val(entryRow,'.desc')}</td><td>${val(entryRow,'.amount')}</td><td>${val(entryRow,'.currency','$')}</td><td>${val(entryRow,'.eeio')}</td><td>${val(entryRow,'.ef-unit')}</td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        }
        html += `<td><button class="btn btn-danger delete-btn">Delete</button></td>`; display.innerHTML = html; tbody.insertBefore(display, entryRow.nextSibling);
        // Persistence
        const payload = getPayload(entryRow, tab, dateVal);
        saveToDoctype(payload, tab, (docName)=>{ display.setAttribute('data-doc', docName || ''); });
        bumpIndex(entryRow, tab);
        display.querySelector('.delete-btn').addEventListener('click', ()=>{ const dn = display.getAttribute('data-doc'); const dt = getDoctypeName(tab); if(dn){ frappe.call({ method: 'frappe.client.delete', args: { doctype: dt, name: dn }, callback: function(){ display.remove(); }, error: function(){ display.remove(); } }); } else { display.remove(); } });
        clearEntryRow(entryRow);
    }

    function val(scope, sel, def='-'){ const el = scope.querySelector(sel); if(!el) return def; if(el.tagName==='INPUT') return el.type==='number'? (parseFloat(el.value)||0).toString(): (el.value||def); return el.value||def; }

    function bumpIndex(entryRow, tab){ currentRowIds[tab]++; entryRow.querySelector('td:first-child').textContent = currentRowIds[tab]; }
    function isolateInputs(scope){ scope.querySelectorAll('input,select,textarea').forEach(inp=>{ inp.setAttribute('data-frappe-ignore','true'); inp.classList.add('isolated-input'); }); }
    function clearEntryRow(row){ row.querySelectorAll('input').forEach(i=>{ if(i.type==='date'){ i.value = new Date().toISOString().split('T')[0]; } else { i.value=''; } }); row.querySelector('.total-emissions').textContent='0.00'; }
    // Helper to apply client-side date filtering
    function applyDateFilter(records) {
        if (!selectedDateFrom && !selectedDateTo) {
            return records;
        }
        
        console.log('Business Travel: Applying client-side date filtering...');
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

    function formatDate(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }

    function getPayload(row, tab, dateVal){
        if(tab==='fuel-based') return { date: dateVal, description: val(row,'.desc'), fuel_type: val(row,'.fuel-type'), fuel_consumed: parseFloat(val(row,'.fuel-consumed'))||0, unit: val(row,'.unit','litres'), emission_factor: parseFloat(val(row,'.ef'))||0, ef_unit: val(row,'.ef-unit','kg CO2e/litre'), total_emissions: parseFloat(row.querySelector('.total-emissions').textContent)||0 };
        if(tab==='distance-based') return { date: dateVal, description: val(row,'.desc'), transport_mode: row.querySelector('.mode').value, distance_traveled: parseFloat(val(row,'.distance'))||0, unit: val(row,'.unit','passenger-km'), emission_factor: parseFloat(val(row,'.ef'))||0, ef_unit: val(row,'.ef-unit','kg CO2e/p-km'), total_emissions: parseFloat(row.querySelector('.total-emissions').textContent)||0 };
        return { date: dateVal, description: val(row,'.desc'), amount_spent: parseFloat(val(row,'.amount'))||0, currency: val(row,'.currency','$'), eeio_ef: parseFloat(val(row,'.eeio'))||0, ef_unit: val(row,'.ef-unit','kg CO2e/$'), total_emissions: parseFloat(row.querySelector('.total-emissions').textContent)||0 };
    }

    function getDoctypeName(tab){ return { 'fuel-based': 'Business Travel Fuel Based', 'distance-based': 'Business Travel Distance Based', 'spend-based': 'Business Travel Spend Based' }[tab]; }
    function saveToDoctype(data, tab, cb){ const doctypeName = getDoctypeName(tab); (async ()=>{ const ctx = await getUserContext(); const doc = { doctype: doctypeName, ...data }; try { if (await hasField(doctypeName, 'company')) { doc.company = ctx.is_super ? (selectedCompany || ctx.company || null) : (ctx.company || null); } if (await hasField(doctypeName, 'company_unit')) { const chosenUnit = selectedUnit || (ctx.units && ctx.units.length===1 ? ctx.units[0] : null); if (chosenUnit) doc.company_unit = chosenUnit; } } catch(e){} frappe.call({ method: 'frappe.client.insert', args: { doc }, callback: function(r){ if(cb) cb(r.message && r.message.name); }, error: function(){ if(cb) cb(null); } }); })(); }

    function loadExisting(){ 
        ['fuel-based','distance-based','spend-based'].forEach(async tab=>{ 
            const dt = getDoctypeName(tab); 
            const ctx = await getUserContext(); 
            const filters = {}; 
            if (await hasField(dt, 'company')) { 
                filters.company = ctx.is_super ? (selectedCompany || ctx.company || undefined) : (ctx.company || undefined); 
            } 
            if (await hasField(dt, 'company_unit')) { 
                if (selectedUnit) filters.company_unit = selectedUnit; 
            } 
            frappe.call({ 
                method: 'frappe.client.get_list', 
                args: { 
                    doctype: dt, 
                    fields: ['name', 'date', 'description', 'fuel_type', 'fuel_consumed', 'unit', 'emission_factor', 'ef_unit', 'total_emissions', 'transport_mode', 'distance_traveled', 'amount_spent', 'currency', 'eeio_ef'], 
                    limit_page_length: 100, 
                    filters 
                }, 
                callback: function(r){ 
                    if (r.message && r.message.length > 0) {
                        // Apply client-side date filtering
                        const filteredRecords = applyDateFilter(r.message);
                        console.log(`Business Travel: Original records: ${r.message.length}, Filtered records: ${filteredRecords.length}`);
                        
                        const tbody = scopeRoot.querySelector('#' + getBodyId(tab)); 
                        const entryRow = tbody && tbody.querySelector('.data-entry-row'); 
                        if(!tbody || !entryRow) return; 
                        
                        // Clear existing display rows
                        tbody.querySelectorAll('.data-display-row').forEach(row => row.remove());
                        
                        let index = 1; 
                        const renderDoc = (doc)=>{ 
                            const row = document.createElement('tr'); 
                            row.className='data-display-row'; 
                            row.setAttribute('data-doc', doc.name); 
                            let html = `<td>${index++}</td><td>${formatDate(doc.date)}</td>`; 
                            if(tab==='fuel-based'){ 
                                html += `<td>${doc.description||'-'}</td><td>${doc.fuel_type||'-'}</td><td>${doc.fuel_consumed||'0.00'}</td><td>${doc.unit||'-'}</td><td>${doc.emission_factor||'0.0000'}</td><td>${doc.ef_unit||'-'}</td><td>${doc.total_emissions||'0.00'}</td>`; 
                            } else if(tab==='distance-based'){ 
                                html += `<td>${doc.description||'-'}</td><td>${doc.transport_mode||'-'}</td><td>${doc.distance_traveled||'0.00'}</td><td>${doc.unit||'-'}</td><td>${doc.emission_factor||'0.0000'}</td><td>${doc.ef_unit||'-'}</td><td>${doc.total_emissions||'0.00'}</td>`; 
                            } else { 
                                html += `<td>${doc.description||'-'}</td><td>${doc.amount_spent||'0.00'}</td><td>${doc.currency||'$'}</td><td>${doc.eeio_ef||'0.0000'}</td><td>${doc.ef_unit||'-'}</td><td>${doc.total_emissions||'0.00'}</td>`; 
                            } 
                            html += `<td><button class='btn btn-danger delete-btn'>Delete</button></td>`; 
                            row.innerHTML = html; 
                            tbody.insertBefore(row, entryRow.nextSibling); 
                            const del = row.querySelector('.delete-btn'); 
                            del.addEventListener('click', ()=>{ 
                                frappe.call({ 
                                    method: 'frappe.client.delete', 
                                    args: { doctype: dt, name: doc.name }, 
                                    callback: function(){ row.remove(); }, 
                                    error: function(){ row.remove(); } 
                                }); 
                            }); 
                        };
                        
                        // Render all filtered records
                        filteredRecords.forEach(doc => renderDoc(doc));
                        
                        currentRowIds[tab] = (filteredRecords.length||0) + 1; 
                        if(entryRow) entryRow.querySelector('td:first-child').textContent = currentRowIds[tab]; 
                    }
                } 
            }); 
        }); 
    }

    // ============ Company/Unit Filter Helpers ============
    async function getUserContext(){ try { const r = await frappe.call({ method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' }); return r.message || { company: null, units: [], is_super: false }; } catch(e){ return { company: null, units: [], is_super: false }; } }
    function buildFilterBar(done){ 
        const container = scopeRoot.querySelector('.business-travel-container'); 
        if(!container){ done&&done(); return; } 
        if(container.querySelector('.filter-bar')){ done&&done(); return; } 
        const bar = document.createElement('div'); 
        bar.className='filter-bar'; 
        (async ()=>{ 
            try{ 
                const ctx = await getUserContext(); 
                const roles = (frappe && frappe.get_roles)? frappe.get_roles(): []; 
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
        const header = scopeRoot.querySelector('.page-header') || scopeRoot.querySelector('.header-section'); 
        if (header) header.insertAdjacentElement('afterend', bar); else container.prepend(bar); 
        
        // Apply button event listener
        bar.querySelector('.filter-apply-btn')?.addEventListener('click', ()=>{
            const csel = bar.querySelector('.filter-company-select');
            const usel = bar.querySelector('.filter-unit-select');
            const fromDate = bar.querySelector('.date-from-input');
            const toDate = bar.querySelector('.date-to-input');
            
            selectedCompany = csel.value || null;
            selectedUnit = usel.value || null;
            selectedDateFrom = fromDate.value || null;
            selectedDateTo = toDate.value || null;
            
            console.log('Business Travel Filter values:', {
                company: selectedCompany,
                unit: selectedUnit,
                dateFrom: selectedDateFrom,
                dateTo: selectedDateTo
            });
            
            ['fuel-based','distance-based','spend-based'].forEach(tab=>{ 
                const tbody = scopeRoot.querySelector('#' + getBodyId(tab)); 
                tbody?.querySelectorAll('.data-display-row').forEach(r=>r.remove()); 
            }); 
            loadExisting();
        });
        
        // Clear dates button event listener
        bar.querySelector('.filter-clear-btn')?.addEventListener('click', ()=>{
            const fromDate = bar.querySelector('.date-from-input');
            const toDate = bar.querySelector('.date-to-input');
            
            fromDate.value = '';
            toDate.value = '';
            selectedDateFrom = null;
            selectedDateTo = null;
            
            console.log('Business Travel Date filters cleared');
            ['fuel-based','distance-based','spend-based'].forEach(tab=>{ 
                const tbody = scopeRoot.querySelector('#' + getBodyId(tab)); 
                tbody?.querySelectorAll('.data-display-row').forEach(r=>r.remove()); 
            }); 
            loadExisting();
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
    async function initializeFiltersFromContext(){ const ctx = await getUserContext(); const bar = scopeRoot.querySelector('.filter-bar'); if(!bar) return; const companySelect = bar.querySelector('.filter-company-select'); const unitSelect = bar.querySelector('.filter-unit-select'); companySelect.innerHTML=''; unitSelect.innerHTML=''; if(ctx.is_super){ const companies = await fetchCompanies(); companySelect.innerHTML = `<option value=\"\">All Companies</option>` + companies.map(c=>`<option value=\"${c}\">${c}</option>`).join(''); companySelect.addEventListener('change', async ()=>{ selectedCompany = companySelect.value || null; const units = await fetchUnits(selectedCompany); unitSelect.innerHTML = `<option value=\"\">All Units</option>` + units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit = null; }); const initialUnits = await fetchUnits(null); unitSelect.innerHTML = `<option value=\"\">All Units</option>` + initialUnits.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedCompany=null; selectedUnit=null; } else { selectedCompany = ctx.company || null; companySelect.innerHTML = `<option value=\"${selectedCompany||''}\">${selectedCompany||'-'}</option>`; companySelect.disabled = true; let units=[]; if(ctx.units && ctx.units.length) units=ctx.units; else if(selectedCompany) units = await fetchUnits(selectedCompany); if(!units || !units.length){ unitSelect.innerHTML = `<option value=\"\">All Units</option>`; selectedUnit=null; } else { unitSelect.innerHTML = units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit = units.length===1 ? units[0] : units[0]; } unitSelect.disabled = !(ctx.units && ctx.units.length>1); } }

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', ()=>{ init(); }); } else { init(); }
})();


