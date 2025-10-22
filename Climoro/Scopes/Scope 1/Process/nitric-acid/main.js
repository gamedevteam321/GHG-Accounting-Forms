(function(){
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    let currentIndex = 1;
    const GWP = 265;
    let TECH_DEFAULTS = [];

    function init(){ ensureEntryRow(); attachGlobalKeyBlockers(); loadExisting(); }

    function buildTechOptions(){ return TECH_DEFAULTS.map(t=>`<option value="${t.name}" data-ef="${t.default_ef_kg_per_t}">${t.technology_name}</option>`).join(''); }

    function ensureEntryRow(){
        const tbody = scopeRoot.querySelector('#nitricTableBody'); if(!tbody) return;
        const existing = tbody.querySelector('.data-entry-row'); if(existing) existing.remove();
        const row = document.createElement('tr'); row.className='data-entry-row'; const today = new Date().toISOString().split('T')[0];
        row.innerHTML = `
            <td>${currentIndex}</td>
            <td><input type=\"date\" class=\"form-control date-picker\" data-frappe-ignore=\"true\" value=\"${today}\"></td>
            <td><select class=\"form-control tech\" data-frappe-ignore=\"true\"><option value=\"\">-- Select Technology --</option></select></td>
            <td><input type=\"number\" class=\"form-control prod\" data-frappe-ignore=\"true\" step=\"0.01\" placeholder=\"0.00\"></td>
            <td><span class=\"calculated-value defef\">0.00</span></td>
            <td><span class=\"calculated-value efused\">0.00</span></td>
            <td><input type=\"number\" class=\"form-control destr\" data-frappe-ignore=\"true\" step=\"0.01\" placeholder=\"0.00\"></td>
            <td><input type=\"number\" class=\"form-control util\" data-frappe-ignore=\"true\" step=\"0.01\" placeholder=\"0.00\"></td>
            <td><span class=\"calculated-value n2o\">0.00</span></td>
            <td><span class=\"calculated-value co2e\">0.00</span></td>
            <td><button class=\"btn btn-success save-btn\">Add</button></td>`;
        tbody.appendChild(row);
        loadTechDefaults().then(list=>{ TECH_DEFAULTS = list || []; row.querySelector('.tech').innerHTML = `<option value=\"\">-- Select Technology --</option>` + buildTechOptions(); });
        setupRowEvents(row);
    }

    async function loadTechDefaults(){
        try {
            const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Nitric Acid Technology Defaults', fields: ['name','technology_name','default_ef_kg_per_t','is_active'], filters: { is_active: 1 }, limit_page_length: 100 } });
            return r.message || [];
        } catch(e){ return []; }
    }

    function setupRowEvents(row){
        const techSel = row.querySelector('.tech');
        const prod = row.querySelector('.prod');
        const destr = row.querySelector('.destr');
        const util = row.querySelector('.util');

        const calc = ()=>{
            const A = parseFloat(prod.value)||0;
            const B = parseFloat(row.querySelector('.defef').textContent)||0;
            const D = B; // EF used equals default EF
            row.querySelector('.efused').textContent = D.toFixed(2);
            const E = (parseFloat(destr.value)||0) / 100.0;
            const F = (parseFloat(util.value)||0) / 100.0;
            
            // Get selected technology name
            const techLabel = techSel && techSel.selectedOptions && techSel.selectedOptions[0] ? techSel.selectedOptions[0].textContent.trim() : '';
            
            // Check if technology is one of the special cases
            const isSpecialTech = techLabel === 'Plants with NSCR (all processes)' || 
                                  techLabel === 'Plants with process-integrated or tailgas N2O destruction';
            
            // Apply different formula based on technology
            let n2o;
            if (isSpecialTech) {
                // For special technologies: (Production * EF) / 1000
                n2o = (A * D) / 1000;
            } else {
                // For other technologies: (Production * EF / 1000) * (1 - (Destruction% * Utilization%))
                n2o = (A * D / 1000) * (1 - (E * F));
            }
            
            const co2e = n2o * GWP;
            row.querySelector('.n2o').textContent = (isFinite(n2o)?n2o:0).toFixed(2);
            row.querySelector('.co2e').textContent = (isFinite(co2e)?co2e:0).toFixed(2);
        };

        techSel.addEventListener('change', ()=>{ const opt = techSel.options[techSel.selectedIndex]; const ef = parseFloat(opt.getAttribute('data-ef'))||0; row.querySelector('.defef').textContent = ef.toFixed(2); calc(); });
        [prod, destr, util].forEach(el=>{ el.addEventListener('input', calc); el.addEventListener('change', calc); });
        calc();
        row.querySelector('.save-btn').addEventListener('click', (e)=>{ e.preventDefault(); addDisplayRow(row); });
    }

    function addDisplayRow(entryRow){
        const tbody = entryRow.parentElement; const tr = document.createElement('tr'); tr.className='data-display-row';
        const dateVal = entryRow.querySelector('.date-picker').value;
        const techSel = entryRow.querySelector('.tech');
        const techLabel = techSel && techSel.selectedOptions && techSel.selectedOptions[0] ? techSel.selectedOptions[0].textContent : val(entryRow,'.tech');
        const html = `
            <td>${currentIndex}</td>
            <td>${formatDate(dateVal)}</td>
            <td>${techLabel}</td>
            <td>${val(entryRow,'.prod')}</td>
            <td>${entryRow.querySelector('.defef').textContent}</td>
            <td>${entryRow.querySelector('.efused').textContent}</td>
            <td>${val(entryRow,'.destr')}</td>
            <td>${val(entryRow,'.util')}</td>
            <td>${entryRow.querySelector('.n2o').textContent}</td>
            <td>${entryRow.querySelector('.co2e').textContent}</td>
            <td><button class=\"btn btn-danger delete-btn\">Delete</button></td>`;
        tr.innerHTML = html; tbody.insertBefore(tr, entryRow.nextSibling);
        const payload = getPayload(entryRow, dateVal);
        saveToDoctype(payload, (docName)=>{ tr.setAttribute('data-doc', docName || ''); });
        currentIndex += 1; entryRow.querySelector('td:first-child').textContent = currentIndex;
        clearEntryRow(entryRow);
        tr.querySelector('.delete-btn').addEventListener('click', ()=>{ const dn = tr.getAttribute('data-doc'); const dt = getDoctypeName(); if(dn){ frappe.call({ method:'frappe.client.delete', args:{ doctype: dt, name: dn }, callback: function(){ tr.remove(); }, error: function(){ tr.remove(); } }); } else { tr.remove(); } });
    }

    function clearEntryRow(row){ const today = new Date().toISOString().split('T')[0]; row.querySelector('.date-picker').value = today; row.querySelector('.tech').value=''; row.querySelector('.prod').value=''; row.querySelector('.destr').value=''; row.querySelector('.util').value=''; ['defef','efused','n2o','co2e'].forEach(c=> row.querySelector('.'+c).textContent='0.00'); }
    function val(scope, sel, def='-'){ const el = scope.querySelector(sel); if(!el) return def; if(el.tagName==='SELECT') return el.value||def; if(el.tagName==='INPUT') return el.type==='number'? (parseFloat(el.value)||0).toString(): (el.value||def); return el.value||def; }
    function getDoctypeName(){ return 'Nitric Acid N2O Emissions'; }
    function getPayload(row, dateVal){ return { date: dateVal, technology: val(row,'.tech'), production_t: parseFloat(val(row,'.prod'))||0, default_ef_kg_per_t: parseFloat(row.querySelector('.defef').textContent)||0, ef_used_kg_per_t: parseFloat(row.querySelector('.efused').textContent)||0, destruction_pct: parseFloat(val(row,'.destr'))||0, utilization_pct: parseFloat(val(row,'.util'))||0, n2o_emissions_t: parseFloat(row.querySelector('.n2o').textContent)||0, co2e_t: parseFloat(row.querySelector('.co2e').textContent)||0, gwp_fixed: GWP }; }

    async function saveToDoctype(data, callback){ const dt = getDoctypeName(); try { const doc = { doctype: dt, ...data }; frappe.call({ method:'frappe.client.insert', args:{ doc }, callback: function(r){ if(callback) callback(r.message && r.message.name); }, error: function(err){ console.error('Error saving:', err); if(callback) callback(null); } }); } catch(e){ console.error(e); if(callback) callback(null); } }
    function loadExisting(){}
    function formatDate(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }
    function attachGlobalKeyBlockers(){ const container = scopeRoot.querySelector('.nitric-acid-container'); if(!container) return; const handler = (e) => { if(!container.contains(e.target)) return; e.stopPropagation(); if((e.ctrlKey || e.metaKey) || e.key === '/' || e.key === '?'){ e.preventDefault(); } }; ['keydown','keypress','keyup'].forEach(ev => { document.addEventListener(ev, handler, true); }); }

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', ()=> init()); } else { init(); }
})();


