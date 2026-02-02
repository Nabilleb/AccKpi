// Global variables
let allWorkflows = [];
let filteredWorkflows = [];
let currentPage = 1;
const rowsPerPage = 10;
let sortColumn = 'HdrID';
let sortDirection = 'asc';
let debounceTimer;
let pendingAction = null;

// DOM elements
const searchInput = document.getElementById('searchInput');
const projectFilter = document.getElementById('projectFilter');
const processFilter = document.getElementById('processFilter');
const statusFilter = document.getElementById('statusFilter');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const resetNoResultsBtn = document.getElementById('resetNoResultsBtn');
const exportBtn = document.getElementById('exportBtn');
const workflowTableBody = document.getElementById('workflowTableBody');
const noResultsMessage = document.getElementById('noResultsMessage');
const loadingIndicator = document.getElementById('loadingIndicator');
const pageInfo = document.getElementById('pageInfo');
const paginationControls = document.getElementById('paginationControls');
const statsContainer = document.getElementById('statsContainer');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const confirmationModal = document.getElementById('confirmationModal');
const closeModal = document.getElementById('closeModal');
const cancelAction = document.getElementById('cancelAction');
const confirmAction = document.getElementById('confirmAction');
const modalText = document.getElementById('modalText');
const form = document.getElementById('workflow-form');
const alertMessage = document.getElementById('alert-message');
const alertText = document.getElementById('alert-text');
const mobileAddBtn = document.getElementById('mobileAddBtn');
const mobileAddBtnBottom = document.getElementById('mobileAddBtnBottom');

// Auto-logout disabled - was causing random page refreshes
// setTimeout(() => {
//   window.location.href = "/login";
// }, 5 * 60 * 1000);
  
// Initialize the dashboard
document.addEventListener("DOMContentLoaded", async () => {
    await loadWorkflowData();
    setupEventListeners();
    updateStats();
    updateTable();
    updatePagination();
    attachTableEventListeners();
    
    // Auto-populate the selected project in the form
    initializeProjectSelection();
    
    // Show/hide mobile add button based on screen size
    toggleMobileAddButton();
    window.addEventListener('resize', toggleMobileAddButton);
    
    // Listen for payment completion events from userpage.js
    window.addEventListener('paymentCompleted', async (event) => {
        const { workFlowHdrId } = event.detail;
        console.log(`📡 Received paymentCompleted event for workflow ${workFlowHdrId}`);
        
        // Refresh the specific workflow's payment steps
        const workflow = allWorkflows.find(w => w.HdrID === workFlowHdrId);
        if (workflow) {
            try {
                const paymentRes = await fetch(`/api/workflow-steps/${workFlowHdrId}`);
                if (paymentRes.ok) {
                    const freshPaymentSteps = await paymentRes.json();
                    workflow.paymentSteps = freshPaymentSteps;
                    
                    // Log the fresh data
                    const completedCount = freshPaymentSteps.filter(step => !step.isActive).length;
                    const totalCount = freshPaymentSteps.length;
                    console.log(`🔄 Refreshed payment steps for workflow ${workFlowHdrId}`);
                    console.log(`   Total payments: ${totalCount}`);
                    console.log(`   Completed payments: ${completedCount}`);
                    console.log(`   Payment steps data:`, freshPaymentSteps);
                    
                    // Re-render the table to show updated payment status
                    console.log(`🎨 Re-rendering table...`);
                    updateTable();
                    updateStats();
                    updatePagination();
                    console.log(`✅ Dashboard fully updated with new payment status`);
                } else {
                    console.error(`❌ Payment steps response not ok:`, paymentRes.status);
                }
            } catch (err) {
                console.error(`❌ Failed to refresh payment steps:`, err);
            }
        } else {
            console.warn(`⚠️ Workflow ${workFlowHdrId} not found in allWorkflows`);
        }
    });
});

// Toggle mobile add button visibility
function toggleMobileAddButton() {
    if (window.innerWidth <= 768) {
        mobileAddBtn.style.display = 'flex';
        mobileAddBtnBottom.style.display = 'flex';
    } else {
        mobileAddBtn.style.display = 'none';
        mobileAddBtnBottom.style.display = 'none';
    }
}

