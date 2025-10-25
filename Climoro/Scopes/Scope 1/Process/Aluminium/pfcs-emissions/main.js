(function(root_element){
  'use strict';

  if(!root_element){ console.error('PFCs Emissions: root element missing'); return; }

  const $ = (s)=> root_element.querySelector(s);
  const $$ = (s)=> root_element.querySelectorAll(s);
  const ENTRY_DTYPE = 'PFC Emissions';
  const SLOPE_DTYPE = 'PFC Slope Defaults';
  const OV_DTYPE = 'PFC Overvoltage Defaults';

  // Tab switching
  $$('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.tab-btn').forEach(b=> b.classList.remove('active'));
      $$('.tab-panel').forEach(p=> p.classList.remove('active'));
      btn.classList.add('active');
      const id = btn.dataset.tab; $("#"+id).classList.add('active');
    });
  });

  // State
  let currentCompany = null;
  let slopeSno = 1, ovSno = 1;

  async function init(){
    await fetchCompany();
    await Promise.all([loadUnits('#slopeUnit'), loadUnits('#ovUnit')]);
    setToday('#slopeDate'); setToday('#ovDate');
    attachSlope(); attachOV();
    await Promise.all([loadSlopeHistory(), loadOVHistory()]);
    updateSno('#slopeSno', slopeSno); updateSno('#ovSno', ovSno);
  }

  async function fetchCompany(){
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Company', fields:['name'], limit_page_length:1 } });
    currentCompany = res.message?.[0]?.name || null;
  }

  async function loadUnits(selectId){
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Units', filters:{ company: currentCompany }, fields:['name'], limit_page_length:0 } });
    const units = res.message || [];
    const sel = $(selectId);
    sel.innerHTML = '<option value="">-- Unit --</option>' + units.map(u=>`<option value="${u.name}">${u.name}</option>`).join('');
  }

  function setToday(id){ $(id).value = new Date().toISOString().split('T')[0]; }
  function updateSno(id, n){ $(id).textContent = n; }
  function n(v){ const x = parseFloat(v); return isNaN(x)?0:x; }

  // --- Slope ---
  function attachSlope(){
    ['#slopeA2','#slopeB','#slopeB1','#slopeC1','#slopeE1','#slopeCellType'].forEach(id=>{
      $(id).addEventListener('input', computeSlope);
      $(id).addEventListener('change', computeSlope);
    });
    $('#slopeSave').addEventListener('click', saveSlope);
  }

  async function computeSlope(){
    const cellType = $('#slopeCellType').value;
    // Resolve defaults
    let usedCoeff = await getSlopeCoeff(cellType);
    let usedFrac = await getSlopeFrac(cellType);
    const c1 = n($('#slopeC1').value); if(c1>0) usedCoeff = c1;
    const e1 = $('#slopeE1').value!=='' ? n($('#slopeE1').value) : usedFrac; usedFrac = e1;
    $('#slopeC').textContent = usedCoeff ? usedCoeff.toFixed(3) : '-';
    $('#slopeE').textContent = usedFrac!==undefined ? usedFrac.toFixed(3) : '-';

    const A2 = n($('#slopeA2').value);
    const B = n($('#slopeB').value);
    const B1 = n($('#slopeB1').value);
    const B2 = (B1>0) ? (B / B1) : 0; $('#slopeB2').textContent = B2 ? B2.toFixed(3) : '-';
    const D = A2 * B2 * usedCoeff; $('#slopeD').textContent = D.toFixed(2);
    const F = D * usedFrac; $('#slopeF').textContent = F.toFixed(2);
    const G = (D*6.5) + (F*9.2); $('#slopeG').textContent = (isFinite(G)?G:0).toFixed(2);
  }

  async function getSlopeCoeff(cellType){
    if(!cellType) return 0;
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:SLOPE_DTYPE, filters:{ cell_type: cellType }, fields:['cf4_slope_coeff'], limit_page_length:1 } });
    return res.message?.[0]?.cf4_slope_coeff || 0;
  }
  async function getSlopeFrac(cellType){
    if(!cellType) return 0;
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:SLOPE_DTYPE, filters:{ cell_type: cellType }, fields:['weight_fraction_c2f6_cf4'], limit_page_length:1 } });
    return res.message?.[0]?.weight_fraction_c2f6_cf4 || 0;
  }

  async function saveSlope(){
    const unit = $('#slopeUnit').value; const date=$('#slopeDate').value; const cellType=$('#slopeCellType').value;
    if(!date||!unit||!cellType){ frappe.msgprint('Please fill Date, Unit, Type'); return; }
    await computeSlope();
    const payload = {
      doctype: ENTRY_DTYPE, method: 'Slope', company: currentCompany, unit, date, cell_type: cellType,
      production_t: n($('#slopeA2').value), aem_min_per_cell_day: n($('#slopeB').value), aef_per_cell_per_day: n($('#slopeB1').value),
      used_coeff: n($('#slopeC').textContent), used_weight_frac: n($('#slopeE').textContent),
      cf4_kg: n($('#slopeD').textContent), c2f6_kg: n($('#slopeF').textContent), co2_total_t: n($('#slopeG').textContent)
    };
    await frappe.call({ method:'frappe.client.insert', args:{ doc: payload } });
    frappe.msgprint({ title:'Saved', indicator:'green', message:'Slope entry saved.'});
    await loadSlopeHistory(); slopeSno++; updateSno('#slopeSno', slopeSno);
  }

  async function loadSlopeHistory(){
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:ENTRY_DTYPE, filters:{ company: currentCompany, method:'Slope' }, fields:['name','date','unit','cell_type','production_t','used_coeff','used_weight_frac','cf4_kg','c2f6_kg','co2_total_t'], order_by:'creation desc', limit_page_length:0 } });
    const entries = res.message || [];
    const tbody = $('#slopeHistory');
    if(entries.length===0){ tbody.innerHTML = `<tr class="no-history-row"><td colspan="14" style="text-align:center; padding:1rem; color:#64748b;"><em>No entries yet.</em></td></tr>`; return; }
    tbody.innerHTML = entries.map((e,idx)=>`
      <tr>
        <td>${entries.length-idx}</td>
        <td>${fmtDate(e.date)}</td>
        <td>${e.unit}</td>
        <td>${e.cell_type}</td>
        <td>${fx(e.production_t,2)}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>${fx(e.used_coeff,3)}</td>
        <td>${fx(e.cf4_kg,2)}</td>
        <td>${fx(e.used_weight_frac,3)}</td>
        <td>${fx(e.c2f6_kg,2)}</td>
        <td>${fx(e.co2_total_t,2)}</td>
        <td><button class="btn btn-danger" onclick="deleteEntry_${root_element.id||'pfcs'}('${e.name}')">Delete</button></td>
      </tr>`).join('');
  }

  // --- Overvoltage ---
  function attachOV(){
    ['#ovA2','#ovB1','#ovB2','#ovB3','#ovC1','#ovE1','#ovCellType'].forEach(id=>{
      $(id).addEventListener('input', computeOV);
      $(id).addEventListener('change', computeOV);
    });
    $('#ovSave').addEventListener('click', saveOV);
  }
  async function computeOV(){
    const cellType = $('#ovCellType').value;
    let usedCoeff = await getOVCoeff(cellType);
    let usedFrac = await getOVFrac(cellType);
    const c1 = n($('#ovC1').value); if(c1>0) usedCoeff = c1;
    const e1 = $('#ovE1').value!=='' ? n($('#ovE1').value) : usedFrac; usedFrac = e1;
    $('#ovC').textContent = usedCoeff ? usedCoeff.toFixed(2) : '-';
    $('#ovE').textContent = usedFrac!==undefined ? usedFrac.toFixed(3) : '-';
    const A2=n($('#ovA2').value), B2=n($('#ovB2').value), B3=n($('#ovB3').value);
    const D = (B3>0) ? ((A2*B2*usedCoeff)/B3) : 0; $('#ovD').textContent = D.toFixed(2);
    const F = D * usedFrac; $('#ovF').textContent = F.toFixed(2);
    const G = (D*6.5) + (F*9.2); $('#ovG').textContent = (isFinite(G)?G:0).toFixed(2);
  }
  async function getOVCoeff(cellType){
    if(!cellType) return 0;
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:OV_DTYPE, filters:{ cell_type: cellType }, fields:['cf4_overvoltage_coeff'], limit_page_length:1 } });
    return res.message?.[0]?.cf4_overvoltage_coeff || 0;
  }
  async function getOVFrac(cellType){
    if(!cellType) return 0;
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:OV_DTYPE, filters:{ cell_type: cellType }, fields:['weight_fraction_c2f6_cf4'], limit_page_length:1 } });
    return res.message?.[0]?.weight_fraction_c2f6_cf4 || 0;
  }
  async function saveOV(){
    const unit = $('#ovUnit').value; const date=$('#ovDate').value; const cellType=$('#ovCellType').value;
    if(!date||!unit||!cellType){ frappe.msgprint('Please fill Date, Unit, Type'); return; }
    await computeOV();
    const payload = {
      doctype: ENTRY_DTYPE, method: 'Overvoltage', company: currentCompany, unit, date, cell_type: cellType,
      production_t: n($('#ovA2').value), aef_eq2: n($('#ovB1').value), aeo_mv_per_cell: n($('#ovB2').value), current_eff_pct: n($('#ovB3').value),
      used_coeff: n($('#ovC').textContent), used_weight_frac: n($('#ovE').textContent),
      cf4_kg: n($('#ovD').textContent), c2f6_kg: n($('#ovF').textContent), co2_total_t: n($('#ovG').textContent)
    };
    await frappe.call({ method:'frappe.client.insert', args:{ doc: payload } });
    frappe.msgprint({ title:'Saved', indicator:'green', message:'Overvoltage entry saved.'});
    await loadOVHistory(); ovSno++; updateSno('#ovSno', ovSno);
  }
  async function loadOVHistory(){
    const res = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:ENTRY_DTYPE, filters:{ company: currentCompany, method:'Overvoltage' }, fields:['name','date','unit','cell_type','production_t','used_coeff','used_weight_frac','cf4_kg','c2f6_kg','co2_total_t'], order_by:'creation desc', limit_page_length:0 } });
    const entries = res.message || [];
    const tbody = $('#ovHistory');
    if(entries.length===0){ tbody.innerHTML = `<tr class="no-history-row"><td colspan="14" style="text-align:center; padding:1rem; color:#64748b;"><em>No entries yet.</em></td></tr>`; return; }
    tbody.innerHTML = entries.map((e,idx)=>`
      <tr>
        <td>${entries.length-idx}</td>
        <td>${fmtDate(e.date)}</td>
        <td>${e.unit}</td>
        <td>${e.cell_type}</td>
        <td>${fx(e.production_t,2)}</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td>${fx(e.used_coeff,2)}</td>
        <td>${fx(e.cf4_kg,2)}</td>
        <td>${fx(e.used_weight_frac,3)}</td>
        <td>${fx(e.c2f6_kg,2)}</td>
        <td>${fx(e.co2_total_t,2)}</td>
        <td><button class="btn btn-danger" onclick="deleteEntry_${root_element.id||'pfcs'}('${e.name}')">Delete</button></td>
      </tr>`).join('');
  }

  function fmtDate(s){ if(!s) return '-'; const d=new Date(s); return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); }
  function fx(v,p=2){ const x=parseFloat(v); return isNaN(x)?'-':x.toFixed(p); }

  async function deleteEntry(name){
    frappe.confirm('Delete this entry?', async ()=>{
      await frappe.call({ method:'frappe.client.delete', args:{ doctype:ENTRY_DTYPE, name } });
      await Promise.all([loadSlopeHistory(), loadOVHistory()]);
    });
  }

  window[`deleteEntry_${root_element.id||'pfcs'}`] = deleteEntry;

  init();
})(root_element);

