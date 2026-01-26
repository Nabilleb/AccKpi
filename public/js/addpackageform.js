const form = document.getElementById('add-package-form');
const alertMessage = document.getElementById('alert-message');
const alertText = document.getElementById('alert-text');
const backBtn = document.getElementById('back-btn');
const cancelBtn = document.getElementById('cancel-btn');

// Back button handler
if (backBtn) {
    backBtn.addEventListener('click', () => window.history.back());
}

// Cancel button handler
if (cancelBtn) {
    cancelBtn.addEventListener('click', () => window.history.back());
}

// Auto-select the project from login session
function initializeProjectSelection() {
    const selectedProjectIdInput = document.getElementById('selectedProjectID');
    const projectIdSelect = document.getElementById('project-id');
    const autoSelectToggle = document.getElementById('autoSelectToggle');
    
    console.log('Initializing project selection...');
    console.log('selectedProjectIdInput:', selectedProjectIdInput);
    console.log('projectIdSelect:', projectIdSelect);
    
    if (selectedProjectIdInput && projectIdSelect && autoSelectToggle) {
        const selectedProjectId = selectedProjectIdInput.value;
        console.log('Selected project ID:', selectedProjectId);
        
        // Check if user has auto-select enabled in localStorage
        const autoSelectEnabled = localStorage.getItem('autoSelectProject') === 'true';
        console.log('Auto-select enabled:', autoSelectEnabled);
        
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
    } else {
        console.log('selectedProjectIdInput, projectIdSelect, or autoSelectToggle not found');
    }
}

// Apply auto-select styling and disable the field
function applyAutoSelect(projectIdSelect, selectedProjectId) {
    projectIdSelect.value = selectedProjectId;
    console.log('Set project value to:', selectedProjectId);
    
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
        console.log('Added auto-selected badge');
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
        console.log('Removed auto-selected badge');
    }
    
    // Reset the value to empty
    projectIdSelect.value = '';
}

// Initialize project selection immediately and when page loads
initializeProjectSelection();
document.addEventListener('DOMContentLoaded', initializeProjectSelection);

// Set today's date as default for start date (DATE ONLY, no time to avoid timezone issues)
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
document.getElementById('startDate').value = `${year}-${month}-${day}`;

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        processID: document.getElementById('process-id').value,
        projectID: document.getElementById('project-id').value,
        packageID: document.getElementById('package-id').value,
        startDate: document.getElementById('startDate').value,
        status: document.getElementById('status').value
    };

    // Validation
    // No longer require subpackage creation, but still need to select a package
    if (!formData.processID || !formData.projectID || !formData.packageID) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }
    // Commented out - startDate is now optional
    // if (!formData.startDate) {
    //     showAlert('Please select a start date', 'danger');
    //     return;
    // }

    try {
        const response = await fetch('/addPackageForm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            showAlert('workflow added successfully!', 'success');
            form.reset();
            // Redirect to workflow dashboard after alert
            setTimeout(() => {
                window.location.href = '/workFlowDash';
            }, 3000);
        } else {
            showAlert(data.error || 'Failed to add package. Please try again.', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('An error occurred: ' + error.message, 'danger');
    }
});

function showAlert(message, type = 'success') {
    alertText.textContent = message;
    alertMessage.className = `alert show alert-${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            alertMessage.classList.remove('show');
        }, 3000);
    }
}