// Initialize project selection from login session
function initializeProjectSelection() {
    const selectedProjectIdInput = document.getElementById('selectedProjectID');
    const projectIdSelect = document.getElementById('project-id');
    const autoSelectToggle = document.getElementById('autoSelectToggle');
    
    if (selectedProjectIdInput && projectIdSelect && autoSelectToggle) {
        const selectedProjectId = selectedProjectIdInput.value;
        
        // Check if user has auto-select enabled in localStorage
        const autoSelectEnabled = localStorage.getItem('autoSelectProject') === 'true';
        
        // Set the toggle checkbox state
        autoSelectToggle.checked = autoSelectEnabled;
        
        // If auto-select is enabled and we have a project ID, apply it
        if (autoSelectEnabled && selectedProjectId) {
            applyAutoSelect(projectIdSelect, selectedProjectId);
        }
        
        // Add change listener to toggle
        autoSelectToggle.addEventListener('change', (e) => {
            localStorage.setItem('autoSelectProject', e.target.checked);
            
            if (e.target.checked && selectedProjectId) {
                // Enable auto-select
                applyAutoSelect(projectIdSelect, selectedProjectId);
            } else {
                // Disable auto-select
                removeAutoSelect(projectIdSelect);
            }
        });
    }
}

// Apply auto-select styling and disable the field
function applyAutoSelect(projectIdSelect, selectedProjectId) {
    projectIdSelect.value = selectedProjectId;
    
    // Use pointer-events instead of disabled to keep value in form submission
    projectIdSelect.style.pointerEvents = 'none';
    projectIdSelect.style.backgroundColor = '#f3f4f6';
    projectIdSelect.style.opacity = '0.8';
    projectIdSelect.setAttribute('data-auto-selected', 'true');
    
    // Add visual indicator
    const projectLabel = document.querySelector('label[for="project-id"]');
    if (projectLabel && !projectLabel.querySelector('.auto-selected-badge')) {
        const badge = document.createElement('span');
        badge.className = 'auto-selected-badge';
        badge.textContent = ' (Auto-selected)';
        badge.style.fontSize = '0.75rem';
        badge.style.color = '#10b981';
        badge.style.marginLeft = '0.5rem';
        projectLabel.appendChild(badge);
    }
}

// Remove auto-select styling and enable the field
function removeAutoSelect(projectIdSelect) {
    projectIdSelect.style.pointerEvents = '';
    projectIdSelect.style.backgroundColor = '';
    projectIdSelect.style.opacity = '';
    projectIdSelect.removeAttribute('data-auto-selected');
    
    // Remove badge
    const projectLabel = document.querySelector('label[for="project-id"]');
    const badge = projectLabel?.querySelector('.auto-selected-badge');
    if (badge) {
        badge.remove();
    }
    
    // Reset the value to empty
    projectIdSelect.value = '';
}

// Load workflow data from API
async function loadWorkflowData() {
    try {
        showLoading();
        
        // Show skeleton loading
        showSkeletonLoading();
        
        // Add cache busting parameter to force fresh data
        const fetchUrl = "/api/workFlowDashData?t=" + new Date().getTime();
        console.log("🔄 Fetching workflow data from:", fetchUrl);
        
        const response = await fetch(fetchUrl);
        console.log("📡 API Response status:", response.status, response.statusText);
        
        if (!response.ok) {
            console.error("❌ API Error:", response.status, response.statusText);
            throw new Error("Failed to fetch data");
        }
        
        allWorkflows = await response.json();
        console.log("✅ Loaded workflows count:", allWorkflows.length);
        console.log("📊 Loaded workflows data:", allWorkflows);
        
        // Check if there are no workflows at all
        if (allWorkflows.length === 0) {
            console.warn("⚠️ No workflows returned from API");
            document.getElementById('noResultsText').innerHTML = `
                <strong>No workflows available</strong><br>
                <span class="text-small text-light">
                    <!-- Commented out - No longer require sub packages to enable workflows
                    Workflows are only available for packages that have sub packages defined. 
                    Please add sub packages to enable workflows.
                    -->
                </span>
            `;
        }
        
        // Fetch payment steps for each workflow
        console.log("🔄 Fetching payment steps for each workflow...");
        for (let workflow of allWorkflows) {
            try {
                const paymentRes = await fetch(`/api/workflow-steps/${workflow.HdrID}`);
                if (paymentRes.ok) {
                    workflow.paymentSteps = await paymentRes.json();
                    console.log(`  ✅ Workflow ${workflow.HdrID}: ${workflow.paymentSteps.length} payment steps`);
                    
                    // Log detailed payment step info
                    workflow.paymentSteps.forEach((step, idx) => {
                        console.log(`     Step ${idx + 1}: stepNumber=${step.stepNumber}, isActive=${step.isActive}, data:`, step);
                    });
                } else {
                    workflow.paymentSteps = [];
                    console.log(`  ⚠️ Workflow ${workflow.HdrID}: No payment steps`);
                }
            } catch (err) {
                console.error(`  ❌ Failed to fetch payment steps for workflow ${workflow.HdrID}:`, err);
                workflow.paymentSteps = [];
            }
        }
        
        // Filter out Blocked and In Progress statuses from the data
        const beforeFilter = allWorkflows.length;
        allWorkflows = allWorkflows.filter(workflow => 
            workflow.Status === 'Pending' || workflow.Status === 'Completed'
        );
        console.log(`🔍 Filtered workflows: ${beforeFilter} → ${allWorkflows.length}`);
        
        filteredWorkflows = [...allWorkflows];
        
        hideLoading();
    } catch (err) {
        console.error("Failed to load workflow dashboard data", err);
        hideLoading();
        showError("Failed to load data. Please try again.");
    }
}

