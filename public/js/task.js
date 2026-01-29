// Global variables
// Get EJS Variables from body data attributes
const bodyEl = document.documentElement;
const processId = bodyEl.getAttribute('data-process-id') || document.body.getAttribute('data-process-id');
const processSteps = JSON.parse(bodyEl.getAttribute('data-process-steps') || document.body.getAttribute('data-process-steps') || '[]');

let isLoading = false;
let currentTasks = [];
let currentPage = 1;
const tasksPerPage = 10;

const sortFunctions = {
  name: (a, b) => (a.TaskName || '').localeCompare(b.TaskName || ''),
  description: (a, b) => (a.TaskPlanned || '').localeCompare(b.TaskPlanned || ''),
  department: (a, b) => (a.DeptName || '').localeCompare(b.DeptName || ''),
  duedate: (a, b) => 0,
  priority: (a, b) => (a.Priority ?? 0) - (b.Priority ?? 0),
  sequence: (a, b) => {
    const stepA = a.StepOrder ?? 0;
    const stepB = b.StepOrder ?? 0;
    if (stepA !== stepB) return stepA - stepB;
    return (a.TaskID ?? 0) - (b.TaskID ?? 0);
  }
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize form validation
  setupFormValidation();
  
  // Initialize IsFixed checkbox listener
  const isFixedCheckbox = document.getElementById('IsFixed-check');
  if (isFixedCheckbox) {
    isFixedCheckbox.addEventListener('change', function() {
      const isFixedHidden = document.getElementById('IsFixed');
      isFixedHidden.value = this.checked ? 1 : 0;
      console.log('IsFixed value updated to:', isFixedHidden.value);
    });
  }
  
  // Initialize linkTasks dropdown change listener
  const linkTasksSelect = document.getElementById('linkTasks');
  if (linkTasksSelect) {
    linkTasksSelect.addEventListener('change', function() {
      if (this.value) {
        const linkedTaskId = parseInt(this.value);
        const linkedTask = currentTasks.find(t => t.TaskID === linkedTaskId);
        if (linkedTask) {
          console.log('Task linked to:', linkedTask.TaskName, 'Planned Date:', linkedTask.PlannedDate);
        }
      }
    });
  }
  
  // Load tasks for this process
  loadTasks();
  
  // Set up task search functionality
  document.getElementById('task-search').addEventListener('input', function() {
    filterAndRenderTasks();
  });
  
  // Set up status filter
  document.getElementById('status-filter').addEventListener('change', function() {
    filterAndRenderTasks();
  });
  
  // Set up refresh button
  document.getElementById('refresh-tasks').addEventListener('click', function() {
    if (!isLoading) {
      loadTasks();
    }
  });

  // Close modal when clicking outside
  document.addEventListener('click', function(event) {
    const modal = document.getElementById('edit-task-modal');
    if (event.target === modal) {
      closeEditModal();
    }
    
    // Close modal via close button
    if (event.target.closest('[data-action="close-modal"]')) {
      closeEditModal();
    }
    
    // Retry load tasks button
    if (event.target.closest('[data-action="retry-load"]')) {
      loadTasks();
    }
    
    // Pagination buttons
    if (event.target.closest('.page-btn:not(.ellipsis)')) {
      const pageBtn = event.target.closest('.page-btn');
      const pageNum = parseInt(pageBtn.dataset.page);
      if (!isNaN(pageNum) && pageBtn.offsetParent !== null) { // Check button is visible/enabled
        changePage(pageNum);
      }
    }
    
    // Edit task button
    if (event.target.closest('[data-action="edit-task"]')) {
      const taskId = event.target.closest('[data-action="edit-task"]').dataset.taskId;
      editTask(parseInt(taskId));
    }
    
    // Delete task button
    if (event.target.closest('[data-action="delete-task"]')) {
      const taskId = event.target.closest('[data-action="delete-task"]').dataset.taskId;
      deleteTask(parseInt(taskId));
    }
    
    // Unlink task button
    if (event.target.closest('[data-action="unlink-task"]')) {
      const taskId = event.target.closest('[data-action="unlink-task"]').dataset.taskId;
      unlinkTask(parseInt(taskId));
    }
    
    // Save task button
    if (event.target.closest('[data-action="save-task"]')) {
      saveTaskChanges();
    }
    
    // Link task select change
    if (event.target.classList.contains('link-task-select')) {
      linkTaskToOther(event.target);
    }
  });
});

