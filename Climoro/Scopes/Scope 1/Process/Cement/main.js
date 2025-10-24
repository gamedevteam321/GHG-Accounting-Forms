// Cement Data Manager for Frappe - Using root_element
console.log('Cement data manager script loading for Frappe...');

// Use root_element as provided by Frappe
const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
console.log('Using scope root:', scopeRoot);

    let currentStep = 1;
    const totalSteps = 6;
let currentRecordId = null;
let isEditMode = false;

// Initialize the application
function init() {
    console.log('Initializing cement data manager for Frappe...');
    setupEventListeners();
    loadCompanies();
    loadDataTable();
    console.log('Cement data manager initialized for Frappe');
}

// Setup event listeners
function setupEventListeners() {
    // Add record button
    const addRecordBtn = scopeRoot.querySelector('#addRecordBtn');
    console.log('Add button found:', addRecordBtn);
    if (addRecordBtn) {
        addRecordBtn.addEventListener('click', openAddForm);
        console.log('Event listener added to add button');
    } else {
        console.error('Add button not found!');
    }

    // Modal form buttons
    const prevStepBtn = scopeRoot.querySelector('#prevStepBtn');
    const nextStepBtn = scopeRoot.querySelector('#nextStepBtn');
    const saveRecordBtn = scopeRoot.querySelector('#saveRecordBtn');

    if (prevStepBtn) {
        prevStepBtn.addEventListener('click', previousStep);
    }
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', nextStep);
    }
    if (saveRecordBtn) {
        saveRecordBtn.addEventListener('click', saveRecord);
    }

    // Step indicators
    const stepIndicators = scopeRoot.querySelectorAll('.step-item');
    stepIndicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => goToStep(index + 1));
    });

    // Form field listeners
    setupFormFieldListeners();
    
    // Modal close button listeners
    setupModalCloseListeners();
}

// Setup modal close button listeners
function setupModalCloseListeners() {
    // Close button in modal header
    const closeBtn = scopeRoot.querySelector('[data-bs-dismiss="modal"]');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Close on backdrop click
    const modalElement = scopeRoot.querySelector('#cementFormModal');
    if (modalElement) {
        modalElement.addEventListener('click', function(e) {
            if (e.target === modalElement) {
                closeModal();
            }
        });
    }
}

    // Setup form field listeners for auto-calculations
    function setupFormFieldListeners() {
        // Clinker production calculations
        const clinkerFields = ['clinker_production', 'clinker_bought', 'clinker_sold', 'change_in_clinker_stocks'];
        clinkerFields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateTotalClinkerConsumed);
            }
        });

        // MIC calculations for Portland/Blended
        const micFields = ['mic_gypsum', 'mic_limestone', 'mic_slag_portland_blended', 
                          'mic_fly_ash_blending', 'mic_pozzolana_blending', 'mic_others_cement_mill'];
        micFields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateMICTotal);
            }
        });

        // MIC substitutes calculations
        const substituteFields = ['mic_consumed_pure_slag_cement', 'mic_fly_ash_pozzolana_direct_sales'];
        substituteFields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateSubstitutesTotal);
            }
        });

        // Production totals calculations - trigger when clinker fields change
        const clinkerProductionFields = ['clinker_production', 'clinker_bought', 'clinker_sold', 'change_in_clinker_stocks'];
        clinkerProductionFields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateProductionTotals);
            }
        });

        // Trigger when MIC totals change
        const totalMIC = scopeRoot.querySelector('#total_mic_consumed_portland_blended');
        if (totalMIC) totalMIC.addEventListener('input', calculateProductionTotals);

        // Trigger when substitutes total changes
        const totalSubstitutes = scopeRoot.querySelector('#total_pure_mic_products_substitutes');
        if (totalSubstitutes) totalSubstitutes.addEventListener('input', calculateProductionTotals);

        // CO2 calculations
        const co2RawMaterialFields = ['calcination_emission_factor_35a', 'organic_carbon_content_35b', 'raw_meal_clinker_ratio_35c', 'clinker_production', 'bypass_dust_leaving_kiln_system', 'ckd_leaving_kiln_system'];
        co2RawMaterialFields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateCO2FromRawMaterials);
            }
        });

    // Company change listener
    const companySelect = scopeRoot.querySelector('#company');
    if (companySelect) {
        companySelect.addEventListener('change', loadUnits);
    }

    }


