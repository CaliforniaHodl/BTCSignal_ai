// Recovery Page - Access Restoration
(function() {
  // Update current access status display
  function updateStatusDisplay() {
    const statusIcon = document.getElementById('recover-status-icon');
    const statusText = document.getElementById('recover-status-text');
    const storedCodeSection = document.getElementById('stored-code-section');
    const storedCode = document.getElementById('stored-recovery-code');

    if (!statusIcon || !statusText) return;

    const access = BTCSAIAccess.getAccess();
    const recoveryCode = BTCSAIAccess.getRecoveryCode();

    if (access && access.valid) {
      statusIcon.textContent = '✅';
      statusText.textContent = BTCSAIAccess.formatRemaining(access.remaining) + ' (' + access.tier + ' pass)';
      statusText.className = 'status-text active';
    } else if (access && access.expired) {
      statusIcon.textContent = '⏰';
      statusText.textContent = 'Your ' + access.tier + ' pass has expired';
      statusText.className = 'status-text expired';
    } else {
      statusIcon.textContent = '🔒';
      statusText.textContent = 'No active access';
      statusText.className = 'status-text';
    }

    // Show stored recovery code if available
    if (recoveryCode && storedCodeSection && storedCode) {
      storedCodeSection.style.display = 'block';
      storedCode.textContent = recoveryCode;
    }
  }

  // Handle recovery form submission
  const recoveryForm = document.getElementById('recovery-form');
  if (recoveryForm) {
    recoveryForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const input = document.getElementById('recovery-input');
      const btnRecover = document.getElementById('btn-recover');
      const btnText = btnRecover.querySelector('.btn-text');
      const btnLoading = btnRecover.querySelector('.btn-loading');
      const resultDiv = document.getElementById('recovery-result');
      const resultContent = resultDiv.querySelector('.result-content');

      const value = input.value.trim();

      if (!value) {
        showResult('error', 'Please enter a recovery code or payment hash.');
        return;
      }

      // Show loading state
      btnText.style.display = 'none';
      btnLoading.style.display = 'inline';
      btnRecover.disabled = true;
      resultDiv.style.display = 'none';

      try {
        const result = await BTCSAIAccess.recoverAccess(value);

        if (result.success) {
          showResult('success', buildSuccessMessage(result));
          updateStatusDisplay();

          // Redirect after delay
          setTimeout(function() {
            window.location.href = '/dashboard/';
          }, 3000);
        } else {
          showResult('error', result.error || 'Recovery failed. Please check your input and try again.');
        }
      } catch (error) {
        console.error('Recovery error:', error);
        showResult('error', 'An error occurred. Please try again.');
      } finally {
        // Reset button state
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        btnRecover.disabled = false;
      }
    });
  }

  // Show result message
  function showResult(type, message) {
    const resultDiv = document.getElementById('recovery-result');
    const resultContent = resultDiv.querySelector('.result-content');

    resultDiv.style.display = 'block';
    resultDiv.className = 'recovery-result ' + type;
    resultContent.innerHTML = message;
  }

  // Build success message
  function buildSuccessMessage(result) {
    const tierNames = {
      single: 'Single Post',
      hourly: 'Hour Pass',
      daily: 'Day Pass',
      weekly: 'Week Pass',
      monthly: 'Month Pass'
    };

    let expiryText = 'Never';
    if (result.expiresAt) {
      const expiry = new Date(result.expiresAt);
      expiryText = expiry.toLocaleDateString() + ' at ' + expiry.toLocaleTimeString();
    }

    return `
      <div class="success-message">
        <span class="success-icon">✅</span>
        <h3>Access Restored!</h3>
        <p><strong>Tier:</strong> ${tierNames[result.tier] || result.tier}</p>
        <p><strong>Expires:</strong> ${expiryText}</p>
        <p class="redirect-notice">Redirecting to dashboard in 3 seconds...</p>
      </div>
    `;
  }

  // Copy stored code button
  const btnCopyStored = document.getElementById('btn-copy-stored');
  if (btnCopyStored) {
    btnCopyStored.addEventListener('click', function() {
      const code = document.getElementById('stored-recovery-code').textContent;
      navigator.clipboard.writeText(code);
      this.textContent = '✓';
      setTimeout(function() {
        btnCopyStored.textContent = '📋';
      }, 2000);
    });
  }

  // Format input as user types (uppercase, add dashes)
  const recoveryInput = document.getElementById('recovery-input');
  if (recoveryInput) {
    recoveryInput.addEventListener('input', function(e) {
      let value = e.target.value.toUpperCase();

      // If it looks like a recovery code, help format it
      if (value.startsWith('BTCSIG') && !value.includes('-')) {
        // User pasted without dashes, try to format
        value = value.replace(/^BTCSIG/, 'BTCSIG-');
      }

      e.target.value = value;
    });

    // Auto-focus on input
    recoveryInput.focus();
  }

  // Initialize
  updateStatusDisplay();
})();
