(function(){
    let currentRowIds = { 'fuel-based': 1, 'distance-based': 1, 'spend-based': 1 };
    let isInitialized = false;
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;

    function init(){ if(isInitialized) return; setupTabs(); createEntryRow('fuel-based'); createEntryRow('distance-based'); createEntryRow('spend-based'); attachGlobalKeyBlockers(); isInitialized = true; }

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
    function formatDate(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }

    function getPayload(row, tab, dateVal){
        if(tab==='fuel-based') return { date: dateVal, description: val(row,'.desc'), fuel_type: val(row,'.fuel-type'), fuel_consumed: parseFloat(val(row,'.fuel-consumed'))||0, unit: val(row,'.unit','litres'), emission_factor: parseFloat(val(row,'.ef'))||0, ef_unit: val(row,'.ef-unit','kg CO2e/litre'), total_emissions: parseFloat(row.querySelector('.total-emissions').textContent)||0 };
        if(tab==='distance-based') return { date: dateVal, description: val(row,'.desc'), transport_mode: row.querySelector('.mode').value, distance_traveled: parseFloat(val(row,'.distance'))||0, unit: val(row,'.unit','passenger-km'), emission_factor: parseFloat(val(row,'.ef'))||0, ef_unit: val(row,'.ef-unit','kg CO2e/p-km'), total_emissions: parseFloat(row.querySelector('.total-emissions').textContent)||0 };
        return { date: dateVal, description: val(row,'.desc'), amount_spent: parseFloat(val(row,'.amount'))||0, currency: val(row,'.currency','$'), eeio_ef: parseFloat(val(row,'.eeio'))||0, ef_unit: val(row,'.ef-unit','kg CO2e/$'), total_emissions: parseFloat(row.querySelector('.total-emissions').textContent)||0 };
    }

    function getDoctypeName(tab){ return { 'fuel-based': 'Business Travel Fuel Based', 'distance-based': 'Business Travel Distance Based', 'spend-based': 'Business Travel Spend Based' }[tab]; }
    function saveToDoctype(data, tab, cb){ const doctypeName = getDoctypeName(tab); frappe.call({ method: 'frappe.client.insert', args: { doc: { doctype: doctypeName, ...data } }, callback: function(r){ if(cb) cb(r.message && r.message.name); }, error: function(){ if(cb) cb(null); } }); }

    function loadExisting(){ ['fuel-based','distance-based','spend-based'].forEach(tab=>{ const dt = getDoctypeName(tab); frappe.call({ method: 'frappe.client.get_list', args: { doctype: dt, fields: ['name'], limit_page_length: 100 }, callback: function(r){ const tbody = scopeRoot.querySelector('#' + getBodyId(tab)); const entryRow = tbody && tbody.querySelector('.data-entry-row'); if(!r.message || !tbody || !entryRow) return; const names = r.message.map(x=>x.name); let index = 1; const renderDoc = (doc)=>{ const row = document.createElement('tr'); row.className='data-display-row'; row.setAttribute('data-doc', doc.name); let html = `<td>${index++}</td><td>${formatDate(doc.date)}</td>`; if(tab==='fuel-based'){ html += `<td>${doc.description||'-'}</td><td>${doc.fuel_type||'-'}</td><td>${doc.fuel_consumed||'0.00'}</td><td>${doc.unit||'-'}</td><td>${doc.emission_factor||'0.0000'}</td><td>${doc.ef_unit||'-'}</td><td>${doc.total_emissions||'0.00'}</td>`; } else if(tab==='distance-based'){ html += `<td>${doc.description||'-'}</td><td>${doc.transport_mode||'-'}</td><td>${doc.distance_traveled||'0.00'}</td><td>${doc.unit||'-'}</td><td>${doc.emission_factor||'0.0000'}</td><td>${doc.ef_unit||'-'}</td><td>${doc.total_emissions||'0.00'}</td>`; } else { html += `<td>${doc.description||'-'}</td><td>${doc.amount_spent||'0.00'}</td><td>${doc.currency||'$'}</td><td>${doc.eeio_ef||'0.0000'}</td><td>${doc.ef_unit||'-'}</td><td>${doc.total_emissions||'0.00'}</td>`; } html += `<td><button class='btn btn-danger delete-btn'>Delete</button></td>`; row.innerHTML = html; tbody.insertBefore(row, entryRow.nextSibling); const del = row.querySelector('.delete-btn'); del.addEventListener('click', ()=>{ frappe.call({ method: 'frappe.client.delete', args: { doctype: dt, name: doc.name }, callback: function(){ row.remove(); }, error: function(){ row.remove(); } }); }); };
        // Fetch each full doc to avoid field restrictions in reportview
        names.forEach(n=>{ frappe.call({ method: 'frappe.client.get', args: { doctype: dt, name: n }, callback: function(res){ if(res.message) renderDoc(res.message); } }); });
        currentRowIds[tab] = (names.length||0) + 1; if(entryRow) entryRow.querySelector('td:first-child').textContent = currentRowIds[tab]; } }); }); }

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', ()=>{ init(); loadExisting(); }); } else { init(); loadExisting(); }
})();


