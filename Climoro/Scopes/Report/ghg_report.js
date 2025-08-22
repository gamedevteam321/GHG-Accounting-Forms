// GHG Reports Viewer - Frappe Custom HTML Block JavaScript

// Global variable to store the viewer instance
let ghgReportsViewer = null;

class GHGReportsViewer {
    constructor() {
        this.currentUser = null;
        this.currentCompany = null;
        this.isAdmin = false;
        this.reports = [];
        this.companies = [];
        this.filters = {
            company: '',
            dateFrom: '',
            dateTo: ''
        };
        
        this.init();
    }

    async init() {
        try {
            // Ensure frappe is available
            if (typeof frappe === 'undefined') {
                console.error('Frappe not available, retrying in 1 second...');
                setTimeout(() => this.init(), 1000);
                return;
            }

            await this.loadUserInfo();
            await this.loadCompanies();
            this.setupEventListeners();
            await this.loadReports();
            this.updateUI();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showMessage('Error initializing viewer', 'error');
        }
    }

    async loadUserInfo() {
        try {
            const response = await this.makeRequest('frappe.client.get_value', {
                doctype: 'User',
                filters: { name: frappe.session.user },
                fieldname: ['name', 'full_name', 'company']
            });

            if (response.message) {
                this.currentUser = response.message;
                this.currentCompany = this.currentUser.company;
                
                // Check if user is admin by checking roles
                this.isAdmin = frappe.user_roles.includes('System Manager') || frappe.user_roles.includes('Administrator');
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }

    async loadCompanies() {
        try {
            const response = await this.makeRequest('frappe.client.get_list', {
                doctype: 'Company',
                fields: ['name', 'company_name'],
                limit: 100
            });

            if (response.message) {
                this.companies = response.message;
                this.populateCompanyFilters();
            }
        } catch (error) {
            console.error('Error loading companies:', error);
        }
    }

    async loadReports() {
        try {
            this.showLoading(true);
            
            // Build filters based on user permissions
            let filters = {};
            
            if (!this.isAdmin && this.currentCompany) {
                filters.organization_name = this.currentCompany;
            }
            
            if (this.filters.company) {
                filters.organization_name = this.filters.company;
            }
            
            if (this.filters.dateFrom) {
                filters.period_from = ['>=', this.filters.dateFrom];
            }
            
            if (this.filters.dateTo) {
                filters.period_to = ['<=', this.filters.dateTo];
            }

            const response = await this.makeRequest('frappe.client.get_list', {
                doctype: 'GHG Report',
                fields: [
                    'name', 'report_title', 'organization_name', 'period_from', 
                    'period_to', 'docstatus', 'creation', 'modified'
                ],
                filters: filters,
                limit: 1000,
                order_by: 'creation desc'
            });

            if (response.message) {
                this.reports = response.message;
                this.renderReportsTable();
            }
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showMessage('Error loading reports', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    populateCompanyFilters() {
        const companyFilter = root_element.querySelector('#company-filter');
        const modalCompany = root_element.querySelector('#modal-company');
        
        if (!companyFilter || !modalCompany) return;
        
        // Clear existing options
        companyFilter.innerHTML = '<option value="">All Companies</option>';
        modalCompany.innerHTML = '<option value="">Select Company</option>';
        
        // Add company options
        this.companies.forEach(company => {
            const option1 = document.createElement('option');
            option1.value = company.name;
            option1.textContent = company.company_name || company.name;
            companyFilter.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = company.name;
            option2.textContent = company.company_name || company.name;
            modalCompany.appendChild(option2);
        });
        
        // Set default company for non-admin users
        if (!this.isAdmin && this.currentCompany) {
            companyFilter.value = this.currentCompany;
            modalCompany.value = this.currentCompany;
            this.filters.company = this.currentCompany;
        }
        
        // Add event listener to update placeholder when company changes
        if (modalCompany) {
            modalCompany.addEventListener('change', () => {
                const modalReportTitle = root_element.querySelector('#modal-report-title');
                if (modalReportTitle) {
                    const selectedCompany = this.companies.find(c => c.name === modalCompany.value);
                    if (selectedCompany) {
                        const companyDisplayName = selectedCompany.company_name || selectedCompany.name;
                        modalReportTitle.placeholder = `Annual GHG Emissions and Reductions Report for ${companyDisplayName}`;
                    } else {
                        modalReportTitle.placeholder = 'Annual GHG Emissions and Reductions Report for [company]';
                    }
                }
            });
        }
    }

    renderReportsTable() {
        const tbody = root_element.querySelector('#reports-tbody');
        const noReports = root_element.querySelector('#no-reports');
        
        if (!tbody || !noReports) return;
        
        if (this.reports.length === 0) {
            tbody.innerHTML = '';
            noReports.classList.remove('hidden');
            return;
        }
        
        noReports.classList.add('hidden');
        
        tbody.innerHTML = this.reports.map(report => `
            <tr data-report-name="${report.name}">
                <td>
                    <strong>${this.escapeHtml(report.report_title || 'Untitled')}</strong>
                    <br><small style="color: #666;">${report.name}</small>
                </td>
                <td>${this.escapeHtml(report.organization_name || 'N/A')}</td>
                <td>${report.period_from ? this.formatDate(report.period_from) : 'N/A'}</td>
                <td>${report.period_to ? this.formatDate(report.period_to) : 'N/A'}</td>
                <td>
                    <span class="status-badge status-${this.getStatusClass(report.docstatus)}">
                        ${this.getStatusText(report.docstatus)}
                    </span>
                </td>
                <td>${this.formatDate(report.creation)}</td>
                <td>
                                        <div style="display: flex; gap: 6px; align-items: center;">
                        <button class="btn btn-sm btn-success generate-pdf-btn" data-report-name="${report.name}" title="Regenerate and download PDF">
                            <i class="fas fa-sync-alt"></i> Regenerate
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getStatusClass(docstatus) {
        switch (docstatus) {
            case 0: return 'draft';
            case 1: return 'submitted';
            case 2: return 'approved';
            default: return 'draft';
        }
    }

    getStatusText(docstatus) {
        switch (docstatus) {
            case 0: return 'Draft';
            case 1: return 'Submitted';
            case 2: return 'Approved';
            default: return 'Draft';
        }
    }



    async generatePDFResponse(reportName) {
        // Always generate new PDF to avoid field permission issues
        console.log('Generating PDF for report:', reportName);
        try {
            const response = await this.makeRequest('climoro_onboarding.climoro_onboarding.doctype.ghg_report.ghg_report.generate_ghg_report_pdf', {
                doctype: 'GHG Report',
                name: reportName
            });
            return response;
        } catch (error) {
            console.log('Custom method not available, trying standard method...');
            // Fallback to standard generate_pdf method
            const response = await this.makeRequest('frappe.client.call', {
                method: 'climoro_onboarding.climoro_onboarding.doctype.ghg_report.ghg_report.GHGReport.generate_pdf',
                args: { name: reportName }
            });
            return response;
        }
    }

    async generatePDF(reportName) {
        try {
            console.log('Downloading PDF for report:', reportName);
            this.showLoadingOverlay(true);
            
            const response = await this.generatePDFResponse(reportName);

            console.log('PDF generation response:', response);
            
            if (response.message && response.message.success) {
                this.showMessage('PDF regenerated and download started!', 'success');
                
                // Download the PDF
                if (response.message.file_url) {
                    const link = document.createElement('a');
                    link.href = response.message.file_url;
                    link.download = response.message.file_name || 'GHG_Report.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Also open PDF in new tab for viewing
                    setTimeout(() => {
                        window.open(response.message.file_url, '_blank');
                    }, 500); // Small delay to ensure download starts first
                } else {
                    console.log('No file URL in response, response structure:', response.message);
                    this.showMessage('PDF generated but download link not available', 'error');
                }
            } else {
                const errorMsg = response.message?.message || response.exc || 'Error generating PDF';
                console.error('PDF generation failed:', errorMsg);
                this.showMessage(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            this.showMessage('Error generating PDF', 'error');
        } finally {
            this.showLoadingOverlay(false);
        }
    }

    async createAndGenerateReport(formData) {
        try {
            this.showLoadingOverlay(true);
            
            // Create new GHG Report
            const reportData = {
                doctype: 'GHG Report',
                report_title: formData.reportTitle,
                organization_name: formData.company,
                period_from: formData.periodFrom,
                period_to: formData.periodTo,
                date_of_report: new Date().toISOString().split('T')[0], // Current date
                version: '1.0', // Default version
                prepared_by: this.currentUser ? (this.currentUser.full_name || this.currentUser.name) : 'System',
                base_year: new Date(formData.periodTo).getFullYear() // Year from end date
            };

            const createResponse = await this.makeRequest('frappe.client.insert', {
                doc: reportData
            });

            if (createResponse.message) {
                const reportName = createResponse.message.name;
                
                // Generate PDF for the new report
                const pdfResponse = await this.makeRequest('climoro_onboarding.climoro_onboarding.doctype.ghg_report.ghg_report.generate_ghg_report_pdf', {
                    doctype: 'GHG Report',
                    name: reportName
                });

                if (pdfResponse.message && pdfResponse.message.success) {
                    this.showMessage('Report created and PDF generated successfully!', 'success');
                    
                    // Download the PDF
                    if (pdfResponse.message.file_url) {
                        const link = document.createElement('a');
                        link.href = pdfResponse.message.file_url;
                        link.download = pdfResponse.message.file_name || 'GHG_Report.pdf';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                    
                    // Refresh reports list
                    await this.loadReports();
                    this.closeModal();
                } else {
                    this.showMessage('Report created but PDF generation failed', 'error');
                }
            } else {
                this.showMessage('Error creating report', 'error');
            }
        } catch (error) {
            console.error('Error creating and generating report:', error);
            this.showMessage('Error creating report', 'error');
        } finally {
            this.showLoadingOverlay(false);
        }
    }



    setupDynamicEventListeners() {
        // Use event delegation for dynamically created buttons
        const tableContainer = root_element.querySelector('#reports-table');
        if (tableContainer) {
            tableContainer.addEventListener('click', (e) => {
                const target = e.target;
                
                // Handle Regenerate PDF button clicks
                if (target.closest('.generate-pdf-btn')) {
                    const button = target.closest('.generate-pdf-btn');
                    const reportName = button.getAttribute('data-report-name');
                    if (reportName) {
                        this.generatePDF(reportName);
                    }
                }
            });
        }
    }

    setupEventListeners() {
        // Filter events
        const applyFiltersBtn = root_element.querySelector('#apply-filters');
        const clearFiltersBtn = root_element.querySelector('#clear-filters');
        const refreshReportsBtn = root_element.querySelector('#refresh-reports');
        const generateNewReportBtn = root_element.querySelector('#generate-new-report');

        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }

        if (refreshReportsBtn) {
            refreshReportsBtn.addEventListener('click', () => this.loadReports());
        }

        if (generateNewReportBtn) {
            generateNewReportBtn.addEventListener('click', () => this.openModal());
        }

        // Modal events
        const closeModalBtn = root_element.querySelector('#close-modal');
        const cancelGenerateBtn = root_element.querySelector('#cancel-generate');
        const submitGenerateBtn = root_element.querySelector('#submit-generate');

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeModal());
        }

        if (cancelGenerateBtn) {
            cancelGenerateBtn.addEventListener('click', () => this.closeModal());
        }

        if (submitGenerateBtn) {
            submitGenerateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submitGenerateForm();
            });
        }

        // Close modal on outside click
        const generateModal = root_element.querySelector('#generate-modal');
        if (generateModal) {
            generateModal.addEventListener('click', (e) => {
                if (e.target.id === 'generate-modal') {
                    this.closeModal();
                }
            });
        }

        // Form submission
        const generateForm = root_element.querySelector('#generate-form');
        if (generateForm) {
            generateForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitGenerateForm();
            });
        }
        
        // Add event listeners for dynamically created buttons
        this.setupDynamicEventListeners();
    }

    applyFilters() {
        const companyFilter = root_element.querySelector('#company-filter');
        const dateFrom = root_element.querySelector('#date-from');
        const dateTo = root_element.querySelector('#date-to');

        this.filters.company = companyFilter ? companyFilter.value : '';
        this.filters.dateFrom = dateFrom ? dateFrom.value : '';
        this.filters.dateTo = dateTo ? dateTo.value : '';
        
        this.loadReports();
    }

    clearFilters() {
        const companyFilter = root_element.querySelector('#company-filter');
        const dateFrom = root_element.querySelector('#date-from');
        const dateTo = root_element.querySelector('#date-to');

        if (companyFilter) companyFilter.value = '';
        if (dateFrom) dateFrom.value = '';
        if (dateTo) dateTo.value = '';
        
        this.filters = {
            company: '',
            dateFrom: '',
            dateTo: ''
        };
        
        this.loadReports();
    }

    openModal() {
        const modal = root_element.querySelector('#generate-modal');
        if (!modal) return;

        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Set default dates
        const today = new Date();
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        
        const modalPeriodFrom = root_element.querySelector('#modal-period-from');
        const modalPeriodTo = root_element.querySelector('#modal-period-to');
        const modalCompany = root_element.querySelector('#modal-company');

        if (modalPeriodFrom) modalPeriodFrom.value = this.formatDateForInput(yearStart);
        if (modalPeriodTo) modalPeriodTo.value = this.formatDateForInput(yearEnd);
        
        // Set default company for non-admin users
        if (!this.isAdmin && this.currentCompany && modalCompany) {
            modalCompany.value = this.currentCompany;
        }
    }

    closeModal() {
        const modal = root_element.querySelector('#generate-modal');
        if (!modal) return;

        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
        
        // Reset form
        const generateForm = root_element.querySelector('#generate-form');
        if (generateForm) generateForm.reset();
    }

    submitGenerateForm() {
        const modalCompany = root_element.querySelector('#modal-company');
        const modalPeriodFrom = root_element.querySelector('#modal-period-from');
        const modalPeriodTo = root_element.querySelector('#modal-period-to');
        const modalReportTitle = root_element.querySelector('#modal-report-title');

        const data = {
            company: modalCompany ? modalCompany.value : '',
            periodFrom: modalPeriodFrom ? modalPeriodFrom.value : '',
            periodTo: modalPeriodTo ? modalPeriodTo.value : '',
            reportTitle: modalReportTitle ? modalReportTitle.value.trim() : ''
        };
        
        // Validate required fields (title is now optional)
        if (!data.company || !data.periodFrom || !data.periodTo) {
            this.showMessage('Please fill in all required fields (Company, Period From, Period To)', 'error');
            return;
        }
        
        if (new Date(data.periodFrom) > new Date(data.periodTo)) {
            this.showMessage('Start date must be before end date', 'error');
            return;
        }
        
        // Generate default title if none provided
        if (!data.reportTitle) {
            // Find company name from companies list
            const selectedCompany = this.companies.find(c => c.name === data.company);
            const companyDisplayName = selectedCompany ? (selectedCompany.company_name || selectedCompany.name) : data.company;
            data.reportTitle = `Annual GHG Emissions and Reductions Report for ${companyDisplayName}`;
        }
        
        this.createAndGenerateReport(data);
    }

    updateUI() {
        // Update user info display
        const userName = root_element.querySelector('#user-name');
        const userCompany = root_element.querySelector('#user-company');

        if (this.currentUser && userName) {
            userName.textContent = this.currentUser.full_name || this.currentUser.name;
        }
        
        if (userCompany) {
            userCompany.textContent = this.currentCompany || 'No Company';
        }
        
        // Update company filter visibility for non-admin users
        if (!this.isAdmin && this.currentCompany) {
            const companyFilter = root_element.querySelector('#company-filter');
            if (companyFilter) {
                companyFilter.disabled = true;
                companyFilter.title = 'Company filter is disabled for your role';
            }
        }
    }

    showLoading(show) {
        const loading = root_element.querySelector('#loading');
        const table = root_element.querySelector('#reports-table');
        
        if (show) {
            if (loading) loading.classList.remove('hidden');
            if (table) table.style.opacity = '0.5';
        } else {
            if (loading) loading.classList.add('hidden');
            if (table) table.style.opacity = '1';
        }
    }

    showLoadingOverlay(show) {
        const overlay = root_element.querySelector('#loading-overlay');
        
        if (!overlay) return;

        if (show) {
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.add('show'), 10);
        } else {
            overlay.classList.remove('show');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
    }

    showMessage(message, type = 'info') {
        // Use Frappe's built-in notification system if available
        if (frappe && frappe.show_alert) {
            frappe.show_alert({
                message: message,
                indicator: type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue'
            });
            return;
        }

        // Fallback to custom message system
        const container = root_element.querySelector('#message-container');
        if (!container) return;

        const messageEl = document.createElement('div');
        messageEl.className = `message ${type}`;
        messageEl.textContent = message;
        
        container.appendChild(messageEl);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 5000);
    }

    async makeRequest(method, args) {
        return new Promise((resolve, reject) => {
            frappe.call({
                method: method,
                args: args,
                callback: resolve,
                error: reject
            });
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }
}

// Initialize the viewer when the block is ready
function initGHGReportsViewer() {
    // Check if the block exists and frappe is available
    if (typeof root_element !== 'undefined' && typeof frappe !== 'undefined' && !ghgReportsViewer) {
        // Wait a bit for the DOM to be fully ready
        setTimeout(() => {
            const block = root_element.querySelector('.ghg-reports-viewer-block');
            if (block) {
                ghgReportsViewer = new GHGReportsViewer();
                console.log('GHG Reports Viewer initialized successfully');
            }
        }, 100);
    }
}

// Initialize when the script loads
initGHGReportsViewer();

// Also try to initialize after a short delay to ensure everything is ready
setTimeout(initGHGReportsViewer, 500);

// For Frappe Custom HTML Blocks, the script runs when the block is rendered
// so we don't need to wait for DOMContentLoaded
