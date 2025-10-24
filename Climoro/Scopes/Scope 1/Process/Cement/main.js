(function(){
    const scopeRoot = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
    let currentStep = 1;
    const totalSteps = 3;

    function init(){
        setupStepNavigation();
        setupAutoCalculations();
        setupFormValidation();
        setupHistoryTable();
        loadCompanies();
        loadExisting();
        updateStepDisplay();
        loadHistory();
    }

    function setupStepNavigation(){
        const stepItems = scopeRoot.querySelectorAll('.step-item');
        const stepContents = scopeRoot.querySelectorAll('.step-content');
        const prevBtn = scopeRoot.querySelector('#prevBtn');
        const nextBtn = scopeRoot.querySelector('#nextBtn');
        const submitBtn = scopeRoot.querySelector('#submitBtn');

        // Step indicator clicks
        stepItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                const stepNumber = index + 1;
                if (stepNumber <= currentStep || isStepCompleted(stepNumber - 1)) {
                    goToStep(stepNumber);
                }
            });
        });

        // Navigation buttons
        if (prevBtn) {
            prevBtn.addEventListener('click', () => changeStep(-1));
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => changeStep(1));
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', handleSubmit);
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && currentStep > 1) {
                changeStep(-1);
            } else if (e.key === 'ArrowRight' && currentStep < totalSteps) {
                changeStep(1);
            }
        });
    }

    function changeStep(direction) {
        if (direction === 1) {
            // Moving forward - validate current step
            if (!validateCurrentStep()) {
                return;
            }
            if (currentStep < totalSteps) {
                currentStep++;
            }
        } else {
            // Moving backward
            if (currentStep > 1) {
                currentStep--;
            }
        }
        
        updateStepDisplay();
    }

    function goToStep(stepNumber) {
        if (stepNumber >= 1 && stepNumber <= totalSteps) {
            currentStep = stepNumber;
            updateStepDisplay();
        }
    }

    function updateStepDisplay() {
        const stepItems = scopeRoot.querySelectorAll('.step-item');
        const stepContents = scopeRoot.querySelectorAll('.step-content');
        const prevBtn = scopeRoot.querySelector('#prevBtn');
        const nextBtn = scopeRoot.querySelector('#nextBtn');
        const submitBtn = scopeRoot.querySelector('#submitBtn');

        // Update step indicators
        stepItems.forEach((item, index) => {
            const stepNumber = index + 1;
            item.classList.remove('active', 'completed');
            
            if (stepNumber === currentStep) {
                item.classList.add('active');
            } else if (stepNumber < currentStep) {
                item.classList.add('completed');
            }
        });

        // Update step content
        stepContents.forEach((content, index) => {
            const stepNumber = index + 1;
            content.classList.remove('active');
            
            if (stepNumber === currentStep) {
                content.classList.add('active');
            }
        });

        // Update navigation buttons
        if (prevBtn) {
            prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';
        }
        
        if (nextBtn) {
            nextBtn.style.display = currentStep === totalSteps ? 'none' : 'inline-flex';
        }
        
        if (submitBtn) {
            submitBtn.style.display = currentStep === totalSteps ? 'inline-flex' : 'none';
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function validateCurrentStep() {
        const currentStepElement = scopeRoot.querySelector(`#step${currentStep}`);
        if (!currentStepElement) return true;

        const requiredFields = currentStepElement.querySelectorAll('input[required], select[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    function validateField(field) {
        const value = field.value.trim();
        const isValid = value !== '';

        if (isValid) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
            clearFieldError(field);
        } else {
            field.classList.remove('is-valid');
            field.classList.add('is-invalid');
            showFieldError(field, 'This field is required');
        }

        return isValid;
    }

    function showFieldError(field, message) {
        clearFieldError(field);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }

    function clearFieldError(field) {
        const errorDiv = field.parentNode.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    function setupAutoCalculations() {
        // Clinker calculations
        const clinkerFields = ['clinker_production', 'clinker_bought', 'clinker_sold', 'change_in_clinker_stocks'];
        clinkerFields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateClinkerTotal);
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
        const co2RawMaterialFields = ['calcination_emission_factor_35a', 'organic_carbon_content_35b', 'raw_meal_clinker_ratio_35c', 'clinker_production', 'bypass_dust_leaving_kiln_system', 'ckd_leaving_kiln_system', 'ckd_returned_to_kiln'];
        co2RawMaterialFields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateCO2FromRawMaterials);
            }
        });


        // Clinker composition calculations
        const clinker1Fields = ['clinker1_produced', 'clinker1_cao_content', 'clinker1_mgo_content'];
        clinker1Fields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateClinker1Amounts);
            }
        });

        const clinker2Fields = ['clinker2_produced', 'clinker2_cao_content', 'clinker2_mgo_content'];
        clinker2Fields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateClinker2Amounts);
            }
        });

        // Raw material calculations
        const rawMaterial1Fields = ['raw_material1_consumed', 'raw_material1_cao_content', 'raw_material1_mgo_content'];
        rawMaterial1Fields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateRawMaterial1Amounts);
            }
        });

        const rawMaterial2Fields = ['raw_material2_consumed', 'raw_material2_cao_content', 'raw_material2_mgo_content'];
        rawMaterial2Fields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateRawMaterial2Amounts);
            }
        });

        // Total CO2 calculations
        const totalCO2Fields = ['total_co2_from_raw_materials', 'total_co2_from_fossil_kiln_fuels', 'total_co2_from_non_kiln_fuels', 'power_external_consumption', 'power_external_co2_per_unit', 'clinker_bought', 'clinker_sold', 'emission_factor_bought_clinker'];
        totalCO2Fields.forEach(field => {
            const element = scopeRoot.querySelector(`#${field}`);
            if (element) {
                element.addEventListener('input', calculateTotalCO2);
            }
        });

    }

    function setupFormValidation() {
        // Real-time validation
        const requiredFields = scopeRoot.querySelectorAll('input[required], select[required]');
        requiredFields.forEach(field => {
            field.addEventListener('blur', () => validateField(field));
            field.addEventListener('input', () => clearFieldError(field));
        });
    }

    // Company and Unit Management
    function loadCompanies() {
        const companySelect = scopeRoot.querySelector('#company');
        if (!companySelect) return;

        // Use frappe.call method like in unified_calculator.js
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

        // Use frappe.call method like in unified_calculator.js
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


    // Auto-calculation methods
    function calculateClinkerTotal() {
        const production = parseFloat(scopeRoot.querySelector('#clinker_production')?.value) || 0;
        const bought = parseFloat(scopeRoot.querySelector('#clinker_bought')?.value) || 0;
        const sold = parseFloat(scopeRoot.querySelector('#clinker_sold')?.value) || 0;
        const stockChange = parseFloat(scopeRoot.querySelector('#change_in_clinker_stocks')?.value) || 0;

        const total = production + bought - sold - stockChange;
        const totalField = scopeRoot.querySelector('#total_clinker_consumed');
        if (totalField) {
            totalField.value = total.toFixed(2);
        }
    }

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

    function calculateSubstitutesTotal() {
        const pureSlag = parseFloat(scopeRoot.querySelector('#mic_consumed_pure_slag_cement')?.value) || 0;
        const directSales = parseFloat(scopeRoot.querySelector('#mic_fly_ash_pozzolana_direct_sales')?.value) || 0;

        const total = pureSlag + directSales;
        const totalField = scopeRoot.querySelector('#total_pure_mic_products_substitutes');
        if (totalField) {
            totalField.value = total.toFixed(2);
        }
    }


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

        // Debug logging
        console.log('Production Totals Calculation:');
        console.log('Line 8 (Clinker Production):', clinkerProduction);
        console.log('Line 9 (Clinker Bought):', clinkerBought);
        console.log('Line 10 (Clinker Sold):', clinkerSold);
        console.log('Line 10a (Stock Change):', clinkerStockChange);
        console.log('Line 11 (Total Clinker Consumed):', totalClinkerConsumed);
        console.log('Line 18 (MIC Consumed):', micConsumed);
        console.log('Line 19 (Substitutes):', substitutes);

        // Line 20: Total Portland + Blended cements = Line11 + Line18
        const portlandBlended = totalClinkerConsumed + micConsumed;
        console.log('Line 20 (Portland/Blended):', portlandBlended);
        const portlandField = scopeRoot.querySelector('#total_portland_blended_cements');
        if (portlandField) {
            portlandField.value = portlandBlended.toFixed(2);
        }

        // Line 21: Total cements + substitutes = Line11 + Line18 + Line19
        const totalCements = totalClinkerConsumed + micConsumed + substitutes;
        console.log('Line 21 (Total Cements):', totalCements);
        const totalCementsField = scopeRoot.querySelector('#total_cements_substitutes_portland_blended_slag');
        if (totalCementsField) {
            totalCementsField.value = totalCements.toFixed(2);
        }

        // Line 21a: Total cementitious products = Line8 + Line18 + Line19
        const totalCementitious = clinkerProduction + micConsumed + substitutes;
        console.log('Line 21a (Cementitious):', totalCementitious);
        const cementitiousField = scopeRoot.querySelector('#total_cementitious_products');
        if (cementitiousField) {
            cementitiousField.value = totalCementitious.toFixed(2);
        }
    }

    // Clinker composition calculation methods
    function calculateClinker1Amounts() {
        const produced = parseFloat(scopeRoot.querySelector('#clinker1_produced')?.value) || 0;
        const caoContent = parseFloat(scopeRoot.querySelector('#clinker1_cao_content')?.value) || 0;
        const mgoContent = parseFloat(scopeRoot.querySelector('#clinker1_mgo_content')?.value) || 0;

        const caoAmount = (produced * caoContent) / 100;
        const mgoAmount = (produced * mgoContent) / 100;

        const caoField = scopeRoot.querySelector('#clinker1_cao_amount');
        const mgoField = scopeRoot.querySelector('#clinker1_mgo_amount');
        
        if (caoField) caoField.value = caoAmount.toFixed(2);
        if (mgoField) mgoField.value = mgoAmount.toFixed(2);

        calculateClinkerTotals();
    }

    function calculateClinker2Amounts() {
        const produced = parseFloat(scopeRoot.querySelector('#clinker2_produced')?.value) || 0;
        const caoContent = parseFloat(scopeRoot.querySelector('#clinker2_cao_content')?.value) || 0;
        const mgoContent = parseFloat(scopeRoot.querySelector('#clinker2_mgo_content')?.value) || 0;

        const caoAmount = (produced * caoContent) / 100;
        const mgoAmount = (produced * mgoContent) / 100;

        const caoField = scopeRoot.querySelector('#clinker2_cao_amount');
        const mgoField = scopeRoot.querySelector('#clinker2_mgo_amount');
        
        if (caoField) caoField.value = caoAmount.toFixed(2);
        if (mgoField) mgoField.value = mgoAmount.toFixed(2);

        calculateClinkerTotals();
    }

    function calculateClinkerTotals() {
        const clinker1Produced = parseFloat(scopeRoot.querySelector('#clinker1_produced')?.value) || 0;
        const clinker2Produced = parseFloat(scopeRoot.querySelector('#clinker2_produced')?.value) || 0;
        const clinker1CaoAmount = parseFloat(scopeRoot.querySelector('#clinker1_cao_amount')?.value) || 0;
        const clinker2CaoAmount = parseFloat(scopeRoot.querySelector('#clinker2_cao_amount')?.value) || 0;
        const clinker1MgoAmount = parseFloat(scopeRoot.querySelector('#clinker1_mgo_amount')?.value) || 0;
        const clinker2MgoAmount = parseFloat(scopeRoot.querySelector('#clinker2_mgo_amount')?.value) || 0;

        const totalProduced = clinker1Produced + clinker2Produced;
        const totalCaoAmount = clinker1CaoAmount + clinker2CaoAmount;
        const totalMgoAmount = clinker1MgoAmount + clinker2MgoAmount;

        const averageCaoContent = totalProduced > 0 ? (totalCaoAmount / totalProduced) * 100 : 0;
        const averageMgoContent = totalProduced > 0 ? (totalMgoAmount / totalProduced) * 100 : 0;

        const totalProducedField = scopeRoot.querySelector('#total_clinker_produced_composition');
        const averageCaoField = scopeRoot.querySelector('#average_cao_content');
        const averageMgoField = scopeRoot.querySelector('#average_mgo_content');
        const totalCaoField = scopeRoot.querySelector('#total_cao_amount');
        const totalMgoField = scopeRoot.querySelector('#total_mgo_amount');

        if (totalProducedField) totalProducedField.value = totalProduced.toFixed(2);
        if (averageCaoField) averageCaoField.value = averageCaoContent.toFixed(2);
        if (averageMgoField) averageMgoField.value = averageMgoContent.toFixed(2);
        if (totalCaoField) totalCaoField.value = totalCaoAmount.toFixed(2);
        if (totalMgoField) totalMgoField.value = totalMgoAmount.toFixed(2);

        calculateCO2FromCalcination();
    }

    // Raw material calculation methods
    function calculateRawMaterial1Amounts() {
        const consumed = parseFloat(scopeRoot.querySelector('#raw_material1_consumed')?.value) || 0;
        const caoContent = parseFloat(scopeRoot.querySelector('#raw_material1_cao_content')?.value) || 0;
        const mgoContent = parseFloat(scopeRoot.querySelector('#raw_material1_mgo_content')?.value) || 0;

        const caoAmount = (consumed * caoContent) / 100;
        const mgoAmount = (consumed * mgoContent) / 100;

        const caoField = scopeRoot.querySelector('#raw_material1_cao_amount');
        const mgoField = scopeRoot.querySelector('#raw_material1_mgo_amount');
        
        if (caoField) caoField.value = caoAmount.toFixed(2);
        if (mgoField) mgoField.value = mgoAmount.toFixed(2);

        calculateRawMaterialTotals();
    }

    function calculateRawMaterial2Amounts() {
        const consumed = parseFloat(scopeRoot.querySelector('#raw_material2_consumed')?.value) || 0;
        const caoContent = parseFloat(scopeRoot.querySelector('#raw_material2_cao_content')?.value) || 0;
        const mgoContent = parseFloat(scopeRoot.querySelector('#raw_material2_mgo_content')?.value) || 0;

        const caoAmount = (consumed * caoContent) / 100;
        const mgoAmount = (consumed * mgoContent) / 100;

        const caoField = scopeRoot.querySelector('#raw_material2_cao_amount');
        const mgoField = scopeRoot.querySelector('#raw_material2_mgo_amount');
        
        if (caoField) caoField.value = caoAmount.toFixed(2);
        if (mgoField) mgoField.value = mgoAmount.toFixed(2);

        calculateRawMaterialTotals();
    }

    function calculateRawMaterialTotals() {
        const material1Consumed = parseFloat(scopeRoot.querySelector('#raw_material1_consumed')?.value) || 0;
        const material2Consumed = parseFloat(scopeRoot.querySelector('#raw_material2_consumed')?.value) || 0;
        const material1CaoAmount = parseFloat(scopeRoot.querySelector('#raw_material1_cao_amount')?.value) || 0;
        const material2CaoAmount = parseFloat(scopeRoot.querySelector('#raw_material2_cao_amount')?.value) || 0;
        const material1MgoAmount = parseFloat(scopeRoot.querySelector('#raw_material1_mgo_amount')?.value) || 0;
        const material2MgoAmount = parseFloat(scopeRoot.querySelector('#raw_material2_mgo_amount')?.value) || 0;

        const totalConsumed = material1Consumed + material2Consumed;
        const totalCaoAmount = material1CaoAmount + material2CaoAmount;
        const totalMgoAmount = material1MgoAmount + material2MgoAmount;

        const averageCaoContent = totalConsumed > 0 ? (totalCaoAmount / totalConsumed) * 100 : 0;
        const averageMgoContent = totalConsumed > 0 ? (totalMgoAmount / totalConsumed) * 100 : 0;

        const totalConsumedField = scopeRoot.querySelector('#total_raw_material_consumed');
        const averageCaoField = scopeRoot.querySelector('#average_raw_material_cao_content');
        const averageMgoField = scopeRoot.querySelector('#average_raw_material_mgo_content');
        const totalCaoField = scopeRoot.querySelector('#total_raw_material_cao_amount');
        const totalMgoField = scopeRoot.querySelector('#total_raw_material_mgo_amount');

        if (totalConsumedField) totalConsumedField.value = totalConsumed.toFixed(2);
        if (averageCaoField) averageCaoField.value = averageCaoContent.toFixed(2);
        if (averageMgoField) averageMgoField.value = averageMgoContent.toFixed(2);
        if (totalCaoField) totalCaoField.value = totalCaoAmount.toFixed(2);
        if (totalMgoField) totalMgoField.value = totalMgoAmount.toFixed(2);

        calculateCO2FromCalcination();
    }

    function calculateCO2FromCalcination() {
        const totalCaoAmount = parseFloat(scopeRoot.querySelector('#total_cao_amount')?.value) || 0;
        const totalMgoAmount = parseFloat(scopeRoot.querySelector('#total_mgo_amount')?.value) || 0;
        const totalRawMaterialCaoAmount = parseFloat(scopeRoot.querySelector('#total_raw_material_cao_amount')?.value) || 0;
        const totalRawMaterialMgoAmount = parseFloat(scopeRoot.querySelector('#total_raw_material_mgo_amount')?.value) || 0;
        const totalClinkerProduced = parseFloat(scopeRoot.querySelector('#total_clinker_produced_composition')?.value) || 0;

        // CO2 emission factors: CaO = 0.784, MgO = 1.092
        const caoEmissionFactor = 0.784;
        const mgoEmissionFactor = 1.092;

        // Uncorrected CO2 emissions (Line 81)
        const uncorrectedCO2 = (totalCaoAmount * caoEmissionFactor) + (totalMgoAmount * mgoEmissionFactor);

        // Correction for non-carbonate sources (Line 82)
        const correctionCO2 = (totalRawMaterialCaoAmount * caoEmissionFactor) + (totalRawMaterialMgoAmount * mgoEmissionFactor);

        // Corrected CO2 emissions (Line 83)
        const correctedCO2 = uncorrectedCO2 - correctionCO2;

        // Calcination factors
        const uncorrectedFactor = totalClinkerProduced > 0 ? (uncorrectedCO2 / totalClinkerProduced) * 1000 : 0;
        const correctedFactor = totalClinkerProduced > 0 ? (correctedCO2 / totalClinkerProduced) * 1000 : 0;

        const uncorrectedField = scopeRoot.querySelector('#uncorrected_co2_emissions');
        const correctionField = scopeRoot.querySelector('#correction_non_carbonate_sources');
        const correctedField = scopeRoot.querySelector('#corrected_direct_co2_emissions');
        const uncorrectedFactorField = scopeRoot.querySelector('#calcination_factor_uncorrected');
        const correctedFactorField = scopeRoot.querySelector('#calcination_factor_corrected');

        if (uncorrectedField) uncorrectedField.value = uncorrectedCO2.toFixed(2);
        if (correctionField) correctionField.value = correctionCO2.toFixed(2);
        if (correctedField) correctedField.value = correctedCO2.toFixed(2);
        if (uncorrectedFactorField) uncorrectedFactorField.value = uncorrectedFactor.toFixed(2);
        if (correctedFactorField) correctedFactorField.value = correctedFactor.toFixed(2);
    }

    // CO2 calculation methods
    function calculateCO2FromRawMaterials() {
        // Line 35a: Calcination emission factor (kg CO2/t clinker)
        const calcinationFactor = parseFloat(scopeRoot.querySelector('#calcination_emission_factor_35a')?.value) || 0;
        
        // Line 35b: Organic carbon content of raw meal (%)
        const organicCarbon = parseFloat(scopeRoot.querySelector('#organic_carbon_content_35b')?.value) || 0;
        
        // Line 35c: Raw meal : clinker ratio
        const rawMealRatio = parseFloat(scopeRoot.querySelector('#raw_meal_clinker_ratio_35c')?.value) || 0;
        
        // Line 8: Clinker production (from Step 2)
        const clinkerProduction = parseFloat(scopeRoot.querySelector('#clinker_production')?.value) || 0;
        
        // Line 22: Bypass dust leaving kiln system (from Step 2)
        const bypassDust = parseFloat(scopeRoot.querySelector('#bypass_dust_leaving_kiln_system')?.value) || 0;
        
        // Line 23: CKD leaving kiln system (from Step 2)
        const ckdLeaving = parseFloat(scopeRoot.querySelector('#ckd_leaving_kiln_system')?.value) || 0;
        
        // Line 24: CKD returned to kiln (from Step 2)
        const ckdReturned = parseFloat(scopeRoot.querySelector('#ckd_returned_to_kiln')?.value) || 0;
        
        // Line 35d: Raw meal consumption = 35c * Line 8
        const rawMealConsumption = rawMealRatio * clinkerProduction;
        const rawMealField = scopeRoot.querySelector('#raw_meal_consumption_35d');
        if (rawMealField) {
            rawMealField.value = rawMealConsumption.toFixed(2);
        }
        
        // Line 36: CO2 from calcination of clinker = (35a / 1000) * Line 8
        const co2FromClinker = (calcinationFactor / 1000) * clinkerProduction;
        const clinkerCO2Field = scopeRoot.querySelector('#co2_from_calcination_clinker_36');
        if (clinkerCO2Field) {
            clinkerCO2Field.value = co2FromClinker.toFixed(2);
        }
        
        // Line 37: CO2 from calcination of bypass dust = (35a / 1000) * Line 22
        const co2FromBypassDust = (calcinationFactor / 1000) * bypassDust;
        const bypassDustCO2Field = scopeRoot.querySelector('#co2_from_calcination_bypass_dust_37');
        if (bypassDustCO2Field) {
            bypassDustCO2Field.value = co2FromBypassDust.toFixed(2);
        }
        
        // Line 38a: CO2 from calcination of CKD = Line 23 * non-linear function
        // For now, using a simplified calculation: CKD * calcination factor / 1000
        const co2FromCKD = (ckdLeaving * calcinationFactor) / 1000;
        const ckdCO2Field = scopeRoot.querySelector('#co2_from_calcination_ckd_38a');
        if (ckdCO2Field) {
            ckdCO2Field.value = co2FromCKD.toFixed(2);
        }
        
        // Line 38b: CO2 from organic carbon = 35b * 35d * 3.664
        const co2FromOrganicCarbon = organicCarbon * rawMealConsumption * 3.664;
        const organicCarbonCO2Field = scopeRoot.querySelector('#co2_from_organic_carbon_38b');
        if (organicCarbonCO2Field) {
            organicCarbonCO2Field.value = co2FromOrganicCarbon.toFixed(2);
        }
        
        // Line 39: Total CO2 from raw materials = SUM(36, 37, 38a, 38b)
        const totalCO2RawMaterials = co2FromClinker + co2FromBypassDust + co2FromCKD + co2FromOrganicCarbon;
        const totalRawField = scopeRoot.querySelector('#total_co2_from_raw_materials_39');
        if (totalRawField) {
            totalRawField.value = totalCO2RawMaterials.toFixed(2);
        }
        
        // Trigger total CO2 calculation
        calculateTotalCO2();
    }


    function calculateTotalCO2() {
        // CO2 from net clinker imports/exports
        const clinkerBought = parseFloat(scopeRoot.querySelector('#clinker_bought')?.value) || 0;
        const clinkerSold = parseFloat(scopeRoot.querySelector('#clinker_sold')?.value) || 0;
        const emissionFactor = parseFloat(scopeRoot.querySelector('#emission_factor_bought_clinker')?.value) || 0;
        const netClinker = clinkerBought - clinkerSold;
        const co2FromNetClinker = (netClinker * emissionFactor) / 1000;
        const netClinkerField = scopeRoot.querySelector('#co2_from_net_clinker_imports');
        if (netClinkerField) {
            netClinkerField.value = co2FromNetClinker.toFixed(2);
        }

        // Total indirect CO2
        const totalIndirectCO2 = co2FromNetClinker;
        const indirectField = scopeRoot.querySelector('#total_indirect_co2');
        if (indirectField) {
            indirectField.value = totalIndirectCO2.toFixed(2);
        }

        // Total direct CO2 (only raw materials now)
        const totalRawMaterials = parseFloat(scopeRoot.querySelector('#total_co2_from_raw_materials_39')?.value) || 0;
        const totalDirectCO2 = totalRawMaterials;
        const directField = scopeRoot.querySelector('#total_direct_co2_48');
        if (directField) {
            directField.value = totalDirectCO2.toFixed(2);
        }
    }


    function loadExisting() {
        // Auto-save functionality
        const inputs = scopeRoot.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', autoSave);
            input.addEventListener('change', autoSave);
        });

        // Load saved data
        const savedData = localStorage.getItem('cementProcessFormData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                Object.keys(data).forEach(key => {
                    const field = scopeRoot.querySelector(`#${key}`);
                    if (field) {
                        field.value = data[key];
                    }
                });
                
                // Recalculate all totals
                calculateClinkerTotal();
                calculateMICTotal();
                calculateSubstitutesTotal();
                calculateNonKilnTotal();
                calculatePowerTotal();
                calculateProductionTotals();
                calculateCO2FromRawMaterials();
                calculateTotalCO2();
            } catch (error) {
                console.error('Error loading saved data:', error);
            }
        }

        // Set default date to today
        const dateInput = scopeRoot.querySelector('#date_of_input');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }

    function autoSave() {
        const form = scopeRoot.querySelector('form');
        if (!form) {
            // If no form element, collect data manually from inputs
            const inputs = scopeRoot.querySelectorAll('input, select, textarea');
            const data = {};
            
            inputs.forEach(input => {
                if (input.name && input.type !== 'file') {
                    data[input.name] = input.value;
                }
            });
            
            localStorage.setItem('cementProcessFormData', JSON.stringify(data));
        } else {
            const formData = new FormData(form);
            const data = {};
            
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }

            localStorage.setItem('cementProcessFormData', JSON.stringify(data));
        }
    }

    function handleSubmit(e) {
        e.preventDefault();
        
        if (!validateAllSteps()) {
            showNotification('Please complete all required fields before submitting.', 'error');
            return;
        }

        // Show loading state
        const submitBtn = scopeRoot.querySelector('#submitBtn');
        if (submitBtn) {
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Submitting...';
            submitBtn.disabled = true;

            // Collect form data
            const formData = collectFormData();
            console.log('Form data to submit:', formData);

            // Save to history
            saveToHistory(formData);

            // Simulate API call
            setTimeout(() => {
                console.log('Form submitted successfully!');
                
                // Clear saved data
                localStorage.removeItem('cementProcessFormData');
                
                // Reset form
                resetForm();
                
                currentStep = 1;
                updateStepDisplay();
                
                // Refresh history
                loadHistory();
                
                // Reset button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                
                showNotification('Data submitted successfully!', 'success');
            }, 2000);
        }
    }

    function collectFormData() {
        const inputs = scopeRoot.querySelectorAll('input, select, textarea');
        const data = {};
        
        inputs.forEach(input => {
            if (input.name && input.type !== 'file') {
                data[input.name] = input.value;
            }
        });
        
        return data;
    }

    function resetForm() {
        const inputs = scopeRoot.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
    }

    function validateAllSteps() {
        for (let step = 1; step <= totalSteps; step++) {
            const stepElement = scopeRoot.querySelector(`#step${step}`);
            if (!stepElement) continue;
            
            const requiredFields = stepElement.querySelectorAll('input[required], select[required]');
            
            for (let field of requiredFields) {
                if (!field.value.trim()) {
                    return false;
                }
            }
        }
        return true;
    }

    function isStepCompleted(stepNumber) {
        const stepElement = scopeRoot.querySelector(`#step${stepNumber}`);
        if (!stepElement) return false;
        
        const requiredFields = stepElement.querySelectorAll('input[required], select[required]');
        for (let field of requiredFields) {
            if (!field.value.trim()) {
                return false;
            }
        }
        return true;
    }

    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // History management functions
    function setupHistoryTable() {
        const refreshBtn = scopeRoot.querySelector('#refreshHistoryBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadHistory);
        }
    }

    function saveToHistory(formData) {
        const history = getHistory();
        const newEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            date: formData.date_of_input || new Date().toISOString().split('T')[0],
            company: formData.company || 'N/A',
            companyUnit: formData.company_unit || 'N/A',
            duration: formData.duration_type || 'N/A',
            clinkerProduction: parseFloat(formData.clinker_production) || 0,
            totalDirectCO2: parseFloat(formData.total_direct_co2) || 0,
            totalIndirectCO2: parseFloat(formData.total_indirect_co2) || 0,
            data: formData
        };
        
        history.unshift(newEntry); // Add to beginning
        
        // Keep only last 50 entries
        if (history.length > 50) {
            history.splice(50);
        }
        
        localStorage.setItem('cementProcessHistory', JSON.stringify(history));
    }

    function getHistory() {
        const history = localStorage.getItem('cementProcessHistory');
        return history ? JSON.parse(history) : [];
    }

    function loadHistory() {
        const history = getHistory();
        const tbody = scopeRoot.querySelector('#historyTableBody');
        
        if (!tbody) return;
        
        if (history.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i class="fa fa-database"></i>
                        <h3>No Data Found</h3>
                        <p>No cement process data has been saved yet. Submit your first entry to see it here.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = history.map((entry, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${formatDate(entry.date)}</td>
                <td>${entry.company}</td>
                <td>${entry.companyUnit}</td>
                <td>${entry.duration}</td>
                <td>${entry.clinkerProduction.toFixed(2)} t/yr</td>
                <td>${entry.totalDirectCO2.toFixed(2)} t CO2/yr</td>
                <td>${entry.totalIndirectCO2.toFixed(2)} t CO2/yr</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-sm btn-view" onclick="viewEntry('${entry.id}')" title="View Details">
                            <i class="fa fa-eye"></i> View
                        </button>
                        <button class="btn-sm btn-edit" onclick="editEntry('${entry.id}')" title="Edit Entry">
                            <i class="fa fa-edit"></i> Edit
                        </button>
                        <button class="btn-sm btn-delete" onclick="deleteEntry('${entry.id}')" title="Delete Entry">
                            <i class="fa fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    function viewEntry(entryId) {
        const history = getHistory();
        const entry = history.find(e => e.id === entryId);
        
        if (!entry) {
            showNotification('Entry not found!', 'error');
            return;
        }
        
        // Create a modal or detailed view
        showEntryDetails(entry);
    }

    function editEntry(entryId) {
        const history = getHistory();
        const entry = history.find(e => e.id === entryId);
        
        if (!entry) {
            showNotification('Entry not found!', 'error');
            return;
        }
        
        // Populate form with entry data
        populateForm(entry.data);
        showNotification('Form populated with selected entry data', 'success');
    }

    function deleteEntry(entryId) {
        if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
            return;
        }
        
        const history = getHistory();
        const filteredHistory = history.filter(e => e.id !== entryId);
        
        localStorage.setItem('cementProcessHistory', JSON.stringify(filteredHistory));
        loadHistory();
        showNotification('Entry deleted successfully!', 'success');
    }

    function populateForm(data) {
        Object.keys(data).forEach(key => {
            const field = scopeRoot.querySelector(`#${key}`);
            if (field) {
                if (field.type === 'checkbox' || field.type === 'radio') {
                    field.checked = data[key] === 'true' || data[key] === true;
                } else {
                    field.value = data[key];
                }
            }
        });
        
        // Trigger calculations
        calculateClinkerTotal();
        calculateMICTotal();
        calculateSubstitutesTotal();
        calculateNonKilnTotal();
        calculatePowerTotal();
        calculateProductionTotals();
        calculateCO2FromRawMaterials();
        calculateTotalCO2();
        calculateClinker1Amounts();
        calculateClinker2Amounts();
        calculateRawMaterial1Amounts();
        calculateRawMaterial2Amounts();
        calculateTotalKilnHeatConsumption();
    }

    function showEntryDetails(entry) {
        // Create a detailed view modal
        const modal = document.createElement('div');
        modal.className = 'entry-details-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 80%; max-height: 80%; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #2c3e50;">Entry Details</h2>
                    <button onclick="this.closest('.entry-details-modal').remove()" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                        <i class="fa fa-times"></i> Close
                    </button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                    ${Object.entries(entry.data).map(([key, value]) => `
                        <div style="padding: 10px; background: #f8f9fa; border-radius: 4px;">
                            <strong>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong>
                            <div style="margin-top: 5px; color: #495057;">${value || 'N/A'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Export for global access
    window.cementForm = {
        changeStep: changeStep,
        goToStep: goToStep,
        currentStep: () => currentStep,
        totalSteps: () => totalSteps
    };

    // Export history functions for global access
    window.viewEntry = viewEntry;
    window.editEntry = editEntry;
    window.deleteEntry = deleteEntry;

})();