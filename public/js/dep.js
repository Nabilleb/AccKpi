const emailInput = document.getElementById('deptEmail');
const emailError = document.getElementById('emailError');
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Email validation on blur
emailInput.addEventListener('blur', function() {
    if (this.value && !emailPattern.test(this.value)) {
        emailError.textContent = '❌ Please enter a valid email address';
        emailError.style.display = 'block';
        this.classList.add('is-invalid');
    } else {
        emailError.style.display = 'none';
        this.classList.remove('is-invalid');
    }
});

// Real-time validation on input
emailInput.addEventListener('input', function() {
    if (!this.value || emailPattern.test(this.value)) {
        emailError.style.display = 'none';
        this.classList.remove('is-invalid');
    }
});

// Form submission validation
document.getElementById('departmentForm').addEventListener('submit', function(e) {
    const deptName = document.getElementById('deptName').value.trim();
    const deptEmail = document.getElementById('deptEmail').value.trim();
    
    if (!deptName) {
        e.preventDefault();
        alert('❌ Department name is required');
        return false;
    }

    if (deptName.length > 100) {
        e.preventDefault();
        alert('❌ Department name cannot exceed 100 characters');
        return false;
    }

    if (deptEmail && !emailPattern.test(deptEmail)) {
        e.preventDefault();
        emailError.textContent = '❌ Please enter a valid email address';
        emailError.style.display = 'block';
        emailInput.classList.add('is-invalid');
        alert('❌ Please enter a valid email address');
        return false;
    }
});
