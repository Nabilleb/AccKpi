document.addEventListener('DOMContentLoaded', function() {
  const deleteBtn = document.getElementById('deleteBtn');
  const deleteModal = document.getElementById('deleteModal');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const editProcessForm = document.getElementById('editProcessForm');
  
  // Read from data attributes on body element
  const body = document.body;
  const processId = parseInt(body.dataset.processId) || parseInt(document.querySelector('input[name="processId"]')?.value);
  const hasWorkflows = body.dataset.hasWorkflows === 'true';
  const currentDeptIds = JSON.parse(body.dataset.currentDeptIds || '[]');

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
      console.error('Error deleting process:', error);
      alert('Error deleting process');
    }
    deleteModal.classList.remove('active');
  });

  // Handle modal close when clicking outside
  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      deleteModal.classList.remove('active');
    }
  });

  // Form submission with task deletion warning
  editProcessForm.addEventListener('submit', (e) => {
    const selectedDepts = Array.from(document.querySelectorAll('select[name="Departments"] option:checked'))
      .map(option => parseInt(option.value));
    
    // Check if departments have changed
    const deptsChanged = currentDeptIds.length !== selectedDepts.length || 
                        !currentDeptIds.every(d => selectedDepts.includes(d));
    
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
});
