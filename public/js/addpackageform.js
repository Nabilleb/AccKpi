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

// Set today's date as default for start date
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
document.getElementById('startDate').value = `${year}-${month}-${day}T${hours}:${minutes}`;

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
            showAlert('Package added successfully!', 'success');
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
