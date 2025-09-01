(function(){
  const tbSpecific = root_element.querySelector('#di-tb-specific');
  const tbAverage = root_element.querySelector('#di-tb-average');
  let selectedCompany = null;
  let selectedUnit = null;
  const metaCache = {};

  async function hasField(doctype, fieldname){
    try{
      if(!metaCache[doctype]){
        const r = await frappe.call({ method: 'frappe.client.get', args: { doctype: 'DocType', name: doctype } });
        metaCache[doctype] = r.message || {};
      }
      const fields = metaCache[doctype].fields || [];
      return fields.some(f=> f.fieldname === fieldname);
    }catch(e){ return false; }
  }

  function saveRow(doctypeName, data){
    return new Promise((resolve, reject)=>{
      (async ()=>{
        const doc = Object.assign({}, data, { doctype: doctypeName });
        try{
          const ctx = await getUserContext();
          if (await hasField(doctypeName, 'company')) {
            doc.company = ctx.is_super ? (selectedCompany || ctx.company || null) : (ctx.company || null);
          }
          if (await hasField(doctypeName, 'company_unit')) {
            const chosenUnit = selectedUnit || (ctx.units && ctx.units.length === 1 ? ctx.units[0] : null);
            if (chosenUnit) doc.company_unit = chosenUnit;
          }
        }catch(e){}
        frappe.call({ method: 'frappe.client.insert', args: { doc }, callback: r => resolve(r.message), error: err => reject(err) });
      })();
    });
  }

  function hookRow(row){
    if(!row || row.dataset.hooked==='1') return;
    const share = row.querySelector('input[name="share"]');
    const scope1 = row.querySelector('input[name="scope1"]');
    const scope2 = row.querySelector('input[name="scope2"]');
    const cost = row.querySelector('input[name="cost"]');
    const eeio = row.querySelector('input[name="eeio_ef"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      const sh = parseFloat(share?.value||'0')||0;
      let base = 0;
      if (scope1 || scope2) {
        const s1 = parseFloat(scope1?.value||'0')||0;
        const s2 = parseFloat(scope2?.value||'0')||0;
        base = s1 + s2;
      } else {
        const c = parseFloat(cost?.value||'0')||0;
        const ef = parseFloat(eeio?.value||'0')||0;
        base = c * ef;
      }
      const val = base * (sh/100);
      if (co2e) co2e.value = val.toFixed(2);
    };
    [share, scope1, scope2, cost, eeio].forEach(i=> i?.addEventListener('input', recalc));
    row.querySelector('.add-btn')?.addEventListener('click', ()=> addFromEntry(row));
    row.dataset.hooked='1';
  }

  function appendDisplayRow(tbody, entry, values, doctypeName, docname){
    const tr = document.createElement('tr');
    tr.className='data-row';
    if (docname) tr.dataset.docname = docname;
    tr.innerHTML = values.map(v=>`<td>${v}</td>`).join('') + '<td class="actions"><button type="button" class="delete-row">Delete</button></td>';
    tr.querySelector('.delete-row')?.addEventListener('click', ()=>{
      if (!docname){ tr.remove(); return; }
      frappe.call({
        method: 'frappe.client.delete',
        args: { doctype: doctypeName, name: docname },
        callback: ()=> tr.remove(),
        error: ()=> frappe.show_alert({message:'Delete failed', indicator:'red'})
      });
    });
    if (entry.nextSibling) tbody.insertBefore(tr, entry.nextSibling); else tbody.appendChild(tr);
  }

  function addFromEntry(entry){
    const cells = Array.from(entry.querySelectorAll('td'));
    const values = cells.slice(0,-1).map(td=>{
      const inp = td.querySelector('input,select');
      return inp ? (inp.type==='number' ? (inp.value||'0') : (inp.value||'-')) : td.textContent;
    });
    const sNo = entry.querySelector('input[name="s_no"]');
    if (sNo) sNo.value = String((parseInt(sNo.value||'1',10)||1)+1);
    const tbody = entry.parentElement;
    const tId = tbody.getAttribute('id');
    let map;
    if (tId === 'di-tb-specific') map = { doctype: 'Downstream Debt Investments Project Specific Item' };
    else if (tId === 'di-tb-average') map = { doctype: 'Downstream Debt Investments Average Data Item' };
    if (!map) return;

    const data = {};
    entry.querySelectorAll('input,select').forEach(inp=>{ data[inp.name] = inp.value; });

    const btn = entry.querySelector('.add-btn');
    btn && (btn.disabled = true, btn.textContent = 'Saving...');
    saveRow(map.doctype, data).then((doc)=>{
      appendDisplayRow(tbody, entry, values, map.doctype, doc?.name);
      entry.querySelectorAll('input[type="number"]').forEach(i=>{ if(i.name!=='s_no') i.value=''; });
      frappe.show_alert({message: 'Saved', indicator: 'green'});
    }).catch(err=>{
      console.error('Save failed', err);
      frappe.show_alert({message: 'Save failed', indicator: 'red'});
    }).finally(()=>{
      if (btn){ btn.disabled = false; btn.textContent = '+ Add'; }
    });
  }

  [tbSpecific, tbAverage].forEach(t=> hookRow(t?.querySelector('.entry-row')));

  // ============ Company/Unit Filter Helpers ============
  async function getUserContext(){ try { const r = await frappe.call({ method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' }); return r.message || { company: null, units: [], is_super: false }; } catch(e){ return { company: null, units: [], is_super: false }; } }
  function buildFilterBar(done){ if (root_element.querySelector('.filter-bar')) { done && done(); return; } const bar = document.createElement('div'); bar.className='filter-bar'; (async ()=>{ try{ const ctx = await getUserContext(); const roles = (frappe && frappe.get_roles)? frappe.get_roles(): []; const canShow = ctx.is_super || roles.includes('System Manager') || roles.includes('Super Admin'); if(!canShow){ done&&done(); return; } }catch(e){ done&&done(); return; } })(); bar.innerHTML = `
    <div style="display:flex; gap:12px; align-items:center; flex-wrap:nowrap; margin:8px 0;">
      <div class="company-filter" style="min-width:220px; display:flex; align-items:center; gap:8px;">
        <label style="font-size:12px; margin:0; white-space:nowrap;">Company</label>
        <select class="form-control filter-company-select" style="width:260px;"></select>
      </div>
      <div class="unit-filter" style="min-width:220px; display:flex; align-items:center; gap:8px;">
        <label style="font-size:12px; margin:0; white-space:nowrap;">Unit</label>
        <select class="form-control filter-unit-select" style="width:260px;"></select>
      </div>
      <div>
        <button type="button" class="btn btn-secondary filter-apply-btn">Apply</button>
      </div>
    </div>`; const header = root_element.querySelector('.page-header') || root_element.querySelector('.header-section'); if (header) header.insertAdjacentElement('afterend', bar); else root_element.prepend(bar); bar.querySelector('.filter-apply-btn')?.addEventListener('click', ()=>{ const csel = bar.querySelector('.filter-company-select'); const usel = bar.querySelector('.filter-unit-select'); selectedCompany = csel.value || null; selectedUnit = usel.value || null; }); done && done(); }
  async function fetchCompanies(){ const r = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Company', fields:['name'], limit:500 } }); return (r.message||[]).map(x=>x.name); }
  async function fetchUnits(company){ const filters = company ? { company } : {}; const r = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Units', fields:['name'], filters, limit:500 } }); return (r.message||[]).map(x=>x.name); }
  async function initializeFiltersFromContext(){ const ctx = await getUserContext(); const bar = root_element.querySelector('.filter-bar'); if(!bar) return; const companySelect = bar.querySelector('.filter-company-select'); const unitSelect = bar.querySelector('.filter-unit-select'); companySelect.innerHTML=''; unitSelect.innerHTML=''; if(ctx.is_super){ const companies = await fetchCompanies(); companySelect.innerHTML = `<option value=\"\">All Companies</option>` + companies.map(c=>`<option value=\"${c}\">${c}</option>`).join(''); companySelect.addEventListener('change', async ()=>{ selectedCompany = companySelect.value || null; const units = await fetchUnits(selectedCompany); unitSelect.innerHTML = `<option value=\"\">All Units</option>` + units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit = null; }); const initialUnits = await fetchUnits(null); unitSelect.innerHTML = `<option value=\"\">All Units</option>` + initialUnits.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedCompany=null; selectedUnit=null; } else { selectedCompany = ctx.company || null; companySelect.innerHTML = `<option value=\"${selectedCompany||''}\">${selectedCompany||'-'}</option>`; companySelect.disabled = true; let units=[]; if(ctx.units && ctx.units.length) units=ctx.units; else if(selectedCompany) units = await fetchUnits(selectedCompany); if(!units || !units.length){ unitSelect.innerHTML = `<option value=\"\">All Units</option>`; selectedUnit=null; } else { unitSelect.innerHTML = units.map(u=>`<option value=\"${u}\">${u}</option>`).join(''); selectedUnit = units.length===1 ? units[0] : units[0]; } unitSelect.disabled = !(ctx.units && ctx.units.length>1); } }

  buildFilterBar(async ()=>{ await initializeFiltersFromContext(); });
  root_element.addEventListener('click', function(e){
    const btn = e.target.closest('.tab-button');
    if (!btn) return;
    e.preventDefault();
    const id = btn.getAttribute('data-tab');
    root_element.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
    root_element.querySelectorAll('.tab-content').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    root_element.querySelector(`#${id}`)?.classList.add('active');
  }, true);
})();


