document.addEventListener('DOMContentLoaded', function() {
  const deptSelect = document.getElementById('Departments');
  const stepsList = document.getElementById('steps-list');
  const hiddenInputs = document.getElementById('hiddenInputs');
  const selectedOrder = [];
  const processForm = document.getElementById('processForm');
  const stepsError = document.getElementById('stepsError');
  const resetButton = document.getElementById('resetButton');
  const toastContainer = document.getElementById('toastContainer');
  const confirmationModal = document.getElementById('confirmationModal');
  const modalMessage = document.getElementById('modalMessage');
  const modalConfirm = document.getElementById('modalConfirm');
  const modalCancel = document.getElementById('modalCancel');
  const modalClose = document.getElementById('modalClose');
  const loadingOverlay = document.getElementById('loadingOverlay');

  // Auto-redirect after 5 minutes
  setTimeout(() => {
    showToast('info', 'Session Timeout', 'You will be redirected to login page for security reasons.');
    setTimeout(() => {
      window.location.href = "/login";
    }, 3000);
  }, 5 * 60 * 1000);

  // Toast notification function
  function showToast(type, title, message, duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconSvg = '';
    switch(type) {
      case 'success':
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        break;
      case 'error':
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        break;
      case 'warning':
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        break;
      case 'info':
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        break;
    }
    
    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">&times;</button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Trigger reflow to enable animation
    void toast.offsetWidth;
    
    // Add event listener for close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      hideToast(toast);
    });
    
    // Auto hide after duration
    if (duration > 0) {
      setTimeout(() => {
        hideToast(toast);
      }, duration);
    }
    
    return toast;
  }
  
  function hideToast(toast) {
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentNode) {
        toastContainer.removeChild(toast);
      }
    }, 300);
  }
  
  // Show confirmation modal
  function showConfirmation(message, confirmCallback) {
    modalMessage.textContent = message;
    confirmationModal.classList.add('active');
    
    const handleConfirm = () => {
      confirmationModal.classList.remove('active');
      if (typeof confirmCallback === 'function') {
        confirmCallback();
      }
      modalConfirm.removeEventListener('click', handleConfirm);
      modalCancel.removeEventListener('click', handleCancel);
      modalClose.removeEventListener('click', handleCancel);
    };
    
    const handleCancel = () => {
      confirmationModal.classList.remove('active');
      modalConfirm.removeEventListener('click', handleConfirm);
      modalCancel.removeEventListener('click', handleCancel);
      modalClose.removeEventListener('click', handleCancel);
    };
    
    modalConfirm.addEventListener('click', handleConfirm);
    modalCancel.addEventListener('click', handleCancel);
    modalClose.addEventListener('click', handleCancel);
  }
  
  // Show loading indicator
  function showLoading() {
    loadingOverlay.classList.add('active');
  }
  
  // Hide loading indicator
  function hideLoading() {
    loadingOverlay.classList.remove('active');
  }

  // Update styles and display on change
  deptSelect.addEventListener('change', (event) => {
    updateSelectedOrder();
    updateDisplay();
    styleSelectedOptions();
    validateSteps();
    
    // Show toast notification when departments are selected
    if (selectedOrder.length > 0) {
      showToast('info', 'Workflow Updated', `${selectedOrder.length} department(s) selected. Drag to reorder steps.`, 3000);
    }
  });

  function validateSteps() {
    if (selectedOrder.length === 0) {
      stepsList.classList.add('steps-error');
      stepsError.style.display = 'flex';
      return false;
    } else {
      stepsList.classList.remove('steps-error');
      stepsError.style.display = 'none';
      return true;
    }
  }

  function validateForm() {
    let isValid = true;
    
    // Validate process name
    const processName = document.getElementById('ProcessName');
    if (!processName.value.trim()) {
      processName.classList.add('is-invalid');
      document.getElementById('ProcessName-error').style.display = 'block';
      isValid = false;
    } else {
      processName.classList.remove('is-invalid');
      document.getElementById('ProcessName-error').style.display = 'none';
    }
    
    // Validate departments
    if (!validateSteps()) {
      document.getElementById('Departments-error').style.display = 'block';
      isValid = false;
    } else {
      document.getElementById('Departments-error').style.display = 'none';
    }
    
    return isValid;
  }

  // Form submission validation
  processForm.addEventListener('submit', function(e) {
    if (!validateForm()) {
      e.preventDefault();
      
      // Show error toast
      showToast('error', 'Validation Error', 'Please fill all required fields correctly.');
      
      // Scroll to first error
      const firstError = document.querySelector('.is-invalid, .steps-error');
      if (firstError) {
        firstError.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    } else {
      // Show loading indicator on form submission
      showLoading();
      
      // Show success toast after a short delay to simulate processing
      setTimeout(() => {
        showToast('success', 'Process Created', 'Your process has been successfully created.');
      }, 1000);
    }
  });

  // Real-time validation for process name
  document.getElementById('ProcessName').addEventListener('input', function() {
    if (this.value.trim()) {
      this.classList.remove('is-invalid');
      document.getElementById('ProcessName-error').style.display = 'none';
    }
  });

  // Reset button with confirmation
  resetButton.addEventListener('click', function(e) {
    e.preventDefault();
    
    if (document.getElementById('ProcessName').value || document.getElementById('processDesc').value || selectedOrder.length > 0) {
      showConfirmation('Are you sure you want to clear the form? All entered data will be lost.', () => {
        processForm.reset();
        selectedOrder.length = 0;
        updateDisplay();
        showToast('info', 'Form Cleared', 'All form fields have been reset.');
      });
    } else {
      processForm.reset();
      selectedOrder.length = 0;
      updateDisplay();
    }
  });

  function updateSelectedOrder() {
    // Keep the existing order but update selected status
    const selectedValues = Array.from(deptSelect.selectedOptions).map(opt => opt.value);
    
    // Remove unselected items
    for (let i = selectedOrder.length - 1; i >= 0; i--) {
      if (!selectedValues.includes(selectedOrder[i])) {
        selectedOrder.splice(i, 1);
      }
    }
    
    // Add newly selected items to end
    Array.from(deptSelect.selectedOptions).forEach(opt => {
      if (!selectedOrder.includes(opt.value)) {
        selectedOrder.push(opt.value);
      }
    });
  }

  function updateDisplay() {
    if (selectedOrder.length === 0) {
      stepsList.innerHTML = 'No departments selected yet. Selected departments will appear here as workflow steps.';
      stepsList.className = 'empty';
      hiddenInputs.innerHTML = '';
      return;
    }
    
    let html = '<strong>Workflow Steps</strong>';
    hiddenInputs.innerHTML = '';
    
    selectedOrder.forEach((id, idx) => {
      const option = deptSelect.querySelector(`option[value="${id}"]`);
      
      html += `
        <div class="step-item" data-id="${id}">
          <span class="step-number">${idx + 1}</span>
          <span class="step-name">${option.textContent}</span>
          <span class="drag-handle" title="Drag to reorder">☰</span>
        </div>
      `;
      
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = `Steps[${idx}]`;
      input.value = id;
      hiddenInputs.appendChild(input);
    });
    
    stepsList.innerHTML = html;
    stepsList.className = '';
    
    initDragAndDrop();
  }

  function initDragAndDrop() {
    const stepItems = stepsList.querySelectorAll('.step-item');
    
    stepItems.forEach(item => {
      item.setAttribute('draggable', true);
      
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.dataset.id);
        item.classList.add('dragging');
        stepsList.classList.add('drag-over');
      });
      
      item.addEventListener('dragend', () => {
        document.querySelectorAll('.dragging, .drag-over').forEach(el => {
          el.classList.remove('dragging', 'drag-over');
        });
        updateOrderFromDOM();
        
        // Show notification when reordering is complete
        showToast('success', 'Steps Reordered', 'Workflow steps have been updated.', 2000);
      });
    });
    
    stepsList.addEventListener('dragover', e => {
      e.preventDefault();
      const draggingItem = document.querySelector('.dragging');
      const afterElement = getDragAfterElement(stepsList, e.clientY);
      
      if (afterElement) {
        stepsList.insertBefore(draggingItem, afterElement);
      } else {
        stepsList.appendChild(draggingItem);
      }
    });
  }
  
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.step-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function updateOrderFromDOM() {
    const newOrder = Array.from(stepsList.querySelectorAll('.step-item')).map(item => item.dataset.id);
    
    // Update selectedOrder to match DOM order
    selectedOrder.length = 0;
    selectedOrder.push(...newOrder);
    
    // Update select element to match (but don't trigger change event)
    Array.from(deptSelect.options).forEach(opt => {
      opt.selected = selectedOrder.includes(opt.value);
    });
    
    // Update hidden inputs
    updateDisplay();
  }

  // Style selected options on load
  styleSelectedOptions();

  function styleSelectedOptions() {
    Array.from(deptSelect.options).forEach(opt => {
      if (opt.selected) {
        opt.style.backgroundColor = 'var(--primary)';
        opt.style.color = 'var(--white)';
        opt.style.fontWeight = '500';
      } else {
        opt.style.backgroundColor = '';
        opt.style.color = '';
        opt.style.fontWeight = '';
      }
    });
  }

  document.querySelectorAll('.add-task-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const processId = btn.dataset.processId;
      const processName = encodeURIComponent(btn.dataset.processName);
      const steps = JSON.parse(btn.dataset.steps);
      
      if (steps.length === 0) {
        showToast('warning', 'No Steps Defined', 'This process has no workflow steps. Please add steps before creating tasks.');
        return;
      }
      
      window.location.href = `/add-task?processId=${processId}&process=${processName}`;
    });
  });

  document.querySelectorAll('.edit-task-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const processId = btn.dataset.processId;
      window.location.href = `/editProcess/${processId}`;
    });
  });
});