// Load companies from Frappe
function loadCompanies() {
    const companySelect = scopeRoot.querySelector('#company');
    if (!companySelect) return;

    // Use frappe.call method like in main.js
    frappe.call({
        method: 'frappe.client.get_list',
        args: { 
            doctype: 'Company', 
            fields: ['name'], 
            limit: 500 
        },
        callback: function(r) {
            if (r.exc) {
                console.error('Error loading companies:', r.exc);
                companySelect.innerHTML = '<option value="">Error loading companies</option>';
                return;
            }
            
            if (r.message && r.message.length > 0) {
                companySelect.innerHTML = '<option value="">Select Company</option>';
                r.message.forEach(company => {
                    const option = document.createElement('option');
                    option.value = company.name;
                    option.textContent = company.name;
                    companySelect.appendChild(option);
                });

                // Add event listener for company change
                companySelect.addEventListener('change', loadUnits);
                console.log('Companies loaded successfully:', r.message.length);
            } else {
                console.log('No companies found');
                companySelect.innerHTML = '<option value="">No companies found</option>';
            }
        }
    });
}


// Load units based on selected company
function loadUnits() {
    const companySelect = scopeRoot.querySelector('#company');
    const unitSelect = scopeRoot.querySelector('#company_unit');
    
    if (!companySelect || !unitSelect) return;

    const selectedCompany = companySelect.value;
    
    if (!selectedCompany) {
        unitSelect.innerHTML = '<option value="">Select Company first</option>';
        unitSelect.disabled = true;
        return;
    }

    // Show loading state
    unitSelect.innerHTML = '<option value="">Loading units...</option>';
    unitSelect.disabled = true;

    // Use frappe.call method like in main.js
    frappe.call({
        method: 'frappe.client.get_list',
        args: { 
            doctype: 'Units', 
            fields: ['name'], 
            filters: { 
                'company': selectedCompany
            },
            limit: 500 
        },
        callback: function(r) {
            if (r.exc) {
                console.error('Error loading units:', r.exc);
                unitSelect.innerHTML = '<option value="">Error loading units</option>';
                unitSelect.disabled = false;
                return;
            }
            
            if (r.message && r.message.length > 0) {
                unitSelect.innerHTML = '<option value="">Select Unit</option>';
                r.message.forEach(unit => {
                    const option = document.createElement('option');
                    option.value = unit.name;
                    option.textContent = unit.name;
                    unitSelect.appendChild(option);
                });

                unitSelect.disabled = false;
                console.log('Units loaded successfully:', r.message.length);
            } else {
                console.log('No units found for company:', selectedCompany);
                unitSelect.innerHTML = '<option value="">No units found</option>';
                unitSelect.disabled = false;
            }
        }
    });
}


    // Calculate total clinker consumed
    function calculateTotalClinkerConsumed() {
        const clinkerProduction = parseFloat(scopeRoot.querySelector('#clinker_production')?.value) || 0;
        const clinkerBought = parseFloat(scopeRoot.querySelector('#clinker_bought')?.value) || 0;
        const clinkerSold = parseFloat(scopeRoot.querySelector('#clinker_sold')?.value) || 0;
        const changeInStocks = parseFloat(scopeRoot.querySelector('#change_in_clinker_stocks')?.value) || 0;

        const totalClinkerConsumed = clinkerProduction + clinkerBought - clinkerSold - changeInStocks;

        const totalField = scopeRoot.querySelector('#total_clinker_consumed');
        if (totalField) {
            totalField.value = totalClinkerConsumed.toFixed(2);
        }
    }

    // Calculate MIC total
    function calculateMICTotal() {
        const fields = ['mic_gypsum', 'mic_limestone', 'mic_slag_portland_blended', 
                       'mic_fly_ash_blending', 'mic_pozzolana_blending', 'mic_others_cement_mill'];
        
        let total = 0;
        fields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            const value = parseFloat(element?.value) || 0;
            total += value;
        });

        const totalField = scopeRoot.querySelector('#total_mic_consumed_portland_blended');
        if (totalField) {
            totalField.value = total.toFixed(2);
        }
    }

    // Calculate substitutes total
    function calculateSubstitutesTotal() {
        const pureSlag = parseFloat(scopeRoot.querySelector('#mic_consumed_pure_slag_cement')?.value) || 0;
        const directSales = parseFloat(scopeRoot.querySelector('#mic_fly_ash_pozzolana_direct_sales')?.value) || 0;

        const total = pureSlag + directSales;
        const totalField = scopeRoot.querySelector('#total_pure_mic_products_substitutes');
        if (totalField) {
            totalField.value = total.toFixed(2);
        }
    }

    // Calculate production totals
    function calculateProductionTotals() {
        // Line 11: Total clinker consumed = Line8 + Line9 - Line10 - Line10a
        const clinkerProduction = parseFloat(scopeRoot.querySelector('#clinker_production')?.value) || 0; // Line 8
        const clinkerBought = parseFloat(scopeRoot.querySelector('#clinker_bought')?.value) || 0; // Line 9
        const clinkerSold = parseFloat(scopeRoot.querySelector('#clinker_sold')?.value) || 0; // Line 10
        const clinkerStockChange = parseFloat(scopeRoot.querySelector('#change_in_clinker_stocks')?.value) || 0; // Line 10a
        
        const totalClinkerConsumed = clinkerProduction + clinkerBought - clinkerSold - clinkerStockChange; // Line 11
        
        // Line 18: Total MIC consumed for Portland and blended cements
        const micConsumed = parseFloat(scopeRoot.querySelector('#total_mic_consumed_portland_blended')?.value) || 0; // Line 18
        
        // Line 19: Total pure MIC products used as cement substitutes
        const substitutes = parseFloat(scopeRoot.querySelector('#total_pure_mic_products_substitutes')?.value) || 0; // Line 19

        // Line 20: Total Portland + Blended cements = Line11 + Line18
        const portlandBlended = totalClinkerConsumed + micConsumed;
        const portlandField = scopeRoot.querySelector('#total_portland_blended_cements');
        if (portlandField) {
            portlandField.value = portlandBlended.toFixed(2);
        }

        // Line 21: Total cements + substitutes = Line11 + Line18 + Line19
        const totalCements = totalClinkerConsumed + micConsumed + substitutes;
        const totalCementsField = scopeRoot.querySelector('#total_cements_substitutes_portland_blended_slag');
        if (totalCementsField) {
            totalCementsField.value = totalCements.toFixed(2);
        }

        // Line 21a: Total cementitious products = Line8 + Line18 + Line19
        const totalCementitious = clinkerProduction + micConsumed + substitutes;
        const cementitiousField = scopeRoot.querySelector('#total_cementitious_products');
        if (cementitiousField) {
            cementitiousField.value = totalCementitious.toFixed(2);
        }
    }

