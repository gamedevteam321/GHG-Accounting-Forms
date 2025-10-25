// Cement Data Manager for Frappe - Using root_element
console.log('Cement data manager script loading for Frappe...');

// Use root_element as provided by Frappe
const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
console.log('Using scope root:', scopeRoot);

    let currentStep = 1;
    const totalSteps = 7;
let currentRecordId = null;
let isEditMode = false;

// Pagination variables
let currentPage = 1;
let pageSize = 25;
let totalRecords = 0;
let allRecords = [];

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
    const cancelBtn = scopeRoot.querySelector('#cancelBtn');

    if (prevStepBtn) {
        prevStepBtn.addEventListener('click', previousStep);
    }
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', nextStep);
    }
    if (saveRecordBtn) {
        saveRecordBtn.addEventListener('click', saveRecord);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

    // Step indicators
    const stepIndicators = scopeRoot.querySelectorAll('.step-item');
    stepIndicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => goToStep(index + 1));
    });

    // Form field listeners
    setupFormFieldListeners();
    
    // Pagination listeners
    setupPaginationListeners();
    
    // Modal close button listeners
    setupModalCloseListeners();
}

// Setup custom modal close button listeners
function setupModalCloseListeners() {
    // Close button in modal header
    const closeBtn = scopeRoot.querySelector('#closeModalBtn');
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

        // Calcination step calculations
        const calcinationFields = ['clinker_production', 'cao_content_clinker_22', 'mgo_content_clinker_23', 
                                   'raw_material_consumed_51', 'cao_content_raw_material_52', 'mgo_content_raw_material_53'];
        calcinationFields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateCalcinationStep);
                element.addEventListener('blur', () => validateField(element));
            }
        });

        // Add validation listeners for steps 1, 2, and 3 only
        const validationFields = [
            'company', 'company_unit', 'date_of_input', 'duration_type',
            'clinker_production'
        ];
        
        validationFields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('blur', () => validateField(element));
                element.addEventListener('input', () => {
                    // Clear error styling on input
                    element.classList.remove('field-error');
                    const errorMessage = element.parentNode.querySelector('.field-error-message');
                    if (errorMessage) {
                        errorMessage.remove();
                    }
                });
            }
        });

        // Add validation for MIC fields
        const micValidationFields = ['limestone_mic', 'clay_mic', 'shale_mic', 'sand_mic', 'bauxite_mic', 
                                   'iron_ore_mic', 'gypsum_mic', 'fly_ash_mic', 'slag_mic', 'other_mic'];
        micValidationFields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('blur', () => validateField(element));
                element.addEventListener('input', () => {
                    element.classList.remove('field-error');
                    const errorMessage = element.parentNode.querySelector('.field-error-message');
                    if (errorMessage) {
                        errorMessage.remove();
                    }
                });
            }
        });

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

    // Calculate calcination step values
    function calculateCalcinationStep() {
        // Get clinker production from step 2
        const clinkerProduction = parseFloat(scopeRoot.querySelector('#clinker_production')?.value) || 0;
        const clinkerField = scopeRoot.querySelector('#clinker_produced_21');
        if (clinkerField) {
            clinkerField.value = clinkerProduction.toFixed(2);
        }

        // Calculate CaO and MgO amounts for clinker
        const caoContentClinker = parseFloat(scopeRoot.querySelector('#cao_content_clinker_22')?.value) || 0;
        const mgoContentClinker = parseFloat(scopeRoot.querySelector('#mgo_content_clinker_23')?.value) || 0;
        
        const caoAmountClinker = (caoContentClinker / 100) * clinkerProduction;
        const mgoAmountClinker = (mgoContentClinker / 100) * clinkerProduction;
        
        const caoAmountField = scopeRoot.querySelector('#cao_amount_clinker_24');
        const mgoAmountField = scopeRoot.querySelector('#mgo_amount_clinker_25');
        
        if (caoAmountField) caoAmountField.value = caoAmountClinker.toFixed(2);
        if (mgoAmountField) mgoAmountField.value = mgoAmountClinker.toFixed(2);

        // Calculate CaO and MgO amounts for raw material
        const rawMaterialConsumed = parseFloat(scopeRoot.querySelector('#raw_material_consumed_51')?.value) || 0;
        const caoContentRawMaterial = parseFloat(scopeRoot.querySelector('#cao_content_raw_material_52')?.value) || 0;
        const mgoContentRawMaterial = parseFloat(scopeRoot.querySelector('#mgo_content_raw_material_53')?.value) || 0;
        
        const caoAmountRawMaterial = (caoContentRawMaterial / 100) * rawMaterialConsumed;
        const mgoAmountRawMaterial = (mgoContentRawMaterial / 100) * rawMaterialConsumed;
        
        const caoAmountRawField = scopeRoot.querySelector('#cao_amount_raw_material_54');
        const mgoAmountRawField = scopeRoot.querySelector('#mgo_amount_raw_material_55');
        
        if (caoAmountRawField) caoAmountRawField.value = caoAmountRawMaterial.toFixed(2);
        if (mgoAmountRawField) mgoAmountRawField.value = mgoAmountRawMaterial.toFixed(2);

        // Calculate CO2 emissions using precise molecular weight conversions
        // Molecular weights: CaO = 56.1 g/mol, MgO = 40.3 g/mol, CO2 = 44.0 g/mol
        
        // Line 81: Uncorrected CO2 emissions from clinker CaO and MgO
        // CO2 from CaO = CaO amount * (CO2 molecular weight / CaO molecular weight)
        const co2FromCaoClinker = caoAmountClinker * (44.0 / 56.1);
        // CO2 from MgO = MgO amount * (CO2 molecular weight / MgO molecular weight)  
        const co2FromMgoClinker = mgoAmountClinker * (44.0 / 40.3);
        const uncorrectedCO2 = co2FromCaoClinker + co2FromMgoClinker;
        
        const uncorrectedField = scopeRoot.querySelector('#uncorrected_co2_emissions_81');
        if (uncorrectedField) {
            uncorrectedField.value = uncorrectedCO2.toFixed(2);
        }

        // Line 82: Correction for non-carbonate sources from raw material CaO and MgO
        // CO2 from raw material CaO = CaO amount * (CO2 molecular weight / CaO molecular weight)
        const co2FromCaoRawMaterial = caoAmountRawMaterial * (44.0 / 56.1);
        // CO2 from raw material MgO = MgO amount * (CO2 molecular weight / MgO molecular weight)
        const co2FromMgoRawMaterial = mgoAmountRawMaterial * (44.0 / 40.3);
        const correctionAmount = co2FromCaoRawMaterial + co2FromMgoRawMaterial;
        
        const correctionField = scopeRoot.querySelector('#correction_non_carbonate_82');
        if (correctionField) {
            correctionField.value = correctionAmount.toFixed(2);
        }

        // Line 83: Corrected, direct CO2 emissions = Line 81 - Line 82
        const correctedCO2 = uncorrectedCO2 - correctionAmount;
        const correctedField = scopeRoot.querySelector('#corrected_direct_co2_emissions_83');
        if (correctedField) {
            correctedField.value = correctedCO2.toFixed(2);
        }

        // Line 84: Calcination factor, uncorrected = (Line 81 / Line 21) * 1000
        const uncorrectedFactor = clinkerProduction > 0 ? (uncorrectedCO2 * 1000) / clinkerProduction : 0;
        const uncorrectedFactorField = scopeRoot.querySelector('#calcination_factor_uncorrected_84');
        if (uncorrectedFactorField) {
            uncorrectedFactorField.value = uncorrectedFactor.toFixed(2);
        }

        // Line 85: Calcination factor, corrected = (Line 83 / Line 21) * 1000
        const correctedFactor = clinkerProduction > 0 ? (correctedCO2 * 1000) / clinkerProduction : 0;
        const correctedFactorField = scopeRoot.querySelector('#calcination_factor_corrected_85');
        if (correctedFactorField) {
            correctedFactorField.value = correctedFactor.toFixed(2);
        }

        // Auto-populate calcination emission factor in Step 7 with the corrected factor
        const calcinationEmissionFactorField = scopeRoot.querySelector('#calcination_emission_factor_35a');
        if (calcinationEmissionFactorField && correctedFactor > 0) {
            calcinationEmissionFactorField.value = correctedFactor.toFixed(2);
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
        console.log('Showing custom modal...');
        modalElement.style.display = 'flex';
        modalElement.classList.add('show');
        document.body.style.overflow = 'hidden';
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

// Comprehensive validation for steps 1, 2, and 3 only
function validateAllSteps() {
    const validationErrors = [];
    
    // Step 1: Basic Information
    const company = scopeRoot.querySelector('#company')?.value?.trim();
    const companyUnit = scopeRoot.querySelector('#company_unit')?.value?.trim();
    const dateOfInput = scopeRoot.querySelector('#date_of_input')?.value?.trim();
    const durationType = scopeRoot.querySelector('#duration_type')?.value?.trim();
    
    if (!company) validationErrors.push('Company is required');
    if (!companyUnit) validationErrors.push('Company Unit is required');
    if (!dateOfInput) validationErrors.push('Date of Input is required');
    if (!durationType) validationErrors.push('Duration Type is required');
    
    // Validate date format and not in future
    if (dateOfInput) {
        const inputDate = new Date(dateOfInput);
        const today = new Date();
        if (inputDate > today) {
            validationErrors.push('Date of Input cannot be in the future');
        }
    }
    
    // Step 2: Clinker Production
    const clinkerProduction = parseFloat(scopeRoot.querySelector('#clinker_production')?.value || 0);
    const clinkerBought = parseFloat(scopeRoot.querySelector('#clinker_bought')?.value || 0);
    const clinkerSold = parseFloat(scopeRoot.querySelector('#clinker_sold')?.value || 0);
    const changeInStocks = parseFloat(scopeRoot.querySelector('#change_in_clinker_stocks')?.value || 0);
    
    if (clinkerProduction <= 0) {
        validationErrors.push('Clinker Production must be greater than 0');
    }
    
    // Step 3: Mineral Components (MIC)
    const limestoneMic = parseFloat(scopeRoot.querySelector('#limestone_mic')?.value || 0);
    const clayMic = parseFloat(scopeRoot.querySelector('#clay_mic')?.value || 0);
    const shaleMic = parseFloat(scopeRoot.querySelector('#shale_mic')?.value || 0);
    const sandMic = parseFloat(scopeRoot.querySelector('#sand_mic')?.value || 0);
    const bauxiteMic = parseFloat(scopeRoot.querySelector('#bauxite_mic')?.value || 0);
    const ironOreMic = parseFloat(scopeRoot.querySelector('#iron_ore_mic')?.value || 0);
    const gypsumMic = parseFloat(scopeRoot.querySelector('#gypsum_mic')?.value || 0);
    const flyAshMic = parseFloat(scopeRoot.querySelector('#fly_ash_mic')?.value || 0);
    const slagMic = parseFloat(scopeRoot.querySelector('#slag_mic')?.value || 0);
    const otherMic = parseFloat(scopeRoot.querySelector('#other_mic')?.value || 0);
    
    // Check for negative values
    const micFields = [limestoneMic, clayMic, shaleMic, sandMic, bauxiteMic, ironOreMic, gypsumMic, flyAshMic, slagMic, otherMic];
    micFields.forEach((value, index) => {
        if (value < 0) {
            const fieldNames = ['Limestone', 'Clay', 'Shale', 'Sand', 'Bauxite', 'Iron Ore', 'Gypsum', 'Fly Ash', 'Slag', 'Other'];
            validationErrors.push(`${fieldNames[index]} MIC cannot be negative`);
        }
    });
    
    // Display validation errors
    if (validationErrors.length > 0) {
        const errorMessage = 'Please fix the following errors:\n\n' + validationErrors.join('\n');
        alert(errorMessage);
        return false;
    }
    
    return true;
}

// Real-time field validation
function validateField(field) {
    const value = parseFloat(field.value || 0);
    const fieldName = field.previousElementSibling?.textContent || field.name;
    const fieldId = field.id;
    
    // Remove existing error styling
    field.classList.remove('field-error');
    const existingError = field.parentNode.querySelector('.field-error-message');
    if (existingError) {
        existingError.remove();
    }
    
    let errorMessage = '';
    
    // Validate based on field type (steps 1, 2, 3 only)
    switch (fieldId) {
        case 'clinker_production':
            if (value <= 0) errorMessage = 'Clinker Production must be greater than 0';
            break;
        default:
            // Check for negative values in MIC fields (Step 3)
            if (fieldId.includes('_mic') && value < 0) {
                errorMessage = 'This value cannot be negative';
            }
            break;
    }
    
    // Display error if validation fails
    if (errorMessage) {
        field.classList.add('field-error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error-message';
        errorDiv.textContent = errorMessage;
        errorDiv.style.color = '#dc3545';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '4px';
        field.parentNode.appendChild(errorDiv);
    }
    
    return !errorMessage;
}

// Close modal manually (fallback for when Bootstrap is not available)
function closeModal() {
    const modalElement = scopeRoot.querySelector('#cementFormModal');
    if (modalElement) {
        console.log('Closing custom modal...');
        modalElement.style.display = 'none';
        modalElement.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// Save record
function saveRecord() {
    // Validate all steps before saving
    if (!validateAllSteps()) {
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

// Add new record to Frappe database
function addRecord(data) {
    frappe.call({
        method: 'frappe.client.insert',
        args: {
            doc: {
                doctype: 'Cement Process',
                company: data.company,
                company_unit: data.company_unit,
                date_of_input: data.date_of_input,
                duration_type: data.duration_type,
                clinker_production: data.clinker_production,
                clinker_bought: data.clinker_bought,
                clinker_sold: data.clinker_sold,
                change_in_clinker_stocks: data.change_in_clinker_stocks,
                total_clinker_consumed: data.total_clinker_consumed,
                limestone_mic: data.limestone_mic,
                clay_mic: data.clay_mic,
                shale_mic: data.shale_mic,
                sand_mic: data.sand_mic,
                bauxite_mic: data.bauxite_mic,
                iron_ore_mic: data.iron_ore_mic,
                gypsum_mic: data.gypsum_mic,
                fly_ash_mic: data.fly_ash_mic,
                slag_mic: data.slag_mic,
                other_mic: data.other_mic,
                total_mic: data.total_mic,
                cao_content_clinker_22: data.cao_content_clinker_22,
                mgo_content_clinker_23: data.mgo_content_clinker_23,
                cao_amount_clinker_24: data.cao_amount_clinker_24,
                mgo_amount_clinker_25: data.mgo_amount_clinker_25,
                raw_material_consumed_51: data.raw_material_consumed_51,
                cao_content_raw_material_52: data.cao_content_raw_material_52,
                mgo_content_raw_material_53: data.mgo_content_raw_material_53,
                cao_amount_raw_material_54: data.cao_amount_raw_material_54,
                mgo_amount_raw_material_55: data.mgo_amount_raw_material_55,
                uncorrected_co2_emissions_81: data.uncorrected_co2_emissions_81,
                correction_non_carbonate_82: data.correction_non_carbonate_82,
                corrected_direct_co2_emissions_83: data.corrected_direct_co2_emissions_83,
                calcination_factor_uncorrected_84: data.calcination_factor_uncorrected_84,
                calcination_factor_corrected_85: data.calcination_factor_corrected_85,
                total_portland_blended_cements: data.total_portland_blended_cements,
                total_cements_substitutes: data.total_cements_substitutes,
                total_cementitious_products: data.total_cementitious_products,
                ckd_produced: data.ckd_produced,
                bypass_dust_produced: data.bypass_dust_produced,
                ckd_recycled: data.ckd_recycled,
                bypass_dust_recycled: data.bypass_dust_recycled,
                ckd_disposed: data.ckd_disposed,
                bypass_dust_disposed: data.bypass_dust_disposed,
                calcination_emission_factor_35a: data.calcination_emission_factor_35a,
                organic_carbon_content_35b: data.organic_carbon_content_35b,
                raw_meal_clinker_ratio_35c: data.raw_meal_clinker_ratio_35c,
                raw_meal_consumption_35d: data.raw_meal_consumption_35d,
                co2_from_calcination_clinker_36: data.co2_from_calcination_clinker_36,
                co2_from_calcination_bypass_dust_37: data.co2_from_calcination_bypass_dust_37,
                co2_from_calcination_ckd_38a: data.co2_from_calcination_ckd_38a,
                co2_from_organic_carbon_38b: data.co2_from_organic_carbon_38b,
                total_co2_from_raw_materials_39: data.total_co2_from_raw_materials_39,
                total_direct_co2_48: data.total_direct_co2_48
            }
        },
        callback: function(response) {
            if (response.message) {
                loadDataTable();
                showNotification('Record added successfully!', 'success');
            } else {
                showNotification('Error adding record', 'error');
            }
        }
    });
}

// Update existing record in Frappe database
function updateRecord(id, data) {
    frappe.call({
        method: 'frappe.client.set_value',
        args: {
            doctype: 'Cement Process',
            name: id,
            fieldname: {
                company: data.company,
                company_unit: data.company_unit,
                date_of_input: data.date_of_input,
                duration_type: data.duration_type,
                clinker_production: data.clinker_production,
                clinker_bought: data.clinker_bought,
                clinker_sold: data.clinker_sold,
                change_in_clinker_stocks: data.change_in_clinker_stocks,
                total_clinker_consumed: data.total_clinker_consumed,
                limestone_mic: data.limestone_mic,
                clay_mic: data.clay_mic,
                shale_mic: data.shale_mic,
                sand_mic: data.sand_mic,
                bauxite_mic: data.bauxite_mic,
                iron_ore_mic: data.iron_ore_mic,
                gypsum_mic: data.gypsum_mic,
                fly_ash_mic: data.fly_ash_mic,
                slag_mic: data.slag_mic,
                other_mic: data.other_mic,
                total_mic: data.total_mic,
                cao_content_clinker_22: data.cao_content_clinker_22,
                mgo_content_clinker_23: data.mgo_content_clinker_23,
                cao_amount_clinker_24: data.cao_amount_clinker_24,
                mgo_amount_clinker_25: data.mgo_amount_clinker_25,
                raw_material_consumed_51: data.raw_material_consumed_51,
                cao_content_raw_material_52: data.cao_content_raw_material_52,
                mgo_content_raw_material_53: data.mgo_content_raw_material_53,
                cao_amount_raw_material_54: data.cao_amount_raw_material_54,
                mgo_amount_raw_material_55: data.mgo_amount_raw_material_55,
                uncorrected_co2_emissions_81: data.uncorrected_co2_emissions_81,
                correction_non_carbonate_82: data.correction_non_carbonate_82,
                corrected_direct_co2_emissions_83: data.corrected_direct_co2_emissions_83,
                calcination_factor_uncorrected_84: data.calcination_factor_uncorrected_84,
                calcination_factor_corrected_85: data.calcination_factor_corrected_85,
                total_portland_blended_cements: data.total_portland_blended_cements,
                total_cements_substitutes: data.total_cements_substitutes,
                total_cementitious_products: data.total_cementitious_products,
                ckd_produced: data.ckd_produced,
                bypass_dust_produced: data.bypass_dust_produced,
                ckd_recycled: data.ckd_recycled,
                bypass_dust_recycled: data.bypass_dust_recycled,
                ckd_disposed: data.ckd_disposed,
                bypass_dust_disposed: data.bypass_dust_disposed,
                calcination_emission_factor_35a: data.calcination_emission_factor_35a,
                organic_carbon_content_35b: data.organic_carbon_content_35b,
                raw_meal_clinker_ratio_35c: data.raw_meal_clinker_ratio_35c,
                raw_meal_consumption_35d: data.raw_meal_consumption_35d,
                co2_from_calcination_clinker_36: data.co2_from_calcination_clinker_36,
                co2_from_calcination_bypass_dust_37: data.co2_from_calcination_bypass_dust_37,
                co2_from_calcination_ckd_38a: data.co2_from_calcination_ckd_38a,
                co2_from_organic_carbon_38b: data.co2_from_organic_carbon_38b,
                total_co2_from_raw_materials_39: data.total_co2_from_raw_materials_39,
                total_direct_co2_48: data.total_direct_co2_48
            }
        },
        callback: function(response) {
            if (response.message) {
                loadDataTable();
                showNotification('Record updated successfully!', 'success');
            } else {
                showNotification('Error updating record', 'error');
            }
        }
    });
}

// Delete record from Frappe database
function deleteRecord(id) {
    if (confirm('Are you sure you want to delete this record?')) {
        frappe.call({
            method: 'frappe.client.delete',
            args: {
                doctype: 'Cement Process',
                name: id
            },
            callback: function(response) {
                if (response.message) {
                    loadDataTable();
                    showNotification('Record deleted successfully!', 'success');
                } else {
                    showNotification('Error deleting record', 'error');
                }
            }
        });
    }
}

// View record
function viewRecord(id) {
    frappe.call({
        method: 'frappe.client.get',
        args: {
            doctype: 'Cement Process',
            name: id
        },
        callback: function(response) {
            if (response.message) {
                const record = response.message;
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
                    modalElement.style.display = 'flex';
                    modalElement.classList.add('show');
                    document.body.style.overflow = 'hidden';
                }
            } else {
                showNotification('Error loading record', 'error');
            }
        }
    });
}

// Edit record from Frappe database
function editRecord(id) {
    frappe.call({
        method: 'frappe.client.get',
        args: {
            doctype: 'Cement Process',
            name: id
        },
        callback: function(response) {
            if (response.message) {
                const record = response.message;
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
                    modalElement.style.display = 'flex';
                    modalElement.classList.add('show');
                    document.body.style.overflow = 'hidden';
                }
            } else {
                showNotification('Error loading record', 'error');
            }
        }
    });
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

// Get records from Frappe database
function getRecords() {
    // This function is now replaced by loadDataTable which fetches from Frappe
    return [];
}

// Load data table from Frappe database
function loadDataTable() {
    console.log('Loading records from Frappe database...');
    
    // Show loading indicator
    const tbody = scopeRoot.querySelector('#dataTable tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fa fa-spinner fa-spin"></i> Loading records...</td></tr>';
    }
    
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Cement Process',
            fields: ['name', 'company', 'company_unit', 'date_of_input', 'duration_type', 'clinker_production', 'total_co2_from_raw_materials_39', 'creation', 'modified'],
            order_by: 'creation desc',
            limit: 100
        },
        callback: function(response) {
            console.log('Frappe API response:', response);
            if (response.message) {
                console.log('Records loaded:', response.message.length);
                allRecords = response.message;
                totalRecords = allRecords.length;
                currentPage = 1;
                displayRecords(getCurrentPageRecords());
                updatePagination();
            } else {
                console.error('Error loading records:', response);
                showNotification('Error loading records from database', 'error');
            }
        },
        error: function(err) {
            console.error('Frappe API error:', err);
            showNotification('Failed to connect to database', 'error');
        }
    });
}

// Display records in the table
function displayRecords(records) {
    const tbody = scopeRoot.querySelector('#dataTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No records found</td></tr>';
        return;
    }
    
    records.forEach((record, index) => {
        const row = document.createElement('tr');
        const rowNumber = (currentPage - 1) * pageSize + index + 1;
        row.innerHTML = `
            <td>${rowNumber}</td>
            <td>${formatDate(record.date_of_input)}</td>
            <td>${record.company || '-'}</td>
            <td>${record.company_unit || '-'}</td>
            <td>${record.duration_type || '-'}</td>
            <td>${record.clinker_production || 0}</td>
            <td>${record.total_co2_from_raw_materials_39 || 0}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick="viewRecord('${record.name}')" title="View">
                        <i class="fa fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editRecord('${record.name}')" title="Edit">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteRecord('${record.name}')" title="Delete">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Setup pagination event listeners
function setupPaginationListeners() {
    // First page button
    const firstPageBtn = scopeRoot.querySelector('#firstPageBtn');
    if (firstPageBtn) {
        firstPageBtn.addEventListener('click', () => goToPage(1));
    }
    
    // Previous page button
    const prevPageBtn = scopeRoot.querySelector('#prevPageBtn');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    }
    
    // Next page button
    const nextPageBtn = scopeRoot.querySelector('#nextPageBtn');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    }
    
    // Last page button
    const lastPageBtn = scopeRoot.querySelector('#lastPageBtn');
    if (lastPageBtn) {
        lastPageBtn.addEventListener('click', () => goToPage(getTotalPages()));
    }
    
    // Page size selector
    const pageSizeSelect = scopeRoot.querySelector('#pageSize');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', (e) => {
            pageSize = parseInt(e.target.value);
            currentPage = 1;
            displayRecords(getCurrentPageRecords());
            updatePagination();
        });
    }
}

// Go to specific page
function goToPage(page) {
    const totalPages = getTotalPages();
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayRecords(getCurrentPageRecords());
    updatePagination();
}

// Get current page records
function getCurrentPageRecords() {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return allRecords.slice(startIndex, endIndex);
}

// Get total pages
function getTotalPages() {
    return Math.ceil(totalRecords / pageSize);
}

// Update pagination controls
function updatePagination() {
    const totalPages = getTotalPages();
    const startRecord = (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);
    
    // Update pagination info
    const paginationInfo = scopeRoot.querySelector('#paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${startRecord}-${endRecord} of ${totalRecords} records`;
    }
    
    // Update button states
    const firstPageBtn = scopeRoot.querySelector('#firstPageBtn');
    const prevPageBtn = scopeRoot.querySelector('#prevPageBtn');
    const nextPageBtn = scopeRoot.querySelector('#nextPageBtn');
    const lastPageBtn = scopeRoot.querySelector('#lastPageBtn');
    
    if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
    if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages;
    
    // Update page numbers
    updatePageNumbers();
    
    // Show/hide pagination container
    const paginationContainer = scopeRoot.querySelector('#paginationContainer');
    if (paginationContainer) {
        paginationContainer.style.display = totalRecords > 0 ? 'flex' : 'none';
    }
}

// Update page numbers
function updatePageNumbers() {
    const pageNumbersContainer = scopeRoot.querySelector('#pageNumbers');
    if (!pageNumbersContainer) return;
    
    const totalPages = getTotalPages();
    pageNumbersContainer.innerHTML = '';
    
    if (totalPages <= 7) {
        // Show all pages if 7 or fewer
        for (let i = 1; i <= totalPages; i++) {
            addPageNumber(i);
        }
    } else {
        // Show first page
        addPageNumber(1);
        
        if (currentPage > 4) {
            addEllipsis();
        }
        
        // Show pages around current page
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        
        for (let i = start; i <= end; i++) {
            if (i !== 1 && i !== totalPages) {
                addPageNumber(i);
            }
        }
        
        if (currentPage < totalPages - 3) {
            addEllipsis();
        }
        
        // Show last page
        if (totalPages > 1) {
            addPageNumber(totalPages);
        }
    }
}

// Add page number button
function addPageNumber(page) {
    const pageNumbersContainer = scopeRoot.querySelector('#pageNumbers');
    const button = document.createElement('button');
    button.className = `page-number ${page === currentPage ? 'active' : ''}`;
    button.textContent = page;
    button.addEventListener('click', () => goToPage(page));
    pageNumbersContainer.appendChild(button);
}

// Add ellipsis
function addEllipsis() {
    const pageNumbersContainer = scopeRoot.querySelector('#pageNumbers');
    const ellipsis = document.createElement('span');
    ellipsis.className = 'page-number ellipsis';
    ellipsis.textContent = '...';
    pageNumbersContainer.appendChild(ellipsis);
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