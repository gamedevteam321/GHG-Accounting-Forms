(function(){
  const tbody = root_element.querySelector('#tpe-tbody');

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


