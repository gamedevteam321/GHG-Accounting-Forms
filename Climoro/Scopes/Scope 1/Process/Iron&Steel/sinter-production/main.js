// Wait for DOM to be ready and root_element to be available
(function(){
	'use strict';
	
	// Function to initialize when root_element is available
	function initSinterForm(root_element){
		if(!root_element){ 
			console.error('Sinter Production: root_element not provided'); 
			return; 
		}
		
		const $ = (sel)=> root_element.querySelector(sel);
		const $$ = (sel)=> root_element.querySelectorAll(sel);

	let userCompany = '';
	let unitOptions = [];
	let carbonDefaults = [];
	let entryCounter = 1;

	const CH4_EF_DEFAULT = 0.07; // kg CH4 per unit sinter (user input allowed per spec)

	async function init(){
		await Promise.all([loadUserContext(), loadCarbonDefaults()]);
		buildStep1();
		buildStep2();
		wireTabs();
		await loadHistory();
	}

	async function loadUserContext(){
		try{
			const userResp = await frappe.call({ method: 'frappe.client.get_value', args: { doctype: 'User', fieldname: 'company', filters: { name: frappe.session.user }}});
			userCompany = userResp.message?.company || '';
			let units = [];
			if(userCompany){
				const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Units', fields:['name'], filters:{ company: userCompany }, limit_page_length: 1000 }});
				units = (r.message||[]).map(u=>u.name);
			}
			if(units.length===0){
				const r2 = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Units', fields:['name'], limit_page_length: 1000 }});
				units = (r2.message||[]).map(u=>u.name);
			}
			unitOptions = units;
		}catch(e){ unitOptions = []; }
	}

	async function loadCarbonDefaults(){
		try{
			const r = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Carbon Content Defaults', fields:['fuel_name','carbon_content_kg_per_kg','is_active'], filters:{ is_active:1 }, limit_page_length: 1000, order_by:'fuel_name asc' }});
			carbonDefaults = r.message || [];
		}catch(e){ carbonDefaults = []; }
	}

	function unitSelectHtml(){
		return `<select class="form-control unit-select" required><option value="">Select Unit</option>${unitOptions.map(u=>`<option value="${u}">${u}</option>`).join('')}</select>`;
	}

	function materialSelectHtml(){
		return `<select class="form-control material-select"><option value="">Select Material</option>${carbonDefaults.map(c=>`<option value="${c.fuel_name}" data-carbon="${c.carbon_content_kg_per_kg}">${c.fuel_name}</option>`).join('')}</select>`;
	}

	function buildStep1(){
		const tbody = $('#co2Body'); if(!tbody) return; tbody.innerHTML='';
		const row = document.createElement('tr');
		row.innerHTML = `
			<td><span class="sno">${entryCounter}</span></td>
			<td><input type="date" class="form-control date-input" value="${new Date().toISOString().split('T')[0]}" /></td>
			<td>${unitSelectHtml()}</td>
			<td>
                <div class="materials-list">
					<div class="material-row">
						${materialSelectHtml()}
					</div>
                    <button type="button" class="btn-add-material" title="Add material" aria-label="Add material">+</button>
				</div>
			</td>
			<td>
				<div class="amounts-list">
					<input type="number" class="form-control amount-input" step="0.01" min="0" placeholder="0.00" />
				</div>
			</td>
			<td>
				<div class="carbonpct-list">
					<span class="readonly-value carbon-pct">-</span>
				</div>
			</td>
			<td><span class="calculated-value total-material-carbon">0.000000</span></td>
			<td><input type="number" class="form-control offgas-amt" step="0.01" min="0" placeholder="0.00" /></td>
			<td><input type="number" class="form-control offgas-cc" step="0.000001" min="0" max="1" placeholder="0.11" title="Fraction between 0 and 1" /></td>
			<td><span class="calculated-value total-co2">0.00</span></td>
		`;
		tbody.appendChild(row);
		attachStep1Handlers(row);
	}

	function buildStep2(){
		const tbody = $('#ch4Body'); if(!tbody) return; tbody.innerHTML='';
		const row = document.createElement('tr');
		row.innerHTML = `
			<td><span class="sno2">${entryCounter}</span></td>
			<td><span class="readonly-value date2">-</span></td>
			<td><span class="readonly-value unit2">-</span></td>
			<td><input type="number" class="form-control sinter-prod-input" step="0.01" min="0" placeholder="0.00" required /></td>
			<td><input type="number" class="form-control ch4-ef" step="0.000001" min="0" value="${CH4_EF_DEFAULT}" required /></td>
			<td><span class="calculated-value ch4-total">0.00000</span></td>
			<td><button class="btn-save" id="saveEntryBtn">Add</button></td>
		`;
		tbody.appendChild(row);
		$('#prevToCO2')?.addEventListener('click', ()=> activateStep(1));
		$('#nextToCH4')?.addEventListener('click', ()=> activateStep(2));
		row.querySelector('.sinter-prod-input').addEventListener('input', ()=> recomputeCH4(row));
		row.querySelector('.ch4-ef').addEventListener('input', ()=> recomputeCH4(row));
		$('#saveEntryBtn')?.addEventListener('click', saveEntry);
	}

    function wireTabs(){
        // enforce step-by-step: step 2 disabled until step 1 validated
        const step1Btn = $$('.tab-btn')[0];
        const step2Btn = $$('.tab-btn')[1];
        if(step2Btn){ step2Btn.classList.add('disabled'); }
        $$('.tab-btn').forEach(btn=>{
            btn.addEventListener('click', ()=>{
                if(btn.classList.contains('disabled')) return; // block jump
                activateStep(parseInt(btn.dataset.step,10));
            });
        });
        // also gate the Next button by validation
        $('#nextToCH4')?.addEventListener('click', ()=>{
            if(validateStep1()){
                // enable step2 tab and go
                if(step2Btn){ step2Btn.classList.remove('disabled'); }
                activateStep(2);
            }
        });
    }

    function validateStep1(){
        const tr = $('#co2Body tr'); if(!tr) return false;
        const date = tr.querySelector('.date-input')?.value;
        const unit = tr.querySelector('.unit-select')?.value;
        const anyMaterial = !!tr.querySelector('.material-select')?.value;
        if(!date || !unit || !anyMaterial){
            frappe.msgprint({ title:'Validation', indicator:'red', message:'Please fill Date, Unit and select at least one Material.'});
            return false;
        }
        return true;
    }
	function activateStep(step){
		$$('.tab-btn').forEach(b=> b.classList.toggle('active', parseInt(b.dataset.step,10)===step));
		$$('.tab-content').forEach(c=> c.classList.toggle('active', parseInt(c.dataset.step,10)===step));
		if(step===2){ prefillStep2FromStep1(); }
	}

	function attachStep1Handlers(scope){
		const addBtn = scope.querySelector('.btn-add-material');
		addBtn.addEventListener('click', ()=> addMaterialRow(scope));
		const firstSelect = scope.querySelector('.material-select');
		firstSelect.addEventListener('change', ()=> updateCarbonPct(scope));
		scope.querySelector('.amount-input').addEventListener('input', ()=> recomputeCO2(scope));
		scope.querySelector('.offgas-amt').addEventListener('input', ()=> recomputeCO2(scope));
		scope.querySelector('.offgas-cc').addEventListener('input', ()=> recomputeCO2(scope));
	}

	function addMaterialRow(scope){
        const mList = scope.querySelector('.materials-list');
		const aList = scope.querySelector('.amounts-list');
		const cList = scope.querySelector('.carbonpct-list');
		const wrap = document.createElement('div'); wrap.className='material-row'; wrap.innerHTML = materialSelectHtml() + '<button type="button" class="btn-mini-remove">×</button>';
		const amt = document.createElement('input'); amt.type='number'; amt.className='form-control amount-input'; amt.step='0.01'; amt.min='0'; amt.placeholder='0.00';
		const pct = document.createElement('span'); pct.className='readonly-value carbon-pct'; pct.textContent='-';
        // ensure the add button stays at the bottom by inserting before it
        const addBtn = scope.querySelector('.btn-add-material');
        if(addBtn){ mList.insertBefore(wrap, addBtn); } else { mList.appendChild(wrap); }
        aList.appendChild(amt); cList.appendChild(pct);
		wrap.querySelector('.material-select').addEventListener('change', ()=> updateCarbonPct(scope));
		wrap.querySelector('.btn-mini-remove').addEventListener('click', ()=> { wrap.remove(); amt.remove(); pct.remove(); recomputeCO2(scope); });
		amt.addEventListener('input', ()=> recomputeCO2(scope));
	}

	function updateCarbonPct(scope){
		const selects = scope.querySelectorAll('.material-select');
		const pctSpans = scope.querySelectorAll('.carbon-pct');
        selects.forEach((sel, idx)=>{
            const opt = sel.selectedOptions[0];
            if(opt && opt.dataset.carbon){
                const kgkg = parseFloat(opt.dataset.carbon || '0');
                pctSpans[idx].textContent = kgkg.toFixed(6); // display as fraction [0,1]
            }else{
                pctSpans[idx].textContent = '-';
            }
        });
		recomputeCO2(scope);
	}

	function recomputeCO2(scope){
		// Calculate total carbon from process materials
		let materialCarbonTonnes = 0;
		const selects = scope.querySelectorAll('.material-select');
		const amts = scope.querySelectorAll('.amount-input');
		selects.forEach((sel, idx)=>{
			const opt = sel.selectedOptions[0];
			if(!opt) return;
			const kgkg = parseFloat(opt?.dataset?.carbon || '0');
			const amtT = parseFloat(amts[idx]?.value || '0');
			if(amtT>0 && kgkg>0){ materialCarbonTonnes += amtT * kgkg; }
		});
		
		// Update the total material carbon display
		const totalMaterialCarbonDisplay = scope.querySelector('.total-material-carbon');
		if(totalMaterialCarbonDisplay){
			totalMaterialCarbonDisplay.textContent = materialCarbonTonnes.toFixed(6);
		}
		
		// Calculate off-gas carbon (to be SUBTRACTED)
        const offAmt = parseFloat(scope.querySelector('.offgas-amt')?.value || '0');
        let offCC = parseFloat(scope.querySelector('.offgas-cc')?.value || '0');
        // Validate: must be between 0 and 1 (inclusive)
        const offInput = scope.querySelector('.offgas-cc');
        if(!isNaN(offCC)){
            if(offCC < 0){
                offCC = 0;
                if(offInput) offInput.value = '0';
                frappe.msgprint({ title:'Validation', indicator:'orange', message:'Carbon content cannot be negative. Set to 0.'});
            } else if(offCC > 1){
                offCC = 1;
                if(offInput) offInput.value = '1';
                frappe.msgprint({ title:'Validation', indicator:'orange', message:'Carbon content cannot exceed 1. Set to 1.'});
            }
        }
		
		// Calculate net carbon: Material carbon MINUS off-gas carbon
		const offgasCarbon = offAmt * offCC;
		const netCarbonTonnes = materialCarbonTonnes - offgasCarbon;
		
		// Calculate CO2 emissions
		const co2T = netCarbonTonnes * (44/12);
		scope.querySelector('.total-co2').textContent = co2T.toFixed(2);
	}

	function prefillStep2FromStep1(){
		const step1 = $('#co2Body tr'); if(!step1) return;
		const date = step1.querySelector('.date-input')?.value || '-';
		const unit = step1.querySelector('.unit-select')?.value || '-';
		// Sinter produced from Step 1 input (same cell as offgas area? add an input later if needed)
		// For now, derive from amounts sum (yellow rows) only if needed – per spec, user input in Step 1:
		// We'll add dedicated input capture next iteration: use offgas-amt as proxy not correct; set 0.
		const sinterProduced = parseFloat($('#co2Body .offgas-amt')?.value || '0');
		$('.date2').textContent = date; $('.unit2').textContent = unit; $('.sinter-prod').textContent = sinterProduced.toFixed(2);
		recomputeCH4($('#ch4Body tr'));
	}

	function recomputeCH4(scope){
		if(!scope) return;
		const sinter = parseFloat(scope.querySelector('.sinter-prod-input')?.value || '0');
		const ef = parseFloat(scope.querySelector('.ch4-ef')?.value || '0');
		const total = sinter * ef;
		scope.querySelector('.ch4-total').textContent = total.toFixed(5);
	}

	async function saveEntry(){
		const step1 = $('#co2Body tr'); if(!step1) return;
		const date = step1.querySelector('.date-input')?.value || '';
		const unit = step1.querySelector('.unit-select')?.value || '';
		if(!date || !unit){ frappe.msgprint({ title:'Validation', indicator:'red', message:'Please select Date and Unit.'}); return; }
		// Build materials JSON
		const materials = [];
		const selects = step1.querySelectorAll('.material-select');
		const amts = step1.querySelectorAll('.amount-input');
		selects.forEach((sel, idx)=>{
			const mat = sel.value; const kgkg = parseFloat(sel.selectedOptions[0]?.dataset?.carbon || '0');
			const amtT = parseFloat(amts[idx]?.value || '0');
			if(mat && amtT>0){ materials.push({ material: mat, amount_t: amtT, carbon_content_kg_per_kg: kgkg, row_carbon_t: amtT*kgkg }); }
		});
		const offAmt = parseFloat(step1.querySelector('.offgas-amt')?.value || '0');
		const offCC = parseFloat(step1.querySelector('.offgas-cc')?.value || '0');
		const offC = (offAmt>0 && offCC>0) ? offAmt*offCC : 0;
		const co2T = parseFloat(step1.querySelector('.total-co2')?.textContent || '0');
		const ch4Row = $('#ch4Body tr');
		const sinterProd = parseFloat(ch4Row.querySelector('.sinter-prod-input')?.value || '0');
		const ch4Ef = parseFloat(ch4Row.querySelector('.ch4-ef')?.value || '0');
		const ch4Total = parseFloat(ch4Row.querySelector('.ch4-total')?.textContent || '0');

		const payload = {
			doctype: 'Sinter Production Emissions', date, company: userCompany, unit,
			process_materials_json: JSON.stringify(materials),
			offgas_amount_t: offAmt, offgas_carbon_content: offCC, offgas_carbon_t: offC,
			sinter_produced_t: sinterProd,
			total_co2_t: co2T,
			ch4_ef_kg_per_unit: ch4Ef,
			total_ch4_kg: ch4Total,
		};
		// Validate Step 2 inputs
		if(!sinterProd || sinterProd <= 0){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter Amount of sinter produced.'});
			return;
		}
		if(!ch4Ef || ch4Ef <= 0){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter CH4 Emission Factor.'});
			return;
		}
		
		try{
			await frappe.call({ method:'frappe.client.insert', args:{ doc: payload }});
			frappe.msgprint({ title:'Success', indicator:'green', message:'Entry saved successfully!'});
			await loadHistory();
			
			// Reset form and return to Step 1
			resetForm();
			activateStep(1);
			
			// Disable Step 2 tab again
			const step2Btn = $$('.tab-btn')[1];
			if(step2Btn){ step2Btn.classList.add('disabled'); }
		}catch(e){
			console.error('Save error:', e);
			frappe.msgprint({ title:'Error', indicator:'red', message:'Failed to save entry. Please try again.'});
		}
	}
	
	function resetForm(){
		// Clear Step 1
		const step1Row = $('#co2Body tr');
		if(step1Row){
			// Reset date to today
			const dateInput = step1Row.querySelector('.date-input');
			if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];
			
			// Reset unit
			const unitSelect = step1Row.querySelector('.unit-select');
			if(unitSelect) unitSelect.value = '';
			
			// Remove all extra material rows, keep only first one
			const materialsList = step1Row.querySelector('.materials-list');
			const materialRows = materialsList.querySelectorAll('.material-row');
			materialRows.forEach((row, idx) => {
				if(idx > 0) row.remove(); // Keep first row
			});
			
			// Reset first material row
			const firstMaterialSelect = step1Row.querySelector('.material-select');
			if(firstMaterialSelect) firstMaterialSelect.value = '';
			
			// Remove extra amount inputs, keep only first
			const amountsList = step1Row.querySelector('.amounts-list');
			const amountInputs = amountsList.querySelectorAll('.amount-input');
			amountInputs.forEach((input, idx) => {
				if(idx === 0) input.value = '';
				else input.remove();
			});
			
			// Remove extra carbon displays, keep only first
			const carbonList = step1Row.querySelector('.carbonpct-list');
			const carbonDisplays = carbonList.querySelectorAll('.carbon-pct');
			carbonDisplays.forEach((span, idx) => {
				if(idx === 0) span.textContent = '-';
				else span.remove();
			});
			
			// Reset off-gas fields
			const offgasAmt = step1Row.querySelector('.offgas-amt');
			if(offgasAmt) offgasAmt.value = '';
			
			const offgasCC = step1Row.querySelector('.offgas-cc');
			if(offgasCC) offgasCC.value = '0.11';
			
			// Reset total CO2
			const totalCO2 = step1Row.querySelector('.total-co2');
			if(totalCO2) totalCO2.textContent = '0.00';
			
			// Reset total material carbon
			const totalMaterialCarbon = step1Row.querySelector('.total-material-carbon');
			if(totalMaterialCarbon) totalMaterialCarbon.textContent = '0.000000';
		}
		
		// Clear Step 2
		const step2Row = $('#ch4Body tr');
		if(step2Row){
			const sinterInput = step2Row.querySelector('.sinter-prod-input');
			if(sinterInput) sinterInput.value = '';
			
			const ch4EfInput = step2Row.querySelector('.ch4-ef');
			if(ch4EfInput) ch4EfInput.value = CH4_EF_DEFAULT;
			
			const ch4Total = step2Row.querySelector('.ch4-total');
			if(ch4Total) ch4Total.textContent = '0.00000';
			
			// Reset readonly displays
			const date2 = step2Row.querySelector('.date2');
			if(date2) date2.textContent = '-';
			
			const unit2 = step2Row.querySelector('.unit2');
			if(unit2) unit2.textContent = '-';
		}
	}

	async function loadHistory(){
		try{
			const r = await frappe.call({ method:'frappe.client.get_list', args:{ doctype:'Sinter Production Emissions', fields:['name','date','unit','total_co2_t','total_ch4_kg'], order_by:'creation desc', limit_page_length:100 }});
			const tbody = $('#historyBody'); if(!tbody) return; tbody.innerHTML='';
			(r.message||[]).forEach((doc, idx)=>{
				const tr = document.createElement('tr');
				tr.innerHTML = `<td>${idx+1}</td><td>${doc.date||'-'}</td><td>${doc.unit||'-'}</td><td>${(doc.total_co2_t||0).toFixed(2)}</td><td>${(doc.total_ch4_kg||0).toFixed(5)}</td><td><button class="btn-view" data-id="${doc.name}">View</button> <button class="btn-delete" data-id="${doc.name}">Delete</button></td>`;
				tbody.appendChild(tr);
			});
		$$('.btn-delete').forEach(b=> b.addEventListener('click', deleteEntry));
		$$('.btn-view').forEach(b=> b.addEventListener('click', viewEntry));
		}catch(e){}
	}

	async function deleteEntry(e){
		const name = e.target.dataset.id; 
		if(!name) return;
		
		// Show confirmation dialog
		frappe.confirm(
			'Are you sure you want to delete this entry?',
			async () => {
				// User confirmed - proceed with deletion
				try{
					await frappe.call({ 
						method:'frappe.client.delete', 
						args:{ 
							doctype:'Sinter Production Emissions', 
							name: name 
						}
					});
					frappe.msgprint({ 
						title:'Success', 
						indicator:'green', 
						message:'Entry deleted successfully.'
					});
					await loadHistory();
				}catch(err){
					console.error('Delete error:', err);
					frappe.msgprint({ 
						title:'Error', 
						indicator:'red', 
						message:'Failed to delete entry. Please try again.'
					});
				}
			},
			() => {
				// User cancelled - do nothing
				frappe.msgprint({ 
					title:'Cancelled', 
					indicator:'blue', 
					message:'Entry was not deleted.'
				});
			}
		);
	}

	async function viewEntry(e){
		const name = e.target.dataset.id; if(!name) return;
		try{
			const r = await frappe.call({ method:'frappe.client.get', args:{ doctype:'Sinter Production Emissions', name }});
			const d = r.message; if(!d) return;
			const mat = JSON.parse(d.process_materials_json||'[]');
			const body = $('#modalBody'); const overlay = $('#modalOverlay');
			body.innerHTML = `
				<div class="modal-row"><span class="modal-label">Date:</span> <span class="modal-value">${d.date}</span></div>
				<div class="modal-row"><span class="modal-label">Unit:</span> <span class="modal-value">${d.unit||'-'}</span></div>
				<h3>Materials</h3>
				${mat.map(m=>`<div class="modal-row">${m.material}: ${m.amount_t} t; C=${m.carbon_content_kg_per_kg} kg/kg</div>`).join('')}
				<div class="modal-row"><span class="modal-label">Off-gas:</span> <span class="modal-value">${d.offgas_amount_t||0} t; C=${d.offgas_carbon_content||0} kg/kg</span></div>
				<div class="modal-row"><span class="modal-label">CO2 (t):</span> <span class="modal-value">${(d.total_co2_t||0).toFixed(2)}</span></div>
				<div class="modal-row"><span class="modal-label">Sinter produced (t):</span> <span class="modal-value">${d.sinter_produced_t||0}</span></div>
				<div class="modal-row"><span class="modal-label">CH4 EF:</span> <span class="modal-value">${d.ch4_ef_kg_per_unit||0}</span></div>
				<div class="modal-row"><span class="modal-label">CH4 (kg):</span> <span class="modal-value">${(d.total_ch4_kg||0).toFixed(5)}</span></div>
			`;
			overlay.style.display='flex';
			$('#modalClose').onclick = ()=> overlay.style.display='none';
			overlay.onclick = (ev)=>{ if(ev.target===overlay) overlay.style.display='none'; };
		}catch(err){}
	}

	init();
	} // end initSinterForm
	
	// Check if root_element is already available (Frappe provides it)
	if(typeof root_element !== 'undefined' && root_element){
		initSinterForm(root_element);
	} else {
		// Fallback: wait for DOM and find container
		if(document.readyState === 'loading'){
			document.addEventListener('DOMContentLoaded', ()=>{
				const container = document.querySelector('.sinter-container');
				if(container) initSinterForm(container);
			});
		} else {
			const container = document.querySelector('.sinter-container');
			if(container) initSinterForm(container);
		}
	}
})();
