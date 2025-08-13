(function(){
  // Scope to root_element for Frappe custom HTML block
  const tbody = root_element.querySelector('#uosp-tbody');

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
    const tr = document.createElement('tr');
    tr.className = 'data-row';
    tr.innerHTML = `
      <td>${data.s_no}</td>
      <td>${data.date}</td>
      <td>${data.product_type}</td>
      <td>${data.sold}</td>
      <td>${data.activity_data||'-'}</td>
      <td>${data.unit}</td>
      <td>${data.ef}</td>
      <td>${data.ef_unit}</td>
      <td>${data.co2e}</td>
      <td class="actions"><button type="button" class="delete-row">Delete</button></td>
    `;
    tr.querySelector('.delete-row')?.addEventListener('click', ()=> tr.remove());
    const entryRow = tbody.querySelector('.entry-row');
    if (entryRow && entryRow.nextSibling) tbody.insertBefore(tr, entryRow.nextSibling);
    else tbody.appendChild(tr);

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
  }

  hookEntryRow(tbody.querySelector('.entry-row'));
})();