// Calculate CO2 from raw materials
function calculateCO2FromRawMaterials() {
    const calcinationFactor = parseFloat(scopeRoot.querySelector('#calcination_emission_factor_35a')?.value) || 0;
    const organicCarbon = parseFloat(scopeRoot.querySelector('#organic_carbon_content_35b')?.value) || 0;
    const rawMealRatio = parseFloat(scopeRoot.querySelector('#raw_meal_clinker_ratio_35c')?.value) || 0;
    const clinkerProduction = parseFloat(scopeRoot.querySelector('#clinker_production')?.value) || 0;

    // Raw meal consumption
    const rawMealConsumption = rawMealRatio * clinkerProduction;
    const rawMealField = scopeRoot.querySelector('#raw_meal_consumption_35d');
    if (rawMealField) {
        rawMealField.value = rawMealConsumption.toFixed(2);
    }

    // CO2 from calcination of clinker
    const co2FromClinker = (calcinationFactor / 1000) * clinkerProduction;
    const clinkerCO2Field = scopeRoot.querySelector('#co2_from_calcination_clinker_36');
    if (clinkerCO2Field) {
        clinkerCO2Field.value = co2FromClinker.toFixed(2);
    }

    // CO2 from organic carbon
    const co2FromOrganicCarbon = organicCarbon * rawMealConsumption * 3.664;
    
    // Total CO2 from raw materials
    const totalCO2RawMaterials = co2FromClinker + co2FromOrganicCarbon;
    const totalRawField = scopeRoot.querySelector('#total_co2_from_raw_materials_39');
    if (totalRawField) {
        totalRawField.value = totalCO2RawMaterials.toFixed(2);
    }
}

