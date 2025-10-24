// Aluminium Prebake Process CO2 Emissions - Main JavaScript
(function(){
	'use strict';
	
	function initPrebakeForm(root_element){
		if(!root_element){ 
			console.error('Prebake Form: root_element not provided'); 
			return; 
		}
		
		const $ = (sel)=> root_element.querySelector(sel);
		const $$ = (sel)=> root_element.querySelectorAll(sel);
		
		let userCompany = '';
		let unitOptions = [];
		let entryCounter = 1;
		
		// Store Part A and Part B data
		let partAData = [];
		let partBData = [];
		
		const CO2_CONVERSION = 44 / 12;
			
			async function init(){
				await loadUserContext();
				buildPartA();
				buildPartB();
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
			return `<select class="form-control unit-select" required><option value="">Select Unit</option>${unitOptions.map(u=>`<option value="${u}">${u}</option>`).join('')}</select>`;
		}

		function buildPartA(){
			const tbody = $('#partABody');
			if(!tbody) return;
			
			// Add initial row
			addPartARow();
		}

		function addPartARow(){
			const tbody = $('#partABody');
			if(!tbody) return;
			
			const rowNum = tbody.querySelectorAll('tr').length + 1;
			const row = document.createElement('tr');
			const today = new Date().toISOString().split('T')[0];
			
			row.innerHTML = `
				<td><span class="sno-cell">${entryCounter}</span></td>
				<td><input type="date" class="form-control date-cell" value="${today}" required /></td>
				<td>${unitSelectHtml()}</td>
				<td><input type="text" class="form-control period-name" placeholder="Period/Potline ${rowNum}" value="Period ${rowNum}" /></td>
				<td><input type="number" class="form-control al-weight" step="0.01" min="0" placeholder="0.00" required /></td>
				<td><input type="number" class="form-control net-anode" step="0.0001" min="0" placeholder="0.0000" required /></td>
				<td><input type="number" class="form-control sulphur-pct" step="0.01" min="0" max="100" placeholder="0.00" required /></td>
				<td><input type="number" class="form-control ash-pct" step="0.01" min="0" max="100" placeholder="0.00" required /></td>
				<td><span class="calculated-value co2-a">0.00</span></td>
			`;
			
			tbody.appendChild(row);
			attachPartAHandlers(row);
		}

		function attachPartAHandlers(row){
			const inputs = row.querySelectorAll('.al-weight, .net-anode, .sulphur-pct, .ash-pct');
			inputs.forEach(input => {
				input.addEventListener('input', ()=> {
					if(input.classList.contains('sulphur-pct') || input.classList.contains('ash-pct')){
						validatePercentage(input);
					}
					recomputePartA(row);
				});
			});
		}

		function validatePercentage(input){
			const value = parseFloat(input.value);
			if(!isNaN(value)){
				if(value < 0){
					input.value = 0;
				} else if(value > 100){
					input.value = 100;
				}
			}
		}

		function recomputePartA(row){
			const alWeight = parseFloat(row.querySelector('.al-weight')?.value || 0);
			const netAnode = parseFloat(row.querySelector('.net-anode')?.value || 0);
			const sulphurPct = parseFloat(row.querySelector('.sulphur-pct')?.value || 0);
			const ashPct = parseFloat(row.querySelector('.ash-pct')?.value || 0);
			
			// Formula: CO2 = [Al_weight × Net_anode × (1 - Sulphur/100 - Ash/100)] × (44/12)
			const co2 = alWeight * netAnode * (1 - sulphurPct/100 - ashPct/100) * CO2_CONVERSION;
			
			row.querySelector('.co2-a').textContent = co2.toFixed(2);
			recomputePartATotal();
		}

		function recomputePartATotal(){
			// Totals are calculated in buildSummary() when needed
			// This function is kept for potential future use
		}

		function buildPartB(){
			const tbody = $('#partBBody');
			if(!tbody) return;
			
			// Add initial row
			addPartBRow();
		}

		function addPartBRow(){
			const tbody = $('#partBBody');
			if(!tbody) return;
			
			// Get date and unit from first Part A row
			const partAFirstRow = $('#partABody tr');
			const sno = partAFirstRow ? (partAFirstRow.querySelector('.sno-cell')?.textContent || entryCounter) : entryCounter;
			const date = partAFirstRow ? (partAFirstRow.querySelector('.date-cell')?.value || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
			const unit = partAFirstRow ? (partAFirstRow.querySelector('.unit-select')?.value || '') : '';
			
			const rowNum = tbody.querySelectorAll('tr').length + 1;
			const row = document.createElement('tr');
			row.innerHTML = `
				<td><span class="sno-cell-b">${sno}</span></td>
				<td><span class="readonly-value date-cell-b">${date}</span></td>
				<td><span class="readonly-value unit-cell-b">${unit || '-'}</span></td>
				<td><input type="text" class="form-control period-name-b" placeholder="Period/Furnace ${rowNum}" value="Period ${rowNum}" /></td>
				<td><input type="number" class="form-control green-anode-wt" step="0.001" min="0" placeholder="0.000" required /></td>
				<td><input type="number" class="form-control baked-anode-wt" step="0.001" min="0" placeholder="0.000" required /></td>
				<td><span class="readonly-value weightloss-factor">1.055</span></td>
				<td><input type="number" class="form-control baked-anode-prod" step="0.01" min="0" placeholder="0.00" required /></td>
				<td><span class="readonly-value loaded-green">0.00</span></td>
				<td><input type="number" class="form-control hydrogen-pct" step="0.01" min="0" max="100" placeholder="0.00" required /></td>
				<td><input type="number" class="form-control waste-tar" step="0.01" min="0" placeholder="0.00" required /></td>
				<td><input type="number" class="form-control packing-coke" step="0.0001" min="0" placeholder="0.0000" required /></td>
				<td><input type="number" class="form-control sulphur-pack-pct" step="0.01" min="0" max="100" placeholder="0.00" required /></td>
				<td><input type="number" class="form-control ash-pack-pct" step="0.01" min="0" max="100" placeholder="0.00" required /></td>
				<td><span class="calculated-value co2-b">0.00</span></td>
			`;
			
			tbody.appendChild(row);
			attachPartBHandlers(row);
		}

		function attachPartBHandlers(row){
			const inputs = row.querySelectorAll('.green-anode-wt, .baked-anode-wt, .baked-anode-prod, .hydrogen-pct, .waste-tar, .packing-coke, .sulphur-pack-pct, .ash-pack-pct');
			inputs.forEach(input => {
				input.addEventListener('input', ()=> {
					if(input.classList.contains('hydrogen-pct') || input.classList.contains('sulphur-pack-pct') || input.classList.contains('ash-pack-pct')){
						validatePercentage(input);
					}
					recomputePartB(row);
				});
			});
		}

		function recomputePartB(row){
			const greenAnodeWt = parseFloat(row.querySelector('.green-anode-wt')?.value || 0);
			const bakedAnodeWt = parseFloat(row.querySelector('.baked-anode-wt')?.value || 0);
			const bakedAnodeProd = parseFloat(row.querySelector('.baked-anode-prod')?.value || 0);
			const hydrogenPct = parseFloat(row.querySelector('.hydrogen-pct')?.value || 0);
			const wasteTar = parseFloat(row.querySelector('.waste-tar')?.value || 0);
			const packingCoke = parseFloat(row.querySelector('.packing-coke')?.value || 0);
			const sulphurPackPct = parseFloat(row.querySelector('.sulphur-pack-pct')?.value || 0);
			const ashPackPct = parseFloat(row.querySelector('.ash-pack-pct')?.value || 0);
			
			// Calculate weightloss factor (A1/A2) with default 1.055
			// Formula: IF(IsNumber(green), IF(IsNumber(baked), green/baked, 1.055), 1.055)
			let weightlossFactor = 1.055;
			if(greenAnodeWt > 0 && bakedAnodeWt > 0){
				weightlossFactor = greenAnodeWt / bakedAnodeWt;
			}
			row.querySelector('.weightloss-factor').textContent = weightlossFactor.toFixed(3);
			
			// Calculate loaded green anodes: weightloss_factor × baked_anode_production
			const loadedGreen = weightlossFactor * bakedAnodeProd;
			row.querySelector('.loaded-green').textContent = loadedGreen.toFixed(2);
			
			// Formula: CO2 = [(Loaded Green - (H% × Loaded) - Baked - Waste) + (Baked × Packing × (1 - S% - Ash%))] × 44/12
			const part1 = loadedGreen - (hydrogenPct/100 * loadedGreen) - bakedAnodeProd - wasteTar;
			const part2 = bakedAnodeProd * packingCoke * (1 - sulphurPackPct/100 - ashPackPct/100);
			const co2 = (part1 + part2) * CO2_CONVERSION;
			
			row.querySelector('.co2-b').textContent = co2.toFixed(2);
			recomputePartBTotal();
		}

		function recomputePartBTotal(){
			// Totals are calculated in buildSummary() when needed
			// This function is kept for potential future use
		}

		function updatePartBFromPartA(){
			// Get date and unit from first Part A row
			const partAFirstRow = $('#partABody tr');
			if(!partAFirstRow) return;
			
			const sno = partAFirstRow.querySelector('.sno-cell')?.textContent || entryCounter;
			const date = partAFirstRow.querySelector('.date-cell')?.value || '';
			const unit = partAFirstRow.querySelector('.unit-select')?.value || '';
			
			// Update all Part B rows with the new values
			const tbodyB = $('#partBBody');
			if(tbodyB){
				tbodyB.querySelectorAll('tr').forEach(row => {
					const snoCell = row.querySelector('.sno-cell-b');
					const dateCell = row.querySelector('.date-cell-b');
					const unitCell = row.querySelector('.unit-cell-b');
					
					if(snoCell) snoCell.textContent = sno;
					if(dateCell) dateCell.textContent = date;
					if(unitCell) unitCell.textContent = unit || '-';
				});
			}
		}
		
		function wireTabs(){
			const step2Tab = $$('.tab-btn')[1];
			const step3Tab = $$('.tab-btn')[2];
			
			$$('.tab-btn').forEach(btn=>{
				btn.addEventListener('click', ()=>{
					if(btn.classList.contains('disabled')) return;
					activateStep(parseInt(btn.dataset.step,10));
				});
			});
			
			$('#nextToPartB')?.addEventListener('click', ()=>{
				if(validatePartA()){
					if(step2Tab) step2Tab.classList.remove('disabled');
					activateStep(2);
				}
			});
			
			$('#prevToPartA')?.addEventListener('click', ()=> activateStep(1));
			
			$('#nextToSummary')?.addEventListener('click', ()=>{
				if(validatePartB()){
					if(step3Tab) step3Tab.classList.remove('disabled');
					buildSummary();
					activateStep(3);
				}
			});
			
			$('#prevToPartB')?.addEventListener('click', ()=> activateStep(2));
			
			$('#saveEntryBtn')?.addEventListener('click', saveEntry);
		}

		function validatePartA(){
			// Get date and unit from first Part A row
			const partAFirstRow = $('#partABody tr');
			if(!partAFirstRow){
				frappe.msgprint({ title:'Validation', indicator:'red', message:'Please add Part A data.'});
				return false;
			}
			
			const date = partAFirstRow.querySelector('.date-cell')?.value;
			const unit = partAFirstRow.querySelector('.unit-select')?.value;
			
			if(!date){
				frappe.msgprint({ title:'Validation', indicator:'red', message:'Please select a date.'});
				return false;
			}
			if(!unit){
				frappe.msgprint({ title:'Validation', indicator:'red', message:'Please select a unit.'});
				return false;
			}
			
			// Check if at least one row has data
			const tbody = $('#partABody');
			if(!tbody) return false;
			
			let hasData = false;
			tbody.querySelectorAll('tr').forEach(row => {
				const alWeight = parseFloat(row.querySelector('.al-weight')?.value || 0);
				if(alWeight > 0) hasData = true;
			});
			
			if(!hasData){
				frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter at least one Part A entry with aluminium weight.'});
				return false;
			}
			
			return true;
		}

		function validatePartB(){
			// Check if at least one row has data
			const tbody = $('#partBBody');
			if(!tbody) return false;
			
			let hasData = false;
			tbody.querySelectorAll('tr').forEach(row => {
				const greenAnodeWt = parseFloat(row.querySelector('.green-anode-wt')?.value || 0);
				if(greenAnodeWt > 0) hasData = true;
			});
			
			if(!hasData){
				frappe.msgprint({ title:'Validation', indicator:'red', message:'Please enter at least one Part B entry with green anode weight.'});
				return false;
			}
			
			return true;
		}

		function activateStep(step){
			// Update content visibility
			$$('.tab-content').forEach(c=> c.classList.toggle('active', parseInt(c.dataset.step,10)===step));
			
			// Update progress steps
			$$('.progress-step').forEach(p=> {
				const num = parseInt(p.dataset.step,10);
				p.classList.toggle('active', num===step);
				p.classList.toggle('completed', num < step);
			});
			
			// Update progress fill bar
			const progressFill = $('#progressFill');
			if(progressFill){
				const percentage = ((step - 1) / 2) * 100; // 3 steps: 0%, 50%, 100%
				progressFill.style.width = percentage + '%';
			}
			
			// If moving to Part B, update it with Part A data
			if(step === 2){
				updatePartBFromPartA();
			}
			
			// If moving to Summary, rebuild it with latest data
			if(step === 3){
				buildSummary();
			}
		}

		function buildSummary(){
			// Calculate Part A Total from CO2 column
			const tbodyA = $('#partABody');
			let partATotalCO2 = 0;
			if(tbodyA){
				tbodyA.querySelectorAll('tr').forEach(row => {
					const co2 = parseFloat(row.querySelector('.co2-a')?.textContent || 0);
					partATotalCO2 += co2;
				});
			}
			
			// Calculate Part B Total from CO2 column
			const tbodyB = $('#partBBody');
			let partBTotalCO2 = 0;
			if(tbodyB){
				tbodyB.querySelectorAll('tr').forEach(row => {
					const co2 = parseFloat(row.querySelector('.co2-b')?.textContent || 0);
					partBTotalCO2 += co2;
				});
			}
			
			const totalCO2 = partATotalCO2 + partBTotalCO2;
			
			$('.summary-parta-co2').textContent = partATotalCO2.toFixed(2);
			$('.summary-partb-co2').textContent = partBTotalCO2.toFixed(2);
			$('.summary-total-co2').textContent = totalCO2.toFixed(2);
			
			// Build Part A detail
			let partADetail = '';
			if(tbodyA){
				const rows = tbodyA.querySelectorAll('tr');
				partADetail = `<div><strong>${rows.length} entries</strong></div>`;
			}
			$('#partASummaryDetail').innerHTML = partADetail;
			
			// Build Part B detail
			let partBDetail = '';
			if(tbodyB){
				const rows = tbodyB.querySelectorAll('tr');
				partBDetail = `<div><strong>${rows.length} entries</strong></div>`;
			}
			$('#partBSummaryDetail').innerHTML = partBDetail;
		}

		async function saveEntry(){
			// Get S.No, Date, Unit from first Part A row
			const partAFirstRow = $('#partABody tr');
			if(!partAFirstRow){
				frappe.msgprint('Please add at least one Part A entry');
				return;
			}
			
			const date = partAFirstRow.querySelector('.date-cell')?.value;
			const unit = partAFirstRow.querySelector('.unit-select')?.value;
			
			if(!date){
				frappe.msgprint('Please select a date');
				return;
			}
			if(!unit){
				frappe.msgprint('Please select a unit');
				return;
			}
			
			// Collect Part A data
			const tbodyA = $('#partABody');
			const partAEntries = [];
			if(tbodyA){
				tbodyA.querySelectorAll('tr').forEach(row => {
					partAEntries.push({
						period: row.querySelector('.period-name')?.value || '',
						al_weight: parseFloat(row.querySelector('.al-weight')?.value || 0),
						net_anode: parseFloat(row.querySelector('.net-anode')?.value || 0),
						sulphur_pct: parseFloat(row.querySelector('.sulphur-pct')?.value || 0),
						ash_pct: parseFloat(row.querySelector('.ash-pct')?.value || 0),
						co2: parseFloat(row.querySelector('.co2-a')?.textContent || 0)
					});
				});
			}
			
			// Collect Part B data
			const tbodyB = $('#partBBody');
			const partBEntries = [];
			if(tbodyB){
				tbodyB.querySelectorAll('tr').forEach(row => {
					partBEntries.push({
						period: row.querySelector('.period-name-b')?.value || '',
						green_anode_wt: parseFloat(row.querySelector('.green-anode-wt')?.value || 0),
						baked_anode_wt: parseFloat(row.querySelector('.baked-anode-wt')?.value || 0),
						weightloss_factor: parseFloat(row.querySelector('.weightloss-factor')?.textContent || 0),
						baked_anode_prod: parseFloat(row.querySelector('.baked-anode-prod')?.value || 0),
						loaded_green: parseFloat(row.querySelector('.loaded-green')?.textContent || 0),
						hydrogen_pct: parseFloat(row.querySelector('.hydrogen-pct')?.value || 0),
						waste_tar: parseFloat(row.querySelector('.waste-tar')?.value || 0),
						packing_coke: parseFloat(row.querySelector('.packing-coke')?.value || 0),
						sulphur_pack_pct: parseFloat(row.querySelector('.sulphur-pack-pct')?.value || 0),
						ash_pack_pct: parseFloat(row.querySelector('.ash-pack-pct')?.value || 0),
						co2: parseFloat(row.querySelector('.co2-b')?.textContent || 0)
					});
				});
			}
			
			// Calculate totals from row data
			let partATotalCO2 = 0;
			partAEntries.forEach(entry => {
				partATotalCO2 += entry.co2;
			});
			
			let partBTotalCO2 = 0;
			partBEntries.forEach(entry => {
				partBTotalCO2 += entry.co2;
			});
			
			const totalCO2 = partATotalCO2 + partBTotalCO2;
			
			const payload = {
				doctype: 'Aluminium Prebake CO2 Emissions',
				date,
				company: userCompany,
				unit,
				parta_entries_json: JSON.stringify(partAEntries),
				parta_total_co2_t: partATotalCO2,
				partb_entries_json: JSON.stringify(partBEntries),
				partb_total_co2_t: partBTotalCO2,
				total_co2_t: totalCO2
			};
			
			try{
				await frappe.call({ method:'frappe.client.insert', args:{ doc: payload }});
				frappe.msgprint({ title:'Success', indicator:'green', message:'Entry saved successfully!'});
				await loadHistory();
				resetForm();
			}catch(e){
				console.error('Save error:', e);
				frappe.msgprint({ title:'Error', indicator:'red', message:'Failed to save entry. Please try again.'});
			}
		}

		function resetForm(){
			// Reset to Step 1
			activateStep(1);
			
			// Disable Step 2 and 3 tabs
			const step2Tab = $$('.tab-btn')[1];
			const step3Tab = $$('.tab-btn')[2];
			if(step2Tab) step2Tab.classList.add('disabled');
			if(step3Tab) step3Tab.classList.add('disabled');
			
			// Clear Part A - the form will rebuild with new date/unit
			const tbodyA = $('#partABody');
			if(tbodyA) tbodyA.innerHTML = '';
			buildPartA();
			
			// Clear Part B
			const tbodyB = $('#partBBody');
			if(tbodyB) tbodyB.innerHTML = '';
			buildPartB();
		}

        async function loadHistory(){
            try{
                const r = await frappe.call({ 
                    method:'frappe.client.get_list', 
                    args:{ 
                        doctype:'Aluminium Prebake CO2 Emissions', 
                        fields:['name','date','unit','parta_total_co2_t','partb_total_co2_t','total_co2_t'], 
                        order_by:'creation desc', 
                        limit_page_length:100 
                    }
                });
                const body = $('#inlineHistoryBody'); 
                if(!body) return; 
                body.innerHTML='';
                
                (r.message||[]).forEach((doc, idx)=>{
                    const tr = document.createElement('tr');
                    tr.className = 'history-inline-row';
                    tr.innerHTML = `
                        <td style="text-align:center;">${idx+1}</td>
                        <td>${doc.date||'-'}</td>
                        <td>${doc.unit||'-'}</td>
                        <td colspan="5" style="text-align:center;"><strong>Part A CO2:</strong> ${(doc.parta_total_co2_t||0).toFixed(2)} t</td>
                        <td colspan="5" style="text-align:center;"><strong>Part B CO2:</strong> ${(doc.partb_total_co2_t||0).toFixed(2)} t</td>
                        <td style="text-align:right; font-weight:600;">${(doc.total_co2_t||0).toFixed(2)}</td>
                        <td style="text-align:center;">
                            <button class="btn-view" data-id="${doc.name}">View</button>
                            <button class="btn-delete" data-id="${doc.name}">Delete</button>
                        </td>
                    `;
                    body.appendChild(tr);
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
								doctype:'Aluminium Prebake CO2 Emissions', 
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
							message:'Failed to delete entry.'
						});
					}
				}
			);
		}

		async function viewEntry(e){
			const name = e.target.dataset.id; 
			if(!name) return;
			
			try{
				const r = await frappe.call({ 
					method:'frappe.client.get', 
					args:{ doctype:'Aluminium Prebake CO2 Emissions', name }
				});
				const d = r.message; 
				if(!d) return;
				
				const partAEntries = JSON.parse(d.parta_entries_json || '[]');
				const partBEntries = JSON.parse(d.partb_entries_json || '[]');
				
				const body = $('#modalBody'); 
				const overlay = $('#modalOverlay');
				if(!body || !overlay) return;
				
				let partAHtml = '<table class="modal-table"><thead><tr><th>Period</th><th>Al Weight (t)</th><th>Net Anode</th><th>Sulphur %</th><th>Ash %</th><th>CO2 (t)</th></tr></thead><tbody>';
				partAEntries.forEach(entry => {
					partAHtml += `<tr><td>${entry.period}</td><td>${entry.al_weight}</td><td>${entry.net_anode}</td><td>${entry.sulphur_pct}</td><td>${entry.ash_pct}</td><td>${entry.co2.toFixed(2)}</td></tr>`;
				});
				partAHtml += '</tbody></table>';
				
				let partBHtml = '<table class="modal-table"><thead><tr><th>Period</th><th>Green Anode (t)</th><th>Baked Anode (t)</th><th>Baked Prod (t)</th><th>CO2 (t)</th></tr></thead><tbody>';
				partBEntries.forEach(entry => {
					partBHtml += `<tr><td>${entry.period}</td><td>${entry.green_anode_wt}</td><td>${entry.baked_anode_wt}</td><td>${entry.baked_anode_prod}</td><td>${entry.co2.toFixed(2)}</td></tr>`;
				});
				partBHtml += '</tbody></table>';
				
				body.innerHTML = `
					<div class="modal-section">
						<h3>Basic Information</h3>
						<div class="modal-row"><span class="modal-label">Date:</span> <span class="modal-value">${d.date||'-'}</span></div>
						<div class="modal-row"><span class="modal-label">Unit:</span> <span class="modal-value">${d.unit||'-'}</span></div>
					</div>
					<div class="modal-section">
						<h3>Part A: Electrolysis Emissions</h3>
						${partAHtml}
						<div class="modal-row"><span class="modal-label">Part A Total CO2:</span> <span class="modal-value">${(d.parta_total_co2_t||0).toFixed(2)} tonnes</span></div>
					</div>
					<div class="modal-section">
						<h3>Part B: Anode Baking Emissions</h3>
						${partBHtml}
						<div class="modal-row"><span class="modal-label">Part B Total CO2:</span> <span class="modal-value">${(d.partb_total_co2_t||0).toFixed(2)} tonnes</span></div>
					</div>
					<div class="modal-section">
						<h3>Total Emissions</h3>
						<div class="modal-row"><span class="modal-label">Total CO2:</span> <span class="modal-value"><strong>${(d.total_co2_t||0).toFixed(2)} tonnes</strong></span></div>
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
	} // end initPrebakeForm
	
	// Check if root_element is already available
	if(typeof root_element !== 'undefined' && root_element){
		initPrebakeForm(root_element);
	} else {
		if(document.readyState === 'loading'){
			document.addEventListener('DOMContentLoaded', ()=>{
				const container = document.querySelector('.prebake-container');
				if(container) initPrebakeForm(container);
			});
		} else {
			const container = document.querySelector('.prebake-container');
			if(container) initPrebakeForm(container);
		}
	}
})();

