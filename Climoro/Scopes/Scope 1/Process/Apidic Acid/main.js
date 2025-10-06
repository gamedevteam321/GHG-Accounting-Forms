(function(){
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    let currentIndex = 1;
    let initialized = false;

    const DEFAULTS = {
        emissionFactor: 0.30,
        gwp: 310,
        technologies: [
            { key: 'None', destruction: 0.0, utilization: 0.0 },
            { key: 'Catalytic Destruction', destruction: 0.925, utilization: 0.89 },
            { key: 'Thermal Destruction', destruction: 0.99, utilization: 0.97 },
            { key: 'Recycle to Nitric Acid', destruction: 0.99, utilization: 0.94 },
            { key: 'Recycle to feedstock for Adipic acid', destruction: 0.94, utilization: 0.89 }
        ]
    };

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
        if(initialized) return;
        ensureEntryRow();
        loadExisting();
        attachGlobalKeyBlockers();
        initialized = true;
    }

    function ensureEntryRow(){
        const tbody = scopeRoot.querySelector('#adipicTableBody');
        if(!tbody) return;
        const existing = tbody.querySelector('.data-entry-row');
        if(existing) existing.remove();
        const row = document.createElement('tr');
        row.className = 'data-entry-row';
        const today = new Date().toISOString().split('T')[0];

        const techOptions = DEFAULTS.technologies.map(t => `<option value="${t.key}">${t.key}</option>`).join('');

        row.innerHTML = `
            <td>${currentIndex}</td>
            <td><input type="date" class="form-control date-picker" data-frappe-ignore="true" value="${today}"></td>
            <td>
                <select class="form-control tech-selector" data-frappe-ignore="true">
                    <option value="">-- Select Technology --</option>
                    ${techOptions}
                </select>
            </td>
            <td><input type="number" class="form-control production" data-frappe-ignore="true" step="0.01" placeholder="0.00"></td>
            <td><span class="calculated-value ef-value">${DEFAULTS.emissionFactor.toFixed(2)}</span></td>
            <td><span class="calculated-value destruction-value">0.00</span></td>
            <td><span class="calculated-value utilization-value">0.00</span></td>
            <td><span class="calculated-value potential">0.00</span></td>
            <td><span class="calculated-value annual">0.00</span></td>
            <td><span class="calculated-value gwp-value">${DEFAULTS.gwp}</span></td>
            <td><span class="calculated-value co2e">0.00</span></td>
            <td><button class="btn btn-success save-btn">Add</button></td>
        `;

        tbody.appendChild(row);
        setupRowEvents(row);
    }

    function setupRowEvents(row){
        const techSelect = row.querySelector('.tech-selector');
        const datePicker = row.querySelector('.date-picker');
        const efValue = row.querySelector('.ef-value');
        const destrValue = row.querySelector('.destruction-value');
        const utilValue = row.querySelector('.utilization-value');
        const prodInput = row.querySelector('.production');
        const gwpValue = row.querySelector('.gwp-value');

        const calc = ()=>{
            const P = parseFloat(prodInput.value) || 0; // production
            const EF = parseFloat(efValue.textContent) || 0;  // emission factor
            const D = (parseFloat(destrValue.textContent) || 0) / 100.0; // as fraction
            const U = (parseFloat(utilValue.textContent) || 0) / 100.0;  // as fraction
            const GWP = parseFloat(gwpValue.textContent) || DEFAULTS.gwp;

            const potential = P * EF; // Step 1 C
            const annual = potential * (1 - (D * U)); // Step 2.4 using Step 1 C
            const co2e = annual * GWP; // Step 2.6

            row.querySelector('.potential').textContent = (isFinite(potential)?potential:0).toFixed(2);
            row.querySelector('.annual').textContent = (isFinite(annual)?annual:0).toFixed(2);
            row.querySelector('.co2e').textContent = (isFinite(co2e)?co2e:0).toFixed(2);
        };

        techSelect.addEventListener('change', ()=>{
            const t = DEFAULTS.technologies.find(x=>x.key===techSelect.value);
            if(t){
                destrValue.textContent = (t.destruction*100).toFixed(2);
                utilValue.textContent = (t.utilization*100).toFixed(2);
                efValue.textContent = DEFAULTS.emissionFactor.toFixed(2);
                gwpValue.textContent = DEFAULTS.gwp;
            }
            calc();
        });

        [prodInput, datePicker].forEach(el=>{
            el.addEventListener('input', calc);
            el.addEventListener('change', calc);
        });

        calc();

        const saveBtn = row.querySelector('.save-btn');
        if(saveBtn){
            saveBtn.addEventListener('click', (e)=>{ e.preventDefault(); addDisplayRow(row); });
        }
    }

    function addDisplayRow(entryRow){
        const tbody = entryRow.parentElement;
        const display = document.createElement('tr');
        display.className = 'data-display-row';

        const dateVal = entryRow.querySelector('.date-picker') ? entryRow.querySelector('.date-picker').value : new Date().toISOString().split('T')[0];
        const html = `
            <td>${currentIndex}</td>
            <td>${formatDate(dateVal)}</td>
            <td>${val(entryRow,'.tech-selector')}</td>
            <td>${val(entryRow,'.production')}</td>
            <td>${entryRow.querySelector('.ef-value').textContent}</td>
            <td>${entryRow.querySelector('.destruction-value').textContent}</td>
            <td>${entryRow.querySelector('.utilization-value').textContent}</td>
            <td>${entryRow.querySelector('.potential').textContent}</td>
            <td>${entryRow.querySelector('.annual').textContent}</td>
            <td>${entryRow.querySelector('.gwp-value').textContent}</td>
            <td>${entryRow.querySelector('.co2e').textContent}</td>
            <td><button class="btn btn-danger delete-btn">Delete</button></td>
        `;
        display.innerHTML = html;
        tbody.insertBefore(display, entryRow.nextSibling);

        const payload = getPayload(entryRow, dateVal);
        saveToDoctype(payload, (docName)=>{ display.setAttribute('data-doc', docName || ''); });

        currentIndex += 1;
        entryRow.querySelector('td:first-child').textContent = currentIndex;
        clearEntryRow(entryRow);

        display.querySelector('.delete-btn').addEventListener('click', ()=>{
            const dn = display.getAttribute('data-doc');
            const dt = getDoctypeName();
            if(dn){
                frappe.call({ method: 'frappe.client.delete', args: { doctype: dt, name: dn }, callback: function(){ display.remove(); }, error: function(){ display.remove(); } });
            } else {
                display.remove();
            }
        });
    }

    function val(scope, sel, def='-'){
        const el = scope.querySelector(sel);
        if(!el) return def;
        if(el.tagName==='SELECT') return el.value || def;
        if(el.tagName==='INPUT') return el.type==='number'? (parseFloat(el.value)||0).toString(): (el.value||def);
        return el.value||def;
    }

    function clearEntryRow(row){
        const today = new Date().toISOString().split('T')[0];
        const dp = row.querySelector('.date-picker'); if(dp) dp.value = today;
        row.querySelector('.ef-value').textContent = DEFAULTS.emissionFactor.toFixed(2);
        row.querySelector('.destruction-value').textContent = '0.00';
        row.querySelector('.utilization-value').textContent = '0.00';
        row.querySelector('.gwp-value').textContent = DEFAULTS.gwp;
        row.querySelector('.production').value = '';
        const sel = row.querySelector('.tech-selector'); if(sel) sel.value = '';
        row.querySelector('.potential').textContent = '0.00';
        row.querySelector('.annual').textContent = '0.00';
        row.querySelector('.co2e').textContent = '0.00';
    }

    function getDoctypeName(){ return 'Adipic Acid N2O Emissions'; }

    function getPayload(row, dateVal){
        return {
            date: dateVal,
            technology: val(row, '.tech-selector'),
            adipic_acid_production_t: parseFloat(val(row,'.production'))||0,
            n2o_emission_factor: parseFloat(row.querySelector('.ef-value').textContent)||0,
            destruction_factor_pct: parseFloat(row.querySelector('.destruction-value').textContent)||0,
            utilization_factor_pct: parseFloat(row.querySelector('.utilization-value').textContent)||0,
            potential_n2o_t: parseFloat(row.querySelector('.potential').textContent)||0,
            annual_n2o_t: parseFloat(row.querySelector('.annual').textContent)||0,
            gwp: parseFloat(row.querySelector('.gwp-value').textContent)||DEFAULTS.gwp,
            co2e_tco2e: parseFloat(row.querySelector('.co2e').textContent)||0
        };
    }

    async function getUserContext(){
        try {
            const r = await frappe.call({ method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' });
            return r.message || { company: null, units: [], is_super: false };
        } catch(e){
            return { company: null, units: [], is_super: false };
        }
    }

    async function saveToDoctype(data, callback){
        const doctypeName = getDoctypeName();
        (async ()=>{
            try {
                const ctx = await getUserContext();
                const doc = { doctype: doctypeName, ...data };
                if(await hasField(doctypeName, 'company')){ doc.company = ctx.is_super ? (ctx.company || null) : (ctx.company || null); }
                if(await hasField(doctypeName, 'company_unit')){ const chosenUnit = (ctx.units && ctx.units.length===1 ? ctx.units[0] : null); if(chosenUnit) doc.company_unit = chosenUnit; }
                frappe.call({ method: 'frappe.client.insert', args: { doc }, callback: function(r){ if(callback) callback(r.message && r.message.name); }, error: function(err){ console.error('Error saving:', err); if(callback) callback(null);} });
            } catch(e){ console.error(e); if(callback) callback(null); }
        })();
    }

    function formatDate(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }

    function loadExisting(){
        const dt = getDoctypeName();
        frappe.call({
            method: 'frappe.client.get_list',
            args: { doctype: dt, fields: ['name','date','technology','adipic_acid_production_t','n2o_emission_factor','destruction_factor_pct','utilization_factor_pct','potential_n2o_t','annual_n2o_t','gwp','co2e_tco2e'], order_by: 'date desc', limit_page_length: 100 },
            callback: function(r){
                const tbody = scopeRoot.querySelector('#adipicTableBody');
                if(!tbody) return;
                const entryRow = tbody.querySelector('.data-entry-row');
                if(!entryRow) ensureEntryRow();

                if(r.message && r.message.length > 0){
                    // remove any old display rows
                    tbody.querySelectorAll('.data-display-row').forEach(row => row.remove());
                    let index = 1;
                    r.message.forEach(doc => {
                        const row = document.createElement('tr');
                        row.className='data-display-row';
                        row.setAttribute('data-doc', doc.name);
                        row.innerHTML = `
                            <td>${index++}</td>
                            <td>${formatDate(doc.date)}</td>
                            <td>${doc.technology||'-'}</td>
                            <td>${doc.adipic_acid_production_t||'0.00'}</td>
                            <td>${doc.n2o_emission_factor||'0.00'}</td>
                            <td>${doc.destruction_factor_pct||'0.00'}</td>
                            <td>${doc.utilization_factor_pct||'0.00'}</td>
                            <td>${doc.potential_n2o_t||'0.00'}</td>
                            <td>${doc.annual_n2o_t||'0.00'}</td>
                            <td>${doc.gwp||DEFAULTS.gwp}</td>
                            <td>${doc.co2e_tco2e||'0.00'}</td>
                            <td><button class='btn btn-danger delete-btn'>Delete</button></td>`;
                        const entry = tbody.querySelector('.data-entry-row');
                        tbody.insertBefore(row, entry ? entry.nextSibling : null);
                        const del = row.querySelector('.delete-btn');
                        del.addEventListener('click', ()=>{ frappe.call({ method:'frappe.client.delete', args:{ doctype: dt, name: doc.name }, callback: function(){ row.remove(); }, error: function(){ row.remove(); } }); });
                    });
                    currentIndex = (r.message.length||0) + 1;
                    if(tbody.querySelector('.data-entry-row')) tbody.querySelector('.data-entry-row td:first-child').textContent = currentIndex;
                }
            },
            error: function(err){ console.error('Error loading records:', err); }
        });
    }

    function attachGlobalKeyBlockers(){
        const container = scopeRoot.querySelector('.adipic-acid-container');
        if(!container) return;
        const handler = (e) => {
            if(!container.contains(e.target)) return; e.stopPropagation(); if((e.ctrlKey || e.metaKey) || e.key === '/' || e.key === '?'){ e.preventDefault(); }
        };
        ['keydown','keypress','keyup'].forEach(ev => { document.addEventListener(ev, handler, true); });
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', () => { init(); });
    } else { init(); }
})();


