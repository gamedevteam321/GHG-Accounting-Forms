(function(root_element){
  'use strict';

  if(!root_element){ console.error('Coke Calcination: root element missing'); return; }

  const $ = (s)=> root_element.querySelector(s);
  const $$ = (s)=> root_element.querySelectorAll(s);
  const DOCTYPE = 'Coke Calcination CO2 Emissions';

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
      frappe.msgprint({ title:'Error', indicator:'red', message:'Failed to initialize Coke Calcination form.'});
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
    ['gc','hgc','vgc','sgc','cc','scc','ucc','de'].forEach(id=>{
      const el = $('#'+id); if(el) el.addEventListener('input', compute);
    });
    $('#saveBtn').addEventListener('click', saveEntry);
  }

  function pct(v){ const n = parseFloat(v); return isNaN(n)?0:n; }
  function num(v){ const n = parseFloat(v); return isNaN(n)?0:n; }

  function compute(){
    const GC = num($('#gc').value);
    const Hgc = pct($('#hgc').value);
    const Vgc = pct($('#vgc').value);
    const Sgc = pct($('#sgc').value);
    const CC = num($('#cc').value);
    const Scc = pct($('#scc').value);
    const UCC = num($('#ucc').value);
    const DE = num($('#de').value);

    // Clamp percentages 0..100 for calc safety (display remains as entered)
    const clamp = (x)=> Math.max(0, Math.min(100, x));
    const termA = GC * (100 - clamp(Hgc) - clamp(Vgc) - clamp(Sgc)) / 100;
    const termB = (CC + UCC + DE) * (100 - clamp(Scc)) / 100;
    const E1 = (termA - termB) * (44/12);
    const E2 = GC * 0.035 * (44/16);
    const CO2 = (E1 + E2);

    $('#co2').textContent = (isFinite(CO2) ? CO2 : 0).toFixed(2);
    return { CO2 };
  }

  function validate(){
    const errs = [];
    if(!$('#entryDate').value) errs.push('Please select a date.');
    if(!$('#entryUnit').value) errs.push('Please select a unit.');
    if(!(num($('#gc').value) >= 0)) errs.push('GC must be zero or positive.');
    if(!(num($('#cc').value) >= 0)) errs.push('CC must be zero or positive.');
    ['hgc','vgc','sgc','scc'].forEach(id=>{
      const v = num($('#'+id).value); if(v<0 || v>100) errs.push(id.toUpperCase()+ ' must be between 0 and 100.');
    });
    if(errs.length){ frappe.msgprint({ title:'Validation', indicator:'red', message: errs.join('<br>') }); return false; }
    return true;
  }

  async function saveEntry(){
    if(!validate()) return;
    const { CO2 } = compute();
    const payload = {
      doctype: DOCTYPE,
      date: $('#entryDate').value,
      company: currentCompany,
      unit: $('#entryUnit').value,
      gc_t: num($('#gc').value),
      hgc_pct: num($('#hgc').value),
      vgc_pct: num($('#vgc').value),
      sgc_pct: num($('#sgc').value),
      cc_t: num($('#cc').value),
      scc_pct: num($('#scc').value),
      ucc_t: num($('#ucc').value),
      de_t: num($('#de').value),
      co2_t: CO2
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
    ['entryUnit','gc','hgc','vgc','sgc','cc','scc','ucc','de'].forEach(id=>{ const el=$('#'+id); if(el) el.value=''; });
    $('#co2').textContent = '0.00';
  }

  async function loadHistory(){
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype: DOCTYPE, filters:{ company: currentCompany }, fields:['name','date','unit','gc_t','hgc_pct','vgc_pct','sgc_pct','cc_t','scc_pct','ucc_t','de_t','co2_t'], order_by:'date desc, creation desc', limit_page_length:0 } });
    const entries = res.message || [];
    renderHistory(entries);
    nextSno = entries.length + 1;
  }

  function renderHistory(entries){
    const hb = $('#historyRowsBody');
    if(!hb) return;
    if(entries.length === 0){ hb.innerHTML = `<tr class="no-history-row"><td colspan="13" style="text-align:center; padding:1rem; color:#64748b;"><em>No entries yet. Add your first entry above.</em></td></tr>`; return; }
    hb.innerHTML = entries.map((e,idx)=>`
      <tr class="history-inline-row">
        <td>${entries.length - idx}</td>
        <td>${fmtDate(e.date)}</td>
        <td>${e.unit}</td>
        <td>${fix(e.gc_t)}</td>
        <td>${fix(e.hgc_pct)}</td>
        <td>${fix(e.vgc_pct)}</td>
        <td>${fix(e.sgc_pct)}</td>
        <td>${fix(e.cc_t)}</td>
        <td>${fix(e.scc_pct)}</td>
        <td>${fix(e.ucc_t)}</td>
        <td>${fix(e.de_t)}</td>
        <td><strong>${fix(e.co2_t)}</strong></td>
        <td><button class="btn btn-danger" onclick="deleteEntry_${root_element.id || 'cc'}('${e.name}')">Delete</button></td>
      </tr>
    `).join('');
  }

  function fmtDate(s){ if(!s) return '-'; const d=new Date(s); return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
  function fix(v){ const n=parseFloat(v); return isNaN(n)?'-':n.toFixed(2); }
  function updateSno(){ const el=$('#currentSno'); if(el) el.textContent = nextSno; }

  async function deleteEntry(name){
    frappe.confirm('Delete this entry?', async ()=>{
      try{ await frappe.call({ method:'frappe.client.delete', args:{ doctype: DOCTYPE, name } }); await loadHistory(); frappe.msgprint({ title:'Deleted', indicator:'green', message:'Entry deleted.' }); nextSno=Math.max(1,nextSno-1); updateSno(); }
      catch(e){ frappe.msgprint({ title:'Error', indicator:'red', message:'Failed to delete entry.' }); }
    });
  }

  window[`deleteEntry_${root_element.id || 'cc'}`] = deleteEntry;
  init();
})(root_element);
