// Task History Management
let allHistoryData = [];
let filteredData = [];
const ITEMS_PER_PAGE = 10;
let currentPage = 1;

// Get workFlowID from data attribute
const workFlowID = document.body.getAttribute('data-workflow-id');

// Load history on page load
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  
  // Add event listeners
  const paymentFilter = document.getElementById('payment-filter');
  const deptFilter = document.getElementById('dept-filter');
  const searchHistory = document.getElementById('search-history');
  const exportBtn = document.getElementById('export-csv-btn');
  
  if (paymentFilter) {
    paymentFilter.addEventListener('change', () => {
      updateDepartmentFilter();
      filterHistory();
    });
  }
  
  if (deptFilter) {
    deptFilter.addEventListener('change', filterHistory);
  }
  
  if (searchHistory) {
    searchHistory.addEventListener('keyup', filterHistory);
  }
  
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToCSV);
  }
});

async function loadHistory() {
  try {
    if (!workFlowID) {
      throw new Error('No workflow selected');
    }

    const response = await fetch(`/api/task-history?workFlowID=${workFlowID}`);
    if (!response.ok) throw new Error('Failed to load history');
    
    const data = await response.json();
    allHistoryData = data.history || [];
    
    // Update stats
    document.getElementById('total-tasks').textContent = allHistoryData.length;
    
    const paymentSteps = new Set(allHistoryData.map(t => t.PaymentStep));
    document.getElementById('payment-steps').textContent = paymentSteps.size;
    
    const onTimeCount = allHistoryData.filter(t => {
      const delay = parseInt(t.Delay) || 0;
      return delay === 0;
    }).length;
    document.getElementById('on-time-count').textContent = onTimeCount;
    
    const delayedCount = allHistoryData.filter(t => {
      const delay = parseInt(t.Delay) || 0;
      return delay > 0;
    }).length;
    document.getElementById('delayed-count').textContent = delayedCount;
    
    filteredData = [...allHistoryData];
    updatePaymentFilter();
    updateDepartmentFilter();
    renderGroupedTable();
  } catch (error) {
    console.error('Error loading history:', error);
    showError('Failed to load task history: ' + error.message);
  }
}

function updatePaymentFilter() {
  const paymentSelect = document.getElementById('payment-filter');
  
  // Get unique payment steps from data and sort them
  const paymentSteps = Array.from(new Set(allHistoryData.map(t => t.PaymentStep))).sort((a, b) => a - b);
  
  // Keep the "All Payments" option and add payment step options
  const options = ['<option value="">All Payments</option>'];
  paymentSteps.forEach(step => {
    options.push(`<option value="${step}">Payment Step ${step}</option>`);
  });
  
  paymentSelect.innerHTML = options.join('');
}

function updateDepartmentFilter() {
  const paymentFilter = document.getElementById('payment-filter').value;
  const deptSelect = document.getElementById('dept-filter');
  const currentDeptValue = deptSelect.value;
  
  // Get unique departments for selected payment
  let departments = new Set();
  allHistoryData.forEach(task => {
    if (!paymentFilter || task.PaymentStep == paymentFilter) {
      if (task.DeptName) {
        departments.add(JSON.stringify({id: task.DepId, name: task.DeptName}));
      }
    }
  });
  
  // Rebuild department options
  const options = [{ id: '', name: 'All Departments' }];
  Array.from(departments).sort().forEach(dept => {
    const parsed = JSON.parse(dept);
    options.push(parsed);
  });
  
  deptSelect.innerHTML = options.map(opt => 
    `<option value="${opt.id}">${opt.name}</option>`
  ).join('');
  
  // Restore previous selection if still available
  if (Array.from(deptSelect.options).some(o => o.value === currentDeptValue)) {
    deptSelect.value = currentDeptValue;
  }
}

function filterHistory() {
  const paymentFilter = document.getElementById('payment-filter').value;
  const deptFilter = document.getElementById('dept-filter').value;
  const searchText = document.getElementById('search-history').value.toLowerCase();
  
  filteredData = allHistoryData.filter(task => {
    const paymentMatch = !paymentFilter || task.PaymentStep == paymentFilter;
    const deptMatch = !deptFilter || task.DepId == deptFilter;
    const searchMatch = !searchText || 
      task.TaskName.toLowerCase().includes(searchText);
    
    return paymentMatch && deptMatch && searchMatch;
  });
  
  currentPage = 1;
  renderGroupedTable();
}

function groupByPaymentAndDepartment(data) {
  const grouped = {};
  
  data.forEach(task => {
    const paymentKey = `payment-${task.PaymentStep}`;
    const deptKey = `dept-${task.DepId}`;
    
    if (!grouped[paymentKey]) {
      grouped[paymentKey] = {
        paymentStep: task.PaymentStep,
        departments: {}
      };
    }
    
    if (!grouped[paymentKey].departments[deptKey]) {
      grouped[paymentKey].departments[deptKey] = {
        depId: task.DepId,
        deptName: task.DeptName,
        stepOrder: task.StepOrder || 0,
        tasks: []
      };
    }
    
    grouped[paymentKey].departments[deptKey].tasks.push(task);
  });
  
  return grouped;
}

