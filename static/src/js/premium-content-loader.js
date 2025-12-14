// BTC Signal AI - Premium Content Loader
// Securely fetches and displays premium content after authentication
// This prevents CSS-based paywall bypass attacks
(function() {
  'use strict';

  const CONFIG = {
    apiEndpoint: '/.netlify/functions/get-premium-content',
    storageKeys: {
      recoveryCode: 'btcsai_recovery_code',
      sessionToken: 'btcsai_session_token'
    }
  };

  /**
   * Premium Content Loader Module
   * Fetches authenticated content from server and injects into DOM
   */
  const PremiumContentLoader = {
    /**
     * Initialize the loader
     * Automatically loads content if user is authenticated
     */
    init: function() {
      // Check if we're on a premium content page
      const pageContainer = document.querySelector('[data-post-id]');
      const isPremium = pageContainer && pageContainer.dataset.isFree === 'false';

      if (!isPremium) {
        return; // Not a premium page, nothing to do
      }

      // Check if user has valid access
      if (this.hasAccess()) {
        this.loadPremiumContent();
      }

      // Listen for unlock events (after payment)
      document.addEventListener('btcsai:unlocked', () => {
        this.loadPremiumContent();
      });

      // Listen for access recovery
      document.addEventListener('btcsai:access-recovered', () => {
        this.loadPremiumContent();
      });
    },

    /**
     * Check if user has stored access credentials
     */
    hasAccess: function() {
      const recoveryCode = localStorage.getItem(CONFIG.storageKeys.recoveryCode);
      const sessionToken = localStorage.getItem(CONFIG.storageKeys.sessionToken);
      return !!(recoveryCode && sessionToken);
    },

    /**
     * Get authentication headers
     */
    getAuthHeaders: function() {
      return {
        'X-Recovery-Code': localStorage.getItem(CONFIG.storageKeys.recoveryCode) || '',
        'X-Session-Token': localStorage.getItem(CONFIG.storageKeys.sessionToken) || ''
      };
    },

    /**
     * Load premium content from authenticated API
     */
    loadPremiumContent: async function() {
      const pageContainer = document.querySelector('[data-post-id]');
      if (!pageContainer) return;

      const postId = pageContainer.dataset.postId;
      const contentType = pageContainer.dataset.contentType || 'post';

      try {
        const response = await fetch(CONFIG.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders()
          },
          body: JSON.stringify({
            contentType: contentType,
            contentId: postId
          })
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Session invalid - clear local storage and show paywall
            this.handleAuthFailure();
            return;
          }
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          this.injectPremiumContent(result.data);
          this.showUnlockedState();
        }

      } catch (error) {
        console.error('Failed to load premium content:', error);
        // Don't clear auth on network errors - might be temporary
      }
    },

    /**
     * Inject premium data into the DOM
     * @param {Object} data - Premium content data from API
     */
    injectPremiumContent: function(data) {
      // Inject stats
      this.injectStats(data);

      // Inject targets
      this.injectTargets(data);

      // Inject factor cards
      this.injectFactorCards(data);

      // Inject markdown content if available
      if (data.markdownBody) {
        this.injectMarkdownContent(data.markdownBody);
      }

      // Dispatch event for other modules
      document.dispatchEvent(new CustomEvent('btcsai:content-loaded', {
        detail: { data }
      }));
    },

    /**
     * Inject quick stats data
     */
    injectStats: function(data) {
      const realStats = document.getElementById('real-stats');
      if (!realStats) return;

      // Signal/Sentiment
      const sentimentEl = realStats.querySelector('.stat.sentiment .stat-value');
      if (sentimentEl && data.sentiment) {
        const icon = data.sentiment === 'bullish' ? '📈' : data.sentiment === 'bearish' ? '📉' : '⏸️';
        sentimentEl.innerHTML = `${icon} ${data.sentiment.toUpperCase()}`;
        sentimentEl.closest('.stat').className = `stat sentiment ${data.sentiment}`;
      }

      // Result
      const resultEl = realStats.querySelector('.stat.result .stat-value');
      if (resultEl && data.callResult) {
        const resultClass = data.callResult === 'win' ? 'win' : data.callResult === 'loss' ? 'loss' : 'pending';
        const resultIcon = data.callResult === 'win' ? '✅ WIN' : data.callResult === 'loss' ? '❌ LOSS' : '⏳ PENDING';
        resultEl.innerHTML = resultIcon;
        resultEl.className = `stat-value result-chip ${resultClass}`;
      }

      // Confidence
      const confidenceEl = realStats.querySelector('.stat.confidence .stat-value');
      if (confidenceEl && data.confidence) {
        confidenceEl.textContent = `${data.confidence}%`;
        const bar = realStats.querySelector('.confidence-fill-mini');
        if (bar) bar.style.width = `${data.confidence}%`;
      }

      // Price
      const priceEl = realStats.querySelector('.stat.price .stat-value');
      if (priceEl && data.price) {
        priceEl.textContent = `$${this.formatNumber(data.price, 2)}`;
      }

      // 24h Change
      const changeEl = realStats.querySelector('.stat.change .stat-value');
      if (changeEl && data.priceChange) {
        changeEl.textContent = data.priceChange;
        const isPositive = data.priceChange.startsWith('+');
        changeEl.closest('.stat').className = `stat change ${isPositive ? 'positive' : 'negative'}`;
      }
    },

    /**
     * Inject target prices
     */
    injectTargets: function(data) {
      const realTargets = document.getElementById('real-targets');
      if (!realTargets) return;

      // Target Price
      const targetEl = realTargets.querySelector('.target-item.target .target-value');
      if (targetEl && data.targetPrice) {
        targetEl.textContent = `$${this.formatNumber(data.targetPrice, 2)}`;
      }

      // Stop Loss
      const stopEl = realTargets.querySelector('.target-item.stop-loss .target-value');
      if (stopEl && data.stopLoss) {
        stopEl.textContent = `$${this.formatNumber(data.stopLoss, 2)}`;
      }

      // Risk:Reward
      if (data.targetPrice && data.stopLoss && data.price) {
        const rrEl = realTargets.querySelector('.target-item.risk-reward .target-value');
        if (rrEl) {
          const rr = (data.targetPrice - data.price) / (data.price - data.stopLoss);
          rrEl.textContent = `1:${Math.abs(rr).toFixed(1)}`;
        }
      }

      // Block Height
      const blockEl = realTargets.querySelector('.target-item.block-height .target-value');
      if (blockEl && data.blockHeight) {
        blockEl.textContent = this.formatNumber(data.blockHeight, 0);
      }

      // Sats per Dollar
      if (data.price) {
        const satsEl = realTargets.querySelector('.target-item.sats-per-dollar .target-value');
        if (satsEl) {
          const sats = Math.floor(100000000 / data.price);
          satsEl.textContent = `${this.formatNumber(sats, 0)} sats`;
        }
      }
    },

    /**
     * Inject factor card data (RSI, Volume, etc.)
     */
    injectFactorCards: function(data) {
      const realContent = document.getElementById('real-article-content');
      if (!realContent) return;

      // RSI
      if (data.rsi !== undefined) {
        const rsiValue = realContent.querySelector('.factor-card .factor-name:contains("RSI")');
        // Note: More complex injection would be needed for full factor cards
        // For now, the real content section will show once unlocked
      }

      // Other factors would be injected similarly
      // The key point is that real values come from the API, not the HTML
    },

    /**
     * Inject markdown content
     */
    injectMarkdownContent: function(markdown) {
      const contentArea = document.getElementById('premium-markdown-content');
      if (!contentArea) return;

      // Basic markdown to HTML conversion
      // In production, use a proper markdown parser
      let html = markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');

      contentArea.innerHTML = html;
    },

    /**
     * Show unlocked UI state
     */
    showUnlockedState: function() {
      // Hide fake content
      document.querySelectorAll('.fake-content').forEach(el => {
        el.style.display = 'none';
      });

      // Show real content
      document.querySelectorAll('.real-content').forEach(el => {
        el.classList.remove('hidden-until-paid');
        el.style.display = '';
      });

      // Hide paywall overlay
      const overlay = document.getElementById('paywall-overlay');
      if (overlay) {
        overlay.style.display = 'none';
      }

      // Add unlocked class to container
      const container = document.querySelector('.single-post-page');
      if (container) {
        container.classList.add('unlocked');
      }

      // Announce to screen readers
      this.announceToScreenReader('Premium content unlocked');
    },

    /**
     * Handle authentication failure
     */
    handleAuthFailure: function() {
      // Clear invalid credentials
      localStorage.removeItem(CONFIG.storageKeys.recoveryCode);
      localStorage.removeItem(CONFIG.storageKeys.sessionToken);

      // Show paywall
      const overlay = document.getElementById('paywall-overlay');
      if (overlay) {
        overlay.style.display = '';
      }

      // Hide real content
      document.querySelectorAll('.real-content').forEach(el => {
        el.classList.add('hidden-until-paid');
      });

      // Show fake content
      document.querySelectorAll('.fake-content').forEach(el => {
        el.style.display = '';
      });

      // Notify user
      if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.showToast) {
        BTCSAIAccess.showToast('Session expired. Please recover your access.', 'warning');
      }
    },

    /**
     * Format number with locale
     */
    formatNumber: function(num, decimals) {
      return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    },

    /**
     * Announce message to screen readers
     */
    announceToScreenReader: function(message) {
      const announcer = document.getElementById('sr-announcer') ||
        document.createElement('div');

      if (!announcer.id) {
        announcer.id = 'sr-announcer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        document.body.appendChild(announcer);
      }

      announcer.textContent = message;
    }
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PremiumContentLoader.init());
  } else {
    PremiumContentLoader.init();
  }

  // Expose for external use
  window.PremiumContentLoader = PremiumContentLoader;

})();
