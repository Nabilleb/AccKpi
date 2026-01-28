// Get delay color class based on delay range scaled to DaysRequired
// For 10-day task: GREEN=1-4, YELLOW=5-9, RED=10+
// GREEN: <= 40% of DaysRequired
// YELLOW: 40% < delay <= 90% of DaysRequired  
// RED: > 90% of DaysRequired
const getDelayColor = (delayDays, daysRequired) => {
  if (!daysRequired || daysRequired <= 0) return 'delay-red'; // Safety check
  const delayPercentage = (delayDays / daysRequired) * 100;
  
  if (delayPercentage <= 40) return 'delay-green';
  if (delayPercentage <= 90) return 'delay-yellow';
  return 'delay-red';
};

// Cache DOM elements and initial data
document.addEventListener('DOMContentLoaded', function() {
  // Read data from body attributes (injected by EJS in userpage.ejs)
  const body = document.body;
  const userId = body.dataset.userId;
  const deptId = body.dataset.deptId;
  const taskList = JSON.parse(body.dataset.taskList || '[]');
  const isAdmin = body.dataset.isAdmin === 'true';
  
  const container = document.getElementById('department-tables-container');
  const timelineContainer = document.getElementById('task-timeline');
  const errorEl = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const successEl = document.getElementById('success-message');
  const successText = document.getElementById('success-text');
  const modal = document.getElementById('confirmation-modal');
  const modalMessage = document.getElementById('modal-message');
  const modalConfirmBtn = document.getElementById('modal-confirm-btn');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');

  // Button event listeners
  const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');
  const backBtn = document.getElementById('backBtn');
  
  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener('click', () => {
      window.location.href = '/logout';
    });
  }
  
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = '/workFlowDash';
    });
  }

  // Idle timeout configuration
  const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  let idleTimer = null;
  let idleWarningTimer = null;

  const resetIdleTimer = () => {
      // Clear existing timers
    if (idleTimer) clearTimeout(idleTimer);
    if (idleWarningTimer) clearTimeout(idleWarningTimer);
    
    // Set warning timer (4:50 - warn user 10 seconds before logout)
    idleWarningTimer = setTimeout(() => {
        showMessage(successEl, successText, 'You will be logged out in 10 seconds due to inactivity', 5000);
    }, IDLE_TIMEOUT - 10000);
    
    // Set logout timer
    idleTimer = setTimeout(() => {
        window.location.href = "/logout";
    }, IDLE_TIMEOUT);
};

// Track user activity
const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

activityEvents.forEach(event => {
    document.addEventListener(event, resetIdleTimer, true);
});

// Start the idle timer on page load
resetIdleTimer();

console.log(taskList);

// Predefined objects and variables
const sortFunctions = {
    name: (a, b) => a.TaskName.localeCompare(b.TaskName),
    description: (a, b) => (a.TaskPlanned || '').localeCompare(b.TaskPlanned || ''),
    department: (a, b) => a.DeptName.localeCompare(b.DeptName),
    duedate: (a, b) => new Date(a.PlannedDate) - new Date(b.PlannedDate),
    priority: (a, b) => a.Priority - b.Priority,
    sequence: (a, b) => a.StepOrder - b.StepOrder || a.TaskID - b.TaskID
};

let users = [];
let currentAction = null;
let currentTaskId = null;
let nextTask = null;

// Optimized helper functions
const showMessage = (element, textElement, message, duration) => {
    textElement.textContent = message;
    element.classList.add('show');
    setTimeout(() => element.classList.remove('show'), duration);
};

const showError = (message) => showMessage(errorEl, errorText, message, 5000);
const showSuccess = (message) => showMessage(successEl, successText, message, 3000);

const showConfirmation = (message, confirmCallback) => {
    modalMessage.textContent = message;
    currentAction = confirmCallback;
    modal.classList.add('show');
    modalCancelBtn.focus();
};

const closeModal = () => {
    modal.classList.remove('show');
    currentAction = null;
    currentTaskId = null;
};

