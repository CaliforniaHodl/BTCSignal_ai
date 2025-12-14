// Alert History System
// Sprint 8: Alert System History
// Comprehensive alert history with filtering, search, and export

(function() {
  'use strict';

  const STORAGE_KEY = 'btcsai_alert_history';
  const MAX_HISTORY_ITEMS = 500;

  // Alert types
  const ALERT_TYPES = {
    price_above: { label: 'Price Above', icon: '📈', category: 'price' },
    price_below: { label: 'Price Below', icon: '📉', category: 'price' },
    percent_change: { label: '% Change', icon: '📊', category: 'price' },
    mvrv_high: { label: 'MVRV High', icon: '⛓️', category: 'onchain' },
    mvrv_low: { label: 'MVRV Low', icon: '⛓️', category: 'onchain' },
    funding_spike: { label: 'Funding Spike', icon: '💹', category: 'derivatives' },
    funding_negative: { label: 'Negative Funding', icon: '💹', category: 'derivatives' },
    rsi_overbought: { label: 'RSI Overbought', icon: '📈', category: 'technical' },
    rsi_oversold: { label: 'RSI Oversold', icon: '📉', category: 'technical' },
    whale_movement: { label: 'Whale Movement', icon: '🐋', category: 'onchain' },
    system: { label: 'System Alert', icon: '🔔', category: 'system' }
  };

  // State
  let history = [];
  let filteredHistory = [];
  let currentFilters = {
    category: 'all',
    dateRange: 'all',
    search: ''
  };

  // Load history from localStorage
  function loadHistory() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      history = saved ? JSON.parse(saved) : [];
      // Sort by timestamp descending
      history.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt));
    } catch (e) {
      console.error('Error loading alert history:', e);
      history = [];
    }
    applyFilters();
  }

  // Save history to localStorage
  function saveHistory() {
    try {
      // Limit to max items
      if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving alert history:', e);
    }
  }

  /**
   * Add an alert to history
   * @param {Object} alert - Alert object
   */
  function add(alert) {
    const historyEntry = {
      id: alert.id || Date.now(),
      type: alert.type || 'system',
      condition: alert.condition || formatCondition(alert),
      note: alert.note || '',
      triggeredAt: alert.triggeredAt || new Date().toISOString(),
      priceAtTrigger: alert.priceAtTrigger || 0,
      value: alert.value || 0,
      metadata: alert.metadata || {}
    };

    history.unshift(historyEntry);
    saveHistory();
    applyFilters();

    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('alertHistoryUpdated', {
      detail: { entry: historyEntry, count: history.length }
    }));
  }

  /**
   * Format alert condition for display
   */
  function formatCondition(alert) {
    const typeInfo = ALERT_TYPES[alert.type] || ALERT_TYPES.system;

    if (alert.type === 'price_above' || alert.type === 'price_below') {
      const direction = alert.type === 'price_above' ? 'above' : 'below';
      return `Price ${direction} $${Number(alert.value).toLocaleString()}`;
    }

    if (alert.type === 'percent_change') {
      return `${alert.value}% change (24h)`;
    }

    return alert.condition || typeInfo.label;
  }

  /**
   * Get alert by ID
   */
  function getById(id) {
    return history.find(a => a.id === id);
  }

  /**
   * Delete alert from history
   */
  function remove(id) {
    history = history.filter(a => a.id !== id);
    saveHistory();
    applyFilters();
  }

  /**
   * Clear all history
   */
  function clear() {
    history = [];
    saveHistory();
    applyFilters();
    window.dispatchEvent(new CustomEvent('alertHistoryCleared'));
  }

  /**
   * Set filters
   */
  function setFilters(filters) {
    currentFilters = { ...currentFilters, ...filters };
    applyFilters();
  }

  /**
   * Apply current filters
   */
  function applyFilters() {
    filteredHistory = history.filter(alert => {
      // Category filter
      if (currentFilters.category !== 'all') {
        const typeInfo = ALERT_TYPES[alert.type];
        if (!typeInfo || typeInfo.category !== currentFilters.category) {
          return false;
        }
      }

      // Date range filter
      if (currentFilters.dateRange !== 'all') {
        const alertDate = new Date(alert.triggeredAt);
        const now = new Date();
        let cutoff;

        switch (currentFilters.dateRange) {
          case '24h':
            cutoff = new Date(now - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoff = new Date(0);
        }

        if (alertDate < cutoff) return false;
      }

      // Search filter
      if (currentFilters.search) {
        const searchLower = currentFilters.search.toLowerCase();
        const matchesCondition = alert.condition?.toLowerCase().includes(searchLower);
        const matchesNote = alert.note?.toLowerCase().includes(searchLower);
        const matchesType = ALERT_TYPES[alert.type]?.label.toLowerCase().includes(searchLower);

        if (!matchesCondition && !matchesNote && !matchesType) {
          return false;
        }
      }

      return true;
    });

    window.dispatchEvent(new CustomEvent('alertHistoryFiltered', {
      detail: { count: filteredHistory.length, total: history.length }
    }));
  }

  /**
   * Get filtered history
   */
  function getFiltered() {
    return filteredHistory;
  }

  /**
   * Get all history
   */
  function getAll() {
    return history;
  }

  /**
   * Get statistics
   */
  function getStats() {
    const now = new Date();
    const last24h = history.filter(a =>
      new Date(a.triggeredAt) > new Date(now - 24 * 60 * 60 * 1000)
    );
    const last7d = history.filter(a =>
      new Date(a.triggeredAt) > new Date(now - 7 * 24 * 60 * 60 * 1000)
    );

    const categoryCount = {};
    history.forEach(alert => {
      const typeInfo = ALERT_TYPES[alert.type];
      const category = typeInfo?.category || 'other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const typeCount = {};
    history.forEach(alert => {
      typeCount[alert.type] = (typeCount[alert.type] || 0) + 1;
    });

    return {
      total: history.length,
      last24h: last24h.length,
      last7d: last7d.length,
      byCategory: categoryCount,
      byType: typeCount,
      oldestAlert: history.length > 0 ? history[history.length - 1].triggeredAt : null,
      newestAlert: history.length > 0 ? history[0].triggeredAt : null
    };
  }

  /**
   * Export history to CSV
   */
  function exportCSV() {
    const headers = ['Date', 'Time', 'Type', 'Condition', 'Price at Trigger', 'Note'];
    const rows = history.map(alert => {
      const date = new Date(alert.triggeredAt);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        ALERT_TYPES[alert.type]?.label || alert.type,
        `"${(alert.condition || '').replace(/"/g, '""')}"`,
        alert.priceAtTrigger ? `$${alert.priceAtTrigger.toLocaleString()}` : '-',
        `"${(alert.note || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    downloadFile(csv, 'alert-history.csv', 'text/csv');
  }

  /**
   * Export history to JSON
   */
  function exportJSON() {
    const data = {
      exportedAt: new Date().toISOString(),
      stats: getStats(),
      alerts: history
    };
    downloadFile(JSON.stringify(data, null, 2), 'alert-history.json', 'application/json');
  }

  /**
   * Download file helper
   */
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Render history list to an element
   */
  function render(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    if (filteredHistory.length === 0) {
      container.innerHTML = `
        <div class="no-history" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 8px;">📋</div>
          <p>No alerts in history</p>
          <span style="font-size: 0.875rem;">Triggered alerts will appear here</span>
        </div>
      `;
      return;
    }

    const html = filteredHistory.map(alert => {
      const typeInfo = ALERT_TYPES[alert.type] || ALERT_TYPES.system;
      const date = new Date(alert.triggeredAt);

      return `
        <div class="history-item" data-id="${alert.id}">
          <div class="history-icon">${typeInfo.icon}</div>
          <div class="history-content">
            <div class="history-condition">${escapeHtml(alert.condition)}</div>
            ${alert.note ? `<div class="history-note">${escapeHtml(alert.note)}</div>` : ''}
            <div class="history-meta">
              <span class="history-category">${typeInfo.category}</span>
              <span class="history-price">$${alert.priceAtTrigger?.toLocaleString() || '-'}</span>
              <span class="history-time">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
            </div>
          </div>
          <button class="history-delete" data-id="${alert.id}" aria-label="Delete">×</button>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

    // Add delete handlers
    container.querySelectorAll('.history-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        remove(parseInt(btn.dataset.id));
        render(containerSelector);
      });
    });
  }

  /**
   * Escape HTML for safe rendering
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize
  loadHistory();

  // Expose public API
  window.AlertHistory = {
    add,
    remove,
    clear,
    getById,
    getAll,
    getFiltered,
    setFilters,
    getStats,
    exportCSV,
    exportJSON,
    render,
    types: ALERT_TYPES
  };

})();
