(function(){
    let currentRowIds = { 'part-a': 1, 'part-b': 1 };
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

    function init(){ 
        if(isInitialized) return; 
        buildFilterBar(async ()=>{ await initializeFiltersFromContext(); }); 
        setupWorksheetSelector();
        setupTabs(); 
        attachGlobalKeyBlockers(); 
        loadExisting(); 
        isInitialized = true; 
    }

    function setupWorksheetSelector(){
        const selector = scopeRoot.querySelector('#worksheet-selector');
        if(!selector) return;
        
        selector.addEventListener('change', function(){
            const selectedValue = this.value;
            showWorksheet(selectedValue);
        });
    }

    function showWorksheet(worksheetType){
        // Hide all worksheet sections
        const sections = scopeRoot.querySelectorAll('.worksheet-section');
        sections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected worksheet
        if(worksheetType){
            const targetSection = scopeRoot.querySelector(`#${worksheetType}-section`);
            if(targetSection){
                targetSection.style.display = 'block';
                // Initialize the first tab if it exists
                const firstTab = targetSection.querySelector('.tab-btn.active');
                if(firstTab){
                    const tabId = firstTab.getAttribute('data-tab');
                    createEntryRow(tabId);
                }
            }
        }
    }

    function setupTabs(){
        const container = scopeRoot.querySelector('.aluminium-production-container');
        if(!container) return;
        const buttons = container.querySelectorAll('.tab-btn');
        const tabs = { 'part-a': container.querySelector('#part-a-tab'), 'part-b': container.querySelector('#part-b-tab') };
        buttons.forEach(btn=>{ btn.addEventListener('click', ()=>{ buttons.forEach(b=>b.classList.remove('active')); btn.classList.add('active'); Object.values(tabs).forEach(el=>el.classList.remove('active')); const id = btn.dataset.tab; if(tabs[id]) tabs[id].classList.add('active'); createEntryRow(id); }); });
    }

    function createEntryRow(tab){
        const tbody = scopeRoot.querySelector('#' + getBodyId(tab)); if(!tbody) return; const existing = tbody.querySelector('.data-entry-row'); if(existing) existing.remove();
        const row = document.createElement('tr'); row.className='data-entry-row'; const today = new Date().toISOString().split('T')[0];
        if(tab==='part-a'){
            row.innerHTML = `
                <td>${currentRowIds[tab]}</td>
                <td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td>
                <td><input type="text" class="form-control potline-period isolated-input" data-frappe-ignore="true" placeholder="e.g., Potline 1 Period 1"></td>
                <td><input type="number" class="form-control metal-production isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="number" class="form-control net-anode-consumption isolated-input" data-frappe-ignore="true" step="0.0001" placeholder="0.0000"></td>
                <td>
                    <div class="sub-columns">
                        <div class="sub-column">
                            <input type="number" class="form-control sulphur-content isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00">
                        </div>
                        <div class="sub-column">
                            <input type="number" class="form-control ash-content isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00">
                        </div>
                    </div>
                </td>
                <td><span class="total-emissions">0.00</span></td>
                <td><button class="btn btn-success save-btn">Add</button></td>`;
        } else if(tab==='part-b'){
            row.innerHTML = `
                <td>${currentRowIds[tab]}</td>
                <td><input type="date" class="form-control isolated-input" data-frappe-ignore="true" value="${today}"></td>
                <td><input type="text" class="form-control furnace-period isolated-input" data-frappe-ignore="true" placeholder="e.g., Furnace 1 Period 1"></td>
                <td><input type="number" class="form-control green-anode-weight isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="number" class="form-control baked-anode-weight isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><span class="weightloss-factor">0.000</span></td>
                <td><input type="number" class="form-control baked-anode-production isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="number" class="form-control loaded-green-anodes isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="number" class="form-control hydrogen-content isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="number" class="form-control waste-tar-collected isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
                <td><input type="number" class="form-control packing-coke-consumption isolated-input" data-frappe-ignore="true" step="0.0001" placeholder="0.0000"></td>
                <td>
                    <div class="sub-columns">
                        <div class="sub-column">
                            <input type="number" class="form-control sulphur-content-packing isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00">
                        </div>
                        <div class="sub-column">
                            <input type="number" class="form-control ash-content-packing isolated-input" data-frappe-ignore="true" step="0.01" placeholder="0.00">
                        </div>
                    </div>
                </td>
                <td><span class="total-emissions">0.00</span></td>
                <td><button class="btn btn-success save-btn">Add</button></td>`;
        }
        tbody.appendChild(row); isolateInputs(row); setupRowEvents(row, tab);
    }

    function getBodyId(tab){ return { 'part-a':'partATableBody', 'part-b':'partBTableBody' }[tab]; }

    function setupRowEvents(row, tab){
        const calc = ()=>{
            let total = 0;
            if(tab==='part-a'){
                const mp = parseFloat(row.querySelector('.metal-production').value)||0; 
                const nac = parseFloat(row.querySelector('.net-anode-consumption').value)||0; 
                const s = parseFloat(row.querySelector('.sulphur-content').value)||0; 
                const ash = parseFloat(row.querySelector('.ash-content').value)||0; 
                // Eco2 = [MP × NAC × (100 - S - Ash) / 100] × 44/12
                const carbonContent = (100 - s - ash) / 100;
                total = mp * nac * carbonContent * (44/12);
            } else if(tab==='part-b'){
                const ga = parseFloat(row.querySelector('.green-anode-weight').value)||0; 
                const baw = parseFloat(row.querySelector('.baked-anode-weight').value)||0; 
                const ba = parseFloat(row.querySelector('.baked-anode-production').value)||0; 
                const lga = parseFloat(row.querySelector('.loaded-green-anodes').value)||0; 
                const h = parseFloat(row.querySelector('.hydrogen-content').value)||0; 
                const pc = parseFloat(row.querySelector('.packing-coke-consumption').value)||0; 
                const sp = parseFloat(row.querySelector('.sulphur-content-packing').value)||0; 
                const ap = parseFloat(row.querySelector('.ash-content-packing').value)||0; 
                
                // Calculate weightloss factor
                if(ga && baw) {
                    const wf = ga / baw;
                    row.querySelector('.weightloss-factor').textContent = wf.toFixed(3);
                }
                
                // Eco2 = [GA - (GAW / BAW) × BA] × H × 44/12 + Packing Coke Emissions
                const volatileMatter = (lga - (ga / baw) * ba) * (h / 100) * (44/12);
                const packingCoke = ba * pc * ((100 - sp - ap) / 100) * (44/12);
                total = volatileMatter + packingCoke;
            }
            row.querySelector('.total-emissions').textContent = (isFinite(total)?total:0).toFixed(2);
        };
        row.querySelectorAll('input,select').forEach(el=>{ el.addEventListener('input', calc); el.addEventListener('change', calc); ['keydown','keypress','keyup'].forEach(ev=>el.addEventListener(ev,(e)=>{ e.stopPropagation(); }, true)); });
        const saveBtn = row.querySelector('.save-btn'); if(saveBtn){ saveBtn.addEventListener('click', (e)=>{ e.preventDefault(); addDisplayRow(row, tab); }); }
    }

    function addDisplayRow(entryRow, tab){
        const tbody = entryRow.parentElement; const display = document.createElement('tr'); display.className='data-display-row';
        const dateVal = entryRow.querySelector('input[type="date"]').value; let html = `<td>${currentRowIds[tab]}</td><td>${formatDate(dateVal)}</td>`;
        if(tab==='part-a'){
            html += `<td>${val(entryRow,'.potline-period')}</td><td>${val(entryRow,'.metal-production')}</td><td>${val(entryRow,'.net-anode-consumption')}</td><td><div class="sub-columns"><div class="sub-column">${val(entryRow,'.sulphur-content')}</div><div class="sub-column">${val(entryRow,'.ash-content')}</div></div></td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        } else if(tab==='part-b'){
            html += `<td>${val(entryRow,'.furnace-period')}</td><td>${val(entryRow,'.green-anode-weight')}</td><td>${val(entryRow,'.baked-anode-weight')}</td><td>${entryRow.querySelector('.weightloss-factor').textContent}</td><td>${val(entryRow,'.baked-anode-production')}</td><td>${val(entryRow,'.loaded-green-anodes')}</td><td>${val(entryRow,'.hydrogen-content')}</td><td>${val(entryRow,'.waste-tar-collected')}</td><td>${val(entryRow,'.packing-coke-consumption')}</td><td><div class="sub-columns"><div class="sub-column">${val(entryRow,'.sulphur-content-packing')}</div><div class="sub-column">${val(entryRow,'.ash-content-packing')}</div></div></td><td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
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

    function getPayload(row, tab, dateVal){
        if(tab==='part-a') return { date: dateVal, potline_period: val(row,'.potline-period'), metal_production: parseFloat(val(row,'.metal-production'))||0, net_anode_consumption: parseFloat(val(row,'.net-anode-consumption'))||0, sulphur_content: parseFloat(val(row,'.sulphur-content'))||0, ash_content: parseFloat(val(row,'.ash-content'))||0, co2_emissions: parseFloat(row.querySelector('.total-emissions').textContent)||0 };
        if(tab==='part-b') return { date: dateVal, furnace_period: val(row,'.furnace-period'), green_anode_weight: parseFloat(val(row,'.green-anode-weight'))||0, baked_anode_weight: parseFloat(val(row,'.baked-anode-weight'))||0, weightloss_factor: parseFloat(row.querySelector('.weightloss-factor').textContent)||0, baked_anode_production: parseFloat(val(row,'.baked-anode-production'))||0, loaded_green_anodes: parseFloat(val(row,'.loaded-green-anodes'))||0, hydrogen_content: parseFloat(val(row,'.hydrogen-content'))||0, waste_tar_collected: parseFloat(val(row,'.waste-tar-collected'))||0, packing_coke_consumption: parseFloat(val(row,'.packing-coke-consumption'))||0, sulphur_content_packing: parseFloat(val(row,'.sulphur-content-packing'))||0, ash_content_packing: parseFloat(val(row,'.ash-content-packing'))||0, total_co2_emissions: parseFloat(row.querySelector('.total-emissions').textContent)||0 };
        return {};
    }

    function getDoctypeName(tab){ return { 'part-a': 'Aluminium Part A Prebake Anode', 'part-b': 'Aluminium Part B Green Anode Baking' }[tab]; }
    function saveToDoctype(data, tab, callback){ 
        const doctypeName = getDoctypeName(tab); 
        (async ()=>{ 
            const ctx = await getUserContext(); 
            const doc = { doctype: doctypeName, ...data }; 
            try { 
                if(await hasField(doctypeName, 'company')){ 
                    doc.company = ctx.is_super ? (selectedCompany || ctx.company || null) : (ctx.company || null); 
                } 
                if(await hasField(doctypeName, 'company_unit')){ 
                    const chosenUnit = selectedUnit || (ctx.units && ctx.units.length===1 ? ctx.units[0] : null); 
                    if(chosenUnit) doc.company_unit = chosenUnit; 
                } 
            } catch(e){
                console.warn(`Could not check fields for ${doctypeName}:`, e);
            } 
            frappe.call({ 
                method: 'frappe.client.insert', 
                args: { doc }, 
                callback: function(r){ 
                    if(callback) callback(r.message && r.message.name); 
                }, 
                error: function(err){ 
                    console.error(`Error saving to ${doctypeName}:`, err);
                    if (err && err.exc_type && err.exc_type.includes('DoesNotExistError')) {
                        console.warn(`DocType ${doctypeName} does not exist. Please create the DocType first.`);
                    }
                    if(callback) callback(null); 
                } 
            }); 
        })(); 
    }

    function formatDate(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }

    function loadExisting(){ 
        ['part-a','part-b'].forEach(async tab=>{ 
            const dt = getDoctypeName(tab); 
            const ctx = await getUserContext(); 
            const filters = {}; 
            if(await hasField(dt, 'company')){ 
                filters.company = ctx.is_super ? (selectedCompany || ctx.company || undefined) : (ctx.company || undefined); 
            } 
            if(await hasField(dt, 'company_unit')){ 
                if(selectedUnit) filters.company_unit = selectedUnit; 
            } 
            
            frappe.call({ 
                method: 'frappe.client.get_list', 
                args: { 
                    doctype: dt, 
                    fields: ['name', 'date', 'company', 'company_unit'], 
                    limit_page_length: 100, 
                    filters 
                }, 
                callback: function(r){ 
                    if(r.message && r.message.length > 0){
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
                            if(tab==='part-a'){ 
                                html += `<td>${doc.potline_period||'-'}</td><td>${doc.metal_production||'0.00'}</td><td>${doc.net_anode_consumption||'0.0000'}</td><td><div class="sub-columns"><div class="sub-column">${doc.sulphur_content||'0.00'}</div><div class="sub-column">${doc.ash_content||'0.00'}</div></div></td><td>${doc.co2_emissions||'0.00'}</td>`; 
                            } else if(tab==='part-b'){ 
                                html += `<td>${doc.furnace_period||'-'}</td><td>${doc.green_anode_weight||'0.00'}</td><td>${doc.baked_anode_weight||'0.00'}</td><td>${doc.weightloss_factor||'0.000'}</td><td>${doc.baked_anode_production||'0.00'}</td><td>${doc.loaded_green_anodes||'0.00'}</td><td>${doc.hydrogen_content||'0.00'}</td><td>${doc.waste_tar_collected||'0.00'}</td><td>${doc.packing_coke_consumption||'0.0000'}</td><td><div class="sub-columns"><div class="sub-column">${doc.sulphur_content_packing||'0.00'}</div><div class="sub-column">${doc.ash_content_packing||'0.00'}</div></div></td><td>${doc.total_co2_emissions||'0.00'}</td>`; 
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
                        
                        // Render all records
                        r.message.forEach(doc => renderDoc(doc));
                        
                        currentRowIds[tab] = (r.message.length||0) + 1; 
                        if(entryRow) entryRow.querySelector('td:first-child').textContent = currentRowIds[tab]; 
                    }
                },
                error: function(err) {
                    console.error(`Error loading ${tab} records:`, err);
                }
            }); 
        }); 
    }

    // Filter functionality (similar to business travel)
    async function getUserContext(){
        try {
            const r = await frappe.call({ method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' });
            return r.message || { company: null, units: [], is_super: false };
        } catch(e){
            return { company: null, units: [], is_super: false };
        }
    }

    function buildFilterBar(done){
        // Similar to business travel filter implementation
        // This would be implemented based on requirements
        if(done) done();
    }

    async function initializeFiltersFromContext(){
        // Similar to business travel filter implementation
    }

    function attachGlobalKeyBlockers(){
        const container = scopeRoot.querySelector('.aluminium-production-container');
        if(!container) return;
        
        const handler = (e) => {
            if(!container.contains(e.target)) return;
            e.stopPropagation();
            if((e.ctrlKey || e.metaKey) || e.key === '/' || e.key === '?'){
                e.preventDefault();
            }
        };
        
        ['keydown', 'keypress', 'keyup'].forEach(ev => {
            document.addEventListener(ev, handler, true);
        });
    }

    // Initialize when DOM is ready
    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', () => { init(); });
    } else {
        init();
    }
})();