const showDatePickerModal = (title, minDateString = null) => {
    return new Promise((resolve, reject) => {
        const dateModal = document.createElement('div');
        dateModal.className = 'modal show';
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        
        // For finish date: use the start date as minimum
        // For start date: allow unlimited backdating, max is today
        let minDate = minDateString || '1900-01-01'; // Allow backdating to any date
        let maxDate = minDateString ? '9999-12-31' : todayString; // If minDateString (finish date), allow future; otherwise max is today
        
        dateModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-title">
                    <i class="fas fa-calendar"></i> ${title}
                </div>
                ${minDateString ? '<p style="color: #2196F3; font-size: 0.9em; margin: 10px 0; font-weight: bold;">ℹ Finish date must be on or after start date (' + minDateString + ')</p>' : '<p style="color: #4CAF50; font-size: 0.9em; margin: 10px 0;">✓ You can backdate start date</p>'}
                <div class="date-picker-margin">
                    <input type="date" id="date-picker-input" class="date-picker-input" min="${minDate}" max="${maxDate}">
                </div>
                <div class="modal-actions">
                    <button class="modal-cancel-btn" id="date-cancel-btn">Cancel</button>
                    <button class="modal-confirm-btn" id="date-confirm-btn">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dateModal);
        const datePicker = dateModal.querySelector('#date-picker-input');
        datePicker.value = minDateString || todayString; // Default to today, or start date if finish date picker
        datePicker.focus();
        
        const handleConfirm = () => {
            const selectedDate = datePicker.value;
            if (selectedDate) {
                dateModal.remove();
                resolve(selectedDate);
            } else {
                alert('Please select a date');
            }
        };
        
        const handleCancel = () => {
            dateModal.remove();
            reject(new Error('Cancelled'));
        };
        
        dateModal.querySelector('#date-confirm-btn').addEventListener('click', handleConfirm);
        dateModal.querySelector('#date-cancel-btn').addEventListener('click', handleCancel);
        datePicker.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleConfirm();
        });
    });
};

