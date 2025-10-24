(function(root_element){
    'use strict';

    if(!root_element){ console.error('Default CO2: root_element missing'); return; }

    const $ = (s)=> root_element.querySelector(s);
    const $$ = (s)=> root_element.querySelectorAll(s);

    const DOCTYPE = 'Default CO2 Emissions';
    const DEFAULT_EF = { Soderberg: 1.7, Prebake: 1.6 };

    let currentCompany = null;
    let units = [];
    let nextSno = 1;

    async function init(){
        try{
            await fetchCompany();
            await loadUnits();
            cacheElements();
            attachEvents();
            setToday();
            await loadHistory();
            updateSno();
            console.log('Default CO2 form initialized');
        }catch(e){
            console.error('Init error:', e);
            frappe.msgprint({ title:'Error', indicator:'red', message:'Failed to initialize Default CO2 form.'});
        }
    }

    function cacheElements(){
        state.entryDate = $('#entryDate');
        state.entryUnit = $('#entryUnit');
        state.entryType = $('#entryType');
        state.entryWeight = $('#entryWeight');
        state.entryDefaultEF = $('#entryDefaultEF');
        state.entryCustomEF = $('#entryCustomEF');
        state.entryEFUsed = $('#entryEFUsed');
        state.entryCO2 = $('#entryCO2');
        state.saveBtn = $('#saveBtn');
        state.historyBody = $('#historyRowsBody');
        state.sno = $('#currentSno');
    }

    const state = {};

    async function fetchCompany(){
        const user = await frappe.call({
            method: 'frappe.client.get_value',
            args: { doctype: 'User', filters: { name: frappe.session.user }, fieldname: ['name'] }
        });
        const companies = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Company', fields:['name'], limit_page_length:1 } });
        currentCompany = companies.message?.[0]?.name || null;
        if(!currentCompany) throw new Error('No company found');
    }

    async function loadUnits(){
        const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Units', filters:{ company: currentCompany }, fields:['name'], limit_page_length:0 } });
        units = res.message || [];
        const sel = $('#entryUnit');
        sel.innerHTML = '<option value="">-- Unit --</option>' + units.map(u=>`<option value="${u.name}">${u.name}</option>`).join('');
    }

    function setToday(){
        const today = new Date().toISOString().split('T')[0];
        $('#entryDate').value = today;
    }

    function attachEvents(){
        $('#entryType').addEventListener('change', updateDefaultEF);
        $('#entryWeight').addEventListener('input', compute);
        $('#entryCustomEF').addEventListener('input', compute);
        $('#saveBtn').addEventListener('click', saveEntry);
    }

    function updateDefaultEF(){
        const t = $('#entryType').value;
        const def = t ? DEFAULT_EF[t] : null;
        state.entryDefaultEF.textContent = def != null ? def.toFixed(3) : '-';
        compute();
    }

    function compute(){
        const weight = parseFloat(state.entryWeight.value) || 0;
        const type = state.entryType.value;
        const def = type ? DEFAULT_EF[type] : 0;
        const custom = parseFloat(state.entryCustomEF.value);
        const efUsed = (!isNaN(custom) && custom > 0) ? custom : def;

        state.entryEFUsed.textContent = efUsed > 0 ? efUsed.toFixed(3) : '-';
        const co2 = efUsed > 0 ? (weight * efUsed) : 0;
        state.entryCO2.textContent = co2.toFixed(2);
        return { efUsed, co2 };
    }

    function validate(){
        const date = state.entryDate.value;
        const unit = state.entryUnit.value;
        const type = state.entryType.value;
        const weight = parseFloat(state.entryWeight.value);
        const custom = parseFloat(state.entryCustomEF.value);
        const errors = [];
        if(!date) errors.push('Please select a date.');
        if(!unit) errors.push('Please select a unit.');
        if(!type) errors.push('Please select a type.');
        if(!(weight > 0)) errors.push('Weight must be a positive number.');
        if(!isNaN(custom) && custom <= 0) errors.push('Custom EF must be a positive number.');
        if(errors.length){
            frappe.msgprint({ title:'Validation', indicator:'red', message: errors.join('<br>') });
            return false;
        }
        return true;
    }

    async function saveEntry(){
        if(!validate()) return;
        const { efUsed, co2 } = compute();
        const payload = {
            doctype: DOCTYPE,
            date: state.entryDate.value,
            company: currentCompany,
            unit: state.entryUnit.value,
            type: state.entryType.value,
            weight_al_t: parseFloat(state.entryWeight.value),
            default_ef: DEFAULT_EF[state.entryType.value] || null,
            custom_ef: state.entryCustomEF.value ? parseFloat(state.entryCustomEF.value) : null,
            ef_used: efUsed,
            co2_t: co2
        };
        try{
            await frappe.call({ method:'frappe.client.insert', args:{ doc: payload } });
            frappe.msgprint({ title:'Success', indicator:'green', message:'Entry saved.' });
            resetForm();
            await loadHistory();
            nextSno++; updateSno();
        }catch(e){
            console.error('Save error', e);
            frappe.msgprint({ title:'Error', indicator:'red', message:'Failed to save entry.' });
        }
    }

    function resetForm(){
        setToday();
        state.entryUnit.value = '';
        state.entryType.value = '';
        state.entryWeight.value = '';
        state.entryDefaultEF.textContent = '-';
        state.entryCustomEF.value = '';
        state.entryEFUsed.textContent = '-';
        state.entryCO2.textContent = '0.00';
    }

    async function loadHistory(){
        const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype: DOCTYPE, filters:{ company: currentCompany }, fields:['name','date','unit','type','weight_al_t','ef_used','co2_t'], order_by:'date desc, creation desc', limit_page_length:0 } });
        const entries = res.message || [];
        renderHistory(entries);
        nextSno = entries.length + 1;
    }

    function renderHistory(entries){
        const hb = state.historyBody;
        if(!hb) return;
        if(entries.length === 0){
            hb.innerHTML = `<tr class="no-history-row"><td colspan="10" style="text-align:center; padding:1rem; color:#64748b;"><em>No entries yet. Add your first entry above.</em></td></tr>`;
            return;
        }
        hb.innerHTML = entries.map((e, idx)=>`
            <tr class="history-inline-row">
                <td>${entries.length - idx}</td>
                <td>${formatDate(e.date)}</td>
                <td>${e.unit}</td>
                <td>${e.type}</td>
                <td>${num(e.weight_al_t)}</td>
                <td>${efForType(e.type)}</td>
                <td>-</td>
                <td>${num(e.ef_used)}</td>
                <td><strong>${num(e.co2_t)}</strong></td>
                <td><button class="btn btn-danger" onclick="deleteEntry_${root_element.id || 'defco2'}('${e.name}')">Delete</button></td>
            </tr>
        `).join('');
    }

    function efForType(t){
        const v = DEFAULT_EF[t];
        return (v!=null) ? v.toFixed(3) : '-';
    }

    function num(v){ const n = parseFloat(v); return isNaN(n) ? '-' : n.toFixed(2); }
    function formatDate(s){ if(!s) return '-'; const d = new Date(s); return d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }); }
    function updateSno(){ if(state.sno) state.sno.textContent = nextSno; }

    async function deleteEntry(name){
        frappe.confirm('Delete this entry?', async ()=>{
            try{
                await frappe.call({ method:'frappe.client.delete', args:{ doctype: DOCTYPE, name } });
                await loadHistory();
                frappe.msgprint({ title:'Deleted', indicator:'green', message:'Entry deleted.' });
                nextSno = Math.max(1, nextSno-1); updateSno();
            }catch(e){
                frappe.msgprint({ title:'Error', indicator:'red', message:'Failed to delete entry.'});
            }
        });
    }

    const uniq = root_element.id || 'defco2';
    window[`deleteEntry_${uniq}`] = deleteEntry;

    init();
})(root_element);