function renderGroupedTable() {
  const tbody = document.getElementById('history-tbody');
  
  if (filteredData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fas fa-search"></i>
            <p>No tasks found matching your criteria</p>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  const grouped = groupByPaymentAndDepartment(filteredData);
  let html = '';
  let isFirstPayment = true;

  // Sort payments by step number
  Object.keys(grouped).sort((a, b) => {
    return grouped[a].paymentStep - grouped[b].paymentStep;
  }).forEach(paymentKey => {
    const paymentData = grouped[paymentKey];
    const paymentStep = paymentData.paymentStep;
    
    // Add gap between payment sections (not before first one)
    if (!isFirstPayment) {
      html += `<tr class="payment-gap-row"><td colspan="6"></td></tr>`;
    }
    isFirstPayment = false;
    
    // Payment header
    html += `
      <tr class="payment-header-row">
        <td colspan="6">
          <div class="payment-header">
            <i class="fas fa-credit-card"></i>
            Payment Step ${paymentStep}
          </div>
        </td>
      </tr>
    `;
    
    // Sort departments by StepOrder
    Object.keys(paymentData.departments).sort((a, b) => {
      const stepOrderA = paymentData.departments[a].stepOrder;
      const stepOrderB = paymentData.departments[b].stepOrder;
      return stepOrderA - stepOrderB;
    }).forEach(deptKey => {
      const deptData = paymentData.departments[deptKey];
      
      // Department subheader
      html += `
        <tr class="dept-header-row">
          <td colspan="6">
            <div class="dept-header">
              <i class="fas fa-building"></i>
              ${deptData.deptName || 'Unknown Department'}
            </div>
          </td>
        </tr>
      `;
      
      // Table header for this department
      html += `
        <tr class="dept-column-header">
          <th>Task Name</th>
          <th>Plan Date</th>
          <th>Started</th>
          <th>Finished</th>
          <th>Delay</th>
          <th>Priority</th>
        </tr>
      `;
      
      // Tasks for this department
      deptData.tasks.forEach(task => {
        const startTime = new Date(task.TimeStarted);
        const endTime = new Date(task.TimeFinished);
        
        const delay = parseInt(task.Delay) || 0;
        const delayClass = delay === 0 ? 'on-time' : 'delayed';
        const delayText = delay === 0 ? 'On Time' : `${delay} days`;

        const priorityClass = task.Priority === 1 ? 'priority-high' : 
                             task.Priority === 2 ? 'priority-medium' : 'priority-low';
        const priorityText = task.Priority || 3;

        html += `
          <tr class="task-row">
            <td><span class="task-name">${task.TaskName}</span></td>
            <td><span class="time-cell">${formatDate(task.PlannedDate)}</span></td>
            <td><span class="time-cell">${formatDate(task.TimeStarted)}</span></td>
            <td><span class="time-cell">${formatDate(task.TimeFinished)}</span></td>
            <td>
              <span class="delay-cell ${delayClass}">
                ${delayText}
              </span>
              ${task.DelayReason ? `<div class="delay-reason">${task.DelayReason}</div>` : ''}
            </td>
            <td><span class="priority-badge ${priorityClass}">${priorityText}</span></td>
          </tr>
        `;
      });
    });
  });

  tbody.innerHTML = html;
}

function renderPagination() {
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const pagination = document.getElementById('pagination');
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '';
  
  if (currentPage > 1) {
    html += `<button onclick="currentPage--; renderTable()"><i class="fas fa-chevron-left"></i></button>`;
  }
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html += `<button class="active">${i}</button>`;
    } else if (i <= currentPage + 2 && i >= currentPage - 2) {
      html += `<button onclick="currentPage = ${i}; renderTable()">${i}</button>`;
    }
  }
  
  if (currentPage < totalPages) {
    html += `<button onclick="currentPage++; renderTable()"><i class="fas fa-chevron-right"></i></button>`;
  }
  
  pagination.innerHTML = html;
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function exportToCSV() {
  if (filteredData.length === 0) {
    showError('No data to export');
    return;
  }

  const headers = ['Task Name', 'Plan Date', 'Started', 'Finished', 'Delay (days)', 'Priority'];
  const rows = filteredData.map(task => [
    task.TaskName,
    formatDate(new Date(task.PlannedDate)),
    formatDate(new Date(task.TimeStarted)),
    formatDate(new Date(task.TimeFinished)),
    task.Delay || 0,
    task.Priority || 3
  ]);

  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  const link = document.createElement('a');
  link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  link.download = `task-history-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

function showError(message) {
  const errorDiv = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  errorText.textContent = message;
  errorDiv.style.display = 'flex';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}
