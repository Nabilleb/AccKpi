const deleteBtn = document.getElementById('deleteBtn');
const deleteModal = document.getElementById('deleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const processId = document.querySelector('input[name="processId"]')?.value || window.processId;
const hasWorkflows = document.querySelector('input[name="hasWorkflows"]')?.value === 'true' || window.hasWorkflows;

deleteBtn.addEventListener('click', () => {
  if (hasWorkflows) {
    alert('Cannot delete this process because it has active workflows. Complete or remove all associated workflows first.');
    return;
  }
  deleteModal.classList.add('active');
});

cancelDeleteBtn.addEventListener('click', () => {
  deleteModal.classList.remove('active');
});

confirmDeleteBtn.addEventListener('click', async () => {
  try {
    const response = await fetch(`/deleteProcess/${processId}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      window.location.href = '/';
    } else {
      alert('Failed to delete process');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error deleting process');
  }
});

// Close modal when clicking outside
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    deleteModal.classList.remove('active');
  }
});

// Form submission with task deletion warning
const editProcessForm = document.getElementById('editProcessForm');
editProcessForm.addEventListener('submit', (e) => {
  const originalDepts = window.currentDeptIds || [];
  const selectedDepts = Array.from(document.querySelectorAll('select[name="Departments"] option:checked'))
    .map(option => parseInt(option.value));
  
  // Check if departments have changed
  const deptsChanged = originalDepts.length !== selectedDepts.length || 
                      !originalDepts.every(d => selectedDepts.includes(d));
  
  if (deptsChanged) {
    const confirmed = confirm(
      '⚠️ WARNING!\n\n' +
      'Changing the workflow departments will DELETE ALL TASKS in this process.\n\n' +
      'You will need to recreate the tasks after saving.\n\n' +
      'Are you sure you want to continue?'
    );
    
    if (!confirmed) {
      e.preventDefault();
      return false;
    }
  }
});
