document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
  
    togglePassword.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePassword.innerHTML = type === 'password' ? '👁️' : '👁️‍🗨️'; // Toggle eye icons
    });
  });