document.addEventListener('DOMContentLoaded', function() {
  const taskSelect = document.getElementById("TaskID");
  const packageSelect = document.getElementById("PkgeID");
  const form = document.querySelector("form");

  async function fetchAndFillWorkflow() {
    const taskID = taskSelect.value;
    const pkgeID = packageSelect.value;

    if (!taskID || !pkgeID) return;

    try {
      const res = await fetch(`/getWorkflow?TaskID=${taskID}&PkgeID=${pkgeID}`);
      const data = await res.json();

      if (data) {
        document.getElementById("WorkflowName").value = data.WorkflowName || "";
        document.getElementById("usrID").value = data.usrID || "";
        
        if (data.TimeStarted) {
          const startDate = new Date(data.TimeStarted);
          document.getElementById("TimeStarted").value = startDate.toISOString().slice(0, 16);
        }
        
        if (data.TimeFinished) {
          const endDate = new Date(data.TimeFinished);
          document.getElementById("TimeFinished").value = endDate.toISOString().slice(0, 16);
        }
      } else {
        document.getElementById("WorkflowName").value = "";
        document.getElementById("usrID").value = "";
        document.getElementById("TimeStarted").value = "";
        document.getElementById("TimeFinished").value = "";
      }
    } catch (error) {
      console.error("Error fetching workflow:", error);
    }
  }

  // Form submission handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = '<i class="fas fa-spinner"></i> Creating...';
    
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form)
      });
      
      if (response.ok) {
        window.location.href = '/workflows?success=true';
      } else {
        alert('Error creating workflow');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create workflow');
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Workflow';
    }
  });

  taskSelect.addEventListener("change", fetchAndFillWorkflow);
  packageSelect.addEventListener("change", fetchAndFillWorkflow);
});
