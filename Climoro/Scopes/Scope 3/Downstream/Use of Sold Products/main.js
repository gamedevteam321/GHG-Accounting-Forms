(function(){
  // Scope to root_element for Frappe custom HTML block
  const tbody = root_element.querySelector('#uosp-tbody');
  let selectedCompany = null;
  let selectedUnit = null;
  let selectedDateFrom = null;
  let selectedDateTo = null;
  let isFilterVisible = false;
  const metaCache = {};

  async function hasField(doctype, fieldname){
    try { if (!metaCache[doctype]){ const r = await frappe.call({ method: 'frappe.client.get', args: { doctype: 'DocType', name: doctype } }); metaCache[doctype] = r.message || {}; } const fields = metaCache[doctype].fields || []; return fields.some(f=> f.fieldname === fieldname); } catch(e){ return false; }
  }

  function saveRow(doctypeName, data){
    return new Promise((resolve, reject)=>{
      (async ()=>{
        const doc = Object.assign({}, data, { doctype: doctypeName });
        try {
          const ctx = await getUserContext();
          if (await hasField(doctypeName, 'company')) {
            doc.company = ctx.is_super ? (selectedCompany || ctx.company || null) : (ctx.company || null);
          }
          if (await hasField(doctypeName, 'company_unit')) {
            const chosenUnit = selectedUnit || (ctx.units && ctx.units.length === 1 ? ctx.units[0] : null);
            if (chosenUnit) doc.company_unit = chosenUnit;
          }
        } catch(e) {}
        frappe.call({
          method: 'frappe.client.insert',
          args: { doc },
          callback: r => resolve(r.message),
          error: err => reject(err)
        });
      })();
    });
  }

  function appendDisplayRow(entry, values, doctypeName, docname){
    const tr = document.createElement('tr');
    tr.className = 'data-row';
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
    const tbody = entry.parentElement;
    const entryRow = tbody.querySelector('.entry-row');
    if (entryRow && entryRow.nextSibling) tbody.insertBefore(tr, entryRow.nextSibling); else tbody.appendChild(tr);
  }

  function hookEntryRow(row){
    if (!row || row.dataset.hooked==='1') return;
    const sold = row.querySelector('input[name="sold"]');
    const ef = row.querySelector('input[name="ef"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      const s = parseFloat(sold?.value||'0')||0;
      const e = parseFloat(ef?.value||'0')||0;
      if (co2e) co2e.value = (s*e).toFixed(2);
    };
    sold?.addEventListener('input', recalc);
    ef?.addEventListener('input', recalc);
    row.querySelector('.add-btn-row')?.addEventListener('click', ()=> addFromEntry(row));
    row.dataset.hooked='1';
  }

  function addFromEntry(entry){
    const data = {
      s_no: parseInt(entry.querySelector('input[name="s_no"]').value||'1',10)||1,
      date: entry.querySelector('input[name="date"]').value || '',
      product_type: entry.querySelector('select[name="product_type"]').value,
      sold: parseFloat(entry.querySelector('input[name="sold"]').value||'0')||0,
      activity_data: entry.querySelector('input[name="activity_data"]').value,
      unit: entry.querySelector('input[name="unit"]').value,
      ef: parseFloat(entry.querySelector('input[name="ef"]').value||'0')||0,
      ef_unit: entry.querySelector('input[name="ef_unit"]').value,
      co2e: parseFloat(entry.querySelector('input[name="co2e"]').value||'0')||0,
    };
    if (!data.sold || !data.ef) return; // minimal validation

    const cells = Array.from(entry.querySelectorAll('td'));
    const values = cells.slice(0,-1).map(td=>{
      const inp = td.querySelector('input,select');
      return inp ? (inp.type==='number' ? (inp.value||'0') : (inp.value||'-')) : td.textContent;
    });

    const btn = entry.querySelector('.add-btn-row');
    btn && (btn.disabled = true, btn.textContent = 'Saving...');
    saveRow('Downstream Use of Sold Products Item', data).then((doc)=>{
      appendDisplayRow(entry, values, 'Downstream Use of Sold Products Item', doc?.name);
      // clear
      entry.querySelector('input[name="sold"]').value='';
      entry.querySelector('input[name="activity_data"]').value='';
      entry.querySelector('input[name="unit"]').value='';
      entry.querySelector('input[name="ef"]').value='';
      entry.querySelector('input[name="ef_unit"]').value='';
      entry.querySelector('input[name="co2e"]').value='';
      // increment s_no
      const sNo = entry.querySelector('input[name="s_no"]').value;
      entry.querySelector('input[name="s_no"]').value = String((parseInt(sNo||'1',10)||1)+1);
      frappe.show_alert({message: 'Saved', indicator: 'green'});
    }).catch(err=>{
      console.error('Save failed', err);
      frappe.show_alert({message: 'Save failed', indicator: 'red'});
    }).finally(()=>{
      if (btn){ btn.disabled = false; btn.textContent = '+ Add'; }
    });
  }

  // Build filter bar first
  buildFilterBar(async ()=>{ await initializeFiltersFromContext(); });
  hookEntryRow(tbody.querySelector('.entry-row'));
  
  // Helper to apply client-side date filtering
  function applyDateFilter(records) {
    if (!selectedDateFrom && !selectedDateTo) {
      return records;
    }
    
    console.log('Use of Sold Products: Applying client-side date filtering...');
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
    (async ()=>{
      const ctx = await getUserContext();
      const filters = {};
      if (await hasField('Downstream Use of Sold Products Item', 'company')) {
        filters.company = ctx.is_super ? (selectedCompany || ctx.company || undefined) : (ctx.company || undefined);
      }
      if (await hasField('Downstream Use of Sold Products Item', 'company_unit')) {
        if (selectedUnit) filters.company_unit = selectedUnit;
      }
      frappe.call({
        method: 'frappe.client.get_list',
        args: { doctype: 'Downstream Use of Sold Products Item', fields: ['name','s_no','date','product_type','sold','activity_data','unit','ef','ef_unit','co2e'], limit_page_length: 500, order_by: 'creation asc', filters },
        callback: r => {
          if (r.message && r.message.length > 0) {
            // Apply client-side date filtering
            const filteredRecords = applyDateFilter(r.message);
            console.log(`Use of Sold Products: Original records: ${r.message.length}, Filtered records: ${filteredRecords.length}`);
            
            const entry = tbody.querySelector('.entry-row');
            filteredRecords.forEach(doc =>{
              const values = [doc.s_no, doc.date, doc.product_type, doc.sold, doc.activity_data, doc.unit, doc.ef, doc.ef_unit, doc.co2e].map(v=> v ?? '-');
              appendDisplayRow(entry, values, 'Downstream Use of Sold Products Item', doc.name);
            });
          }
        }
      });
    })();
  }

  loadExisting();

  // ============ Company/Unit Filter Helpers ============
  async function getUserContext(){
    try { const r = await frappe.call({ method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' }); return r.message || { company: null, units: [], is_super: false }; }
    catch(e){ return { company: null, units: [], is_super: false }; }
  }

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
      
      console.log('Use of Sold Products Filter values:', {
        company: selectedCompany,
        unit: selectedUnit,
        dateFrom: selectedDateFrom,
        dateTo: selectedDateTo
      });
      
      // reload
      tbody.querySelectorAll('.data-row').forEach(r=>r.remove());
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
      
      console.log('Use of Sold Products Date filters cleared');
      tbody.querySelectorAll('.data-row').forEach(r=>r.remove());
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

  async function fetchCompanies(){ const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Company', fields: ['name'], limit: 500 } }); return (r.message||[]).map(x=>x.name); }
  async function fetchUnits(company){ const filters = company ? { company } : {}; const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Units', fields: ['name'], filters, limit: 500 } }); return (r.message||[]).map(x=>x.name); }
  async function initializeFiltersFromContext(){ const ctx = await getUserContext(); const bar = root_element.querySelector('.filter-bar'); if(!bar) return; const companySelect = bar.querySelector('.filter-company-select'); const unitSelect = bar.querySelector('.filter-unit-select'); companySelect.innerHTML=''; unitSelect.innerHTML=''; if(ctx.is_super){ const companies = await fetchCompanies(); companySelect.innerHTML = `<option value="">All Companies</option>` + companies.map(c=>`<option value="${c}">${c}</option>`).join(''); companySelect.addEventListener('change', async ()=>{ selectedCompany = companySelect.value || null; const units = await fetchUnits(selectedCompany); unitSelect.innerHTML = `<option value="">All Units</option>` + units.map(u=>`<option value="${u}">${u}</option>`).join(''); selectedUnit = null; }); const initialUnits = await fetchUnits(null); unitSelect.innerHTML = `<option value="">All Units</option>` + initialUnits.map(u=>`<option value="${u}">${u}</option>`).join(''); selectedCompany=null; selectedUnit=null; } else { selectedCompany = ctx.company || null; companySelect.innerHTML = `<option value="${selectedCompany||''}">${selectedCompany||'-'}</option>`; companySelect.disabled = true; let units=[]; if(ctx.units && ctx.units.length) units = ctx.units; else if(selectedCompany) units = await fetchUnits(selectedCompany); if(!units || !units.length){ unitSelect.innerHTML = `<option value="">All Units</option>`; selectedUnit = null; } else { unitSelect.innerHTML = units.map(u=>`<option value="${u}">${u}</option>`).join(''); selectedUnit = units.length===1 ? units[0] : units[0]; } unitSelect.disabled = !(ctx.units && ctx.units.length > 1); } }
})();
