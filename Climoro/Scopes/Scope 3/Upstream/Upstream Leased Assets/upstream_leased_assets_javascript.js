(function(){
    let currentRowIds = { 'asset-specific': 1, 'lessor-specific': 1, 'average-data': 1 };
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

    function init(){ if(isInitialized) return; setupTabs(); createEntryRow('asset-specific'); createEntryRow('lessor-specific'); createEntryRow('average-data'); attachGlobalKeyBlockers(); loadExisting(); isInitialized = true; }

    function setupTabs(){ const c = scopeRoot.querySelector('.ula-container'); if(!c) return; const btns = c.querySelectorAll('.tab-btn'); const tabs={ 'asset-specific': c.querySelector('#asset-specific-tab'), 'lessor-specific': c.querySelector('#lessor-specific-tab'), 'average-data': c.querySelector('#average-data-tab') }; btns.forEach(b=>b.addEventListener('click',()=>{ btns.forEach(x=>x.classList.remove('active')); b.classList.add('active'); Object.values(tabs).forEach(el=>el.classList.remove('active')); const id=b.dataset.tab; if(tabs[id]) tabs[id].classList.add('active'); })); }

    function attachGlobalKeyBlockers(){ const c=scopeRoot.querySelector('.ula-container'); if(!c) return; const h=(e)=>{ if(!c.contains(e.target)) return; e.stopPropagation(); if((e.ctrlKey||e.metaKey)||e.key==='/'||e.key==='?'){ e.preventDefault(); } }; ['keydown','keypress','keyup'].forEach(ev=>document.addEventListener(ev,h,true)); }

    function bodyId(tab){ return { 'asset-specific':'assetSpecificTableBody', 'lessor-specific':'lessorSpecificTableBody', 'average-data':'averageDataTableBody' }[tab]; }

    function createEntryRow(tab){ const tbody=scopeRoot.querySelector('#'+bodyId(tab)); if(!tbody) return; const exist=tbody.querySelector('.data-entry-row'); if(exist) exist.remove(); const row=document.createElement('tr'); row.className='data-entry-row'; const today=new Date().toISOString().split('T')[0]; if(tab==='asset-specific'){ row.innerHTML = `<td>${currentRowIds[tab]}</td><td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td><td><input type="text" class="form-control asset-id isolated-input" data-frappe-ignore="true" placeholder="e.g., Office A"></td><td><input type="text" class="form-control source isolated-input" data-frappe-ignore="true" placeholder="e.g., Electricity"></td><td><input type="number" class="form-control activity isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td><td><input type="text" class="form-control unit isolated-input" data-frappe-ignore="true" placeholder="kWh"></td><td><input type="number" class="form-control ef isolated-input" data-frappe-ignore="true" step="0.0001" placeholder="0.0000"></td><td><input type="text" class="form-control ef-unit isolated-input" data-frappe-ignore="true" placeholder="kg CO2e/kWh"></td><td><span class="total-emissions">0.00</span></td><td><button class="btn btn-success save-btn">Add</button></td>`; } else if(tab==='lessor-specific'){ row.innerHTML = `<td>${currentRowIds[tab]}</td><td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td><td><input type="text" class="form-control asset-id isolated-input" data-frappe-ignore="true" placeholder="e.g., Facility C"></td><td><input type="number" class="form-control lessor-emissions isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td><td><input type="text" class="form-control unit isolated-input" data-frappe-ignore="true" value="kg CO2e"></td><td><input type="number" class="form-control share isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0"></td><td><span class="total-emissions">0.00</span></td><td><button class="btn btn-success save-btn">Add</button></td>`; } else { row.innerHTML = `<td>${currentRowIds[tab]}</td><td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td><td><input type="text" class="form-control asset-type isolated-input" data-frappe-ignore="true" placeholder="e.g., Building"></td><td><input type="text" class="form-control desc isolated-input" data-frappe-ignore="true" placeholder="e.g., Office Space B"></td><td><input type="number" class="form-control activity isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td><td><input type="text" class="form-control unit isolated-input" data-frappe-ignore="true" placeholder="m²"></td><td><input type="number" class="form-control ef isolated-input" data-frappe-ignore="true" step="0.0001" placeholder="0.0000"></td><td><input type="text" class="form-control ef-unit isolated-input" data-frappe-ignore="true" placeholder="kg CO2e/m²/year"></td><td><span class="total-emissions">0.00</span></td><td><button class="btn btn-success save-btn">Add</button></td>`; }
        tbody.appendChild(row); isolateInputs(row); setupRowEvents(row, tab); }

    function setupRowEvents(row, tab){ const calc=()=>{ let total=0; if(tab==='asset-specific'){ const a=parseFloat(val(row,'.activity'))||0; const ef=parseFloat(val(row,'.ef'))||0; total=a*ef; } else if(tab==='lessor-specific'){ const e=parseFloat(val(row,'.lessor-emissions'))||0; const s=(parseFloat(val(row,'.share'))||0)/100; total=e*s; } else { const a=parseFloat(val(row,'.activity'))||0; const ef=parseFloat(val(row,'.ef'))||0; total=a*ef; } row.querySelector('.total-emissions').textContent=(isFinite(total)?total:0).toFixed(2); }; row.querySelectorAll('input,select').forEach(el=>{ el.addEventListener('input',calc); el.addEventListener('change',calc); ['keydown','keypress','keyup'].forEach(ev=>el.addEventListener(ev,(e)=>{ e.stopPropagation(); },true)); }); const save=row.querySelector('.save-btn'); if(save){ save.addEventListener('click',(e)=>{ e.preventDefault(); addDisplayRow(row, tab); }); } }

    function addDisplayRow(entryRow, tab){ const tbody=entryRow.parentElement; const display=document.createElement('tr'); display.className='data-display-row'; const dateVal=entryRow.querySelector('input[type="date"]').value; let html=`<td>${currentRowIds[tab]}</td><td>${formatDate(dateVal)}</td>`; if(tab==='asset-specific'){ html+=`<td>${val(entryRow,'.asset-id')}</td><td>${val(entryRow,'.source')}</td><td>${val(entryRow,'.activity')}</td><td>${val(entryRow,'.unit')}</td><td>${val(entryRow,'.ef')}</td><td>${val(entryRow,'.ef-unit')}</td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`; } else if(tab==='lessor-specific'){ html+=`<td>${val(entryRow,'.asset-id')}</td><td>${val(entryRow,'.lessor-emissions')}</td><td>${val(entryRow,'.unit','kg CO2e')}</td><td>${val(entryRow,'.share')}</td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`; } else { html+=`<td>${val(entryRow,'.asset-type')}</td><td>${val(entryRow,'.desc')}</td><td>${val(entryRow,'.activity')}</td><td>${val(entryRow,'.unit')}</td><td>${val(entryRow,'.ef')}</td><td>${val(entryRow,'.ef-unit')}</td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`; } html+=`<td><button class="btn btn-danger delete-btn">Delete</button></td>`; display.innerHTML=html; tbody.insertBefore(display, entryRow.nextSibling); const payload = buildPayload(entryRow, tab, dateVal); saveToDoctype(payload, tab, (docName)=>{ display.setAttribute('data-doc', docName || ''); }); bumpIndex(entryRow,tab); display.querySelector('.delete-btn').addEventListener('click',()=>{ const dn=display.getAttribute('data-doc'); const dt=getDoctypeName(tab); if(dn){ frappe.call({ method:'frappe.client.delete', args:{ doctype: dt, name: dn }, callback:function(){ display.remove(); }, error:function(){ display.remove(); } }); } else { display.remove(); } }); clearEntryRow(entryRow); }

    function buildPayload(row, tab, dateVal){ if(tab==='asset-specific'){ return { date: dateVal, leased_asset_id: val(row,'.asset-id'), emission_source: val(row,'.source'), activity_data: parseFloat(val(row,'.activity'))||0, unit: val(row,'.unit'), emission_factor: parseFloat(val(row,'.ef'))||0, ef_unit: val(row,'.ef-unit'), total_emissions: parseFloat(row.querySelector('.total-emissions').textContent)||0 }; } if(tab==='lessor-specific'){ return { date: dateVal, leased_asset_id: val(row,'.asset-id'), lessor_provided_emissions: parseFloat(val(row,'.lessor-emissions'))||0, unit: val(row,'.unit','kg CO2e'), your_share_pct: parseFloat(val(row,'.share'))||0, total_emissions: parseFloat(row.querySelector('.total-emissions').textContent)||0 }; } return { date: dateVal, asset_type: val(row,'.asset-type'), description: val(row,'.desc'), activity_data: parseFloat(val(row,'.activity'))||0, unit: val(row,'.unit'), average_emission_factor: parseFloat(val(row,'.ef'))||0, ef_unit: val(row,'.ef-unit'), total_emissions: parseFloat(row.querySelector('.total-emissions').textContent)||0 }; }

    function getDoctypeName(tab){ return { 'asset-specific':'Upstream Leased Asset Specific', 'lessor-specific':'Upstream Leased Lessor Specific', 'average-data':'Upstream Leased Average Data' }[tab]; }
    function saveToDoctype(data, tab, cb){ const dt=getDoctypeName(tab); (async ()=>{ const ctx = await getUserContext(); const doc = { doctype: dt, ...data }; try { if (await hasField(dt, 'company')) { doc.company = ctx.is_super ? (selectedCompany || ctx.company || null) : (ctx.company || null); } if (await hasField(dt, 'company_unit')) { const chosenUnit = selectedUnit || (ctx.units && ctx.units.length===1 ? ctx.units[0] : null); if (chosenUnit) doc.company_unit = chosenUnit; } } catch(e){} frappe.call({ method:'frappe.client.insert', args:{ doc }, callback:function(r){ if(cb) cb(r.message && r.message.name); }, error:function(){ if(cb) cb(null); } }); })(); }

    function loadExisting(){ 
        ['asset-specific','lessor-specific','average-data'].forEach(tab=>{ 
            const dt=getDoctypeName(tab); 
            (async()=>{ 
                const ctx = await getUserContext(); 
                const filters={}; 
                if (await hasField(dt,'company')) { 
                    filters.company = ctx.is_super ? (selectedCompany || ctx.company || undefined) : (ctx.company || undefined); 
                } 
                if (await hasField(dt,'company_unit')) { 
                    if (selectedUnit) filters.company_unit = selectedUnit; 
                } 
                frappe.call({ 
                    method:'frappe.client.get_list', 
                    args:{ 
                        doctype: dt, 
                        fields:['name', 'date', 'leased_asset_id', 'emission_source', 'activity_data', 'unit', 'emission_factor', 'ef_unit', 'total_emissions', 'lessor_provided_emissions', 'your_share_pct', 'asset_type', 'description', 'average_emission_factor'], 
                        limit_page_length:100, 
                        filters 
                    }, 
                    callback:function(r){ 
                        if (r.message && r.message.length > 0) {
                            // Apply client-side date filtering
                            const filteredRecords = applyDateFilter(r.message);
                            console.log(`Upstream Leased Assets: Original records: ${r.message.length}, Filtered records: ${filteredRecords.length}`);
                            
                            const tbody=scopeRoot.querySelector('#'+bodyId(tab)); 
                            const entryRow=tbody && tbody.querySelector('.data-entry-row'); 
                            if(!tbody || !entryRow) return; 
                            
                            // Clear existing display rows
                            tbody.querySelectorAll('.data-display-row').forEach(row => row.remove());
                            
                            let index=1; 
                            const render=(doc)=>{ 
                                const row=document.createElement('tr'); 
                                row.className='data-display-row'; 
                                row.setAttribute('data-doc', doc.name); 
                                let html=`<td>${index++}</td><td>${formatDate(doc.date)}</td>`; 
                                if(tab==='asset-specific'){ 
                                    html+=`<td>${doc.leased_asset_id||'-'}</td><td>${doc.emission_source||'-'}</td><td>${doc.activity_data||'0.00'}</td><td>${doc.unit||'-'}</td><td>${doc.emission_factor||'0.0000'}</td><td>${doc.ef_unit||'-'}</td><td>${doc.total_emissions||'0.00'}</td>`; 
                                } else if(tab==='lessor-specific'){ 
                                    html+=`<td>${doc.leased_asset_id||'-'}</td><td>${doc.lessor_provided_emissions||'0.00'}</td><td>${doc.unit||'-'}</td><td>${doc.your_share_pct||'0'}</td><td>${doc.total_emissions||'0.00'}</td>`; 
                                } else { 
                                    html+=`<td>${doc.asset_type||'-'}</td><td>${doc.description||'-'}</td><td>${doc.activity_data||'0.00'}</td><td>${doc.unit||'-'}</td><td>${doc.average_emission_factor||'0.0000'}</td><td>${doc.ef_unit||'-'}</td><td>${doc.total_emissions||'0.00'}</td>`; 
                                } 
                                html+=`<td><button class='btn btn-danger delete-btn'>Delete</button></td>`; 
                                row.innerHTML=html; 
                                tbody.insertBefore(row, entryRow.nextSibling); 
                                const del=row.querySelector('.delete-btn'); 
                                del.addEventListener('click',()=>{ 
                                    frappe.call({ 
                                        method:'frappe.client.delete', 
                                        args:{ doctype: dt, name: doc.name }, 
                                        callback:function(){ row.remove(); }, 
                                        error:function(){ row.remove(); } 
                                    }); 
                                }); 
                            }; 
                            
                            // Render all filtered records
                            filteredRecords.forEach(doc => render(doc));
                            
                            currentRowIds[tab]=(filteredRecords.length||0)+1; 
                            if(entryRow) entryRow.querySelector('td:first-child').textContent=currentRowIds[tab]; 
                        }
                    } 
                }); 
            })(); 
        }); 
    }

    function val(scope, sel, def='-'){ const el=scope.querySelector(sel); if(!el) return def; if(el.tagName==='INPUT') return el.type==='number'? (parseFloat(el.value)||0).toString(): (el.value||def); return el.value||def; }
    function bumpIndex(entryRow,tab){ currentRowIds[tab]++; entryRow.querySelector('td:first-child').textContent=currentRowIds[tab]; }
    function isolateInputs(scope){ scope.querySelectorAll('input,select,textarea').forEach(inp=>{ inp.setAttribute('data-frappe-ignore','true'); inp.classList.add('isolated-input'); }); }
    function clearEntryRow(row){ row.querySelectorAll('input').forEach(i=>{ if(i.type==='date'){ i.value=new Date().toISOString().split('T')[0]; } else { i.value=''; } }); row.querySelector('.total-emissions').textContent='0.00'; }
    // Helper to apply client-side date filtering
    function applyDateFilter(records) {
        if (!selectedDateFrom && !selectedDateTo) {
            return records;
        }
        
        console.log('Upstream Leased Assets: Applying client-side date filtering...');
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

    // Build filter then init
    function getUserContext(){ return frappe.call({ method:'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' }).then(r=> r.message || { company:null, units:[], is_super:false }).catch(()=>({ company:null, units:[], is_super:false })); }
    function buildFilterBar(done){ 
        const container = scopeRoot.querySelector('.ula-container'); 
        if(!container){ done&&done(); return; } 
        if(container.querySelector('.filter-bar')){ done&&done(); return; } 
        const bar=document.createElement('div'); 
        bar.className='filter-bar'; 
        (async()=>{ 
            try{ 
                const ctx = await getUserContext(); 
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
            
            console.log('Upstream Leased Assets Filter values:', {
                company: selectedCompany,
                unit: selectedUnit,
                dateFrom: selectedDateFrom,
                dateTo: selectedDateTo
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
            
            console.log('Upstream Leased Assets Date filters cleared');
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
    async function initializeFiltersFromContext(){ const ctx = await getUserContext(); const bar=scopeRoot.querySelector('.filter-bar'); if(!bar) return; const cSel=bar.querySelector('.filter-company-select'); const uSel=bar.querySelector('.filter-unit-select'); cSel.innerHTML=''; uSel.innerHTML=''; if(ctx.is_super){ const companies=await fetchCompanies(); cSel.innerHTML = `<option value=\"\">All Companies</option>` + companies.map(c=>`<option value=\"${c}\">${c}</option>`).join(''); cSel.addEventListener('change', async ()=>{ selectedCompany=cSel.value||null; const units=await fetchUnits(selectedCompany); uSel.innerHTML = `<option value=\"\">All Units</option>` + units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit=null; }); const initialUnits=await fetchUnits(null); uSel.innerHTML = `<option value=\"\">All Units</option>` + initialUnits.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedCompany=null; selectedUnit=null; } else { selectedCompany = ctx.company || null; cSel.innerHTML = `<option value=\"${selectedCompany||''}\">${selectedCompany||'-'}</option>`; cSel.disabled=true; let units=[]; if(ctx.units && ctx.units.length) units=ctx.units; else if(selectedCompany) units=await fetchUnits(selectedCompany); if(!units||!units.length){ uSel.innerHTML = `<option value=\"\">All Units</option>`; selectedUnit=null; } else { uSel.innerHTML = units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit = units.length===1 ? units[0] : units[0]; } uSel.disabled = !(ctx.units && ctx.units.length>1); } }

    function init(){ if(isInitialized) return; buildFilterBar(async ()=>{ await initializeFiltersFromContext(); setupTabs(); createEntryRow('asset-specific'); createEntryRow('lessor-specific'); createEntryRow('average-data'); attachGlobalKeyBlockers(); loadExisting(); isInitialized = true; }); }

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();