// Form Validation
function setupFormValidation() {
  const form = document.getElementById('taskForm');
  const inputs = form.querySelectorAll('input, select, textarea');
  
  // Real-time validation
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      validateField(input);
      
      // Update character counters for text inputs
      if (input.type === 'text' || input.tagName === 'TEXTAREA') {
        const counterId = input.id + '-counter';
        const counter = document.getElementById(counterId);
        if (counter) {
          counter.textContent = `${input.value.length}/${input.maxLength}`;
        }
      }
    });
    
    // Add blur validation
    input.addEventListener('blur', () => {
      validateField(input);
    });
  });
  
  // Form submission validation with AJAX
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    let isValid = true;
    inputs.forEach(input => {
      if (!validateField(input)) {
        isValid = false;
      }
    });
    
    if (!isValid) {
      showToast('Please fix the errors in the form', true);
      
      // Scroll to first error
      const firstError = document.querySelector('.validation-error:not([style*="display: none"])');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // Set IsFixed value: 1 if checked, 0 if unchecked
    const isFixedCheck = document.getElementById('IsFixed-check');
    const isFixedHidden = document.getElementById('IsFixed');
    isFixedHidden.value = isFixedCheck.checked ? 1 : 0;
    
    // Show loading state on submit button
    const submitBtn = document.getElementById('submit-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    
    try {
      // Convert form data to JSON
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);
      
      // Send POST request
      const response = await fetch('/add-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create task');
      }
      
      // Success - show message and reset form
      showToast('Task created successfully!', false);
      form.reset();
      
      // Reset IsFixed checkbox
      document.getElementById('IsFixed-check').checked = false;
      document.getElementById('IsFixed').value = 0;
      
      // Reload tasks after short delay
      setTimeout(() => {
        loadTasks();
      }, 500);
      
    } catch (error) {
      console.error('Error:', error);
      showToast('Error: ' + error.message, true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}

function validateField(field) {
  const errorElement = document.getElementById(`${field.id}-error`);
  
  if (field.required && !field.value.trim()) {
    showError(field, errorElement, 'This field is required');
    return false;
  }
  
  // Specific validations
  if (field.id === 'DaysRequired' && (isNaN(field.value) || field.value < 0)) {
    showError(field, errorElement, 'Please enter a valid number of days');
    return false;
  }
  
  // If we get here, field is valid
  clearError(field, errorElement);
  return true;
}

function showError(field, errorElement, message) {
  field.classList.add('border-danger', 'shadow-danger');
  
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('visible');
  }
  
  return false;
}

function clearError(field, errorElement) {
  field.classList.remove('border-danger', 'shadow-danger');
  
  if (errorElement) {
    errorElement.classList.remove('visible');
  }
  
  return true;
}

// Task Loading and Rendering
function loadTasks() {
  if (!processId) return;
  
  isLoading = true;
  const loadingEl = document.getElementById('tasks-loading');
  const contentEl = document.getElementById('tasks-content');
  const paginationEl = document.getElementById('pagination');

  // Show loading state
  loadingEl.classList.remove('hidden');
  contentEl.classList.add('hidden');
  paginationEl.classList.add('hidden');
  
  // Show loading skeleton
  loadingEl.innerHTML = `
    <div class="skeleton-row"></div>
    <div class="skeleton-row"></div>
    <div class="skeleton-row"></div>
  `;

  fetch(`/api/tasks?processId=${processId}`)
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(data => {
      currentTasks = data;
      populateLinkTasksDropdown();
      filterAndRenderTasks();
    })
    .catch(error => {
      console.error('Error loading tasks:', error);
      loadingEl.innerHTML = `
        <div class="no-tasks">
          <i class="fas fa-exclamation-circle error-icon"></i>
          <p>Error loading tasks. Please try again.</p>
          <button class="btn btn-primary" data-action="retry-load">
            <i class="fas fa-sync-alt"></i> Retry
          </button>
        </div>`;
    })
    .finally(() => {
      isLoading = false;
    });
}