// Show skeleton loading while data is being fetched
function showSkeletonLoading() {
    const skeletonRows = Array(5).fill().map(() => `
        <tr>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-badge"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-text"></div></td>
            <td><div class="skeleton skeleton-text skeleton-small"></div></td>
        </tr>
    `).join('');
    
    workflowTableBody.innerHTML = skeletonRows;
}

// Calculate and display statistics
function updateStats() {
    if (!allWorkflows.length) return;

    const totalWorkflows = allWorkflows.length;
    const completedCount = allWorkflows.filter(w => w.Status === 'Completed').length;
    const pendingCount = allWorkflows.filter(w => w.Status === 'Pending').length;
    const completionRate = totalWorkflows > 0 ? Math.round((completedCount / totalWorkflows) * 100) : 0;

    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${totalWorkflows}</div>
            <div class="stat-label">Total Workflows</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${completedCount}</div>
            <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${pendingCount}</div>
            <div class="stat-label">Pending</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${completionRate}%</div>
            <div class="stat-label">Completion Rate</div>
            <div class="progress-bar">
                <div class="progress-fill" data-progress="${completionRate}"></div>
            </div>
            <div class="progress-labels">
                <span>0%</span>
                <span>100%</span>
            </div>
        </div>
    `;

    // Set the progress width using custom property
    const progressFill = statsContainer.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.setProperty('--progress-width', completionRate + '%');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Search input with debounce
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            applyFilters();
            updateStats();
        }, 300);
    });
    
    // Filter dropdowns (project filter removed - uses selected project from login)
    processFilter.addEventListener('change', () => {
        applyFilters();
        updateStats();
    });
    statusFilter.addEventListener('change', () => {
        applyFilters();
        updateStats();
    });
    
    // Reset filters button
    resetFiltersBtn.addEventListener('click', resetFilters);
    resetNoResultsBtn.addEventListener('click', resetFilters);
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = '/logout';
        });
    }
    
    // Mobile add buttons
    mobileAddBtn.addEventListener('click', () => {
        window.location.href = '/workflow/new';
    });
    mobileAddBtnBottom.addEventListener('click', () => {
        window.location.href = '/workflow/new';
    });
    
    // Export button
    exportBtn.addEventListener('click', () => {
        showConfirmation(
            "Export Workflows",
            "Are you sure you want to export the current filtered workflows to CSV?",
            exportData
        );
    });

    // Sub Package button (Special User only)
    const subpackbtn = document.getElementById('subpackbtn');
    if (subpackbtn) {
        subpackbtn.addEventListener('click', () => {
            window.location.href = '/subpackage';
        });
    }

    // Add Package button (Special User only)
    const addPackageBtn = document.getElementById('addPackageBtn');
    if (addPackageBtn) {
        addPackageBtn.addEventListener('click', () => {
            window.location.href = '/addPackageForm';
        });
    }
    
    // Sort icons
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const column = e.currentTarget.getAttribute('data-sort');
            
            // Reset all sort icons
            document.querySelectorAll('.sort-icon').forEach(i => {
                i.classList.remove('active', 'asc');
            });
            
            // Toggle sort direction if same column
            if (sortColumn === column) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortDirection = 'asc';
            }
            
            // Update current sort icon
            e.currentTarget.classList.add('active');
            if (sortDirection === 'desc') {
                e.currentTarget.classList.add('asc');
            }
            
            updateTable();
            updatePagination();
        });
    });

    // Modal controls
    closeModal.addEventListener('click', hideModal);
    cancelAction.addEventListener('click', hideModal);
    confirmAction.addEventListener('click', () => {
        if (pendingAction) {
            pendingAction();
            pendingAction = null;
        }
        hideModal();
    });

    // Form submission
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const processId = document.getElementById('process-id').value;
            const projectId = document.getElementById('project-id').value;
            const packageId = document.getElementById('package-id').value;
            const status = document.getElementById('status').value;

            console.log("📝 Form submitted with values:");
            console.log("  - Process ID:", processId);
            console.log("  - Project ID:", projectId);
            console.log("  - Package ID:", packageId);
            console.log("  - Status:", status);

            try {
                showLoading();
                const payloadData = {
                    processID: processId,
                    projectID: projectId,
                    packageID: packageId,
                    status
                };
                
                console.log("📤 Sending payload to /api/workflows:", payloadData);
                
                const res = await fetch('/api/workflows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadData)
                });

                console.log("📡 API Response status:", res.status, res.statusText);

                if (!res.ok) {
                    const errorData = await res.json();
                    console.error("❌ Server error:", errorData);
                    throw new Error(errorData.error || 'Server error');
                }

                const responseData = await res.json();
                console.log("✅ Workflow created successfully:", responseData);

                showToast('Workflow added successfully!', 'success');
                form.reset();
                
                // Refresh the data
                console.log("🔄 Refreshing workflow data after creation...");
                await loadWorkflowData();
                updateStats();
                updateTable();
                updatePagination();
            } catch (error) {
                console.error('❌ Error adding workflow:', error);
                showToast('Error adding workflow: ' + error.message, 'error');
                form.reset();
                
                // Refresh the data
                console.log("🔄 Refreshing workflow data after error...");
                await loadWorkflowData();
                updateStats();
                updateTable();
                updatePagination();
            } finally {
                hideLoading();
            }
        });
    }
}

// Show confirmation modal
function showConfirmation(title, text, action) {
    document.querySelector('.modal-header h3').textContent = title;
    modalText.textContent = text;
    pendingAction = action;
    confirmationModal.style.display = 'flex';
}

// Hide modal
function hideModal() {
    confirmationModal.style.display = 'none';
}

// Show toast notification
function showToast(message, type = 'success') {
    toast.className = `toast toast-${type}`;
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Apply all filters
function applyFilters() {
    currentPage = 1;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const processValue = processFilter.value.trim();
    const statusValue = statusFilter.value.trim();
    
    console.log('Filter values:', { processValue, statusValue, searchTerm });
    
    filteredWorkflows = allWorkflows.filter(workflow => {
        const matchesSearch = !searchTerm || 
            (workflow.HdrID && workflow.HdrID.toString().toLowerCase().includes(searchTerm)) ||
            (workflow.ProcessName && workflow.ProcessName.toLowerCase().includes(searchTerm)) ||
            (workflow.PackageName && workflow.PackageName.toLowerCase().includes(searchTerm)) ||
            (workflow.ProjectName && workflow.ProjectName.toLowerCase().includes(searchTerm)) ||
            (workflow.Status && workflow.Status.toLowerCase().includes(searchTerm));
        
        // Process filter: compare ProcessName as strings (exact match)
        const matchesProcess = !processValue || (workflow.ProcessName && workflow.ProcessName === processValue);
        
        // Status filter: compare Status as strings (exact match)
        const matchesStatus = !statusValue || (workflow.Status && workflow.Status === statusValue);
        
        return matchesSearch && matchesProcess && matchesStatus;
    });
    
    console.log('Filtered workflows count:', filteredWorkflows.length);
    updateTable();
    updatePagination();
}

// Attach event listeners using event delegation
function attachTableEventListeners() {
    workflowTableBody.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('.action-btn');
        const row = e.target.closest('tr.clickable');
        
        if (actionBtn) {
            // Handle action button click
            e.stopPropagation();
            const action = actionBtn.getAttribute('data-action');
            const hdrId = actionBtn.closest('tr').getAttribute('data-hdrid');
            
            if (action === 'view') {
                window.location.href = `/userpage/${hdrId}`;
            }
        } else if (row) {
            // Handle row click
            const hdrId = row.getAttribute('data-hdrid');
            window.location.href = `/userpage/${hdrId}`;
        }
    });
}

// Reset all filters
function resetFilters() {
    searchInput.value = '';
    processFilter.value = '';
    statusFilter.value = '';
    
    applyFilters();
    updateStats();
}

// Sort workflows based on current sort column and direction
function sortWorkflows() {
    filteredWorkflows.sort((a, b) => {
        let valueA = a[sortColumn];
        let valueB = b[sortColumn];
        
        // Handle null/undefined values
        if (valueA === null || valueA === undefined) valueA = '';
        if (valueB === null || valueB === undefined) valueB = '';
        
        // Numeric sorting for HdrID
        if (sortColumn === 'HdrID') {
            return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        
        // Date sorting for date fields
        if (sortColumn.includes('Date')) {
            const dateA = valueA ? new Date(valueA) : new Date(0);
            const dateB = valueB ? new Date(valueB) : new Date(0);
            return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }
        
        // Default string sorting
        return sortDirection === 'asc' 
            ? String(valueA).localeCompare(String(valueB))
            : String(valueB).localeCompare(String(valueA));
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    
    // Handle date string by extracting just the date portion (YYYY-MM-DD)
    // This avoids timezone offset issues
    let dateOnly = dateStr;
    if (dateStr.includes('T')) {
        // If it has time component, extract just the date part
        dateOnly = dateStr.split('T')[0];
    }
    
    // Parse the date string as YYYY-MM-DD and create date in UTC
    const [year, month, day] = dateOnly.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Update the table with filtered and sorted data
function updateTable() {
    sortWorkflows();
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedWorkflows = filteredWorkflows.slice(startIndex, endIndex);
    
    if (filteredWorkflows.length === 0) {
        noResultsMessage.style.display = 'block';
        workflowTableBody.innerHTML = '';
    } else {
        noResultsMessage.style.display = 'none';
        workflowTableBody.innerHTML = paginatedWorkflows.map(workflow => {
            // Determine final status - check if all payments are complete
            let displayStatus = workflow.Status;
            
            console.log(`\n🔍 Checking workflow ${workflow.HdrID}:`);
            console.log(`   paymentSteps exists: ${!!workflow.paymentSteps}`);
            console.log(`   paymentSteps type: ${Array.isArray(workflow.paymentSteps) ? 'Array' : typeof workflow.paymentSteps}`);
            console.log(`   paymentSteps data:`, workflow.paymentSteps);
            
            // Check if workflow has payment steps and all are complete
            if (workflow.paymentSteps && Array.isArray(workflow.paymentSteps) && workflow.paymentSteps.length > 0) {
                // Count completed payments (those that have StepFinished set)
                const completedPayments = workflow.paymentSteps.filter(step => step.StepFinished).length;
                const totalPayments = workflow.paymentSteps.length;
                
                console.log(`   Total: ${totalPayments}, Completed: ${completedPayments}`);
                
                // If all payments are complete, mark as Completed
                if (completedPayments === totalPayments) {
                    displayStatus = 'Completed';
                    console.log(`   ✅ All payments complete! Status: ${displayStatus}`);
                } else {
                    console.log(`   ⏳ ${completedPayments}/${totalPayments} payments complete`);
                }
            } else {
                console.log(`   ⚠️ No payment steps data`);
            }
            
            return `
            <tr class="clickable" data-hdrid="${workflow.HdrID}">
                <td>${workflow.HdrID || '-'}</td>
                <td>${workflow.ProcessName || '-'}</td>
                <td>${workflow.PackageName || '-'}</td>
                <td>${workflow.ProjectName || '-'}</td>
                <td>${workflow.SupplierContractorName || '-'}</td>
                <td>
                    <span class="status-badge status-${displayStatus ? displayStatus.toLowerCase().replace(' ', '-') : ''}">
                        ${getStatusIcon(displayStatus)}
                        ${displayStatus || '-'}
                    </span>
                </td>
                <td>${formatDate(workflow.createdDate)}</td>
                <td>${formatDate(workflow.startDate)}</td>
                <td>${formatDate(workflow.completionDate)}</td>
                <td>${workflow.DaysDone === 0 ? 1 : (workflow.DaysDone || '-')}</td>
                <td>
                    <button class="btn btn-outline btn-sm action-btn" data-action="view" title="View details">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
                        </svg>
                        View
                    </button>
                </td>
            </tr>
        `}).join('');
        
        // Attach event listeners using event delegation on the table body
        attachTableEventListeners();
    }
}

// Get appropriate icon for status badge
function getStatusIcon(status) {
    if (!status) return '';
    
    const icons = {
        'Pending': '<svg class="badge-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM13 7H11V12.414L15.293 16.707L16.707 15.293L13 11.586V7Z" fill="currentColor"/></svg>',
        'Completed': '<svg class="badge-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/></svg>'
    };
    
    return icons[status] || '';
}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredWorkflows.length / rowsPerPage);
    
    // Update page info text
    const startItem = filteredWorkflows.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const endItem = Math.min(currentPage * rowsPerPage, filteredWorkflows.length);
    pageInfo.textContent = `Showing ${startItem} to ${endItem} of ${filteredWorkflows.length} entries`;
    
    // Clear existing pagination controls
    paginationControls.innerHTML = '';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'page-btn';
    prevButton.disabled = currentPage === 1;
    prevButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.41 16.59L10.83 12L15.41 7.41L14 6L8 12L14 18L15.41 16.59Z" fill="currentColor"/>
        </svg>
    `;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateTable();
            updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    paginationControls.appendChild(prevButton);
    
    // Page number buttons
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust if we don't have enough pages
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // First page and ellipsis if needed
    if (startPage > 1) {
        const firstPageButton = document.createElement('button');
        firstPageButton.className = 'page-btn';
        firstPageButton.textContent = '1';
        firstPageButton.addEventListener('click', () => {
            currentPage = 1;
            updateTable();
            updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        paginationControls.appendChild(firstPageButton);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '0 8px';
            ellipsis.style.display = 'flex';
            ellipsis.style.alignItems = 'center';
            paginationControls.appendChild(ellipsis);
        }
    }
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            currentPage = i;
            updateTable();
            updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        paginationControls.appendChild(pageButton);
    }
    
    // Last page and ellipsis if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '0 8px';
            ellipsis.style.display = 'flex';
            ellipsis.style.alignItems = 'center';
            paginationControls.appendChild(ellipsis);
        }
        
        const lastPageButton = document.createElement('button');
        lastPageButton.className = 'page-btn';
        lastPageButton.textContent = totalPages;
        lastPageButton.addEventListener('click', () => {
            currentPage = totalPages;
            updateTable();
            updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        paginationControls.appendChild(lastPageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'page-btn';
    nextButton.disabled = currentPage === totalPages;
    nextButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="currentColor"/>
        </svg>
    `;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            updateTable();
            updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    paginationControls.appendChild(nextButton);
}

// Export data to CSV
function exportData() {
    if (filteredWorkflows.length === 0) {
        showToast('No data to export', 'error');
        return;
    }
    
    // Define CSV headers
    const headers = ['HDR ID', 'Process', 'Package', 'Project', 'Status', 'Created Date', 'Start Date', 'Finished Date'];
    
    // Create CSV rows
    const rows = filteredWorkflows.map(workflow => [
        workflow.HdrID,
        workflow.ProcessName || '',
        workflow.PackageName || '',
        workflow.ProjectName || '',
        workflow.Status || '',
        workflow.createdDate || '',
        workflow.startDate || '',
        workflow.completionDate || ''
    ]);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `workflows_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Export completed successfully', 'success');
}

// Show loading indicator
function showLoading() {
    loadingIndicator.style.display = 'flex';
    noResultsMessage.style.display = 'none';
}

// Hide loading indicator
function hideLoading() {
    loadingIndicator.style.display = 'none';
}

// Show error message
function showError(message) {
    workflowTableBody.innerHTML = `
        <tr>
            <td colspan="9" class="error-cell">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="error-icon">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
                </svg>
                <p>${message}</p>
                <button class="btn btn-outline btn-retry" onclick="loadWorkflowData()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" fill="currentColor"/>
                    </svg>
                    Retry
                </button>
            </td>
        </tr>
    `;
}
