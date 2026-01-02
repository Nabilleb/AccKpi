const form = document.getElementById('subpackageForm');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const alertMessage = document.getElementById('alertMessage');
const alertText = document.getElementById('alertText');

// Show toast notification
function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.classList.remove('hidden', 'toast-error');
    if (type === 'error') {
        toast.classList.add('toast-error');
    } else {
        toast.classList.add('toast-success');
    }
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Show alert message
function showAlert(message, type = 'success') {
    alertText.textContent = message;
    alertMessage.className = `alert alert-${type}`;
    alertMessage.style.display = 'flex';
    
    setTimeout(() => {
        alertMessage.style.display = 'none';
    }, 5000);
}

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        itemDescription: document.getElementById('itemDescription').value,
        packageId: document.getElementById('packageId').value,
        supplierName: document.getElementById('supplierName').value,
        supplierContractorType: document.getElementById('supplierContractorType').value,
        supplierContractorName: document.getElementById('supplierContractorName').value,
        awardValue: document.getElementById('awardValue').value,
        currency: document.getElementById('currency').value
    };

    try {
        const response = await fetch('/api/subpackage/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            // Show success alert
            showAlert('✓ Sub Package added successfully!', 'success');
            showToast('Sub Package added successfully', 'success');
            
            // Reset form
            form.reset();
            
            // Scroll to top to show alert
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Redirect after 3 seconds
            setTimeout(() => {
                window.location.href = '/subpackage';
            }, 3000);
        } else {
            const error = await response.json();
            showAlert(error.message || 'Failed to add sub package', 'error');
            showToast(error.message || 'Failed to add sub package', 'error');
        }
    } catch (err) {
        console.error('Error saving sub package:', err);
        showAlert('An error occurred while saving the sub package', 'error');
        showToast('An error occurred while saving the sub package', 'error');
    }
});

// Form validation on input
const inputs = form.querySelectorAll('.form-control');
inputs.forEach(input => {
    input.addEventListener('change', () => {
        if (input.value.trim()) {
            input.style.borderColor = 'var(--border)';
        }
    });
});
