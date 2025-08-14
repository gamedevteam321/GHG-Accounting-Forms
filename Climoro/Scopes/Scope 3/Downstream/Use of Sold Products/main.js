(function(){
  // Scope to root_element for Frappe custom HTML block
  const tbody = root_element.querySelector('#uosp-tbody');

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

  hookEntryRow(tbody.querySelector('.entry-row'));
  
  function loadExisting(){
    frappe.call({
      method: 'frappe.client.get_list',
      args: { doctype: 'Downstream Use of Sold Products Item', fields: ['name','s_no','date','product_type','sold','activity_data','unit','ef','ef_unit','co2e'], limit_page_length: 500, order_by: 'creation asc' },
      callback: r => {
        const entry = tbody.querySelector('.entry-row');
        (r.message||[]).forEach(doc =>{
          const values = [doc.s_no, doc.date, doc.product_type, doc.sold, doc.activity_data, doc.unit, doc.ef, doc.ef_unit, doc.co2e].map(v=> v ?? '-');
          appendDisplayRow(entry, values, 'Downstream Use of Sold Products Item', doc.name);
        });
      }
    });
  }

  loadExisting();
})();
