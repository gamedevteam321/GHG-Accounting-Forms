(function(){
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    let currentIndex = 1;
    let DEFAULT_PROCESSES = [];

    // Appendix A fuel list (subset of names matching image headings). Carbon content (kg C/GJ) and oxidation factor typical values.
    // For brevity we include a broad set; extend as needed.
    let APPENDIX_FUELS = [];

    function init(){ ensureEntryRow(); attachGlobalKeyBlockers(); loadExisting(); }

    function buildProcessOptions(){
        return DEFAULT_PROCESSES.map(p=>`<option value="${p.process}" data-group="${p.group}" data-fuelreq="${p.fuel_requirement_gj_per_t}" data-defaultfuel="${p.default_fuel||''}">${p.group} – ${p.process}</option>`).join('');
    }

    function buildFuelOptions(){
        return APPENDIX_FUELS.map(f=>`<option value="${f.fuel_name}" data-carbon="${f.carbon_content_kg_per_gj}" data-oxidation="${f.oxidation_factor}">${f.fuel_name}</option>`).join('');
    }

    function ensureEntryRow(){
        const tbody = scopeRoot.querySelector('#ammoniaTableBody'); if(!tbody) return;
        const existing = tbody.querySelector('.data-entry-row'); if(existing) existing.remove();
        const row = document.createElement('tr'); row.className='data-entry-row'; const today = new Date().toISOString().split('T')[0];
        row.innerHTML = `
            <td>${currentIndex}</td>
            <td><input type="date" class="form-control date-picker" data-frappe-ignore="true" value="${today}"></td>
            <td><select class="form-control unit-selector" data-frappe-ignore="true"></select></td>
            <td><select class="form-control process-selector" data-frappe-ignore="true"><option value="">-- Select Process --</option></select></td>
            <td><input type="number" class="form-control nh3" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
            <td><select class="form-control fuel-selector" data-frappe-ignore="true"><option value="">-- Select Fuel --</option></select></td>
            <td><span class="calculated-value fuelreq">0.00</span></td>
            <td><span class="calculated-value carbon">0.00</span></td>
            <td><span class="calculated-value oxidation">0.00</span></td>
            <td><span class="calculated-value co2nh3">0.00</span></td>
            <td><span class="calculated-value urea">0.00</span></td>
            <td><input type="number" class="form-control css" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
            <td><span class="calculated-value total">0.00</span></td>
            <td><button class="btn btn-success save-btn">Add</button></td>
        `;
        tbody.appendChild(row);
        populateUnits(row.querySelector('.unit-selector'));
        // Load processes and fuels from DocTypes
        loadProcesses().then(list=>{ DEFAULT_PROCESSES = list || []; row.querySelector('.process-selector').innerHTML = `<option value="">-- Select Process --</option>` + buildProcessOptions(); });
        loadFuels().then(list=>{ APPENDIX_FUELS = list || []; row.querySelector('.fuel-selector').innerHTML = `<option value="">-- Select Fuel --</option>` + buildFuelOptions(); });
        setupRowEvents(row);
    }

    async function loadProcesses(){
        try {
            const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Ammonia Production Process Default', fields: ['group','process','fuel_requirement_gj_per_t','default_fuel','is_active'], filters: { is_active: 1 }, limit_page_length: 200 } });
            return r.message || [];
        } catch(e){ return []; }
    }

    async function loadFuels(){
        try {
            const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Ammonia Fuel Carbon Defaults', fields: ['fuel_name','carbon_content_kg_per_gj','oxidation_factor','category','is_active'], filters: { is_active: 1 }, limit_page_length: 500 } });
            return r.message || [];
        } catch(e){ return []; }
    }

    async function populateUnits(select){
        const render = (units)=>{
            const opts = (units||[]).map(u=>{
                if(typeof u === 'string') return `<option value="${u}">${u}</option>`;
                const v = u.name || u.unit_name || u.unit || '';
                return v ? `<option value="${v}">${v}</option>` : '';
            }).join('');
            select.innerHTML = `<option value="">-- Select Unit --</option>` + opts;
            const count = (units||[]).length; if(count===1){ const only = (typeof units[0]==='string')? units[0] : (units[0].name || units[0].unit_name || units[0].unit); if(only) select.value = only; }
        };

        try {
            const ctx = await getUserContext();
            if(ctx.units && ctx.units.length){ render(ctx.units); return; }

            // Introspect Units doctype to discover the company link field
            let companyField = 'company';
            try {
                const meta = await frappe.call({ method: 'frappe.client.get', args: { doctype: 'DocType', name: 'Units' } });
                const fields = (meta.message && meta.message.fields) || [];
                const cf = fields.find(f => f.fieldtype === 'Link' && f.options === 'Company');
                if(cf) companyField = cf.fieldname;
            } catch(e){}

            if(ctx.company){
                const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Units', fields: ['name'], filters: { [companyField]: ctx.company }, limit_page_length: 200 } });
                if(r.message && r.message.length){ render(r.message); return; }
            }

            // Fallback to all Units if filtering yields nothing
            const all = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Units', fields: ['name'], limit_page_length: 200 } });
            render(all.message || []);
        } catch(e){ select.innerHTML = `<option value="">--</option>`; }
    }

    function setupRowEvents(row){
        const processSel = row.querySelector('.process-selector');
        const fuelSel = row.querySelector('.fuel-selector');
        const nh3 = row.querySelector('.nh3');
        const css = row.querySelector('.css');
        const fuelreqSpan = row.querySelector('.fuelreq');
        const carbonSpan = row.querySelector('.carbon');
        const oxidationSpan = row.querySelector('.oxidation');

        const calc = ()=>{
            const NH3 = parseFloat(nh3.value)||0;
            const FR = parseFloat(fuelreqSpan.textContent)||0; // GJ/t
            const C = parseFloat(carbonSpan.textContent)||0;    // kg C/GJ
            const OX = parseFloat(oxidationSpan.textContent)||0; // fraction
            const CSS = parseFloat(css.value)||0;               // t CO2

            const co2FromNH3 = NH3 * FR * C * OX * (44/12) / 1000; // t CO2
            const ureaCO2 = NH3 * (44/60);
            const total = co2FromNH3 - (ureaCO2 + CSS);
            row.querySelector('.co2nh3').textContent = (isFinite(co2FromNH3)?co2FromNH3:0).toFixed(2);
            row.querySelector('.urea').textContent = (isFinite(ureaCO2)?ureaCO2:0).toFixed(2);
            row.querySelector('.total').textContent = (isFinite(total)?total:0).toFixed(2);
        };

        processSel.addEventListener('change', ()=>{
            const opt = processSel.options[processSel.selectedIndex];
            const fr = parseFloat(opt.getAttribute('data-fuelreq'))||0;
            const defaultFuel = opt.getAttribute('data-defaultfuel')||'';
            fuelreqSpan.textContent = fr.toFixed(2);
            // if fuel not chosen, set to default and carbon/oxidation from fuel list
            if(defaultFuel){
                for(const o of fuelSel.options){ if(o.value===defaultFuel){ fuelSel.value = defaultFuel; carbonSpan.textContent = (parseFloat(o.getAttribute('data-carbon'))||0).toFixed(1); oxidationSpan.textContent = (parseFloat(o.getAttribute('data-oxidation'))||0).toFixed(3); break; } }
            }
            calc();
        });

        fuelSel.addEventListener('change', ()=>{
            const opt = fuelSel.options[fuelSel.selectedIndex];
            carbonSpan.textContent = (parseFloat(opt.getAttribute('data-carbon'))||0).toFixed(1);
            oxidationSpan.textContent = (parseFloat(opt.getAttribute('data-oxidation'))||0).toFixed(3);
            calc();
        });

        ;[nh3, css].forEach(el=>{ el.addEventListener('input', calc); el.addEventListener('change', calc); });
        calc();

        const saveBtn = row.querySelector('.save-btn');
        saveBtn.addEventListener('click', (e)=>{ e.preventDefault(); addDisplayRow(row); });
    }

    function addDisplayRow(entryRow){
        const tbody = entryRow.parentElement; const tr = document.createElement('tr'); tr.className='data-display-row';
        const dateVal = entryRow.querySelector('.date-picker').value;
        const html = `
            <td>${currentIndex}</td>
            <td>${formatDate(dateVal)}</td>
            <td>${val(entryRow,'.unit-selector')}</td>
            <td>${val(entryRow,'.process-selector')}</td>
            <td>${val(entryRow,'.nh3')}</td>
            <td>${val(entryRow,'.fuel-selector')}</td>
            <td>${entryRow.querySelector('.fuelreq').textContent}</td>
            <td>${entryRow.querySelector('.carbon').textContent}</td>
            <td>${entryRow.querySelector('.oxidation').textContent}</td>
            <td>${entryRow.querySelector('.co2nh3').textContent}</td>
            <td>${entryRow.querySelector('.urea').textContent}</td>
            <td>${val(entryRow,'.css')}</td>
            <td>${entryRow.querySelector('.total').textContent}</td>
            <td><button class="btn btn-danger delete-btn">Delete</button></td>`;
        tr.innerHTML = html; tbody.insertBefore(tr, entryRow.nextSibling);
        const payload = getPayload(entryRow, dateVal);
        saveToDoctype(payload, (docName)=>{ tr.setAttribute('data-doc', docName || ''); });
        currentIndex += 1; entryRow.querySelector('td:first-child').textContent = currentIndex;
        clearEntryRow(entryRow);
        tr.querySelector('.delete-btn').addEventListener('click', ()=>{ const dn = tr.getAttribute('data-doc'); const dt = getDoctypeName(); if(dn){ frappe.call({ method:'frappe.client.delete', args:{ doctype: dt, name: dn }, callback: function(){ tr.remove(); }, error: function(){ tr.remove(); } }); } else { tr.remove(); } });
    }

    function clearEntryRow(row){
        const today = new Date().toISOString().split('T')[0]; row.querySelector('.date-picker').value = today; row.querySelector('.unit-selector').value=''; row.querySelector('.process-selector').value=''; row.querySelector('.fuel-selector').value=''; row.querySelector('.nh3').value=''; row.querySelector('.css').value=''; ['fuelreq','carbon','oxidation','co2nh3','urea','total'].forEach(cls=> row.querySelector('.'+cls).textContent='0.00');
    }

    function val(scope, sel, def='-'){ const el = scope.querySelector(sel); if(!el) return def; if(el.tagName==='SELECT') return el.value||def; if(el.tagName==='INPUT') return el.type==='number'? (parseFloat(el.value)||0).toString(): (el.value||def); return el.value||def; }

    function getDoctypeName(){ return 'Ammonia Production CO2 Emissions'; }
    function getPayload(row, dateVal){ return { date: dateVal, unit: val(row,'.unit-selector'), production_process: val(row,'.process-selector'), nh3_production_t: parseFloat(val(row,'.nh3'))||0, fuel_type: val(row,'.fuel-selector'), fuel_requirement_gj_per_t: parseFloat(row.querySelector('.fuelreq').textContent)||0, carbon_content_kg_per_gj: parseFloat(row.querySelector('.carbon').textContent)||0, oxidation_factor: parseFloat(row.querySelector('.oxidation').textContent)||0, co2_from_nh3_t: parseFloat(row.querySelector('.co2nh3').textContent)||0, urea_co2_t: parseFloat(row.querySelector('.urea').textContent)||0, css_t: parseFloat(val(row,'.css'))||0, total_co2_t: parseFloat(row.querySelector('.total').textContent)||0 }; }

    async function getUserContext(){
        try {
            // Fallback chain: try custom API, else fetch Units by user's company via server-side filter
            const r = await frappe.call({ method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' });
            if(r && r.message) return r.message;
        } catch(e) {}
        try {
            const userResp = await frappe.call({ method: 'frappe.client.get', args: { doctype: 'User', name: frappe.session && frappe.session.user ? frappe.session.user : 'Administrator' } });
            const userCompany = (userResp.message && userResp.message.company) ? userResp.message.company : null;
            let units = [];
            if(userCompany){
                const unitsResp = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Units', fields: ['name'], filters: { company: userCompany }, limit_page_length: 200 } });
                units = (unitsResp.message||[]).map(u=>u.name);
            }
            return { company: userCompany, units, is_super: false };
        } catch(e){
            return { company: null, units: [], is_super: false };
        }
    }

    async function saveToDoctype(data, callback){ const doctypeName = getDoctypeName(); try { const ctx = await getUserContext(); const doc = { doctype: doctypeName, ...data, company: ctx.company || null, company_unit: (ctx.units && ctx.units.length===1 ? ctx.units[0] : null) }; frappe.call({ method:'frappe.client.insert', args:{ doc }, callback: function(r){ if(callback) callback(r.message && r.message.name); }, error: function(err){ console.error('Error saving:', err); if(callback) callback(null); } }); } catch(e){ console.error(e); if(callback) callback(null); } }

    function formatDate(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }
    function loadExisting(){ /* optional later */ }
    function attachGlobalKeyBlockers(){ const container = scopeRoot.querySelector('.ammonia-container'); if(!container) return; const handler = (e) => { if(!container.contains(e.target)) return; e.stopPropagation(); if((e.ctrlKey || e.metaKey) || e.key === '/' || e.key === '?'){ e.preventDefault(); } }; ['keydown','keypress','keyup'].forEach(ev => { document.addEventListener(ev, handler, true); }); }

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', ()=> init()); } else { init(); }
})();


