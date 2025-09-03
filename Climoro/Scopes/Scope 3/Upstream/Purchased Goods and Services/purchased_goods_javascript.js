// Immediately execute the initialization
(function() {
    // =================================================================
    // Global Variables
    // =================================================================
    let currentRowIds = {
        'supplier-specific': 1,
        'hybrid': 1,
        'average-data': 1,
        'spend-based': 1
    };
    let isInitialized = false;
    let activeTab = 'supplier-specific';
    let selectedCompany = null;
    let selectedUnit = null;
    let selectedDateFrom = null;
    let selectedDateTo = null;
    let isFilterVisible = false;
    const metaCache = {};

    async function hasField(doctype, fieldname){
        try {
            if(!metaCache[doctype]){
                const r = await frappe.call({ method: 'frappe.client.get', args: { doctype: 'DocType', name: doctype } });
                metaCache[doctype] = r.message || {};
            }
            const fields = metaCache[doctype].fields || [];
            return fields.some(f=> f.fieldname === fieldname);
        } catch(e){ return false; }
    }

    // Predefined categories and units for dropdowns
    const goodServiceCategories = [
        'Raw Materials', 'Packaging Materials', 'Office Supplies', 'IT Equipment',
        'Machinery & Equipment', 'Transportation Services', 'Professional Services',
        'Utilities', 'Food & Beverages', 'Cleaning Supplies', 'Other'
    ];

    const unitsOfMeasurement = [
        'Grams', 'Pieces', 'Milileters', 'Liters', 'Meters', 'KM', 'Miles', 'KG', 'Tonnes'
    ];

    const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'Other'];

    // =================================================================
    // Core Initialization
    // =================================================================

    function initializeInterface() {
        const container = root_element.querySelector('.purchased-goods-container');
        if (!container || isInitialized) return;

        console.log('Initializing purchased goods and services...');
        
        // Completely disable Frappe's awesome bar globally
        disableFrappeAwesomeBar();
        
        // Create an isolated environment for our form
        createIsolatedFormEnvironment(container);
        
        // Disable Frappe's global keyboard shortcuts when inside our form
        disableGlobalShortcuts();
        
        // Build company/unit filter bar first
        buildFilterBar(async () => {
            await initializeFiltersFromContext();
            setupTabSwitching();
            createDataEntryRow('supplier-specific');
            createDataEntryRow('hybrid');
            createDataEntryRow('average-data');
            createDataEntryRow('spend-based');
            loadExistingData();
            isInitialized = true;
            console.log('Purchased goods and services initialized successfully');
        });
    }

    function disableFrappeAwesomeBar() {
        // Override Frappe's awesome bar completely
        if (window.frappe && window.frappe.ui) {
            // Disable awesome bar creation
            const originalAwesomeBar = window.frappe.ui.awesome_bar;
            window.frappe.ui.awesome_bar = {
                show: function() {
                    console.log('Awesome bar disabled for purchased goods form');
                    return false;
                },
                hide: function() {
                    return false;
                },
                toggle: function() {
                    return false;
                }
            };
            
            // Also override the global keyboard handler
            if (window.frappe.ui.keyboard) {
                const originalKeyboard = window.frappe.ui.keyboard;
                window.frappe.ui.keyboard = {
                    ...originalKeyboard,
                    handle_keydown: function(e) {
                        // Don't handle any keyboard events that might trigger awesome bar
                        if (e.ctrlKey || e.metaKey) {
                            if (e.key === 'k' || e.key === 'K') {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                            }
                        }
                        if (e.key === '/' || e.key === '?') {
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                        }
                        return originalKeyboard.handle_keydown.call(this, e);
                    }
                };
            }
        }
        
        // Remove any existing awesome bar elements
        const awesomeBarElements = document.querySelectorAll('.awesome-bar, [data-awesome-bar]');
        awesomeBarElements.forEach(element => {
            element.style.display = 'none';
            element.style.pointerEvents = 'none';
        });
        
        // Prevent awesome bar from being created
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && node.classList.contains('awesome-bar')) {
                            node.style.display = 'none';
                            node.style.pointerEvents = 'none';
                        }
                        if (node.querySelector && node.querySelector('.awesome-bar')) {
                            const awesomeBar = node.querySelector('.awesome-bar');
                            awesomeBar.style.display = 'none';
                            awesomeBar.style.pointerEvents = 'none';
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function createIsolatedFormEnvironment(container) {
        // Create a shadow DOM or isolated environment
        const wrapper = document.createElement('div');
        wrapper.className = 'purchased-goods-isolated-wrapper';
        wrapper.style.cssText = `
            position: relative;
            z-index: 10000;
            isolation: isolate;
        `;
        
        // Move the container content to the wrapper
        const parent = container.parentNode;
        parent.insertBefore(wrapper, container);
        wrapper.appendChild(container);
        
        // Completely disable Frappe's awesome bar when our form is active
        let isFormActive = false;
        
        // Track when our form is active
        wrapper.addEventListener('focusin', (e) => {
            isFormActive = true;
            disableAwesomeBar();
        }, true);
        
        wrapper.addEventListener('focusout', (e) => {
            isFormActive = false;
            enableAwesomeBar();
        }, true);
        
        // Function to disable awesome bar
        function disableAwesomeBar() {
            // Disable the awesome bar element if it exists
            const awesomeBar = document.querySelector('.awesome-bar');
            if (awesomeBar) {
                awesomeBar.style.pointerEvents = 'none';
                awesomeBar.style.opacity = '0.3';
            }
            
            // Disable any global keyboard shortcuts
            if (window.frappe && window.frappe.ui && window.frappe.ui.awesome_bar) {
                window.frappe.ui.awesome_bar.show = function() {
                    return false; // Don't show awesome bar
                };
            }
            
            // Remove any existing awesome bar event listeners
            const existingListeners = window.awesomeBarListeners || [];
            existingListeners.forEach(listener => {
                document.removeEventListener('keydown', listener, true);
            });
        }
        
        // Function to enable awesome bar
        function enableAwesomeBar() {
            const awesomeBar = document.querySelector('.awesome-bar');
            if (awesomeBar) {
                awesomeBar.style.pointerEvents = 'auto';
                awesomeBar.style.opacity = '1';
            }
        }
        
        // Add a global event listener that prevents awesome bar when inside our form
        const preventAwesomeBarGlobal = (e) => {
            if (wrapper.contains(e.target)) {
                // Prevent any keyboard shortcuts that might trigger awesome bar
                if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
                
                // Prevent other shortcuts
                if (e.key === '/' || e.key === '?') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
                
                // Prevent any key that might trigger awesome bar
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            }
        };
        
        // Add with highest priority
        document.addEventListener('keydown', preventAwesomeBarGlobal, true);
        document.addEventListener('keyup', preventAwesomeBarGlobal, true);
        document.addEventListener('keypress', preventAwesomeBarGlobal, true);
        
        // Also prevent any focus events from bubbling
        wrapper.addEventListener('focusin', (e) => {
            e.stopPropagation();
        }, true);
        
        wrapper.addEventListener('focusout', (e) => {
            e.stopPropagation();
        }, true);
        
        // Override Frappe's global keyboard handler
        const originalKeydown = document.onkeydown;
        document.onkeydown = function(e) {
            if (isFormActive) {
                // Prevent all keyboard shortcuts when form is active
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
            if (originalKeydown) {
                return originalKeydown.call(this, e);
            }
        };
    }

    function disableGlobalShortcuts() {
        const container = root_element.querySelector('.purchased-goods-container');
        
        // Function to prevent awesome bar activation
        function preventAwesomeBar(e) {
            // Check if the target is inside our form
            if (container.contains(e.target)) {
                // Prevent Ctrl+K and Cmd+K (awesome bar shortcuts)
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
                
                // Prevent any key combination that might trigger awesome bar
                if (e.key === '/' || e.key === '?') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            }
        }
        
        // Add event listener with highest priority
        document.addEventListener('keydown', preventAwesomeBar, true);
        
        // Also add to the container specifically
        container.addEventListener('keydown', preventAwesomeBar, true);
        
        // Override Frappe's awesome bar if it exists
        if (window.frappe && window.frappe.ui && window.frappe.ui.awesome_bar) {
            const originalAwesomeBar = window.frappe.ui.awesome_bar;
            window.frappe.ui.awesome_bar = {
                ...originalAwesomeBar,
                show: function() {
                    // Don't show awesome bar when inside our form
                    if (container.contains(document.activeElement)) {
                        return;
                    }
                    return originalAwesomeBar.show.apply(this, arguments);
                }
            };
        }
        
        // Disable awesome bar globally when our form is active
        let isFormActive = false;
        
        container.addEventListener('focusin', () => {
            isFormActive = true;
        });
        
        container.addEventListener('focusout', () => {
            isFormActive = false;
        });
        
        // Override document keydown to check if form is active
        const originalDocumentKeydown = document.onkeydown;
        document.onkeydown = function(e) {
            if (isFormActive) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
            if (originalDocumentKeydown) {
                return originalDocumentKeydown.call(this, e);
            }
        };
    }

    // =================================================================
    // UI and Event Handlers
    // =================================================================

    function setupTabSwitching() {
        const tabBtns = root_element.querySelectorAll('.tab-btn');
        const tabContents = root_element.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                root_element.querySelector('#' + targetTab + '-tab').classList.add('active');
                activeTab = targetTab;
            });
        });
    }

    function createDataEntryRow(tabType) {
        const tbody = root_element.querySelector('#' + getTableId(tabType) + 'Body');
        if (!tbody) return;
        
        const existingEntryRow = tbody.querySelector('.data-entry-row');
        if (existingEntryRow) existingEntryRow.remove();
        
        const entryRow = document.createElement('tr');
        entryRow.className = 'data-entry-row';
        entryRow.innerHTML = getEntryRowHTML(tabType);
        tbody.appendChild(entryRow);
        
        setupEntryRowEventListeners(entryRow, tabType);
    }

    function getTableId(tabType) {
        const tableIds = {
            'supplier-specific': 'supplierSpecificTable',
            'hybrid': 'hybridTable',
            'average-data': 'averageDataTable',
            'spend-based': 'spendBasedTable'
        };
        return tableIds[tabType];
    }

    function getEntryRowHTML(tabType) {
        const today = new Date().toISOString().split('T')[0];
        
        switch(tabType) {
            case 'supplier-specific':
                return `
                    <td>${currentRowIds[tabType]}</td>
                    <td><input type="date" class="form-control isolated-input" value="${today}" data-frappe-ignore="true"></td>
                    <td><input type="number" class="form-control quantity isolated-input" step="0.01" placeholder="0.00" data-frappe-ignore="true"></td>
                    <td>
                        <select class="form-control unit-select isolated-input" data-frappe-ignore="true">
                            ${unitsOfMeasurement.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                        </select>
                    </td>
                    <td><input type="number" class="form-control emission-factor isolated-input" step="0.0001" placeholder="0.0000" data-frappe-ignore="true"></td>
                    <td><span class="total-emissions">0.00</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm save-btn">Add</button>
                    </td>
                `;
            
            case 'hybrid':
                return `
                    <td>${currentRowIds[tabType]}</td>
                    <td><input type="date" class="form-control isolated-input" value="${today}" data-frappe-ignore="true"></td>
                    <td>
                        <input type="file" class="form-control file-input isolated-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" data-frappe-ignore="true" style="padding: 8px; height: 44px;">
                    </td>
                    <td><input type="number" class="form-control supplier-scope-1 isolated-input" step="0.01" placeholder="0.00" data-frappe-ignore="true"></td>
                    <td><input type="number" class="form-control supplier-scope-2 isolated-input" step="0.01" placeholder="0.00" data-frappe-ignore="true"></td>
                    <td>
                        <select class="form-control unit-select isolated-input" data-frappe-ignore="true">
                            ${unitsOfMeasurement.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary add-material-btn" data-row="${currentRowIds[tabType]}">Add Material</button>
                        <div class="material-summary" id="material-summary-${currentRowIds[tabType]}">No items added</div>
                    </td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary add-transport-btn" data-row="${currentRowIds[tabType]}">Add Transport</button>
                        <div class="transport-summary" id="transport-summary-${currentRowIds[tabType]}">No items added</div>
                    </td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary add-waste-btn" data-row="${currentRowIds[tabType]}">Add Waste</button>
                        <div class="waste-summary" id="waste-summary-${currentRowIds[tabType]}">No items added</div>
                    </td>
                    <td><span class="total-emissions">0.00</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm save-btn">Add</button>
                    </td>
                `;
            
            case 'average-data':
                return `
                    <td>${currentRowIds[tabType]}</td>
                    <td><input type="date" class="form-control isolated-input" value="${today}" data-frappe-ignore="true"></td>
                    <td><input type="text" class="form-control isolated-input" placeholder="Enter good/service description" data-frappe-ignore="true"></td>
                    <td><input type="number" class="form-control quantity isolated-input" step="0.01" placeholder="0.00" data-frappe-ignore="true"></td>
                    <td>
                        <select class="form-control unit-select isolated-input" data-frappe-ignore="true">
                            ${unitsOfMeasurement.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                        </select>
                    </td>
                    <td><input type="number" class="form-control emission-factor isolated-input" step="0.0001" placeholder="0.0000" data-frappe-ignore="true"></td>
                    <td><span class="total-emissions">0.00</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm save-btn">Add</button>
                    </td>
                `;
            
            case 'spend-based':
                return `
                    <td>${currentRowIds[tabType]}</td>
                    <td><input type="date" class="form-control isolated-input" value="${today}" data-frappe-ignore="true"></td>
                    <td><input type="text" class="form-control isolated-input" placeholder="Enter good/service description" data-frappe-ignore="true"></td>
                    <td><input type="number" class="form-control amount-spent isolated-input" step="0.01" placeholder="0.00" data-frappe-ignore="true"></td>
                    <td>
                        <select class="form-control unit-select isolated-input" data-frappe-ignore="true">
                            ${unitsOfMeasurement.map(unit => `<option value="${unit}">${unit}</option>`).join('')}
                        </select>
                    </td>
                    <td><input type="number" class="form-control emission-factor isolated-input" step="0.0001" placeholder="0.0000" data-frappe-ignore="true"></td>
                    <td><span class="total-emissions">0.00</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm save-btn">Add</button>
                    </td>
                `;
        }
    }

    function setupEntryRowEventListeners(row, tabType) {
        const saveBtn = row.querySelector('.save-btn');
        


        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const data = getFormData(row, tabType);
            if (validateFormData(data, tabType)) {
                saveToDoctype(data, tabType, (docName) => {
                    addNewRow(row, tabType, docName);
                    clearEntryRow(row, tabType); // Auto-clear the form after adding
                    showNotification('Record added successfully!', 'success');
                });
            }
            return false;
        });

                    // Create isolated input handlers
            const formInputs = row.querySelectorAll('input, select, textarea');
            formInputs.forEach(input => {
                // Create a wrapper function to handle all input events
                const handleInputEvent = (e) => {
                    // Prevent any event from bubbling up to Frappe's global handlers
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    // Prevent specific shortcuts
                    if (e.type === 'keydown') {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            return false;
                        }
                        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                            e.preventDefault();
                            return false;
                        }
                        if (e.key === '/' || e.key === '?') {
                            e.preventDefault();
                            return false;
                        }
                    }
                    
                    // Allow the event to continue for normal input behavior
                    return true;
                };
                
                // Add event listeners with capture phase to intercept before Frappe
                const events = ['keydown', 'keyup', 'keypress', 'focus', 'blur'];
                events.forEach(eventType => {
                    input.addEventListener(eventType, handleInputEvent, true);
                });
                
                // Handle input and change events separately to allow calculations
                input.addEventListener('input', (e) => {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // Allow the event to bubble for calculations
                }, false);
                
                input.addEventListener('change', (e) => {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // Allow the event to bubble for calculations
                }, false);
                
                // Also add a specific handler to prevent focus loss
                input.addEventListener('focus', (e) => {
                    // Keep focus on this input
                    setTimeout(() => {
                        if (document.activeElement !== input) {
                            input.focus();
                        }
                    }, 0);
                }, true);
            });

        // Setup file upload handling for hybrid method
        if (tabType === 'hybrid') {
            const fileInput = row.querySelector('.file-input');
            
            console.log('Setting up file upload:', { fileInput });
            
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    console.log('File input change event:', e);
                    const file = e.target.files[0];
                    if (file) {
                        console.log('File selected:', file.name);
                        // You can add visual feedback here if needed
                        fileInput.style.borderColor = '#28a745';
                        fileInput.style.backgroundColor = '#f8fff9';
                    } else {
                        console.log('No file selected');
                        fileInput.style.borderColor = '#e9ecef';
                        fileInput.style.backgroundColor = 'white';
                    }
                });
            } else {
                console.error('File input not found:', { fileInput });
            }
        }

        // Setup calculations based on tab type
        switch(tabType) {
            case 'supplier-specific':
                setupSupplierSpecificCalculations(row);
                break;
            case 'hybrid':
                setupHybridCalculations(row);
                break;
            case 'average-data':
                setupAverageDataCalculations(row);
                break;
            case 'spend-based':
                setupSpendBasedCalculations(row);
                break;
        }
    }

    function setupSupplierSpecificCalculations(row) {
        const quantityInput = row.querySelector('.quantity');
        const emissionFactorInput = row.querySelector('.emission-factor');
        const totalEmissionsSpan = row.querySelector('.total-emissions');

        function calculateEmissions() {
            const quantity = parseFloat(quantityInput.value) || 0;
            const emissionFactor = parseFloat(emissionFactorInput.value) || 0;
            const totalEmissions = quantity * emissionFactor;
            totalEmissionsSpan.textContent = totalEmissions.toFixed(2);
            console.log('Calculated emissions:', quantity, '*', emissionFactor, '=', totalEmissions);
        }

        // Add calculation listeners with capture phase to ensure they run
        quantityInput.addEventListener('input', calculateEmissions, true);
        emissionFactorInput.addEventListener('input', calculateEmissions, true);
        
        // Also add change listeners
        quantityInput.addEventListener('change', calculateEmissions, true);
        emissionFactorInput.addEventListener('change', calculateEmissions, true);
    }

    function setupListFunctionality(row) {
        const addButtons = row.querySelectorAll('.add-item-btn');
        
        addButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const listType = btn.getAttribute('data-list');
                const rowId = btn.getAttribute('data-row');
                const listContainer = document.getElementById(`${listType}-list-${rowId}`);
                
                // Create new list item
                const listItem = document.createElement('div');
                listItem.className = 'list-item';
                listItem.innerHTML = `
                    <div class="input-group mb-2">
                        <input type="text" class="form-control form-control-sm ${listType}-name" placeholder="${listType.charAt(0).toUpperCase() + listType.slice(1)} name" data-frappe-ignore="true">
                        <input type="number" class="form-control form-control-sm ${listType}-ef" step="0.0001" placeholder="EF" data-frappe-ignore="true">
                        <button type="button" class="btn btn-sm btn-outline-danger remove-item-btn">×</button>
                    </div>
                `;
                
                // Add remove functionality
                const removeBtn = listItem.querySelector('.remove-item-btn');
                removeBtn.addEventListener('click', () => {
                    listItem.remove();
                    updateHybridCalculations(row);
                });
                
                // Add input change listeners
                const nameInput = listItem.querySelector(`.${listType}-name`);
                const efInput = listItem.querySelector(`.${listType}-ef`);
                [nameInput, efInput].forEach(input => {
                    input.addEventListener('input', () => updateHybridCalculations(row));
                    input.addEventListener('change', () => updateHybridCalculations(row));
                });
                
                listContainer.appendChild(listItem);
                updateHybridCalculations(row);
            });
        });
    }

    function updateHybridCalculations(row) {
        const scope1 = parseFloat(row.querySelector('.supplier-scope-1').value) || 0;
        const scope2 = parseFloat(row.querySelector('.supplier-scope-2').value) || 0;
        const totalEmissionsSpan = row.querySelector('.total-emissions');
        
        // Get material data from summary data attributes
        let materialEmissions = 0;
        const materialSummary = row.querySelector('.material-summary');
        if (materialSummary && materialSummary.textContent !== 'No items added') {
            const materialQuantity = parseFloat(materialSummary.getAttribute('data-quantity')) || 0;
            const materialEF = parseFloat(materialSummary.getAttribute('data-ef')) || 0;
            materialEmissions = materialQuantity * materialEF;
            console.log('Material emissions:', materialQuantity, '*', materialEF, '=', materialEmissions);
        }
        
        // Get transport data from summary data attributes
        let transportEmissions = 0;
        const transportSummary = row.querySelector('.transport-summary');
        if (transportSummary && transportSummary.textContent !== 'No items added') {
            const transportQuantity = parseFloat(transportSummary.getAttribute('data-quantity')) || 0;
            const transportEF = parseFloat(transportSummary.getAttribute('data-ef')) || 0;
            transportEmissions = transportQuantity * transportEF;
            console.log('Transport emissions:', transportQuantity, '*', transportEF, '=', transportEmissions);
        }
        
        // Get waste data from summary data attributes
        let wasteEmissions = 0;
        const wasteSummary = row.querySelector('.waste-summary');
        if (wasteSummary && wasteSummary.textContent !== 'No items added') {
            const wasteQuantity = parseFloat(wasteSummary.getAttribute('data-quantity')) || 0;
            const wasteEF = parseFloat(wasteSummary.getAttribute('data-ef')) || 0;
            wasteEmissions = wasteQuantity * wasteEF;
            console.log('Waste emissions:', wasteQuantity, '*', wasteEF, '=', wasteEmissions);
        }
        
        const totalEmissions = scope1 + scope2 + materialEmissions + transportEmissions + wasteEmissions;
        totalEmissionsSpan.textContent = totalEmissions.toFixed(2);
        console.log('Total hybrid emissions:', scope1, '+', scope2, '+', materialEmissions, '+', transportEmissions, '+', wasteEmissions, '=', totalEmissions);
    }

    function setupHybridCalculations(row) {
        const inputs = [
            row.querySelector('.supplier-scope-1'),
            row.querySelector('.supplier-scope-2')
        ];

        function calculateEmissions() {
            updateHybridCalculations(row);
        }

        inputs.forEach(input => {
            input.addEventListener('input', calculateEmissions, true);
            input.addEventListener('change', calculateEmissions, true);
        });

        // Setup popup functionality for add buttons
        setupPopupFunctionality(row);
    }

    function setupPopupFunctionality(row) {
        // Add popup container to the page if it doesn't exist
        if (!document.getElementById('hybrid-popup-container')) {
            const popupContainer = document.createElement('div');
            popupContainer.id = 'hybrid-popup-container';
            popupContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: none;
                z-index: 9999;
                justify-content: center;
                align-items: center;
            `;
            popupContainer.innerHTML = `
                <div class="popup-content" style="
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    min-width: 400px;
                    max-width: 500px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                ">
                    <h4 class="popup-title" style="margin-bottom: 20px; color: #333;"></h4>
                    <div class="popup-form">
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label for="popup-name" style="display: block; margin-bottom: 5px; font-weight: bold;">Name:</label>
                            <input type="text" id="popup-name" class="form-control" placeholder="Enter name" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label for="popup-quantity" style="display: block; margin-bottom: 5px; font-weight: bold;">Quantity:</label>
                            <input type="number" id="popup-quantity" class="form-control" step="0.01" placeholder="Enter quantity" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label for="popup-ef" style="display: block; margin-bottom: 5px; font-weight: bold;">Emission Factor (EF):</label>
                            <input type="number" id="popup-ef" class="form-control" step="0.0001" placeholder="Enter emission factor" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div class="popup-buttons" style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" class="btn btn-secondary popup-cancel-btn" style="padding: 8px 16px; border: 1px solid #ddd; background: #f8f9fa; border-radius: 4px; cursor: pointer;">Cancel</button>
                            <button type="button" class="btn btn-primary popup-submit-btn" style="padding: 8px 16px; border: 1px solid #007bff; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">Submit</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(popupContainer);
        }

        // Setup button event listeners
        const addMaterialBtn = row.querySelector('.add-material-btn');
        const addTransportBtn = row.querySelector('.add-transport-btn');
        const addWasteBtn = row.querySelector('.add-waste-btn');

        if (addMaterialBtn) {
            addMaterialBtn.addEventListener('click', () => openPopup('material', row));
        }
        if (addTransportBtn) {
            addTransportBtn.addEventListener('click', () => openPopup('transport', row));
        }
        if (addWasteBtn) {
            addWasteBtn.addEventListener('click', () => openPopup('waste', row));
        }

        // Setup popup button event listeners
        const popupContainer = document.getElementById('hybrid-popup-container');
        if (popupContainer) {
            const cancelBtn = popupContainer.querySelector('.popup-cancel-btn');
            const submitBtn = popupContainer.querySelector('.popup-submit-btn');
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', closePopup);
            }
            if (submitBtn) {
                submitBtn.addEventListener('click', submitPopup);
            }
        }
    }

    // Global variables for popup functionality
    let currentPopupType = null;
    let currentPopupRow = null;

    function openPopup(type, row) {
        currentPopupType = type;
        currentPopupRow = row;
        
        const popupContainer = document.getElementById('hybrid-popup-container');
        const popupTitle = popupContainer.querySelector('.popup-title');
        
        // Set title based on type
        const titles = {
            'material': 'Add Material Item',
            'transport': 'Add Transport Item',
            'waste': 'Add Waste Item'
        };
        popupTitle.textContent = titles[type];
        
        // Clear previous values
        document.getElementById('popup-name').value = '';
        document.getElementById('popup-quantity').value = '';
        document.getElementById('popup-ef').value = '';
        
        // Show popup
        popupContainer.style.display = 'flex';
    }

    function closePopup() {
        const popupContainer = document.getElementById('hybrid-popup-container');
        popupContainer.style.display = 'none';
        currentPopupType = null;
        currentPopupRow = null;
    }

    function submitPopup() {
        const name = document.getElementById('popup-name').value.trim();
        const quantity = parseFloat(document.getElementById('popup-quantity').value) || 0;
        const ef = parseFloat(document.getElementById('popup-ef').value) || 0;
        
        if (!name || quantity <= 0 || ef <= 0) {
            alert('Please enter valid name, quantity and emission factor values.');
            return;
        }
        
        // Store the data in the row
        if (currentPopupRow && currentPopupType) {
            const summaryElement = currentPopupRow.querySelector(`.${currentPopupType}-summary`);
            
            if (summaryElement) {
                summaryElement.textContent = `${name} | Qty: ${quantity} | EF: ${ef}`;
                summaryElement.style.color = '#28a745';
                summaryElement.style.fontWeight = 'bold';
                
                // Store values as data attributes on the summary element
                summaryElement.setAttribute('data-name', name);
                summaryElement.setAttribute('data-quantity', quantity);
                summaryElement.setAttribute('data-ef', ef);
                
                // Update calculations
                updateHybridCalculations(currentPopupRow);
            }
        }
        
        closePopup();
    }

    // Make functions globally accessible
    window.openPopup = openPopup;
    window.closePopup = closePopup;
    window.submitPopup = submitPopup;

    function setupAverageDataCalculations(row) {
        const quantityInput = row.querySelector('.quantity');
        const emissionFactorInput = row.querySelector('.emission-factor');
        const totalEmissionsSpan = row.querySelector('.total-emissions');

        function calculateEmissions() {
            const quantity = parseFloat(quantityInput.value) || 0;
            const emissionFactor = parseFloat(emissionFactorInput.value) || 0;
            const totalEmissions = quantity * emissionFactor;
            totalEmissionsSpan.textContent = totalEmissions.toFixed(2);
            console.log('Calculated average data emissions:', quantity, '*', emissionFactor, '=', totalEmissions);
        }

        quantityInput.addEventListener('input', calculateEmissions, true);
        emissionFactorInput.addEventListener('input', calculateEmissions, true);
        quantityInput.addEventListener('change', calculateEmissions, true);
        emissionFactorInput.addEventListener('change', calculateEmissions, true);
    }

    function setupSpendBasedCalculations(row) {
        const amountSpentInput = row.querySelector('.amount-spent');
        const emissionFactorInput = row.querySelector('.emission-factor');
        const totalEmissionsSpan = row.querySelector('.total-emissions');

        function calculateEmissions() {
            const amountSpent = parseFloat(amountSpentInput.value) || 0;
            const emissionFactor = parseFloat(emissionFactorInput.value) || 0;
            const totalEmissions = amountSpent * emissionFactor;
            totalEmissionsSpan.textContent = totalEmissions.toFixed(2);
            console.log('Calculated spend-based emissions:', amountSpent, '*', emissionFactor, '=', totalEmissions);
        }

        amountSpentInput.addEventListener('input', calculateEmissions, true);
        emissionFactorInput.addEventListener('input', calculateEmissions, true);
        amountSpentInput.addEventListener('change', calculateEmissions, true);
        emissionFactorInput.addEventListener('change', calculateEmissions, true);
    }

    function addNewRow(entryRow, tabType, docName = null) {
        const tbody = root_element.querySelector('#' + getTableId(tabType) + 'Body');
        const data = getFormData(entryRow, tabType);
        
        // Use the provided docName or fall back to temp
        const actualDocName = docName || data.docName || 'temp';
        
        // Create display row
        const displayRow = document.createElement('tr');
        displayRow.className = 'data-display-row';
        displayRow.innerHTML = createDisplayRow(data, actualDocName, tabType);
        
        // Insert the new row AFTER the entry row (below the filler row)
        tbody.insertBefore(displayRow, entryRow.nextSibling);
        
        setupDisplayRowEventListeners(displayRow, tabType);
        currentRowIds[tabType]++;
        entryRow.querySelector('td:first-child').textContent = currentRowIds[tabType];
        
        console.log('Added new row with doc name:', actualDocName);
    }

    function getFormData(row, tabType) {
        const data = {
            date: row.querySelector('input[type="date"]').value,
            docName: null
        };

        switch(tabType) {
            case 'supplier-specific':
                data.quantity = parseFloat(row.querySelector('.quantity').value) || 0;
                data.unit = row.querySelector('.unit-select').value;
                data.emission_factor = parseFloat(row.querySelector('.emission-factor').value) || 0;
                data.total_emissions = parseFloat(row.querySelector('.total-emissions').textContent) || 0;
                break;
            
            case 'hybrid':
                data.supplier_scope_1 = parseFloat(row.querySelector('.supplier-scope-1').value) || 0;
                data.supplier_scope_2 = parseFloat(row.querySelector('.supplier-scope-2').value) || 0;
                data.unit = row.querySelector('.unit-select').value;
                
                // Get invoice file
                const invoiceFile = row.querySelector('input[type="file"]');
                if (invoiceFile && invoiceFile.files.length > 0) {
                    data.invoice = invoiceFile.files[0].name; // Store filename for now
                }
                
                // Get material data from summary element
                const materialSummary = row.querySelector('.material-summary');
                if (materialSummary && materialSummary.getAttribute('data-name')) {
                    data.material_name = materialSummary.getAttribute('data-name') || '';
                    data.material_quantity = parseFloat(materialSummary.getAttribute('data-quantity')) || 0;
                    data.material_ef = parseFloat(materialSummary.getAttribute('data-ef')) || 0;
                } else {
                    data.material_name = '';
                    data.material_quantity = 0;
                    data.material_ef = 0;
                }
                
                // Get transport data from summary element
                const transportSummary = row.querySelector('.transport-summary');
                if (transportSummary && transportSummary.getAttribute('data-name')) {
                    data.transport_name = transportSummary.getAttribute('data-name') || '';
                    data.transport_quantity = parseFloat(transportSummary.getAttribute('data-quantity')) || 0;
                    data.transport_ef = parseFloat(transportSummary.getAttribute('data-ef')) || 0;
                } else {
                    data.transport_name = '';
                    data.transport_quantity = 0;
                    data.transport_ef = 0;
                }
                
                // Get waste data from summary element
                const wasteSummary = row.querySelector('.waste-summary');
                if (wasteSummary && wasteSummary.getAttribute('data-name')) {
                    data.waste_name = wasteSummary.getAttribute('data-name') || '';
                    data.waste_quantity = parseFloat(wasteSummary.getAttribute('data-quantity')) || 0;
                    data.waste_ef = parseFloat(wasteSummary.getAttribute('data-ef')) || 0;
                } else {
                    data.waste_name = '';
                    data.waste_quantity = 0;
                    data.waste_ef = 0;
                }
                
                data.total_emissions = parseFloat(row.querySelector('.total-emissions').textContent) || 0;
                break;
            
            case 'average-data':
                data.description = row.querySelector('td:nth-child(3) input').value;
                data.quantity = parseFloat(row.querySelector('.quantity').value) || 0;
                data.unit = row.querySelector('.unit-select').value;
                data.emission_factor = parseFloat(row.querySelector('.emission-factor').value) || 0;
                data.total_emissions = parseFloat(row.querySelector('.total-emissions').textContent) || 0;
                break;
            
            case 'spend-based':
                data.description = row.querySelector('td:nth-child(3) input').value;
                data.amount_spent = parseFloat(row.querySelector('.amount-spent').value) || 0;
                data.unit = row.querySelector('.unit-select').value;
                data.emission_factor = parseFloat(row.querySelector('.emission-factor').value) || 0;
                data.total_emissions = parseFloat(row.querySelector('.total-emissions').textContent) || 0;
                break;
        }

        return data;
    }

    function getMethodType(tabType) {
        const methodTypes = {
            'supplier-specific': 'Supplier-Specific Method',
            'hybrid': 'Hybrid Method',
            'average-data': 'Average-Data Method',
            'spend-based': 'Spend-Based Method'
        };
        return methodTypes[tabType];
    }

    function validateFormData(data, tabType) {
        if (!data.date) {
            showNotification('Please select a date', 'error');
            return false;
        }
        
        switch(tabType) {
            case 'supplier-specific':
                if (data.quantity <= 0 || data.emission_factor <= 0) {
                    showNotification('Please fill all required fields with valid values', 'error');
                    return false;
                }
                break;
            case 'hybrid':
                if (data.supplier_scope_1 < 0 || data.supplier_scope_2 < 0) {
                    showNotification('Please enter valid scope values', 'error');
                    return false;
                }
                break;
            case 'average-data':
                if (!data.description || data.quantity <= 0 || data.emission_factor <= 0) {
                    showNotification('Please fill all required fields with valid values', 'error');
                    return false;
                }
                break;
            case 'spend-based':
                if (!data.description || data.amount_spent <= 0 || data.emission_factor <= 0) {
                    showNotification('Please fill all required fields with valid values', 'error');
                    return false;
                }
                break;
        }
        
        return true;
    }

    function saveToDoctype(data, tabType, callback) {
        createDoctypeRecord(data, tabType, callback);
    }

    function createDoctypeRecord(data, tabType, callback) {
        const doctypeName = getDoctypeName(tabType);
        const methodType = getMethodType(tabType);
        
        const docData = {
            doctype: doctypeName,
            date: data.date,
            method_type: methodType,
            total_emissions: data.total_emissions,
            ...data
        };

        (async () => {
            try {
                const ctx = await getUserContext();
                if (await hasField(doctypeName, 'company')) {
                    docData.company = ctx.is_super ? (selectedCompany || ctx.company || null) : (ctx.company || null);
                }
                if (await hasField(doctypeName, 'company_unit')) {
                    const chosenUnit = selectedUnit || (ctx.units && ctx.units.length === 1 ? ctx.units[0] : null);
                    if (chosenUnit) docData.company_unit = chosenUnit;
                }
            } catch (e) { console.warn('Company/Unit context unavailable', e); }

            frappe.call({
                method: 'frappe.client.insert',
                args: {
                    doc: docData
                },
                callback: function(r) {
                    console.log('Save response:', r);
                    if (r.message) {
                        data.docName = r.message.name;
                        console.log('Successfully saved with doc name:', r.message.name);
                        if (callback) callback(r.message.name);
                    } else {
                        console.error('Error saving data:', r);
                        showNotification('Error saving data: ' + (r.exc || 'Unknown error'), 'error');
                    }
                },
                error: function(r) {
                    console.error('Frappe call error:', r);
                    showNotification('Error saving data: ' + (r.exc || 'Network error'), 'error');
                }
            });
        })();
    }

    function getDoctypeName(tabType) {
        const doctypeNames = {
            'supplier-specific': 'Purchased Goods Supplier Specific Method',
            'hybrid': 'Purchased Goods Hybrid Method',
            'average-data': 'Purchased Goods Average Data Method',
            'spend-based': 'Purchased Goods Spend Based Method'
        };
        return doctypeNames[tabType];
    }

    function createDisplayRow(data, docName, tabType) {
        let displayHTML = `
            <td>${currentRowIds[tabType] - 1}</td>
            <td>${formatDate(data.date)}</td>
        `;

        switch(tabType) {
            case 'supplier-specific':
                displayHTML += `
                    <td>${data.quantity || '0.00'}</td>
                    <td>${data.unit || '-'}</td>
                    <td>${data.emission_factor || '0.0000'}</td>
                    <td>${data.total_emissions || '0.00'}</td>
                `;
                break;
            
            case 'hybrid':
                displayHTML += `
                    <td>${data.invoice ? `<a href="#" class="view-document">${data.invoice}</a>` : '<span class="no-file">No file uploaded</span>'}</td>
                    <td>${data.supplier_scope_1 || '0.00'}</td>
                    <td>${data.supplier_scope_2 || '0.00'}</td>
                    <td>${data.unit || '-'}</td>
                    <td>${data.material_name && data.material_quantity && data.material_ef ? `<span class="display-material">${data.material_name} | Qty: ${data.material_quantity} | EF: ${data.material_ef}</span>` : 'No items added'}</td>
                    <td>${data.transport_name && data.transport_quantity && data.transport_ef ? `<span class="display-transport">${data.transport_name} | Qty: ${data.transport_quantity} | EF: ${data.transport_ef}</span>` : 'No items added'}</td>
                    <td>${data.waste_name && data.waste_quantity && data.waste_ef ? `<span class="display-waste">${data.waste_name} | Qty: ${data.waste_quantity} | EF: ${data.waste_ef}</span>` : 'No items added'}</td>
                    <td>${data.total_emissions || '0.00'}</td>
                `;
                break;
            
            case 'average-data':
                displayHTML += `
                    <td>${data.description || '-'}</td>
                    <td>${data.quantity || '0.00'}</td>
                    <td>${data.unit || '-'}</td>
                    <td>${data.emission_factor || '0.0000'}</td>
                    <td>${data.total_emissions || '0.00'}</td>
                `;
                break;
            
            case 'spend-based':
                displayHTML += `
                    <td>${data.description || '-'}</td>
                    <td>${data.amount_spent || '0.00'}</td>
                    <td>${data.unit || '-'}</td>
                    <td>${data.emission_factor || '0.0000'}</td>
                    <td>${data.total_emissions || '0.00'}</td>
                `;
                break;
        }

        displayHTML += `
            <td>
                <button class="btn btn-danger btn-sm delete-btn" data-doc="${docName}">Delete</button>
            </td>
        `;

        return displayHTML;
    }

    function setupDisplayRowEventListeners(row, tabType) {
        const deleteBtn = row.querySelector('.delete-btn');
        if (!deleteBtn) {
            console.error('Delete button not found in row:', row);
            return;
        }
        
        console.log('Setting up delete button for doc:', deleteBtn.getAttribute('data-doc'));
        
        deleteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const docName = deleteBtn.getAttribute('data-doc');
            console.log('Delete button clicked for doc:', docName);
            deleteRow(docName, row, tabType);
        });
    }

    function deleteRow(docName, row, tabType) {
        if (!docName) {
            console.error('No document name provided for deletion');
            showNotification('Error: No document name found', 'error');
            return;
        }

        if (confirm('Are you sure you want to delete this record?')) {
            const doctypeName = getDoctypeName(tabType);
            console.log(`Deleting document: ${docName} from ${doctypeName}`);
            
            frappe.call({
                method: 'frappe.client.delete',
                args: {
                    doctype: doctypeName,
                    name: docName
                },
                callback: function(r) {
                    console.log('Delete response:', r);
                    // Frappe delete returns empty object {} on success
                    if (!r.exc) {
                        row.remove();
                        showNotification('Record deleted successfully', 'success');
                        console.log('Record deleted successfully');
                    } else {
                        console.error('Error deleting record:', r);
                        showNotification('Error deleting record: ' + (r.exc || 'Unknown error'), 'error');
                    }
                },
                error: function(r) {
                    console.error('Frappe call error during delete:', r);
                    // Even if there's an error, the record might have been deleted
                    // Remove the row anyway and show a warning
                    row.remove();
                    showNotification('Record may have been deleted. Please refresh to confirm.', 'warning');
                }
            });
        }
    }

    function clearEntryRow(row, tabType) {
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.type === 'date') {
                input.value = new Date().toISOString().split('T')[0];
            } else {
                input.value = '';
            }
        });

        const selects = row.querySelectorAll('select');
        selects.forEach(select => {
            select.selectedIndex = 0;
        });

        const totalEmissionsSpan = row.querySelector('.total-emissions');
        if (totalEmissionsSpan) {
            totalEmissionsSpan.textContent = '0.00';
        }

        // Clear material, transport, and waste summary elements for hybrid method
        if (tabType === 'hybrid') {
            const materialSummary = row.querySelector('.material-summary');
            if (materialSummary) {
                materialSummary.textContent = 'No items added';
                materialSummary.removeAttribute('data-name');
                materialSummary.removeAttribute('data-quantity');
                materialSummary.removeAttribute('data-ef');
            }

            const transportSummary = row.querySelector('.transport-summary');
            if (transportSummary) {
                transportSummary.textContent = 'No items added';
                transportSummary.removeAttribute('data-name');
                transportSummary.removeAttribute('data-quantity');
                transportSummary.removeAttribute('data-ef');
            }

            const wasteSummary = row.querySelector('.waste-summary');
            if (wasteSummary) {
                wasteSummary.textContent = 'No items added';
                wasteSummary.removeAttribute('data-name');
                wasteSummary.removeAttribute('data-quantity');
                wasteSummary.removeAttribute('data-ef');
            }
        }
    }

    function loadExistingData() {
        loadTabData('supplier-specific');
        loadTabData('hybrid');
        loadTabData('average-data');
        loadTabData('spend-based');
    }

    // Helper to apply client-side date filtering
    function applyDateFilter(records) {
        if (!selectedDateFrom && !selectedDateTo) {
            return records;
        }
        
        console.log('Purchased Goods: Applying client-side date filtering...');
        console.log('Date filters - From:', selectedDateFrom, 'To:', selectedDateTo);
        
        return records.filter(record => {
            const recordDate = new Date(record.date);
            let includeRecord = true;
            
            if (selectedDateFrom) {
                const fromDate = new Date(selectedDateFrom);
                includeRecord = includeRecord && recordDate >= fromDate;
                console.log(`Record ${record.name} date ${record.date} >= ${selectedDateFrom}:`, recordDate >= fromDate);
            }
            
            if (selectedDateTo) {
                const toDate = new Date(selectedDateTo);
                includeRecord = includeRecord && recordDate <= toDate;
                console.log(`Record ${record.name} date ${record.date} <= ${selectedDateTo}:`, recordDate <= toDate);
            }
            
            console.log(`Record ${record.name} included:`, includeRecord);
            return includeRecord;
        });
    }

    function loadTabData(tabType) {
        const doctypeName = getDoctypeName(tabType);
        const methodType = getMethodType(tabType);
        
        console.log(`Loading data for ${tabType} tab from ${doctypeName} with method type ${methodType}`);
        
        // Get the appropriate fields based on tab type
        let fields = ['name', 'date', 'total_emissions'];
        
        switch(tabType) {
            case 'supplier-specific':
                fields = fields.concat(['quantity', 'unit', 'emission_factor']);
                break;
            case 'hybrid':
                fields = fields.concat(['supplier_scope_1', 'supplier_scope_2', 'unit', 'invoice',
                                      'material_name', 'material_quantity', 'material_ef', 'transport_name', 'transport_quantity', 'transport_ef', 
                                      'waste_name', 'waste_quantity', 'waste_ef']);
                break;
            case 'average-data':
                fields = fields.concat(['description', 'quantity', 'unit', 'emission_factor']);
                break;
            case 'spend-based':
                fields = fields.concat(['description', 'amount_spent', 'unit', 'emission_factor']);
                break;
        }
        
        console.log(`Querying fields: ${fields.join(', ')}`);
        
        (async () => {
        const ctx = await getUserContext();
        const filters = { method_type: methodType };
        if (await hasField(doctypeName, 'company')) {
            filters.company = ctx.is_super ? (selectedCompany || ctx.company || undefined) : (ctx.company || undefined);
        }
        if (await hasField(doctypeName, 'company_unit')) {
            if (selectedUnit) filters.company_unit = selectedUnit;
        }

        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: doctypeName,
                filters: filters,
                fields: fields,
                limit_page_length: 100
            },
            callback: function(r) {
                console.log(`Load response for ${tabType}:`, r);
                if (r.message && r.message.length > 0) {
                    console.log(`Found ${r.message.length} records for ${tabType}`);
                    
                    // Apply client-side date filtering
                    const filteredRecords = applyDateFilter(r.message);
                    console.log(`Purchased Goods: Original records: ${r.message.length}, Filtered records: ${filteredRecords.length}`);
                    
                    const tbody = root_element.querySelector('#' + getTableId(tabType) + 'Body');
                    const entryRow = tbody.querySelector('.data-entry-row');
                    
                    filteredRecords.forEach((doc, index) => {
                        console.log(`Loading record ${index + 1}:`, doc);
                        const displayRow = document.createElement('tr');
                        displayRow.className = 'data-display-row';
                        
                        const data = {
                            date: doc.date,
                            quantity: doc.quantity,
                            unit: doc.unit,
                            emission_factor: doc.emission_factor,
                            category: doc.category,
                            amount_spent: doc.amount_spent,
                            currency: doc.currency,
                            supplier_scope_1: doc.supplier_scope_1,
                            supplier_scope_2: doc.supplier_scope_2,
                            material_name: doc.material_name,
                            material_quantity: doc.material_quantity,
                            material_ef: doc.material_ef,
                            transport_name: doc.transport_name,
                            transport_quantity: doc.transport_quantity,
                            transport_ef: doc.transport_ef,
                            waste_name: doc.waste_name,
                            waste_quantity: doc.waste_quantity,
                            waste_ef: doc.waste_ef,
                            invoice: doc.invoice,
                            total_emissions: doc.total_emissions
                        };
                        
                        console.log(`Processed data for display:`, data);
                        displayRow.innerHTML = createDisplayRow(data, doc.name, tabType);
                        tbody.insertBefore(displayRow, entryRow.nextSibling);
                        setupDisplayRowEventListeners(displayRow, tabType);
                        currentRowIds[tabType] = Math.max(currentRowIds[tabType], index + 2);
                    });
                } else {
                    console.log(`No existing data found for ${tabType} tab`);
                }
            },
            error: function(err) {
                console.error(`Error loading data for ${tabType} tab:`, err);
            }
        });
        })();
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    }

    function formatListDisplay(listData) {
        if (!listData) return '-';
        try {
            const items = JSON.parse(listData);
            if (Array.isArray(items) && items.length > 0) {
                return items.map(item => `${item.name} (${item.ef})`).join(', ');
            }
        } catch (e) {
            console.error('Error parsing list data:', e);
        }
        return '-';
    }

    function showNotification(message, type) {
        frappe.show_alert(message, type === 'success' ? 3 : 5);
    }


    // ===============================
    // Company/Unit Filter Bar Helpers
    // ===============================
    async function getUserContext() {
        try {
            const r = await frappe.call({ method: 'climoro_onboarding.climoro_onboarding.api.get_current_user_company_units' });
            return r.message || { company: null, units: [], is_super: false };
        } catch (e) { console.error('Failed to fetch user context', e); return { company: null, units: [], is_super: false }; }
    }

    function buildFilterBar(done) {
        const container = root_element.querySelector('.purchased-goods-container');
        if (!container) { done && done(); return; }
        const header = container.querySelector('.header-section');
        if (container.querySelector('.filter-bar')) { done && done(); return; }
        const bar = document.createElement('div');
        bar.className = 'filter-bar';
        // Only show for System Manager or Super Admin
        (async () => {
            try {
                const ctx = await getUserContext();
                const roles = (frappe && frappe.get_roles) ? frappe.get_roles() : [];
                const canShow = ctx.is_super || roles.includes('System Manager') || roles.includes('Super Admin');
                if (!canShow) { done && done(); return; }
            } catch (e) { done && done(); return; }
        })();
        bar.innerHTML = `
            <div class="filter-header">
                <h3>Filters</h3>
                <button type="button" class="filter-toggle-btn">
                    <i class="fa fa-plus"></i>
                </button>
            </div>
            <div class="filter-content" style="display: none;">
                <div class="filter-row">
                    <div class="filter-group">
                        <label>Company</label>
                        <select class="form-control filter-company-select">
                            <option value="">All Companies</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>Unit</label>
                        <select class="form-control filter-unit-select">
                            <option value="">All Units</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>From Date</label>
                        <input type="date" class="form-control date-from-input">
                    </div>
                    <div class="filter-group">
                        <label>To Date</label>
                        <input type="date" class="form-control date-to-input">
                    </div>
                    <div class="filter-actions">
                        <button type="button" class="btn filter-apply-btn">Apply</button>
                        <button type="button" class="btn filter-clear-btn">Clear Dates</button>
                    </div>
                </div>
            </div>
        `;
        if (header) header.insertAdjacentElement('afterend', bar); else container.prepend(bar);
        // Apply button event listener
        bar.querySelector('.filter-apply-btn').addEventListener('click', () => {
            const csel = bar.querySelector('.filter-company-select');
            const usel = bar.querySelector('.filter-unit-select');
            const fromDate = bar.querySelector('.date-from-input');
            const toDate = bar.querySelector('.date-to-input');
            
            selectedCompany = csel.value || null;
            selectedUnit = usel.value || null;
            selectedDateFrom = fromDate.value || null;
            selectedDateTo = toDate.value || null;
            
            console.log('Purchased Goods Filter values:', {
                company: selectedCompany,
                unit: selectedUnit,
                dateFrom: selectedDateFrom,
                dateTo: selectedDateTo
            });
            
            loadExistingData();
        });
        
        // Clear dates button event listener
        bar.querySelector('.filter-clear-btn').addEventListener('click', () => {
            const fromDate = bar.querySelector('.date-from-input');
            const toDate = bar.querySelector('.date-to-input');
            
            fromDate.value = '';
            toDate.value = '';
            selectedDateFrom = null;
            selectedDateTo = null;
            
            console.log('Purchased Goods Date filters cleared');
            loadExistingData();
        });
        
        // Toggle button event listener
        bar.querySelector('.filter-toggle-btn').addEventListener('click', () => {
            const content = bar.querySelector('.filter-content');
            const icon = bar.querySelector('.filter-toggle-btn i');
            
            isFilterVisible = !isFilterVisible;
            
            if (isFilterVisible) {
                content.style.display = 'block';
                icon.className = 'fa fa-minus';
            } else {
                content.style.display = 'none';
                icon.className = 'fa fa-plus';
            }
        });
        done && done();
    }

    async function fetchCompanies() {
        const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Company', fields: ['name'], limit: 500 } });
        return (r.message || []).map(r => r.name);
    }

    async function fetchUnits(company) {
        const filters = company ? { company } : {};
        const r = await frappe.call({ method: 'frappe.client.get_list', args: { doctype: 'Units', fields: ['name'], filters, limit: 500 } });
        return (r.message || []).map(r => r.name);
    }

    async function initializeFiltersFromContext() {
        const ctx = await getUserContext();
        const bar = root_element.querySelector('.filter-bar');
        if (!bar) return;
        const companySelect = bar.querySelector('.filter-company-select');
        const unitSelect = bar.querySelector('.filter-unit-select');

        companySelect.innerHTML = '';
        unitSelect.innerHTML = '';

        if (ctx.is_super) {
            const companies = await fetchCompanies();
            companySelect.innerHTML = `<option value="">All Companies</option>` + companies.map(c => `<option value="${c}">${c}</option>`).join('');
            companySelect.addEventListener('change', async () => {
                selectedCompany = companySelect.value || null;
                const units = await fetchUnits(selectedCompany);
                unitSelect.innerHTML = `<option value="">All Units</option>` + units.map(u => `<option value="${u}">${u}</option>`).join('');
                selectedUnit = null;
            });
            const initialUnits = await fetchUnits(null);
            unitSelect.innerHTML = `<option value="">All Units</option>` + initialUnits.map(u => `<option value="${u}">${u}</option>`).join('');
            selectedCompany = null;
            selectedUnit = null;
        } else {
            selectedCompany = ctx.company || null;
            companySelect.innerHTML = `<option value="${selectedCompany || ''}">${selectedCompany || '-'}</option>`;
            companySelect.disabled = true;

            let units = [];
            if (ctx.units && ctx.units.length) units = ctx.units;
            else if (selectedCompany) units = await fetchUnits(selectedCompany);
            if (!units || !units.length) {
                unitSelect.innerHTML = `<option value="">All Units</option>`;
                selectedUnit = null;
            } else {
                unitSelect.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
                selectedUnit = units.length === 1 ? units[0] : units[0];
            }
            unitSelect.disabled = !(ctx.units && ctx.units.length > 1);
        }
    }



    // =================================================================
    // Initialize when DOM is ready
    // =================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeInterface);
    } else {
        initializeInterface();
    }
})(); 