// Open add form
function openAddForm() {
    console.log('openAddForm called');
    isEditMode = false;
    currentRecordId = null;
    resetForm();
    updateModalTitle('Add New Cement Process Record');
    showStep(1);
    updateNavigationButtons();
    
    const modalElement = scopeRoot.querySelector('#cementFormModal');
    console.log('Modal element found:', modalElement);
    if (modalElement) {
        // Check if Bootstrap is available
        if (typeof bootstrap !== 'undefined') {
            console.log('Bootstrap available, creating modal...');
            const modal = new bootstrap.Modal(modalElement);
            console.log('Bootstrap modal created:', modal);
            modal.show();
        } else {
            console.log('Bootstrap not available, showing modal manually...');
            // Fallback: Show modal manually
            modalElement.style.display = 'block';
            modalElement.classList.add('show');
            modalElement.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
            
            // Add backdrop
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            backdrop.id = 'modal-backdrop';
            document.body.appendChild(backdrop);
        }
    } else {
        console.error('Modal element not found!');
    }
}

// Reset form
function resetForm() {
    const form = scopeRoot.querySelector('#cementProcessForm');
    if (form) {
        form.reset();
    }
    
    // Set default values
    const calcinationField = scopeRoot.querySelector('#calcination_emission_factor_35a');
    const organicField = scopeRoot.querySelector('#organic_carbon_content_35b');
    const ratioField = scopeRoot.querySelector('#raw_meal_clinker_ratio_35c');
    const dateField = scopeRoot.querySelector('#date_of_input');
    
    if (calcinationField) calcinationField.value = '525';
    if (organicField) organicField.value = '0.2';
    if (ratioField) ratioField.value = '1.55';
    
    // Set today's date
    if (dateField) {
        const today = new Date().toISOString().split('T')[0];
        dateField.value = today;
    }
}

// Update modal title
function updateModalTitle(title) {
    const modalTitle = scopeRoot.querySelector('#cementFormModalLabel');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fa fa-${isEditMode ? 'edit' : 'plus'}"></i> ${title}`;
    }
}

// Show specific step
function showStep(step) {
    // Hide all steps
    for (let i = 1; i <= totalSteps; i++) {
        const stepContent = scopeRoot.querySelector(`#step${i}`);
        const stepIndicator = scopeRoot.querySelector(`.step-item[data-step="${i}"]`);
        
        if (stepContent) {
            stepContent.classList.remove('active');
            stepContent.style.display = 'none';
        }
        if (stepIndicator) {
            stepIndicator.classList.remove('active');
        }
    }

    // Show current step
    const currentStepContent = scopeRoot.querySelector(`#step${step}`);
    const currentStepIndicator = scopeRoot.querySelector(`.step-item[data-step="${step}"]`);
    
    if (currentStepContent) {
        currentStepContent.classList.add('active');
        currentStepContent.style.display = 'block';
    }
    if (currentStepIndicator) {
        currentStepIndicator.classList.add('active');
    }

    currentStep = step;
}

