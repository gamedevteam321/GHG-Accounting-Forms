(function(){
  // Scope to root_element (Frappe custom block)
  const tbSupplier = root_element.querySelector('#eol-tbody-supplier');
  const tbWasteType = root_element.querySelector('#eol-tbody-waste-type');
  const tbAverage = root_element.querySelector('#eol-tbody-average');

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

  function addFromEntry(entry){
    // Collect columns generically in order
    const cells = Array.from(entry.querySelectorAll('td'));
    const values = cells.slice(0, -1).map(td => {
      const inp = td.querySelector('input,select');
      return inp ? (inp.type==='number' ? (inp.value||'0') : (inp.value||'-')) : td.textContent;
    });
    // increment S No for next entry
    const sNoInput = entry.querySelector('input[name="s_no"]');
    if (sNoInput) {
      const next = (parseInt(sNoInput.value||'1',10)||1)+1;
      sNoInput.value = String(next);
    }
    // require mass and ef
    const massVal = parseFloat(entry.querySelector('input[name="mass"]')?.value||'0')||0;
    const efVal = parseFloat(entry.querySelector('input[name="ef"]')?.value||'0')||0;
    if (!massVal || !efVal) return;
    const tr = document.createElement('tr');
    tr.className = 'data-row';
    tr.innerHTML = values.map(v=>`<td>${v}</td>`).join('') + '<td class="actions"><button type="button" class="delete-row">Delete</button></td>';
    tr.querySelector('.delete-row')?.addEventListener('click', ()=> tr.remove());
    const tbody = entry.parentElement;
    if (entry.nextSibling) tbody.insertBefore(tr, entry.nextSibling); else tbody.appendChild(tr);
    // clear data inputs (except defaults)
    entry.querySelectorAll('input[type="number"]').forEach(i=> i.value='');
    entry.querySelectorAll('input[name="co2e"]').forEach(i=> i.value='');
  }

  [tbSupplier, tbWasteType, tbAverage].forEach(tbody => hookRow(tbody?.querySelector('.entry-row')));

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
