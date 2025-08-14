(function(){
  const tbSite = root_element.querySelector('#dist-tb-site');
  const tbAvg = root_element.querySelector('#dist-tb-average');

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

  function hookSite(row){
    if(!row || row.dataset.hooked==='1') return;
    const activity = row.querySelector('input[name="activity"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      const a = parseFloat(activity?.value||'0')||0;
      if (co2e) co2e.value = a.toFixed(2); // Activity already in kg CO2e
    };
    activity?.addEventListener('input', recalc);
    row.querySelector('.add-btn')?.addEventListener('click', ()=> addFromEntry(row));
    row.dataset.hooked='1';
  }

  function hookAverage(row){
    if(!row || row.dataset.hooked==='1') return;
    const vol = row.querySelector('input[name="volume_days"]');
    const ef = row.querySelector('input[name="ef"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      const v = parseFloat(vol?.value||'0')||0;
      const f = parseFloat(ef?.value||'0')||0;
      if (co2e) co2e.value = (v*f).toFixed(2);
    };
    [vol, ef].forEach(i=> i?.addEventListener('input', recalc));
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
    if (tId === 'dist-tb-site') map = { doctype: 'Downstream Distribution Site Specific Item' };
    else if (tId === 'dist-tb-average') map = { doctype: 'Downstream Distribution Average Data Item' };
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

  hookSite(tbSite?.querySelector('.entry-row'));
  hookAverage(tbAvg?.querySelector('.entry-row'));

  function loadExisting(){
    const specs = [
      { tbody: tbSite, doctype: 'Downstream Distribution Site Specific Item', fields: ['name','s_no','date','description','activity','unit','ef','ef_unit','co2e'] },
      { tbody: tbAvg, doctype: 'Downstream Distribution Average Data Item', fields: ['name','s_no','date','description','volume_days','unit','ef','ef_unit','co2e'] },
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
    if (!btn) return;
    e.preventDefault();
    const id = btn.getAttribute('data-tab');
    root_element.querySelectorAll('.tab-button').forEach(b=>b.classList.remove('active'));
    root_element.querySelectorAll('.tab-content').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    root_element.querySelector(`#${id}`)?.classList.add('active');
  }, true);
})();


