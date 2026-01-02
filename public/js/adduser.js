async function loadDepartments() {
  try {
    const res = await fetch('/api/departments');
    if (!res.ok) throw new Error('Failed to load departments');
    
    const departments = await res.json();
    const select = document.getElementById('departmentSelect');
    
    // Add default empty option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Department';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);
    
    // Add department options
    departments.forEach(dept => {
      const option = document.createElement('option');
      option.value = dept.DepartmentID;
      option.textContent = dept.DeptName;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading departments:', error);
    const select = document.getElementById('departmentSelect');
    const errorOption = document.createElement('option');
    errorOption.textContent = 'Error loading departments';
    select.appendChild(errorOption);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadDepartments();
  
  // Handle admin and special user mutual exclusivity
  const adminCheckbox = document.getElementById('usrAdmin');
  const specialUserCheckbox = document.getElementById('IsSpecialUser');
  
  adminCheckbox?.addEventListener('change', function() {
    if (this.checked && specialUserCheckbox.checked) {
      specialUserCheckbox.checked = false;
      alert('A user cannot be both Admin and Special User');
    }
    // If admin is checked, disable department selection
    document.getElementById('departmentSelect').disabled = this.checked;
    document.getElementById('departmentSelect').value = '';
  });
  
  specialUserCheckbox?.addEventListener('change', function() {
    if (this.checked && adminCheckbox.checked) {
      adminCheckbox.checked = false;
      alert('A user cannot be both Admin and Special User');
    }
  });
});

// Form submission and success message
const form = document.querySelector('.form-grid');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Validate that user is not both admin and special user
  const isAdmin = document.getElementById('usrAdmin').checked;
  const isSpecialUser = document.getElementById('IsSpecialUser').checked;
  
  if (isAdmin && isSpecialUser) {
    alert('A user cannot be both Admin and Special User');
    return;
  }
  
  // Get form data as JSON
  const formData = new FormData(form);
  const jsonData = {
    usrID: formData.get('usrID'),
    usrDesc: formData.get('usrDesc'),
    usrPWD: formData.get('usrPWD'),
    usrEmail: formData.get('usrEmail'),
    DepartmentID: isAdmin ? null : formData.get('DepartmentID'),
    usrSTID: formData.get('usrSTID') ? parseInt(formData.get('usrSTID')) : null,
    Export: formData.get('Export') ? parseInt(formData.get('Export')) : 0,
    usrReadPolicy: formData.get('usrReadPolicy') ? parseInt(formData.get('usrReadPolicy')) : 0,
    usrSignature: formData.get('usrSignature'),
    emailSignature: formData.get('emailSignature'),
    usrAdmin: isAdmin ? 1 : 0,
    IsSpecialUser: isSpecialUser ? 1 : 0,
    AllowAccess: formData.get('AllowAccess') ? 1 : 0
  };
  
  try {
    const response = await fetch('/addUser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jsonData)
    });

    const responseData = await response.json().catch(() => ({}));

    if (response.ok) {
      // Show success message
      const message = document.createElement('div');
      message.className = 'success-message';
      message.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>User added successfully! Redirecting...</span>
      `;
      document.body.appendChild(message);
      message.classList.add('show');

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/adminpage';
      }, 2000);
    } else {
      // Show error message
      const errorMsg = responseData.error || 'Failed to add user. Please try again.';
      const message = document.createElement('div');
      message.className = 'error-message';
      message.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${errorMsg}</span>
      `;
      document.body.appendChild(message);
      message.classList.add('show');

      // Remove error message after 5 seconds
      setTimeout(() => {
        message.remove();
      }, 5000);
    }
  } catch (error) {
    console.error('Error:', error);
    const message = document.createElement('div');
    message.className = 'error-message';
    message.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>An error occurred while adding the user: ${error.message}</span>
    `;
    document.body.appendChild(message);
    message.classList.add('show');
  }
});
