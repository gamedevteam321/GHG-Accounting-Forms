(function(){
  const tbAsset = root_element.querySelector('#dla-tb-asset');
  const tbLessee = root_element.querySelector('#dla-tb-lessee');
  const tbAvg = root_element.querySelector('#dla-tb-average');

  function hookRow(row){
    if(!row || row.dataset.hooked==='1') return;
    const activity = row.querySelector('input[name="activity"]');
    const ef = row.querySelector('input[name="ef"], input[name="avg_ef"]');
    const share = row.querySelector('input[name="share"]');
    const lesseeEmission = row.querySelector('input[name="lessee_emission"]');
    const co2e = row.querySelector('input[name="co2e"]');
    const recalc = ()=>{
      let val = 0;
      if (lesseeEmission) {
        const e = parseFloat(lesseeEmission.value||'0')||0;
        const s = parseFloat(share?.value||'0')||0;
        val = e * (s/100);
      } else {
        const a = parseFloat(activity?.value||'0')||0;
        const f = parseFloat((ef?.value)||'0')||0;
        val = a * f;
      }
      if (co2e) co2e.value = val.toFixed(2);
    };
    [activity, ef, share, lesseeEmission].forEach(i=> i?.addEventListener('input', recalc));
    row.querySelector('.add-btn')?.addEventListener('click', ()=> addFromEntry(row));
    row.dataset.hooked='1';
  }

  function addFromEntry(entry){
    const cells = Array.from(entry.querySelectorAll('td'));
    const values = cells.slice(0,-1).map(td=>{
      const inp = td.querySelector('input,select');
      return inp ? (inp.type==='number' ? (inp.value||'0') : (inp.value||'-')) : td.textContent;
    });
    // increment S No
    const sNo = entry.querySelector('input[name="s_no"]');
    if(sNo){ sNo.value = String((parseInt(sNo.value||'1',10)||1)+1); }
    const tr = document.createElement('tr');
    tr.className='data-row';
    tr.innerHTML = values.map(v=>`<td>${v}</td>`).join('') + '<td class="actions"><button type="button" class="delete-row">Delete</button></td>';
    tr.querySelector('.delete-row')?.addEventListener('click', ()=> tr.remove());
    const tbody = entry.parentElement;
    if (entry.nextSibling) tbody.insertBefore(tr, entry.nextSibling); else tbody.appendChild(tr);
    // clear numeric inputs except s_no
    entry.querySelectorAll('input[type="number"]').forEach(i=>{ if(i.name!=='s_no') i.value=''; });
    entry.querySelector('input[name="co2e"]').value='';
  }

  [tbAsset, tbLessee, tbAvg].forEach(t=> hookRow(t?.querySelector('.entry-row')));

  // Tabs
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
