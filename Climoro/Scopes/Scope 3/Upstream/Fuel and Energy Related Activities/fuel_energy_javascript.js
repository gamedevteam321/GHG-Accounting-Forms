(function() {
    let isInitialized = false;

    // Row ids per tab
    const currentRowIds = {
        'upstream-fuels': 1,
        'upstream-electricity': 1,
        'tnd-losses': 1,
        'generation': 1
    };

    // Static Energy → Sub-Energy mapping (reusing Stationary lists), plus Electricity
    const energyTypeMappings = {
        'Solid fossil': ['Anthracite','Bitumen','Brown coal','Briquettes','Coal tar','Coke oven coke','Coking coal','Gas coke','Lignite'],
        'Liquid fossil': ['Aviation gasoline','Crude oil','Ethane','Gas/Diesel oil','Jet gasoline','Jet kerosene','Liquefied Petroleum Gases','Lubricants'],
        'Gaseous fossil': ['Blast furnace gas','Coke oven gas','Gas works gas','Natural gas','Oxygen steel furnace gas'],
        'Biomass': ['Biodiesels','Biogasoline','Charcoal','Landfill gas','Municipal waste','Other liquid biofuels','Other primary solid biofuels'],
        'Electricity': ['Grid electricity']
    };

    // Constants
    const GRID_ELECTRICITY_EF = 0.82; // kgCO2/kWh

    // Data cache from Emission Factor Master
    let emissionFactorData = {};

    // Resolve the root element used for scoping queries in Frappe HTML blocks
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;

    let selectedCompany = null;
    let selectedUnit = null;

    function init() {
        if (isInitialized) return;
        buildFilterBar(async ()=>{
            await initializeFiltersFromContext();
            setupTabs();
            loadEmissionFactorData(() => {
                ['upstream-fuels','upstream-electricity','tnd-losses','generation'].forEach(createEntryRow);
            });
            isInitialized = true;
        });
    }

    function setupTabs() {
        const container = scopeRoot.querySelector('.fuel-energy-container');
        if (!container) return;
        const buttons = container.querySelectorAll('.tab-btn');
        const tabs = {
            'upstream-fuels': container.querySelector('#upstream-fuels-tab'),
            'upstream-electricity': container.querySelector('#upstream-electricity-tab'),
            'tnd-losses': container.querySelector('#tnd-losses-tab'),
            'generation': container.querySelector('#generation-tab')
        };
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Object.values(tabs).forEach(el => el.classList.remove('active'));
                const id = btn.dataset.tab;
                if (tabs[id]) tabs[id].classList.add('active');
            });
        });
    }

    async function loadEmissionFactorData(callback) {
        // Minimal fetch like Stationary, but tolerant if EF Master has no electricity entry
        try {
            const records = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Emission Factor Master',
                    fields: ['fuel_type','fuel_name','efco2_mass','efch4_mass','efn20_mass','efco2_liquid','efch4_liquid','efn20_liquid','efco2_gas','efch4_gas','efn20_gas']
                }
            });
            emissionFactorData = {};
            if (records.message) {
                records.message.forEach(r => {
                    if (!emissionFactorData[r.fuel_type]) emissionFactorData[r.fuel_type] = {};
                    emissionFactorData[r.fuel_type][r.fuel_name] = r;
                });
            }
        } catch (e) {
            // ignore fetch errors; manual EF entry will still work
        } finally {
            callback();
        }
    }

    function createEntryRow(tabKey) {
        switch (tabKey) {
            case 'upstream-fuels':
                buildUpstreamFuelsRow();
                break;
            case 'upstream-electricity':
                buildUpstreamElectricityRow();
                break;
            case 'tnd-losses':
                buildTndLossesRow();
                break;
            case 'generation':
                buildGenerationRow();
                break;
        }
    }

    function getEnergyTypeOptions(onlyElectricity = false) {
        const keys = Object.keys(energyTypeMappings).filter(k => (onlyElectricity ? k === 'Electricity' : true));
        return ['<option value="">Select Energy Type</option>'].concat(keys.map(k => `<option value="${k}">${k}</option>`)).join('');
    }
    function getUnitOptionsForType(energyType, subEnergy) {
        if (energyType === 'Electricity') return '<option value="kWh">kWh</option>';
        // Fuel logic like Stationary
        if (energyType === 'Solid fossil' || energyType === 'Biomass') {
            return '<option value="kg">kg</option><option value="Tonnes">Tonnes</option>';
        }
        if (energyType === 'Liquid fossil') {
            return '<option value="kg">kg</option><option value="Tonnes">Tonnes</option><option value="Litre">Litre</option>';
        }
        if (energyType === 'Gaseous fossil') {
            if (subEnergy === 'Natural gas') {
                return '<option value="kg">kg</option><option value="Tonnes">Tonnes</option><option value="m³">m³</option>';
            }
            return '<option value="kg">kg</option><option value="Tonnes">Tonnes</option>';
        }
        return '<option value="kg">kg</option>';
    }

    function buildUpstreamFuelsRow() {
        const tbody = scopeRoot.querySelector('#upstreamFuelsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const row = document.createElement('tr');
        row.className = 'data-entry-row';
        row.innerHTML = `
            <td>${currentRowIds['upstream-fuels']}</td>
            <td><input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}"></td>
            <td>
                <select class="form-control energy-type">${getEnergyTypeOptions(false)}</select>
            </td>
            <td>
                <select class="form-control sub-energy" disabled><option value="">Select Sub-Energy</option></select>
            </td>
            <td><input type="number" class="form-control quantity" step="0.01" placeholder="0.00"></td>
            <td>
                <select class="form-control unit-select"><option value="">Select Unit</option></select>
            </td>
            <td><input type="number" class="form-control ef" step="0.0001" placeholder="0.0000"></td>
            <td><span class="ef-unit">-</span></td>
            <td><span class="total-emissions">0.00</span></td>
            <td><button class="btn btn-success save-btn">Add</button></td>
        `;
        tbody.appendChild(row);
        setupRowEvents(row, 'upstream-fuels');
    }

    function buildUpstreamElectricityRow() {
        const tbody = scopeRoot.querySelector('#upstreamElectricityTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const row = document.createElement('tr');
        row.className = 'data-entry-row';
        row.innerHTML = `
            <td>${currentRowIds['upstream-electricity']}</td>
            <td><input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}"></td>
            <td>
                <select class="form-control energy-type">${getEnergyTypeOptions(true)}</select>
            </td>
            <td>
                <select class="form-control sub-energy"><option value="Grid electricity">Grid electricity</option></select>
            </td>
            <td><input type="number" class="form-control quantity" step="0.01" placeholder="0.00"></td>
            <td><select class="form-control unit-select"><option value="kWh">kWh</option></select></td>
            <td><input type="number" class="form-control ef" step="0.0001" value="${GRID_ELECTRICITY_EF.toFixed(2)}"></td>
            <td><span class="ef-unit">kgCO2/kWh</span></td>
            <td><span class="total-emissions">0.00</span></td>
            <td><button class="btn btn-success save-btn">Add</button></td>
        `;
        tbody.appendChild(row);
        setupRowEvents(row, 'upstream-electricity');
    }

    function buildTndLossesRow() {
        const tbody = scopeRoot.querySelector('#tndLossesTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const row = document.createElement('tr');
        row.className = 'data-entry-row';
        row.innerHTML = `
            <td>${currentRowIds['tnd-losses']}</td>
            <td><input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}"></td>
            <td>
                <select class="form-control energy-type">${getEnergyTypeOptions(true)}</select>
            </td>
            <td>
                <select class="form-control sub-energy"><option value="Grid electricity">Grid electricity</option></select>
            </td>
            <td><input type="number" class="form-control quantity" step="0.01" placeholder="0.00"></td>
            <td><select class="form-control unit-select"><option value="kWh">kWh</option></select></td>
            <td><input type="number" class="form-control grid-ef" step="0.0001" value="${GRID_ELECTRICITY_EF.toFixed(2)}"></td>
            <td><input type="number" class="form-control tnd-rate" step="0.01" placeholder="0.00"></td>
            <td><span class="total-emissions">0.00</span></td>
            <td><button class="btn btn-success save-btn">Add</button></td>
        `;
        tbody.appendChild(row);
        setupRowEvents(row, 'tnd-losses');
    }

    function buildGenerationRow() {
        const tbody = scopeRoot.querySelector('#generationTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        const row = document.createElement('tr');
        row.className = 'data-entry-row';
        row.innerHTML = `
            <td>${currentRowIds['generation']}</td>
            <td><input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}"></td>
            <td><input type="text" class="form-control source-power" placeholder="Enter source of purchased power"></td>
            <td><input type="number" class="form-control quantity" step="0.01" placeholder="0.00"></td>
            <td><select class="form-control unit-select"><option value="kWh">kWh</option></select></td>
            <td><input type="number" class="form-control ef" step="0.0001" placeholder="0.0000"></td>
            <td><span class="ef-unit">kgCO2/kWh</span></td>
            <td><span class="total-emissions">0.00</span></td>
            <td><button class="btn btn-success save-btn">Add</button></td>
        `;
        tbody.appendChild(row);
        setupRowEvents(row, 'generation');
    }

    function setupRowEvents(row, tabKey) {
        const energyType = row.querySelector('.energy-type');
        const subEnergy = row.querySelector('.sub-energy');
        const unitSelect = row.querySelector('.unit-select');
        const quantity = row.querySelector('.quantity');
        const efInput = row.querySelector('.ef') || row.querySelector('.grid-ef');
        const tndRate = row.querySelector('.tnd-rate');
        const totalEl = row.querySelector('.total-emissions');
        const saveBtn = row.querySelector('.save-btn');

        if (energyType) {
            energyType.addEventListener('change', () => {
                const type = energyType.value;
                // populate sub-energy
                if (subEnergy) {
                    subEnergy.innerHTML = '<option value="">Select Sub-Energy</option>';
                    if (type && energyTypeMappings[type]) {
                        energyTypeMappings[type].forEach(v => {
                            const opt = document.createElement('option');
                            opt.value = v; opt.textContent = v; subEnergy.appendChild(opt);
                        });
                        subEnergy.disabled = false;
                    } else {
                        subEnergy.disabled = true;
                    }
                }
                // set units
                if (unitSelect) unitSelect.innerHTML = getUnitOptionsForType(type, subEnergy && subEnergy.value);
                compute();
            });
        }
        if (subEnergy) {
            subEnergy.addEventListener('change', () => {
                if (energyType && unitSelect) unitSelect.innerHTML = getUnitOptionsForType(energyType.value, subEnergy.value);
                compute();
            });
        }
        [quantity, efInput, tndRate].forEach(inp => { if (inp) inp.addEventListener('input', compute); });

        function compute() {
            const q = parseFloat(quantity && quantity.value) || 0;
            const ef = parseFloat(efInput && efInput.value) || 0;
            let total = 0;
            if (tabKey === 'tnd-losses') {
                const rate = parseFloat(tndRate && tndRate.value) || 0;
                total = q * ef * (rate / 100.0);
            } else {
                total = q * ef;
            }
            totalEl.textContent = (isFinite(total) ? total : 0).toFixed(2);
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // For now, just append a display row (like other modules); persistence can be wired later
                addDisplayRow(row, tabKey);
            });
        }
    }

    function addDisplayRow(entryRow, tabKey) {
        const tbody = entryRow.parentElement;
        const displayRow = document.createElement('tr');
        displayRow.className = 'data-display-row';
        const dateVal = entryRow.querySelector('input[type="date"]').value;
        let html = `<td>${currentRowIds[tabKey]}</td><td>${formatDate(dateVal)}</td>`;
        if (tabKey === 'upstream-fuels') {
            html += `<td>${entryRow.querySelector('.energy-type').value || '-'}</td>` +
                    `<td>${entryRow.querySelector('.sub-energy').value || '-'}</td>` +
                    `<td>${entryRow.querySelector('.quantity').value || '0.00'}</td>` +
                    `<td>${entryRow.querySelector('.unit-select').value || '-'}</td>` +
                    `<td>${(parseFloat(entryRow.querySelector('.ef').value)||0).toFixed(4)}</td>` +
                    `<td>${entryRow.querySelector('.ef-unit') ? entryRow.querySelector('.ef-unit').textContent : '-'}</td>` +
                    `<td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        } else if (tabKey === 'upstream-electricity') {
            html += `<td>Electricity</td><td>Grid electricity</td>` +
                    `<td>${entryRow.querySelector('.quantity').value || '0.00'}</td>` +
                    `<td>kWh</td>` +
                    `<td>${(parseFloat(entryRow.querySelector('.ef').value)||0).toFixed(2)}</td>` +
                    `<td>kgCO2/kWh</td>` +
                    `<td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        } else if (tabKey === 'tnd-losses') {
            html += `<td>Electricity</td><td>Grid electricity</td>` +
                    `<td>${entryRow.querySelector('.quantity').value || '0.00'}</td>` +
                    `<td>kWh</td>` +
                    `<td>${(parseFloat(entryRow.querySelector('.grid-ef').value)||0).toFixed(2)}</td>` +
                    `<td>${entryRow.querySelector('.tnd-rate').value || '0.00'}</td>` +
                    `<td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        } else if (tabKey === 'generation') {
            html += `<td>${entryRow.querySelector('.source-power').value || '-'}</td>` +
                    `<td>${entryRow.querySelector('.quantity').value || '0.00'}</td>` +
                    `<td>kWh</td>` +
                    `<td>${(parseFloat(entryRow.querySelector('.ef').value)||0).toFixed(4)}</td>` +
                    `<td>kgCO2/kWh</td>` +
                    `<td>${entryRow.querySelector('.total-emissions').textContent}</td>`;
        }
        html += `<td><button class="btn btn-danger btn-sm delete-btn">Delete</button></td>`;
        displayRow.innerHTML = html;
        tbody.insertBefore(displayRow, entryRow.nextSibling);
        currentRowIds[tabKey]++;
        entryRow.querySelector('td:first-child').textContent = currentRowIds[tabKey];
        setupDisplayRow(displayRow);
        clearEntryRow(entryRow);
    }

    function setupDisplayRow(row) {
        const del = row.querySelector('.delete-btn');
        if (del) del.addEventListener('click', () => row.remove());
    }

    function clearEntryRow(row) {
        const inputs = row.querySelectorAll('input');
        inputs.forEach(i => {
            if (i.type === 'date') { i.value = new Date().toISOString().split('T')[0]; }
            else { i.value = ''; }
        });
        const selects = row.querySelectorAll('select');
        selects.forEach(s => s.selectedIndex = 0);
        const totals = row.querySelector('.total-emissions'); if (totals) totals.textContent = '0.00';
    }

    function formatDate(d) { if (!d) return '-'; return new Date(d).toLocaleDateString(); }

    // Initialize when block is present (works whether DOM is already loaded or not)
    // Company/Unit Filter (UI only, no persistence wired yet)
    async function getUserContext(){ try { const r = await frappe.call({ method:'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' }); return r.message || { company:null, units:[], is_super:false }; } catch(e){ return { company:null, units:[], is_super:false }; } }
    function buildFilterBar(done){ const container = scopeRoot.querySelector('.fuel-energy-container'); if(!container){ done&&done(); return; } if(container.querySelector('.filter-bar')){ done&&done(); return; } const bar=document.createElement('div'); bar.className='filter-bar'; (async()=>{ try{ const ctx=await getUserContext(); const roles=(frappe&&frappe.get_roles)? frappe.get_roles():[]; const canShow = ctx.is_super || roles.includes('System Manager') || roles.includes('Super Admin'); if(!canShow){ done&&done(); return; } }catch(e){ done&&done(); return; } })(); bar.innerHTML = `<div style=\"display:flex; gap:12px; align-items:center; flex-wrap:nowrap; margin:8px 0;\"><div class=\"company-filter\" style=\"min-width:220px; display:flex; align-items:center; gap:8px;\"><label style=\"font-size:12px; margin:0; white-space:nowrap;\">Company</label><select class=\"form-control filter-company-select\" style=\"width:260px;\"></select></div><div class=\"unit-filter\" style=\"min-width:220px; display:flex; align-items:center; gap:8px;\"><label style=\"font-size:12px; margin:0; white-space:nowrap;\">Unit</label><select class=\"form-control filter-unit-select\" style=\"width:260px;\"></select></div><div><button type=\"button\" class=\"btn btn-secondary filter-apply-btn\">Apply</button></div></div>`; const header = container.querySelector('.page-header')||container.querySelector('.header-section'); if(header) header.insertAdjacentElement('afterend', bar); else container.prepend(bar); bar.querySelector('.filter-apply-btn')?.addEventListener('click', ()=>{ const csel=bar.querySelector('.filter-company-select'); const usel=bar.querySelector('.filter-unit-select'); selectedCompany=csel.value||null; selectedUnit=usel.value||null; }); done&&done(); }
    async function fetchCompanies(){ const r = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Company', fields:['name'], limit:500 } }); return (r.message||[]).map(x=>x.name); }
    async function fetchUnits(company){ const filters=company?{ company }:{}; const r=await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Units', fields:['name'], filters, limit:500 } }); return (r.message||[]).map(x=>x.name); }
    async function initializeFiltersFromContext(){ const ctx=await getUserContext(); const bar=scopeRoot.querySelector('.filter-bar'); if(!bar) return; const cSel=bar.querySelector('.filter-company-select'); const uSel=bar.querySelector('.filter-unit-select'); cSel.innerHTML=''; uSel.innerHTML=''; if(ctx.is_super){ const companies=await fetchCompanies(); cSel.innerHTML = `<option value=\"\">All Companies</option>` + companies.map(c=>`<option value=\"${c}\">${c}</option>`).join(''); cSel.addEventListener('change', async ()=>{ selectedCompany=cSel.value||null; const units=await fetchUnits(selectedCompany); uSel.innerHTML = `<option value=\"\">All Units</option>` + units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit=null; }); const initialUnits=await fetchUnits(null); uSel.innerHTML = `<option value=\"\">All Units</option>` + initialUnits.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedCompany=null; selectedUnit=null; } else { selectedCompany = ctx.company || null; cSel.innerHTML = `<option value=\"${selectedCompany||''}\">${selectedCompany||'-'}</option>`; cSel.disabled=true; let units=[]; if(ctx.units && ctx.units.length) units=ctx.units; else if(selectedCompany) units=await fetchUnits(selectedCompany); if(!units||!units.length){ uSel.innerHTML = `<option value=\"\">All Units</option>`; selectedUnit=null; } else { uSel.innerHTML = units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit = units.length===1 ? units[0] : units[0]; } uSel.disabled = !(ctx.units && ctx.units.length>1); } }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();


