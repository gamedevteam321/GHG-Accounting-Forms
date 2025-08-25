(function(){
  const tbSpecific = root_element.querySelector('#di-tb-specific');
  const tbAverage = root_element.querySelector('#di-tb-average');

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


