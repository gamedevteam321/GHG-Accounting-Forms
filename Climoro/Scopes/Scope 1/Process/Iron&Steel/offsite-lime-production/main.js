// Wait for DOM to be ready and root_element to be available
(function(){
	'use strict';
	
	// Function to initialize when root_element is available
	function initOffsiteLimeForm(root_element){
		if(!root_element){ 
			console.error('Offsite Lime Production: root_element not provided'); 
			return; 
		}
		
		const $ = (sel)=> root_element.querySelector(sel);
		const $$ = (sel)=> root_element.querySelectorAll(sel);

	let userCompany = '';
	let unitOptions = [];
	let limeDefaults = [];
	let entryCounter = 1;

	// Fixed readonly values for hydrated lime correction
	const HYDRATED_PROPORTION = 0.1;
	const WATER_CONTENT = 0.28;
	const LKD_CORRECTION = 1.02;

	async function init(){
		await Promise.all([loadUserContext(), loadLimeDefaults()]);
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

	async function loadLimeDefaults(){
		try{
			const r = await frappe.call({ 
				method:'frappe.client.get_list', 
				args:{ 
					doctype:'Offsite Lime Defaults', 
					fields:['name','lime_type','stoichiometric_ratio','default_cao_content','notes','is_active'], 
					filters:{ is_active:1 }, 
					limit_page_length: 1000, 
					order_by:'lime_type asc' 
				}
			});
			limeDefaults = r.message || [];
		}catch(e){ 
			console.error('Error loading lime defaults:', e);
			limeDefaults = []; 
		}
	}

	function unitSelectHtml(){
		return `<select class="form-control unit-select" required>
			<option value="">Select Unit</option>
			${unitOptions.map(u=>`<option value="${u}">${u}</option>`).join('')}
		</select>`;
	}

	function limeTypeSelectHtml(){
		return `<select class="form-control lime-type-select" required>
			<option value="">Select Lime Type</option>
			${limeDefaults.map(l=>`<option value="${l.name}" data-stoich="${l.stoichiometric_ratio}" data-cao="${l.default_cao_content}" data-type="${l.lime_type}" data-notes="${l.notes||''}">${l.lime_type}</option>`).join('')}
		</select>`;
	}

	function buildEntryForm(){
		const tbody = $('#offsiteLimeBody'); 
		if(!tbody) return; 
		tbody.innerHTML='';
		
		const row = document.createElement('tr');
		const today = new Date().toISOString().split('T')[0];
		
		row.innerHTML = `
			<td><span class="sno">${entryCounter}</span></td>
			<td><input type="date" class="form-control date-input" value="${today}" required /></td>
			<td>${unitSelectHtml()}</td>
			<td>
				${limeTypeSelectHtml()}
				<div class="radio-group dolomitic-radio" style="display:none;">
					<div class="radio-option">
						<input type="radio" id="developed" name="country_type" value="developed" checked />
						<label for="developed">Developed (0.95)</label>
					</div>
					<div class="radio-option">
						<input type="radio" id="developing" name="country_type" value="developing" />
						<label for="developing">Developing (0.85)</label>
					</div>
					<span class="dolomitic-note">Select country type for Dolomitic lime CaO content</span>
				</div>
			</td>
			<td><input type="number" class="form-control amount-produced" step="0.01" min="0" placeholder="0.00" required /></td>
			<td><span class="readonly-value cao-display">-</span></td>
			<td><span class="readonly-value stoich-display">-</span></td>
			<td><span class="readonly-value hydrated-prop-display">${HYDRATED_PROPORTION.toFixed(1)}</span></td>
			<td><span class="readonly-value water-content-display">${WATER_CONTENT.toFixed(2)}</span></td>
			<td><span class="readonly-value lkd-display">${LKD_CORRECTION.toFixed(2)}</span></td>
			<td><span class="calculated-value co2-total">0.00</span></td>
			<td><button class="btn-save">Add</button></td>
		`;
		
		tbody.appendChild(row);
		attachHandlers(row);
	}

	function attachHandlers(row){
		const limeTypeSelect = row.querySelector('.lime-type-select');
		const amountProduced = row.querySelector('.amount-produced');
		const saveBtn = row.querySelector('.btn-save');
		const radioButtons = row.querySelectorAll('input[name="country_type"]');
		
		// Lime type selection changes
		limeTypeSelect.addEventListener('change', ()=> {
			updateLimeDefaults(row);
			recomputeCO2(row);
			showLimeNotes(row);
		});
		
		// Amount input
		amountProduced.addEventListener('input', ()=> recomputeCO2(row));
		
		// Radio button changes (for Dolomitic)
		radioButtons.forEach(radio => {
			radio.addEventListener('change', ()=> {
				updateDolomiticCaO(row);
				recomputeCO2(row);
			});
		});
		
		// Save button
		saveBtn.addEventListener('click', ()=> saveEntry(row));
	}

	function updateLimeDefaults(row){
		const select = row.querySelector('.lime-type-select');
		const selectedOption = select.options[select.selectedIndex];
		const limeType = selectedOption ? selectedOption.dataset.type : '';
		const stoich = selectedOption ? parseFloat(selectedOption.dataset.stoich) : 0;
		const cao = selectedOption ? parseFloat(selectedOption.dataset.cao) : 0;
		
		// Update stoichiometric ratio display
		const stoichDisplay = row.querySelector('.stoich-display');
		if(stoichDisplay){
			stoichDisplay.textContent = isNaN(stoich) || stoich === 0 ? '-' : stoich.toFixed(3);
		}
		
		// Show/hide Dolomitic radio buttons
		const radioGroup = row.querySelector('.dolomitic-radio');
		if(radioGroup){
			if(limeType === 'Dolomitic lime'){
				radioGroup.style.display = 'flex';
				// Reset to developed (0.95)
				row.querySelector('#developed').checked = true;
				updateDolomiticCaO(row);
			} else {
				radioGroup.style.display = 'none';
				// Set default CaO for other lime types
				const caoDisplay = row.querySelector('.cao-display');
				if(caoDisplay){
					caoDisplay.textContent = isNaN(cao) || cao === 0 ? '-' : cao.toFixed(2);
				}
			}
		}
	}

	function updateDolomiticCaO(row){
		const developedRadio = row.querySelector('#developed');
		const cao = developedRadio && developedRadio.checked ? 0.95 : 0.85;
		const caoDisplay = row.querySelector('.cao-display');
		if(caoDisplay){
			caoDisplay.textContent = cao.toFixed(2);
		}
	}

	function showLimeNotes(row){
		const select = row.querySelector('.lime-type-select');
		const selectedOption = select.options[select.selectedIndex];
		const notes = selectedOption ? selectedOption.dataset.notes : '';
		
		if(notes && notes.trim() !== ''){
			frappe.msgprint({ 
				title:'Lime Type Information', 
				indicator:'blue', 
				message: notes 
			});
		}
	}

	function recomputeCO2(row){
		const limeTypeSelect = row.querySelector('.lime-type-select');
		const selectedOption = limeTypeSelect.options[limeTypeSelect.selectedIndex];
		const stoich = selectedOption ? parseFloat(selectedOption.dataset.stoich || 0) : 0;
		
		const amount = parseFloat(row.querySelector('.amount-produced')?.value || 0);
		const caoText = row.querySelector('.cao-display')?.textContent || '-';
		const cao = caoText === '-' ? 0 : parseFloat(caoText);
		
		// Formula: CO2 = (Amount × (CaO × Stoich)) × (1 - (Hydrated_prop × Water_content)) × LKD_correction
		const co2 = (amount * (cao * stoich)) * (1 - (HYDRATED_PROPORTION * WATER_CONTENT)) * LKD_CORRECTION;
		
		row.querySelector('.co2-total').textContent = co2.toFixed(2);
	}

	async function saveEntry(row){
		const date = row.querySelector('.date-input')?.value || '';
		const unit = row.querySelector('.unit-select')?.value || '';
		const limeTypeSelect = row.querySelector('.lime-type-select');
		const limeType = limeTypeSelect?.value || '';
		const selectedOption = limeTypeSelect.options[limeTypeSelect.selectedIndex];
		const limeTypeName = selectedOption ? selectedOption.dataset.type : '';
		const stoich = selectedOption ? parseFloat(selectedOption.dataset.stoich || 0) : 0;
		const amount = parseFloat(row.querySelector('.amount-produced')?.value || 0);
		const caoText = row.querySelector('.cao-display')?.textContent || '-';
		const cao = caoText === '-' ? 0 : parseFloat(caoText);
		const co2 = parseFloat(row.querySelector('.co2-total')?.textContent || 0);
		
		// Get country type for Dolomitic
		let countryType = '';
		if(limeTypeName === 'Dolomitic lime'){
			const developedRadio = row.querySelector('#developed');
			countryType = developedRadio && developedRadio.checked ? 'developed' : 'developing';
		}
		
		// Validation
		if(!date){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please select a date.' });
			return;
		}
		if(!unit){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please select a unit.' });
			return;
		}
		if(!limeType){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please select a lime type.' });
			return;
		}
		if(!amount || amount <= 0){
			frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter amount produced.' });
			return;
		}
		
		const payload = {
			doctype: 'Offsite Lime Production Emissions',
			date,
			company: userCompany,
			unit,
			lime_type: limeType,
			amount_produced_t: amount,
			cao_content: cao,
			country_type: countryType,
			stoichiometric_ratio: stoich,
			hydrated_proportion: HYDRATED_PROPORTION,
			water_content: WATER_CONTENT,
			lkd_correction: LKD_CORRECTION,
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
		
		// Reset lime type
		const limeTypeSelect = row.querySelector('.lime-type-select');
		if(limeTypeSelect) limeTypeSelect.value = '';
		
		// Hide radio buttons
		const radioGroup = row.querySelector('.dolomitic-radio');
		if(radioGroup) radioGroup.style.display = 'none';
		
		// Reset displays
		row.querySelector('.cao-display').textContent = '-';
		row.querySelector('.stoich-display').textContent = '-';
		
		// Reset amount input
		const amountInput = row.querySelector('.amount-produced');
		if(amountInput) amountInput.value = '';
		
		// Reset CO2 display
		row.querySelector('.co2-total').textContent = '0.00';
	}

	async function loadHistory(){
		try{
			const r = await frappe.call({ 
				method:'frappe.client.get_list', 
				args:{ 
					doctype:'Offsite Lime Production Emissions', 
					fields:['name','date','unit','lime_type','total_co2_t'], 
					order_by:'creation desc', 
					limit_page_length:100 
				}
			});
			const tbody = $('#historyBody'); 
			if(!tbody) return; 
			tbody.innerHTML='';
			
			// Fetch lime type names for all entries
			const limeTypeIds = [...new Set((r.message||[]).map(d => d.lime_type).filter(Boolean))];
			const limeTypeNames = {};
			
			if(limeTypeIds.length > 0){
				try{
					const limeResp = await frappe.call({
						method:'frappe.client.get_list',
						args:{
							doctype:'Offsite Lime Defaults',
							fields:['name','lime_type'],
							filters:[['name','in',limeTypeIds]]
						}
					});
					(limeResp.message||[]).forEach(l => {
						limeTypeNames[l.name] = l.lime_type;
					});
				}catch(e){
					console.error('Error fetching lime type names:', e);
				}
			}
			
			(r.message||[]).forEach((doc, idx)=>{
				const limeTypeName = limeTypeNames[doc.lime_type] || doc.lime_type || '-';
				const tr = document.createElement('tr');
				tr.innerHTML = `
					<td>${idx+1}</td>
					<td>${doc.date||'-'}</td>
					<td>${doc.unit||'-'}</td>
					<td>${limeTypeName}</td>
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
							doctype:'Offsite Lime Production Emissions', 
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
				args:{ doctype:'Offsite Lime Production Emissions', name }
			});
			const d = r.message; 
			if(!d) return;
			
			// Fetch lime type name
			let limeTypeName = d.lime_type || '-';
			if(d.lime_type){
				try{
					const limeResp = await frappe.call({
						method:'frappe.client.get_value',
						args:{
							doctype:'Offsite Lime Defaults',
							fieldname:'lime_type',
							filters:{name:d.lime_type}
						}
					});
					if(limeResp.message){
						limeTypeName = limeResp.message.lime_type;
					}
				}catch(e){
					console.error('Error fetching lime type details:', e);
				}
			}
			
			const body = $('#modalBody'); 
			const overlay = $('#modalOverlay');
			if(!body || !overlay) return;
			
			let countryTypeHtml = '';
			if(d.country_type){
				countryTypeHtml = `<div class="modal-row"><span class="modal-label">Country Type:</span> <span class="modal-value">${d.country_type === 'developed' ? 'Developed (0.95)' : 'Developing (0.85)'}</span></div>`;
			}
			
			body.innerHTML = `
				<div class="modal-section">
					<h3>Basic Information</h3>
					<div class="modal-row"><span class="modal-label">Date:</span> <span class="modal-value">${d.date||'-'}</span></div>
					<div class="modal-row"><span class="modal-label">Unit:</span> <span class="modal-value">${d.unit||'-'}</span></div>
				</div>
				<div class="modal-section">
					<h3>Lime Properties</h3>
					<div class="modal-row"><span class="modal-label">Lime Type:</span> <span class="modal-value">${limeTypeName}</span></div>
					${countryTypeHtml}
					<div class="modal-row"><span class="modal-label">Amount Produced:</span> <span class="modal-value">${(d.amount_produced_t||0).toFixed(6)} tonnes</span></div>
					<div class="modal-row"><span class="modal-label">CaO / CaO·MgO Content:</span> <span class="modal-value">${(d.cao_content||0).toFixed(2)}</span></div>
					<div class="modal-row"><span class="modal-label">Stoichiometric Ratio:</span> <span class="modal-value">${(d.stoichiometric_ratio||0).toFixed(3)}</span></div>
				</div>
				<div class="modal-section">
					<h3>Correction for Hydrated Lime</h3>
					<div class="modal-row"><span class="modal-label">Hydrated Proportion:</span> <span class="modal-value">${(d.hydrated_proportion||0).toFixed(1)}</span></div>
					<div class="modal-row"><span class="modal-label">Water Content:</span> <span class="modal-value">${(d.water_content||0).toFixed(2)}</span></div>
					<div class="modal-row"><span class="modal-label">LKD Correction:</span> <span class="modal-value">${(d.lkd_correction||0).toFixed(2)}</span></div>
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
	} // end initOffsiteLimeForm
	
	// Check if root_element is already available (Frappe provides it)
	if(typeof root_element !== 'undefined' && root_element){
		initOffsiteLimeForm(root_element);
	} else {
		// Fallback: wait for DOM and find container
		if(document.readyState === 'loading'){
			document.addEventListener('DOMContentLoaded', ()=>{
				const container = document.querySelector('.offsite-lime-container');
				if(container) initOffsiteLimeForm(container);
			});
		} else {
			const container = document.querySelector('.offsite-lime-container');
			if(container) initOffsiteLimeForm(container);
		}
	}
})();

