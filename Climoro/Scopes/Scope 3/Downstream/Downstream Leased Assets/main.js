(function(){
  const tbAsset = root_element.querySelector('#dla-tb-asset');
  const tbLessee = root_element.querySelector('#dla-tb-lessee');
  const tbAvg = root_element.querySelector('#dla-tb-average');
  let selectedCompany = null;
  let selectedUnit = null;
  let selectedDateFrom = null;
  let selectedDateTo = null;
  let isFilterVisible = false;

  function saveRow(doctypeName, data){
    return new Promise((resolve, reject)=>{
      (async ()=>{ const doc = Object.assign({}, data, { doctype: doctypeName }); try { const ctx = await getUserContext(); if (ctx.is_super) { if (selectedCompany) doc.company = selectedCompany; if (selectedUnit) { doc.company_unit = selectedUnit; } } else if (ctx.company) { doc.company = ctx.company; if (selectedUnit) { doc.company_unit = selectedUnit; } else if (ctx.units && ctx.units.length === 1) { doc.company_unit = ctx.units[0]; } } } catch(e){} frappe.call({ method: 'frappe.client.insert', args: { doc }, callback: r => resolve(r.message), error: err => reject(err) }); })();
    });
  }

  function hookRow(row){
    if(!row || row.dataset.hooked==='1') return;
    const activity = row.querySelector('input[name="activity"]');
    const ef = row.querySelector('input[name="ef"], input[name="avg_ef"]');
    const share = row.querySelector('input[name="share"]');
    const lesseeEmission = row.querySelector('input[name="lessee_emission"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      let val = 0;
      if (lesseeEmission) {
        const e = parseFloat(lesseeEmission.value||'0')||0;
        const s = parseFloat(share?.value||'0')||0;
        val = e * (s/100);
      } else {
        const a = parseFloat(activity?.value||'0')||0;
        const f = parseFloat((ef?.value)||'0')||0;
        val = a * f;
      }
      if (co2e) co2e.value = val.toFixed(2);
    };
    [activity, ef, share, lesseeEmission].forEach(i=> i?.addEventListener('input', recalc));
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
    const btn = entry.querySelector('.add-btn');
    const tbody = entry.parentElement;
    const tId = tbody.getAttribute('id');
    let map;
    if (tId === 'dla-tb-asset') map = { doctype: 'Downstream Leased Assets Asset Specific Item' };
    else if (tId === 'dla-tb-lessee') map = { doctype: 'Downstream Leased Assets Lessee Specific Item' };
    else if (tId === 'dla-tb-average') map = { doctype: 'Downstream Leased Assets Average Data Item' };
    if (!map) return;

    const data = {};
    entry.querySelectorAll('input,select').forEach(inp=>{
      const key = inp.name === 'desc' ? 'desc' : (inp.name === 'asset_type' ? 'asset_type' : (inp.name === 'asset_id' ? 'asset_id' : (inp.name === 'lessee_emission' ? 'lessee_emission' : (inp.name === 'avg_ef' ? 'avg_ef' : (inp.name === 's_no' ? 's_no' : inp.name)))));
      data[key] = inp.value;
    });

    btn && (btn.disabled = true, btn.textContent = 'Saving...');
    saveRow(map.doctype, data).then((doc)=>{
      const cells = Array.from(entry.querySelectorAll('td'));
      const values = cells.slice(0,-1).map(td=>{
        const inp = td.querySelector('input,select');
        return inp ? (inp.type==='number' ? (inp.value||'0') : (inp.value||'-')) : td.textContent;
      });
      const sNo = entry.querySelector('input[name="s_no"]');
      if (sNo) sNo.value = String((parseInt(sNo.value||'1',10)||1)+1);
      appendDisplayRow(tbody, entry, values, map.doctype, doc?.name);
      entry.querySelectorAll('input[type="number"]').forEach(i=>{ if(i.name!=='s_no') i.value=''; });
      const co2e = entry.querySelector('input[name="co2e"]'); if (co2e) co2e.value='';
      frappe.show_alert({message: 'Saved', indicator: 'green'});
    }).catch(err=>{
      console.error('Save failed', err);
      frappe.show_alert({message: 'Save failed', indicator: 'red'});
    }).finally(()=>{
      if (btn){ btn.disabled = false; btn.textContent = '+ Add'; }
    });
  }

  [tbAsset, tbLessee, tbAvg].forEach(t=> hookRow(t?.querySelector('.entry-row')));

  // Helper to apply client-side date filtering
  function applyDateFilter(records) {
    if (!selectedDateFrom && !selectedDateTo) {
      return records;
    }
    
    console.log('Downstream Leased Assets: Applying client-side date filtering...');
    console.log('Date filters - From:', selectedDateFrom, 'To:', selectedDateTo);
    
    return records.filter(record => {
      const recordDate = new Date(record.date);
      let includeRecord = true;
      
      if (selectedDateFrom) {
        const fromDate = new Date(selectedDateFrom);
        includeRecord = includeRecord && recordDate >= fromDate;
        console.log(`Record ${record.name} date ${record.date} >= ${selectedDateFrom}:`, recordDate >= fromDate);
      }
      
      if (selectedDateTo) {
        const toDate = new Date(selectedDateTo);
        includeRecord = includeRecord && recordDate <= toDate;
        console.log(`Record ${record.name} date ${record.date} <= ${selectedDateTo}:`, recordDate <= toDate);
      }
      
      console.log(`Record ${record.name} included:`, includeRecord);
      return includeRecord;
    });
  }

  function loadExisting(){
    const specs = [
      { tbody: tbAsset, doctype: 'Downstream Leased Assets Asset Specific Item', fields: ['name','s_no','date','asset_id','source','activity','unit','ef','ef_unit','co2e'] },
      { tbody: tbLessee, doctype: 'Downstream Leased Assets Lessee Specific Item', fields: ['name','s_no','date','asset_id','lessee_emission','unit','share','co2e'] },
      { tbody: tbAvg, doctype: 'Downstream Leased Assets Average Data Item', fields: ['name','s_no','date','asset_type','desc','activity','unit','avg_ef','ef_unit','co2e'] },
    ];
    specs.forEach(async spec =>{
      if (!spec.tbody) return;
      const ctx = await getUserContext();
      const filters = {};
      if (ctx.is_super) { if (selectedCompany) filters.company = selectedCompany; if (selectedUnit) filters.company_unit = selectedUnit; }
      else if (ctx.company) { filters.company = ctx.company; if (selectedUnit) filters.company_unit = selectedUnit; }
      frappe.call({
        method: 'frappe.client.get_list',
        args: { doctype: spec.doctype, fields: spec.fields, limit_page_length: 500, order_by: 'creation asc', filters },
        callback: r => {
          if (r.message && r.message.length > 0) {
            // Apply client-side date filtering
            const filteredRecords = applyDateFilter(r.message);
            console.log(`Downstream Leased Assets: Original records: ${r.message.length}, Filtered records: ${filteredRecords.length}`);
            
            const entry = spec.tbody.querySelector('.entry-row');
            filteredRecords.forEach(doc =>{
              const values = spec.fields.filter(f=> f!=='name').map(f=> doc[f] ?? '-');
              appendDisplayRow(spec.tbody, entry, values, spec.doctype, doc.name);
            });
          }
        }
      });
    });
  }

  buildFilterBar(async ()=>{ await initializeFiltersFromContext(); loadExisting(); });

  // Tabs
  root_element.addEventListener('click', function(e){
    const btn = e.target.closest('.tab-button');
    if(!btn) return;
    e.preventDefault();
    const id = btn.getAttribute('data-tab');
    root_element.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
    root_element.querySelectorAll('.tab-content').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    root_element.querySelector(`#${id}`)?.classList.add('active');
  }, true);

  // ============ Company/Unit Filter Helpers ============
  async function getUserContext(){ try { const r = await frappe.call({ method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' }); return r.message || { company: null, units: [], is_super: false }; } catch(e){ return { company: null, units: [], is_super: false }; } }
  function buildFilterBar(done){ 
    if (root_element.querySelector('.filter-bar')) { 
      done && done(); 
      return; 
    } 
    const bar = document.createElement('div'); 
    bar.className='filter-bar'; 
    (async ()=>{ 
      try{ 
        const ctx = await getUserContext(); 
        const roles = (frappe && frappe.get_roles)? frappe.get_roles(): []; 
        const canShow = ctx.is_super || roles.includes('System Manager') || roles.includes('Super Admin'); 
        if(!canShow){ 
          done&&done(); 
          return; 
        } 
      }catch(e){ 
        done&&done(); 
        return; 
      } 
    })(); 
    bar.innerHTML = `
      <div class="filter-header">
        <h3>Filters</h3>
        <button type="button" class="filter-toggle-btn">
          <i class="fa fa-plus"></i>
        </button>
      </div>
      <div class="filter-content" style="display: none;">
        <div class="filter-row">
          <div class="filter-group">
            <label>Company</label>
            <select class="form-control filter-company-select">
              <option value="">All Companies</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Unit</label>
            <select class="form-control filter-unit-select">
              <option value="">All Units</option>
            </select>
          </div>
          <div class="filter-group">
            <label>From Date</label>
            <input type="date" class="form-control date-from-input">
          </div>
          <div class="filter-group">
            <label>To Date</label>
            <input type="date" class="form-control date-to-input">
          </div>
          <div class="filter-actions">
            <button type="button" class="btn filter-apply-btn">Apply</button>
            <button type="button" class="btn filter-clear-btn">Clear Dates</button>
          </div>
        </div>
      </div>
    `; 
    const header = root_element.querySelector('.page-header') || root_element.querySelector('.header-section'); 
    if (header) header.insertAdjacentElement('afterend', bar); 
    else root_element.prepend(bar); 
    
    // Apply button event listener
    bar.querySelector('.filter-apply-btn')?.addEventListener('click', ()=>{
      const csel = bar.querySelector('.filter-company-select');
      const usel = bar.querySelector('.filter-unit-select');
      const fromDate = bar.querySelector('.date-from-input');
      const toDate = bar.querySelector('.date-to-input');
      
      selectedCompany = csel.value || null;
      selectedUnit = usel.value || null;
      selectedDateFrom = fromDate.value || null;
      selectedDateTo = toDate.value || null;
      
      console.log('Downstream Leased Assets Filter values:', {
        company: selectedCompany,
        unit: selectedUnit,
        dateFrom: selectedDateFrom,
        dateTo: selectedDateTo
      });
      
      // reload all tables
      [tbAsset, tbLessee, tbAvg].forEach(tb => tb?.querySelectorAll('.data-row').forEach(r=>r.remove()));
      loadExisting();
    });
    
    // Clear dates button event listener
    bar.querySelector('.filter-clear-btn')?.addEventListener('click', ()=>{
      const fromDate = bar.querySelector('.date-from-input');
      const toDate = bar.querySelector('.date-to-input');
      
      fromDate.value = '';
      toDate.value = '';
      selectedDateFrom = null;
      selectedDateTo = null;
      
      console.log('Downstream Leased Assets Date filters cleared');
      [tbAsset, tbLessee, tbAvg].forEach(tb => tb?.querySelectorAll('.data-row').forEach(r=>r.remove()));
      loadExisting();
    });
    
    // Toggle button event listener
    bar.querySelector('.filter-toggle-btn')?.addEventListener('click', ()=>{
      const content = bar.querySelector('.filter-content');
      const icon = bar.querySelector('.filter-toggle-btn i');
      
      isFilterVisible = !isFilterVisible;
      
      if (isFilterVisible) {
        content.style.display = 'block';
        icon.className = 'fa fa-minus';
      } else {
        content.style.display = 'none';
        icon.className = 'fa fa-plus';
      }
    });
    
    done && done(); 
  }
  async function fetchCompanies(){ const r = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Company', fields:['name'], limit:500 } }); return (r.message||[]).map(x=>x.name); }
  async function fetchUnits(company){ const filters = company ? { company } : {}; const r = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Units', fields:['name'], filters, limit:500 } }); return (r.message||[]).map(x=>x.name); }
  async function initializeFiltersFromContext(){ const ctx = await getUserContext(); const bar = root_element.querySelector('.filter-bar'); if(!bar) return; const companySelect = bar.querySelector('.filter-company-select'); const unitSelect = bar.querySelector('.filter-unit-select'); companySelect.innerHTML=''; unitSelect.innerHTML=''; if(ctx.is_super){ const companies = await fetchCompanies(); companySelect.innerHTML = `<option value="">All Companies</option>` + companies.map(c=>`<option value="${c}">${c}</option>`).join(''); companySelect.addEventListener('change', async ()=>{ selectedCompany = companySelect.value || null; const units = await fetchUnits(selectedCompany); unitSelect.innerHTML = `<option value="">All Units</option>` + units.map(u=>`<option value="${u}">${u}</option>`).join(''); selectedUnit = null; }); const initialUnits = await fetchUnits(null); unitSelect.innerHTML = `<option value="">All Units</option>` + initialUnits.map(u=>`<option value="${u}">${u}</option>`).join(''); selectedCompany=null; selectedUnit=null; } else { selectedCompany = ctx.company || null; companySelect.innerHTML = `<option value="${selectedCompany||''}">${selectedCompany||'-'}</option>`; companySelect.disabled = true; let units=[]; if(ctx.units && ctx.units.length) units=ctx.units; else if(selectedCompany) units = await fetchUnits(selectedCompany); if(!units || !units.length){ unitSelect.innerHTML = `<option value="">All Units</option>`; selectedUnit=null; } else { unitSelect.innerHTML = units.map(u=>`<option value="${u}">${u}</option>`).join(''); selectedUnit = units.length===1 ? units[0] : units[0]; } unitSelect.disabled = !(ctx.units && ctx.units.length>1); } }
})();
