document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const departmentFilter = document.getElementById('department-filter');
  const statusFilter = document.getElementById('status-filter');
  const priorityFilter = document.getElementById('priority-filter');
  const searchInput = document.getElementById('search-input');
  const resetBtn = document.getElementById('reset-filters');
  const exportBtn = document.getElementById('export-excel');
  const departmentSections = document.querySelectorAll('.department-section');
  
  // Filter tasks based on criteria
  function filterTasks() {
    const departmentValue = departmentFilter.value;
    const statusValue = statusFilter.value;
    const priorityValue = priorityFilter.value;
    const searchValue = searchInput.value.toLowerCase();
    
    let visibleDepartments = 0;
    
    departmentSections.forEach(section => {
      const departmentId = section.querySelector('.department-header h3').textContent.replace('Department ', '');
      const taskRows = section.querySelectorAll('.task-row');
      let visibleRows = 0;
      
      // Filter rows within this department
      taskRows.forEach(row => {
        const matchesDepartment = departmentValue === 'all' || departmentId === departmentValue;
        const matchesStatus = statusValue === 'all' || row.dataset.status === statusValue;
        const matchesPriority = priorityValue === 'all' || row.dataset.priority === priorityValue;
        const matchesSearch = searchValue === '' || 
                             row.textContent.toLowerCase().includes(searchValue);
        
        const shouldShow = matchesDepartment && matchesStatus && matchesPriority && matchesSearch;
        row.style.display = shouldShow ? '' : 'none';
        if (shouldShow) visibleRows++;
      });
      
      // Show/hide entire department section based on visible rows
      if (visibleRows > 0) {
        section.style.display = '';
        visibleDepartments++;
      } else {
        section.style.display = 'none';
      }
    });
    
    // Show empty state if no departments visible
    const emptyState = document.querySelector('.empty-state');
    if (visibleDepartments === 0 && !emptyState) {
      const taskGrid = document.querySelector('.task-grid');
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-light);">
          <i class="fas fa-clipboard-list" style="font-size: 48px; margin-bottom: 16px; color: rgba(0,0,0,0.1);"></i>
          <p style="font-size: 16px;">No tasks found matching your criteria</p>
        </div>
      `;
      taskGrid.appendChild(emptyDiv);
    } else if (visibleDepartments > 0 && emptyState) {
      emptyState.remove();
    }
  }
  
  // Event listeners for filters
  departmentFilter.addEventListener('change', filterTasks);
  statusFilter.addEventListener('change', filterTasks);
  priorityFilter.addEventListener('change', filterTasks);
  searchInput.addEventListener('input', filterTasks);
  
  // Reset filters
  resetBtn.addEventListener('click', function() {
    departmentFilter.value = 'all';
    statusFilter.value = 'all';
    priorityFilter.value = 'all';
    searchInput.value = '';
    filterTasks();
  });
  
  // Export to Excel functionality
  exportBtn.addEventListener('click', function() {
    // This would be replaced with actual export logic
    alert('Export to Excel functionality would be implemented here');
    // In a real implementation, you might use a library like SheetJS
  });
  
  // Initialize filters
  filterTasks();
  
  // Add keyboard shortcut for search (Ctrl+F)
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
    }
  });
});