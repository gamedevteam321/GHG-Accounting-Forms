(function(){
  const tbody = root_element.querySelector('#tpe-tbody');

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
    const annual = row.querySelector('input[name="annual"]');
    const lifetime = row.querySelector('input[name="lifetime"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      const s = parseFloat(share?.value||'0')||0;
      const a = parseFloat(annual?.value||'0')||0;
      const l = parseFloat(lifetime?.value||'0')||0;
      const val = a * l * (s/100);
      if (co2e) co2e.value = val.toFixed(2);
    };
    [share, annual, lifetime].forEach(i=> i?.addEventListener('input', recalc));
    row.querySelector('.add-btn')?.addEventListener('click', ()=> addFromEntry(row));
    row.dataset.hooked='1';
  }

  function appendDisplayRow(entry, values, doctypeName, docname){
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
    const data = {};
    entry.querySelectorAll('input,select').forEach(inp=>{ data[inp.name] = inp.value; });

    const btn = entry.querySelector('.add-btn');
    btn && (btn.disabled = true, btn.textContent = 'Saving...');
    saveRow('Downstream Project Finance Total Projected Emissions Item', data).then((doc)=>{
      appendDisplayRow(entry, values, 'Downstream Project Finance Total Projected Emissions Item', doc?.name);
      entry.querySelectorAll('input[type="number"]').forEach(i=>{ if(i.name!=='s_no') i.value=''; });
      frappe.show_alert({message: 'Saved', indicator: 'green'});
    }).catch(err=>{
      console.error('Save failed', err);
      frappe.show_alert({message: 'Save failed', indicator: 'red'});
    }).finally(()=>{
      if (btn){ btn.disabled = false; btn.textContent = '+ Add'; }
    });
  }

  hookRow(tbody?.querySelector('.entry-row'));
  
  function loadExisting(){
    frappe.call({
      method: 'frappe.client.get_list',
      args: { doctype: 'Downstream Project Finance Total Projected Emissions Item', fields: ['name','s_no','date','project_id','share','annual','lifetime','co2e'], limit_page_length: 500, order_by: 'creation asc' },
      callback: r => {
        const entry = tbody.querySelector('.entry-row');
        (r.message||[]).forEach(doc =>{
          const values = ['s_no','date','project_id','share','annual','lifetime','co2e'].map(f=> doc[f] ?? '-');
          appendDisplayRow(entry, values, 'Downstream Project Finance Total Projected Emissions Item', doc.name);
        });
      }
    });
  }

  loadExisting();
})();


