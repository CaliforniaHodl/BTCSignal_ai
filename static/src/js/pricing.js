// Pricing Page - Payment Flow
(function() {
  // Update access status display
  function updateAccessStatus() {
    const statusIcon = document.querySelector('.status-icon');
    const statusText = document.getElementById('status-text');

    if (!statusIcon || !statusText) return;

    const access = BTCSAIAccess.getAccess();

    if (access && access.valid) {
      statusIcon.textContent = '✅';
      statusText.textContent = BTCSAIAccess.formatRemaining(access.remaining) + ' (' + access.tier + ' pass)';
      statusText.className = 'status-text active';
    } else if (access && access.expired) {
      statusIcon.textContent = '⏰';
      statusText.textContent = 'Your ' + access.tier + ' pass has expired';
      statusText.className = 'status-text expired';
    } else {
      const unlockedPosts = BTCSAIAccess.getUnlockedPosts();
      if (unlockedPosts.length > 0) {
        statusIcon.textContent = '📄';
        statusText.textContent = unlockedPosts.length + ' individual post(s) unlocked';
        statusText.className = 'status-text partial';
      } else {
        statusIcon.textContent = '🔒';
        statusText.textContent = 'No active subscription';
        statusText.className = 'status-text';
      }
    }
  }

  // Handle purchase button clicks
  document.querySelectorAll('.btn-purchase').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      const tier = this.dataset.tier;
      const amount = parseInt(this.dataset.amount);

      showPaymentModal(tier, amount);
    });
  });

  // Payment modal
  const modal = document.getElementById('payment-modal');
  const modalClose = document.getElementById('modal-close');

  if (modalClose) {
    modalClose.addEventListener('click', function() {
      modal.style.display = 'none';
    });
  }

  // Close modal on outside click
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  }

  // Show payment modal and create invoice
  async function showPaymentModal(tier, amount) {
    const modal = document.getElementById('payment-modal');
    const title = document.getElementById('modal-title');
    const qrContainer = document.getElementById('qr-container');
    const invoiceAmount = document.getElementById('invoice-amount');
    const invoiceExpires = document.getElementById('invoice-expires');
    const invoiceText = document.getElementById('invoice-text');
    const btnCopy = document.getElementById('btn-copy');
    const btnWallet = document.getElementById('btn-wallet');
    const paymentStatus = document.getElementById('payment-status');

    // Show modal
    modal.style.display = 'flex';

    // Set title
    const tierNames = {
      single: 'Single Post',
      hourly: 'Hour Pass',
      daily: 'Day Pass',
      weekly: 'Week Pass',
      monthly: 'Month Pass',
      yearly: 'Year Pass'
    };
    title.textContent = 'Pay for ' + tierNames[tier];

    // Reset state
    qrContainer.innerHTML = '<div class="loading-spinner">Generating invoice...</div>';
    paymentStatus.innerHTML = '<span class="status-waiting">Waiting for payment...</span>';

    try {
      // Create invoice via Netlify function
      const response = await fetch('/.netlify/functions/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, amount })
      });

      const data = await response.json();

      if (!data.payment_request) {
        throw new Error('Failed to create invoice');
      }

      // Display QR code
      qrContainer.innerHTML = '<img src="' + data.qr_code + '" alt="Lightning Invoice QR" class="qr-code">';

      // Invoice details
      invoiceAmount.textContent = amount.toLocaleString() + ' sats';
      invoiceExpires.textContent = 'Expires in 10 minutes';
      invoiceText.value = data.payment_request;

      // Wallet link
      btnWallet.href = 'lightning:' + data.payment_request;

      // Copy button
      btnCopy.onclick = function() {
        navigator.clipboard.writeText(data.payment_request);
        btnCopy.textContent = 'Copied!';
        setTimeout(function() {
          btnCopy.textContent = 'Copy Invoice';
        }, 2000);
      };

      // Start polling for payment
      pollPaymentStatus(data.payment_hash, tier, amount);

    } catch (error) {
      console.error('Invoice creation error:', error);
      qrContainer.innerHTML = '<p class="error">Failed to create invoice. Please try again.</p>';
    }
  }

  // Poll for payment confirmation
  let pollInterval = null;

  async function pollPaymentStatus(paymentHash, tier, amount) {
    const paymentStatus = document.getElementById('payment-status');
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes at 5 second intervals

    if (pollInterval) {
      clearInterval(pollInterval);
    }

    pollInterval = setInterval(async function() {
      attempts++;

      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        paymentStatus.innerHTML = '<span class="status-expired">Invoice expired. Please try again.</span>';
        return;
      }

      try {
        const response = await fetch('/.netlify/functions/check-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_hash: paymentHash })
        });

        const data = await response.json();

        if (data.paid) {
          clearInterval(pollInterval);
          paymentStatus.innerHTML = '<span class="status-success">✅ Payment confirmed! Generating recovery code...</span>';

          // Grant access locally
          if (tier === 'single') {
            // For single posts, we'd need the post ID - handled separately
          } else {
            // Time-based access
            const duration = BTCSAIAccess.TIER_DURATIONS[tier];
            BTCSAIAccess.setAccess(tier, duration);
          }

          // Store access record and get recovery code
          try {
            const storeResponse = await fetch('/.netlify/functions/store-access', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentHash: paymentHash,
                tier: tier,
                amountSats: amount
              })
            });

            const storeData = await storeResponse.json();

            if (storeData.success && storeData.recoveryCode) {
              // Store recovery code and session token locally
              BTCSAIAccess.setRecoveryCode(storeData.recoveryCode);
              if (storeData.sessionToken) {
                BTCSAIAccess.setSessionToken(storeData.sessionToken);
              }

              // Close payment modal and show recovery modal
              document.getElementById('payment-modal').style.display = 'none';
              showRecoveryModal(storeData.recoveryCode, tier, storeData.expiresAt, paymentHash);
            } else {
              // Still grant access but warn about recovery
              console.warn('Failed to get recovery code:', storeData.error);
              paymentStatus.innerHTML = '<span class="status-success">✅ Access granted! (Recovery code unavailable)</span>';
              setTimeout(function() {
                document.getElementById('payment-modal').style.display = 'none';
                window.location.reload();
              }, 2000);
            }
          } catch (storeError) {
            console.error('Store access error:', storeError);
            // Still grant access but warn
            paymentStatus.innerHTML = '<span class="status-success">✅ Access granted!</span>';
            setTimeout(function() {
              document.getElementById('payment-modal').style.display = 'none';
              window.location.reload();
            }, 2000);
          }

          // Update status display
          updateAccessStatus();
        }
      } catch (error) {
        console.error('Payment check error:', error);
      }
    }, 5000);
  }

  // Show recovery code modal
  function showRecoveryModal(recoveryCode, tier, expiresAt, paymentHash) {
    const modal = document.getElementById('recovery-modal');
    const codeText = document.getElementById('recovery-code-text');
    const tierDisplay = document.getElementById('recovery-tier');
    const expiresDisplay = document.getElementById('recovery-expires');
    const btnCopy = document.getElementById('btn-copy-recovery');
    const btnDownload = document.getElementById('btn-download-recovery');
    const btnContinue = document.getElementById('btn-continue-access');

    // Display recovery code
    codeText.textContent = recoveryCode;

    // Display tier
    const tierNames = {
      single: 'Single Post',
      hourly: 'Hour Pass',
      daily: 'Day Pass',
      weekly: 'Week Pass',
      monthly: 'Month Pass',
      yearly: 'Year Pass'
    };
    tierDisplay.textContent = tierNames[tier] || tier;

    // Display expiry
    if (expiresAt) {
      const expiry = new Date(expiresAt);
      expiresDisplay.textContent = expiry.toLocaleDateString() + ' at ' + expiry.toLocaleTimeString();
    } else {
      expiresDisplay.textContent = 'Never (permanent access)';
    }

    // Show modal
    modal.style.display = 'flex';

    // Copy button handler
    btnCopy.onclick = function() {
      navigator.clipboard.writeText(recoveryCode);
      btnCopy.innerHTML = '<span class="copy-icon">✓</span>';
      setTimeout(function() {
        btnCopy.innerHTML = '<span class="copy-icon">📋</span>';
      }, 2000);
    };

    // Download button handler
    btnDownload.onclick = function() {
      const content = [
        'BTC Signal AI - Recovery Code',
        '================================',
        '',
        'Recovery Code: ' + recoveryCode,
        'Tier: ' + (tierNames[tier] || tier),
        'Purchased: ' + new Date().toISOString(),
        'Expires: ' + (expiresAt || 'Never'),
        '',
        'Payment Hash (backup): ' + paymentHash,
        '',
        '================================',
        'Keep this file safe!',
        'Use your recovery code at: https://btcsignal.ai/recover/'
      ].join('\n');

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'btcsignal-recovery-' + recoveryCode.split('-')[1] + '.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    // Continue button handler
    btnContinue.onclick = function() {
      modal.style.display = 'none';
      window.location.reload();
    };

    // Allow clicking outside to close (but warn first)
    modal.onclick = function(e) {
      if (e.target === modal) {
        if (typeof Toast !== 'undefined' && Toast.confirm) {
          Toast.confirm('Have you saved your recovery code? You will need it to restore access later.', function() {
            modal.style.display = 'none';
            window.location.reload();
          });
        } else {
          modal.style.display = 'none';
          window.location.reload();
        }
      }
    };
  }

  // Initialize
  updateAccessStatus();

  // Update status every minute
  setInterval(updateAccessStatus, 60000);
})();
