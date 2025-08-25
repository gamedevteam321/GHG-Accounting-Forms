(function(){
  const tbFuel = root_element.querySelector('#trans-tb-fuel');
  const tbDistance = root_element.querySelector('#trans-tb-distance');
  const tbSpend = root_element.querySelector('#trans-tb-spend');

  function saveRow(doctypeName, data){
    return new Promise((resolve, reject)=>{
      const doc = Object.assign({}, data, { doctype: doctypeName });
      frappe.call({
        method: 'frappe.client.insert',
        args: { doc },
        callback: r => resolve(r.message),
        error: err => reject(err)
      });
    });
  }

  function hookFuel(row){
    if(!row || row.dataset.hooked==='1') return;
    const litres = row.querySelector('input[name="fuel_litres"]');
    const ef = row.querySelector('input[name="ef"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      const l = parseFloat(litres?.value||'0')||0;
      const f = parseFloat(ef?.value||'0')||0;
      if (co2e) co2e.value = (l*f).toFixed(2);
    };
    [litres, ef].forEach(i=> i?.addEventListener('input', recalc));
    row.querySelector('.add-btn')?.addEventListener('click', ()=> addFromEntry(row));
    row.dataset.hooked='1';
  }

  function hookDistance(row){
    if(!row || row.dataset.hooked==='1') return;
    const mass = row.querySelector('input[name="mass"]');
    const distance = row.querySelector('input[name="distance"]');
    const ef = row.querySelector('input[name="ef"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      const m = parseFloat(mass?.value||'0')||0;
      const d = parseFloat(distance?.value||'0')||0;
      const f = parseFloat(ef?.value||'0')||0;
      if (co2e) co2e.value = (m*d*f).toFixed(2);
    };
    [mass, distance, ef].forEach(i=> i?.addEventListener('input', recalc));
    row.querySelector('.add-btn')?.addEventListener('click', ()=> addFromEntry(row));
    row.dataset.hooked='1';
  }

  function hookSpend(row){
    if(!row || row.dataset.hooked==='1') return;
    const amount = row.querySelector('input[name="amount"]');
    const ef = row.querySelector('input[name="ef"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      const a = parseFloat(amount?.value||'0')||0;
      const f = parseFloat(ef?.value||'0')||0;
      if (co2e) co2e.value = (a*f).toFixed(2);
    };
    [amount, ef].forEach(i=> i?.addEventListener('input', recalc));
    row.querySelector('.add-btn')?.addEventListener('click', ()=> addFromEntry(row));
    row.dataset.hooked='1';
  }

  function appendDisplayRow(tbody, entry, values, doctypeName, docname){
    const tr = document.createElement('tr');
    tr.className='data-row';
    if (docname) tr.dataset.docname = docname;
    tr.innerHTML = values.map(v=>`<td>${v}</td>`).join('') + '<td class="actions"><button type="button" class="delete-row">Delete</button></td>';
    tr.querySelector('.delete-row')?.addEventListener('click', ()=> {
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
    if (tId === 'trans-tb-fuel') map = { doctype: 'Downstream Transportation Fuel Based Item' };
    else if (tId === 'trans-tb-distance') map = { doctype: 'Downstream Transportation Distance Based Item' };
    else if (tId === 'trans-tb-spend') map = { doctype: 'Downstream Transportation Spend Based Item' };
    if (!map) return;

    const data = {};
    entry.querySelectorAll('input,select').forEach(inp=>{
      const key = inp.name === 'desc' ? 'description' : inp.name;
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
      frappe.show_alert({message: 'Saved', indicator: 'green'});
    }).catch(err=>{
      console.error('Save failed', err);
      frappe.show_alert({message: 'Save failed', indicator: 'red'});
    }).finally(()=>{
      if (btn){ btn.disabled = false; btn.textContent = '+ Add'; }
    });
  }

  hookFuel(tbFuel?.querySelector('.entry-row'));
  hookDistance(tbDistance?.querySelector('.entry-row'));
  hookSpend(tbSpend?.querySelector('.entry-row'));

  function loadExisting(){
    const specs = [
      { tbody: tbFuel, doctype: 'Downstream Transportation Fuel Based Item', fields: ['name','s_no','date','description','fuel_litres','unit','ef','ef_unit','co2e'] },
      { tbody: tbDistance, doctype: 'Downstream Transportation Distance Based Item', fields: ['name','s_no','date','description','mass','distance','mode','unit','ef','ef_unit','co2e'] },
      { tbody: tbSpend, doctype: 'Downstream Transportation Spend Based Item', fields: ['name','s_no','date','description','amount','unit','ef','ef_unit','co2e'] },
    ];
    specs.forEach(spec =>{
      if (!spec.tbody) return;
      frappe.call({
        method: 'frappe.client.get_list',
        args: { doctype: spec.doctype, fields: spec.fields, limit_page_length: 500, order_by: 'creation asc' },
        callback: r => {
          const entry = spec.tbody.querySelector('.entry-row');
          (r.message||[]).forEach(doc =>{
            const values = spec.fields.filter(f=> f!=='name').map(f=> doc[f] ?? '-');
            appendDisplayRow(spec.tbody, entry, values, spec.doctype, doc.name);
          });
        }
      });
    });
  }

  loadExisting();

  // tabs
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
})();

(function(){
  const tbody = root_element.querySelector('#trans-tbody');

  function updateVisibility(row){
    const method = row.querySelector('select[name="method"]').value;
    row.querySelector('.activity-fuel').style.display = method === 'Fuel-Based' ? '' : 'none';
    row.querySelector('.activity-distance').style.display = method === 'Distance-Based' ? '' : 'none';
    row.querySelector('.activity-spend').style.display = method === 'Spend-Based' ? '' : 'none';
    const unit = row.querySelector('input[name="unit"]');
    const efUnit = row.querySelector('input[name="ef_unit"]');
    if (method === 'Fuel-Based'){ unit.value='litres'; efUnit.value='kg CO2e/litre'; }
    else if (method === 'Distance-Based'){ unit.value='kg km'; efUnit.value='kg CO2e/kg-km'; }
    else { unit.value='$'; efUnit.value='kg CO2e/$'; }
  }

  function hookRow(row){
    if(!row || row.dataset.hooked==='1') return;
    const methodSel = row.querySelector('select[name="method"]');
    const fuel = row.querySelector('input[name="fuel_litres"]');
    const mass = row.querySelector('input[name="mass"]');
    const distance = row.querySelector('input[name="distance"]');
    const amount = row.querySelector('input[name="amount"]');
    const ef = row.querySelector('input[name="ef"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      const m = methodSel.value;
      const f = parseFloat(ef?.value||'0')||0;
      let val = 0;
      if (m==='Fuel-Based'){
        const litres = parseFloat(fuel?.value||'0')||0;
        val = litres * f;
      } else if (m==='Distance-Based'){
        const ms = parseFloat(mass?.value||'0')||0;
        const km = parseFloat(distance?.value||'0')||0;
        val = ms * km * f;
      } else {
        const amt = parseFloat(amount?.value||'0')||0;
        val = amt * f;
      }
      if (co2e) co2e.value = val.toFixed(2);
    };
    [methodSel, fuel, mass, distance, amount, ef].forEach(i=> i?.addEventListener('input', ()=>{ updateVisibility(row); recalc(); }));
    updateVisibility(row);
    row.querySelector('.add-btn')?.addEventListener('click', ()=> addFromEntry(row));
    row.dataset.hooked='1';
  }

  function addFromEntry(entry){
    const cells = Array.from(entry.querySelectorAll('td'));
    const values = cells.slice(0,-1).map(td=>{
      const inp = td.querySelector('input,select');
      return inp ? (inp.type==='number' ? (inp.value||'0') : (inp.value||'-')) : td.textContent;
    });
    const sNo = entry.querySelector('input[name="s_no"]');
    if (sNo) sNo.value = String((parseInt(sNo.value||'1',10)||1)+1);
    const tr = document.createElement('tr');
    tr.className='data-row';
    tr.innerHTML = values.map(v=>`<td>${v}</td>`).join('') + '<td class="actions"><button type="button" class="delete-row">Delete</button></td>';
    tr.querySelector('.delete-row')?.addEventListener('click', ()=> tr.remove());
    if (entry.nextSibling) tbody.insertBefore(tr, entry.nextSibling); else tbody.appendChild(tr);
    entry.querySelectorAll('input[type="number"]').forEach(i=>{ if(i.name!=='s_no') i.value=''; });
  }

  hookRow(tbody?.querySelector('.entry-row'));
})();



