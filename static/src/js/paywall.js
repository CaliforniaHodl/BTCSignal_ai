// Lightning Paywall - Connects to LNbits via Netlify function
(function() {
  const container = document.querySelector('.single-post-page');
  if (!container) return;

  const postId = container.dataset.postId;
  const isFree = container.dataset.isFree === 'true';

  // DOM elements (get these first so unlockContent works)
  const paywallOverlay = document.getElementById('paywall-overlay');

  // Unlock the content - adds 'unlocked' class which CSS uses to swap fake/real content
  function unlockContent() {
    // Add unlocked class to container - CSS handles showing real content, hiding fake
    container.classList.add('unlocked');

    // Also explicitly hide overlay (redundant with CSS but ensures it's hidden)
    if (paywallOverlay) {
      paywallOverlay.style.display = 'none';
    }
  }

  // If free post, no paywall needed
  if (isFree) return;

  // Check if admin mode is active (bypasses all paywalls)
  if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.isAdmin()) {
    console.log('%c ADMIN: Paywall bypassed for ' + postId, 'color: #f7931a;');
    unlockContent();
    return;
  }

  // Check if user has all-access subscription (hourly/daily/weekly)
  if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.hasAllAccess()) {
    console.log('All-access subscription active, unlocking content');
    unlockContent();
    return;
  }

  // Check if this specific post is unlocked via BTCSAIAccess
  if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.isPostUnlocked(postId)) {
    console.log('Post already unlocked via BTCSAIAccess');
    unlockContent();
    return;
  }

  // Legacy check - stored in localStorage (for backwards compatibility)
  const unlockedPosts = JSON.parse(localStorage.getItem('unlockedPosts') || '{}');
  if (unlockedPosts[postId]) {
    unlockContent();
    return;
  }

  // If we get here, content is locked - set up payment UI
  const unlockBtn = document.getElementById('unlock-btn');
  const invoiceContainer = document.getElementById('invoice-container');
  const qrCodeDiv = document.getElementById('qr-code');
  const invoiceInput = document.getElementById('invoice-string');
  const copyBtn = document.getElementById('copy-invoice');

  if (!unlockBtn) return; // No paywall UI present

  let currentPaymentHash = null;
  let checkInterval = null;

  // Create invoice when user clicks unlock
  unlockBtn.addEventListener('click', async () => {
    unlockBtn.disabled = true;
    unlockBtn.innerHTML = '<span>⏳</span> Generating Invoice...';

    try {
      const response = await fetch('/.netlify/functions/paywall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-invoice',
          postId: postId
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create invoice');
      }

      currentPaymentHash = data.payment_hash;

      // Show QR code - create canvas element first
      qrCodeDiv.innerHTML = '';
      const canvas = document.createElement('canvas');
      qrCodeDiv.appendChild(canvas);

      QRCode.toCanvas(canvas, data.payment_request.toUpperCase(), {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }, (error) => {
        if (error) console.error('QR error:', error);
      });

      // Show invoice string
      invoiceInput.value = data.payment_request;
      invoiceContainer.style.display = 'block';
      unlockBtn.style.display = 'none';

      // Start checking for payment
      startPaymentCheck();

    } catch (error) {
      console.error('Paywall error:', error);
      unlockBtn.disabled = false;
      unlockBtn.innerHTML = '<span>⚡</span> Pay with Lightning';
      alert('Error: ' + error.message);
    }
  });

  // Copy invoice to clipboard
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      invoiceInput.select();
      navigator.clipboard.writeText(invoiceInput.value);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
    });
  }

  // Poll for payment status
  function startPaymentCheck() {
    checkInterval = setInterval(async () => {
      try {
        const response = await fetch('/.netlify/functions/paywall', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check-payment',
            paymentHash: currentPaymentHash
          })
        });

        const data = await response.json();

        if (data.paid) {
          clearInterval(checkInterval);
          // Save unlock to localStorage
          const posts = JSON.parse(localStorage.getItem('unlockedPosts') || '{}');
          posts[postId] = Date.now();
          localStorage.setItem('unlockedPosts', JSON.stringify(posts));
          unlockContent();
        }
      } catch (error) {
        console.error('Payment check error:', error);
      }
    }, 2000); // Check every 2 seconds
  }
})();
