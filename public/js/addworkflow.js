document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('workflow-form');
  const alertMessage = document.getElementById('alert-message');
  const alertText = document.getElementById('alert-text');
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const processId = document.getElementById('process-id').value;
    const projectId = document.getElementById('project-id').value;
    const packageId = document.getElementById('package-id').value;
    const status = document.getElementById('status').value;

    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processID: processId,
          projectID: projectId,
          packageID: packageId,
          status
        })
      });

      if (!res.ok) throw new Error('Server error');

      alertMessage.className = 'alert alert-success';
      alertText.textContent = 'Workflow added successfully!';
      alertMessage.style.display = 'flex';

      setTimeout(() => {
        form.reset();
        alertMessage.style.display = 'none';
      }, 3000);
    } catch (error) {
      alertMessage.className = 'alert alert-danger';
      alertText.textContent = 'Error adding workflow: ' + error.message;
      alertMessage.style.display = 'flex';
    }
  });
});
