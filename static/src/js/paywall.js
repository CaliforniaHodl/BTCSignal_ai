// Lightning Paywall - Connects to LNbits via Netlify function
(function() {
  const container = document.querySelector('.single-post-page');
  if (!container) return;

  const postId = container.dataset.postId;
  const isFree = container.dataset.isFree === 'true';

  // If free post, no paywall needed
  if (isFree) return;

  // Check if already unlocked (stored in localStorage)
  const unlockedPosts = JSON.parse(localStorage.getItem('unlockedPosts') || '{}');
  if (unlockedPosts[postId]) {
    unlockContent();
    return;
  }

  const unlockBtn = document.getElementById('unlock-btn');
  const invoiceContainer = document.getElementById('invoice-container');
  const qrCodeDiv = document.getElementById('qr-code');
  const invoiceInput = document.getElementById('invoice-string');
  const copyBtn = document.getElementById('copy-invoice');
  const paywallOverlay = document.getElementById('paywall-overlay');

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
  copyBtn.addEventListener('click', () => {
    invoiceInput.select();
    navigator.clipboard.writeText(invoiceInput.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
  });

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
          unlockedPosts[postId] = Date.now();
          localStorage.setItem('unlockedPosts', JSON.stringify(unlockedPosts));
          unlockContent();
        }
      } catch (error) {
        console.error('Payment check error:', error);
      }
    }, 2000); // Check every 2 seconds
  }

  // Unlock the content
  function unlockContent() {
    if (paywallOverlay) {
      paywallOverlay.style.display = 'none';
    }
    const content = document.getElementById('article-content');
    if (content) {
      content.classList.remove('blurred');
    }
  }
})();
