(function(root_element){
  'use strict';

  if(!root_element){ console.error('Lime Production: root element missing'); return; }

  const $ = (s)=> root_element.querySelector(s);
  const $$ = (s)=> root_element.querySelectorAll(s);
  const DOCTYPE = 'Lime Production CO2 Emissions';

  const FIXED = { H: 0.10, H2O: 0.28, CF: 1.02 };
  const DEFAULTS = {
    'High-calcium': { stoich: 0.785, content: 0.95 },
    'Dolomitic':    { stoich: 0.913, content_dev: 0.95, content_devg: 0.85 },
    'Hydraulic':    { stoich: 0.785, content: 0.75 }
  };

  let currentCompany = null;
  let nextSno = 1;

  async function init(){
    try{
      await fetchCompany();
      await loadUnits();
      setFixedDisplays();
      setToday();
      attach();
      await loadHistory();
      updateSno();
    }catch(e){
      console.error('Init error:', e);
      frappe.msgprint({ title:'Error', indicator:'red', message:'Failed to initialize Lime Production form.'});
    }
  }

  async function fetchCompany(){
    const companies = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Company', fields:['name'], limit_page_length:1 } });
    currentCompany = companies.message?.[0]?.name || null;
    if(!currentCompany) throw new Error('No company found');
  }

  async function loadUnits(){
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Units', filters:{ company: currentCompany }, fields:['name'], limit_page_length:0 } });
    const units = res.message || [];
    const sel = $('#entryUnit');
    sel.innerHTML = '<option value="">-- Unit --</option>' + units.map(u=>`<option value="${u.name}">${u.name}</option>`).join('');
  }

  function setToday(){ $('#entryDate').value = new Date().toISOString().split('T')[0]; }
  function setFixedDisplays(){ $('#hVal').textContent = FIXED.H.toFixed(2); $('#h2oVal').textContent = FIXED.H2O.toFixed(2); $('#cfVal').textContent = FIXED.CF.toFixed(2); }

  function attach(){
    $('#limeType').addEventListener('change', onTypeChange);
    $('#countryType').addEventListener('change', compute);
    $('#amount').addEventListener('input', compute);
    $('#saveBtn').addEventListener('click', saveEntry);
  }

  function onTypeChange(){
    const type = $('#limeType').value;
    const countrySel = $('#countryType');
    if(type === 'Dolomitic'){
      countrySel.disabled = false;
    } else {
      countrySel.disabled = true;
    }
    applyDefaults();
    compute();
  }

  function applyDefaults(){
    const type = $('#limeType').value;
    const country = $('#countryType').value; // Developed / Developing
    let content = '-';
    let stoich = '-';

    if(type === 'High-calcium'){
      content = DEFAULTS['High-calcium'].content;
      stoich = DEFAULTS['High-calcium'].stoich;
    } else if(type === 'Dolomitic'){
      stoich = DEFAULTS['Dolomitic'].stoich;
      content = (country === 'Developing') ? DEFAULTS['Dolomitic'].content_devg : DEFAULTS['Dolomitic'].content_dev;
    } else if(type === 'Hydraulic'){
      content = DEFAULTS['Hydraulic'].content;
      stoich = DEFAULTS['Hydraulic'].stoich;
    }

    $('#content').textContent = (content === '-') ? '-' : Number(content).toFixed(2);
    $('#stoich').textContent = (stoich === '-') ? '-' : Number(stoich).toFixed(3);
  }

  function n(v){ const x=parseFloat(v); return isNaN(x)?0:x; }

  function compute(){
    const type = $('#limeType').value;
    if(!type){ $('#co2').textContent = '0.00'; return; }

    applyDefaults();

    const amount = n($('#amount').value);
    const content = parseFloat($('#content').textContent) || 0;
    const stoich = parseFloat($('#stoich').textContent) || 0;

    const base = (content * stoich) * amount;
    const hydration = (1 - (FIXED.H * FIXED.H2O));
    const co2 = base * hydration * FIXED.CF;

    $('#co2').textContent = (isFinite(co2)?co2:0).toFixed(2);
    return { amount, content, stoich, co2 };
  }

  function validate(){
    const errs = [];
    if(!$('#entryDate').value) errs.push('Please select a date.');
    if(!$('#entryUnit').value) errs.push('Please select a unit.');
    if(!$('#limeType').value) errs.push('Please select a lime type.');
    if($('#limeType').value === 'Dolomitic' && $('#countryType').disabled === false && !$('#countryType').value){
      errs.push('Please select a country type for Dolomitic lime.');
    }
    if(!(n($('#amount').value) > 0)) errs.push('Amount produced must be greater than 0.');
    if(errs.length){ frappe.msgprint({ title:'Validation', indicator:'red', message: errs.join('<br>') }); return false; }
    return true;
  }

  async function saveEntry(){
    if(!validate()) return;
    const { amount, content, stoich, co2 } = compute();
    const payload = {
      doctype: DOCTYPE,
      date: $('#entryDate').value,
      company: currentCompany,
      unit: $('#entryUnit').value,
      lime_type: $('#limeType').value,
      country_type: $('#limeType').value === 'Dolomitic' ? $('#countryType').value : null,
      amount_t: amount,
      content_frac: content,
      stoich_ratio: stoich,
      prop_h: FIXED.H,
      water_h2o: FIXED.H2O,
      cf: FIXED.CF,
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
    ['entryUnit','limeType','countryType','amount'].forEach(id=>{ const el=$('#'+id); if(el){ if(id==='countryType') el.disabled=true; el.value=''; } });
    $('#content').textContent='-'; $('#stoich').textContent='-'; $('#co2').textContent='0.00';
  }

  async function loadHistory(){
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype: DOCTYPE, filters:{ company: currentCompany }, fields:['name','date','unit','lime_type','country_type','amount_t','content_frac','stoich_ratio','prop_h','water_h2o','cf','co2_t'], order_by:'date desc, creation desc', limit_page_length:0 } });
    const entries = res.message || [];
    renderHistory(entries);
    nextSno = entries.length + 1;
  }

  function renderHistory(entries){
    const hb = $('#historyRowsBody');
    if(!hb) return;
    if(entries.length === 0){ hb.innerHTML = `<tr class=\"no-history-row\"><td colspan=\"13\" style=\"text-align:center; padding:1rem; color:#64748b;\"><em>No entries yet. Add your first entry above.</em></td></tr>`; return; }
    hb.innerHTML = entries.map((e,idx)=>`
      <tr class="history-inline-row">
        <td>${entries.length - idx}</td>
        <td>${fmtDate(e.date)}</td>
        <td>${e.unit}</td>
        <td>${e.lime_type}</td>
        <td>${e.lime_type==='Dolomitic' ? (e.country_type||'-') : '-'}</td>
        <td>${fx(e.amount_t,2)}</td>
        <td>${fx(e.content_frac,2)}</td>
        <td>${fx(e.stoich_ratio,3)}</td>
        <td>${fx(e.prop_h,2)}</td>
        <td>${fx(e.water_h2o,2)}</td>
        <td>${fx(e.cf,2)}</td>
        <td><strong>${fx(e.co2_t,2)}</strong></td>
        <td><button class="btn btn-danger" onclick="deleteEntry_${root_element.id || 'lime'}('${e.name}')">Delete</button></td>
      </tr>
    `).join('');
  }

  function fmtDate(s){ if(!s) return '-'; const d=new Date(s); return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
  function fx(v,p=2){ const n=parseFloat(v); return isNaN(n)?'-':n.toFixed(p); }
  function updateSno(){ const el=$('#currentSno'); if(el) el.textContent=nextSno; }

  async function deleteEntry(name){
    frappe.confirm('Delete this entry?', async ()=>{
      try{ await frappe.call({ method:'frappe.client.delete', args:{ doctype: DOCTYPE, name } }); await loadHistory(); frappe.msgprint({ title:'Deleted', indicator:'green', message:'Entry deleted.' }); nextSno=Math.max(1,nextSno-1); updateSno(); }
      catch(e){ frappe.msgprint({ title:'Error', indicator:'red', message:'Failed to delete entry.' }); }
    });
  }

  window[`deleteEntry_${root_element.id || 'lime'}`] = deleteEntry;
  init();
})(root_element);
