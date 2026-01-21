const form = document.getElementById('add-package-form');
const successModal = document.getElementById('success-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const cancelBtn = document.getElementById('cancel-btn');

// Form submission handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formDataObj = new FormData(form);
  
  // Convert FormData to JSON object
  const jsonData = {
    packageName: formDataObj.get('packageName'),
    duration: parseInt(formDataObj.get('duration')) || 0,
    startDate: formDataObj.get('startDate'),
    division: formDataObj.get('division'),
    selected: formDataObj.get('selected') ? 1 : 0,
    standard: formDataObj.get('standard') ? 1 : 0,
    synched: formDataObj.get('synched') ? 1 : 0,
    trade: formDataObj.get('trade'),
    'file-upload': formDataObj.get('fileUpload')?.name || null
  };

  // Validate required fields
  if (!jsonData.packageName || !jsonData.duration || !jsonData.startDate || !jsonData.division || !jsonData.trade) {
    alert('Please fill in all required fields.');
    return;
  }

  try {
    const response = await fetch('/addPackage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(jsonData)
    });

    const responseData = await response.json().catch(() => ({}));

    if (response.ok) {
      // Show success modal
      successModal.classList.remove('hidden');
    } else {
      const errorMsg = responseData.error || 'Failed to add package. Please try again.';
      alert(errorMsg);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while adding the package: ' + error.message);
  }
});

// Modal close button
modalCloseBtn.addEventListener('click', () => {
  successModal.classList.add('hidden');
  form.reset();
  // Redirect to admin page after closing
  setTimeout(() => {
    window.location.href = '/adminpage';
  }, 300);
});

// Cancel button
cancelBtn.addEventListener('click', () => {
  window.location.href = '/adminpage';
});

// Close modal when clicking outside of it
successModal.addEventListener('click', (e) => {
  if (e.target === successModal) {
    successModal.classList.add('hidden');
    form.reset();
    setTimeout(() => {
      window.location.href = '/adminpage';
    }, 300);
  }
});
