// Wait for DOM to be ready and root_element to be available
(function(){
	'use strict';
	
	// Function to initialize when root_element is available
	function initIronSteelForm(root_element){
		if(!root_element){ 
			console.error('Iron & Steel Production: root_element not provided'); 
			return; 
		}
		
		const $ = (sel)=> root_element.querySelector(sel);
		const $$ = (sel)=> root_element.querySelectorAll(sel);

	let userCompany = '';
	let unitOptions = [];
	let carbonDefaults = [];
	let entryCounter = 1;

	const CO2_CONVERSION_FACTOR = 44 / 12; // Molecular weight ratio CO2/C

	async function init(){
		await Promise.all([loadUserContext(), loadCarbonDefaults()]);
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

	async function loadCarbonDefaults(){
		try{
			const r = await frappe.call({ 
				method:'frappe.client.get_list', 
				args:{ 
					doctype:'Carbon Content Defaults', 
					fields:['fuel_name','carbon_content_kg_per_kg','is_active'], 
					filters:{ is_active:1 }, 
					limit_page_length: 1000, 
					order_by:'fuel_name asc' 
				}
			});
			carbonDefaults = r.message || [];
		}catch(e){ 
			console.error('Error loading carbon defaults:', e);
			carbonDefaults = []; 
		}
	}

	function unitSelectHtml(){
		return `<select class="form-control unit-select" required>
			<option value="">Select Unit</option>
			${unitOptions.map(u=>`<option value="${u}">${u}</option>`).join('')}
		</select>`;
	}

	function resourceSelectHtml(){
		return `<select class="form-control resource-select" required>
			<option value="">Select Resource</option>
			${carbonDefaults.map(c=>`<option value="${c.fuel_name}" data-carbon="${c.carbon_content_kg_per_kg}">${c.fuel_name}</option>`).join('')}
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
			<td>
				<div class="resources-list">
					<div class="resource-row">
						${resourceSelectHtml()}
						<button type="button" class="btn-mini-remove" style="display:none;">&times;</button>
					</div>
					<button type="button" class="btn-add-resource" title="Add resource">+</button>
				</div>
			</td>
			<td>
				<div class="resource-amounts-list">
					<input type="number" class="form-control resource-amount-input" step="0.01" min="0" placeholder="0.00" />
				</div>
			</td>
			<td>
				<div class="resource-carbon-list">
					<span class="readonly-value resource-carbon-display">-</span>
				</div>
			</td>
			<td><span class="calculated-value total-resource-carbon">0.000000</span></td>
			<td><input type="number" class="form-control steel-amount" step="0.01" min="0" placeholder="0.00" /></td>
			<td><input type="number" class="form-control steel-carbon" step="0.000001" min="0" max="1" placeholder="0.000000" title="Fraction between 0 and 1" /></td>
			<td><input type="number" class="form-control iron-amount" step="0.01" min="0" placeholder="0.00" /></td>
			<td><input type="number" class="form-control iron-carbon" step="0.000001" min="0" max="1" placeholder="0.000000" title="Fraction between 0 and 1" /></td>
			<td><input type="number" class="form-control bfg-amount" step="0.01" min="0" placeholder="0.00" /></td>
			<td><input type="number" class="form-control bfg-carbon" step="0.000001" min="0" max="1" placeholder="0.000000" title="Fraction between 0 and 1" /></td>
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
			<td><input type="number" class="form-control pig-iron-input" step="0.01" min="0" placeholder="0.00" required /></td>
			<td><input type="number" class="form-control ch4-ef" step="0.000001" min="0" placeholder="" required /></td>
			<td><span class="calculated-value ch4-total">0.00000</span></td>
			<td><button class="btn-save" id="saveEntryBtn">Add</button></td>
		`;
		
		tbody.appendChild(row);
		$('#prevToCO2')?.addEventListener('click', ()=> activateStep(1));
		$('#nextToCH4')?.addEventListener('click', ()=> activateStep(2));
		row.querySelector('.pig-iron-input').addEventListener('input', ()=> recomputeCH4(row));
		row.querySelector('.ch4-ef').addEventListener('input', ()=> recomputeCH4(row));
		$('#saveEntryBtn')?.addEventListener('click', saveEntry);
	}

	function wireTabs(){
		const step1Btn = $$('.tab-btn')[0];
		const step2Btn = $$('.tab-btn')[1];
		if(step2Btn){ step2Btn.classList.add('disabled'); }
		
		$$('.tab-btn').forEach(btn=>{
			btn.addEventListener('click', ()=>{
				if(btn.classList.contains('disabled')) return;
				activateStep(parseInt(btn.dataset.step,10));
			});
		});
		
		$('#nextToCH4')?.addEventListener('click', ()=>{
			if(validateStep1()){
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
		
		// Check if at least one resource has data
		const resourceSelects = row.querySelectorAll('.resource-select');
		const resourceAmounts = row.querySelectorAll('.resource-amount-input');
		let hasResource = false;
		resourceSelects.forEach((select, idx) => {
			if(select.value && parseFloat(resourceAmounts[idx]?.value || 0) > 0){
				hasResource = true;
			}
		});
		
		if(!hasResource){
			frappe.msgprint({ title:'Validation Error', indicator:'red', message:'Please enter at least one resource with amount.' });
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
		// Add resource button
		const addResourceBtn = row.querySelector('.btn-add-resource');
		if(addResourceBtn){
			addResourceBtn.addEventListener('click', ()=> addResourceRow(row));
		}
		
		// Resource selection changes
		const resourceSelects = row.querySelectorAll('.resource-select');
		resourceSelects.forEach((select, idx) => {
			select.addEventListener('change', ()=> {
				updateResourceCarbonDisplay(row);
				recomputeCO2(row);
			});
		});
		
		// Resource amount inputs
		const resourceAmountInputs = row.querySelectorAll('.resource-amount-input');
		resourceAmountInputs.forEach(input => {
			input.addEventListener('input', ()=> recomputeCO2(row));
		});
		
		// Steel, Iron, BFG inputs
		const carbonInputs = row.querySelectorAll('.steel-carbon, .iron-carbon, .bfg-carbon');
		carbonInputs.forEach(input => {
			input.addEventListener('input', ()=> {
				validateFractionInput(input);
				recomputeCO2(row);
			});
		});
		
		const amountInputs = row.querySelectorAll('.steel-amount, .iron-amount, .bfg-amount');
		amountInputs.forEach(input => {
			input.addEventListener('input', ()=> recomputeCO2(row));
		});
	}

	function addResourceRow(row){
		const resourcesList = row.querySelector('.resources-list');
		const amountsList = row.querySelector('.resource-amounts-list');
		const carbonList = row.querySelector('.resource-carbon-list');
		
		if(!resourcesList || !amountsList || !carbonList) return;
		
		// Create new resource row
		const newResourceRow = document.createElement('div');
		newResourceRow.className = 'resource-row';
		newResourceRow.innerHTML = `
			${resourceSelectHtml()}
			<button type="button" class="btn-mini-remove">&times;</button>
		`;
		
		// Create new amount input
		const newAmountInput = document.createElement('input');
		newAmountInput.type = 'number';
		newAmountInput.className = 'form-control resource-amount-input';
		newAmountInput.step = '0.01';
		newAmountInput.min = '0';
		newAmountInput.placeholder = '0.00';
		
		// Create new carbon display
		const newCarbonDisplay = document.createElement('span');
		newCarbonDisplay.className = 'readonly-value resource-carbon-display';
		newCarbonDisplay.textContent = '-';
		
		// Insert before the + button
		const addBtn = resourcesList.querySelector('.btn-add-resource');
		resourcesList.insertBefore(newResourceRow, addBtn);
		amountsList.appendChild(newAmountInput);
		carbonList.appendChild(newCarbonDisplay);
		
		// Attach event listeners
		const newSelect = newResourceRow.querySelector('.resource-select');
		const removeBtn = newResourceRow.querySelector('.btn-mini-remove');
		
		newSelect.addEventListener('change', ()=> {
			updateResourceCarbonDisplay(row);
			recomputeCO2(row);
		});
		newAmountInput.addEventListener('input', ()=> recomputeCO2(row));
		removeBtn.addEventListener('click', ()=> {
			newResourceRow.remove();
			newAmountInput.remove();
			newCarbonDisplay.remove();
			recomputeCO2(row);
		});
		
		updateResourceCarbonDisplay(row);
		recomputeCO2(row);
	}

	function updateResourceCarbonDisplay(row){
		const resourceSelects = row.querySelectorAll('.resource-select');
		const carbonDisplays = row.querySelectorAll('.resource-carbon-display');
		
		resourceSelects.forEach((select, idx) => {
			const selectedOption = select.options[select.selectedIndex];
			const carbonContent = selectedOption ? parseFloat(selectedOption.dataset.carbon) : 0;
			if(carbonDisplays[idx]){
				carbonDisplays[idx].textContent = isNaN(carbonContent) ? '-' : carbonContent.toFixed(6);
			}
		});
	}

	function validateFractionInput(input){
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
		// Calculate total resource carbon
		let totalResourceCarbon = 0;
		const resourceSelects = row.querySelectorAll('.resource-select');
		const resourceAmounts = row.querySelectorAll('.resource-amount-input');
		
		resourceSelects.forEach((select, idx) => {
			const selectedOption = select.options[select.selectedIndex];
			if(!selectedOption) return;
			const carbon = parseFloat(selectedOption.dataset.carbon || 0);
			const amount = parseFloat(resourceAmounts[idx]?.value || 0);
			if(amount > 0 && carbon > 0){
				totalResourceCarbon += amount * carbon;
			}
		});
		
		// Update total resource carbon display
		const totalResourceCarbonDisplay = row.querySelector('.total-resource-carbon');
		if(totalResourceCarbonDisplay){
			totalResourceCarbonDisplay.textContent = totalResourceCarbon.toFixed(6);
		}
		
		// Get steel, iron, BFG data
		const steelAmount = parseFloat(row.querySelector('.steel-amount')?.value || 0);
		const steelCarbon = parseFloat(row.querySelector('.steel-carbon')?.value || 0);
		const ironAmount = parseFloat(row.querySelector('.iron-amount')?.value || 0);
		const ironCarbon = parseFloat(row.querySelector('.iron-carbon')?.value || 0);
		const bfgAmount = parseFloat(row.querySelector('.bfg-amount')?.value || 0);
		const bfgCarbon = parseFloat(row.querySelector('.bfg-carbon')?.value || 0);
		
		// Calculate net carbon
		const netCarbon = totalResourceCarbon 
			- (steelAmount * steelCarbon) 
			- (ironAmount * ironCarbon) 
			- (bfgAmount * bfgCarbon);
		
		// Calculate CO2
		const co2 = netCarbon * CO2_CONVERSION_FACTOR;
		
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
		
		const pigIron = parseFloat(row.querySelector('.pig-iron-input')?.value || 0);
		const ch4Ef = parseFloat(row.querySelector('.ch4-ef')?.value || 0);
		const total = pigIron * ch4Ef;
		
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
		
		// Build resources JSON
		const resources = [];
		const resourceSelects = step1.querySelectorAll('.resource-select');
		const resourceAmounts = step1.querySelectorAll('.resource-amount-input');
		
		resourceSelects.forEach((select, idx) => {
			const resource = select.value;
			const carbon = parseFloat(select.selectedOptions[0]?.dataset.carbon || 0);
			const amount = parseFloat(resourceAmounts[idx]?.value || 0);
			if(resource && amount > 0){
				resources.push({ 
					resource: resource, 
					amount_t: amount, 
					carbon_content: carbon 
				});
			}
		});
		
		const totalResourceCarbon = parseFloat(step1.querySelector('.total-resource-carbon')?.textContent || 0);
		const steelAmount = parseFloat(step1.querySelector('.steel-amount')?.value || 0);
		const steelCarbon = parseFloat(step1.querySelector('.steel-carbon')?.value || 0);
		const ironAmount = parseFloat(step1.querySelector('.iron-amount')?.value || 0);
		const ironCarbon = parseFloat(step1.querySelector('.iron-carbon')?.value || 0);
		const bfgAmount = parseFloat(step1.querySelector('.bfg-amount')?.value || 0);
		const bfgCarbon = parseFloat(step1.querySelector('.bfg-carbon')?.value || 0);
		const co2Total = parseFloat(step1.querySelector('.total-co2')?.textContent || 0);
		
		// Get CH4 data
		const ch4Row = $('#ch4Body tr');
		const pigIron = parseFloat(ch4Row.querySelector('.pig-iron-input')?.value || 0);
		const ch4Ef = parseFloat(ch4Row.querySelector('.ch4-ef')?.value || 0);
		const ch4Total = parseFloat(ch4Row.querySelector('.ch4-total')?.textContent || 0);
		
		// Validate Step 2 inputs
		if(!pigIron || pigIron <= 0){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter Amount of Pig Iron produced.'});
			return;
		}
		if(!ch4Ef || ch4Ef <= 0){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter CH4 Emission Factor.'});
			return;
		}
		
		const payload = {
			doctype: 'Iron Steel Production Emissions', 
			date, 
			company: userCompany, 
			unit,
			resources_json: JSON.stringify(resources),
			total_resources_carbon_t: totalResourceCarbon,
			steel_amount_t: steelAmount,
			steel_carbon_content: steelCarbon,
			iron_amount_t: ironAmount,
			iron_carbon_content: ironCarbon,
			bfg_amount_t: bfgAmount,
			bfg_carbon_content: bfgCarbon,
			total_co2_t: co2Total,
			pig_iron_produced_t: pigIron,
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
			
			// Remove all extra resource rows, keep only first one
			const resourcesList = step1Row.querySelector('.resources-list');
			const resourceRows = resourcesList.querySelectorAll('.resource-row');
			resourceRows.forEach((resourceRow, idx) => {
				if(idx > 0) resourceRow.remove();
			});
			
			// Reset first resource row
			const firstResourceSelect = step1Row.querySelector('.resource-select');
			if(firstResourceSelect) firstResourceSelect.value = '';
			
			// Remove extra amount inputs, keep only first
			const amountsList = step1Row.querySelector('.resource-amounts-list');
			const amountInputs = amountsList.querySelectorAll('.resource-amount-input');
			amountInputs.forEach((input, idx) => {
				if(idx === 0) input.value = '';
				else input.remove();
			});
			
			// Remove extra carbon displays, keep only first
			const carbonList = step1Row.querySelector('.resource-carbon-list');
			const carbonDisplays = carbonList.querySelectorAll('.resource-carbon-display');
			carbonDisplays.forEach((span, idx) => {
				if(idx === 0) span.textContent = '-';
				else span.remove();
			});
			
			// Reset other inputs
			const inputs = step1Row.querySelectorAll('.steel-amount, .steel-carbon, .iron-amount, .iron-carbon, .bfg-amount, .bfg-carbon');
			inputs.forEach(input => input.value = '');
			
			// Reset displays
			const totalResourceCarbon = step1Row.querySelector('.total-resource-carbon');
			if(totalResourceCarbon) totalResourceCarbon.textContent = '0.000000';
			
			const totalCO2 = step1Row.querySelector('.total-co2');
			if(totalCO2) totalCO2.textContent = '0.00';
		}
		
		// Clear Step 2
		const step2Row = $('#ch4Body tr');
		if(step2Row){
			const pigIronInput = step2Row.querySelector('.pig-iron-input');
			if(pigIronInput) pigIronInput.value = '';
			
			const ch4EfInput = step2Row.querySelector('.ch4-ef');
			if(ch4EfInput) ch4EfInput.value = '';
			
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
					doctype:'Iron Steel Production Emissions', 
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
		
		frappe.confirm(
			'Are you sure you want to delete this entry?',
			async () => {
				try{
					await frappe.call({ 
						method:'frappe.client.delete', 
						args:{ 
							doctype:'Iron Steel Production Emissions', 
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
				args:{ doctype:'Iron Steel Production Emissions', name }
			});
			const d = r.message; 
			if(!d) return;
			
			const resources = JSON.parse(d.resources_json || '[]');
			
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
					<h3>Resources Consumed</h3>
					${resources.map(r=>`<div class="modal-row"><span class="modal-label">${r.resource}:</span> <span class="modal-value">${r.amount_t} t (Carbon: ${r.carbon_content})</span></div>`).join('')}
					<div class="modal-row"><span class="modal-label">Total Resource Carbon:</span> <span class="modal-value">${(d.total_resources_carbon_t||0).toFixed(6)} tonnes C</span></div>
				</div>
				<div class="modal-section">
					<h3>Production Data</h3>
					<div class="modal-row"><span class="modal-label">Steel Amount:</span> <span class="modal-value">${d.steel_amount_t||0} t</span></div>
					<div class="modal-row"><span class="modal-label">Steel Carbon Content:</span> <span class="modal-value">${d.steel_carbon_content||0}</span></div>
					<div class="modal-row"><span class="modal-label">Iron Amount:</span> <span class="modal-value">${d.iron_amount_t||0} t</span></div>
					<div class="modal-row"><span class="modal-label">Iron Carbon Content:</span> <span class="modal-value">${d.iron_carbon_content||0}</span></div>
					<div class="modal-row"><span class="modal-label">BFG Amount:</span> <span class="modal-value">${d.bfg_amount_t||0} t</span></div>
					<div class="modal-row"><span class="modal-label">BFG Carbon Content:</span> <span class="modal-value">${d.bfg_carbon_content||0}</span></div>
				</div>
				<div class="modal-section">
					<h3>Emissions</h3>
					<div class="modal-row"><span class="modal-label">Total CO2:</span> <span class="modal-value">${(d.total_co2_t||0).toFixed(2)} tonnes</span></div>
					<div class="modal-row"><span class="modal-label">Pig Iron Produced:</span> <span class="modal-value">${d.pig_iron_produced_t||0} t</span></div>
					<div class="modal-row"><span class="modal-label">CH4 Emission Factor:</span> <span class="modal-value">${d.ch4_emission_factor||0}</span></div>
					<div class="modal-row"><span class="modal-label">Total CH4:</span> <span class="modal-value">${(d.total_ch4_kg||0).toFixed(5)} kg</span></div>
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
	} // end initIronSteelForm
	
	// Check if root_element is already available (Frappe provides it)
	if(typeof root_element !== 'undefined' && root_element){
		initIronSteelForm(root_element);
	} else {
		// Fallback: wait for DOM and find container
		if(document.readyState === 'loading'){
			document.addEventListener('DOMContentLoaded', ()=>{
				const container = document.querySelector('.iron-steel-container');
				if(container) initIronSteelForm(container);
			});
		} else {
			const container = document.querySelector('.iron-steel-container');
			if(container) initIronSteelForm(container);
		}
	}
})();

