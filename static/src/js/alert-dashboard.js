/**
 * Alert Dashboard Widget
 * Displays active alerts, alert history, and quick alert setup
 */

(function() {
  'use strict';

  const ALERTS_CACHE_URL = 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/main/data/triggered-alerts.json';
  const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  let alertsData = null;
  let acknowledgedAlerts = new Set();

  /**
   * Initialize alert dashboard
   */
  function init() {
    loadAcknowledgedAlerts();
    loadAlerts();
    setupEventListeners();

    // Refresh periodically
    setInterval(loadAlerts, REFRESH_INTERVAL);
  }

  /**
   * Load acknowledged alerts from localStorage
   */
  function loadAcknowledgedAlerts() {
    try {
      const stored = localStorage.getItem('btcsai_acknowledged_alerts');
      if (stored) {
        acknowledgedAlerts = new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load acknowledged alerts:', e);
    }
  }

  /**
   * Save acknowledged alerts to localStorage
   */
  function saveAcknowledgedAlerts() {
    try {
      localStorage.setItem('btcsai_acknowledged_alerts', JSON.stringify([...acknowledgedAlerts]));
    } catch (e) {
      console.error('Failed to save acknowledged alerts:', e);
    }
  }

  /**
   * Load alerts from GitHub cache
   */
  async function loadAlerts() {
    try {
      const response = await fetch(ALERTS_CACHE_URL + '?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch alerts');

      alertsData = await response.json();
      renderAlerts();
      updateAlertStats();
    } catch (error) {
      console.error('Failed to load alerts:', error);
      showAlertError();
    }
  }

  /**
   * Render alerts display
   */
  function renderAlerts() {
    if (!alertsData || !alertsData.alerts) return;

    // Filter out acknowledged alerts and get unacknowledged
    const unacknowledgedAlerts = alertsData.alerts.filter(
      alert => !acknowledgedAlerts.has(alert.id)
    );

    // Sort by severity and timestamp
    const sortedAlerts = unacknowledgedAlerts.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp - a.timestamp;
    });

    // Render active alerts
    renderActiveAlerts(sortedAlerts.slice(0, 10));

    // Render alert history (last 24h)
    renderAlertHistory(alertsData.alerts.slice(0, 20));
  }

  /**
   * Render active alerts
   */
  function renderActiveAlerts(alerts) {
    const container = document.getElementById('active-alerts-list');
    if (!container) return;

    if (alerts.length === 0) {
      container.innerHTML = `
        <div class="alert-empty">
          <span class="alert-empty-icon">✅</span>
          <p>No active alerts</p>
          <p class="alert-empty-sub">All clear! Monitoring continues...</p>
        </div>
      `;
      return;
    }

    container.innerHTML = alerts.map(alert => `
      <div class="alert-item alert-severity-${alert.severity}" data-alert-id="${alert.id}">
        <div class="alert-item-header">
          <span class="alert-badge alert-badge-${alert.severity}">${getSeverityLabel(alert.severity)}</span>
          <span class="alert-category">${alert.category}</span>
          <span class="alert-time">${formatTime(alert.timestamp)}</span>
        </div>
        <div class="alert-item-body">
          <h4 class="alert-name">${alert.name}</h4>
          <p class="alert-message">${alert.message}</p>
          <div class="alert-metrics">
            <span>Current: <strong>${formatValue(alert.currentValue)}</strong></span>
            <span>Threshold: <strong>${formatValue(alert.threshold)}</strong></span>
          </div>
        </div>
        <div class="alert-item-actions">
          <button class="btn-alert-action btn-acknowledge" data-alert-id="${alert.id}">
            Acknowledge
          </button>
        </div>
      </div>
    `).join('');

    // Add acknowledge handlers
    container.querySelectorAll('.btn-acknowledge').forEach(btn => {
      btn.addEventListener('click', () => acknowledgeAlert(btn.dataset.alertId));
    });
  }

  /**
   * Render alert history
   */
  function renderAlertHistory(alerts) {
    const container = document.getElementById('alert-history-list');
    if (!container) return;

    if (alerts.length === 0) {
      container.innerHTML = '<p class="alert-history-empty">No recent alerts</p>';
      return;
    }

    container.innerHTML = `
      <div class="alert-history-items">
        ${alerts.map(alert => `
          <div class="alert-history-item ${acknowledgedAlerts.has(alert.id) ? 'acknowledged' : ''}">
            <span class="alert-history-icon alert-severity-${alert.severity}">
              ${getSeverityIcon(alert.severity)}
            </span>
            <div class="alert-history-content">
              <strong>${alert.name}</strong>
              <span class="alert-history-time">${formatTimeAgo(alert.timestamp)}</span>
            </div>
            ${acknowledgedAlerts.has(alert.id) ? '<span class="alert-ack-badge">✓</span>' : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Update alert statistics
   */
  function updateAlertStats() {
    if (!alertsData || !alertsData.stats) return;

    const stats = alertsData.stats;

    // Update stat cards
    updateStatElement('alert-total', stats.total);
    updateStatElement('alert-critical', stats.critical);
    updateStatElement('alert-warning', stats.warning);
    updateStatElement('alert-info', stats.info);
    updateStatElement('alert-unacknowledged', stats.unacknowledged);

    // Update last checked time
    if (alertsData.lastChecked) {
      const lastCheckedEl = document.getElementById('alerts-last-checked');
      if (lastCheckedEl) {
        lastCheckedEl.textContent = `Last checked: ${formatTimeAgo(alertsData.lastChecked)}`;
      }
    }
  }

  /**
   * Update stat element
   */
  function updateStatElement(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value || 0;
    }
  }

  /**
   * Acknowledge an alert
   */
  function acknowledgeAlert(alertId) {
    acknowledgedAlerts.add(alertId);
    saveAcknowledgedAlerts();
    renderAlerts();
    updateAlertStats();
  }

  /**
   * Clear all acknowledged alerts
   */
  function clearAcknowledged() {
    if (confirm('Clear all acknowledged alerts?')) {
      acknowledgedAlerts.clear();
      saveAcknowledgedAlerts();
      renderAlerts();
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh-alerts');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadAlerts);
    }

    // Clear acknowledged button
    const clearBtn = document.getElementById('btn-clear-acknowledged');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAcknowledged);
    }

    // Severity filter buttons
    document.querySelectorAll('.alert-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const severity = btn.dataset.severity;
        filterAlertsBySeverity(severity);
      });
    });
  }

  /**
   * Filter alerts by severity
   */
  function filterAlertsBySeverity(severity) {
    if (!alertsData) return;

    let filteredAlerts = alertsData.alerts;

    if (severity !== 'all') {
      filteredAlerts = alertsData.alerts.filter(alert => alert.severity === severity);
    }

    renderActiveAlerts(
      filteredAlerts.filter(alert => !acknowledgedAlerts.has(alert.id)).slice(0, 10)
    );
  }

  /**
   * Show error message
   */
  function showAlertError() {
    const container = document.getElementById('active-alerts-list');
    if (container) {
      container.innerHTML = `
        <div class="alert-error">
          <span class="alert-error-icon">⚠️</span>
          <p>Failed to load alerts</p>
          <button class="btn-retry" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  /**
   * Get severity label
   */
  function getSeverityLabel(severity) {
    const labels = {
      critical: 'CRITICAL',
      warning: 'WARNING',
      info: 'INFO'
    };
    return labels[severity] || severity.toUpperCase();
  }

  /**
   * Get severity icon
   */
  function getSeverityIcon(severity) {
    const icons = {
      critical: '🔴',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[severity] || '📌';
  }

  /**
   * Format value for display
   */
  function formatValue(value) {
    if (typeof value !== 'number') return value;

    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(2) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(2) + 'K';
    }
    if (Math.abs(value) < 1) {
      return value.toFixed(4);
    }
    return value.toFixed(2);
  }

  /**
   * Format timestamp as time
   */
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * Format timestamp as time ago
   */
  function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      formatValue,
      formatTime,
      formatTimeAgo,
      getSeverityLabel,
      getSeverityIcon
    };
  }
})();
