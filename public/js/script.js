document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    const loginForm = document.getElementById('loginForm');
    const loginButton = document.getElementById('loginButton');
    const usernameInput = document.getElementById('username');
    const projectSelect = document.getElementById('projectId');

    togglePassword.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        document.querySelector('.fa-eye').style.display = isPassword ? 'none' : 'block';
        document.querySelector('.fa-eye-slash').style.display = isPassword ? 'block' : 'none';
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate form before submission
        if (!projectSelect.value) {
            showToast('Please select a project', 'error');
            projectSelect.focus();
            return;
        }

        if (!usernameInput.value) {
            showToast('Please enter your username/email', 'error');
            usernameInput.focus();
            return;
        }

        if (!passwordInput.value) {
            showToast('Please enter your password', 'error');
            passwordInput.focus();
            return;
        }

        // Set loading state
        loginButton.disabled = true;
        document.querySelector('.button-text').style.display = 'none';
        document.querySelector('.spinner').style.display = 'inline-block';
        
        try {
            const formData = new FormData(loginForm);
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(formData)
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    window.location.href = data.redirect;
                } else {
                    showToast(data.message || 'Invalid credentials', 'error');
                    passwordInput.focus();
                    passwordInput.select();
                }
            } else {
                const errorData = await response.json().catch(() => null);
                showToast(errorData?.message || 'Login failed. Please try again.', 'error');
                passwordInput.focus();
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Network error. Please check your connection.', 'error');
        } finally {
            // Reset button state
            loginButton.disabled = false;
            document.querySelector('.button-text').style.display = 'inline-block';
            document.querySelector('.spinner').style.display = 'none';
        }
    });

    // Email validation on input
    usernameInput.addEventListener('input', (e) => {
        if (e.target.value.includes('@')) {
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value);
            e.target.setCustomValidity(isValid ? '' : 'Please enter a valid email address');
            if (!isValid) {
                showToast('Please enter a valid email address', 'error');
            }
        }
    });

    usernameInput.focus();

    function showToast(message, type = 'error') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = 'toast show ' + type;
        
        if (toast.timeoutId) clearTimeout(toast.timeoutId);
        
        toast.timeoutId = setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, 5000);
    }
    
});