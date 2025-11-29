// Newsletter Subscription Page
// Handles email subscription and tier selection

(function() {
  'use strict';

  const STORAGE_KEY = 'btcsai_newsletter_sub';

  // DOM Elements
  const emailInput = document.getElementById('email-input');
  const btnSubscribe = document.getElementById('btn-subscribe');
  const tierOptions = document.querySelectorAll('.tier-option');
  const faqItems = document.querySelectorAll('.faq-item');
  const latestDateEl = document.getElementById('latest-date');
  const latestTitleEl = document.getElementById('latest-title');
  const latestExcerptEl = document.getElementById('latest-excerpt');

  let selectedTier = 'free';

  // Initialize
  function init() {
    setupTierSelection();
    setupFAQ();
    setupSubscription();
    loadLatestIssue();
    checkExistingSubscription();
  }

  // Tier selection
  function setupTierSelection() {
    tierOptions.forEach(option => {
      option.addEventListener('click', function() {
        tierOptions.forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        selectedTier = this.dataset.tier;

        // Update button text
        if (selectedTier === 'premium') {
          btnSubscribe.textContent = 'Subscribe Premium (10K sats/mo)';
        } else {
          btnSubscribe.textContent = 'Subscribe to Newsletter';
        }
      });
    });
  }

  // FAQ accordion
  function setupFAQ() {
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      const icon = item.querySelector('.faq-icon');

      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');

        // Close all
        faqItems.forEach(i => {
          i.classList.remove('open');
          i.querySelector('.faq-answer').style.maxHeight = '0';
          i.querySelector('.faq-icon').textContent = '+';
        });

        // Open clicked if was closed
        if (!isOpen) {
          item.classList.add('open');
          answer.style.maxHeight = answer.scrollHeight + 'px';
          icon.textContent = '−';
        }
      });
    });
  }

  // Subscription handler
  function setupSubscription() {
    btnSubscribe.addEventListener('click', handleSubscribe);

    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSubscribe();
      }
    });
  }

  // Handle subscription
  function handleSubscribe() {
    const email = emailInput.value.trim();

    // Validate email
    if (!email || !isValidEmail(email)) {
      showToast('Please enter a valid email address', 'error');
      emailInput.focus();
      return;
    }

    if (selectedTier === 'premium') {
      // For premium, show payment prompt
      showPaymentPrompt(email);
    } else {
      // For free, just save subscription
      saveSubscription(email, 'free');
      showToast('Subscribed! Check your email for confirmation.', 'success');
      emailInput.value = '';
    }
  }

  // Show payment prompt for premium
  function showPaymentPrompt(email) {
    const modal = document.createElement('div');
    modal.className = 'payment-modal';
    modal.innerHTML = `
      <div class="payment-content">
        <button class="modal-close">&times;</button>
        <h3>Premium Subscription</h3>
        <p class="payment-email">Subscribing: ${email}</p>

        <div class="payment-amount">
          <span class="amount">10,000 sats</span>
          <span class="period">/month</span>
        </div>

        <div class="payment-methods">
          <button class="payment-btn lightning" id="pay-lightning">
            <span class="payment-icon">⚡</span>
            Pay with Lightning
          </button>
          <button class="payment-btn onchain" id="pay-onchain" disabled>
            <span class="payment-icon">₿</span>
            On-chain (Coming Soon)
          </button>
        </div>

        <p class="payment-note">Lightning payment provides instant activation</p>
      </div>
    `;

    document.body.appendChild(modal);

    // Close handler
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Lightning payment handler
    modal.querySelector('#pay-lightning').addEventListener('click', () => {
      // In production, this would generate a Lightning invoice
      // For now, simulate the flow
      simulateLightningPayment(email, modal);
    });
  }

  // Simulate Lightning payment (demo)
  function simulateLightningPayment(email, modal) {
    const content = modal.querySelector('.payment-content');
    content.innerHTML = `
      <h3>Lightning Invoice</h3>
      <div class="invoice-display">
        <div class="qr-placeholder">
          <div class="qr-code">
            <svg viewBox="0 0 100 100">
              <rect fill="#fff" width="100" height="100"/>
              <rect fill="#000" x="10" y="10" width="10" height="10"/>
              <rect fill="#000" x="20" y="10" width="10" height="10"/>
              <rect fill="#000" x="30" y="10" width="10" height="10"/>
              <rect fill="#000" x="60" y="10" width="10" height="10"/>
              <rect fill="#000" x="70" y="10" width="10" height="10"/>
              <rect fill="#000" x="80" y="10" width="10" height="10"/>
              <!-- Simplified QR pattern -->
              <text x="50" y="55" text-anchor="middle" font-size="8" fill="#000">DEMO</text>
            </svg>
          </div>
        </div>
        <div class="invoice-string">
          <code>lnbc100000n1pj...demo</code>
          <button class="btn-copy">Copy</button>
        </div>
        <div class="invoice-status">
          <span class="status-icon">⏳</span>
          <span>Waiting for payment...</span>
        </div>
      </div>
      <p class="demo-note">Demo mode: Click below to simulate payment</p>
      <button class="btn-simulate" id="btn-simulate-pay">Simulate Payment (Demo)</button>
    `;

    // Simulate payment button
    modal.querySelector('#btn-simulate-pay').addEventListener('click', () => {
      const status = modal.querySelector('.invoice-status');
      status.innerHTML = '<span class="status-icon">✓</span><span>Payment received!</span>';
      status.classList.add('paid');

      setTimeout(() => {
        modal.remove();
        saveSubscription(email, 'premium');
        showToast('Premium subscription activated! Check your email.', 'success');
        emailInput.value = '';
      }, 1500);
    });
  }

  // Save subscription to localStorage
  function saveSubscription(email, tier) {
    const subscription = {
      email: email,
      tier: tier,
      subscribedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscription));

    // In production, this would also POST to a backend
    console.log('Subscription saved:', subscription);
  }

  // Check existing subscription
  function checkExistingSubscription() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const sub = JSON.parse(saved);
        emailInput.value = sub.email;
        emailInput.placeholder = 'Already subscribed';

        // Select the saved tier
        tierOptions.forEach(o => {
          o.classList.remove('selected');
          if (o.dataset.tier === sub.tier) {
            o.classList.add('selected');
            selectedTier = sub.tier;
          }
        });

        // Update button
        btnSubscribe.textContent = 'Update Subscription';
      }
    } catch (e) {
      // Ignore
    }
  }

  // Load latest issue info
  function loadLatestIssue() {
    // In production, this would fetch from an API
    const latestIssue = {
      date: 'Nov 24, 2024',
      title: 'Issue #42: Breaking $95K - What\'s Next?',
      excerpt: 'Bitcoin broke through the $95K resistance with conviction. Here\'s our analysis of what comes next and the key levels to watch.'
    };

    latestDateEl.textContent = latestIssue.date;
    latestTitleEl.textContent = latestIssue.title;
    latestExcerptEl.textContent = latestIssue.excerpt;
  }

  // Email validation
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Toast notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Add modal styles dynamically
  const modalStyles = document.createElement('style');
  modalStyles.textContent = `
    .payment-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }
    .payment-content {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 2rem;
      max-width: 400px;
      width: 100%;
      text-align: center;
      position: relative;
    }
    .modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-muted);
      cursor: pointer;
    }
    .payment-email {
      color: var(--text-muted);
      margin-bottom: 1.5rem;
    }
    .payment-amount {
      background: var(--bg-dark);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }
    .payment-amount .amount {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--bitcoin-orange);
    }
    .payment-amount .period {
      color: var(--text-muted);
    }
    .payment-methods {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .payment-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background: var(--bg-dark);
      color: var(--text-primary);
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .payment-btn.lightning:hover {
      border-color: var(--bitcoin-orange);
      background: rgba(247, 147, 26, 0.1);
    }
    .payment-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .payment-icon {
      font-size: 1.2rem;
    }
    .payment-note {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .invoice-display {
      margin: 1.5rem 0;
    }
    .qr-placeholder {
      background: white;
      border-radius: 8px;
      padding: 1rem;
      display: inline-block;
      margin-bottom: 1rem;
    }
    .qr-code svg {
      width: 150px;
      height: 150px;
    }
    .invoice-string {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .invoice-string code {
      flex: 1;
      background: var(--bg-dark);
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-copy {
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 0.5rem 1rem;
      color: var(--text-secondary);
      cursor: pointer;
    }
    .invoice-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: var(--text-muted);
    }
    .invoice-status.paid {
      color: var(--success-green);
    }
    .demo-note {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin: 1rem 0 0.5rem;
    }
    .btn-simulate {
      background: linear-gradient(135deg, var(--bitcoin-orange) 0%, var(--bitcoin-gold) 100%);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem 1.5rem;
      color: var(--text-primary);
      z-index: 1000;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    .toast-success {
      border-color: var(--success-green);
      background: rgba(34, 197, 94, 0.1);
    }
    .toast-error {
      border-color: var(--danger-red);
      background: rgba(239, 68, 68, 0.1);
    }
  `;
  document.head.appendChild(modalStyles);

  init();
})();
