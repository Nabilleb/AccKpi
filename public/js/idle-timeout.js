/**
 * Idle Session Timeout
 * Logs out user after specified period of inactivity
 */

(function() {
  const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
  const WARNING_TIMEOUT = 29 * 60 * 1000; // 29 minutes - show warning before logout
  
  let idleTimer = null;
  let warningTimer = null;

  // List of events to track user activity
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  function resetIdleTimer() {
    // Clear existing timers
    if (idleTimer) clearTimeout(idleTimer);
    if (warningTimer) clearTimeout(warningTimer);

    // Set warning timer (show warning 1 minute before logout)
    warningTimer = setTimeout(() => {
      showWarning();
    }, WARNING_TIMEOUT);

    // Set logout timer
    idleTimer = setTimeout(() => {
      logoutUser();
    }, IDLE_TIMEOUT);
  }

  function showWarning() {
    // Create warning message
    const existingWarning = document.getElementById('idle-warning');
    if (existingWarning) return;

    const warningDiv = document.createElement('div');
    warningDiv.id = 'idle-warning';
    warningDiv.className = 'idle-warning';
    warningDiv.innerHTML = `
      <div class="idle-warning-content">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Session Timeout Warning</h3>
        <p>Your session will expire due to inactivity in 1 minute.</p>
        <button id="continue-session-btn" class="btn btn-primary">Continue Session</button>
      </div>
    `;
    document.body.appendChild(warningDiv);

    // Add styles if not already present
    if (!document.getElementById('idle-warning-style')) {
      const style = document.createElement('style');
      style.id = 'idle-warning-style';
      style.textContent = `
        .idle-warning {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .idle-warning-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          text-align: center;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .idle-warning-content i {
          font-size: 3rem;
          color: #dc3545;
          margin-bottom: 1rem;
          display: block;
        }

        .idle-warning-content h3 {
          color: #333;
          margin-bottom: 0.5rem;
          font-size: 1.5rem;
        }

        .idle-warning-content p {
          color: #666;
          margin-bottom: 1.5rem;
        }

        #continue-session-btn {
          padding: 0.75rem 2rem;
          background: #005bab;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.3s;
        }

        #continue-session-btn:hover {
          background: #003f7f;
        }
      `;
      document.head.appendChild(style);
    }

    // Handle continue button
    document.getElementById('continue-session-btn').addEventListener('click', () => {
      removeWarning();
      resetIdleTimer();
    });
  }

  function removeWarning() {
    const warning = document.getElementById('idle-warning');
    if (warning) {
      warning.remove();
    }
  }

  function logoutUser() {
    // Fetch logout endpoint
    fetch('/logout', {
      method: 'GET',
      credentials: 'include'
    }).then(() => {
      // Redirect to login page
      window.location.href = '/login';
    }).catch((error) => {
      console.error('Logout error:', error);
      // Fallback: redirect to login anyway
      window.location.href = '/login';
    });
  }

  // Initialize idle timer on page load
  document.addEventListener('DOMContentLoaded', () => {
    resetIdleTimer();

    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, () => {
        removeWarning();
        resetIdleTimer();
      }, true);
    });
  });

  // Also initialize if DOMContentLoaded has already fired
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      resetIdleTimer();
      events.forEach(event => {
        document.addEventListener(event, () => {
          removeWarning();
          resetIdleTimer();
        }, true);
      });
    });
  } else {
    resetIdleTimer();
    events.forEach(event => {
      document.addEventListener(event, () => {
        removeWarning();
        resetIdleTimer();
      }, true);
    });
  }
})();
