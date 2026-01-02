document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('addProjectForm');
  const submitBtn = document.getElementById('submitBtn');
  const successToast = new bootstrap.Toast(document.getElementById('successToast'));
  const successModal = new bootstrap.Modal(document.getElementById('successModal'));
  
  // Real-time validation
  form.addEventListener('submit', function(e) {
    if (!form.checkValidity()) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    form.classList.add('was-validated');
  });

  // Enhanced form submission
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    // Set loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Processing...';

    try {
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        // Show success modal
        successModal.show();
        
        // Show success toast
        document.getElementById('toastMessage').textContent = '✓ Project added successfully!';
        successToast.show();
        
        // Redirect after 3 seconds
        setTimeout(() => {
          window.location.href = '/adminpage';
        }, 3000);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add project');
      }
    } catch (error) {
      // Show error message
      alert('Error: ' + error.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Add Project';
    }
  });

  // Auto-focus first field
  document.getElementById('projectName').focus();
  
  // Back button handler
  document.addEventListener('click', function(event) {
    if (event.target.closest('[data-action="go-back"]')) {
      window.history.back();
    }
  });
});