function populateLinkTasksDropdown() {
  const linkTasksSelect = document.getElementById('linkTasks');
  if (!linkTasksSelect) return;
  
  // Save current selection
  const currentValue = linkTasksSelect.value;
  
  // Keep the default option
  const html = '<option value="">-- No Link --</option>' +
    currentTasks
      .filter(t => t.TaskID) // Only tasks with valid IDs
      .map(task => `<option value="${task.TaskID}">${task.TaskName} (${task.DeptName})</option>`)
      .join('');
  
  linkTasksSelect.innerHTML = html;
  
  // Restore selection if it still exists
  if (currentValue && currentTasks.find(t => t.TaskID == currentValue)) {
    linkTasksSelect.value = currentValue;
  }
}

function filterAndRenderTasks() {
    const searchTerm = document.getElementById('task-search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    
    // Filter tasks
    let filteredTasks = [...currentTasks]; // Create a copy
    
    // Reverse the array to show newest first (original order is oldest first)
    filteredTasks.reverse();
    
    if (searchTerm) {
      filteredTasks = filteredTasks.filter(task => 
        (task.TaskName && task.TaskName.toLowerCase().includes(searchTerm)) ||
        (task.TaskPlanned && task.TaskPlanned.toLowerCase().includes(searchTerm))
      );
    }
    
    if (statusFilter) {
      filteredTasks = filteredTasks.filter(task => getTaskStatus(task) === statusFilter);
    }
    
    // Render paginated results
    renderPaginatedTasks(filteredTasks);
  }

function renderPaginatedTasks(tasks) {
  const contentEl = document.getElementById('tasks-content');
  const loadingEl = document.getElementById('tasks-loading');
  const paginationEl = document.getElementById('pagination');
  
  if (!tasks || tasks.length === 0) {
    contentEl.innerHTML = `
      <div class="no-tasks">
        <i class="fas fa-inbox"></i>
        <p>No tasks found matching your criteria.</p>
      </div>`;
    loadingEl.classList.add('hidden');
    contentEl.classList.remove('hidden');
    paginationEl.classList.add('hidden');
    return;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(tasks.length / tasksPerPage);
  currentPage = Math.min(currentPage, totalPages);
  
  // Get tasks for current page
  const startIdx = (currentPage - 1) * tasksPerPage;
  const endIdx = startIdx + tasksPerPage;
  const paginatedTasks = tasks.slice(startIdx, endIdx);
  
  // Render tasks
  renderTasks(paginatedTasks);
  
  // Render pagination controls
  renderPagination(totalPages);
  
  // Update UI
  loadingEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
  paginationEl.classList.remove('hidden');
}

function renderTasks(tasks) {
  const contentEl = document.getElementById('tasks-content');

  // Group tasks by department and attach StepOrder from processSteps
  const grouped = {};
  tasks.forEach(task => {
    if (!grouped[task.DepId]) {
      grouped[task.DepId] = {
        DeptName: task.DeptName,
        StepOrder: processSteps.find(p => p.DepartmentID === task.DepId)?.StepOrder ?? 9999,
        Tasks: []
      };
    }
    grouped[task.DepId].Tasks.push(task);
  });

  // Convert grouped object to array and sort departments by StepOrder
  const sortedGroups = Object.values(grouped).sort(
    (a, b) => a.StepOrder - b.StepOrder
  );

  let html = '';
  for (const group of sortedGroups) {
    // Sort tasks by Priority ASC
    group.Tasks.sort((a, b) => (a.Priority ?? 9999) - (b.Priority ?? 9999));

    html += `
      <div class="department-group">
        <div class="department-header">
          <i class="fas fa-building"></i>
          <h3>${group.DeptName}</h3>
          <span class="task-count">${group.Tasks.length} tasks</span>
        </div>
        <div class="table-wrapper">
          <table class="tasks-table">
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Description</th>
                <th>Days</th>
                <th>Priority</th>
                <th>Link Task</th>
                <th>Linked To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>`;

    group.Tasks.forEach(task => {
      const status = getTaskStatus(task);
      const statusBadge = getStatusBadge(status);
      const isOverdue = status === 'delayed' ||
        (status === 'pending' && new Date(task.PlannedDate) < new Date());

      // find linked task (if any) from the loaded process tasks
      const linkedTaskObj = currentTasks.find(ct => ct.TaskID === task.linkTasks);

      html += `
        <tr class="${isOverdue ? 'overdue-task' : ''}">
          <td>${task.TaskName || '-'}</td>
          <td>${task.TaskPlanned || '-'}</td>
          <td>${task.DaysRequired !== null && task.DaysRequired !== undefined ? task.DaysRequired : '-'}</td>
          <td>${task.Priority ?? '-'}</td>
          <td>
            <select class="link-task-select" data-task-id="${task.TaskID}" data-dept-id="${task.DepId}">
              <option value="">-- Link Task --</option>
              ${currentTasks
                .filter(t => {
                  // Can only link to tasks in same process and different departments
                  return t.TaskID !== task.TaskID && t.DepId !== task.DepId;
                })
                .map(t => `<option value="${t.TaskID}">${t.TaskName} (${t.DeptName})</option>`)
                .join('')}
            </select>
          </td>
          <td class="linked-task" data-task-id="${task.TaskID}">
            ${linkedTaskObj ? linkedTaskObj.TaskName + ' (' + linkedTaskObj.DeptName + ')' : '-'}
            ${linkedTaskObj ? `<button class="btn-unlink" data-action="unlink-task" data-task-id="${task.TaskID}" title="Remove link"><i class="fas fa-unlink"></i></button>` : ''}
          </td>
          <td class="action-buttons">
            <button class="btn-edit" data-action="edit-task" data-task-id="${task.TaskID}" title="Edit task">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-delete" data-action="delete-task" data-task-id="${task.TaskID}" title="Delete task">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>`;
    });

    html += `</tbody></table></div></div>`;
  }

  contentEl.innerHTML = html;

  // Make table headers sortable (except "Status")
  const tables = document.querySelectorAll('.tasks-table');
  tables.forEach(table => {
    const headers = table.querySelectorAll('th');
    headers.forEach((header, index) => {
      if (header.textContent.trim() !== 'Status') {
        header.classList.add('cursor-pointer');
        header.addEventListener('click', () => {
          sortTable(table, index);
        });
      }
    });
  });
}

function renderPagination(totalPages) {
  const paginationEl = document.getElementById('pagination');
  
  if (totalPages <= 1) {
    paginationEl.classList.add('hidden');
    return;
  }
  
  let html = '';
  
  // Previous button
  html += `
    <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
      <i class="fas fa-chevron-left"></i>
    </button>`;
  
  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    html += `<button class="page-btn" data-page="1">1</button>`;
    if (startPage > 2) {
      html += `<span class="page-btn ellipsis">...</span>`;
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
        ${i}
      </button>`;
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="page-btn ellipsis">...</span>`;
    }
    html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }
  
  // Next button
  html += `
    <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
      <i class="fas fa-chevron-right"></i>
    </button>`;
  
  paginationEl.innerHTML = html;
}

function changePage(newPage) {
  currentPage = newPage;
  filterAndRenderTasks();
  window.scrollTo({ top: document.getElementById('tasks-container').offsetTop, behavior: 'smooth' });
}

function sortTable(table, columnIndex) {
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  // Determine sort direction
  const isAscending = table.dataset.sortedColumn !== String(columnIndex) || 
                     table.dataset.sortedDirection === 'desc';
  
  rows.sort((a, b) => {
    const aText = a.cells[columnIndex].textContent.trim();
    const bText = b.cells[columnIndex].textContent.trim();
    
    // Special handling for dates
    if (columnIndex === 2 || columnIndex === 5 || columnIndex === 6) {
      const aDate = new Date(aText);
      const bDate = new Date(bText);
      return isAscending ? aDate - bDate : bDate - aDate;
    }
    
    // Numeric columns
    if (columnIndex === 3 || columnIndex === 7) {
      const aNum = parseInt(aText) || 0;
      const bNum = parseInt(bText) || 0;
      return isAscending ? aNum - bNum : bNum - aNum;
    }
    
    // Status column (special handling)
    if (columnIndex === 4) {
      const aStatus = a.cells[columnIndex].querySelector('.status-badge')?.textContent.trim() || '';
      const bStatus = b.cells[columnIndex].querySelector('.status-badge')?.textContent.trim() || '';
      return isAscending ? aStatus.localeCompare(bStatus) : bStatus.localeCompare(aStatus);
    }
    
    // Default text comparison
    return isAscending ? aText.localeCompare(bText) : bText.localeCompare(aText);
  });
  
  // Update sort state
  table.dataset.sortedColumn = columnIndex;
  table.dataset.sortedDirection = isAscending ? 'asc' : 'desc';
  
  // Rebuild table
  rows.forEach(row => tbody.appendChild(row));
  
  // Update sort indicators
  const headers = table.querySelectorAll('th');
  headers.forEach((header, i) => {
    header.innerHTML = header.textContent; // Remove any existing icons
    
    if (i === columnIndex) {
      const icon = document.createElement('i');
      icon.className = 'fas';
      icon.classList.add(isAscending ? 'fa-arrow-up' : 'fa-arrow-down', 'margin-left-sm');
      header.appendChild(icon);
    }
  });
}

// Utility Functions
function getTaskStatus(task) {
  if (task.TimeFinished) return 'completed';
  if (task.TimeStarted) return 'in-progress';
  if (task.Delay > 0) return 'delayed';
  return 'pending';
}

function getStatusBadge(status) {
  switch (status) {
    case 'completed':
      return `<span class="status-badge status-completed"><i class="fas fa-check-circle"></i> Completed</span>`;
    case 'in-progress':
      return `<span class="status-badge status-in-progress"><i class="fas fa-spinner fa-pulse"></i> In Progress</span>`;
    case 'delayed':
      return `<span class="status-badge status-delayed"><i class="fas fa-exclamation-triangle"></i> Delayed</span>`;
    default:
      return `<span class="status-badge status-pending"><i class="far fa-clock"></i> Pending</span>`;
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  const options = {
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleString(undefined, options);
}

function linkTaskToOther(selectElement) {
  const taskID = parseInt(selectElement.getAttribute('data-task-id'));
  const taskDeptId = parseInt(selectElement.getAttribute('data-dept-id'));
  const linkedTaskID = parseInt(selectElement.value);

  if (!linkedTaskID) {
    showToast('Please select a task to link', true);
    return;
  }

  // Prevent self-linking
  if (taskID === linkedTaskID) {
    showToast('Cannot link a task to itself', true);
    selectElement.value = '';
    return;
  }

  // Send request to update linkTasks with validation
  fetch(`/api/link-task/${taskID}/${linkedTaskID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fromDeptId: taskDeptId
    })
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => {
        throw new Error(err.error || 'Failed to link tasks');
      });
    }
    return response.json();
  })
  .then(data => {
    // Update in-memory tasks with response from server
    const src = currentTasks.find(t => t.TaskID === taskID);
    const linkedTask = currentTasks.find(t => t.TaskID === linkedTaskID);
    
    if (src) {
      src.linkTasks = linkedTaskID;
      // Use the date returned from the server (which was calculated there)
      if (data.newPlannedDate) {
        src.PlannedDate = data.newPlannedDate;
      }
    }
    
    filterAndRenderTasks();
    showToast(`Tasks linked successfully! Task planned date updated.`);
    selectElement.value = ''; // Reset select
  })
  .catch(error => {
    console.error('Error linking tasks:', error);
    showToast('Failed to link tasks: ' + error.message, true);
    selectElement.value = '';
  });
}

function unlinkTask(taskId) {
  if (!confirm('Remove the link for this task?')) return;
  fetch(`/api/unlink-task/${taskId}`, { method: 'PUT' })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove link');
      
      // update local state and re-render
      const src = currentTasks.find(t => t.TaskID === parseInt(taskId));
      if (src) {
        src.linkTasks = null;
        // Update the planned date to the recalculated date from server
        if (data.newPlannedDate) {
          src.PlannedDate = data.newPlannedDate;
        }
      }
      filterAndRenderTasks();
      showToast('Link removed successfully and task rescheduled');
    })
    .catch(err => {
      console.error('Error unlinking task:', err);
      showToast('Failed to remove link: ' + err.message, true);
    });
}

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
  toast.innerHTML = `
    <i class="fas ${isError ? 'fa-exclamation-triangle' : 'fa-check-circle'}"></i>
    ${message}
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('animate-slide-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Animation styles are now in task.css

// Set up character counters
document.getElementById('TaskPlanned').addEventListener('input', function() {
  document.getElementById('TaskPlanned-counter').textContent = `${this.value.length}/255`;
});

// Character counter for edit modal
document.getElementById('edit-description').addEventListener('input', function() {
  const counter = document.getElementById('edit-description-counter');
  if (counter) {
    counter.textContent = `${this.value.length}/255`;
  }
});

// Edit Task Function
function editTask(taskId) {
  const task = currentTasks.find(t => t.TaskID === taskId);
  if (!task) return;

  const modal = document.getElementById('edit-task-modal');
  document.getElementById('edit-task-id').value = taskId;
  document.getElementById('edit-task-name').value = task.TaskName || '';
  const descriptionField = document.getElementById('edit-description');
  descriptionField.value = task.TaskPlanned || '';
  document.getElementById('edit-description-counter').textContent = `${descriptionField.value.length}/255`;
  document.getElementById('edit-days').value = task.DaysRequired || '';
  
  modal.classList.add('show');
}

// Close Edit Modal
function closeEditModal() {
  const modal = document.getElementById('edit-task-modal');
  modal.classList.remove('show');
}

// Save Task Changes
async function saveTaskChanges() {
  const taskId = document.getElementById('edit-task-id').value;
  const taskName = document.getElementById('edit-task-name').value;
  const description = document.getElementById('edit-description').value;
  const daysRequired = parseInt(document.getElementById('edit-days').value) || 0;

  if (!taskName) {
    alert('Task name is required');
    return;
  }

  if (!description) {
    alert('Description is required');
    return;
  }

  try {
    const response = await fetch(`/update-task/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        TaskName: taskName,
        TaskPlanned: description,
        DaysRequired: daysRequired
      })
    });

    if (response.ok) {
      alert('Task updated successfully');
      closeEditModal();
      location.reload();
    } else {
      alert('Failed to update task');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error updating task: ' + error.message);
  }
}

// Delete Task Function
function deleteTask(taskId) {
  if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
    deleteTaskConfirmed(taskId);
  }
}

// Confirmed Delete
async function deleteTaskConfirmed(taskId) {
  try {
    const response = await fetch(`/delete-task/${taskId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      showToast('Task deleted successfully!', false);
      setTimeout(() => {
        location.reload();
      }, 1500);
    } else {
      showToast('Failed to delete task', true);
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Error deleting task: ' + error.message, true);
  }
}
