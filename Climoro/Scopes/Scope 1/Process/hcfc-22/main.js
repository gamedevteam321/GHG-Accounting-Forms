(function(){
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    const GWP = 12400;
    let idx = { a2: 1, a3: 1, a4: 1 };

    function init(){ buildTabs(); buildA2(); buildA3(); buildA4(); attachBlockers(); }

    function buildTabs(){
        const container = scopeRoot.querySelector('.hcfc22-container'); if(!container) return;
        const buttons = container.querySelectorAll('.tab-btn');
        const tabs = { 'approach-2': container.querySelector('#approach-2-tab'), 'approach-3': container.querySelector('#approach-3-tab'), 'approach-4': container.querySelector('#approach-4-tab') };
        buttons.forEach(btn=>{ btn.addEventListener('click', ()=>{ buttons.forEach(b=>b.classList.remove('active')); btn.classList.add('active'); Object.values(tabs).forEach(el=>el.classList.remove('active')); const id = btn.dataset.tab; if(tabs[id]) tabs[id].classList.add('active'); }); });
    }

    async function getUnits(){
        try {
            const userResp = await frappe.call({ method: 'frappe.client.get', args: { doctype: 'User', name: frappe.session && frappe.session.user ? frappe.session.user : 'Administrator' } });
            const company = (userResp.message && userResp.message.company) ? userResp.message.company : null;
            if(!company){ return []; }
            const unitsResp = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Units', fields: ['name'], filters: { company }, limit_page_length: 200 } });
            return (unitsResp.message||[]).map(u=>u.name);
        } catch(e){ return []; }
    }

    function unitOptions(units){ return units.map(u=>`<option value="${u}">${u}</option>`).join(''); }
    function today(){ return new Date().toISOString().split('T')[0]; }

    async function buildA2(){
        const tbody = scopeRoot.querySelector('#approach2Body'); if(!tbody) return;
        const units = await getUnits();
        const row = document.createElement('tr'); row.className='data-entry-row';
        row.innerHTML = `
            <td>${idx.a2}</td>
            <td><input type=\"date\" class=\"form-control date\" data-frappe-ignore=\"true\" value=\"${today()}\"></td>
            <td><select class=\"form-control unit\" data-frappe-ignore=\"true\"><option value=\"\">-- Unit --</option>${unitOptions(units)}</select></td>
            <td><input type=\"text\" class=\"form-control sid\" data-frappe-ignore=\"true\"></td>
            <td><input type=\"number\" class=\"form-control fr\" data-frappe-ignore=\"true\" step=\"0.01\"></td>
            <td><input type=\"number\" class=\"form-control conc\" data-frappe-ignore=\"true\" step=\"0.01\"></td>
            <td><input type=\"number\" class=\"form-control time\" data-frappe-ignore=\"true\" step=\"0.01\"></td>
            <td><input type=\"number\" class=\"form-control util\" data-frappe-ignore=\"true\" step=\"0.01\" placeholder=\"0-1\"></td>
            <td><span class=\"calculated-value em\">0.00</span></td>
            <td><span class=\"calculated-value co2e\">0.00</span></td>
            <td><button class=\"btn btn-success add\">Add</button></td>`;
        tbody.appendChild(row);
        const calc = ()=>{ const fr = parseFloat(row.querySelector('.fr').value)||0; const conc = parseFloat(row.querySelector('.conc').value)||0; const t = parseFloat(row.querySelector('.time').value)||0; const u = parseFloat(row.querySelector('.util').value)||0; const mass = (fr*conc*t)/1e6; const em = mass*(1 - u); const co2e = em*GWP; row.querySelector('.em').textContent = (isFinite(em)?em:0).toFixed(2); row.querySelector('.co2e').textContent = (isFinite(co2e)?co2e:0).toFixed(2); };
        row.querySelectorAll('input').forEach(i=>{ i.addEventListener('input', calc); i.addEventListener('change', calc); });
        row.querySelector('.add').addEventListener('click', (e)=>{ e.preventDefault(); addA2(row); });
    }

    function addA2(entry){
        const tbody = entry.parentElement; const tr = document.createElement('tr'); tr.className='data-display-row';
        const d = entry.querySelector('.date').value; const unit = entry.querySelector('.unit').value;
        tr.innerHTML = `<td>${idx.a2}</td><td>${format(d)}</td><td>${unit||'-'}</td><td>${val(entry,'.sid')}</td><td>${val(entry,'.fr')}</td><td>${val(entry,'.conc')}</td><td>${val(entry,'.time')}</td><td>${val(entry,'.util')}</td><td>${entry.querySelector('.em').textContent}</td><td>${entry.querySelector('.co2e').textContent}</td><td><button class='btn btn-danger del'>Delete</button></td>`;
        tbody.insertBefore(tr, entry.nextSibling);
        save('HCFC22 Gas Stream Emissions', { date: d, unit, stream_id: val(entry,'.sid'), flow_rate_m3_min: fnum(val(entry,'.fr')), concentration_g_m3: fnum(val(entry,'.conc')), flow_time_min: fnum(val(entry,'.time')), abatement_utilization_fraction: fnum(val(entry,'.util')), hfc23_emissions_t: fnum(entry.querySelector('.em').textContent), co2e_t: fnum(entry.querySelector('.co2e').textContent), gwp: GWP }, (dn)=> tr.setAttribute('data-doc', dn||''));
        idx.a2 += 1; entry.querySelector('td:first-child').textContent = idx.a2; clearA2(entry);
        tr.querySelector('.del').addEventListener('click', ()=> delRow(tr, 'HCFC22 Gas Stream Emissions'));
    }
    function clearA2(r){ r.querySelectorAll('input').forEach(i=>{ if(i.type==='date'){ i.value=today(); } else { i.value=''; } }); r.querySelector('.em').textContent='0.00'; r.querySelector('.co2e').textContent='0.00'; }

    async function buildA3(){
        const tbody = scopeRoot.querySelector('#approach3Body'); if(!tbody) return; const units = await getUnits();
        const row = document.createElement('tr'); row.className='data-entry-row';
        row.innerHTML = `<td>${idx.a3}</td><td><input type=\"date\" class=\"form-control date\" data-frappe-ignore=\"true\" value=\"${today()}\"></td><td><select class=\"form-control unit\" data-frappe-ignore=\"true\"><option value=\"\">-- Unit --</option>${unitOptions(units)}</select></td><td><input type=\"number\" class=\"form-control prod\" step=\"0.01\"></td><td><input type=\"number\" class=\"form-control cbe\" step=\"0.01\"></td><td><input type=\"number\" class=\"form-control fbe\" step=\"0.01\"></td><td><span class=\"calculated-value ccf\">0.81</span></td><td><span class=\"calculated-value fcf\">0.54</span></td><td><span class=\"calculated-value loss\">1.0</span></td><td><span class=\"calculated-value ef\">0.00</span></td><td><input type=\"number\" class=\"form-control untreated\" step=\"0.01\" placeholder=\"0-1\"></td><td><span class=\"calculated-value em\">0.00</span></td><td><span class=\"calculated-value co2e\">0.00</span></td><td><button class=\"btn btn-success add\">Add</button></td>`;
        tbody.appendChild(row);
        const calc = ()=>{ const prod = fnum(val(row,'.prod')); const ef = computeEF_A3(); row.querySelector('.ef').textContent=ef.toFixed(4); const un = fnum(val(row,'.untreated')); const em = prod*ef*un; const co2e = em*GWP; row.querySelector('.em').textContent=em.toFixed(2); row.querySelector('.co2e').textContent=co2e.toFixed(2); };
        function computeEF_A3(){ const ccf=0.81, fcf=0.54, loss=1.0; const cbeVal=row.querySelector('.cbe').value.trim(); const fbeVal=row.querySelector('.fbe').value.trim(); const cbe=(cbeVal===''?100:parseFloat(cbeVal))/100; const fbe=(fbeVal===''?90:parseFloat(fbeVal))/100;
            // Map defaults * efficiencies to EF via constant; adjust constant later if needed
            return ccf*fcf*loss*cbe*fbe*0.05; }
        row.querySelectorAll('input').forEach(i=>{ i.addEventListener('input', calc); i.addEventListener('change', calc); }); calc();
        row.querySelector('.add').addEventListener('click', (e)=>{ e.preventDefault(); addA3(row); });
    }
    function addA3(entry){ const tbody = entry.parentElement; const tr=document.createElement('tr'); tr.className='data-display-row'; const d=entry.querySelector('.date').value; const unit=entry.querySelector('.unit').value; const cbeInput=entry.querySelector('.cbe').value.trim(); const fbeInput=entry.querySelector('.fbe').value.trim(); const cbeUsed=(cbeInput===''?'100':cbeInput); const fbeUsed=(fbeInput===''?'90':fbeInput); tr.innerHTML = `<td>${idx.a3}</td><td>${format(d)}</td><td>${unit||'-'}</td><td>${val(entry,'.prod')}</td><td>${cbeUsed}</td><td>${fbeUsed}</td><td>0.81</td><td>0.54</td><td>1.0</td><td>${entry.querySelector('.ef').textContent}</td><td>${val(entry,'.untreated')}</td><td>${entry.querySelector('.em').textContent}</td><td>${entry.querySelector('.co2e').textContent}</td><td><button class='btn btn-danger del'>Delete</button></td>`; tbody.insertBefore(tr, entry.nextSibling); save('HCFC22 Balance Emissions', { date: d, unit, production_t: fnum(val(entry,'.prod')), carbon_balance_efficiency_pct: fnum(cbeUsed), fluorine_balance_efficiency_pct: fnum(fbeUsed), carbon_content_factor: 0.81, fluorine_content_factor: 0.54, loss_factor: 1.0, emission_factor_t_per_t: fnum(entry.querySelector('.ef').textContent), untreated_fraction: fnum(val(entry,'.untreated')), hfc23_emissions_t: fnum(entry.querySelector('.em').textContent), co2e_t: fnum(entry.querySelector('.co2e').textContent), gwp: GWP }, (dn)=> tr.setAttribute('data-doc', dn||'')); idx.a3+=1; entry.querySelector('td:first-child').textContent=idx.a3; clearA3(entry); tr.querySelector('.del').addEventListener('click', ()=> delRow(tr,'HCFC22 Balance Emissions')); }
    function clearA3(r){ r.querySelectorAll('input').forEach(i=>{ if(i.type==='date'){ i.value=today(); } else { i.value=''; } }); r.querySelector('.ef').textContent='0.00'; r.querySelector('.em').textContent='0.00'; r.querySelector('.co2e').textContent='0.00'; }

    async function buildA4(){ const tbody = scopeRoot.querySelector('#approach4Body'); if(!tbody) return; const units = await getUnits(); const row=document.createElement('tr'); row.className='data-entry-row'; row.innerHTML = `<td>${idx.a4}</td><td><input type=\"date\" class=\"form-control date\" value=\"${today()}\"></td><td><select class=\"form-control unit\"><option value=\"\">-- Unit --</option>${unitOptions(units)}</select></td><td><input type=\"number\" class=\"form-control prod\" step=\"0.01\"></td><td><div class=\"vintage\"><label><input type=\"radio\" name=\"vintage\" value=\"pre\" checked> Pre‑1995</label> <label><input type=\"radio\" name=\"vintage\" value=\"post\"> 1995+</label></div></td><td><span class=\"calculated-value ef\">0.04</span></td><td><input type=\"number\" class=\"form-control un\" step=\"0.01\" placeholder=\"0-1\"></td><td><span class=\"calculated-value em\">0.00</span></td><td><span class=\"calculated-value co2e\">0.00</span></td><td><button class=\"btn btn-success add\">Add</button></td>`; tbody.appendChild(row); const calc=()=>{ const ef = row.querySelector('input[name="vintage"]:checked').value==='pre'?0.04:0.03; row.querySelector('.ef').textContent=ef.toFixed(2); const prod=fnum(val(row,'.prod')); const un=fnum(val(row,'.un')); const em = prod*ef*un; const co2e=em*GWP; row.querySelector('.em').textContent=em.toFixed(2); row.querySelector('.co2e').textContent=co2e.toFixed(2); }; row.querySelectorAll('input').forEach(i=>{ i.addEventListener('input', calc); i.addEventListener('change', calc); }); calc(); row.querySelector('.add').addEventListener('click',(e)=>{ e.preventDefault(); addA4(row); }); }
    function addA4(entry){ const tbody=entry.parentElement; const tr=document.createElement('tr'); tr.className='data-display-row'; const d=entry.querySelector('.date').value; const unit=entry.querySelector('.unit').value; const ef=entry.querySelector('.ef').textContent; tr.innerHTML=`<td>${idx.a4}</td><td>${format(d)}</td><td>${unit||'-'}</td><td>${val(entry,'.prod')}</td><td>${entry.querySelector('input[name="vintage"]:checked').value==='pre'?'Pre‑1995':'1995+'}</td><td>${ef}</td><td>${val(entry,'.un')}</td><td>${entry.querySelector('.em').textContent}</td><td>${entry.querySelector('.co2e').textContent}</td><td><button class='btn btn-danger del'>Delete</button></td>`; tbody.insertBefore(tr, entry.nextSibling); save('HCFC22 Production Emissions',{ date:d, unit, production_t:fnum(val(entry,'.prod')), vintage: entry.querySelector('input[name="vintage"]:checked').value, emission_factor_t_per_t: fnum(ef), untreated_fraction: fnum(val(entry,'.un')), hfc23_emissions_t: fnum(entry.querySelector('.em').textContent), co2e_t: fnum(entry.querySelector('.co2e').textContent), gwp:GWP }, (dn)=> tr.setAttribute('data-doc', dn||'')); idx.a4+=1; entry.querySelector('td:first-child').textContent=idx.a4; clearA4(entry); tr.querySelector('.del').addEventListener('click', ()=> delRow(tr,'HCFC22 Production Emissions')); }
    function clearA4(r){ r.querySelectorAll('input').forEach(i=>{ if(i.type==='date'){ i.value=today(); } else if(i.type==='radio'){ if(i.value==='pre') i.checked=true; } else { i.value=''; } }); r.querySelector('.ef').textContent='0.04'; r.querySelector('.em').textContent='0.00'; r.querySelector('.co2e').textContent='0.00'; }

    function fnum(v){ const n=parseFloat(v); return isFinite(n)?n:0; }
    function val(s,sel,def=''){ const el=s.querySelector(sel); if(!el) return def; if(el.tagName==='INPUT'||el.tagName==='SELECT') return el.type==='number'? (parseFloat(el.value)||0).toString(): (el.value||def); return el.value||def; }
    function format(d){ if(!d) return '-'; return new Date(d).toLocaleDateString(); }
    function attachBlockers(){ const container=scopeRoot.querySelector('.hcfc22-container'); if(!container) return; const handler=(e)=>{ if(!container.contains(e.target)) return; e.stopPropagation(); if((e.ctrlKey||e.metaKey)|| e.key==='/' || e.key==='?'){ e.preventDefault(); } }; ['keydown','keypress','keyup'].forEach(ev=>document.addEventListener(ev,handler,true)); }

    function save(dt, data, cb){ frappe.call({ method:'frappe.client.insert', args:{ doc:{ doctype: dt, ...data } }, callback:(r)=> cb && cb(r.message && r.message.name), error: (err)=>{ console.error('Save error', dt, err); cb && cb(null); } }); }
    function delRow(tr, dt){ const dn=tr.getAttribute('data-doc'); if(!dn){ tr.remove(); return; } frappe.call({ method:'frappe.client.delete', args:{ doctype: dt, name: dn }, callback: ()=> tr.remove(), error: ()=> tr.remove() }); }

    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', ()=> init()); } else { init(); }
})();


