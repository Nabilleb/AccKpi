// Event delegation for permission buttons
document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const usrID = btn.dataset.userid;
    const usrDesc = btn.dataset.username;

    switch(action) {
      case 'grant-admin':
        grantAdmin(usrID, usrDesc);
        break;
      case 'revoke-admin':
        revokeAdmin(usrID, usrDesc);
        break;
      case 'grant-special':
        grantSpecial(usrID, usrDesc);
        break;
      case 'revoke-special':
        revokeSpecial(usrID, usrDesc);
        break;
    }
  });
});

// Grant admin permission
function grantAdmin(usrID, usrDesc) {
  console.log('grantAdmin called', usrID, usrDesc);
  if (confirm(`Make ${usrDesc} an Administrator?`)) {
    fetch('/update-permission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usrID, permission: 'admin', value: true })
    })
    .then(res => res.json())
    .then(data => {
      console.log('Response:', data);
      if (data.success) {
        alert(`✓ ${usrDesc} is now an Administrator`);
        location.reload();
      } else {
        alert('Error: ' + (data.error || 'Failed to update'));
      }
    })
    .catch(err => {
      console.error('Fetch error:', err);
      alert('Error: ' + err.message);
    });
  }
}

// Revoke admin permission
function revokeAdmin(usrID, usrDesc) {
  if (confirm(`Remove admin privileges from ${usrDesc}?`)) {
    fetch('/update-permission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usrID, permission: 'admin', value: false })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(`✓ ${usrDesc} is no longer an Administrator`);
        location.reload();
      } else {
        alert('Error: ' + (data.error || 'Failed to update'));
      }
    })
    .catch(err => alert('Error: ' + err.message));
  }
}

// Grant special user permission
function grantSpecial(usrID, usrDesc) {
  if (confirm(`Make ${usrDesc} a Special User?`)) {
    fetch('/update-permission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usrID, permission: 'special', value: true })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(`✓ ${usrDesc} is now a Special User`);
        location.reload();
      } else {
        alert('Error: ' + (data.error || 'Failed to update'));
      }
    })
    .catch(err => alert('Error: ' + err.message));
  }
}

// Revoke special user permission
function revokeSpecial(usrID, usrDesc) {
  if (confirm(`Remove special user status from ${usrDesc}?`)) {
    fetch('/update-permission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usrID, permission: 'special', value: false })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(`✓ ${usrDesc} is now a Regular User`);
        location.reload();
      } else {
        alert('Error: ' + (data.error || 'Failed to update'));
      }
    })
    .catch(err => alert('Error: ' + err.message));
  }
}
