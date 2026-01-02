// Enhance the form with dynamic behavior
document.addEventListener('DOMContentLoaded', function() {
  const isDateFixedSelect = document.getElementById('IsDateFixed');
  const plannedDateInput = document.getElementById('PlannedDate');
  
  // Set default datetime to now (rounded to nearest 15 minutes)
  const now = new Date();
  const minutes = Math.ceil(now.getMinutes() / 15) * 15;
  now.setMinutes(minutes);
  now.setSeconds(0);
  
  // Format for datetime-local input
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  
  plannedDateInput.value = `${year}-${month}-${day}T${hours}:${mins}`;
  
  // Toggle date field based on IsDateFixed selection
  
  
  isDateFixedSelect.addEventListener('change', toggleDateField);
  toggleDateField(); // Initialize
  
  // Form validation
  const form = document.querySelector('form');
  form.addEventListener('submit', function(e) {
    let isValid = true;
    
    // Check required fields
    document.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        field.style.borderColor = 'var(--danger)';
        isValid = false;
      }
    });
    
    if (!isValid) {
      e.preventDefault();
      alert('Please fill in all required fields');
    }
  });
  
  // Clear error state when typing
  document.querySelectorAll('input, select').forEach(field => {
    field.addEventListener('input', function() {
      if (this.value.trim()) {
        this.style.borderColor = '';
      }
    });
  });
  
  // Cancel button handler
  document.addEventListener('click', function(event) {
    if (event.target.closest('[data-action="cancel-edit-task"]')) {
      window.location.href = '/adminpage';
    }
  });
});
