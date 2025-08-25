(function(){
    let currentRowIds = { 'supplier-specific': 1, 'waste-type-specific': 1, 'average-data': 1 };
    let isInitialized = false;
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;

    function init(){ if(isInitialized) return; setupTabs(); createEntryRow('supplier-specific'); createEntryRow('waste-type-specific'); createEntryRow('average-data'); attachGlobalKeyBlockers(); isInitialized = true; }

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
    function formatDate(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }

    function getDoctypeName(tab){ return { 'supplier-specific': 'Waste Operations Supplier Specific', 'waste-type-specific': 'Waste Operations Waste Type Specific', 'average-data': 'Waste Operations Average Data' }[tab]; }
    function saveToDoctype(data, tab, cb){ const doctypeName = getDoctypeName(tab); frappe.call({ method: 'frappe.client.insert', args: { doc: { doctype: doctypeName, ...data } }, callback: function(r){ if(cb) cb(r.message && r.message.name); }, error: function(){ if(cb) cb(null); } }); }

    function loadExisting(){ ['supplier-specific','waste-type-specific','average-data'].forEach(tab=>{ const dt = getDoctypeName(tab); frappe.call({ method: 'frappe.client.get_list', args: { doctype: dt, fields: ['name','date','waste_type','treatment_method','mass','unit','emission_factor','ef_unit','total_emissions'], limit_page_length: 100 }, callback: function(r){ const tbody = scopeRoot.querySelector('#' + getBodyId(tab)); const entryRow = tbody && tbody.querySelector('.data-entry-row'); if(!r.message || !tbody || !entryRow) return; r.message.forEach((doc, idx)=>{ const row = document.createElement('tr'); row.className='data-display-row'; row.setAttribute('data-doc', doc.name); row.innerHTML = `<td>${idx+1}</td><td>${formatDate(doc.date)}</td><td>${doc.waste_type||'-'}</td><td>${doc.treatment_method||'-'}</td><td>${doc.mass||'0.00'}</td><td>${doc.unit||'-'}</td><td>${doc.emission_factor||'0.0000'}</td><td>${doc.ef_unit||'-'}</td><td>${doc.total_emissions||'0.00'}</td><td><button class="btn btn-danger delete-btn">Delete</button></td>`; tbody.insertBefore(row, entryRow.nextSibling); const del = row.querySelector('.delete-btn'); del.addEventListener('click', ()=>{ frappe.call({ method: 'frappe.client.delete', args: { doctype: dt, name: doc.name }, callback: function(){ row.remove(); }, error: function(){ row.remove(); } }); }); }); currentRowIds[tab] = (r.message.length||0) + 1; if(entryRow) entryRow.querySelector('td:first-child').textContent = currentRowIds[tab]; } }); }); }

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', ()=>{ init(); loadExisting(); }); } else { init(); loadExisting(); }
})();