const showDelayReasonModal = (taskId, currentReason) => {
    const delayModal = document.createElement('div');
    delayModal.className = 'delay-reason-modal show';
    delayModal.innerHTML = `
        <div class="delay-reason-modal-content">
            <div class="delay-reason-modal-title">
                <i class="fas fa-exclamation-circle"></i> Delay Reason
            </div>
            <p class="modal-description">
                Please explain why this task was delayed:
            </p>
            <textarea class="delay-reason-textarea" maxlength="500" placeholder="Explain the reason for this delay... (max 500 characters)">${currentReason}</textarea>
            <div class="delay-reason-counter"><span class="char-count">${currentReason.length}</span>/500</div>
            <div class="delay-reason-modal-actions">
                <button class="delay-cancel-btn">Cancel</button>
                <button class="delay-save-btn">Save Reason</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(delayModal);
    const textarea = delayModal.querySelector('.delay-reason-textarea');
    const charCount = delayModal.querySelector('.char-count');
    const counter = delayModal.querySelector('.delay-reason-counter');
    const saveBtn = delayModal.querySelector('.delay-save-btn');
    const cancelBtn = delayModal.querySelector('.delay-cancel-btn');
    
    textarea.focus();
    
    // Character counter
    textarea.addEventListener('input', () => {
        charCount.textContent = textarea.value.length;
        if (textarea.value.length > 400) {
            counter.classList.add('warning');
        } else {
            counter.classList.remove('warning');
        }
        if (textarea.value.length >= 500) {
            counter.classList.add('error');
        } else {
            counter.classList.remove('error');
        }
    });
    
    const handleSave = async () => {
        const reason = textarea.value.trim();
        if (reason === '') {
            showError('Please enter a delay reason');
            return;
        }
        
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Saving...';
        
        const updates = [{
            taskId,
            field: 'delayReason',
            value: reason,
            usrID: userId,
        }];
        
        try {
            await saveTaskUpdates(taskId, updates);
            showSuccess('Delay reason saved successfully!');
            delayModal.remove();
            setTimeout(() => window.location.reload(), 500);
        } catch (err) {
            showError('Failed to save delay reason: ' + err.message);
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Reason';
        }
    };
    
    const handleCancel = () => {
        delayModal.remove();
    };
    
    saveBtn.addEventListener('click', handleSave);
    cancelBtn.addEventListener('click', handleCancel);
    
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSave();
        }
    });
};

// Optimized data processing functions
const updateStatusCounts = (tasks) => {
    const counts = { pending: 0, inprogress: 0, completed: 0, overdue: 0 };
    const totalTasks = tasks.length;
    
    tasks.forEach(task => {
        if (task.TimeFinished) {
            task.Delay > 0 ? counts.overdue++ : counts.completed++;
        } else if (task.TimeStarted) {
            counts.inprogress++;
        } else if (task.IsTaskSelected) {
            counts.pending++;
        }
    });
    
    // Update DOM in one batch
    document.getElementById('pending-count').textContent = counts.pending;
    document.getElementById('inprogress-count').textContent = counts.inprogress;
    document.getElementById('completed-count').textContent = counts.completed;
    document.getElementById('overdue-count').textContent = counts.overdue;
    document.getElementById('total-count').textContent = totalTasks;
    
    const completedPercentage = totalTasks > 0 ? Math.round((counts.completed / totalTasks) * 100) : 0;
    const progressBar = document.getElementById('completion-progress');
    progressBar.style.setProperty('--progress-width', `${completedPercentage}%`);
    document.getElementById('completion-percentage').textContent = `${completedPercentage}%`;
};

const renderTaskTimeline = (tasks) => {
    if (!timelineContainer) return;

    const fragment = document.createDocumentFragment();

    [...tasks]
        .sort((a, b) =>
            (a.StepOrder - b.StepOrder) ||
            (a.Priority - b.Priority) ||
            (a.TaskID - b.TaskID)
        )
        .forEach(task => {
            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';

            if (task.TimeFinished) timelineItem.classList.add('completed');
            if (task.IsTaskSelected) timelineItem.classList.add('current');

            // Get delay color class for the dot
            let dotClass = 'timeline-dot';
            if (task.TimeFinished && task.Delay !== null && task.Delay > 0) {
                dotClass += ` ${getDelayColor(task.Delay, task.DaysRequired)}`;
            } else if (task.TimeFinished && (task.Delay === null || task.Delay === 0)) {
                dotClass += ' delay-on-time';
            }

            timelineItem.innerHTML = `
                <div class="${dotClass}"></div>
                <div class="timeline-label">${task.DeptName}</div>
            `;

            fragment.appendChild(timelineItem);
        });

    timelineContainer.innerHTML = '';
    timelineContainer.appendChild(fragment);
};

const filterTasks = (status) => {
    const rows = document.querySelectorAll('.department-table tbody tr');
    const statusItems = document.querySelectorAll('.status-item');
    
    statusItems.forEach(item => {
        item.classList.toggle('active-filter', item.dataset.filter === status);
    });
    
    rows.forEach(row => {
        const displayStyle = 
            (status === 'pending' && row.querySelector('.status-pending')) ||
            (status === 'inprogress' && row.querySelector('.status-inprogress')) ||
            (status === 'completed' && row.querySelector('.status-completed')) ||
            (status === 'overdue' && row.querySelector('.status-overdue')) ||
            !status ? '' : 'none';
        
        if (displayStyle === 'none') {
          row.classList.add('hidden');
        } else {
          row.classList.remove('hidden');
        }
    });
};

// Optimized async functions
const loadUsers = async (nextDepId) => {
    if (!nextDepId) return;
    
    try {
        const res = await fetch(`/api/users?depId=${nextDepId}`);
        if (!res.ok) throw new Error("Failed to load users");
        users = (await res.json()).users || [];
    } catch (err) {
        console.error("Error loading users:", err);
        showError("Failed to load users for assignment");
    }
};

const saveTaskUpdates = async (taskId, updates) => {
    try {
        const res = await fetch('/save-task-updates', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates })
        });
       
        const data = await res.json(); 
        if (!res.ok) throw new Error(data.error || 'Save failed');
        showSuccess('Changes saved successfully');
        return data.updatedTask || data;
    } catch (err) {
        showError(err.message);
        return null;
    }
};

const startTask = async (taskId) => {
    try {
        const task = taskList.find(t => t.TaskID === Number(taskId));
        if (!task) return showError('Task not found');
        if (!task.workFlowHdrId) return showError('Workflow ID not found');
        
        const selectedDate = await showDatePickerModal('Select Start Date');
        
        const res = await fetch(`/start-task/${taskId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                startTime: selectedDate,
                workFlowHdrId: task.workFlowHdrId,
                processID: task.NumberOfProccessID
            })
        });

        if (!res.ok) throw new Error("Failed to start task");
        showSuccess('Task started successfully');
        window.location.reload();
    } catch (err) {
        if (err.message !== 'Cancelled') {
            showError(err.message);
        }
    }
};

