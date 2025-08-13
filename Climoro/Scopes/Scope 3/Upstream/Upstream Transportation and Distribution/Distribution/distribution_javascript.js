(function(){
    let currentRowIds = { 'site-specific': 1, 'average-data': 1 };
    let isInitialized = false;
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;

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

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();


