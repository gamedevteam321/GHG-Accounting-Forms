(function(){
    let currentRowIds = { 'site-specific': 1, 'average-data': 1 };
    let isInitialized = false;
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    let selectedCompany = null;
    let selectedUnit = null;

    function init(){ if(isInitialized) return; setupTabs(); createEntryRow('site-specific'); createEntryRow('average-data'); attachGlobalKeyBlockers(); isInitialized = true; }

    function setupTabs(){
        const container = scopeRoot.querySelector('.distribution-container'); if(!container) return;
        const buttons = container.querySelectorAll('.tab-btn');
        const tabs = { 'site-specific': container.querySelector('#site-specific-tab'), 'average-data': container.querySelector('#average-data-tab') };
        buttons.forEach(btn=>{ btn.addEventListener('click', ()=>{ buttons.forEach(b=>b.classList.remove('active')); btn.classList.add('active'); Object.values(tabs).forEach(el=>el.classList.remove('active')); const id = btn.dataset.tab; if(tabs[id]) tabs[id].classList.add('active'); }); });
    }

    function attachGlobalKeyBlockers(){
        const container = scopeRoot.querySelector('.distribution-container'); if(!container) return;
        const handler = (e)=>{
            if (!container.contains(e.target)) return;
            e.stopPropagation();
            if ((e.ctrlKey || e.metaKey) || e.key === '/' || e.key === '?') { e.preventDefault(); }
        };
        ['keydown','keypress','keyup'].forEach(ev=>document.addEventListener(ev, handler, true));
    }

    function getTableBodyId(tab){ return { 'site-specific': 'siteSpecificTableBody', 'average-data': 'averageDataTableBody' }[tab]; }

    function createEntryRow(tab){
        const tbody = scopeRoot.querySelector('#' + getTableBodyId(tab)); if(!tbody) return;
        const existing = tbody.querySelector('.data-entry-row'); if(existing) existing.remove();
        const row = document.createElement('tr'); row.className='data-entry-row';
        const today = new Date().toISOString().split('T')[0];
        if(tab==='site-specific'){
            row.innerHTML = `
                <td>${currentRowIds[tab]}</td>
                <td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td>
                <td><input type="text" class="form-control desc isolated-input" data-frappe-ignore="true" placeholder="e.g., Warehouse X"></td>
                <td><input type="number" class="form-control qty isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="text" class="form-control unit isolated-input" data-frappe-ignore="true" value="kg CO2e"></td>
                <td><input type="text" class="form-control ef isolated-input" data-frappe-ignore="true" value="Calculated"></td>
                <td><input type="text" class="form-control ef-unit isolated-input" data-frappe-ignore="true" value="N/A"></td>
                <td><span class="total-emissions">0.00</span></td>
                <td><button class="btn btn-success save-btn">Add</button></td>`;
        } else {
            row.innerHTML = `
                <td>${currentRowIds[tab]}</td>
                <td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td>
                <td><input type="text" class="form-control desc isolated-input" data-frappe-ignore="true" placeholder="e.g., Goods Y"></td>
                <td><input type="number" class="form-control volume-days isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="text" class="form-control unit isolated-input" data-frappe-ignore="true" value="pallet days"></td>
                <td><input type="number" class="form-control ef isolated-input" data-frappe-ignore="true" step="0.0001" placeholder="0.0000"></td>
                <td><input type="text" class="form-control ef-unit isolated-input" data-frappe-ignore="true" value="kg CO2e/pallet-day"></td>
                <td><span class="total-emissions">0.00</span></td>
                <td><button class="btn btn-success save-btn">Add</button></td>`;
        }
        tbody.appendChild(row);
        isolateInputs(row);
        setupRowEvents(row, tab);
    }

    function setupRowEvents(row, tab){
        const calc = ()=>{
            let total = 0;
            if(tab==='site-specific'){
                // Here activity data is already kg CO2e; treat as total
                total = parseFloat(row.querySelector('.qty').value)||0;
            } else {
                const v = parseFloat(row.querySelector('.volume-days').value)||0;
                const ef = parseFloat(row.querySelector('.ef').value)||0;
                total = v * ef;
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
        const tbody = entryRow.parentElement; const display = document.createElement('tr'); display.className='data-display-row';
        const dateVal = entryRow.querySelector('input[type="date"]').value; let html = `<td>${currentRowIds[tab]}</td><td>${formatDate(dateVal)}</td>`;
        if(tab==='site-specific'){
            html += `<td>${val('.desc')}</td><td>${val('.qty')}</td><td>${val('.unit','kg CO2e')}</td><td>${val('.ef','Calculated')}</td><td>${val('.ef-unit','N/A')}</td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        } else {
            html += `<td>${val('.desc')}</td><td>${val('.volume-days')}</td><td>${val('.unit','pallet days')}</td><td>${val('.ef')}</td><td>${val('.ef-unit')}</td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        }
        html += `<td><button class="btn btn-danger delete-btn">Delete</button></td>`; display.innerHTML = html; tbody.insertBefore(display, entryRow.nextSibling);
        currentRowIds[tab]++; entryRow.querySelector('td:first-child').textContent = currentRowIds[tab];
        display.querySelector('.delete-btn').addEventListener('click', ()=>display.remove());
        clearEntryRow(entryRow);

        function val(sel, def='-'){ const el = entryRow.querySelector(sel); if(!el) return def; if(el.tagName==='INPUT') return el.type==='number'? (parseFloat(el.value)||0).toString(): (el.value||def); return el.value||def; }
    }

    // Persistence helpers for DocTypes
    function getDoctypeName(tab){ return { 'site-specific': 'Distribution Site Specific', 'average-data': 'Distribution Average Data' }[tab]; }
    window.distributionSave = function(data, tab, cb){
        const doctypeName = getDoctypeName(tab);
        frappe.call({ method: 'frappe.client.insert', args: { doc: { doctype: doctypeName, ...data } }, callback: function(r){ if(r.message && cb) cb(r.message.name); }, error: function(){ if(cb) cb(null); } });
    };

    function clearEntryRow(row){ row.querySelectorAll('input').forEach(i=>{ if(i.type==='date'){ i.value = new Date().toISOString().split('T')[0]; } else { i.value = ''; } }); const t=row.querySelector('.total-emissions'); if(t) t.textContent='0.00'; }
    function formatDate(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }

    // Filter bar and init
    async function getUserContext(){ try { const r = await frappe.call({ method:'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' }); return r.message || { company:null, units:[], is_super:false }; } catch(e){ return { company:null, units:[], is_super:false }; } }
    function buildFilterBar(done){ const container = scopeRoot.querySelector('.distribution-container'); if(!container){ done&&done(); return; } if(container.querySelector('.filter-bar')){ done&&done(); return; } const bar=document.createElement('div'); bar.className='filter-bar'; (async()=>{ try{ const ctx=await getUserContext(); const roles=(frappe&&frappe.get_roles)? frappe.get_roles():[]; const canShow = ctx.is_super || roles.includes('System Manager') || roles.includes('Super Admin'); if(!canShow){ done&&done(); return; } }catch(e){ done&&done(); return; } })(); bar.innerHTML = `<div style="display:flex; gap:12px; align-items:center; flex-wrap:nowrap; margin:8px 0;"><div class="company-filter" style="min-width:220px; display:flex; align-items:center; gap:8px;"><label style="font-size:12px; margin:0; white-space:nowrap;">Company</label><select class="form-control filter-company-select" style="width:260px;"></select></div><div class="unit-filter" style="min-width:220px; display:flex; align-items:center; gap:8px;"><label style="font-size:12px; margin:0; white-space:nowrap;">Unit</label><select class="form-control filter-unit-select" style="width:260px;"></select></div><div><button type="button" class="btn btn-secondary filter-apply-btn">Apply</button></div></div>`; const header = container.querySelector('.page-header')||container.querySelector('.header-section'); if(header) header.insertAdjacentElement('afterend', bar); else container.prepend(bar); bar.querySelector('.filter-apply-btn')?.addEventListener('click', ()=>{ const csel=bar.querySelector('.filter-company-select'); const usel=bar.querySelector('.filter-unit-select'); selectedCompany=csel.value||null; selectedUnit=usel.value||null; container.querySelectorAll('.data-display-row').forEach(r=>r.remove()); }); done&&done(); }
    async function fetchCompanies(){ const r = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Company', fields:['name'], limit:500 } }); return (r.message||[]).map(x=>x.name); }
    async function fetchUnits(company){ const filters=company?{ company }:{}; const r=await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Units', fields:['name'], filters, limit:500 } }); return (r.message||[]).map(x=>x.name); }
    async function initializeFiltersFromContext(){ const ctx=await getUserContext(); const bar=scopeRoot.querySelector('.filter-bar'); if(!bar) return; const cSel=bar.querySelector('.filter-company-select'); const uSel=bar.querySelector('.filter-unit-select'); cSel.innerHTML=''; uSel.innerHTML=''; if(ctx.is_super){ const companies=await fetchCompanies(); cSel.innerHTML = `<option value=\"\">All Companies</option>` + companies.map(c=>`<option value=\"${c}\">${c}</option>`).join(''); cSel.addEventListener('change', async ()=>{ selectedCompany=cSel.value||null; const units=await fetchUnits(selectedCompany); uSel.innerHTML = `<option value=\"\">All Units</option>` + units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit=null; }); const initialUnits=await fetchUnits(null); uSel.innerHTML = `<option value=\"\">All Units</option>` + initialUnits.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedCompany=null; selectedUnit=null; } else { selectedCompany = ctx.company || null; cSel.innerHTML = `<option value=\"${selectedCompany||''}\">${selectedCompany||'-'}</option>`; cSel.disabled=true; let units=[]; if(ctx.units && ctx.units.length) units=ctx.units; else if(selectedCompany) units=await fetchUnits(selectedCompany); if(!units||!units.length){ uSel.innerHTML = `<option value=\"\">All Units</option>`; selectedUnit=null; } else { uSel.innerHTML = units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit = units.length===1 ? units[0] : units[0]; } uSel.disabled = !(ctx.units && ctx.units.length>1); } }

    function init(){ if(isInitialized) return; buildFilterBar(async ()=>{ await initializeFiltersFromContext(); setupTabs(); createEntryRow('site-specific'); createEntryRow('average-data'); attachGlobalKeyBlockers(); isInitialized = true; }); }

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();


