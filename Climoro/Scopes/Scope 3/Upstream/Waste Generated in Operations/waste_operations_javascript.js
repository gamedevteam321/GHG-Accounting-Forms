(function(){
    let currentRowIds = { 'supplier-specific': 1, 'waste-type-specific': 1, 'average-data': 1 };
    let isInitialized = false;
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    let selectedCompany = null;
    let selectedUnit = null;
    let selectedDateFrom = null;
    let selectedDateTo = null;
    let isFilterVisible = false;
    const metaCache = {};

    async function hasField(doctype, fieldname){
        try { if(!metaCache[doctype]){ const r = await frappe.call({ method: 'frappe.client.get', args: { doctype: 'DocType', name: doctype } }); metaCache[doctype] = r.message || {}; } const fields = metaCache[doctype].fields || []; return fields.some(f=> f.fieldname === fieldname); } catch(e){ return false; }
    }

    function init(){ if(isInitialized) return; buildFilterBar(async ()=>{ await initializeFiltersFromContext(); setupTabs(); createEntryRow('supplier-specific'); createEntryRow('waste-type-specific'); createEntryRow('average-data'); attachGlobalKeyBlockers(); loadExisting(); isInitialized = true; }); }

    function setupTabs(){
        const container = scopeRoot.querySelector('.waste-operations-container'); if(!container) return;
        const buttons = container.querySelectorAll('.tab-btn');
        const tabs = { 'supplier-specific': container.querySelector('#supplier-specific-tab'), 'waste-type-specific': container.querySelector('#waste-type-specific-tab'), 'average-data': container.querySelector('#average-data-tab') };
        buttons.forEach(btn=>{ btn.addEventListener('click', ()=>{ buttons.forEach(b=>b.classList.remove('active')); btn.classList.add('active'); Object.values(tabs).forEach(el=>el.classList.remove('active')); const id = btn.dataset.tab; if(tabs[id]) tabs[id].classList.add('active'); }); });
    }

    function attachGlobalKeyBlockers(){
        const container = scopeRoot.querySelector('.waste-operations-container'); if(!container) return;
        const handler = (e)=>{ if(!container.contains(e.target)) return; e.stopPropagation(); if((e.ctrlKey||e.metaKey) || e.key==='/' || e.key==='?'){ e.preventDefault(); } };
        ['keydown','keypress','keyup'].forEach(ev=>document.addEventListener(ev, handler, true));
    }

    function getBodyId(tab){ return { 'supplier-specific':'supplierSpecificWasteTableBody', 'waste-type-specific':'wasteTypeSpecificTableBody', 'average-data':'averageDataWasteTableBody' }[tab]; }

    function createEntryRow(tab){
        const tbody = scopeRoot.querySelector('#' + getBodyId(tab)); if(!tbody) return;
        const existing = tbody.querySelector('.data-entry-row'); if(existing) existing.remove();
        const row = document.createElement('tr'); row.className='data-entry-row';
        const today = new Date().toISOString().split('T')[0];
        row.innerHTML = `
            <td>${currentRowIds[tab]}</td>
            <td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td>
            <td><input type="text" class="form-control waste-type isolated-input" data-frappe-ignore="true" placeholder="e.g., Food Waste"></td>
            <td><input type="text" class="form-control treatment isolated-input" data-frappe-ignore="true" placeholder="e.g., Landfill / Recycling / Incineration"></td>
            <td><input type="number" class="form-control mass isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
            <td><input type="text" class="form-control unit isolated-input" data-frappe-ignore="true" value="tonne"></td>
            <td><input type="number" class="form-control ef isolated-input" data-frappe-ignore="true" step="0.0001" placeholder="0.0000"></td>
            <td><input type="text" class="form-control ef-unit isolated-input" data-frappe-ignore="true" value="kg CO2e/tonne"></td>
            <td><span class="total-emissions">0.00</span></td>
            <td><button class="btn btn-success save-btn">Add</button></td>
        `;
        tbody.appendChild(row);
        isolateInputs(row);
        setupRowEvents(row);
    }

    function setupRowEvents(row){
        const calc = ()=>{
            const m = parseFloat(row.querySelector('.mass').value)||0;
            const ef = parseFloat(row.querySelector('.ef').value)||0;
            row.querySelector('.total-emissions').textContent = (m*ef).toFixed(2);
        };
        row.querySelectorAll('input,select').forEach(el=>{
            el.addEventListener('input', calc);
            el.addEventListener('change', calc);
            ['keydown','keypress','keyup'].forEach(ev=>el.addEventListener(ev,(e)=>{ e.stopPropagation(); }, true));
        });
        const saveBtn = row.querySelector('.save-btn');
        if(saveBtn){ saveBtn.addEventListener('click', (e)=>{ e.preventDefault(); addDisplayRow(row); }); }
    }

    function addDisplayRow(entryRow){
        const tbody = entryRow.parentElement; const display = document.createElement('tr'); display.className='data-display-row';
        const dateVal = entryRow.querySelector('input[type="date"]').value;
        const waste = entryRow.querySelector('.waste-type').value || '-';
        const treatment = entryRow.querySelector('.treatment').value || '-';
        const mass = entryRow.querySelector('.mass').value || '0.00';
        const unit = entryRow.querySelector('.unit').value || 'tonne';
        const ef = entryRow.querySelector('.ef').value || '0.0000';
        const efu = entryRow.querySelector('.ef-unit').value || 'kg CO2e/tonne';
        const total = entryRow.querySelector('.total-emissions').textContent;
        let html = `<td>${getNextIndexFromRow(entryRow)}</td><td>${formatDate(dateVal)}</td><td>${waste}</td><td>${treatment}</td><td>${mass}</td><td>${unit}</td><td>${ef}</td><td>${efu}</td><td>${total}</td>`;
        html += `<td><button class="btn btn-danger delete-btn">Delete</button></td>`; display.innerHTML = html; tbody.insertBefore(display, entryRow.nextSibling);
        // Persist
        const payload = { date: dateVal, waste_type: waste, treatment_method: treatment, mass: parseFloat(mass)||0, unit, emission_factor: parseFloat(ef)||0, ef_unit: efu, total_emissions: parseFloat(total)||0 };
        saveToDoctype(payload, getActiveTabKey(), (docName)=>{ display.setAttribute('data-doc', docName || ''); });
        bumpIndex(entryRow);
        display.querySelector('.delete-btn').addEventListener('click', ()=>display.remove());
        clearEntryRow(entryRow);
    }

    function bumpIndex(entryRow){ const tab = getActiveTabKey(); currentRowIds[tab]++; entryRow.querySelector('td:first-child').textContent = currentRowIds[tab]; }
    function getNextIndexFromRow(entryRow){ return entryRow.querySelector('td:first-child').textContent; }
    function getActiveTabKey(){ const active = scopeRoot.querySelector('.tab-content.active'); if(active && active.id.indexOf('supplier-specific')===0) return 'supplier-specific'; if(active && active.id.indexOf('waste-type-specific')===0) return 'waste-type-specific'; return 'average-data'; }

    function isolateInputs(scope){ scope.querySelectorAll('input,select,textarea').forEach(inp=>{ inp.setAttribute('data-frappe-ignore','true'); inp.classList.add('isolated-input'); }); }
    function clearEntryRow(row){ row.querySelectorAll('input').forEach(i=>{ if(i.type==='date'){ i.value = new Date().toISOString().split('T')[0]; } else { i.value=''; } }); row.querySelector('.total-emissions').textContent='0.00'; }
    // Helper to apply client-side date filtering
    function applyDateFilter(records) {
        if (!selectedDateFrom && !selectedDateTo) {
            return records;
        }
        
        console.log('Waste Operations: Applying client-side date filtering...');
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

    function getDoctypeName(tab){ return { 'supplier-specific': 'Waste Operations Supplier Specific', 'waste-type-specific': 'Waste Operations Waste Type Specific', 'average-data': 'Waste Operations Average Data' }[tab]; }
    function saveToDoctype(data, tab, cb){ const doctypeName = getDoctypeName(tab); (async ()=>{ const ctx = await getUserContext(); const doc = { doctype: doctypeName, ...data }; try { if (await hasField(doctypeName, 'company')) { doc.company = ctx.is_super ? (selectedCompany || ctx.company || null) : (ctx.company || null); } if (await hasField(doctypeName, 'company_unit')) { const chosenUnit = selectedUnit || (ctx.units && ctx.units.length===1 ? ctx.units[0] : null); if (chosenUnit) doc.company_unit = chosenUnit; } } catch(e){} frappe.call({ method: 'frappe.client.insert', args: { doc }, callback: function(r){ if(cb) cb(r.message && r.message.name); }, error: function(){ if(cb) cb(null); } }); })(); }

    function loadExisting(){ 
        ['supplier-specific','waste-type-specific','average-data'].forEach(async tab=>{ 
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
                    fields: ['name','date','waste_type','treatment_method','mass','unit','emission_factor','ef_unit','total_emissions'], 
                    limit_page_length: 100, 
                    filters 
                }, 
                callback: function(r){ 
                    if (r.message && r.message.length > 0) {
                        // Apply client-side date filtering
                        const filteredRecords = applyDateFilter(r.message);
                        console.log(`Waste Operations: Original records: ${r.message.length}, Filtered records: ${filteredRecords.length}`);
                        
                        const tbody = scopeRoot.querySelector('#' + getBodyId(tab)); 
                        const entryRow = tbody && tbody.querySelector('.data-entry-row'); 
                        if(!tbody || !entryRow) return; 
                        
                        // Clear existing display rows
                        tbody.querySelectorAll('.data-display-row').forEach(row => row.remove());
                        
                        filteredRecords.forEach((doc, idx)=>{ 
                            const row = document.createElement('tr'); 
                            row.className='data-display-row'; 
                            row.setAttribute('data-doc', doc.name); 
                            row.innerHTML = `<td>${idx+1}</td><td>${formatDate(doc.date)}</td><td>${doc.waste_type||'-'}</td><td>${doc.treatment_method||'-'}</td><td>${doc.mass||'0.00'}</td><td>${doc.unit||'-'}</td><td>${doc.emission_factor||'0.0000'}</td><td>${doc.ef_unit||'-'}</td><td>${doc.total_emissions||'0.00'}</td><td><button class="btn btn-danger delete-btn">Delete</button></td>`; 
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
                        }); 
                        currentRowIds[tab] = (filteredRecords.length||0) + 1; 
                        if(entryRow) entryRow.querySelector('td:first-child').textContent = currentRowIds[tab]; 
                    }
                } 
            }); 
        }); 
    }

    // Company/Unit Filter Bar
    async function getUserContext(){ try { const r = await frappe.call({ method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' }); return r.message || { company: null, units: [], is_super: false }; } catch(e){ return { company: null, units: [], is_super: false }; } }
    function buildFilterBar(done){ 
        const container = scopeRoot.querySelector('.waste-operations-container'); 
        if(!container){ done&&done(); return; } 
        if(container.querySelector('.filter-bar')){ done&&done(); return; } 
        const bar = document.createElement('div'); 
        bar.className='filter-bar'; 
        (async()=>{ 
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
        const header = container.querySelector('.page-header') || container.querySelector('.header-section'); 
        if (header) header.insertAdjacentElement('afterend', bar); else container.prepend(bar); 
        
        // Apply button event listener
        bar.querySelector('.filter-apply-btn').addEventListener('click', ()=>{
            const csel = bar.querySelector('.filter-company-select');
            const usel = bar.querySelector('.filter-unit-select');
            const fromDate = bar.querySelector('.date-from-input');
            const toDate = bar.querySelector('.date-to-input');
            
            selectedCompany = csel.value || null;
            selectedUnit = usel.value || null;
            selectedDateFrom = fromDate.value || null;
            selectedDateTo = toDate.value || null;
            
            console.log('Waste Operations Filter values:', {
                company: selectedCompany,
                unit: selectedUnit,
                dateFrom: selectedDateFrom,
                dateTo: selectedDateTo
            });
            
            loadExisting();
        });
        
        // Clear dates button event listener
        bar.querySelector('.filter-clear-btn').addEventListener('click', ()=>{
            const fromDate = bar.querySelector('.date-from-input');
            const toDate = bar.querySelector('.date-to-input');
            
            fromDate.value = '';
            toDate.value = '';
            selectedDateFrom = null;
            selectedDateTo = null;
            
            console.log('Waste Operations Date filters cleared');
            loadExisting();
        });
        
        // Toggle button event listener
        bar.querySelector('.filter-toggle-btn').addEventListener('click', ()=>{
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
    async function fetchCompanies(){ const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Company', fields: ['name'], limit: 500 } }); return (r.message||[]).map(r=>r.name); }
    async function fetchUnits(company){ const filters = company ? { company } : {}; const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Units', fields: ['name'], filters, limit: 500 } }); return (r.message||[]).map(r=>r.name); }
    async function initializeFiltersFromContext(){ const ctx = await getUserContext(); const bar = scopeRoot.querySelector('.filter-bar'); if(!bar) return; const companySelect = bar.querySelector('.filter-company-select'); const unitSelect = bar.querySelector('.filter-unit-select'); companySelect.innerHTML=''; unitSelect.innerHTML=''; if(ctx.is_super){ const companies = await fetchCompanies(); companySelect.innerHTML = `<option value=\"\">All Companies</option>` + companies.map(c=>`<option value=\"${c}\">${c}</option>`).join(''); companySelect.addEventListener('change', async ()=>{ selectedCompany = companySelect.value || null; const units = await fetchUnits(selectedCompany); unitSelect.innerHTML = `<option value=\"\">All Units</option>` + units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit = null; }); const initialUnits = await fetchUnits(null); unitSelect.innerHTML = `<option value=\"\">All Units</option>` + initialUnits.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedCompany=null; selectedUnit=null; } else { selectedCompany = ctx.company || null; companySelect.innerHTML = `<option value=\"${selectedCompany||''}\">${selectedCompany||'-'}</option>`; companySelect.disabled=true; let units=[]; if(ctx.units && ctx.units.length) units=ctx.units; else if(selectedCompany) units = await fetchUnits(selectedCompany); if(!units || !units.length){ unitSelect.innerHTML = `<option value=\"\">All Units</option>`; selectedUnit=null; } else { unitSelect.innerHTML = units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit = units.length===1 ? units[0] : units[0]; } unitSelect.disabled = !(ctx.units && ctx.units.length>1); } }

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', ()=>{ init(); }); } else { init(); }
})();


