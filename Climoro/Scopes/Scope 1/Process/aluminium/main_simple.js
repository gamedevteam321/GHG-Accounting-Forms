// Simplified Aluminium Production Form JavaScript
// This version is more compatible with Frappe's environment

(function() {
    'use strict';
    
    // Wait for DOM to be ready
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }
    
    // Initialize when ready
    ready(function() {
        console.log('Initializing Aluminium Production Form...');
        
        // Get the root element (provided by Frappe)
        const rootElement = (typeof root_element !== 'undefined' && root_element) ? root_element : document;
        
        // Initialize the form
        initAluminiumForm(rootElement);
    });
    
    function initAluminiumForm(rootElement) {
        try {
            // Setup worksheet selector
            setupWorksheetSelector(rootElement);
            
            // Setup tabs
            setupTabs(rootElement);
            
            console.log('Aluminium Production Form initialized successfully');
        } catch (error) {
            console.error('Error initializing aluminium form:', error);
        }
    }
    
    function setupWorksheetSelector(rootElement) {
        const selector = rootElement.querySelector('#worksheet-selector');
        if (!selector) {
            console.warn('Worksheet selector not found');
            return;
        }
        
        selector.addEventListener('change', function() {
            const selectedValue = this.value;
            showWorksheet(rootElement, selectedValue);
        });
    }
    
    function showWorksheet(rootElement, worksheetType) {
        // Hide all worksheet sections
        const sections = rootElement.querySelectorAll('.worksheet-section');
        sections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected worksheet
        if (worksheetType) {
            const targetSection = rootElement.querySelector(`#${worksheetType}-section`);
            if (targetSection) {
                targetSection.style.display = 'block';
                console.log(`Showing worksheet: ${worksheetType}`);
            }
        }
    }
    
    function setupTabs(rootElement) {
        const container = rootElement.querySelector('.aluminium-production-container');
        if (!container) {
            console.warn('Aluminium production container not found');
            return;
        }
        
        const buttons = container.querySelectorAll('.tab-btn');
        if (buttons.length === 0) {
            console.warn('No tab buttons found');
            return;
        }
        
        const tabs = {};
        
        // Find all tab content elements
        buttons.forEach(btn => {
            const tabId = btn.getAttribute('data-tab');
            const tabContent = container.querySelector(`#${tabId}-tab`);
            if (tabContent) {
                tabs[tabId] = tabContent;
            }
        });
        
        buttons.forEach(btn => {
            btn.addEventListener('click', function() {
                // Remove active class from all buttons and tabs
                buttons.forEach(b => b.classList.remove('active'));
                Object.values(tabs).forEach(el => el.classList.remove('active'));
                
                // Add active class to clicked button and corresponding tab
                this.classList.add('active');
                const tabId = this.getAttribute('data-tab');
                if (tabs[tabId]) {
                    tabs[tabId].classList.add('active');
                    console.log(`Switched to tab: ${tabId}`);
                }
            });
        });
        
        console.log('Tabs setup completed');
    }
    
})();
