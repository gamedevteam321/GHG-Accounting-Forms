(function(){
    let currentRowIds = { 'fuel-based': 1, 'distance-based': 1, 'spend-based': 1 };
    let isInitialized = false;
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    let selectedCompany = null;
    let selectedUnit = null;
    let selectedDateFrom = null;
    let selectedDateTo = null;
    let isFilterVisible = false;

    function init(){ if(isInitialized) return; setupTabs(); createEntryRow('fuel-based'); createEntryRow('distance-based'); createEntryRow('spend-based'); attachGlobalKeyBlockers(); isInitialized = true; }

    function setupTabs(){
        const container = scopeRoot.querySelector('.transportation-container'); if(!container) return;
        const buttons = container.querySelectorAll('.tab-btn');
        const tabs = { 'fuel-based': container.querySelector('#fuel-based-tab'), 'distance-based': container.querySelector('#distance-based-tab'), 'spend-based': container.querySelector('#spend-based-tab') };
        buttons.forEach(btn=>{ btn.addEventListener('click', ()=>{ buttons.forEach(b=>b.classList.remove('active')); btn.classList.add('active'); Object.values(tabs).forEach(el=>el.classList.remove('active')); const id = btn.dataset.tab; if(tabs[id]) tabs[id].classList.add('active'); }); });
    }

    // Prevent Frappe global shortcuts (awesome bar) from stealing focus while typing
    function attachGlobalKeyBlockers(){
        const container = scopeRoot.querySelector('.transportation-container'); if(!container) return;
        const handler = (e)=>{
            if (!container.contains(e.target)) return;
            // Stop global handlers when typing inside our container
            e.stopPropagation();
            if ((e.ctrlKey || e.metaKey) || e.key === '/' || e.key === '?') {
                e.preventDefault();
            }
        };
        ['keydown','keypress','keyup'].forEach(ev=>document.addEventListener(ev, handler, true));
    }

    function getTableBodyId(tab){ return { 'fuel-based':'fuelBasedTableBody', 'distance-based':'distanceBasedTableBody', 'spend-based':'spendBasedTableBody' }[tab]; }

    function createEntryRow(tab){
        const tbody = scopeRoot.querySelector('#' + getTableBodyId(tab)); if(!tbody) return;
        const existing = tbody.querySelector('.data-entry-row'); if(existing) existing.remove();
        const row = document.createElement('tr'); row.className='data-entry-row';
        const today = new Date().toISOString().split('T')[0];
        if(tab==='fuel-based'){
            row.innerHTML = `
                <td>${currentRowIds[tab]}</td>
                <td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td>
                <td><input type="text" class="form-control desc isolated-input" data-frappe-ignore="true" placeholder="e.g., Logistics Provider A"></td>
                <td><input type="number" class="form-control qty isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="text" class="form-control unit isolated-input" data-frappe-ignore="true" value="litres"></td>
                <td><input type="number" class="form-control ef isolated-input" data-frappe-ignore="true" step="0.0001" placeholder="0.0000"></td>
                <td><input type="text" class="form-control ef-unit isolated-input" data-frappe-ignore="true" value="kg CO2e/litre"></td>
                <td><span class="total-emissions">0.00</span></td>
                <td><button class="btn btn-success save-btn">Add</button></td>`;
        } else if(tab==='distance-based'){
            row.innerHTML = `
                <td>${currentRowIds[tab]}</td>
                <td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td>
                <td><input type="text" class="form-control desc isolated-input" data-frappe-ignore="true" placeholder="e.g., Shipment 123"></td>
                <td><input type="number" class="form-control mass isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="number" class="form-control distance isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td>
                    <select class="form-control mode isolated-input" data-frappe-ignore="true">
                        <option value="Road">Road</option>
                        <option value="Rail">Rail</option>
                        <option value="Air">Air</option>
                        <option value="Sea">Sea</option>
                    </select>
                </td>
                <td><input type="number" class="form-control ef isolated-input" data-frappe-ignore="true" step="0.0001" placeholder="0.0000"></td>
                <td><input type="text" class="form-control ef-unit isolated-input" data-frappe-ignore="true" value="kg CO2e/kg-km"></td>
                <td><span class="total-emissions">0.00</span></td>
                <td><button class="btn btn-success save-btn">Add</button></td>`;
        } else {
            row.innerHTML = `
                <td>${currentRowIds[tab]}</td>
                <td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td>
                <td><input type="text" class="form-control desc isolated-input" data-frappe-ignore="true" placeholder="e.g., Air Freight Costs"></td>
                <td><input type="number" class="form-control amount isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="text" class="form-control unit isolated-input" data-frappe-ignore="true" value="$"></td>
                <td><input type="number" class="form-control ef isolated-input" data-frappe-ignore="true" step="0.0001" placeholder="0.0000"></td>
                <td><input type="text" class="form-control ef-unit isolated-input" data-frappe-ignore="true" value="kg CO2e/$"></td>
                <td><span class="total-emissions">0.00</span></td>
                <td><button class="btn btn-success save-btn">Add</button></td>`;
        }
        tbody.appendChild(row);
        // Isolate inputs from global key handlers
        isolateInputs(row);
        setupRowEvents(row, tab);
    }

    function setupRowEvents(row, tab){
        const calc = ()=>{
            let total = 0;
            if(tab==='fuel-based'){
                const q = parseFloat(row.querySelector('.qty').value)||0;
                const ef = parseFloat(row.querySelector('.ef').value)||0;
                total = q * ef;
            } else if(tab==='distance-based'){
                const m = parseFloat(row.querySelector('.mass').value)||0;
                const d = parseFloat(row.querySelector('.distance').value)||0;
                const ef = parseFloat(row.querySelector('.ef').value)||0;
                total = m * d * ef;
            } else {
                const a = parseFloat(row.querySelector('.amount').value)||0;
                const ef = parseFloat(row.querySelector('.ef').value)||0;
                total = a * ef;
            }
            row.querySelector('.total-emissions').textContent = (isFinite(total)?total:0).toFixed(2);
        };
        row.querySelectorAll('input,select').forEach(el=>{
            el.addEventListener('input', calc);
            el.addEventListener('change', calc);
            ['keydown','keypress','keyup'].forEach(ev=>{
                el.addEventListener(ev, (e)=>{ e.stopPropagation(); }, true);
            });
        });
        const saveBtn = row.querySelector('.save-btn');
        if(saveBtn){ saveBtn.addEventListener('click', (e)=>{ e.preventDefault(); addDisplayRow(row, tab); }); }
    }

    function isolateInputs(scope){
        const inputs = scope.querySelectorAll('input,select,textarea');
        inputs.forEach(inp=>{
            inp.setAttribute('data-frappe-ignore','true');
            inp.classList.add('isolated-input');
        });
    }

    function addDisplayRow(entryRow, tab){
        const tbody = entryRow.parentElement;
        const dateVal = entryRow.querySelector('input[type="date"]').value;
        
        // Apply date filtering
        if (!applyDateFilter(dateVal)) {
            console.log('Transportation: Record filtered out by date range');
            return; // Don't add the row if it doesn't match the date filter
        }
        
        const display = document.createElement('tr'); 
        display.className='data-display-row';
        let html = `<td>${currentRowIds[tab]}</td><td>${formatDate(dateVal)}</td>`;
        if(tab==='fuel-based'){
            html += `<td>${val('.desc')}</td><td>${val('.qty')}</td><td>${val('.unit','litres')}</td><td>${val('.ef')}</td><td>${val('.ef-unit')}</td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        } else if(tab==='distance-based'){
            html += `<td>${val('.desc')}</td><td>${val('.mass')}</td><td>${val('.distance')}</td><td>${entryRow.querySelector('.mode').value}</td><td>${val('.ef')}</td><td>${val('.ef-unit')}</td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        } else {
            html += `<td>${val('.desc')}</td><td>${val('.amount')}</td><td>${val('.unit','$')}</td><td>${val('.ef')}</td><td>${val('.ef-unit')}</td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        }
        html += `<td><button class="btn btn-danger delete-btn">Delete</button></td>`;
        display.innerHTML = html; tbody.insertBefore(display, entryRow.nextSibling);
        currentRowIds[tab]++; entryRow.querySelector('td:first-child').textContent = currentRowIds[tab];
        display.querySelector('.delete-btn').addEventListener('click', ()=>display.remove());
        clearEntryRow(entryRow);

        function val(sel, def='-'){ const el = entryRow.querySelector(sel); if(!el) return def; if(el.tagName==='INPUT') return el.type==='number'? (parseFloat(el.value)||0).toString(): (el.value||def); return el.value||def; }
    }

    // Persistence (insert/list/delete)
    function getDoctypeName(tab){
        return { 'fuel-based': 'Transportation Fuel Based', 'distance-based': 'Transportation Distance Based', 'spend-based': 'Transportation Spend Based' }[tab];
    }

    // Optional: expose save function for future wiring
    window.transportationSave = function(data, tab, cb){
        const doctypeName = getDoctypeName(tab);
        frappe.call({
            method: 'frappe.client.insert',
            args: { doc: { doctype: doctypeName, ...data } },
            callback: function(r){ if(r.message){ if(cb) cb(r.message.name); } },
            error: function(){ if(cb) cb(null); }
        });
    };

    function clearEntryRow(row){ row.querySelectorAll('input').forEach(i=>{ if(i.type==='date'){ i.value = new Date().toISOString().split('T')[0]; } else { i.value = ''; } }); const t=row.querySelector('.total-emissions'); if(t) t.textContent='0.00'; }
    // Helper to apply client-side date filtering
    function applyDateFilter(recordDate) {
        if (!selectedDateFrom && !selectedDateTo) {
            return true;
        }
        
        console.log('Transportation: Applying client-side date filtering...');
        console.log('Date filters - From:', selectedDateFrom, 'To:', selectedDateTo);
        console.log('Record date:', recordDate);
        
        const recordDateObj = new Date(recordDate);
        let includeRecord = true;
        
        if (selectedDateFrom) {
            const fromDate = new Date(selectedDateFrom);
            includeRecord = includeRecord && recordDateObj >= fromDate;
            console.log(`Record date ${recordDate} >= ${selectedDateFrom}:`, recordDateObj >= fromDate);
        }
        
        if (selectedDateTo) {
            const toDate = new Date(selectedDateTo);
            includeRecord = includeRecord && recordDateObj <= toDate;
            console.log(`Record date ${recordDate} <= ${selectedDateTo}:`, recordDateObj <= toDate);
        }
        
        console.log(`Record included:`, includeRecord);
        return includeRecord;
    }

    function formatDate(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }

    // Filter bar and init
    async function getUserContext(){ try { const r = await frappe.call({ method:'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' }); return r.message || { company:null, units:[], is_super:false }; } catch(e){ return { company:null, units:[], is_super:false }; } }
    function buildFilterBar(done){ 
        const container = scopeRoot.querySelector('.transportation-container'); 
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
            
            console.log('Transportation Filter values:', {
                company: selectedCompany,
                unit: selectedUnit,
                dateFrom: selectedDateFrom,
                dateTo: selectedDateTo
            });
            
            container.querySelectorAll('.data-display-row').forEach(r=>r.remove());
        });
        
        // Clear dates button event listener
        bar.querySelector('.filter-clear-btn')?.addEventListener('click', ()=>{
            const fromDate = bar.querySelector('.date-from-input');
            const toDate = bar.querySelector('.date-to-input');
            
            fromDate.value = '';
            toDate.value = '';
            selectedDateFrom = null;
            selectedDateTo = null;
            
            console.log('Transportation Date filters cleared');
            container.querySelectorAll('.data-display-row').forEach(r=>r.remove());
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
    async function fetchUnits(company){ const filters=company?{ company }:{}; const r=await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Units', fields:['name'], filters, limit:500 } }); return (r.message||[]).map(x=>x.name); }
    async function initializeFiltersFromContext(){ const ctx=await getUserContext(); const bar=scopeRoot.querySelector('.filter-bar'); if(!bar) return; const cSel=bar.querySelector('.filter-company-select'); const uSel=bar.querySelector('.filter-unit-select'); cSel.innerHTML=''; uSel.innerHTML=''; if(ctx.is_super){ const companies=await fetchCompanies(); cSel.innerHTML = `<option value=\"\">All Companies</option>` + companies.map(c=>`<option value=\"${c}\">${c}</option>`).join(''); cSel.addEventListener('change', async ()=>{ selectedCompany=cSel.value||null; const units=await fetchUnits(selectedCompany); uSel.innerHTML = `<option value=\"\">All Units</option>` + units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit=null; }); const initialUnits=await fetchUnits(null); uSel.innerHTML = `<option value=\"\">All Units</option>` + initialUnits.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedCompany=null; selectedUnit=null; } else { selectedCompany = ctx.company || null; cSel.innerHTML = `<option value=\"${selectedCompany||''}\">${selectedCompany||'-'}</option>`; cSel.disabled=true; let units=[]; if(ctx.units && ctx.units.length) units=ctx.units; else if(selectedCompany) units=await fetchUnits(selectedCompany); if(!units||!units.length){ uSel.innerHTML = `<option value=\"\">All Units</option>`; selectedUnit=null; } else { uSel.innerHTML = units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit = units.length===1 ? units[0] : units[0]; } uSel.disabled = !(ctx.units && ctx.units.length>1); } }

    function init(){ if(isInitialized) return; buildFilterBar(async ()=>{ await initializeFiltersFromContext(); setupTabs(); createEntryRow('fuel-based'); createEntryRow('distance-based'); createEntryRow('spend-based'); attachGlobalKeyBlockers(); isInitialized = true; }); }

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();


