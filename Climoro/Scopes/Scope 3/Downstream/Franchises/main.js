(function(){
  const tbSpecific = root_element.querySelector('#fran-tb-specific');
  const tbAverage = root_element.querySelector('#fran-tb-average');

  function hookRow(row){
    if(!row || row.dataset.hooked==='1') return;
    const scope1 = row.querySelector('input[name="scope1"]');
    const scope2 = row.querySelector('input[name="scope2"]');
    const avg = row.querySelector('input[name="avg"]');
    const count = row.querySelector('input[name="count"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      let val = 0;
      if (scope1 || scope2) {
        const s1 = parseFloat(scope1?.value||'0')||0;
        const s2 = parseFloat(scope2?.value||'0')||0;
        val = s1 + s2;
      } else {
        const a = parseFloat(avg?.value||'0')||0;
        const c = parseFloat(count?.value||'0')||0;
        val = a * c;
      }
      if (co2e) co2e.value = val.toFixed(2);
    };
    [scope1, scope2, avg, count].forEach(i=> i?.addEventListener('input', recalc));
    row.querySelector('.add-btn')?.addEventListener('click', ()=> addFromEntry(row));
    row.dataset.hooked='1';
  }

  function addFromEntry(entry){
    const cells = Array.from(entry.querySelectorAll('td'));
    const values = cells.slice(0,-1).map(td=>{
      const inp = td.querySelector('input,select');
      return inp ? (inp.type==='number' ? (inp.value||'0') : (inp.value||'-')) : td.textContent;
    });
    // increment s_no
    const sNo = entry.querySelector('input[name="s_no"]');
    if (sNo) sNo.value = String((parseInt(sNo.value||'1',10)||1)+1);
    const tr = document.createElement('tr');
    tr.className='data-row';
    tr.innerHTML = values.map(v=>`<td>${v}</td>`).join('') + '<td class="actions"><button type="button" class="delete-row">Delete</button></td>';
    tr.querySelector('.delete-row')?.addEventListener('click', ()=> tr.remove());
    const tbody = entry.parentElement;
    if (entry.nextSibling) tbody.insertBefore(tr, entry.nextSibling); else tbody.appendChild(tr);
    entry.querySelectorAll('input[type="number"]').forEach(i=>{ if(i.name!=='s_no') i.value=''; });
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
