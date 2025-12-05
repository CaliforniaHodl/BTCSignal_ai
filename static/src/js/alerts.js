// Price Alerts System
// Browser-based alerts for Bitcoin price targets

(function() {
  'use strict';

  const STORAGE_KEY = 'btcsai_price_alerts';
  const TRIGGERED_KEY = 'btcsai_triggered_alerts';
  const DISCORD_WEBHOOK_KEY = 'btcsai_discord_webhook';

  // State
  let currentPrice = 0;
  let alerts = [];
  let triggeredAlerts = [];
  let priceCheckInterval = null;

  // Sound for alerts
  const alertSound = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vT09PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw==');

  // DOM Elements
  const currentPriceEl = document.getElementById('current-price');
  const priceChangeEl = document.getElementById('price-change');
  const lastUpdateEl = document.getElementById('last-update');
  const alertTypeSelect = document.getElementById('alert-type');
  const alertValueInput = document.getElementById('alert-value');
  const alertNoteInput = document.getElementById('alert-note');
  const valuePrefixEl = document.getElementById('value-prefix');
  const valueSuffixEl = document.getElementById('value-suffix');
  const notifyBrowserCheckbox = document.getElementById('notify-browser');
  const notifySoundCheckbox = document.getElementById('notify-sound');
  const btnCreateAlert = document.getElementById('btn-create-alert');
  const alertsList = document.getElementById('alerts-list');
  const noAlertsEl = document.getElementById('no-alerts');
  const alertCountEl = document.getElementById('alert-count');
  const triggeredList = document.getElementById('triggered-list');
  const noTriggeredEl = document.getElementById('no-triggered');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const quickAlertsGrid = document.getElementById('quick-alerts-grid');
  const notificationPrompt = document.getElementById('notification-prompt');

  // Load saved alerts
  function loadAlerts() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      alerts = saved ? JSON.parse(saved) : [];

      const savedTriggered = localStorage.getItem(TRIGGERED_KEY);
      triggeredAlerts = savedTriggered ? JSON.parse(savedTriggered) : [];
    } catch (e) {
      alerts = [];
      triggeredAlerts = [];
    }
  }

  // Save alerts
  function saveAlerts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    localStorage.setItem(TRIGGERED_KEY, JSON.stringify(triggeredAlerts));
  }

  // Fetch current price
  async function fetchPrice() {
    try {
      const res = await fetch('https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT');
      const data = await res.json();

      currentPrice = parseFloat(data.lastPrice);
      const change = parseFloat(data.priceChangePercent);

      currentPriceEl.textContent = '$' + currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 });
      priceChangeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
      priceChangeEl.className = 'change ' + (change >= 0 ? 'positive' : 'negative');

      lastUpdateEl.textContent = 'Updated ' + new Date().toLocaleTimeString();

      // Check alerts
      checkAlerts();

      // Update quick alerts if first load
      if (quickAlertsGrid.children.length === 0) {
        generateQuickAlerts();
      }

      // Update key levels
      updateKeyLevels();

      return currentPrice;
    } catch (e) {
      console.error('Failed to fetch price:', e);
      return 0;
    }
  }

  // Generate quick alert buttons
  function generateQuickAlerts() {
    if (!currentPrice) return;

    const roundedPrice = Math.floor(currentPrice / 1000) * 1000;
    const targets = [
      { value: roundedPrice + 5000, label: '+$5K' },
      { value: roundedPrice + 10000, label: '+$10K' },
      { value: roundedPrice - 5000, label: '-$5K' },
      { value: roundedPrice - 10000, label: '-$10K' },
      { value: 100000, label: '$100K' },
      { value: 150000, label: '$150K' }
    ].filter(t => t.value > 0);

    quickAlertsGrid.innerHTML = targets.map(t => `
      <button class="quick-alert-btn" data-value="${t.value}" data-type="${t.value > currentPrice ? 'price_above' : 'price_below'}">
        <span class="quick-value">$${t.value.toLocaleString()}</span>
        <span class="quick-label">${t.label}</span>
      </button>
    `).join('');

    // Add click handlers
    quickAlertsGrid.querySelectorAll('.quick-alert-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const value = parseFloat(this.dataset.value);
        const type = this.dataset.type;
        createAlert(type, value, 'Quick Alert');
      });
    });
  }

  // Update key technical levels
  function updateKeyLevels() {
    if (!currentPrice) return;

    // Calculate approximate levels based on price
    const resistance1 = Math.ceil(currentPrice / 5000) * 5000 + 5000;
    const resistance2 = Math.ceil(currentPrice / 1000) * 1000 + 2000;
    const support1 = Math.floor(currentPrice / 5000) * 5000 - 5000;
    const support2 = Math.floor(currentPrice / 1000) * 1000 - 2000;

    document.getElementById('resistance-1').textContent = '$' + resistance1.toLocaleString();
    document.getElementById('resistance-2').textContent = '$' + resistance2.toLocaleString();
    document.getElementById('support-1').textContent = '$' + support1.toLocaleString();
    document.getElementById('support-2').textContent = '$' + support2.toLocaleString();

    // Store values for alert creation
    document.getElementById('resistance-1').dataset.value = resistance1;
    document.getElementById('resistance-2').dataset.value = resistance2;
    document.getElementById('support-1').dataset.value = support1;
    document.getElementById('support-2').dataset.value = support2;
  }

  // Create a new alert
  function createAlert(type, value, note = '') {
    const alert = {
      id: Date.now(),
      type: type,
      value: value,
      note: note,
      notifyBrowser: notifyBrowserCheckbox.checked,
      notifySound: notifySoundCheckbox.checked,
      createdAt: new Date().toISOString()
    };

    alerts.push(alert);
    saveAlerts();
    renderAlerts();

    // Show toast
    showToast('Alert created: ' + formatAlertCondition(alert));

    // Clear form
    alertValueInput.value = '';
    alertNoteInput.value = '';
  }

  // Format alert condition for display
  function formatAlertCondition(alert) {
    switch (alert.type) {
      case 'price_above':
        return 'Price above $' + alert.value.toLocaleString();
      case 'price_below':
        return 'Price below $' + alert.value.toLocaleString();
      case 'percent_change':
        return alert.value + '% change (24h)';
      default:
        return 'Unknown';
    }
  }

  // Check if alerts should trigger
  function checkAlerts() {
    if (!currentPrice) return;

    alerts.forEach((alert, index) => {
      let triggered = false;

      switch (alert.type) {
        case 'price_above':
          if (currentPrice >= alert.value) triggered = true;
          break;
        case 'price_below':
          if (currentPrice <= alert.value) triggered = true;
          break;
      }

      if (triggered) {
        triggerAlert(alert, index);
      }
    });
  }

  // Trigger an alert
  function triggerAlert(alert, index) {
    // Remove from active alerts
    alerts.splice(index, 1);

    // Add to triggered history
    const triggeredAlert = {
      ...alert,
      triggeredAt: new Date().toISOString(),
      priceAtTrigger: currentPrice
    };
    triggeredAlerts.unshift(triggeredAlert);

    // Keep only last 20 triggered
    if (triggeredAlerts.length > 20) {
      triggeredAlerts = triggeredAlerts.slice(0, 20);
    }

    saveAlerts();
    renderAlerts();
    renderTriggeredAlerts();

    // Notifications
    if (alert.notifySound) {
      playAlertSound();
    }

    if (alert.notifyBrowser && Notification.permission === 'granted') {
      showBrowserNotification(alert);
    }

    // Show toast
    showToast('Alert triggered: ' + formatAlertCondition(alert), 'success');
  }

  // Play alert sound
  function playAlertSound() {
    try {
      // Create a simple beep
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
    }
  }

  // Show browser notification
  function showBrowserNotification(alert) {
    const notification = new Notification('BTC Signal AI - Price Alert', {
      body: formatAlertCondition(alert) + '\nCurrent: $' + currentPrice.toLocaleString(),
      icon: '/images/logo.png',
      tag: 'btc-alert-' + alert.id
    });

    notification.onclick = function() {
      window.focus();
      notification.close();
    };
  }

  // Request notification permission
  function requestNotificationPermission() {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showToast('Notifications enabled');
          notificationPrompt.style.display = 'none';
        }
      });
    }
  }

  // Show toast message
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Render active alerts list
  function renderAlerts() {
    if (alerts.length === 0) {
      noAlertsEl.style.display = 'block';
      alertCountEl.textContent = '0 alerts';
      return;
    }

    noAlertsEl.style.display = 'none';
    alertCountEl.textContent = alerts.length + ' alert' + (alerts.length !== 1 ? 's' : '');

    const html = alerts.map(alert => `
      <div class="alert-item" data-id="${alert.id}">
        <div class="alert-icon">${alert.type === 'price_above' ? '📈' : '📉'}</div>
        <div class="alert-info">
          <div class="alert-condition">${formatAlertCondition(alert)}</div>
          ${alert.note ? `<div class="alert-note">${alert.note}</div>` : ''}
          <div class="alert-meta">
            ${alert.notifyBrowser ? '<span class="meta-tag">🔔 Browser</span>' : ''}
            ${alert.notifySound ? '<span class="meta-tag">🔊 Sound</span>' : ''}
          </div>
        </div>
        <button class="btn-delete-alert" data-id="${alert.id}">×</button>
      </div>
    `).join('');

    alertsList.innerHTML = html + '<div class="no-alerts" id="no-alerts" style="display: none;"><div class="no-alerts-icon">🔔</div><p>No alerts set</p><span>Create your first alert above</span></div>';

    // Add delete handlers
    alertsList.querySelectorAll('.btn-delete-alert').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = parseInt(this.dataset.id);
        deleteAlert(id);
      });
    });
  }

  // Delete an alert
  function deleteAlert(id) {
    alerts = alerts.filter(a => a.id !== id);
    saveAlerts();
    renderAlerts();
    showToast('Alert deleted');
  }

  // Render triggered alerts history
  function renderTriggeredAlerts() {
    if (triggeredAlerts.length === 0) {
      noTriggeredEl.style.display = 'block';
      return;
    }

    noTriggeredEl.style.display = 'none';

    const html = triggeredAlerts.map(alert => {
      const triggeredDate = new Date(alert.triggeredAt);
      return `
        <div class="triggered-item">
          <div class="triggered-icon">✓</div>
          <div class="triggered-info">
            <div class="triggered-condition">${formatAlertCondition(alert)}</div>
            <div class="triggered-meta">
              <span>Triggered at $${alert.priceAtTrigger.toLocaleString()}</span>
              <span>${triggeredDate.toLocaleDateString()} ${triggeredDate.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    triggeredList.innerHTML = html + '<div class="no-triggered" id="no-triggered" style="display: none;"><p>No triggered alerts yet</p></div>';
  }

  // Update input UI based on alert type
  function updateAlertTypeUI() {
    const type = alertTypeSelect.value;

    if (type === 'percent_change') {
      valuePrefixEl.textContent = '';
      valueSuffixEl.textContent = '%';
      alertValueInput.placeholder = '5';
    } else {
      valuePrefixEl.textContent = '$';
      valueSuffixEl.textContent = '';
      alertValueInput.placeholder = '100000';
    }
  }

  // Check notification permission status
  function checkNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      notificationPrompt.style.display = 'block';
    }
  }

  // Event Handlers
  function setupEventHandlers() {
    // Alert type change
    alertTypeSelect.addEventListener('change', updateAlertTypeUI);

    // Create alert button
    btnCreateAlert.addEventListener('click', function() {
      const type = alertTypeSelect.value;
      const value = parseFloat(alertValueInput.value);
      const note = alertNoteInput.value.trim();

      if (isNaN(value) || value <= 0) {
        showToast('Please enter a valid value', 'error');
        return;
      }

      createAlert(type, value, note);
    });

    // Enter key to create alert
    alertValueInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        btnCreateAlert.click();
      }
    });

    // Clear history button
    btnClearHistory.addEventListener('click', function() {
      triggeredAlerts = [];
      saveAlerts();
      renderTriggeredAlerts();
      showToast('History cleared');
    });

    // Enable notifications button
    document.getElementById('btn-enable-notif')?.addEventListener('click', requestNotificationPermission);

    // Dismiss notification prompt
    document.getElementById('btn-dismiss-notif')?.addEventListener('click', function() {
      notificationPrompt.style.display = 'none';
    });

    // Key level buttons
    document.querySelectorAll('.btn-add-level').forEach(btn => {
      btn.addEventListener('click', function() {
        const levelType = this.dataset.type;
        const levelEl = document.getElementById(levelType);
        const value = parseFloat(levelEl.dataset.value);

        if (value) {
          const type = levelType.includes('resistance') ? 'price_above' : 'price_below';
          const label = levelType.includes('resistance') ? 'Resistance Alert' : 'Support Alert';
          createAlert(type, value, label);
        }
      });
    });

    // Discord webhook buttons
    document.getElementById('btn-test-webhook')?.addEventListener('click', testDiscordWebhook);
    document.getElementById('btn-save-webhook')?.addEventListener('click', saveDiscordWebhook);
  }

  // Discord Webhook Functions
  function loadDiscordWebhook() {
    try {
      const saved = localStorage.getItem(DISCORD_WEBHOOK_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        const webhookInput = document.getElementById('discord-webhook-url');
        if (webhookInput) webhookInput.value = data.url || '';

        // Restore checkboxes
        const signalsCheckbox = document.getElementById('discord-signals');
        const fundingCheckbox = document.getElementById('discord-funding');
        const squeezeCheckbox = document.getElementById('discord-squeeze');

        if (signalsCheckbox) signalsCheckbox.checked = data.alertTypes?.includes('signals') ?? true;
        if (fundingCheckbox) fundingCheckbox.checked = data.alertTypes?.includes('funding_spike') ?? true;
        if (squeezeCheckbox) squeezeCheckbox.checked = data.alertTypes?.includes('squeeze') ?? false;
      }
    } catch (e) {
      console.error('Error loading Discord webhook:', e);
    }
  }

  function saveDiscordWebhook() {
    const webhookInput = document.getElementById('discord-webhook-url');
    const url = webhookInput?.value?.trim() || '';

    const alertTypes = [];
    if (document.getElementById('discord-signals')?.checked) alertTypes.push('signals');
    if (document.getElementById('discord-funding')?.checked) alertTypes.push('funding_spike');
    if (document.getElementById('discord-squeeze')?.checked) alertTypes.push('squeeze');

    const data = { url, alertTypes, savedAt: new Date().toISOString() };
    localStorage.setItem(DISCORD_WEBHOOK_KEY, JSON.stringify(data));

    showToast('Discord webhook saved');
  }

  async function testDiscordWebhook() {
    const webhookInput = document.getElementById('discord-webhook-url');
    const statusEl = document.getElementById('webhook-status');
    const url = webhookInput?.value?.trim();

    if (!url) {
      showToast('Please enter a webhook URL', 'error');
      return;
    }

    // Validate URL format
    if (!url.startsWith('https://discord.com/api/webhooks/') &&
        !url.startsWith('https://discordapp.com/api/webhooks/')) {
      showToast('Invalid Discord webhook URL format', 'error');
      return;
    }

    // Show loading state
    statusEl.className = 'webhook-status loading';
    statusEl.textContent = 'Testing webhook...';

    try {
      const res = await fetch('/.netlify/functions/discord-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          webhookUrl: url
        })
      });

      const data = await res.json();

      if (data.success) {
        statusEl.className = 'webhook-status success';
        statusEl.textContent = 'Webhook connected successfully!';
        showToast('Discord webhook test successful', 'success');
      } else {
        statusEl.className = 'webhook-status error';
        statusEl.textContent = data.error || 'Test failed';
        showToast('Webhook test failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (e) {
      statusEl.className = 'webhook-status error';
      statusEl.textContent = 'Connection error';
      showToast('Failed to test webhook', 'error');
    }
  }

  // Initialize
  async function init() {
    loadAlerts();
    renderAlerts();
    renderTriggeredAlerts();
    setupEventHandlers();
    checkNotificationPermission();
    loadDiscordWebhook();

    // Fetch initial price
    await fetchPrice();

    // Update price every 10 seconds
    priceCheckInterval = setInterval(fetchPrice, 10000);
  }

  // Add toast styles dynamically
  const toastStyles = document.createElement('style');
  toastStyles.textContent = `
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
  document.head.appendChild(toastStyles);

  init();
})();
