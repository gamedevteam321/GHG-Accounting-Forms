(function(){
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    
    // Constants
    const HEEL = 0.10;
    const ACF4_DESTRUCTION = 90.0;
    const GWP_CF4 = 6500;
    const MTCE_CONVERSION = 3.667;
    const CHEMICALS = ['C2F6', 'CF4', 'CHF3', 'SF6', 'NF3', 'C3F8', 'C4F8'];
    
    // State
    let defaults = {};
    let currentCompany = '';
    let waferRows = [];
    let currentStepNum = 1;
    const totalSteps = 4;

    function init(){
        buildTabs();
        loadDefaults();
        loadCompany();
        attachEventListeners();
        attachBlockers();
        updateProgress();
    }

    // Tab Management - Wizard Mode
    function buildTabs(){
        const c = scopeRoot.querySelector('.semiconductor-container');
        if(!c) return;
        const btns = c.querySelectorAll('.tab-btn');
        // Disable clicking on tabs directly - navigation only through Next/Prev buttons
        btns.forEach(b => {
            b.style.cursor = 'default';
        });
    }

    function goToStep(stepNum){
        if(stepNum < 1 || stepNum > totalSteps) return;
        
        const c = scopeRoot.querySelector('.semiconductor-container');
        if(!c) return;
        
        // Hide all tabs
        const allTabs = c.querySelectorAll('.tab-content');
        allTabs.forEach(t => t.classList.remove('active'));
        
        // Update buttons
        const btns = c.querySelectorAll('.tab-btn');
        btns.forEach((b, idx) => {
            b.classList.remove('active');
            const btnStep = parseInt(b.dataset.step);
            if(btnStep < stepNum){
                b.classList.remove('disabled');
                b.classList.add('completed');
            } else if(btnStep === stepNum){
                b.classList.add('active');
                b.classList.remove('disabled', 'completed');
            } else {
                b.classList.add('disabled');
                b.classList.remove('completed');
            }
        });
        
        // Show target tab
        const tabMap = {1: 'step-1', 2: 'step-2', 3: 'step-3', 4: 'summary'};
        const targetTab = c.querySelector(`#${tabMap[stepNum]}-tab`);
        if(targetTab) targetTab.classList.add('active');
        
        currentStepNum = stepNum;
        updateProgress();
    }

    function updateProgress(){
        const progressFill = scopeRoot.querySelector('#progressFill');
        const currentStepSpan = scopeRoot.querySelector('#currentStep');
        if(progressFill){
            const percentage = (currentStepNum / totalSteps) * 100;
            progressFill.style.width = percentage + '%';
        }
        if(currentStepSpan){
            currentStepSpan.textContent = currentStepNum;
        }
    }

    // Load defaults from DocType
    async function loadDefaults(){
        try {
            const r = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Semiconductor PFC Defaults',
                    fields: ['*'],
                    filters: { is_active: 1 },
                    limit_page_length: 20
                }
            });
            const data = r.message || [];
            data.forEach(d => {
                defaults[d.chemical_name] = {
                    gwp: fnum(d.gwp),
                    ci: fnum(d.ci_utilization),
                    one_minus_ci: fnum(d.one_minus_ci),
                    ai_j: fnum(d.ai_destruction_efficiency),
                    bi: fnum(d.byproduct_ef_bi)
                };
            });
            buildStep1();
            buildStep2();
            buildStep3();
            buildSummary();
        } catch(e){
            console.error('Error loading defaults:', e);
        }
    }

    // Load company
    async function loadCompany(){
        try {
            const userResp = await frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'User',
                    name: frappe.session && frappe.session.user ? frappe.session.user : 'Administrator'
                }
            });
            currentCompany = (userResp.message && userResp.message.company) || '';
            const display = scopeRoot.querySelector('#companyDisplay');
            if(display) display.textContent = currentCompany || 'Not Set';
        } catch(e){
            console.error('Error loading company:', e);
        }
    }

    // Build Step 1
    function buildStep1(){
        const tbody = scopeRoot.querySelector('#step1Body');
        if(!tbody) return;
        tbody.innerHTML = '';
        CHEMICALS.forEach(chem => {
            const def = defaults[chem] || {};
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${chem}</td>
                <td><input type="number" class="form-control kgsi-input" data-chem="${chem}" step="0.01" min="0" value="0"></td>
                <td><span class="calculated-value">${(def.gwp || 0).toFixed(0)}</span></td>
            `;
            tbody.appendChild(row);
        });
        attachStep1Listeners();
    }

    function attachStep1Listeners(){
        scopeRoot.querySelectorAll('.kgsi-input').forEach(input => {
            input.addEventListener('input', () => {
                calculateAll();
            });
        });
    }

    // Build Step 2
    function buildStep2(){
        const tbody = scopeRoot.querySelector('#step2Body');
        if(!tbody) return;
        tbody.innerHTML = '';
        CHEMICALS.forEach(chem => {
            const def = defaults[chem] || {};
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${chem}</td>
                <td><input type="number" class="form-control va-input" data-chem="${chem}" step="0.01" min="0" max="1" value="0"></td>
                <td><span class="calculated-value">${(def.ai_j || 0).toFixed(1)}</span></td>
                <td><span class="calculated-value ai-value" data-chem="${chem}">0.000</span></td>
                <td><span class="calculated-value acf4-value" data-chem="${chem}">${(chem === 'C2F6' || chem === 'C3F8') ? '0.000' : '-'}</span></td>
            `;
            tbody.appendChild(row);
        });
        attachStep2Listeners();
    }

    function attachStep2Listeners(){
        scopeRoot.querySelectorAll('.va-input').forEach(input => {
            input.addEventListener('input', () => {
                const va = fnum(input.value);
                if(va < 0 || va > 1){
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
                calculateAll();
            });
        });
    }

    // Build Step 3
    function buildStep3(){
        waferRows = [];
        addWaferRow();
    }

    function addWaferRow(){
        const tbody = scopeRoot.querySelector('#step3Body');
        if(!tbody) return;
        const row = document.createElement('tr');
        const idx = waferRows.length;
        row.innerHTML = `
            <td><input type="number" class="form-control np-input" data-idx="${idx}" step="1" min="0" value="0"></td>
            <td><input type="number" class="form-control size-input" data-idx="${idx}" step="0.1" min="0" value="0"></td>
            <td><span class="calculated-value ap-value" data-idx="${idx}">0.0000</span></td>
            <td><button class="btn btn-danger delete-wafer-btn" data-idx="${idx}">Delete</button></td>
        `;
        tbody.appendChild(row);
        waferRows.push({ np: 0, size: 0, ap: 0, row });
        attachStep3Listeners();
    }

    function attachStep3Listeners(){
        scopeRoot.querySelectorAll('.np-input, .size-input').forEach(input => {
            input.addEventListener('input', () => {
                const idx = parseInt(input.dataset.idx);
                const np = fnum(scopeRoot.querySelector(`.np-input[data-idx="${idx}"]`).value);
                const size = fnum(scopeRoot.querySelector(`.size-input[data-idx="${idx}"]`).value);
                const ap = calculateWaferArea(np, size);
                if(waferRows[idx]){
                    waferRows[idx].np = np;
                    waferRows[idx].size = size;
                    waferRows[idx].ap = ap;
                }
                const apSpan = scopeRoot.querySelector(`.ap-value[data-idx="${idx}"]`);
                if(apSpan) apSpan.textContent = ap.toFixed(4);
                updateTotalSurfaceArea();
                calculateAll();
            });
        });
        scopeRoot.querySelectorAll('.delete-wafer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                if(waferRows[idx] && waferRows[idx].row){
                    waferRows[idx].row.remove();
                    waferRows[idx] = null;
                }
                updateTotalSurfaceArea();
                calculateAll();
            });
        });
    }

    function calculateWaferArea(np, size_mm){
        if(np <= 0 || size_mm <= 0) return 0;
        const diameter_m = size_mm / 1000;
        const radius_m = diameter_m / 2;
        return np * Math.PI * radius_m * radius_m;
    }

    function updateTotalSurfaceArea(){
        const total = waferRows.filter(w => w).reduce((sum, w) => sum + w.ap, 0);
        const display = scopeRoot.querySelector('#totalSurfaceArea');
        if(display) display.textContent = total.toFixed(4);
        return total;
    }

    // Build Summary
    function buildSummary(){
        const tbody = scopeRoot.querySelector('#summaryBody');
        if(!tbody) return;
        tbody.innerHTML = '';
        CHEMICALS.forEach(chem => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${chem}</td>
                <td><span class="calculated-value primary-em" data-chem="${chem}">0.00</span></td>
                <td><span class="calculated-value byproduct-em" data-chem="${chem}">0.00</span></td>
                <td><span class="calculated-value total-em" data-chem="${chem}">0.00</span></td>
            `;
            tbody.appendChild(row);
        });
    }

    // Calculate All
    function calculateAll(){
        const totalSat = updateTotalSurfaceArea();
        let grandTotalTCO2e = 0;

        CHEMICALS.forEach(chem => {
            const def = defaults[chem] || {};
            const kgsi = fnum(scopeRoot.querySelector(`.kgsi-input[data-chem="${chem}"]`)?.value || 0);
            const va = fnum(scopeRoot.querySelector(`.va-input[data-chem="${chem}"]`)?.value || 0);

            // Intermediate calculations
            const ai = (def.ai_j / 100) * va;
            const acf4 = (chem === 'C2F6' || chem === 'C3F8') ? (ACF4_DESTRUCTION / 100) * va : 0;

            // Update Ai display
            const aiSpan = scopeRoot.querySelector(`.ai-value[data-chem="${chem}"]`);
            if(aiSpan) aiSpan.textContent = ai.toFixed(3);

            // Update ACF4 display
            const acf4Span = scopeRoot.querySelector(`.acf4-value[data-chem="${chem}"]`);
            if(acf4Span && (chem === 'C2F6' || chem === 'C3F8')){
                acf4Span.textContent = acf4.toFixed(3);
            }

            // Primary emissions: PFCi * (1-h) * (1-Ci) * (1-Ai) * GWPi
            const primary = kgsi * (1 - HEEL) * def.one_minus_ci * (1 - ai) * def.gwp / 1000;

            // Byproduct CF4 emissions: PFCi * (1-h) * Bi * GWPCF4 * (1-ACF4)
            const byproduct = kgsi * (1 - HEEL) * def.bi * GWP_CF4 * (1 - acf4) / 1000;

            const total = primary + byproduct;
            grandTotalTCO2e += total;

            // Update summary display
            const primarySpan = scopeRoot.querySelector(`.primary-em[data-chem="${chem}"]`);
            if(primarySpan) primarySpan.textContent = primary.toFixed(2);

            const byproductSpan = scopeRoot.querySelector(`.byproduct-em[data-chem="${chem}"]`);
            if(byproductSpan) byproductSpan.textContent = byproduct.toFixed(2);

            const totalSpan = scopeRoot.querySelector(`.total-em[data-chem="${chem}"]`);
            if(totalSpan) totalSpan.textContent = total.toFixed(2);
        });

        // Update totals
        const totalMTCE = grandTotalTCO2e / MTCE_CONVERSION;
        const nerTCO2e = totalSat > 0 ? grandTotalTCO2e / totalSat : 0;
        const nerMTCE = totalSat > 0 ? totalMTCE / totalSat : 0;

        updateDisplay('#totalTCO2e', grandTotalTCO2e.toFixed(2));
        updateDisplay('#totalMTCE', totalMTCE.toFixed(2));
        updateDisplay('#nerTCO2e', nerTCO2e.toFixed(4));
        updateDisplay('#nerMTCE', nerMTCE.toFixed(4));
    }

    function updateDisplay(selector, value){
        const el = scopeRoot.querySelector(selector);
        if(el) el.textContent = value;
    }

    // Event Listeners
    function attachEventListeners(){
        // Step navigation buttons
        const step1Next = scopeRoot.querySelector('#step1Next');
        if(step1Next) step1Next.addEventListener('click', () => goToStep(2));

        const step2Prev = scopeRoot.querySelector('#step2Prev');
        const step2Next = scopeRoot.querySelector('#step2Next');
        if(step2Prev) step2Prev.addEventListener('click', () => goToStep(1));
        if(step2Next) step2Next.addEventListener('click', () => goToStep(3));

        const step3Prev = scopeRoot.querySelector('#step3Prev');
        const step3Next = scopeRoot.querySelector('#step3Next');
        if(step3Prev) step3Prev.addEventListener('click', () => goToStep(2));
        if(step3Next) step3Next.addEventListener('click', () => goToStep(4));

        const summaryPrev = scopeRoot.querySelector('#summaryPrev');
        if(summaryPrev) summaryPrev.addEventListener('click', () => goToStep(3));

        const addWaferBtn = scopeRoot.querySelector('#addWaferBtn');
        if(addWaferBtn){
            addWaferBtn.addEventListener('click', () => addWaferRow());
        }

        const saveBtn = scopeRoot.querySelector('#saveEntryBtn');
        if(saveBtn){
            saveBtn.addEventListener('click', () => saveEntry());
        }

        const modalClose = scopeRoot.querySelector('#modalClose');
        const modalOverlay = scopeRoot.querySelector('#modalOverlay');
        if(modalClose && modalOverlay){
            modalClose.addEventListener('click', () => {
                modalOverlay.classList.remove('active');
            });
            modalOverlay.addEventListener('click', (e) => {
                if(e.target === modalOverlay){
                    modalOverlay.classList.remove('active');
                }
            });
        }
    }

    // Save Entry
    async function saveEntry(){
        const date = today();
        const year = parseInt(scopeRoot.querySelector('#reportingYear')?.value || new Date().getFullYear());
        
        // Collect all data
        const data = {
            doctype: 'Semiconductor PFC Emissions',
            date,
            reporting_year: year,
            company: currentCompany
        };

        // Step 1 data
        CHEMICALS.forEach(chem => {
            const kgsi = fnum(scopeRoot.querySelector(`.kgsi-input[data-chem="${chem}"]`)?.value || 0);
            data[`kgsi_${chem.toLowerCase()}`] = kgsi;
        });

        // Step 2 data
        CHEMICALS.forEach(chem => {
            const va = fnum(scopeRoot.querySelector(`.va-input[data-chem="${chem}"]`)?.value || 0);
            data[`va_${chem.toLowerCase()}`] = va;

            const def = defaults[chem] || {};
            const ai = (def.ai_j / 100) * va;
            data[`ai_${chem.toLowerCase()}`] = ai;

            if(chem === 'C2F6' || chem === 'C3F8'){
                const acf4 = (ACF4_DESTRUCTION / 100) * va;
                data[`acf4_${chem.toLowerCase()}`] = acf4;
            }
        });

        // Step 3 data
        const waferData = waferRows.filter(w => w).map(w => ({ np: w.np, size_mm: w.size, ap_m2: w.ap }));
        data.wafer_data_json = JSON.stringify(waferData);
        data.total_surface_area_m2 = updateTotalSurfaceArea();

        // Emissions data
        let grandTotal = 0;
        CHEMICALS.forEach(chem => {
            const primarySpan = scopeRoot.querySelector(`.primary-em[data-chem="${chem}"]`);
            const byproductSpan = scopeRoot.querySelector(`.byproduct-em[data-chem="${chem}"]`);
            const totalSpan = scopeRoot.querySelector(`.total-em[data-chem="${chem}"]`);

            const primary = fnum(primarySpan?.textContent || 0);
            const byproduct = fnum(byproductSpan?.textContent || 0);
            const total = fnum(totalSpan?.textContent || 0);

            data[`emissions_primary_${chem.toLowerCase()}`] = primary;
            if(chem === 'C2F6' || chem === 'C3F8'){
                data[`emissions_byproduct_${chem.toLowerCase()}`] = byproduct;
            }
            data[`emissions_total_${chem.toLowerCase()}`] = total;
            grandTotal += total;
        });

        data.total_emissions_tco2e = grandTotal;
        data.total_emissions_mtce = grandTotal / MTCE_CONVERSION;
        data.normalized_ner_tco2e = data.total_surface_area_m2 > 0 ? grandTotal / data.total_surface_area_m2 : 0;
        data.normalized_ner_mtce = data.total_surface_area_m2 > 0 ? data.total_emissions_mtce / data.total_surface_area_m2 : 0;

        try {
            await frappe.call({
                method: 'frappe.client.insert',
                args: { doc: data }
            });
            frappe.show_alert({ message: 'Entry saved successfully!', indicator: 'green' });
            clearForm();
            loadHistory();
        } catch(e){
            console.error('Error saving entry:', e);
            frappe.show_alert({ message: 'Error saving entry', indicator: 'red' });
        }
    }

    function clearForm(){
        scopeRoot.querySelectorAll('.kgsi-input, .va-input').forEach(input => input.value = '0');
        scopeRoot.querySelectorAll('.np-input, .size-input').forEach(input => input.value = '0');
        calculateAll();
        goToStep(1); // Reset to step 1 after save
    }

    // Load History
    async function loadHistory(){
        const tbody = scopeRoot.querySelector('#historyBody');
        if(!tbody) return;
        try {
            const r = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Semiconductor PFC Emissions',
                    fields: ['name', 'date', 'reporting_year', 'total_emissions_tco2e', 'total_emissions_mtce', 'normalized_ner_tco2e'],
                    order_by: 'date desc',
                    limit_page_length: 50
                }
            });
            const entries = r.message || [];
            tbody.innerHTML = '';
            entries.forEach(entry => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${format(entry.date)}</td>
                    <td>${entry.reporting_year}</td>
                    <td>${(entry.total_emissions_tco2e || 0).toFixed(2)}</td>
                    <td>${(entry.total_emissions_mtce || 0).toFixed(2)}</td>
                    <td>${(entry.normalized_ner_tco2e || 0).toFixed(4)}</td>
                    <td>
                        <button class="btn btn-info expand-btn" data-name="${entry.name}">Expand</button>
                        <button class="btn btn-danger delete-btn" data-name="${entry.name}">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            attachHistoryListeners();
        } catch(e){
            console.error('Error loading history:', e);
        }
    }

    function attachHistoryListeners(){
        scopeRoot.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                showModal(name);
            });
        });
        scopeRoot.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                deleteEntry(name);
            });
        });
    }

    async function deleteEntry(name){
        if(!confirm('Are you sure you want to delete this entry?')) return;
        try {
            await frappe.call({
                method: 'frappe.client.delete',
                args: { doctype: 'Semiconductor PFC Emissions', name }
            });
            frappe.show_alert({ message: 'Entry deleted', indicator: 'green' });
            loadHistory();
        } catch(e){
            console.error('Error deleting entry:', e);
        }
    }

    // Show Modal
    async function showModal(name){
        try {
            const r = await frappe.call({
                method: 'frappe.client.get',
                args: { doctype: 'Semiconductor PFC Emissions', name }
            });
            const entry = r.message;
            const modalBody = scopeRoot.querySelector('#modalBody');
            if(!modalBody) return;

            let html = `<div class="modal-section">
                <h4>Basic Information</h4>
                <p><strong>Date:</strong> ${format(entry.date)}</p>
                <p><strong>Reporting Year:</strong> ${entry.reporting_year}</p>
                <p><strong>Company:</strong> ${entry.company || '-'}</p>
            </div>`;

            html += `<div class="modal-section"><h4>Step 1: Gas Purchased</h4><table class="semi-table"><thead><tr><th>Chemical</th><th>kgsi (kg)</th><th>GWP</th></tr></thead><tbody>`;
            CHEMICALS.forEach(chem => {
                const kgsi = entry[`kgsi_${chem.toLowerCase()}`] || 0;
                const gwp = defaults[chem]?.gwp || 0;
                html += `<tr><td>${chem}</td><td>${kgsi.toFixed(2)}</td><td>${gwp.toFixed(0)}</td></tr>`;
            });
            html += `</tbody></table></div>`;

            html += `<div class="modal-section"><h4>Step 2: Abatement</h4><table class="semi-table"><thead><tr><th>Chemical</th><th>Va</th><th>Ai</th><th>ACF4</th></tr></thead><tbody>`;
            CHEMICALS.forEach(chem => {
                const va = entry[`va_${chem.toLowerCase()}`] || 0;
                const ai = entry[`ai_${chem.toLowerCase()}`] || 0;
                const acf4 = (chem === 'C2F6' || chem === 'C3F8') ? (entry[`acf4_${chem.toLowerCase()}`] || 0).toFixed(3) : '-';
                html += `<tr><td>${chem}</td><td>${va.toFixed(3)}</td><td>${ai.toFixed(3)}</td><td>${acf4}</td></tr>`;
            });
            html += `</tbody></table></div>`;

            html += `<div class="modal-section"><h4>Step 3: Wafer Data</h4><p><strong>Total Surface Area:</strong> ${(entry.total_surface_area_m2 || 0).toFixed(4)} m²</p>`;
            try {
                const waferData = JSON.parse(entry.wafer_data_json || '[]');
                if(waferData.length > 0){
                    html += `<table class="semi-table"><thead><tr><th>Np (# wafers)</th><th>Size (mm)</th><th>Ap (m²)</th></tr></thead><tbody>`;
                    waferData.forEach(w => {
                        html += `<tr><td>${w.np}</td><td>${w.size_mm}</td><td>${w.ap_m2.toFixed(4)}</td></tr>`;
                    });
                    html += `</tbody></table>`;
                }
            } catch(e){}
            html += `</div>`;

            html += `<div class="modal-section"><h4>Emissions Summary</h4><table class="semi-table"><thead><tr><th>Chemical</th><th>Primary (t CO2e)</th><th>Byproduct (t CO2e)</th><th>Total (t CO2e)</th></tr></thead><tbody>`;
            CHEMICALS.forEach(chem => {
                const primary = entry[`emissions_primary_${chem.toLowerCase()}`] || 0;
                const byproduct = (chem === 'C2F6' || chem === 'C3F8') ? (entry[`emissions_byproduct_${chem.toLowerCase()}`] || 0).toFixed(2) : '0.00';
                const total = entry[`emissions_total_${chem.toLowerCase()}`] || 0;
                html += `<tr><td>${chem}</td><td>${primary.toFixed(2)}</td><td>${byproduct}</td><td>${total.toFixed(2)}</td></tr>`;
            });
            html += `</tbody></table></div>`;

            html += `<div class="modal-section"><h4>Totals</h4>
                <p><strong>Total Emissions:</strong> ${(entry.total_emissions_tco2e || 0).toFixed(2)} Tons CO2e | ${(entry.total_emissions_mtce || 0).toFixed(2)} MTCE</p>
                <p><strong>Normalized NER:</strong> ${(entry.normalized_ner_tco2e || 0).toFixed(4)} [Tons CO2e/m² Si] | ${(entry.normalized_ner_mtce || 0).toFixed(4)} [MTCE/m² Si]</p>
            </div>`;

            modalBody.innerHTML = html;
            const modalOverlay = scopeRoot.querySelector('#modalOverlay');
            if(modalOverlay) modalOverlay.classList.add('active');
        } catch(e){
            console.error('Error loading entry details:', e);
        }
    }

    // Utilities
    function fnum(v){ const n = parseFloat(v); return isFinite(n) ? n : 0; }
    function today(){ return new Date().toISOString().split('T')[0]; }
    function format(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }

    function attachBlockers(){
        const container = scopeRoot.querySelector('.semiconductor-container');
        if(!container) return;
        const h = (e) => {
            if(!container.contains(e.target)) return;
            e.stopPropagation();
            if((e.ctrlKey || e.metaKey) || e.key === '/' || e.key === '?'){
                e.preventDefault();
            }
        };
        ['keydown','keypress','keyup'].forEach(ev => document.addEventListener(ev, h, true));
    }

    if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', () => { init(); loadHistory(); });
    } else {
        init();
        loadHistory();
    }
})();

