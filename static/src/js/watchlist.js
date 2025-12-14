/**
 * Watchlist Feature
 * Save and monitor specific metrics
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'btcsai_watchlist';
  let watchlist = [];

  /**
   * Initialize watchlist
   */
  function init() {
    loadWatchlist();
    renderWatchlist();
    setupEventListeners();
  }

  /**
   * Load watchlist from localStorage
   */
  function loadWatchlist() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        watchlist = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load watchlist:', e);
      watchlist = [];
    }
  }

  /**
   * Save watchlist to localStorage
   */
  function saveWatchlist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    } catch (e) {
      console.error('Failed to save watchlist:', e);
    }
  }

  /**
   * Add item to watchlist
   */
  function addToWatchlist(metric) {
    // Check if already exists
    if (watchlist.some(item => item.id === metric.id)) {
      showToast('Already in watchlist', 'info');
      return;
    }

    watchlist.push({
      id: metric.id,
      name: metric.name,
      category: metric.category,
      addedAt: Date.now(),
      order: watchlist.length
    });

    saveWatchlist();
    renderWatchlist();
    showToast('Added to watchlist', 'success');
  }

  /**
   * Remove item from watchlist
   */
  function removeFromWatchlist(id) {
    watchlist = watchlist.filter(item => item.id !== id);
    saveWatchlist();
    renderWatchlist();
    showToast('Removed from watchlist', 'success');
  }

  /**
   * Reorder watchlist
   */
  function reorderWatchlist(oldIndex, newIndex) {
    const item = watchlist.splice(oldIndex, 1)[0];
    watchlist.splice(newIndex, 0, item);

    // Update order values
    watchlist.forEach((item, index) => {
      item.order = index;
    });

    saveWatchlist();
    renderWatchlist();
  }

  /**
   * Render watchlist
   */
  function renderWatchlist() {
    const container = document.getElementById('watchlist-items');
    if (!container) return;

    if (watchlist.length === 0) {
      container.innerHTML = `
        <div class="watchlist-empty">
          <span class="watchlist-empty-icon">📋</span>
          <p>Your watchlist is empty</p>
          <p class="watchlist-empty-sub">Click the ⭐ icon on any metric to add it</p>
        </div>
      `;
      return;
    }

    // Sort by order
    const sortedWatchlist = [...watchlist].sort((a, b) => a.order - b.order);

    container.innerHTML = sortedWatchlist.map((item, index) => `
      <div class="watchlist-item" data-id="${item.id}" data-index="${index}" draggable="true">
        <div class="watchlist-drag-handle">⋮⋮</div>
        <div class="watchlist-item-content">
          <strong class="watchlist-item-name">${item.name}</strong>
          <span class="watchlist-item-category">${item.category}</span>
          <div class="watchlist-item-value" id="watchlist-value-${item.id}">Loading...</div>
        </div>
        <button class="btn-watchlist-remove" data-id="${item.id}" title="Remove from watchlist">×</button>
      </div>
    `).join('');

    // Add event listeners
    setupDragAndDrop();
    setupRemoveButtons();

    // Load current values
    loadWatchlistValues();
  }

  /**
   * Setup drag and drop for reordering
   */
  function setupDragAndDrop() {
    const items = document.querySelectorAll('.watchlist-item');
    let draggedItem = null;

    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        item.classList.add('dragging');
      });

      item.addEventListener('dragend', (e) => {
        item.classList.remove('dragging');
        draggedItem = null;
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        if (draggingItem && draggingItem !== item) {
          const bounding = item.getBoundingClientRect();
          const offset = e.clientY - bounding.top;

          if (offset > bounding.height / 2) {
            item.parentNode.insertBefore(draggingItem, item.nextSibling);
          } else {
            item.parentNode.insertBefore(draggingItem, item);
          }
        }
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        updateWatchlistOrder();
      });
    });
  }

  /**
   * Update watchlist order after drag and drop
   */
  function updateWatchlistOrder() {
    const items = document.querySelectorAll('.watchlist-item');
    const newOrder = Array.from(items).map(item => item.dataset.id);

    watchlist = newOrder.map((id, index) => {
      const item = watchlist.find(w => w.id === id);
      return { ...item, order: index };
    });

    saveWatchlist();
  }

  /**
   * Setup remove buttons
   */
  function setupRemoveButtons() {
    document.querySelectorAll('.btn-watchlist-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        removeFromWatchlist(id);
      });
    });
  }

  /**
   * Load current values for watchlist items
   */
  async function loadWatchlistValues() {
    // This would fetch current values from market data
    // For now, just show placeholder
    watchlist.forEach(item => {
      const valueEl = document.getElementById(`watchlist-value-${item.id}`);
      if (valueEl) {
        valueEl.textContent = '--';
        valueEl.className = 'watchlist-item-value neutral';
      }
    });
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Add watchlist buttons on metrics
    document.querySelectorAll('.btn-add-watchlist').forEach(btn => {
      btn.addEventListener('click', () => {
        const metric = {
          id: btn.dataset.metricId,
          name: btn.dataset.metricName,
          category: btn.dataset.metricCategory
        };
        addToWatchlist(metric);
      });
    });

    // Clear watchlist button
    const clearBtn = document.getElementById('btn-clear-watchlist');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Clear entire watchlist?')) {
          watchlist = [];
          saveWatchlist();
          renderWatchlist();
          showToast('Watchlist cleared', 'success');
        }
      });
    }
  }

  /**
   * Show toast notification
   */
  function showToast(message, type = 'info') {
    // Use existing toast system if available
    if (typeof showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  /**
   * Check if metric is in watchlist
   */
  function isInWatchlist(id) {
    return watchlist.some(item => item.id === id);
  }

  /**
   * Get watchlist count
   */
  function getWatchlistCount() {
    return watchlist.length;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for use by other modules
  window.BTCSAIWatchlist = {
    add: addToWatchlist,
    remove: removeFromWatchlist,
    isInWatchlist,
    getCount: getWatchlistCount
  };

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist,
      getWatchlistCount
    };
  }
})();
