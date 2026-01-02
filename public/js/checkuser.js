// Search functionality
document.getElementById('userSearch').addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('.user-row');

  rows.forEach(row => {
    const searchText = row.getAttribute('data-searchtext');
    if (searchText.includes(searchTerm)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
});

// Delete user functionality
function deleteUser(usrID) {
  if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    deleteUserConfirmed(usrID);
  }
}

function viewUserDetails(usrID) {
  // Redirect to userpage with the user ID
  window.location.href = `/userpage/${usrID}`;
}

function deleteUserConfirmed(usrID) {
  fetch(`/delete-user/${usrID}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showToast('User deleted successfully', 'success');
      setTimeout(() => {
        location.reload();
      }, 1000);
    } else {
      showToast(data.message || 'Error deleting user', 'error');
    }
  })
  .catch(error => {
    showToast('Error deleting user: ' + error.message, 'error');
  });
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  const styles = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '1rem 1.5rem',
    borderRadius: '6px',
    color: 'white',
    zIndex: '9999',
    animation: 'slideIn 0.3s ease-in-out',
    fontSize: '0.95rem'
  };

  const typeStyles = {
    success: { backgroundColor: '#10b981' },
    error: { backgroundColor: '#ef4444' },
    info: { backgroundColor: '#3b82f6' }
  };

  Object.assign(toast.style, styles, typeStyles[type] || typeStyles.info);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// CSS for toast animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
