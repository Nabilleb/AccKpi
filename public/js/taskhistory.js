// Task History Management
let allHistoryData = [];
let filteredData = [];
const ITEMS_PER_PAGE = 10;
let currentPage = 1;

// Get workFlowID from data attribute
const workFlowID = document.body.getAttribute('data-workflow-id');

// Load history on page load
document.addEventListener('DOMContentLoaded', loadHistory);

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
    
    filteredData = [...allHistoryData];
    renderTable();
  } catch (error) {
    console.error('Error loading history:', error);
    showError('Failed to load task history: ' + error.message);
  }
}

function filterHistory() {
  const paymentFilter = document.getElementById('payment-filter').value;
  const searchText = document.getElementById('search-history').value.toLowerCase();
  
  filteredData = allHistoryData.filter(task => {
    const paymentMatch = !paymentFilter || task.PaymentStep == paymentFilter;
    const searchMatch = !searchText || 
      task.TaskName.toLowerCase().includes(searchText) ||
      (task.DeptName && task.DeptName.toLowerCase().includes(searchText));
    
    return paymentMatch && searchMatch;
  });
  
  currentPage = 1;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('history-tbody');
  
  if (filteredData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
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

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(start, end);

  tbody.innerHTML = paginatedData.map(task => {
    const startTime = new Date(task.TimeStarted);
    const endTime = new Date(task.TimeFinished);
    const duration = Math.round((endTime - startTime) / (1000 * 60)); // minutes
    
    const delay = parseInt(task.Delay) || 0;
    const delayClass = delay === 0 ? 'on-time' : 'delayed';
    const delayText = delay === 0 ? 'On Time' : `${delay} days`;

    const priorityClass = task.Priority === 1 ? 'priority-high' : 
                         task.Priority === 2 ? 'priority-medium' : 'priority-low';
    const priorityText = task.Priority === 1 ? 'High' : 
                        task.Priority === 2 ? 'Medium' : 'Low';

    return `
      <tr>
        <td><span class="task-name">${task.TaskName}</span></td>
        <td><span class="dept-badge">${task.DeptName || 'N/A'}</span></td>
        <td><span class="payment-badge payment-${task.PaymentStep}">Payment ${task.PaymentStep}</span></td>
        <td><span class="time-cell">${formatDateTime(task.TimeStarted)}</span></td>
        <td><span class="time-cell">${formatDateTime(task.TimeFinished)}</span></td>
        <td>${duration} min</td>
        <td>
          <span class="delay-cell ${delayClass}">
            ${delayText}
          </span>
          ${task.DelayReason ? `<div class="delay-reason">${task.DelayReason}</div>` : ''}
        </td>
        <td><span class="priority-badge ${priorityClass}">${priorityText}</span></td>
      </tr>
    `;
  }).join('');

  renderPagination();
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

function exportToCSV() {
  if (filteredData.length === 0) {
    showError('No data to export');
    return;
  }

  const headers = ['Task Name', 'Department', 'Payment Step', 'Started', 'Finished', 'Delay (days)', 'Priority'];
  const rows = filteredData.map(task => [
    task.TaskName,
    task.DeptName || 'N/A',
    `Payment ${task.PaymentStep}`,
    formatDateTime(task.TimeStarted),
    formatDateTime(task.TimeFinished),
    task.Delay || 0,
    task.Priority === 1 ? 'High' : task.Priority === 2 ? 'Medium' : 'Low'
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