const finishTask = async (taskId) => {
    try {
        const task = taskList.find(t => t.TaskID === Number(taskId));
        if (!task) return showError('Task not found');
        if (!task.workFlowHdrId) return showError('Workflow ID not found');
        
        let startDate = null;
        if (task.TimeStarted) {
            const startDateObj = new Date(task.TimeStarted);
            startDate = startDateObj.getFullYear() + '-' + 
                       String(startDateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(startDateObj.getDate()).padStart(2, '0');
        }
        
        const selectedDate = await showDatePickerModal('Select Finish Date', startDate);
        
        const res = await fetch(`/finish-task/${taskId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                finishTime: selectedDate,
                workFlowHdrId: task.workFlowHdrId,
                processID: task.NumberOfProccessID
            })
        });

        if (!res.ok) throw new Error("Failed to finish task");
        showSuccess('Task marked as finished');
        window.location.reload();
    } catch (err) {
        if (err.message === 'Cancelled') {
            throw err;
        }
        showError(err.message);
    }
};

const assignUserToTask = async (taskId, userId) => {
    try {
        const task = taskList.find(t => t.TaskID === Number(taskId));
        if (!task.workFlowHdrId) return showError('Workflow ID not found');
        const res = await fetch(`/assign-user-to-task/${taskId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId,
                workFlowHdrId: task.workFlowHdrId
            })
        });

        if (!res.ok) throw new Error("Assignment failed");
        showSuccess("User assigned successfully!");
        return true;
    } catch (err) {
        showError("Failed to assign user: " + err.message);
        return false;
    }
};

// Optimized render function with document fragments
const renderTasks = async (tasks) => {
    if (!container) return;
    
    // Clear container once
    container.innerHTML = '';
    
    // Find next task
    const sortedTasks = [...tasks].sort((a, b) => 
        (a.StepOrder - b.StepOrder) || (a.Priority - b.Priority) || (a.TaskID - b.TaskID));
    
    const activeIndex = sortedTasks.findIndex(t => t.IsTaskSelected);
    const hdrId = sortedTasks[0]?.workFlowHdrId; // Get workflow header ID from any task
    
    if (activeIndex !== -1) {
        for (let i = activeIndex + 1; i < sortedTasks.length; i++) {
            const candidate = sortedTasks[i];
            // Ensure next task is from same workflow and not selected/finished
            if (!candidate.IsTaskSelected && !candidate.TimeFinished && candidate.workFlowHdrId === hdrId) {
                nextTask = candidate;
                break;
            }
        }
    }
    
    if (!nextTask) nextTask = sortedTasks.find(t => !t.IsTaskSelected && !t.TimeFinished && t.workFlowHdrId === hdrId);
    if (activeIndex !== -1 && activeIndex !== sortedTasks.length - 1) await loadUsers(nextTask?.DepId);

    // Handle empty tasks
    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-tasks"></i>
                <p>No tasks found for this process.</p>
            </div>
        `;
        return;
    }

    // Group tasks by department
    const grouped = {};
    tasks.forEach(task => {
        if (!grouped[task.DepId]) {
            grouped[task.DepId] = {
                deptName: task.DeptName || `Department ${task.DepId}`,
                stepOrder: task.StepOrder || 9999,
                tasks: []
            };
        }
        grouped[task.DepId].tasks.push(task);
    });

    // Create and append sections in batch
    const fragment = document.createDocumentFragment();
    Object.values(grouped)
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .forEach(group => {
            const section = document.createElement('div');
            section.className = 'department-section';
            
            section.innerHTML = `
                <div class="department-label">
                    <i class="fas fa-building"></i> 
                    ${group.deptName}
                    <span class="badge">${group.tasks.length} tasks</span>
                    <i class="fas fa-chevron-down toggle-icon"></i>
                </div>
                <div class="table-container">
                    <table class="department-table">
                        <thead>
                            <tr>
                                <th>Task Name</th>
                                <th>Description</th>
                                <th>Planned Starting Date</th>
                                <th> Days required</th>
                                <th>Start Date</th>
                                <th>Finished Date</th>
                                <th>Status</th>
                                <th>Days Delay</th>
                                <th>Delay Reason</th>
                                <th>Linked To</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.tasks.map(task => renderTaskRow(task)).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            fragment.appendChild(section);
        });
    
    container.appendChild(fragment);
};