// Go to specific step
function goToStep(step) {
    if (step >= 1 && step <= totalSteps) {
        showStep(step);
        updateNavigationButtons();
    }
}

// Update navigation buttons
function updateNavigationButtons() {
    const prevBtn = scopeRoot.querySelector('#prevStepBtn');
    const nextBtn = scopeRoot.querySelector('#nextStepBtn');
    const saveBtn = scopeRoot.querySelector('#saveRecordBtn');

    if (prevBtn) {
        prevBtn.style.display = currentStep > 1 ? 'inline-block' : 'none';
    }
    if (nextBtn) {
        nextBtn.style.display = currentStep < totalSteps ? 'inline-block' : 'none';
    }
    if (saveBtn) {
        saveBtn.style.display = currentStep === totalSteps ? 'inline-block' : 'none';
    }
}

// Previous step
function previousStep() {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
}

// Next step
function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
            goToStep(currentStep + 1);
        }
    }
}

// Validate current step
function validateCurrentStep() {
    const currentStepContent = scopeRoot.querySelector(`#step${currentStep}`);
    const requiredFields = currentStepContent.querySelectorAll('input[required], select[required]');
    
    for (let field of requiredFields) {
        if (!field.value.trim()) {
            field.focus();
            alert(`Please fill in the required field: ${field.previousElementSibling?.textContent || field.name}`);
            return false;
        }
    }
    
    return true;
}

// Close modal manually (fallback for when Bootstrap is not available)
function closeModal() {
    const modalElement = scopeRoot.querySelector('#cementFormModal');
    if (modalElement) {
        if (typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        } else {
            // Manual close
            modalElement.style.display = 'none';
            modalElement.classList.remove('show');
            modalElement.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            
            // Remove backdrop
            const backdrop = document.getElementById('modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
        }
    }
}

// Save record
function saveRecord() {
    if (!validateCurrentStep()) {
        return;
    }

    const formData = collectFormData();
    
    if (isEditMode) {
        updateRecord(currentRecordId, formData);
    } else {
        addRecord(formData);
    }

    // Close modal
    closeModal();
}

// Collect form data
function collectFormData() {
    const form = scopeRoot.querySelector('#cementProcessForm');
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    // Add calculated fields
    data.total_clinker_consumed = scopeRoot.querySelector('#total_clinker_consumed')?.value || 0;
    data.total_co2_from_raw_materials_39 = scopeRoot.querySelector('#total_co2_from_raw_materials_39')?.value || 0;
    
    // Add timestamp
    data.created_at = new Date().toISOString();
    data.updated_at = new Date().toISOString();
    
    return data;
}

// Add new record
function addRecord(data) {
    const records = getRecords();
    const newId = Date.now().toString();
    data.id = newId;
    records.push(data);
    saveRecords(records);
    loadDataTable();
    
    showNotification('Record added successfully!', 'success');
}

// Update existing record
function updateRecord(id, data) {
    const records = getRecords();
    const index = records.findIndex(record => record.id === id);
    
    if (index !== -1) {
        data.id = id;
        data.created_at = records[index].created_at;
        data.updated_at = new Date().toISOString();
        records[index] = data;
        saveRecords(records);
        loadDataTable();
        
        showNotification('Record updated successfully!', 'success');
    }
}

// Delete record
function deleteRecord(id) {
    if (confirm('Are you sure you want to delete this record?')) {
        const records = getRecords();
        const filteredRecords = records.filter(record => record.id !== id);
        saveRecords(filteredRecords);
        loadDataTable();
        
        showNotification('Record deleted successfully!', 'success');
    }
}

// View record
function viewRecord(id) {
    const records = getRecords();
    const record = records.find(r => r.id === id);
    
    if (record) {
        // Open modal in view mode
        isEditMode = false;
        currentRecordId = id;
        populateForm(record);
        updateModalTitle('View Cement Process Record');
        showStep(1);
        updateNavigationButtons();
        
        // Disable all form fields
        const form = scopeRoot.querySelector('#cementProcessForm');
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => input.disabled = true);
        
        const modalElement = scopeRoot.querySelector('#cementFormModal');
        if (modalElement) {
            if (typeof bootstrap !== 'undefined') {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            } else {
                // Manual show
                modalElement.style.display = 'block';
                modalElement.classList.add('show');
                modalElement.setAttribute('aria-hidden', 'false');
                document.body.classList.add('modal-open');
                
                // Add backdrop
                const backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                backdrop.id = 'modal-backdrop';
                document.body.appendChild(backdrop);
            }
        }
    }
}

