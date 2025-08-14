(function(){
  const tbSupplier = root_element.querySelector('#eol-tbody-supplier');
  const tbWasteType = root_element.querySelector('#eol-tbody-waste-type');
  const tbAverage = root_element.querySelector('#eol-tbody-average');

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

  function hookRow(row){
    if (!row || row.dataset.hooked==='1') return;
    const mass = row.querySelector('input[name="mass"]');
    const pct = row.querySelector('input[name="pct"]');
    const ef = row.querySelector('input[name="ef"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      const m = parseFloat(mass?.value||'0')||0;
      const p = parseFloat(pct?.value||'0')||0;
      const e = parseFloat(ef?.value||'0')||0;
      const factor = pct ? (m * p/100) : m;
      if (co2e) co2e.value = (factor * e).toFixed(2);
    };
    mass?.addEventListener('input', recalc);
    pct?.addEventListener('input', recalc);
    ef?.addEventListener('input', recalc);
    row.querySelector('.add-btn-row')?.addEventListener('click', ()=> addFromEntry(row));
    row.dataset.hooked='1';
  }

  function appendDisplayRow(tbody, entry, values, doctypeName, docname){
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
    if (entry.nextSibling) tbody.insertBefore(tr, entry.nextSibling); else tbody.appendChild(tr);
  }

  function addFromEntry(entry){
    const btn = entry.querySelector('.add-btn-row');
    const tbody = entry.parentElement;
    const tId = tbody.getAttribute('id');
    let map;
    if (tId === 'eol-tbody-supplier') map = { doctype: 'Downstream EOL Supplier Specific Item' };
    else if (tId === 'eol-tbody-waste-type') map = { doctype: 'Downstream EOL Waste Type Specific Item' };
    else if (tId === 'eol-tbody-average') map = { doctype: 'Downstream EOL Average Data Item' };
    if (!map) return;

    const data = {};
    entry.querySelectorAll('input,select').forEach(inp=>{
      const key = inp.name;
      data[key] = inp.value;
    });

    btn && (btn.disabled = true, btn.textContent = 'Saving...');
    saveRow(map.doctype, data).then((doc)=>{
      const cells = Array.from(entry.querySelectorAll('td'));
      const values = cells.slice(0, -1).map(td => {
        const inp = td.querySelector('input,select');
        return inp ? (inp.type==='number' ? (inp.value||'0') : (inp.value||'-')) : td.textContent;
      });
      const sNoInput = entry.querySelector('input[name="s_no"]');
      if (sNoInput) sNoInput.value = String((parseInt(sNoInput.value||'1',10)||1)+1);
      appendDisplayRow(tbody, entry, values, map.doctype, doc?.name);
      entry.querySelectorAll('input[type="number"]').forEach(i=> i.value='');
      entry.querySelectorAll('input[name="co2e"]').forEach(i=> i.value='');
      frappe.show_alert({message: 'Saved', indicator: 'green'});
    }).catch(err=>{
      console.error('Save failed', err);
      frappe.show_alert({message: 'Save failed', indicator: 'red'});
    }).finally(()=>{
      if (btn){ btn.disabled = false; btn.textContent = '+ Add'; }
    });
  }

  [tbSupplier, tbWasteType, tbAverage].forEach(tbody => hookRow(tbody?.querySelector('.entry-row')));

  function loadExisting(){
    const specs = [
      { tbody: tbSupplier, doctype: 'Downstream EOL Supplier Specific Item', fields: ['name','s_no','date','product','handler','mass','unit','ef','ef_unit','co2e'] },
      { tbody: tbWasteType, doctype: 'Downstream EOL Waste Type Specific Item', fields: ['name','s_no','date','product','material','mass','method','pct','ef','ef_unit','co2e'] },
      { tbody: tbAverage, doctype: 'Downstream EOL Average Data Item', fields: ['name','s_no','date','product','mass','unit','method','pct','ef','ef_unit','co2e'] },
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

  // Tabs
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