// Optimized task row rendering
// Function to format date string without timezone conversion
const formatDateString = (dateStr) => {
    if (!dateStr) return '';
    // If it's already a date string in format like "2026-01-21" or "2026-01-21 00:00:00"
    if (typeof dateStr === 'string') {
        const datePart = dateStr.split(' ')[0]; // Get just the YYYY-MM-DD part
        if (datePart && datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = datePart.split('-');
            // Format as localized date using the date components directly
            return new Date(year, month - 1, day).toLocaleDateString();
        }
    }
    // Fallback to Date parsing
    const date = new Date(dateStr);
    return date.toLocaleDateString();
};

const renderTaskRow = (task) => {
    const isOwnDepartment = task.DepId == deptId;
    const plannedDate = formatDateString(task.PlannedDate);
    const finishDate = formatDateString(task.TimeFinished);
    const startDate = formatDateString(task.TimeStarted);
    const delayReason = task.DelayReason || '';
    const delayInputDisabled = !isOwnDepartment || !task.TimeFinished ? 'disabled' : '';
    
    let status = '';
    if (task.TimeStarted && !task.TimeFinished) {
        status = '<span class="status-badge status-inprogress"><i class="fas fa-spinner"></i> In Progress</span>';

    } else if (!task.TimeFinished && task.IsTaskSelected) {
        status = '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending</span>';
    } else if (task.TimeFinished && task.Delay > 0) {
        status = '<span class="status-badge status-overdue"><i class="fas fa-exclamation-triangle"></i> Overdue</span>';
    } else if (task.TimeFinished) {
        status = '<span class="status-badge status-completed"><i class="fas fa-check-circle"></i> Completed</span>';
    }

    let actionButton = '';
    if (isOwnDepartment && task.IsTaskSelected) {
        if (!task.TimeStarted) {
            actionButton = `<button class="task-start-btn" data-task-id="${task.TaskID}"> Start</button>`;
        } else if (!task.TimeFinished) {
            actionButton = `<button class="task-finish-btn" data-task-id="${task.TaskID}"> Finish</button>`;
        }
    }

    let extraButtons = '';
    if (!isAdmin && isOwnDepartment && !task.TimeFinished) {
        const buttons = [];
        
        // Save button for delay reason (if there's a delay)
        if (task.Delay > 0) {
            buttons.push(`<button class="row-save-btn" data-task-id="${task.TaskID}" data-save-type="delay"> Save Delay</button>`);
        }
        
        // Save button for days required (if task is not fixed)
        if (!task.IsFixed && task.IsFixed !== true) {
            buttons.push(`<button class="row-save-btn" data-task-id="${task.TaskID}" data-save-type="days"> Save Days</button>`);
        }
        
        extraButtons = buttons.join('');
    }

    let nextTaskSelect = '';
    if (task.IsTaskSelected && task.TimeStarted && !task.TimeFinished && isOwnDepartment && users.length > 0) {
        nextTaskSelect = `
            <div class="assign-user-container">
                <select class="assign-user-select" data-task-id="${task.TaskID}">
                    <option value="">Select user to assign on finish</option>
                    ${users.map(u => `<option value="${u.usrID}">${u.usrDesc}</option>`).join('')}
                </select>
            </div>
        `;
    }

    return `
      <tr ${task.IsTaskSelected ? 'class="active-task-row"' : ''}>
    <td data-label="Task Name">${task.TaskName || ''}</td>
    <td data-label="Description">${task.TaskPlanned || ''}</td>
    <td data-label="Planned Date"><span class="date-display"><i class="fas fa-calendar-alt"></i> ${plannedDate}</span></td>
    <td data-label="Days Required">
        ${(() => {
            const isLocked = task.IsFixed === true || task.IsFixed === 1 || task.TimeFinished || !isOwnDepartment;
            let lockReason = 'This task is fixed';
            if (task.TimeFinished) {
                lockReason = 'Task is finished';
            } else if (!isOwnDepartment) {
                lockReason = 'You can only view tasks from other departments';
            }
            console.log('Task:', task.TaskName, 'IsFixed:', task.IsFixed, 'TimeFinished:', task.TimeFinished, 'isOwnDepartment:', isOwnDepartment, 'IsLocked:', isLocked);
            return isLocked ? 
                `<span class="days-fixed" title="${lockReason}">${task.DaysRequired} <i class="fas fa-lock lock-icon"></i></span>` :
                `<input type="number" value="${task.DaysRequired}" class="days-required-input" data-task-id="${task.TaskID}" min="1" placeholder="Days required">`;
        })()}
    </td>
    <td data-label="Start Date"><span class="date-display ${startDate ? 'has-date' : ''}"><i class="fas fa-play-circle"></i> ${startDate || '-'}</span></td>
    <td data-label="Date Finished"><span class="date-display ${finishDate ? 'has-date' : ''}"><i class="fas fa-check-circle"></i> ${finishDate || '-'}</span></td>
    <td data-label="Status">${status}</td>
    <td data-label="Days Delay">${task.TimeFinished ? (task.Delay !== null && task.Delay > 0 ? `${task.Delay} days` : 'On Time') : '-'}</td>
    <td data-label="Delay Reason">
        ${!isOwnDepartment || !task.TimeFinished ? 
            `<span class="status-text-unavailable">Not available</span>` :
            task.Delay <= 0 ?
            `<span class="status-text-on-time">✓ On Time</span>` :
            `<div class="delay-reason-cell">
                <div class="delay-reason-display">
                    <div class="delay-reason-text">
                        ${delayReason ? `<strong class="delay-reason-emphasis">✓</strong> ${delayReason}` : `<span class="delay-reason-empty">No reason provided</span>`}
                    </div>
                    <button class="edit-reason-btn" data-task-id="${task.TaskID}" title="Edit delay reason">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>`
        }
    </td>
    <td data-label="Linked To">
        ${task.linkTasks ? (() => {
            const linkedTask = taskList.find(t => t.TaskID === task.linkTasks);
            return linkedTask ? `${linkedTask.TaskName} (${linkedTask.DeptName})` : 'N/A';
        })() : '-'}
    </td>
    <td data-label="Actions"><div class="button-container">${actionButton}${extraButtons}</div></td>
</tr>
    `;
};

