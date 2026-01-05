// Toast notification function
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Update user row in table dynamically
function updateUserRow(usrID, usrAdmin, isSpecialUser) {
  const row = document.querySelector(`tr[data-userid="${usrID}"]`);
  if (!row) return;

  // Update Role column (2nd column)
  const roleCell = row.querySelectorAll('td')[2];
  if (usrAdmin) {
    roleCell.innerHTML = '<span class="badge badge-admin"><i class="fas fa-shield-alt"></i> Admin</span>';
  } else {
    roleCell.innerHTML = '<span class="badge badge-user"><i class="fas fa-user"></i> User</span>';
  }

  // Update Status column (3rd column)
  const statusCell = row.querySelectorAll('td')[3];
  if (usrAdmin) {
    statusCell.innerHTML = '<span class="badge badge-admin"><i class="fas fa-shield-alt"></i> Admin</span>';
  } else if (isSpecialUser) {
    statusCell.innerHTML = '<span class="badge badge-special"><i class="fas fa-star"></i> Special User</span>';
  } else {
    statusCell.innerHTML = '<span class="text-dark">Regular</span>';
  }

  // Update Actions column (7th column)
  const actionsCell = row.querySelectorAll('td')[7];
  let actionsHTML = '';
  
  if (!usrAdmin) {
    actionsHTML += `
      <button class="btn-action btn-admin" data-action="grant-admin" data-userid="${usrID}" data-username="${row.querySelectorAll('td')[1].innerText}">
        <i class="fas fa-crown"></i> Make Admin
      </button>
    `;
  } else {
    actionsHTML += `
      <button class="btn-action btn-danger" data-action="revoke-admin" data-userid="${usrID}" data-username="${row.querySelectorAll('td')[1].innerText}">
        <i class="fas fa-times"></i> Remove Admin
      </button>
    `;
  }

  if (!isSpecialUser) {
    actionsHTML += `
      <button class="btn-action btn-special" data-action="grant-special" data-userid="${usrID}" data-username="${row.querySelectorAll('td')[1].innerText}">
        <i class="fas fa-star"></i> Special
      </button>
    `;
  } else {
    actionsHTML += `
      <button class="btn-action btn-secondary" data-action="revoke-special" data-userid="${usrID}" data-username="${row.querySelectorAll('td')[1].innerText}">
        <i class="fas fa-times"></i> Regular
      </button>
    `;
  }

  actionsCell.innerHTML = actionsHTML;
}

// Confirmation popup
function showConfirm(title, message) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'confirm-modal';
    modal.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-header">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>${title}</h3>
        </div>
        <div class="confirm-body">
          <p>${message}</p>
        </div>
        <div class="confirm-footer">
          <button class="btn-confirm-cancel">Cancel</button>
          <button class="btn-confirm-ok">Yes, Change it</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.btn-confirm-cancel').onclick = () => {
      modal.remove();
      resolve(false);
    };
    
    modal.querySelector('.btn-confirm-ok').onclick = () => {
      modal.remove();
      resolve(true);
    };

    // Allow ESC to cancel
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

// Event delegation for permission buttons
document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const usrID = btn.dataset.userid;
    const usrDesc = btn.dataset.username;

    switch(action) {
      case 'grant-admin':
        grantAdmin(usrID, usrDesc);
        break;
      case 'revoke-admin':
        revokeAdmin(usrID, usrDesc);
        break;
      case 'grant-special':
        grantSpecial(usrID, usrDesc);
        break;
      case 'revoke-special':
        revokeSpecial(usrID, usrDesc);
        break;
    }
  });
});

// Grant admin permission
function grantAdmin(usrID, usrDesc) {
  showConfirm(
    'Make Administrator?',
    `Are you sure you want to make <strong>${usrDesc}</strong> an Administrator?<br><br><small>This will remove special user status if they have it.</small>`
  ).then(confirmed => {
    if (confirmed) {
      fetch('/update-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrID, permission: 'admin', value: true })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(`✓ Change successfully - ${usrDesc} is now an Administrator`);
          updateUserRow(usrID, true, false);
        } else {
          showToast(data.error || 'Failed to update', 'error');
        }
      })
      .catch(err => {
        showToast('Error: ' + err.message, 'error');
      });
    }
  });
}

// Revoke admin permission
function revokeAdmin(usrID, usrDesc) {
  showConfirm(
    'Remove Admin Privileges?',
    `Are you sure you want to remove admin privileges from <strong>${usrDesc}</strong>?<br><br><small>They will become a regular user.</small>`
  ).then(confirmed => {
    if (confirmed) {
      fetch('/update-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrID, permission: 'admin', value: false })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(`✓ Change successfully - ${usrDesc} is no longer an Administrator`);
          updateUserRow(usrID, false, false);
        } else {
          showToast(data.error || 'Failed to update', 'error');
        }
      })
      .catch(err => showToast('Error: ' + err.message, 'error'));
    }
  });
}

// Grant special user permission
function grantSpecial(usrID, usrDesc) {
  showConfirm(
    'Make Special User?',
    `Are you sure you want to make <strong>${usrDesc}</strong> a Special User?<br><br><small>This will remove admin status if they have it.</small>`
  ).then(confirmed => {
    if (confirmed) {
      fetch('/update-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrID, permission: 'special', value: true })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(`✓ Change successfully - ${usrDesc} is now a Special User`);
          updateUserRow(usrID, false, true);
        } else {
          showToast(data.error || 'Failed to update', 'error');
        }
      })
      .catch(err => showToast('Error: ' + err.message, 'error'));
    }
  });
}

// Revoke special user permission
function revokeSpecial(usrID, usrDesc) {
  showConfirm(
    'Remove Special Status?',
    `Are you sure you want to remove special user status from <strong>${usrDesc}</strong>?<br><br><small>They will become a regular user.</small>`
  ).then(confirmed => {
    if (confirmed) {
      fetch('/update-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrID, permission: 'special', value: false })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(`✓ Change successfully - ${usrDesc} is now a Regular User`);
          updateUserRow(usrID, false, false);
        } else {
          showToast(data.error || 'Failed to update', 'error');
        }
      })
      .catch(err => showToast('Error: ' + err.message, 'error'));
    }
  });
}
