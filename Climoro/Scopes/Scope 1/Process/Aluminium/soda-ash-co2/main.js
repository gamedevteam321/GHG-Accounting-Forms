(function(root_element){
  'use strict';

  if(!root_element){ console.error('Soda Ash: root element missing'); return; }

  const $ = (s)=> root_element.querySelector(s);
  const $$ = (s)=> root_element.querySelectorAll(s);
  const DOCTYPE = 'Soda Ash CO2 Emissions';

  let currentCompany = null;
  let nextSno = 1;

  async function init(){
    try{
      await fetchCompany();
      await loadUnits();
      setToday();
      attach();
      await loadHistory();
      updateSno();
    }catch(e){
      console.error('Init error:', e);
      frappe.msgprint({ title:'Error', indicator:'red', message:'Failed to initialize Soda Ash form.'});
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

  function attach(){
    ['qtyA','purityB','fractionC'].forEach(id=>{ const el=$('#'+id); if(el) el.addEventListener('input', compute); });
    $('#saveBtn').addEventListener('click', saveEntry);
  }

  function n(v){ const x=parseFloat(v); return isNaN(x)?0:x; }

  function compute(){
    const A = n($('#qtyA').value);
    const B = n($('#purityB').value);
    const C = n($('#fractionC').value);
    // Clamp B, C to [0,1] for calculation safety
    const Bc = Math.max(0, Math.min(1, B));
    const Cc = Math.max(0, Math.min(1, C));
    const D = A * Bc * Cc * (44/106);
    $('#co2D').textContent = (isFinite(D)?D:0).toFixed(4);
    return { A, B: Bc, C: Cc, D };
  }

  function validate(){
    const errs = [];
    if(!$('#entryDate').value) errs.push('Please select a date.');
    if(!$('#entryUnit').value) errs.push('Please select a unit.');
    if(!(n($('#qtyA').value) > 0)) errs.push('Quantity (A) must be greater than 0.');
    const B = n($('#purityB').value), C = n($('#fractionC').value);
    if(B < 0 || B > 1) errs.push('Purity (B) must be between 0 and 1.');
    if(C < 0 || C > 1) errs.push('Fraction calcination (C) must be between 0 and 1.');
    if(errs.length){ frappe.msgprint({ title:'Validation', indicator:'red', message: errs.join('<br>') }); return false; }
    return true;
  }

  async function saveEntry(){
    if(!validate()) return;
    const { D } = compute();
    const payload = {
      doctype: DOCTYPE,
      date: $('#entryDate').value,
      company: currentCompany,
      unit: $('#entryUnit').value,
      a_qty_t: n($('#qtyA').value),
      b_purity: n($('#purityB').value),
      c_fraction: n($('#fractionC').value),
      co2_t: D
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
    ['entryUnit','qtyA','purityB','fractionC'].forEach(id=>{ const el=$('#'+id); if(el) el.value=''; });
    $('#co2D').textContent = '0.0000';
  }

  async function loadHistory(){
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype: DOCTYPE, filters:{ company: currentCompany }, fields:['name','date','unit','a_qty_t','b_purity','c_fraction','co2_t'], order_by:'date desc, creation desc', limit_page_length:0 } });
    const entries = res.message || [];
    renderHistory(entries);
    nextSno = entries.length + 1;
  }

  function renderHistory(entries){
    const hb = $('#historyRowsBody');
    if(!hb) return;
    if(entries.length === 0){ hb.innerHTML = `<tr class="no-history-row"><td colspan="8" style="text-align:center; padding:1rem; color:#64748b;"><em>No entries yet. Add your first entry above.</em></td></tr>`; return; }
    hb.innerHTML = entries.map((e,idx)=>`
      <tr class="history-inline-row">
        <td>${entries.length - idx}</td>
        <td>${fmtDate(e.date)}</td>
        <td>${e.unit}</td>
        <td>${fx(e.a_qty_t,4)}</td>
        <td>${fx(e.b_purity,4)}</td>
        <td>${fx(e.c_fraction,4)}</td>
        <td><strong>${fx(e.co2_t,4)}</strong></td>
        <td><button class="btn btn-danger" onclick="deleteEntry_${root_element.id || 'soda'}('${e.name}')">Delete</button></td>
      </tr>
    `).join('');
  }

  function fmtDate(s){ if(!s) return '-'; const d=new Date(s); return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
  function fx(v, p=4){ const n=parseFloat(v); return isNaN(n)?'-':n.toFixed(p); }
  function updateSno(){ const el=$('#currentSno'); if(el) el.textContent=nextSno; }

  async function deleteEntry(name){
    frappe.confirm('Delete this entry?', async ()=>{
      try{ await frappe.call({ method:'frappe.client.delete', args:{ doctype: DOCTYPE, name } }); await loadHistory(); frappe.msgprint({ title:'Deleted', indicator:'green', message:'Entry deleted.' }); nextSno=Math.max(1,nextSno-1); updateSno(); }
      catch(e){ frappe.msgprint({ title:'Error', indicator:'red', message:'Failed to delete entry.' }); }
    });
  }

  window[`deleteEntry_${root_element.id || 'soda'}`] = deleteEntry;
  init();
})(root_element);