// Initialize the page with optimized event delegation
renderTasks(taskList);
renderTaskTimeline(taskList);
updateStatusCounts(taskList);

// Optimized event handlers
const handleClickEvents = async (e) => {
    // Department section toggling
    if (e.target.closest('.department-label')) {
        const label = e.target.closest('.department-label');
        label.classList.toggle('collapsed');
        label.parentElement.classList.toggle('collapsed');
        return;
    }
    
    // Edit delay reason button
    if (e.target.classList.contains('edit-reason-btn') || e.target.closest('.edit-reason-btn')) {
        const btn = e.target.classList.contains('edit-reason-btn') ? e.target : e.target.closest('.edit-reason-btn');
        const taskId = btn.dataset.taskId;
        const task = taskList.find(t => t.TaskID === Number(taskId));
        if (task) {
            showDelayReasonModal(taskId, task.DelayReason || '');
        }
        return;
    }
    
    // Edit days icon
    if (e.target.classList.contains('edit-days-icon')) {
        handleEditDaysClick(e);
        return;
    }
    
    // Save button
    if (e.target.classList.contains('row-save-btn')) {
        await handleSaveClick(e);
        return;
    }
    
    // Start task button
    if (e.target.classList.contains('task-start-btn')) {
        const taskId = e.target.dataset.taskId;
        const originalHTML = e.target.innerHTML;
        e.target.innerHTML = '<i class="fas fa-spinner spinner"></i> Starting...';
        e.target.disabled = true;
        startTask(taskId);
        setTimeout(() => {
            e.target.innerHTML = originalHTML;
            e.target.disabled = false;
        }, 500);
        return;
    }
    
    // Finish task button
    if (e.target.classList.contains('task-finish-btn')) {
        const taskId = e.target.dataset.taskId;
        const buttonElement = e.target;
        const originalHTML = buttonElement.innerHTML;
        buttonElement.innerHTML = '<i class="fas fa-spinner spinner"></i> Finishing...';
        buttonElement.disabled = true;
        
        finishTask(taskId).catch(() => {
            // Only re-enable button if there was an error
            buttonElement.innerHTML = originalHTML;
            buttonElement.disabled = false;
        });
        return;
    }

    if (e.target.classList.contains('delay-reason-input')) {
        return;
    }
};

