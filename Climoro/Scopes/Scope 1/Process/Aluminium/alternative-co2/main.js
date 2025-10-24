// Alternative Electrolysis CO2 Emissions Form
// IIFE to prevent global scope pollution

(function(root_element) {
    'use strict';
    
    if (!root_element) {
        console.error('❌ root_element not provided by Frappe');
        return;
    }
    
    console.log('✅ root_element received:', root_element);
    
    // Scoped selector helpers
    const $ = (selector) => root_element.querySelector(selector);
    const $$ = (selector) => root_element.querySelectorAll(selector);

    // Constants
    const CO2_CONVERSION = 44 / 12;
    const DOCTYPE_NAME = 'Alternative Electrolysis CO2 Emissions';

    // State
    let currentCompany = null;
    let units = [];
    let nextSno = 1;

    // DOM Elements Cache
    let elements = {};

    // Initialize
    async function init() {
        try {
            console.log('🚀 Initializing Alternative CO2 form...');
            
            cacheElements();
            await fetchCurrentUser();
            await loadUnits();
            await loadHistory();
            attachEventListeners();
            setTodayDate();
            updateSno();
            
            console.log('✅ Alternative CO2 form initialized successfully');
        } catch (error) {
            console.error('❌ Initialization error:', error);
            frappe.msgprint({
                title: 'Initialization Error',
                message: 'Failed to initialize form: ' + error.message,
                indicator: 'red'
            });
        }
    }

    // Cache DOM elements
    function cacheElements() {
        elements = {
            // Entry Form
            currentSno: $('#currentSno'),
            entryDate: $('#entryDate'),
            entryUnit: $('#entryUnit'),
            pitchConsumption: $('#pitchConsumption'),
            pitchCarbon: $('#pitchCarbon'),
            cokeConsumption: $('#cokeConsumption'),
            cokeCarbon: $('#cokeCarbon'),
            packingConsumption: $('#packingConsumption'),
            packingCarbon: $('#packingCarbon'),
            carbonWaste: $('#carbonWaste'),
            purchasedMass: $('#purchasedMass'),
            purchasedCarbon: $('#purchasedCarbon'),
            soldMass: $('#soldMass'),
            soldCarbon: $('#soldCarbon'),
            entryCO2: $('#entryCO2'),
            saveBtn: $('#saveBtn'),
            
            // History (inline body below entry row)
            historyRowsBody: $('#historyRowsBody'),
            
            // Modal
            viewModal: $('#viewModal'),
            viewModalBody: $('#viewModalBody'),
            closeViewModal: $('#closeViewModal'),
            closeViewModalBtn: $('#closeViewModalBtn')
        };
        
        console.log('✅ DOM elements cached');
    }

    // Fetch Current User
    async function fetchCurrentUser() {
        try {
            const user = await frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'User',
                    filters: { name: frappe.session.user },
                    fieldname: ['name', 'first_name']
                }
            });

            if (user && user.message) {
                const companies = await frappe.call({
                    method: 'frappe.client.get_list',
                    args: {
                        doctype: 'Company',
                        limit_page_length: 1
                    }
                });

                if (companies && companies.message && companies.message.length > 0) {
                    currentCompany = companies.message[0].name;
                    console.log('✅ Current company:', currentCompany);
                } else {
                    throw new Error('No company found for current user');
                }
            }
        } catch (error) {
            console.error('❌ Error fetching user:', error);
            throw error;
        }
    }

    // Load Units
    async function loadUnits() {
        try {
            const result = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Units',
                    filters: { company: currentCompany },
                    fields: ['name'],
                    limit_page_length: 0
                }
            });

            if (result && result.message) {
                units = result.message;
                console.log('📋 Units loaded:', units.length, 'units found');
                populateUnitDropdown();
            }
        } catch (error) {
            console.error('❌ Error loading units:', error);
            frappe.msgprint({
                title: 'Units Loading Error',
                message: 'Failed to load units. Please check Units DocType configuration.',
                indicator: 'red'
            });
        }
    }

    // Populate Unit Dropdown
    function populateUnitDropdown() {
        if (!elements.entryUnit) {
            console.warn('⚠️ Unit select element not found');
            return;
        }

        elements.entryUnit.innerHTML = '<option value="">-- Unit --</option>';
        units.forEach(unit => {
            const option = document.createElement('option');
            const unitName = unit.name;
            option.value = unitName;
            option.textContent = unitName;
            elements.entryUnit.appendChild(option);
        });
        
        console.log('✅ Unit dropdown populated with', units.length, 'units');
    }

    // Set Today's Date
    function setTodayDate() {
        if (elements.entryDate) {
            const today = new Date().toISOString().split('T')[0];
            elements.entryDate.value = today;
        }
    }

    // Update S.No
    function updateSno() {
        if (elements.currentSno) {
            elements.currentSno.textContent = nextSno;
        }
    }

    // Attach Event Listeners
    function attachEventListeners() {
        // Calculate CO2 on input change
        const inputFields = [
            elements.pitchConsumption,
            elements.pitchCarbon,
            elements.cokeConsumption,
            elements.cokeCarbon,
            elements.packingConsumption,
            elements.packingCarbon,
            elements.carbonWaste,
            elements.purchasedMass,
            elements.purchasedCarbon,
            elements.soldMass,
            elements.soldCarbon
        ];

        inputFields.forEach(field => {
            if (field) {
                field.addEventListener('input', calculateCO2);
            }
        });

        // Save button
        if (elements.saveBtn) {
            elements.saveBtn.addEventListener('click', saveEntry);
        }

        // Modal close buttons
        if (elements.closeViewModal) {
            elements.closeViewModal.addEventListener('click', closeModal);
        }
        if (elements.closeViewModalBtn) {
            elements.closeViewModalBtn.addEventListener('click', closeModal);
        }

        // Close modal on overlay click
        if (elements.viewModal) {
            elements.viewModal.addEventListener('click', (e) => {
                if (e.target === elements.viewModal) {
                    closeModal();
                }
            });
        }

        console.log('✅ Event listeners attached');
    }

    // Calculate CO2 Emissions
    function calculateCO2() {
        try {
            // Get values
            const pitchConsumption = parseFloat(elements.pitchConsumption.value) || 0;
            const pitchCarbon = parseFloat(elements.pitchCarbon.value) || 0;
            const cokeConsumption = parseFloat(elements.cokeConsumption.value) || 0;
            const cokeCarbon = parseFloat(elements.cokeCarbon.value) || 0;
            const packingConsumption = parseFloat(elements.packingConsumption.value) || 0;
            const packingCarbon = parseFloat(elements.packingCarbon.value) || 0;
            const carbonWaste = parseFloat(elements.carbonWaste.value) || 0;
            const purchasedMass = parseFloat(elements.purchasedMass.value) || 0;
            const purchasedCarbon = parseFloat(elements.purchasedCarbon.value) || 0;
            const soldMass = parseFloat(elements.soldMass.value) || 0;
            const soldCarbon = parseFloat(elements.soldCarbon.value) || 0;

            // Formula: E_CO2 = [(TPC × PC)/100 + (Coke × CC)/100 + (TPCC × PCC)/100 - TWC + (PA × PAC)/100 - (SA × SAC)/100] × 44/12
            const co2 = (
                (pitchConsumption * pitchCarbon / 100) +
                (cokeConsumption * cokeCarbon / 100) +
                (packingConsumption * packingCarbon / 100) -
                carbonWaste +
                (purchasedMass * purchasedCarbon / 100) -
                (soldMass * soldCarbon / 100)
            ) * CO2_CONVERSION;

            // Update display
            if (elements.entryCO2) {
                elements.entryCO2.textContent = co2.toFixed(2);
            }

            return co2;
        } catch (error) {
            console.error('❌ Error calculating CO2:', error);
            return 0;
        }
    }

    // Validate Entry
    function validateEntry() {
        const errors = [];

        if (!elements.entryDate.value) {
            errors.push('Please select a date.');
        }

        if (!elements.entryUnit.value) {
            errors.push('Please select a unit.');
        }

        // Check all required fields have values
        const requiredFields = [
            { elem: elements.pitchConsumption, name: 'Pitch Consumption' },
            { elem: elements.pitchCarbon, name: 'Pitch Carbon Content' },
            { elem: elements.cokeConsumption, name: 'Coke Consumption' },
            { elem: elements.cokeCarbon, name: 'Coke Carbon Content' },
            { elem: elements.packingConsumption, name: 'Packing Coke Consumption' },
            { elem: elements.packingCarbon, name: 'Packing Coke Carbon Content' },
            { elem: elements.carbonWaste, name: 'Carbon By-products/Waste' },
            { elem: elements.purchasedMass, name: 'Purchased Anodes Mass' },
            { elem: elements.purchasedCarbon, name: 'Purchased Anodes Carbon Content' },
            { elem: elements.soldMass, name: 'Sold Anodes Mass' },
            { elem: elements.soldCarbon, name: 'Sold Anodes Carbon Content' }
        ];

        requiredFields.forEach(field => {
            const value = parseFloat(field.elem.value);
            if (isNaN(value) || field.elem.value === '') {
                errors.push(`${field.name} is required.`);
            }
        });

        // Validate percentages (0-100)
        const percentageFields = [
            { elem: elements.pitchCarbon, name: 'Pitch Carbon Content' },
            { elem: elements.cokeCarbon, name: 'Coke Carbon Content' },
            { elem: elements.packingCarbon, name: 'Packing Coke Carbon Content' },
            { elem: elements.purchasedCarbon, name: 'Purchased Anodes Carbon Content' },
            { elem: elements.soldCarbon, name: 'Sold Anodes Carbon Content' }
        ];

        percentageFields.forEach(field => {
            const value = parseFloat(field.elem.value);
            if (!isNaN(value) && (value < 0 || value > 100)) {
                errors.push(`${field.name} must be between 0 and 100.`);
            }
        });

        // Validate positive values
        const positiveFields = [
            { elem: elements.pitchConsumption, name: 'Pitch Consumption' },
            { elem: elements.cokeConsumption, name: 'Coke Consumption' },
            { elem: elements.packingConsumption, name: 'Packing Coke Consumption' },
            { elem: elements.carbonWaste, name: 'Carbon By-products/Waste' },
            { elem: elements.purchasedMass, name: 'Purchased Anodes Mass' },
            { elem: elements.soldMass, name: 'Sold Anodes Mass' }
        ];

        positiveFields.forEach(field => {
            const value = parseFloat(field.elem.value);
            if (!isNaN(value) && value < 0) {
                errors.push(`${field.name} must be positive.`);
            }
        });

        if (errors.length > 0) {
            frappe.msgprint({
                title: 'Validation Error',
                message: errors.join('<br>'),
                indicator: 'red'
            });
            return false;
        }

        return true;
    }

    // Save Entry
    async function saveEntry() {
        try {
            if (!validateEntry()) {
                return;
            }

            const co2 = calculateCO2();

            const data = {
                doctype: DOCTYPE_NAME,
                date: elements.entryDate.value,
                company: currentCompany,
                unit: elements.entryUnit.value,
                total_pitch_consumption: parseFloat(elements.pitchConsumption.value),
                carbon_content_pitch: parseFloat(elements.pitchCarbon.value),
                total_coke_consumption: parseFloat(elements.cokeConsumption.value),
                carbon_content_coke: parseFloat(elements.cokeCarbon.value),
                total_packing_coke: parseFloat(elements.packingConsumption.value),
                carbon_content_packing_coke: parseFloat(elements.packingCarbon.value),
                total_carbon_waste: parseFloat(elements.carbonWaste.value),
                total_purchased_anodes: parseFloat(elements.purchasedMass.value),
                carbon_content_purchased_anodes: parseFloat(elements.purchasedCarbon.value),
                mass_sold_anodes: parseFloat(elements.soldMass.value),
                carbon_content_sold_anodes: parseFloat(elements.soldCarbon.value),
                co2_emissions: co2
            };

            console.log('💾 Saving entry:', data);

            const response = await frappe.call({
                method: 'frappe.client.insert',
                args: { doc: data }
            });

            if (response && response.message) {
                frappe.msgprint({
                    title: 'Success',
                    message: 'Entry saved successfully!',
                    indicator: 'green'
                });

                resetForm();
                await loadHistory();
                nextSno++;
                updateSno();
            }
        } catch (error) {
            console.error('❌ Save error:', error);
            frappe.msgprint({
                title: 'Save Error',
                message: 'Failed to save entry: ' + error.message,
                indicator: 'red'
            });
        }
    }

    // Reset Form
    function resetForm() {
        // Clear all input fields
        elements.pitchConsumption.value = '';
        elements.pitchCarbon.value = '';
        elements.cokeConsumption.value = '';
        elements.cokeCarbon.value = '';
        elements.packingConsumption.value = '';
        elements.packingCarbon.value = '';
        elements.carbonWaste.value = '';
        elements.purchasedMass.value = '';
        elements.purchasedCarbon.value = '';
        elements.soldMass.value = '';
        elements.soldCarbon.value = '';
        
        // Reset calculated value
        elements.entryCO2.textContent = '0.00';
        
        // Reset date to today
        setTodayDate();
        
        // Clear unit selection
        elements.entryUnit.value = '';
        
        console.log('🔄 Form reset');
    }

    // Load History
    async function loadHistory() {
        try {
            const result = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: DOCTYPE_NAME,
                    filters: { company: currentCompany },
                    fields: ['name', 'date', 'unit', 'co2_emissions',
                            'total_pitch_consumption', 'carbon_content_pitch',
                            'total_coke_consumption', 'carbon_content_coke',
                            'total_packing_coke', 'carbon_content_packing_coke',
                            'total_carbon_waste', 'total_purchased_anodes',
                            'carbon_content_purchased_anodes', 'mass_sold_anodes',
                            'carbon_content_sold_anodes'],
                    order_by: 'date desc',
                    limit_page_length: 0
                }
            });

            if (result && result.message) {
                displayHistory(result.message);
                
                // Update next S.No
                if (result.message.length > 0) {
                    nextSno = result.message.length + 1;
                    updateSno();
                }
            }
        } catch (error) {
            console.error('❌ Error loading history:', error);
        }
    }

    // Display History
    function displayHistory(entries) {
        if (!elements.historyRowsBody) {
            console.warn('⚠️ History table body not found');
            return;
        }

        if (entries.length === 0) {
            elements.historyRowsBody.innerHTML = `
                <tr class="no-history-row">
                    <td colspan="16" style="text-align: center; padding: 1.25rem; color: #64748b;">
                        <em>No entries yet. Add your first entry above.</em>
                    </td>
                </tr>
            `;
            return;
        }

        elements.historyRowsBody.innerHTML = entries.map((entry, index) => `
            <tr class="history-inline-row">
                <td>${entries.length - index}</td>
                <td>${formatDate(entry.date)}</td>
                <td>${entry.unit}</td>
                <td>${number(entry.total_pitch_consumption)}</td>
                <td>${percent(entry.carbon_content_pitch)}</td>
                <td>${number(entry.total_coke_consumption)}</td>
                <td>${percent(entry.carbon_content_coke)}</td>
                <td>${number(entry.total_packing_coke)}</td>
                <td>${percent(entry.carbon_content_packing_coke)}</td>
                <td>${number(entry.total_carbon_waste)}</td>
                <td>${number(entry.total_purchased_anodes)}</td>
                <td>${percent(entry.carbon_content_purchased_anodes)}</td>
                <td>${number(entry.mass_sold_anodes)}</td>
                <td>${percent(entry.carbon_content_sold_anodes)}</td>
                <td><strong>${parseFloat(entry.co2_emissions).toFixed(2)}</strong></td>
                <td>
                    <button class="btn btn-danger" onclick="deleteEntry_${root_element.id || 'alternative'}('${entry.name}')">Delete</button>
                </td>
            </tr>
        `).join('');

        console.log('✅ History displayed:', entries.length, 'entries');
    }

    // Format Date
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // Simple number/percent format helpers for inline rows
    function number(value) {
        const n = parseFloat(value);
        if (isNaN(n)) return '-';
        return n.toFixed(2);
    }
    function percent(value) {
        const n = parseFloat(value);
        if (isNaN(n)) return '-';
        return n.toFixed(2) + '%';
    }

    // View Entry
    async function viewEntry(entryName) {
        try {
            const result = await frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: DOCTYPE_NAME,
                    name: entryName
                }
            });

            if (result && result.message) {
                const entry = result.message;
                
                elements.viewModalBody.innerHTML = `
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Date</div>
                            <div class="detail-value">${formatDate(entry.date)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Unit</div>
                            <div class="detail-value">${entry.unit}</div>
                        </div>
                    </div>
                    
                    <h4 style="color: #1e293b; margin: 1.5rem 0 1rem 0;">Pitch</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Total Pitch Consumption (t)</div>
                            <div class="detail-value">${parseFloat(entry.total_pitch_consumption).toFixed(2)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Carbon Content of Pitch (%)</div>
                            <div class="detail-value">${parseFloat(entry.carbon_content_pitch).toFixed(2)}%</div>
                        </div>
                    </div>
                    
                    <h4 style="color: #1e293b; margin: 1.5rem 0 1rem 0;">Coke</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Total Coke Consumption (t)</div>
                            <div class="detail-value">${parseFloat(entry.total_coke_consumption).toFixed(2)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Carbon Content of Coke (%)</div>
                            <div class="detail-value">${parseFloat(entry.carbon_content_coke).toFixed(2)}%</div>
                        </div>
                    </div>
                    
                    <h4 style="color: #1e293b; margin: 1.5rem 0 1rem 0;">Packing Coke</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Total Packing Coke Consumption (t)</div>
                            <div class="detail-value">${parseFloat(entry.total_packing_coke).toFixed(2)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Carbon Content of Packing Coke (%)</div>
                            <div class="detail-value">${parseFloat(entry.carbon_content_packing_coke).toFixed(2)}%</div>
                        </div>
                    </div>
                    
                    <h4 style="color: #1e293b; margin: 1.5rem 0 1rem 0;">Carbon By-products and Anodes</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Total Carbon By-products/Waste (t)</div>
                            <div class="detail-value">${parseFloat(entry.total_carbon_waste).toFixed(2)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Total Mass of Purchased Anodes (t)</div>
                            <div class="detail-value">${parseFloat(entry.total_purchased_anodes).toFixed(2)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Carbon Content of Purchased Anodes (%)</div>
                            <div class="detail-value">${parseFloat(entry.carbon_content_purchased_anodes).toFixed(2)}%</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Mass of Sold Anodes (t)</div>
                            <div class="detail-value">${parseFloat(entry.mass_sold_anodes).toFixed(2)}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Carbon Content of Sold Anodes (%)</div>
                            <div class="detail-value">${parseFloat(entry.carbon_content_sold_anodes).toFixed(2)}%</div>
                        </div>
                    </div>
                    
                    <h4 style="color: #1e293b; margin: 1.5rem 0 1rem 0;">Emissions</h4>
                    <div class="detail-grid">
                        <div class="detail-item" style="border-left-color: #10b981;">
                            <div class="detail-label">Total CO2 Emissions</div>
                            <div class="detail-value" style="color: #059669; font-size: 1.25rem;">${parseFloat(entry.co2_emissions).toFixed(2)} t CO2</div>
                        </div>
                    </div>
                `;

                elements.viewModal.style.display = 'flex';
            }
        } catch (error) {
            console.error('❌ Error viewing entry:', error);
            frappe.msgprint({
                title: 'Error',
                message: 'Failed to load entry details.',
                indicator: 'red'
            });
        }
    }

    // Delete Entry
    async function deleteEntry(entryName) {
        frappe.confirm(
            'Are you sure you want to delete this entry? This action cannot be undone.',
            async () => {
                try {
                    await frappe.call({
                        method: 'frappe.client.delete',
                        args: {
                            doctype: DOCTYPE_NAME,
                            name: entryName
                        }
                    });

                    frappe.msgprint({
                        title: 'Success',
                        message: 'Entry deleted successfully!',
                        indicator: 'green'
                    });

                    await loadHistory();
                } catch (error) {
                    console.error('❌ Delete error:', error);
                    frappe.msgprint({
                        title: 'Delete Error',
                        message: 'Failed to delete entry: ' + error.message,
                        indicator: 'red'
                    });
                }
            }
        );
    }

    // Close Modal
    function closeModal() {
        if (elements.viewModal) {
            elements.viewModal.style.display = 'none';
        }
    }

    // Expose functions to global scope for onclick handlers
    const uniqueId = root_element.id || 'alternative';
    window[`viewEntry_${uniqueId}`] = viewEntry;
    window[`deleteEntry_${uniqueId}`] = deleteEntry;

    // Initialize immediately - Frappe's custom block ensures DOM is ready
    init();

})(root_element);

