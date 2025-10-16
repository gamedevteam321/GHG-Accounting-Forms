// Wait for DOM to be ready and root_element to be available
(function(){
	'use strict';
	
	// Function to initialize when root_element is available
	function initLimeForm(root_element){
		if(!root_element){ 
			console.error('Onsite Lime Production: root_element not provided'); 
			return; 
		}
		
		const $ = (sel)=> root_element.querySelector(sel);
		const $$ = (sel)=> root_element.querySelectorAll(sel);

	let userCompany = '';
	let unitOptions = [];
	let carbonateDefaults = [];
	let entryCounter = 1;

	const FRACTION_CALC_CARBONATE = 1.0; // Fixed readonly value

	async function init(){
		await Promise.all([loadUserContext(), loadCarbonateDefaults()]);
		buildEntryForm();
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

	async function loadCarbonateDefaults(){
		try{
			const r = await frappe.call({ 
				method:'frappe.client.get_list', 
				args:{ 
					doctype:'Lime Carbonate Defaults', 
					fields:['name','carbonate_name','mineral_name','emission_factor','notes','is_active'], 
					filters:{ is_active:1 }, 
					limit_page_length: 1000, 
					order_by:'carbonate_name asc' 
				}
			});
			carbonateDefaults = r.message || [];
		}catch(e){ 
			console.error('Error loading carbonate defaults:', e);
			carbonateDefaults = []; 
		}
	}

	function unitSelectHtml(){
		return `<select class="form-control unit-select" required>
			<option value="">Select Unit</option>
			${unitOptions.map(u=>`<option value="${u}">${u}</option>`).join('')}
		</select>`;
	}

	function carbonateSelectHtml(){
		return `<select class="form-control carbonate-select" required>
			<option value="">Select Carbonate</option>
			${carbonateDefaults.map(c=>`<option value="${c.name}" data-ef="${c.emission_factor}" data-notes="${c.notes||''}">${c.carbonate_name} (${c.mineral_name})</option>`).join('')}
		</select>`;
	}

	function buildEntryForm(){
		const tbody = $('#limeBody'); 
		if(!tbody) return; 
		tbody.innerHTML='';
		
		const row = document.createElement('tr');
		const today = new Date().toISOString().split('T')[0];
		
		row.innerHTML = `
			<td><span class="sno">${entryCounter}</span></td>
			<td><input type="date" class="form-control date-input" value="${today}" required /></td>
			<td>${unitSelectHtml()}</td>
			<td>${carbonateSelectHtml()}</td>
			<td><span class="readonly-value ef-display">-</span></td>
			<td><input type="number" class="form-control carbonate-amount" step="0.01" min="0" placeholder="0.00" required /></td>
			<td><span class="readonly-value fraction-carb-display">${FRACTION_CALC_CARBONATE.toFixed(1)}</span></td>
			<td><input type="number" class="form-control lkd-amount" step="0.01" min="0" placeholder="0.00" required /></td>
			<td><input type="number" class="form-control weight-fraction" step="0.000001" min="0" max="1" placeholder="0.000000" title="Fraction between 0 and 1" required /></td>
			<td><input type="number" class="form-control fraction-lkd-input" step="0.000001" min="0" max="1" value="1.0" placeholder="1.0" title="Fraction between 0 and 1" required /></td>
			<td><span class="calculated-value co2-total">0.00</span></td>
			<td><button class="btn-save">Add</button></td>
		`;
		
		tbody.appendChild(row);
		attachHandlers(row);
	}

	function attachHandlers(row){
		const carbonateSelect = row.querySelector('.carbonate-select');
		const carbonateAmount = row.querySelector('.carbonate-amount');
		const lkdAmount = row.querySelector('.lkd-amount');
		const weightFraction = row.querySelector('.weight-fraction');
		const fractionLkdInput = row.querySelector('.fraction-lkd-input');
		const saveBtn = row.querySelector('.btn-save');
		
		// Carbonate selection changes
		carbonateSelect.addEventListener('change', ()=> {
			updateEFDisplay(row);
			recomputeCO2(row);
			showCarbonateNote(row);
		});
		
		// Amount inputs
		carbonateAmount.addEventListener('input', ()=> recomputeCO2(row));
		lkdAmount.addEventListener('input', ()=> recomputeCO2(row));
		
		// Weight fraction validation
		weightFraction.addEventListener('input', ()=> {
			validateFractionInput(weightFraction);
			recomputeCO2(row);
		});
		
		// LKD fraction validation
		fractionLkdInput.addEventListener('input', ()=> {
			validateFractionInput(fractionLkdInput);
			recomputeCO2(row);
		});
		
		// Save button
		saveBtn.addEventListener('click', ()=> saveEntry(row));
	}

	function updateEFDisplay(row){
		const select = row.querySelector('.carbonate-select');
		const selectedOption = select.options[select.selectedIndex];
		const ef = selectedOption ? parseFloat(selectedOption.dataset.ef) : 0;
		const efDisplay = row.querySelector('.ef-display');
		if(efDisplay){
			efDisplay.textContent = isNaN(ef) || ef === 0 ? '-' : ef.toFixed(2);
		}
	}

	function showCarbonateNote(row){
		const select = row.querySelector('.carbonate-select');
		const selectedOption = select.options[select.selectedIndex];
		const notes = selectedOption ? selectedOption.dataset.notes : '';
		
		if(notes && notes.trim() !== ''){
			frappe.msgprint({ 
				title:'Carbonate Information', 
				indicator:'blue', 
				message: notes 
			});
		}
	}

	function validateFractionInput(input){
		const value = parseFloat(input.value);
		if(!isNaN(value)){
			if(value < 0){
				input.value = 0;
				frappe.msgprint({ title:'Validation Warning', indicator:'orange', message:'Fraction cannot be negative. Value set to 0.' });
			} else if(value > 1){
				input.value = 1;
				frappe.msgprint({ title:'Validation Warning', indicator:'orange', message:'Fraction cannot exceed 1. Value set to 1.' });
			}
		}
	}

	function recomputeCO2(row){
		const carbonateSelect = row.querySelector('.carbonate-select');
		const selectedOption = carbonateSelect.options[carbonateSelect.selectedIndex];
		const ef = selectedOption ? parseFloat(selectedOption.dataset.ef || 0) : 0;
		
		const carbonateAmt = parseFloat(row.querySelector('.carbonate-amount')?.value || 0);
		const lkdAmt = parseFloat(row.querySelector('.lkd-amount')?.value || 0);
		const weightFrac = parseFloat(row.querySelector('.weight-fraction')?.value || 0);
		const fractionLkd = parseFloat(row.querySelector('.fraction-lkd-input')?.value || 1.0);
		
		// Formula: CO2 = (carbonate_amt × EF × 1.0) - ((lkd_amt × weight_frac × (1 - fraction_lkd)) × EF)
		const co2 = (carbonateAmt * ef * FRACTION_CALC_CARBONATE) - ((lkdAmt * weightFrac * (1 - fractionLkd)) * ef);
		
		row.querySelector('.co2-total').textContent = co2.toFixed(2);
	}

	async function saveEntry(row){
		const date = row.querySelector('.date-input')?.value || '';
		const unit = row.querySelector('.unit-select')?.value || '';
		const carbonateSelect = row.querySelector('.carbonate-select');
		const carbonate = carbonateSelect?.value || '';
		const selectedOption = carbonateSelect.options[carbonateSelect.selectedIndex];
		const ef = selectedOption ? parseFloat(selectedOption.dataset.ef || 0) : 0;
		const carbonateAmt = parseFloat(row.querySelector('.carbonate-amount')?.value || 0);
		const lkdAmt = parseFloat(row.querySelector('.lkd-amount')?.value || 0);
		const weightFrac = parseFloat(row.querySelector('.weight-fraction')?.value || 0);
		const fractionLkd = parseFloat(row.querySelector('.fraction-lkd-input')?.value || 1.0);
		const co2 = parseFloat(row.querySelector('.co2-total')?.textContent || 0);
		
		// Validation
		if(!date){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please select a date.' });
			return;
		}
		if(!unit){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please select a unit.' });
			return;
		}
		if(!carbonate){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please select a carbonate.' });
			return;
		}
		if(!carbonateAmt || carbonateAmt <= 0){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter amount of carbonate used.' });
			return;
		}
		if(isNaN(lkdAmt) || lkdAmt < 0){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter valid LKD amount (must be >= 0).' });
			return;
		}
		if(isNaN(weightFrac) || weightFrac < 0 || weightFrac > 1){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter valid weight fraction (must be between 0 and 1).' });
			return;
		}
		if(isNaN(fractionLkd) || fractionLkd < 0 || fractionLkd > 1){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter valid LKD fraction (must be between 0 and 1).' });
			return;
		}
		
		const payload = {
			doctype: 'Onsite Lime Production Emissions',
			date,
			company: userCompany,
			unit,
			carbonate,
			emission_factor: ef,
			carbonate_amount_t: carbonateAmt,
			fraction_calc_carbonate: FRACTION_CALC_CARBONATE,
			lkd_amount_t: lkdAmt,
			weight_fraction_lkd: weightFrac,
			fraction_calc_lkd: fractionLkd,
			total_co2_t: co2,
		};
		
		try{
			await frappe.call({ method:'frappe.client.insert', args:{ doc: payload }});
			frappe.msgprint({ title:'Success', indicator:'green', message:'Entry saved successfully!'});
			await loadHistory();
			resetForm(row);
		}catch(e){
			console.error('Save error:', e);
			frappe.msgprint({ title:'Error', indicator:'red', message:'Failed to save entry. Please try again.'});
		}
	}

	function resetForm(row){
		// Reset date to today
		const dateInput = row.querySelector('.date-input');
		if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];
		
		// Reset unit
		const unitSelect = row.querySelector('.unit-select');
		if(unitSelect) unitSelect.value = '';
		
		// Reset carbonate
		const carbonateSelect = row.querySelector('.carbonate-select');
		if(carbonateSelect) carbonateSelect.value = '';
		
		// Reset EF display
		const efDisplay = row.querySelector('.ef-display');
		if(efDisplay) efDisplay.textContent = '-';
		
		// Reset inputs
		const inputs = row.querySelectorAll('input[type="number"]');
		inputs.forEach(input => input.value = '');
		
		// Reset CO2 display
		const co2Display = row.querySelector('.co2-total');
		if(co2Display) co2Display.textContent = '0.00';
	}

	async function loadHistory(){
		try{
			const r = await frappe.call({ 
				method:'frappe.client.get_list', 
				args:{ 
					doctype:'Onsite Lime Production Emissions', 
					fields:['name','date','unit','carbonate','total_co2_t'], 
					order_by:'creation desc', 
					limit_page_length:100 
				}
			});
			const tbody = $('#historyBody'); 
			if(!tbody) return; 
			tbody.innerHTML='';
			
			// Fetch carbonate names for all entries
			const carbonateIds = [...new Set((r.message||[]).map(d => d.carbonate).filter(Boolean))];
			const carbonateNames = {};
			
			if(carbonateIds.length > 0){
				try{
					const carbonateResp = await frappe.call({
						method:'frappe.client.get_list',
						args:{
							doctype:'Lime Carbonate Defaults',
							fields:['name','carbonate_name'],
							filters:[['name','in',carbonateIds]]
						}
					});
					(carbonateResp.message||[]).forEach(c => {
						carbonateNames[c.name] = c.carbonate_name;
					});
				}catch(e){
					console.error('Error fetching carbonate names:', e);
				}
			}
			
			(r.message||[]).forEach((doc, idx)=>{
				const carbonateName = carbonateNames[doc.carbonate] || doc.carbonate || '-';
				const tr = document.createElement('tr');
				tr.innerHTML = `
					<td>${idx+1}</td>
					<td>${doc.date||'-'}</td>
					<td>${doc.unit||'-'}</td>
					<td>${carbonateName}</td>
					<td>${(doc.total_co2_t||0).toFixed(2)}</td>
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
		
		frappe.confirm(
			'Are you sure you want to delete this entry?',
			async () => {
				try{
					await frappe.call({ 
						method:'frappe.client.delete', 
						args:{ 
							doctype:'Onsite Lime Production Emissions', 
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
				args:{ doctype:'Onsite Lime Production Emissions', name }
			});
			const d = r.message; 
			if(!d) return;
			
			// Fetch carbonate name
			let carbonateName = d.carbonate || '-';
			if(d.carbonate){
				try{
					const carbonateResp = await frappe.call({
						method:'frappe.client.get_value',
						args:{
							doctype:'Lime Carbonate Defaults',
							fieldname:['carbonate_name','mineral_name'],
							filters:{name:d.carbonate}
						}
					});
					if(carbonateResp.message){
						carbonateName = `${carbonateResp.message.carbonate_name} (${carbonateResp.message.mineral_name})`;
					}
				}catch(e){
					console.error('Error fetching carbonate details:', e);
				}
			}
			
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
					<h3>Carbonate Properties</h3>
					<div class="modal-row"><span class="modal-label">Carbonate:</span> <span class="modal-value">${carbonateName}</span></div>
					<div class="modal-row"><span class="modal-label">Emission Factor:</span> <span class="modal-value">${(d.emission_factor||0).toFixed(2)}</span></div>
					<div class="modal-row"><span class="modal-label">Amount Used:</span> <span class="modal-value">${(d.carbonate_amount_t||0).toFixed(6)} tonnes</span></div>
					<div class="modal-row"><span class="modal-label">Fraction Calcination (Carbonate):</span> <span class="modal-value">${(d.fraction_calc_carbonate||0).toFixed(1)}</span></div>
				</div>
				<div class="modal-section">
					<h3>Lime Kiln Dust (LKD) Properties</h3>
					<div class="modal-row"><span class="modal-label">LKD Amount:</span> <span class="modal-value">${(d.lkd_amount_t||0).toFixed(6)} tonnes</span></div>
					<div class="modal-row"><span class="modal-label">Weight Fraction:</span> <span class="modal-value">${(d.weight_fraction_lkd||0).toFixed(6)}</span></div>
					<div class="modal-row"><span class="modal-label">Fraction Calcination (LKD):</span> <span class="modal-value">${(d.fraction_calc_lkd||0).toFixed(6)}</span></div>
				</div>
				<div class="modal-section">
					<h3>Emissions</h3>
					<div class="modal-row"><span class="modal-label">Total CO2:</span> <span class="modal-value">${(d.total_co2_t||0).toFixed(2)} tonnes</span></div>
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
	} // end initLimeForm
	
	// Check if root_element is already available (Frappe provides it)
	if(typeof root_element !== 'undefined' && root_element){
		initLimeForm(root_element);
	} else {
		// Fallback: wait for DOM and find container
		if(document.readyState === 'loading'){
			document.addEventListener('DOMContentLoaded', ()=>{
				const container = document.querySelector('.lime-container');
				if(container) initLimeForm(container);
			});
		} else {
			const container = document.querySelector('.lime-container');
			if(container) initLimeForm(container);
		}
	}
})();

