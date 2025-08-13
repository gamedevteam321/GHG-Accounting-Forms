(function(){
    let currentRowIds = { 'fuel-based': 1, 'distance-based': 1, 'spend-based': 1 };
    let isInitialized = false;
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;

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
        const tbody = entryRow.parentElement; const display = document.createElement('tr'); display.className='data-display-row';
        const dateVal = entryRow.querySelector('input[type="date"]').value; let html = `<td>${currentRowIds[tab]}</td><td>${formatDate(dateVal)}</td>`;
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
    function formatDate(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();