// Edit record
function editRecord(id) {
    const records = getRecords();
    const record = records.find(r => r.id === id);
    
    if (record) {
        isEditMode = true;
        currentRecordId = id;
        populateForm(record);
        updateModalTitle('Edit Cement Process Record');
        showStep(1);
        updateNavigationButtons();
        
        // Enable all form fields
        const form = scopeRoot.querySelector('#cementProcessForm');
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => input.disabled = false);
        
        const modalElement = scopeRoot.querySelector('#cementFormModal');
        if (modalElement) {
            if (typeof bootstrap !== 'undefined') {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            } else {
                // Manual show
                modalElement.style.display = 'block';
                modalElement.classList.add('show');
                modalElement.setAttribute('aria-hidden', 'false');
                document.body.classList.add('modal-open');
                
                // Add backdrop
                const backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                backdrop.id = 'modal-backdrop';
                document.body.appendChild(backdrop);
            }
        }
    }
}

    // Populate form with data
    function populateForm(data) {
        Object.keys(data).forEach(key => {
            const element = scopeRoot.querySelector(`#${key}`);
            if (element) {
                element.value = data[key];
            }
        });
        
        // Trigger all calculations
        calculateTotalClinkerConsumed();
        calculateMICTotal();
        calculateSubstitutesTotal();
        calculateProductionTotals();
        calculateCO2FromRawMaterials();
    }

// Load data table
function loadDataTable() {
    const records = getRecords();
    const tableBody = scopeRoot.querySelector('#dataTableBody');
    const emptyState = scopeRoot.querySelector('#emptyState');
    
    if (!tableBody) return;
    
    if (records.length === 0) {
        tableBody.innerHTML = '';
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        return;
    }
    
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    tableBody.innerHTML = records.map((record, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${formatDate(record.date_of_input)}</td>
            <td>${record.company || '-'}</td>
            <td>${record.company_unit || '-'}</td>
            <td>${record.duration_type || '-'}</td>
            <td>${parseFloat(record.clinker_production || 0).toFixed(2)}</td>
            <td>${parseFloat(record.total_co2_from_raw_materials_39 || 0).toFixed(2)}</td>
            <td>0.00</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewRecord('${record.id}')" title="View">
                        <i class="fa fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="editRecord('${record.id}')" title="Edit">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteRecord('${record.id}')" title="Delete">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Get records from localStorage
function getRecords() {
    const records = localStorage.getItem('cement_process_records');
    return records ? JSON.parse(records) : [];
}

// Save records to localStorage
function saveRecords(records) {
    localStorage.setItem('cement_process_records', JSON.stringify(records));
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'success' ? 'success' : 'info'} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Make functions globally available
window.viewRecord = viewRecord;
window.editRecord = editRecord;
window.deleteRecord = deleteRecord;

// Initialize when DOM is ready or root_element is available
if (typeof root_element !== 'undefined' && root_element) {
    console.log('root_element available, initializing immediately');
    init();
} else {
    console.log('root_element not available, waiting for DOM');
    document.addEventListener('DOMContentLoaded', init);
}