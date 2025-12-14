/**
 * Enhanced Alert Manager - Client-side alert management
 * Integrates with backend alert system, handles user custom alerts,
 * and displays triggered alerts from GitHub cache
 * Target: 20+ alerts to match CryptoQuant Professional tier
 */

const EnhancedAlertManager = (function() {
  'use strict';

  // Constants
  const USER_ALERTS_KEY = 'btcsignal_custom_alerts';
  const TRIGGERED_CACHE_URL = 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/master/data/triggered-alerts.json';
  const MARKET_DATA_URL = 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/master/data/market-snapshot.json';
  const MAX_USER_ALERTS = 20;

  // Alert categories
  const CATEGORIES = {
    price: { label: 'Price', icon: '💰', color: '#10b981' },
    onchain: { label: 'On-Chain', icon: '⛓️', color: '#8b5cf6' },
    derivatives: { label: 'Derivatives', icon: '📊', color: '#f59e0b' },
    technical: { label: 'Technical', icon: '📈', color: '#3b82f6' },
    custom: { label: 'Custom', icon: '⚙️', color: '#6b7280' }
  };

  // Severity levels
  const SEVERITY = {
    info: { label: 'Info', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    warning: { label: 'Warning', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' }
  };

  // Available metrics for custom alerts
  const METRICS = [
    { id: 'price', name: 'BTC Price', unit: 'USD', category: 'price', example: '100000' },
    { id: 'price_change_24h', name: 'Price Change (24h)', unit: '%', category: 'price', example: '5' },
    { id: 'mvrv', name: 'MVRV Ratio', unit: '', category: 'onchain', example: '2.5' },
    { id: 'sopr', name: 'SOPR', unit: '', category: 'onchain', example: '1.0' },
    { id: 'nupl', name: 'NUPL', unit: '', category: 'onchain', example: '0.5' },
    { id: 'exchange_netflow', name: 'Exchange Netflow', unit: 'BTC', category: 'onchain', example: '5000' },
    { id: 'funding_rate', name: 'Funding Rate', unit: '%', category: 'derivatives', example: '0.05' },
    { id: 'open_interest', name: 'Open Interest Change', unit: '%', category: 'derivatives', example: '10' },
    { id: 'long_short_ratio', name: 'Long/Short Ratio', unit: '', category: 'derivatives', example: '1.5' },
    { id: 'liquidations_24h', name: 'Liquidations (24h)', unit: 'M USD', category: 'derivatives', example: '100' },
    { id: 'rsi', name: 'RSI (14)', unit: '', category: 'technical', example: '70' },
    { id: 'volatility', name: 'Volatility (24h)', unit: '%', category: 'technical', example: '5' }
  ];

  // Condition types
  const CONDITIONS = [
    { id: 'above', label: 'Goes above', symbol: '>' },
    { id: 'below', label: 'Goes below', symbol: '<' },
    { id: 'crosses_above', label: 'Crosses above', symbol: '↗' },
    { id: 'crosses_below', label: 'Crosses below', symbol: '↘' }
  ];

  // Default alert templates (quick alerts)
  const ALERT_TEMPLATES = [
    { name: 'MVRV Top Signal', metric: 'mvrv', condition: 'above', threshold: 3.5, severity: 'critical', category: 'onchain' },
    { name: 'MVRV Buy Zone', metric: 'mvrv', condition: 'below', threshold: 1.0, severity: 'critical', category: 'onchain' },
    { name: 'RSI Overbought', metric: 'rsi', condition: 'above', threshold: 80, severity: 'warning', category: 'technical' },
    { name: 'RSI Oversold', metric: 'rsi', condition: 'below', threshold: 20, severity: 'warning', category: 'technical' },
    { name: 'High Funding Rate', metric: 'funding_rate', condition: 'above', threshold: 0.1, severity: 'warning', category: 'derivatives' },
    { name: 'Negative Funding', metric: 'funding_rate', condition: 'below', threshold: -0.05, severity: 'info', category: 'derivatives' },
    { name: 'Large Exchange Inflow', metric: 'exchange_netflow', condition: 'above', threshold: 10000, severity: 'warning', category: 'onchain' },
    { name: 'NUPL Euphoria', metric: 'nupl', condition: 'above', threshold: 0.75, severity: 'warning', category: 'onchain' }
  ];

  // State
  let userAlerts = [];
  let triggeredAlerts = [];
  let marketData = null;

  /**
   * Initialize the alert manager
   */
  function init() {
    loadUserAlerts();
    fetchTriggeredAlerts();
    fetchMarketData();

    // Set up polling for updates
    setInterval(fetchTriggeredAlerts, 60000); // Check every minute
    setInterval(fetchMarketData, 30000); // Update market data every 30s
  }

  /**
   * Load user custom alerts from localStorage
   */
  function loadUserAlerts() {
    try {
      const saved = localStorage.getItem(USER_ALERTS_KEY);
      userAlerts = saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load user alerts:', e);
      userAlerts = [];
    }
    return userAlerts;
  }

  /**
   * Save user alerts to localStorage
   */
  function saveUserAlerts() {
    try {
      localStorage.setItem(USER_ALERTS_KEY, JSON.stringify(userAlerts));
    } catch (e) {
      console.error('Failed to save user alerts:', e);
    }
  }

  /**
   * Create a new custom alert
   */
  function createAlert(alertData) {
    if (userAlerts.length >= MAX_USER_ALERTS) {
      return { success: false, error: `Maximum ${MAX_USER_ALERTS} alerts allowed. Delete some to add more.` };
    }

    const metric = METRICS.find(m => m.id === alertData.metric);
    if (!metric) {
      return { success: false, error: 'Invalid metric selected' };
    }

    const threshold = parseFloat(alertData.threshold);
    if (isNaN(threshold)) {
      return { success: false, error: 'Invalid threshold value' };
    }

    const newAlert = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: alertData.name || `${metric.name} ${alertData.condition} ${threshold}`,
      metric: alertData.metric,
      category: metric.category,
      condition: alertData.condition,
      threshold: threshold,
      severity: alertData.severity || 'info',
      enabled: true,
      notifications: {
        browser: alertData.browserNotify !== false,
        sound: alertData.soundNotify || false,
        telegram: alertData.telegramNotify || false,
        discord: alertData.discordNotify || false
      },
      createdAt: Date.now(),
      lastTriggered: null,
      triggerCount: 0
    };

    userAlerts.push(newAlert);
    saveUserAlerts();

    return { success: true, alert: newAlert };
  }

  /**
   * Create alert from template
   */
  function createFromTemplate(templateIndex) {
    const template = ALERT_TEMPLATES[templateIndex];
    if (!template) {
      return { success: false, error: 'Invalid template' };
    }
    return createAlert(template);
  }

  /**
   * Update an existing alert
   */
  function updateAlert(alertId, updates) {
    const index = userAlerts.findIndex(a => a.id === alertId);
    if (index === -1) {
      return { success: false, error: 'Alert not found' };
    }

    userAlerts[index] = { ...userAlerts[index], ...updates, updatedAt: Date.now() };
    saveUserAlerts();
    return { success: true, alert: userAlerts[index] };
  }

  /**
   * Delete an alert
   */
  function deleteAlert(alertId) {
    const index = userAlerts.findIndex(a => a.id === alertId);
    if (index === -1) {
      return { success: false, error: 'Alert not found' };
    }

    userAlerts.splice(index, 1);
    saveUserAlerts();
    return { success: true };
  }

  /**
   * Toggle alert enabled/disabled
   */
  function toggleAlert(alertId) {
    const alert = userAlerts.find(a => a.id === alertId);
    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }

    alert.enabled = !alert.enabled;
    saveUserAlerts();
    return { success: true, enabled: alert.enabled };
  }

  /**
   * Fetch triggered alerts from GitHub cache
   */
  async function fetchTriggeredAlerts() {
    try {
      const response = await fetch(TRIGGERED_CACHE_URL + '?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      triggeredAlerts = data.alerts || [];

      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('alertsUpdated', {
        detail: { triggered: triggeredAlerts, stats: data.stats }
      }));

      return data;
    } catch (e) {
      console.warn('Could not fetch triggered alerts:', e);
      return null;
    }
  }

  /**
   * Fetch current market data
   */
  async function fetchMarketData() {
    try {
      const response = await fetch(MARKET_DATA_URL + '?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch');

      marketData = await response.json();

      // Check user alerts against current data
      checkUserAlerts();

      return marketData;
    } catch (e) {
      console.warn('Could not fetch market data:', e);
      return null;
    }
  }

  /**
   * Check user alerts against current market data
   */
  function checkUserAlerts() {
    if (!marketData) return;

    const enabledAlerts = userAlerts.filter(a => a.enabled);

    for (const alert of enabledAlerts) {
      const currentValue = getMetricValue(alert.metric);
      if (currentValue === null) continue;

      let triggered = false;

      switch (alert.condition) {
        case 'above':
          triggered = currentValue > alert.threshold;
          break;
        case 'below':
          triggered = currentValue < alert.threshold;
          break;
        // crosses_above and crosses_below require previous value tracking
        // which is handled by the backend
      }

      if (triggered && canTrigger(alert)) {
        triggerUserAlert(alert, currentValue);
      }
    }
  }

  /**
   * Check if alert can trigger (cooldown)
   */
  function canTrigger(alert) {
    if (!alert.lastTriggered) return true;
    const cooldown = 15 * 60 * 1000; // 15 minute cooldown
    return Date.now() - alert.lastTriggered > cooldown;
  }

  /**
   * Trigger a user alert
   */
  function triggerUserAlert(alert, currentValue) {
    alert.lastTriggered = Date.now();
    alert.triggerCount++;
    saveUserAlerts();

    const message = `${alert.name}: ${currentValue.toFixed(4)} (threshold: ${alert.threshold})`;

    // Browser notification
    if (alert.notifications.browser && Notification.permission === 'granted') {
      showBrowserNotification(alert, message);
    }

    // Sound
    if (alert.notifications.sound) {
      playAlertSound(alert.severity);
    }

    // Dispatch event
    window.dispatchEvent(new CustomEvent('userAlertTriggered', {
      detail: { alert, currentValue, message }
    }));
  }

  /**
   * Get current value for a metric from market data
   */
  function getMetricValue(metricId) {
    if (!marketData) return null;

    const mapping = {
      'price': marketData.btc?.price,
      'price_change_24h': marketData.btc?.change24h,
      'mvrv': marketData.onchain?.mvrv,
      'sopr': marketData.profitability?.sopr,
      'nupl': marketData.onchain?.nupl,
      'exchange_netflow': marketData.onchain?.exchangeNetflow24h,
      'funding_rate': marketData.derivatives?.fundingRate,
      'open_interest': marketData.derivatives?.oiChange24h,
      'long_short_ratio': marketData.derivatives?.longShortRatio,
      'liquidations_24h': marketData.derivatives?.liquidations24h,
      'rsi': marketData.technical?.rsi,
      'volatility': marketData.btc?.volatility24h
    };

    return mapping[metricId] !== undefined ? mapping[metricId] : null;
  }

  /**
   * Show browser notification
   */
  function showBrowserNotification(alert, message) {
    if (Notification.permission !== 'granted') return;

    const severity = SEVERITY[alert.severity] || SEVERITY.info;
    const category = CATEGORIES[alert.category] || CATEGORIES.custom;

    new Notification(`${category.icon} BTCSignal Alert`, {
      body: message,
      icon: '/favicon.ico',
      tag: alert.id,
      requireInteraction: alert.severity === 'critical',
      silent: false
    });
  }

  /**
   * Play alert sound
   */
  function playAlertSound(severity = 'info') {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      const frequencies = { info: 440, warning: 660, critical: 880 };
      oscillator.frequency.value = frequencies[severity] || 440;
      oscillator.type = severity === 'critical' ? 'square' : 'sine';

      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Could not play alert sound');
    }
  }

  /**
   * Request notification permission
   */
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      return { granted: false, reason: 'Not supported' };
    }

    if (Notification.permission === 'granted') {
      return { granted: true };
    }

    if (Notification.permission === 'denied') {
      return { granted: false, reason: 'Blocked by user' };
    }

    const permission = await Notification.requestPermission();
    return { granted: permission === 'granted' };
  }

  /**
   * Get alert statistics
   */
  function getStats() {
    const enabled = userAlerts.filter(a => a.enabled).length;
    const byCategory = {};
    const bySeverity = {};

    for (const alert of userAlerts) {
      byCategory[alert.category] = (byCategory[alert.category] || 0) + 1;
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
    }

    return {
      total: userAlerts.length,
      enabled,
      disabled: userAlerts.length - enabled,
      remaining: MAX_USER_ALERTS - userAlerts.length,
      byCategory,
      bySeverity
    };
  }

  /**
   * Format time for display
   */
  function formatTime(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  /**
   * Get condition symbol
   */
  function getConditionSymbol(condition) {
    const c = CONDITIONS.find(x => x.id === condition);
    return c ? c.symbol : '=';
  }

  // Public API
  return {
    init,
    loadUserAlerts,
    createAlert,
    createFromTemplate,
    updateAlert,
    deleteAlert,
    toggleAlert,
    fetchTriggeredAlerts,
    fetchMarketData,
    requestNotificationPermission,
    getStats,
    formatTime,
    getConditionSymbol,

    // Getters
    getUserAlerts: () => userAlerts,
    getTriggeredAlerts: () => triggeredAlerts,
    getMarketData: () => marketData,

    // Constants
    CATEGORIES,
    SEVERITY,
    METRICS,
    CONDITIONS,
    ALERT_TEMPLATES,
    MAX_USER_ALERTS
  };
})();

// Auto-initialize
if (typeof window !== 'undefined') {
  EnhancedAlertManager.init();
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedAlertManager;
}
