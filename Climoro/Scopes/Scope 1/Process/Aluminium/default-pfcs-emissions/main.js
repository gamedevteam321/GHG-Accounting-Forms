(function(root_element){
  'use strict';

  if(!root_element){ console.error('Default PFCS: root element missing'); return; }

  const $ = (s)=> root_element.querySelector(s);
  const $$ = (s)=> root_element.querySelectorAll(s);
  const ENTRY_DTYPE = 'Default PFC Emissions';
  const EF_DTYPE = 'Default PFC EF Defaults';

  let currentCompany = null; let sno = 1;

  async function init(){
    await fetchCompany();
    await loadUnits();
    setToday('#date'); updateSno();
    attach();
    await loadHistory();
  }

  async function fetchCompany(){
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Company', fields:['name'], limit_page_length:1 } });
    currentCompany = res.message?.[0]?.name || null;
  }

  async function loadUnits(){
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Units', filters:{ company: currentCompany }, fields:['name'], limit_page_length:0 } });
    const units = res.message || [];
    const sel = $('#unit');
    sel.innerHTML = '<option value="">-- Unit --</option>' + units.map(u=>`<option value="${u.name}">${u.name}</option>`).join('');
  }

  function setToday(id){ $(id).value = new Date().toISOString().split('T')[0]; }
  function updateSno(){ $('#sno').textContent = sno; }
  function n(v){ const x = parseFloat(v); return isNaN(x)?0:x; }
  function fx(v){ return (isFinite(v)?v:0).toFixed(4); }

  function attach(){
    ['#technology','#production'].forEach(id=>{
      $(id).addEventListener('input', compute);
      $(id).addEventListener('change', compute);
    });
    $('#saveBtn').addEventListener('click', saveEntry);
  }

  async function resolveEFs(tech){
    if(!tech) return { ef_cf4:0, ef_c2f6:0 };
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:EF_DTYPE, filters:{ technology: tech }, fields:['ef_cf4_kg_tal','ef_c2f6_kg_tal'], limit_page_length:1 } });
    const row = res.message?.[0] || {};
    return { ef_cf4: row.ef_cf4_kg_tal||0, ef_c2f6: row.ef_c2f6_kg_tal||0 };
  }

  async function compute(){
    const tech = $('#technology').value; const A = n($('#production').value);
    const {ef_cf4, ef_c2f6} = await resolveEFs(tech);
    $('#ef_cf4').textContent = ef_cf4?ef_cf4.toFixed(4):'-';
    $('#ef_c2f6').textContent = ef_c2f6?ef_c2f6.toFixed(4):'-';
    const B = A * ef_cf4; $('#cf4_kg').textContent = fx(B);
    const C = A * ef_c2f6; $('#c2f6_kg').textContent = fx(C);
    const D = ((B*6630)+(C*11100))/1000; $('#total_co2').textContent = fx(D);
  }

  async function saveEntry(){
    const date=$('#date').value, unit=$('#unit').value, tech=$('#technology').value; const A=n($('#production').value);
    if(!date||!unit||!tech||!(A>0)){ frappe.msgprint('Please fill Date, Unit, Technology and a valid production amount.'); return; }
    await compute();
    const payload = {
      doctype: ENTRY_DTYPE, company: currentCompany, date, unit, technology: tech,
      production_t: A, ef_cf4_kg_tal: n($('#ef_cf4').textContent), cf4_kg: n($('#cf4_kg').textContent),
      ef_c2f6_kg_tal: n($('#ef_c2f6').textContent), c2f6_kg: n($('#c2f6_kg').textContent), total_co2_t: n($('#total_co2').textContent)
    };
    await frappe.call({ method:'frappe.client.insert', args:{ doc: payload } });
    frappe.msgprint({ title:'Saved', indicator:'green', message:'Entry saved.'});
    await loadHistory(); sno++; updateSno();
  }

  async function loadHistory(){
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:ENTRY_DTYPE, filters:{ company: currentCompany }, fields:['name','date','unit','technology','production_t','ef_cf4_kg_tal','cf4_kg','ef_c2f6_kg_tal','c2f6_kg','total_co2_t'], order_by:'creation desc', limit_page_length:0 } });
    const entries = res.message||[]; const tbody = $('#historyBody');
    if(entries.length===0){ tbody.innerHTML = `<tr class="no-history-row"><td colspan="11" style="text-align:center; padding:1rem; color:#64748b;"><em>No entries yet.</em></td></tr>`; return; }
    tbody.innerHTML = entries.map((e,idx)=>`
      <tr>
        <td>${entries.length-idx}</td>
        <td>${fmtDate(e.date)}</td>
        <td>${e.unit}</td>
        <td>${e.technology}</td>
        <td>${fx(e.production_t)}</td>
        <td>${fx(e.ef_cf4_kg_tal)}</td>
        <td>${fx(e.cf4_kg)}</td>
        <td>${fx(e.ef_c2f6_kg_tal)}</td>
        <td>${fx(e.c2f6_kg)}</td>
        <td>${fx(e.total_co2_t)}</td>
        <td><button class="btn btn-danger" onclick="deleteEntry_${root_element.id||'defpfcs'}('${e.name}')">Delete</button></td>
      </tr>
    `).join('');
  }

  function fmtDate(s){ if(!s) return '-'; const d=new Date(s); return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }

  async function deleteEntry(name){
    frappe.confirm('Delete this entry?', async ()=>{
      await frappe.call({ method:'frappe.client.delete', args:{ doctype:ENTRY_DTYPE, name } });
      await loadHistory();
    });
  }
  window[`deleteEntry_${root_element.id||'defpfcs'}`] = deleteEntry;

  init();
})(root_element);