const handleEditDaysClick = (e) => {
    const cell = e.target.closest('td');
    if (!cell) return;
    
    const span = cell.querySelector('.days-display');
    const currentValue = parseInt(span?.textContent.trim() || '1', 10);
    
    cell.innerHTML = `
        <input type="number" class="editable-days days-input-small" 
               value="${currentValue}" 
               min="1" 
               data-task-id="${e.target.closest('tr')?.querySelector('.row-save-btn')?.dataset.taskId || ''}">
    `;
    
    const input = cell.querySelector('.editable-days');
    input?.focus();
};

const handleKeyEvents = (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('editable-days')) {
        e.target.closest('tr')?.querySelector('.row-save-btn')?.click();
    }
    
    if (e.key === 'Escape') {
        closeModal();
    }
};

const handleFocusEvents = (e) => {
    const row = e.target.closest('tr');
    if (!row) return;
    
    if (e.type === 'focusin' && 
        (e.target.classList.contains('editable-days') || 
         e.target.classList.contains('delay-reason-input'))) {
        row.classList.add('keyboard-focus');
    } else if (e.type === 'focusout') {
        row.classList.remove('keyboard-focus');
    }
};

document.addEventListener('click', handleClickEvents);
document.addEventListener('keydown', handleKeyEvents);
document.addEventListener('focusin', handleFocusEvents);
document.addEventListener('focusout', handleFocusEvents);

// Modal event handlers
modalConfirmBtn?.addEventListener('click', async () => {
    if (currentAction) await currentAction();
    closeModal();
});

modalCancelBtn?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e) => e.target === modal && closeModal());

// Filter and search events
const statusFilter = document.getElementById('status-filter');
const sortFilter = document.getElementById('sort-filter');
const searchBtn = document.getElementById('search-btn');
const taskSearch = document.getElementById('task-search');

    statusFilter?.addEventListener('change', (e) => filterTasks(e.target.value));
    sortFilter?.addEventListener('change', (e) => sortTasks(e.target.value));
    searchBtn?.addEventListener('click', () => searchTasks(taskSearch?.value));
    taskSearch?.addEventListener('keyup', (e) => e.key === 'Enter' && searchTasks(e.target.value));
});