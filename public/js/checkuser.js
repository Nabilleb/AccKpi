// Search functionality
document.getElementById('userSearch').addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase();
  const rows = document.querySelectorAll('.user-row');

  rows.forEach(row => {
    const searchText = row.getAttribute('data-searchtext');
    if (searchText.includes(searchTerm)) {
      row.classList.remove('hidden');
    } else {
      row.classList.add('hidden');
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
  document.body.appendChild(toast);

  // Trigger animation via class
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.add('animate-slide-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// CSS for toast animations
const style = document.createElement('style');
style.textContent = `
  .toast {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 6px;
    color: white;
    z-index: 9999;
    font-size: 0.95rem;
    animation: slideIn 0.3s ease-in-out;
  }

  .toast-success {
    background-color: #10b981;
  }

  .toast-error {
    background-color: #ef4444;
  }

  .toast-info {
    background-color: #3b82f6;
  }

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
