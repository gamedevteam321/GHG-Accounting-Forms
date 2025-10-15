// Wait for DOM to be ready and root_element to be available
(function(){
	'use strict';
	
	// Function to initialize when root_element is available
	function initDRIForm(root_element){
		if(!root_element){ 
			console.error('DRI Production: root_element not provided'); 
			return; 
		}
		
		const $ = (sel)=> root_element.querySelector(sel);
		const $$ = (sel)=> root_element.querySelectorAll(sel);

	let userCompany = '';
	let unitOptions = [];
	let entryCounter = 1;

	const CH4_EF_DEFAULT = 1; // kg/unit DRI (default as specified)
	const CO2_CONVERSION_FACTOR = 44 / 12; // Molecular weight ratio CO2/C

	async function init(){
		await loadUserContext();
		buildStep1();
		buildStep2();
		wireTabs();
		await loadHistory();
	}

	async function loadUserContext(){
		try{
			const userResp = await frappe.call({ 
				method: 'frappe.client.get_value', 
				args: { 
					doctype: 'User', 
					fieldname: 'company', 
					filters: { name: frappe.session.user }
				}
			});
			userCompany = userResp.message?.company || '';
			let units = [];
			if(userCompany){
				const r = await frappe.call({ 
					method: 'frappe.client.get_list', 
					args: { 
						doctype: 'Units', 
						fields:['name'], 
						filters:{ company: userCompany }, 
						limit_page_length: 1000 
					}
				});
				units = (r.message||[]).map(u=>u.name);
			}
			if(units.length===0){
				const r2 = await frappe.call({ 
					method: 'frappe.client.get_list', 
					args: { 
						doctype: 'Units', 
						fields:['name'], 
						limit_page_length: 1000 
					}
				});
				units = (r2.message||[]).map(u=>u.name);
			}
			unitOptions = units;
		}catch(e){ 
			console.error('Error loading user context:', e);
			unitOptions = []; 
		}
	}

	function unitSelectHtml(){
		return `<select class="form-control unit-select" required>
			<option value="">Select Unit</option>
			${unitOptions.map(u=>`<option value="${u}">${u}</option>`).join('')}
		</select>`;
	}

	function buildStep1(){
		const tbody = $('#co2Body'); 
		if(!tbody) return; 
		tbody.innerHTML='';
		
		const row = document.createElement('tr');
		const today = new Date().toISOString().split('T')[0];
		
		row.innerHTML = `
			<td><span class="sno">${entryCounter}</span></td>
			<td><input type="date" class="form-control date-input" value="${today}" required /></td>
			<td>${unitSelectHtml()}</td>
			<td><input type="number" class="form-control ng-amount" step="0.01" min="0" placeholder="0.00" /></td>
			<td><input type="number" class="form-control ng-carbon" step="0.000001" min="0" max="1" placeholder="0.000000" title="Fraction between 0 and 1" /></td>
			<td><input type="number" class="form-control cb-amount" step="0.01" min="0" placeholder="0.00" /></td>
			<td><input type="number" class="form-control cb-carbon" step="0.000001" min="0" max="1" placeholder="0.000000" title="Fraction between 0 and 1" /></td>
			<td><input type="number" class="form-control mc-amount" step="0.01" min="0" placeholder="0.00" /></td>
			<td><input type="number" class="form-control mc-carbon" step="0.000001" min="0" max="1" placeholder="0.000000" title="Fraction between 0 and 1" /></td>
			<td><span class="calculated-value total-co2">0.00</span></td>
		`;
		
		tbody.appendChild(row);
		attachStep1Handlers(row);
	}

	function buildStep2(){
		const tbody = $('#ch4Body'); 
		if(!tbody) return; 
		tbody.innerHTML='';
		
		const row = document.createElement('tr');
		row.innerHTML = `
			<td><span class="sno2">${entryCounter}</span></td>
			<td><span class="readonly-value date2">-</span></td>
			<td><span class="readonly-value unit2">-</span></td>
			<td><input type="number" class="form-control dri-produced-input" step="0.01" min="0" placeholder="0.00" required /></td>
			<td><input type="number" class="form-control ch4-ef" step="0.000001" min="0" value="${CH4_EF_DEFAULT}" required /></td>
			<td><span class="calculated-value ch4-total">0.00000</span></td>
			<td><button class="btn-save" id="saveEntryBtn">Add</button></td>
		`;
		
		tbody.appendChild(row);
		$('#prevToCO2')?.addEventListener('click', ()=> activateStep(1));
		$('#nextToCH4')?.addEventListener('click', ()=> activateStep(2));
		row.querySelector('.dri-produced-input').addEventListener('input', ()=> recomputeCH4(row));
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
		const row = $('#co2Body tr');
		if(!row) return false;
		
		const date = row.querySelector('.date-input')?.value;
		const unit = row.querySelector('.unit-select')?.value;
		
		if(!date){
			frappe.msgprint({ title:'Validation Error', indicator:'red', message:'Please select a date.' });
			return false;
		}
		if(!unit){
			frappe.msgprint({ title:'Validation Error', indicator:'red', message:'Please select a unit.' });
			return false;
		}
		
		// At least one fuel type should have data
		const ngAmt = parseFloat(row.querySelector('.ng-amount')?.value || 0);
		const cbAmt = parseFloat(row.querySelector('.cb-amount')?.value || 0);
		const mcAmt = parseFloat(row.querySelector('.mc-amount')?.value || 0);
		
		if(ngAmt === 0 && cbAmt === 0 && mcAmt === 0){
			frappe.msgprint({ title:'Validation Error', indicator:'red', message:'Please enter at least one fuel consumption amount.' });
			return false;
		}
		
		return true;
	}

	function activateStep(step){
		$$('.tab-btn').forEach(b=> b.classList.toggle('active', parseInt(b.dataset.step,10)===step));
		$$('.tab-content').forEach(c=> c.classList.toggle('active', parseInt(c.dataset.step,10)===step));
		if(step===2){ prefillStep2FromStep1(); }
	}

	function attachStep1Handlers(row){
		// Attach input listeners for real-time calculation
		const inputs = row.querySelectorAll('.ng-amount, .ng-carbon, .cb-amount, .cb-carbon, .mc-amount, .mc-carbon');
		inputs.forEach(input => {
			input.addEventListener('input', () => {
				validateFractionInput(input);
				recomputeCO2(row);
			});
		});
	}

	function validateFractionInput(input){
		// Only validate carbon content inputs
		if(!input.classList.contains('ng-carbon') && 
		   !input.classList.contains('cb-carbon') && 
		   !input.classList.contains('mc-carbon')){
			return;
		}
		
		const value = parseFloat(input.value);
		if(!isNaN(value)){
			if(value < 0){
				input.value = 0;
				frappe.msgprint({ title:'Validation Warning', indicator:'orange', message:'Carbon content cannot be negative. Value set to 0.' });
			} else if(value > 1){
				input.value = 1;
				frappe.msgprint({ title:'Validation Warning', indicator:'orange', message:'Carbon content cannot exceed 1. Value set to 1.' });
			}
		}
	}

	function recomputeCO2(row){
		// Get all values
		const ngAmt = parseFloat(row.querySelector('.ng-amount')?.value || 0);
		const ngCarbon = parseFloat(row.querySelector('.ng-carbon')?.value || 0);
		const cbAmt = parseFloat(row.querySelector('.cb-amount')?.value || 0);
		const cbCarbon = parseFloat(row.querySelector('.cb-carbon')?.value || 0);
		const mcAmt = parseFloat(row.querySelector('.mc-amount')?.value || 0);
		const mcCarbon = parseFloat(row.querySelector('.mc-carbon')?.value || 0);
		
		// Calculate total carbon
		const totalCarbon = (ngAmt * ngCarbon) + (cbAmt * cbCarbon) + (mcAmt * mcCarbon);
		
		// Calculate CO2
		const co2 = totalCarbon * CO2_CONVERSION_FACTOR;
		
		// Update display
		row.querySelector('.total-co2').textContent = co2.toFixed(2);
	}

	function prefillStep2FromStep1(){
		const step1 = $('#co2Body tr'); 
		if(!step1) return;
		
		const date = step1.querySelector('.date-input')?.value || '-';
		const unit = step1.querySelector('.unit-select')?.value || '-';
		
		$('.date2').textContent = date;
		$('.unit2').textContent = unit;
		
		recomputeCH4($('#ch4Body tr'));
	}

	function recomputeCH4(row){
		if(!row) return;
		
		const driProduced = parseFloat(row.querySelector('.dri-produced-input')?.value || 0);
		const ch4Ef = parseFloat(row.querySelector('.ch4-ef')?.value || 0);
		const total = driProduced * ch4Ef;
		
		row.querySelector('.ch4-total').textContent = total.toFixed(5);
	}

	async function saveEntry(){
		const step1 = $('#co2Body tr'); 
		if(!step1) return;
		
		const date = step1.querySelector('.date-input')?.value || '';
		const unit = step1.querySelector('.unit-select')?.value || '';
		
		if(!date || !unit){ 
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please select Date and Unit.'}); 
			return; 
		}
		
		// Get CO2 data
		const ngAmt = parseFloat(step1.querySelector('.ng-amount')?.value || 0);
		const ngCarbon = parseFloat(step1.querySelector('.ng-carbon')?.value || 0);
		const cbAmt = parseFloat(step1.querySelector('.cb-amount')?.value || 0);
		const cbCarbon = parseFloat(step1.querySelector('.cb-carbon')?.value || 0);
		const mcAmt = parseFloat(step1.querySelector('.mc-amount')?.value || 0);
		const mcCarbon = parseFloat(step1.querySelector('.mc-carbon')?.value || 0);
		const co2Total = parseFloat(step1.querySelector('.total-co2')?.textContent || 0);
		
		// Get CH4 data
		const ch4Row = $('#ch4Body tr');
		const driProduced = parseFloat(ch4Row.querySelector('.dri-produced-input')?.value || 0);
		const ch4Ef = parseFloat(ch4Row.querySelector('.ch4-ef')?.value || 0);
		const ch4Total = parseFloat(ch4Row.querySelector('.ch4-total')?.textContent || 0);
		
		// Validate Step 2 inputs
		if(!driProduced || driProduced <= 0){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter Amount of DRI produced.'});
			return;
		}
		if(!ch4Ef || ch4Ef <= 0){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter CH4 Emission Factor.'});
			return;
		}
		
		const payload = {
			doctype: 'DRI Production Emissions', 
			date, 
			company: userCompany, 
			unit,
			natural_gas_amount_t: ngAmt,
			natural_gas_carbon_content: ngCarbon,
			coke_breeze_amount_t: cbAmt,
			coke_breeze_carbon_content: cbCarbon,
			metallurgical_coke_amount_t: mcAmt,
			metallurgical_coke_carbon_content: mcCarbon,
			total_co2_t: co2Total,
			dri_produced_t: driProduced,
			ch4_emission_factor: ch4Ef,
			total_ch4_kg: ch4Total,
		};
		
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
			
			// Reset all fuel inputs
			const inputs = step1Row.querySelectorAll('.ng-amount, .ng-carbon, .cb-amount, .cb-carbon, .mc-amount, .mc-carbon');
			inputs.forEach(input => input.value = '');
			
			// Reset total CO2
			const totalCO2 = step1Row.querySelector('.total-co2');
			if(totalCO2) totalCO2.textContent = '0.00';
		}
		
		// Clear Step 2
		const step2Row = $('#ch4Body tr');
		if(step2Row){
			const driInput = step2Row.querySelector('.dri-produced-input');
			if(driInput) driInput.value = '';
			
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
			const r = await frappe.call({ 
				method:'frappe.client.get_list', 
				args:{ 
					doctype:'DRI Production Emissions', 
					fields:['name','date','unit','total_co2_t','total_ch4_kg'], 
					order_by:'creation desc', 
					limit_page_length:100 
				}
			});
			const tbody = $('#historyBody'); 
			if(!tbody) return; 
			tbody.innerHTML='';
			
			(r.message||[]).forEach((doc, idx)=>{
				const tr = document.createElement('tr');
				tr.innerHTML = `
					<td>${idx+1}</td>
					<td>${doc.date||'-'}</td>
					<td>${doc.unit||'-'}</td>
					<td>${(doc.total_co2_t||0).toFixed(2)}</td>
					<td>${(doc.total_ch4_kg||0).toFixed(5)}</td>
					<td>
						<button class="btn-view" data-id="${doc.name}">View</button> 
						<button class="btn-delete" data-id="${doc.name}">Delete</button>
					</td>
				`;
				tbody.appendChild(tr);
			});
			
			$$('.btn-delete').forEach(b=> b.addEventListener('click', deleteEntry));
			$$('.btn-view').forEach(b=> b.addEventListener('click', viewEntry));
		}catch(e){
			console.error('Error loading history:', e);
		}
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
							doctype:'DRI Production Emissions', 
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
		const name = e.target.dataset.id; 
		if(!name) return;
		
		try{
			const r = await frappe.call({ 
				method:'frappe.client.get', 
				args:{ doctype:'DRI Production Emissions', name }
			});
			const d = r.message; 
			if(!d) return;
			
			const body = $('#modalBody'); 
			const overlay = $('#modalOverlay');
			if(!body || !overlay) return;
			
			body.innerHTML = `
				<div class="modal-section">
					<h3>Basic Information</h3>
					<div class="modal-row"><span class="modal-label">Date:</span> <span class="modal-value">${d.date||'-'}</span></div>
					<div class="modal-row"><span class="modal-label">Unit:</span> <span class="modal-value">${d.unit||'-'}</span></div>
				</div>
				<div class="modal-section">
					<h3>CO2 Emissions</h3>
					<div class="modal-row"><span class="modal-label">Natural Gas Amount (t):</span> <span class="modal-value">${d.natural_gas_amount_t||0}</span></div>
					<div class="modal-row"><span class="modal-label">Natural Gas Carbon Content:</span> <span class="modal-value">${d.natural_gas_carbon_content||0}</span></div>
					<div class="modal-row"><span class="modal-label">Coke Breeze Amount (t):</span> <span class="modal-value">${d.coke_breeze_amount_t||0}</span></div>
					<div class="modal-row"><span class="modal-label">Coke Breeze Carbon Content:</span> <span class="modal-value">${d.coke_breeze_carbon_content||0}</span></div>
					<div class="modal-row"><span class="modal-label">Metallurgical Coke Amount (t):</span> <span class="modal-value">${d.metallurgical_coke_amount_t||0}</span></div>
					<div class="modal-row"><span class="modal-label">Metallurgical Coke Carbon Content:</span> <span class="modal-value">${d.metallurgical_coke_carbon_content||0}</span></div>
					<div class="modal-row"><span class="modal-label">Total CO2 (t):</span> <span class="modal-value">${(d.total_co2_t||0).toFixed(2)}</span></div>
				</div>
				<div class="modal-section">
					<h3>CH4 Emissions</h3>
					<div class="modal-row"><span class="modal-label">DRI Produced (t):</span> <span class="modal-value">${d.dri_produced_t||0}</span></div>
					<div class="modal-row"><span class="modal-label">CH4 Emission Factor:</span> <span class="modal-value">${d.ch4_emission_factor||0}</span></div>
					<div class="modal-row"><span class="modal-label">Total CH4 (kg):</span> <span class="modal-value">${(d.total_ch4_kg||0).toFixed(5)}</span></div>
				</div>
			`;
			
			overlay.style.display='flex';
			$('#modalClose').onclick = ()=> overlay.style.display='none';
			overlay.onclick = (ev)=>{ if(ev.target===overlay) overlay.style.display='none'; };
		}catch(err){
			console.error('Error viewing entry:', err);
		}
	}

	init();
	} // end initDRIForm
	
	// Check if root_element is already available (Frappe provides it)
	if(typeof root_element !== 'undefined' && root_element){
		initDRIForm(root_element);
	} else {
		// Fallback: wait for DOM and find container
		if(document.readyState === 'loading'){
			document.addEventListener('DOMContentLoaded', ()=>{
				const container = document.querySelector('.dri-container');
				if(container) initDRIForm(container);
			});
		} else {
			const container = document.querySelector('.dri-container');
			if(container) initDRIForm(container);
		}
	}
})();

