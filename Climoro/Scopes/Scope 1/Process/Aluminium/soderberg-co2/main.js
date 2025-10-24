// Soderberg CO2 Emissions Form - Main JavaScript
// Single-page form with real-time calculations

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
  const CYCLOHEXANE_VALUES = {
    'HSS': 4.0,
    'VSS': 0.5
  };

  // State
  let currentCompany = null;
  let units = [];
  let nextSno = 1;

  // Initialize
  async function init() {
    try {
      console.log('🚀 Initializing Soderberg CO2 form...');
      
      await fetchCurrentUser();
      await loadUnits();
      await loadHistory();
      attachEventListeners();
      setTodayDate();
      updateSno();
      
      console.log('✅ Soderberg CO2 form initialized successfully');
    } catch (error) {
      console.error('❌ Initialization error:', error);
      frappe.msgprint({
        title: 'Initialization Error',
        message: 'Failed to initialize form: ' + error.message,
        indicator: 'red'
      });
    }
  }

  // Fetch Current User and Company
  async function fetchCurrentUser() {
    try {
      const user = frappe.session.user;
      if (!user || user === 'Guest') {
        throw new Error('No active user session');
      }

      const result = await frappe.call({
        method: 'frappe.client.get_value',
        args: {
          doctype: 'User',
          filters: { name: user },
          fieldname: ['name', 'full_name']
        }
      });

      if (result && result.message) {
        // Try to get default company
        try {
          const companyResult = await frappe.call({
            method: 'frappe.client.get_value',
            args: {
              doctype: 'Global Defaults',
              filters: {},
              fieldname: 'default_company'
            }
          });
          
          if (companyResult && companyResult.message && companyResult.message.default_company) {
            currentCompany = companyResult.message.default_company;
          }
        } catch (e) {
          console.warn('Could not fetch default company, will use first available');
        }

        // Fallback: get first company
        if (!currentCompany) {
          const companies = await frappe.call({
            method: 'frappe.client.get_list',
            args: {
              doctype: 'Company',
              fields: ['name'],
              limit: 1
            }
          });
          
          if (companies && companies.message && companies.message.length > 0) {
            currentCompany = companies.message[0].name;
          }
        }

        if (!currentCompany) {
          throw new Error('No company found in the system');
        }

        console.log('Current company:', currentCompany);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // Load Units
  async function loadUnits() {
    try {
      // Only fetch 'name' field which is always available in any DocType
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
    const unitSelect = $('#entryUnit');
    if (!unitSelect) {
      console.warn('⚠️ Unit select element not found');
      return;
    }

    unitSelect.innerHTML = '<option value="">-- Unit --</option>';
    units.forEach(unit => {
      const option = document.createElement('option');
      // Use unit_name if available, otherwise use name
      const unitName = unit.unit_name || unit.name;
      option.value = unitName;
      option.textContent = unitName;
      unitSelect.appendChild(option);
    });
    
    console.log('✅ Unit dropdown populated with', units.length, 'units');
  }

  // Set Today's Date
  function setTodayDate() {
    const dateInput = $('#entryDate');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.value = today;
    }
  }

  // Update S.No
  function updateSno() {
    const snoDisplay = $('#currentSno');
    if (snoDisplay) {
      snoDisplay.textContent = nextSno;
    }
  }

  // Attach Event Listeners
  function attachEventListeners() {
    // Type selection changes cyclohexane value
    const typeSelect = $('#entryType');
    if (typeSelect) {
      typeSelect.addEventListener('change', handleTypeChange);
    }

    // All numeric inputs trigger recalculation
    const numericInputs = [
      '#entryAlWeight', '#entryPaste', '#entryBinder',
      '#entryPitchS', '#entryPitchAsh', '#entryPitchH',
      '#entryCokeS', '#entryCokeAsh', '#entryCarbonDust'
    ];

    numericInputs.forEach(selector => {
      const input = $(selector);
      if (input) {
        input.addEventListener('input', recomputeCO2);
      }
    });

    // Save button
    const saveBtn = $('#saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveEntry);
    }

    // Modal close buttons
    const closeViewModal = $('#closeViewModal');
    const closeViewModalBtn = $('#closeViewModalBtn');
    const viewModalOverlay = $('#viewModal');

    if (closeViewModal) {
      closeViewModal.addEventListener('click', () => hideModal('viewModal'));
    }
    if (closeViewModalBtn) {
      closeViewModalBtn.addEventListener('click', () => hideModal('viewModal'));
    }
    if (viewModalOverlay) {
      viewModalOverlay.addEventListener('click', (e) => {
        if (e.target === viewModalOverlay) {
          hideModal('viewModal');
        }
      });
    }

    // Prevent global shortcuts
    document.addEventListener('keydown', preventGlobalShortcuts);
  }

  // Handle Type Selection Change
  function handleTypeChange() {
    const typeSelect = $('#entryType');
    const cyclohexaneDisplay = $('#entryCyclohexane');
    
    if (!typeSelect || !cyclohexaneDisplay) return;

    const selectedType = typeSelect.value;
    if (selectedType && CYCLOHEXANE_VALUES[selectedType] !== undefined) {
      cyclohexaneDisplay.textContent = CYCLOHEXANE_VALUES[selectedType].toFixed(1);
    } else {
      cyclohexaneDisplay.textContent = '-';
    }

    recomputeCO2();
  }

  // Recompute CO2 Emissions
  function recomputeCO2() {
    const typeSelect = $('#entryType');
    const alWeight = parseFloat($('#entryAlWeight')?.value || 0);
    const pasteConsumption = parseFloat($('#entryPaste')?.value || 0);
    const binderPct = parseFloat($('#entryBinder')?.value || 0);
    const pitchSulphurPct = parseFloat($('#entryPitchS')?.value || 0);
    const pitchAshPct = parseFloat($('#entryPitchAsh')?.value || 0);
    const pitchHydrogenPct = parseFloat($('#entryPitchH')?.value || 0);
    const cokeSulphurPct = parseFloat($('#entryCokeS')?.value || 0);
    const cokeAshPct = parseFloat($('#entryCokeAsh')?.value || 0);
    const carbonDust = parseFloat($('#entryCarbonDust')?.value || 0);

    const selectedType = typeSelect?.value;
    const cyclohexane = selectedType ? (CYCLOHEXANE_VALUES[selectedType] || 0) : 0;

    // Convert percentages to fractions
    const binderFraction = binderPct / 100;
    const pitchSulphurFraction = pitchSulphurPct / 100;
    const pitchAshFraction = pitchAshPct / 100;
    const pitchHydrogenFraction = pitchHydrogenPct / 100;
    const cokeSulphurFraction = cokeSulphurPct / 100;
    const cokeAshFraction = cokeAshPct / 100;

    // Formula from image:
    // E_CO2 = [(MP × PC) - (CSM × MP/1000) 
    //         - [(BC/100) × PC × MP × (Sp + Ashp + Hp)/100]
    //         - [((100-BC)/100) × PC × MP × (Sc + Ashc)/100]
    //         - (MP × CD)] × 44/12

    const MP = alWeight;
    const PC = pasteConsumption;
    const CSM = cyclohexane;
    
    const part1 = (MP * PC) - (CSM * MP / 1000);
    const part2 = binderFraction * PC * MP * (pitchSulphurFraction + pitchAshFraction + pitchHydrogenFraction);
    const part3 = (1 - binderFraction) * PC * MP * (cokeSulphurFraction + cokeAshFraction);
    const part4 = MP * carbonDust;

    const co2Emissions = (part1 - part2 - part3 - part4) * CO2_CONVERSION;

    const co2Display = $('#entryCO2');
    if (co2Display) {
      co2Display.textContent = (co2Emissions > 0 ? co2Emissions : 0).toFixed(2);
    }
  }

  // Validate Entry
  function validateEntry() {
    const date = $('#entryDate')?.value;
    const unit = $('#entryUnit')?.value;
    const type = $('#entryType')?.value;
    const alWeight = parseFloat($('#entryAlWeight')?.value || 0);
    const pasteConsumption = parseFloat($('#entryPaste')?.value || 0);
    const binderContent = parseFloat($('#entryBinder')?.value || 0);
    const pitchSulphur = parseFloat($('#entryPitchS')?.value || 0);
    const pitchAsh = parseFloat($('#entryPitchAsh')?.value || 0);
    const pitchHydrogen = parseFloat($('#entryPitchH')?.value || 0);
    const cokeSulphur = parseFloat($('#entryCokeS')?.value || 0);
    const cokeAsh = parseFloat($('#entryCokeAsh')?.value || 0);
    const carbonDust = parseFloat($('#entryCarbonDust')?.value || 0);

    if (!date) {
      frappe.msgprint('Please select a date');
      return false;
    }

    if (!unit) {
      frappe.msgprint('Please select a unit');
      return false;
    }

    if (!type) {
      frappe.msgprint('Please select a type (HSS or VSS)');
      return false;
    }

    if (alWeight <= 0) {
      frappe.msgprint('Weight of Aluminium Produced must be greater than 0');
      return false;
    }

    if (pasteConsumption <= 0) {
      frappe.msgprint('Paste Consumption must be greater than 0');
      return false;
    }

    if (binderContent < 0 || binderContent > 100) {
      frappe.msgprint('Binder Content must be between 0 and 100%');
      return false;
    }

    if (pitchSulphur < 0 || pitchSulphur > 100) {
      frappe.msgprint('Pitch Sulphur Content must be between 0 and 100%');
      return false;
    }

    if (pitchAsh < 0 || pitchAsh > 100) {
      frappe.msgprint('Pitch Ash Content must be between 0 and 100%');
      return false;
    }

    if (pitchHydrogen < 0 || pitchHydrogen > 100) {
      frappe.msgprint('Pitch Hydrogen Content must be between 0 and 100%');
      return false;
    }

    if (cokeSulphur < 0 || cokeSulphur > 100) {
      frappe.msgprint('Coke Sulphur Content must be between 0 and 100%');
      return false;
    }

    if (cokeAsh < 0 || cokeAsh > 100) {
      frappe.msgprint('Coke Ash Content must be between 0 and 100%');
      return false;
    }

    if (carbonDust < 0) {
      frappe.msgprint('Carbon Dust must be greater than or equal to 0');
      return false;
    }

    return true;
  }

  // Save Entry
  async function saveEntry() {
    if (!validateEntry()) {
      return;
    }

    const saveBtn = $('#saveBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    try {
      const date = $('#entryDate').value;
      const unit = $('#entryUnit').value;
      const type = $('#entryType').value;
      const alWeight = parseFloat($('#entryAlWeight').value);
      const pasteConsumption = parseFloat($('#entryPaste').value);
      const cyclohexane = CYCLOHEXANE_VALUES[type];
      const binderContent = parseFloat($('#entryBinder').value);
      const pitchSulphur = parseFloat($('#entryPitchS').value);
      const pitchAsh = parseFloat($('#entryPitchAsh').value);
      const pitchHydrogen = parseFloat($('#entryPitchH').value);
      const cokeSulphur = parseFloat($('#entryCokeS').value);
      const cokeAsh = parseFloat($('#entryCokeAsh').value);
      const carbonDust = parseFloat($('#entryCarbonDust').value);
      const co2Emissions = parseFloat($('#entryCO2').textContent);

      const result = await frappe.call({
        method: 'frappe.client.insert',
        args: {
          doc: {
            doctype: 'Soderberg CO2 Emissions',
            date: date,
            company: currentCompany,
            unit: unit,
            type_line: type,
            al_weight_t: alWeight,
            paste_consumption: pasteConsumption,
            cyclohexane_kg_per_t: cyclohexane,
            binder_content_pct: binderContent,
            pitch_sulphur_pct: pitchSulphur,
            pitch_ash_pct: pitchAsh,
            pitch_hydrogen_pct: pitchHydrogen,
            coke_sulphur_pct: cokeSulphur,
            coke_ash_pct: cokeAsh,
            carbon_dust: carbonDust,
            co2_emissions_t: co2Emissions
          }
        }
      });

      if (result && result.message) {
        frappe.msgprint({
          title: 'Success',
          message: 'Entry saved successfully!',
          indicator: 'green'
        });

        resetForm();
        await loadHistory();
      }
    } catch (error) {
      console.error('Save error:', error);
      frappe.msgprint({
        title: 'Error',
        message: 'Failed to save entry: ' + error.message,
        indicator: 'red'
      });
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v7.293l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L7.5 9.293V2a2 2 0 0 1 2-2H14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h2.5a.5.5 0 0 1 0 1H2z"/>
          </svg>
          Save Entry
        `;
      }
    }
  }

  // Reset Form
  function resetForm() {
    $('#entryType').value = '';
    $('#entryAlWeight').value = '';
    $('#entryPaste').value = '';
    $('#entryBinder').value = '';
    $('#entryPitchS').value = '';
    $('#entryPitchAsh').value = '';
    $('#entryPitchH').value = '';
    $('#entryCokeS').value = '';
    $('#entryCokeAsh').value = '';
    $('#entryCarbonDust').value = '';
    $('#entryCyclohexane').textContent = '-';
    $('#entryCO2').textContent = '0.00';
    
    setTodayDate();
    nextSno++;
    updateSno();
  }

  // Load History
  async function loadHistory() {
    try {
      const result = await frappe.call({
        method: 'frappe.client.get_list',
        args: {
          doctype: 'Soderberg CO2 Emissions',
          filters: { company: currentCompany },
          fields: ['name', 'date', 'unit', 'type_line', 'al_weight_t', 'paste_consumption', 'cyclohexane_kg_per_t', 'binder_content_pct', 'pitch_sulphur_pct', 'pitch_ash_pct', 'pitch_hydrogen_pct', 'coke_sulphur_pct', 'coke_ash_pct', 'carbon_dust', 'co2_emissions_t'],
          order_by: 'date desc, creation desc',
          limit_page_length: 0
        }
      });

      if (result && result.message) {
        const entries = result.message;
        nextSno = entries.length + 1;
        updateSno();
        displayHistory(entries);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  // Display History inline under the entry row (same table)
  function displayHistory(entries) {
    const tbody = $('#historyRowsBody');
    if (!tbody) return;

    if (entries.length === 0) {
      tbody.innerHTML = `
        <tr class="no-history-row">
          <td colspan="16" style="text-align: center; padding: 1.25rem; color: #64748b;">
            <em>No entries yet. Add your first entry above.</em>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = entries.map((entry, index) => `
      <tr class="history-inline-row">
        <td style="text-align:center;">${entries.length - index}</td>
        <td>${formatDate(entry.date)}</td>
        <td>${entry.unit || '-'}</td>
        <td>${entry.type_line || '-'}</td>
        <td>${num(entry.al_weight_t)}</td>
        <td>${num(entry.paste_consumption)}</td>
        <td>${num(entry.cyclohexane_kg_per_t)}</td>
        <td>${pct(entry.binder_content_pct)}</td>
        <td>${pct(entry.pitch_sulphur_pct)}</td>
        <td>${pct(entry.pitch_ash_pct)}</td>
        <td>${pct(entry.pitch_hydrogen_pct)}</td>
        <td>${pct(entry.coke_sulphur_pct)}</td>
        <td>${pct(entry.coke_ash_pct)}</td>
        <td>${num(entry.carbon_dust)}</td>
        <td style=" font-weight:600;">${num(entry.co2_emissions_t)}</td>
        <td style="text-align:center;">
          <button class="btn btn-danger" onclick="deleteEntry_${root_element.id || 'soderberg'}('${entry.name}')">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  // Format Date
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Formatting helpers for inline history
  function num(value) {
    const n = parseFloat(value);
    if (isNaN(n)) return '-';
    return n.toFixed(2);
  }
  function pct(value) {
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
          doctype: 'Soderberg CO2 Emissions',
          name: entryName
        }
      });

      if (result && result.message) {
        const entry = result.message;
        displayEntryModal(entry);
      }
    } catch (error) {
      console.error('Error fetching entry:', error);
      frappe.msgprint('Failed to load entry details');
    }
  }

  // Display Entry Modal
  function displayEntryModal(entry) {
    const modalBody = $('#viewModalBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div class="modal-section">
        <h4 class="modal-section-title">Basic Information</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Date</div>
            <div class="detail-value">${formatDate(entry.date)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Unit</div>
            <div class="detail-value">${entry.unit || '-'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Type of Soderberg Line</div>
            <div class="detail-value">${entry.type_line || '-'}</div>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Production Data</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Weight of Aluminium Produced (t Al)</div>
            <div class="detail-value">${entry.al_weight_t?.toFixed(2) || '0.00'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Paste Consumption (t paste/t Al)</div>
            <div class="detail-value">${entry.paste_consumption?.toFixed(4) || '0.0000'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Cyclohexane Emissions (kg/t Al)</div>
            <div class="detail-value">${entry.cyclohexane_kg_per_t?.toFixed(1) || '0.0'}</div>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Paste Composition</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Binder Content (%)</div>
            <div class="detail-value">${entry.binder_content_pct?.toFixed(2) || '0.00'}</div>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Pitch Properties (wt %)</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Sulphur Content</div>
            <div class="detail-value">${entry.pitch_sulphur_pct?.toFixed(2) || '0.00'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Ash Content</div>
            <div class="detail-value">${entry.pitch_ash_pct?.toFixed(2) || '0.00'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Hydrogen Content</div>
            <div class="detail-value">${entry.pitch_hydrogen_pct?.toFixed(2) || '0.00'}</div>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Calcined Coke Properties (wt %)</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Sulphur Content</div>
            <div class="detail-value">${entry.coke_sulphur_pct?.toFixed(2) || '0.00'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Ash Content</div>
            <div class="detail-value">${entry.coke_ash_pct?.toFixed(2) || '0.00'}</div>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Carbon Dust</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Carbon Dust from Soderberg Anode (t dust/t Al)</div>
            <div class="detail-value">${entry.carbon_dust?.toFixed(4) || '0.0000'}</div>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <h4 class="modal-section-title">Emissions</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">CO2 Emissions (t CO2)</div>
            <div class="detail-value highlight">${entry.co2_emissions_t?.toFixed(2) || '0.00'}</div>
          </div>
        </div>
      </div>
    `;

    showModal('viewModal');
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
              doctype: 'Soderberg CO2 Emissions',
              name: entryName
            }
          });

          frappe.msgprint({
            title: 'Deleted',
            message: 'Entry deleted successfully',
            indicator: 'green'
          });

          await loadHistory();
        } catch (error) {
          console.error('Delete error:', error);
          frappe.msgprint({
            title: 'Error',
            message: 'Failed to delete entry',
            indicator: 'red'
          });
        }
      }
    );
  }

  // Show Modal
  function showModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  // Hide Modal
  function hideModal(modalId) {
    const modal = $(`#${modalId}`);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Prevent Global Shortcuts
  function preventGlobalShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
      const target = e.target;
      if (target && root_element.contains(target)) {
        e.preventDefault();
      }
    }
  }

  // Expose functions to global scope for onclick handlers
  const uniqueId = root_element.id || 'soderberg';
  window[`deleteEntry_${uniqueId}`] = deleteEntry;

  // Initialize immediately - Frappe's custom block ensures DOM is ready
  init();

})(root_element);

