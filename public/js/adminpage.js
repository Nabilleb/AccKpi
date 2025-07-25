document.addEventListener('DOMContentLoaded', () => {
  // Toast notification function
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Table sorting functionality
  function setupTableSorting() {
    document.querySelectorAll('[data-sort]').forEach(header => {
      header.addEventListener('click', () => {
        const table = header.closest('table');
        const columnIndex = Array.from(header.parentNode.children).indexOf(header);
        const sortKey = header.getAttribute('data-sort');
        const isAscending = header.classList.contains('sort-asc');
        
        // Reset all headers
        table.querySelectorAll('[data-sort]').forEach(h => {
          h.classList.remove('sort-asc', 'sort-desc');
        });
        
        // Set new sort direction
        header.classList.toggle('sort-asc', !isAscending);
        header.classList.toggle('sort-desc', isAscending);
        
        // Sort the table
        sortTable(table, columnIndex, sortKey, isAscending);
      });
    });
  }
  
  function sortTable(table, columnIndex, sortKey, isAscending) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    rows.sort((a, b) => {
      const aValue = getSortValue(a, columnIndex, sortKey);
      const bValue = getSortValue(b, columnIndex, sortKey);
      
      if (aValue < bValue) return isAscending ? 1 : -1;
      if (aValue > bValue) return isAscending ? -1 : 1;
      return 0;
    });
    
    // Reattach sorted rows
    rows.forEach(row => tbody.appendChild(row));
  }
  
  function getSortValue(row, columnIndex, sortKey) {
    const cell = row.children[columnIndex];
    
    switch(sortKey) {
      case 'id':
        return parseInt(cell.textContent.replace('#', ''));
      case 'planned':
      case 'finished':
        const dateText = cell.textContent;
        return dateText === '-' ? 0 : new Date(dateText).getTime();
      case 'days':
      case 'delay':
        return parseInt(cell.textContent) || 0;
      case 'status':
        return cell.textContent.includes('Delayed') ? 2 : 
               cell.textContent.includes('Pending') ? 0 : 1;
      default:
        return cell.textContent.toLowerCase();
    }
  }
  
  setupTableSorting();

  // Search and filter functionality
  const searchInput = document.getElementById('taskSearchInput');
  const statusFilter = document.getElementById('statusFilter');
  const sortFilter = document.getElementById('sortFilter');
  
  function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    const rows = document.querySelectorAll('.taskgrid tr');
    
    rows.forEach(row => {
      if (row.classList.contains('loading-row') || row.classList.contains('no-tasks')) return;
      
      const taskName = row.querySelector('td:first-child').textContent.toLowerCase();
      
      const matchesSearch = taskName.includes(searchTerm) || delayReason.includes(searchTerm);
      const matchesStatus = statusValue === 'all' || 
                          (statusValue === 'pending' && status.includes('pending')) ||
                          (statusValue === 'on-time' && status.includes('on time')) ||
                          (statusValue === 'delayed' && status.includes('delayed'));
      
      if (matchesSearch && matchesStatus) {
        row.style.display = '';
        row.style.animation = 'fadeIn 0.3s forwards';
      } else {
        row.style.display = 'none';
      }
    });
  }
  
  searchInput.addEventListener('input', applyFilters);
  statusFilter.addEventListener('change', applyFilters);
  sortFilter.addEventListener('change', () => {
    // Implement sorting based on the selected option
    const table = document.querySelector('.activity-table table');
    const sortValue = sortFilter.value;
    let columnIndex, sortKey;
    
    switch(sortValue) {
      case 'planned-date':
        columnIndex = 1;
        sortKey = 'planned';
        break;
      case 'finished-date':
        columnIndex = 3;
        sortKey = 'finished';
        break;
      case 'delay':
        columnIndex = 4;
        sortKey = 'status'; // Status column contains delay info
        break;
      default:
        columnIndex = 0;
        sortKey = 'task';
    }
    
    sortTable(table, columnIndex, sortKey, true);
  });

  // Make viewProcessFlow globally accessible
  window.viewProcessFlow = function(processId, processName) {
    const grid = document.getElementById("departmentFlowGrid");
    const title = document.getElementById("selectedProcessTitle");
    
    // Show loading state
    grid.innerHTML = '<div class="loading-spinner"></div>';
    title.textContent = `Loading flow for: ${processName}`;
    
    fetch(`/process/${processId}/departments`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(steps => {
        title.textContent = `Flow for: ${processName}`;
        grid.innerHTML = '';
        
        if (steps.length === 0) {
          grid.innerHTML = '<div class="no-steps">No departments found for this process</div>';
          return;
        }
        
        steps.forEach((step, index) => {
          const card = document.createElement("div");
          card.className = `dept-card ${step.IsActive ? 'active' : ''}`;
          card.setAttribute('data-process-id', processId);
          card.setAttribute('data-department-id', step.DepartmentID);
          card.innerHTML = `
            <strong>Step ${step.StepOrder || index + 1}</strong>
            ${step.DeptName}
            <small>${step.IsActive ? 'Active' : 'Inactive'}</small>
          `;
          
          card.addEventListener('click', () => {
            // Highlight selected department
            document.querySelectorAll('.dept-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            // Load tasks for this department
            const pid = card.getAttribute('data-process-id');
            const did = card.getAttribute('data-department-id');
            fetchTasksForDepartment(pid, did);
          });
          
          grid.appendChild(card);
          
          // Add arrow between steps except after last one
          if (index < steps.length - 1) {
            const arrow = document.createElement("div");
            arrow.className = 'flow-arrow';
            arrow.innerHTML = '<i class="fas fa-arrow-right"></i>';
            grid.appendChild(arrow);
          }
        });
        
        // Auto-select first department if none is active
        if (!steps.some(step => step.IsActive) && steps.length > 0) {
          const firstCard = grid.querySelector('.dept-card');
          firstCard.click();
        } else {
          // Find and click the active department
          const activeCard = grid.querySelector('.dept-card.active');
          if (activeCard) {
            activeCard.click();
          }
        }
      })
      .catch(err => {
        console.error("Error loading process flow:", err);
        grid.innerHTML = '<div class="error-message">Failed to load process flow</div>';
        showToast('Failed to load process flow', 'error');
      });
  };

  // Task management
  function fetchTasksForDepartment(pid, did) {
    const tbody = document.querySelector(".taskgrid");
    tbody.innerHTML = '<tr class="loading-row"><td colspan="7"><div class="loading-spinner"></div> Loading tasks...</td></tr>';
    const cleanPid = pid.trim();
    const cleanDid = did.trim();

    fetch(`/api/tasks/by-department/${cleanDid}/by-process/${cleanPid}`)
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(data => {
        tbody.innerHTML = "";
        
        if (data.length === 0) {
          tbody.innerHTML = '<tr class="no-tasks"><td colspan="7">No tasks found for this department</td></tr>';
          return;
        }
        
        data.forEach((task, index) => {
          const row = document.createElement("tr");
          row.style.opacity = '0';
          row.style.transform = 'translateY(10px)';
          row.style.animation = `fadeIn 0.3s forwards ${index * 0.05}s`;
          
          const plannedDate = task.PlannedDate
            ? new Date(task.PlannedDate).toISOString().split("T")[0]
            : "-";
          const finishedDate = task.DateFinished
            ? new Date(task.DateFinished).toISOString().split("T")[0]
            : "-";
          
          const status = task.Delay === null
            ? `<span class="status-badge status-pending">Pending</span>`
            : task.Delay > 0
              ? `<span class="status-badge status-delayed">Delayed ${task.Delay} day(s)</span>`
              : `<span class="status-badge status-on-time">On time</span>`;
          
          row.innerHTML = `
            <td>${task.TaskName}</td>
            <td>${task.TaskPlanned}</td>
            <td>${task.DaysRequired}</td>
            <td class="action-buttons">
              ${!task.DateFinished ? 
                `<button class="edit-btn" data-task-id="${task.TaskID}">
                  <i class="fas fa-edit"></i> Edit
                </button>` : ''}
              
              ${task.DateFinished ? 
                `<button class="delete-btn" data-task-id="${task.TaskID}">
                  <i class="fas fa-trash-alt"></i> Delete
                </button>` : ''}
            </td>
          `;
          
          row.setAttribute("data-finished", task.DateFinished ? "true" : "false");
          row.setAttribute("data-delay", task.Delay || 0);
          row.setAttribute("data-task-id", task.TaskID);
          row.setAttribute("data-task-name", task.TaskName);
          
          if (task.DateFinished || (task.Delay && task.Delay > 0)) {
            row.style.opacity = "0.8";
          }
          
          tbody.appendChild(row);
        });
        
        // Apply any existing filters
        applyFilters();
      })
      .catch(err => {
        console.error("Error fetching tasks:", err);
        tbody.innerHTML = '<tr class="error-row"><td colspan="7">Failed to load tasks. Please try again.</td></tr>';
        showToast('Failed to load tasks', 'error');
      });
  }
  
  function refreshTasks() {
    const activeDeptCard = document.querySelector('.dept-card.active');
    
    if (!activeDeptCard) {
      showToast('No department selected', 'warning');
      return;
    }
    
    const processId = activeDeptCard.getAttribute('data-process-id');
    const departmentId = activeDeptCard.getAttribute('data-department-id');
    fetchTasksForDepartment(processId, departmentId);
  }
  
  // Event delegation for edit/delete buttons
  document.addEventListener('click', async (e) => {
    if (e.target.closest('.delete-btn')) {
      const taskId = e.target.closest('.delete-btn').dataset.taskId;
      const taskName = e.target.closest('tr').dataset.taskName;
      
      if (!confirm(`Are you sure you want to delete the task "${taskName}"?`)) {
        return;
      }
      
      try {
        const response = await fetch(`/delete-task/${taskId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          showToast('Task deleted successfully');
          refreshTasks();
        } else {
          const error = await response.json();
          showToast(error.error || 'Failed to delete task', 'error');
        }
      } catch (err) {
        console.error('Delete error:', err);
        showToast('Network error - please try again', 'error');
      }
    }
    
    if (e.target.closest('.edit-btn')) {
      const taskId = e.target.closest('.edit-btn').dataset.taskId;
      
      setTimeout(() => {
        window.location.href = `/edit-task/${taskId}`;
      }, 300);
    }
  });
  
  // Initialize the page by showing the first process flow if available
  const firstProcessBtn = document.querySelector('.view-process-btn');
  if (firstProcessBtn) {
    setTimeout(() => {
      firstProcessBtn.click();
    }, 500);
  }
});