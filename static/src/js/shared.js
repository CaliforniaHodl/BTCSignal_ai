// BTC Signal AI - Shared Utilities
// Common functions used across multiple JS files

const BTCSAIShared = (function() {
  'use strict';

  // ========== ACCESS CONTROL ==========

  /**
   * Check if user has access to a premium feature
   * @param {string} featureKey - Optional localStorage key for legacy access
   * @returns {boolean}
   */
  function checkAccess(featureKey) {
    // Admin mode bypasses everything
    if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.isAdmin()) {
      return true;
    }
    // All-access subscription
    if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.hasAllAccess()) {
      return true;
    }
    // Legacy localStorage check
    if (featureKey) {
      return localStorage.getItem(featureKey) === 'unlocked';
    }
    return false;
  }

  // ========== PRICE FETCHING ==========

  /**
   * Fetch current BTC price from various sources
   * @param {string} source - 'coinbase', 'binance', or 'kraken'
   * @returns {Promise<number|null>}
   */
  async function fetchBTCPrice(source = 'coinbase') {
    try {
      switch (source) {
        case 'binance':
          const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
          const binanceData = await binanceRes.json();
          return parseFloat(binanceData.price);

        case 'kraken':
          const krakenRes = await fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSD');
          const krakenData = await krakenRes.json();
          if (krakenData.result && krakenData.result.XXBTZUSD) {
            return parseFloat(krakenData.result.XXBTZUSD.c[0]);
          }
          return null;

        case 'coinbase':
        default:
          const coinbaseRes = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
          const coinbaseData = await coinbaseRes.json();
          return parseFloat(coinbaseData.data.amount);
      }
    } catch (e) {
      console.error('BTCSAIShared: Price fetch error:', e);
      return null;
    }
  }

  /**
   * Fetch OHLC price data from Binance
   * @param {string} timeframe - '15m', '1h', '4h', '1d'
   * @param {number} limit - Number of candles
   * @returns {Promise<Array>}
   */
  async function fetchOHLCData(timeframe = '1h', limit = 100) {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${timeframe}&limit=${limit}`
      );
      const data = await res.json();

      return data.map(candle => ({
        time: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      }));
    } catch (e) {
      console.error('BTCSAIShared: OHLC fetch error:', e);
      return [];
    }
  }

  // ========== MARKET SNAPSHOT ==========

  let marketSnapshot = null;
  let snapshotLoading = false;
  let snapshotPromise = null;

  /**
   * Load market snapshot from static JSON (cached)
   * @returns {Promise<Object|null>}
   */
  async function loadMarketSnapshot() {
    // Return cached data if available
    if (marketSnapshot) return marketSnapshot;

    // Return existing promise if loading
    if (snapshotLoading && snapshotPromise) return snapshotPromise;

    snapshotLoading = true;
    snapshotPromise = (async () => {
      try {
        const res = await fetch('/data/market-snapshot.json');
        if (res.ok) {
          marketSnapshot = await res.json();
          console.log('BTCSAIShared: Market snapshot loaded:', marketSnapshot.timestamp);
        }
      } catch (e) {
        console.error('BTCSAIShared: Snapshot load error:', e);
      }
      snapshotLoading = false;
      return marketSnapshot;
    })();

    return snapshotPromise;
  }

  /**
   * Get cached market snapshot (synchronous)
   * @returns {Object|null}
   */
  function getMarketSnapshot() {
    return marketSnapshot;
  }

  // ========== TECHNICAL INDICATORS ==========

  /**
   * Calculate RSI (Relative Strength Index)
   * @param {number[]} prices - Array of close prices
   * @param {number} period - RSI period (default 14)
   * @returns {number}
   */
  function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   * @param {number[]} data - Array of prices
   * @param {number} period - EMA period
   * @returns {number[]}
   */
  function calculateEMA(data, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);
    ema[0] = data[0];

    for (let i = 1; i < data.length; i++) {
      ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }
    return ema;
  }

  /**
   * Calculate multiple EMAs at once
   * @param {number[]} data - Array of prices
   * @param {number[]} periods - Array of periods [9, 21, 50, 200]
   * @returns {Object} - { ema9: [], ema21: [], ... }
   */
  function calculateEMAs(data, periods = [9, 21, 50, 200]) {
    const result = {};
    periods.forEach(period => {
      result['ema' + period] = calculateEMA(data, period);
    });
    return result;
  }

  // ========== UI HELPERS ==========

  /**
   * Update premium gate/content visibility
   * @param {string} gateId - ID of premium gate element
   * @param {string} contentId - ID of premium content element
   * @param {boolean} hasAccess - Whether user has access
   * @param {Function} onUnlock - Callback when content is unlocked
   */
  function updatePremiumUI(gateId, contentId, hasAccess, onUnlock) {
    const gate = document.getElementById(gateId);
    const content = document.getElementById(contentId);

    if (hasAccess) {
      if (gate) gate.style.display = 'none';
      if (content) {
        content.style.display = 'block';
        if (onUnlock) onUnlock();
      }
    } else {
      if (gate) gate.style.display = 'flex';
      if (content) content.style.display = 'none';
    }
  }

  /**
   * Setup unlock button with Toast confirmation
   * @param {string} buttonId - ID of unlock button
   * @param {number} satsCost - Cost in sats
   * @param {Function} onConfirm - Callback on confirmation
   */
  function setupUnlockButton(buttonId, satsCost, onConfirm) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    btn.addEventListener('click', function() {
      if (typeof Toast !== 'undefined' && Toast.confirm) {
        Toast.confirm(`This will cost ${satsCost} sats via Lightning. Continue?`, onConfirm);
      } else {
        onConfirm();
      }
    });
  }

  // ========== FORMATTING ==========

  /**
   * Format price with $ and commas
   * @param {number} price
   * @param {number} decimals - Max decimal places (default 0)
   * @returns {string}
   */
  function formatPrice(price, decimals = 0) {
    if (price == null || isNaN(price)) return '--';
    return '$' + price.toLocaleString(undefined, { maximumFractionDigits: decimals });
  }

  /**
   * Format percentage with optional + sign
   * @param {number} pct
   * @param {boolean} showPlus - Show + for positive (default true)
   * @param {number} decimals - Decimal places (default 2)
   * @returns {string}
   */
  function formatPercent(pct, showPlus = true, decimals = 2) {
    if (pct == null || isNaN(pct)) return '--';
    return (showPlus && pct >= 0 ? '+' : '') + pct.toFixed(decimals) + '%';
  }

  /**
   * Format large numbers with K, M, B suffixes
   * @param {number} num
   * @param {number} decimals
   * @returns {string}
   */
  function formatCompact(num, decimals = 1) {
    if (num == null || isNaN(num)) return '--';
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(decimals) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(decimals) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(decimals) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(decimals) + 'K';
    return '$' + num.toFixed(decimals);
  }

  /**
   * Format date for display
   * @param {string|Date} dateStr
   * @param {string} format - 'short', 'long', 'time'
   * @returns {string}
   */
  function formatDate(dateStr, format = 'short') {
    if (!dateStr) return '--';
    const date = new Date(dateStr);

    switch (format) {
      case 'long':
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      case 'time':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'short':
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  // ========== COLOR HELPERS ==========

  /**
   * Get color class based on value
   * @param {number} value
   * @param {Object} thresholds - { positive: 0, negative: 0 }
   * @returns {string} - 'positive', 'negative', or 'neutral'
   */
  function getColorClass(value, thresholds = { positive: 0, negative: 0 }) {
    if (value > thresholds.positive) return 'positive';
    if (value < thresholds.negative) return 'negative';
    return 'neutral';
  }

  /**
   * Get Fear & Greed color class
   * @param {number} value - 0-100
   * @returns {string}
   */
  function getFearGreedClass(value) {
    if (value <= 25) return 'extreme-fear';
    if (value <= 45) return 'fear';
    if (value <= 55) return 'neutral';
    if (value <= 75) return 'greed';
    return 'extreme-greed';
  }

  // ========== DEBOUNCE/THROTTLE ==========

  /**
   * Debounce function calls
   * @param {Function} func
   * @param {number} wait - Milliseconds
   * @returns {Function}
   */
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Throttle function calls
   * @param {Function} func
   * @param {number} limit - Milliseconds
   * @returns {Function}
   */
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // ========== PUBLIC API ==========

  return {
    // Access control
    checkAccess,

    // Price fetching
    fetchBTCPrice,
    fetchOHLCData,

    // Market snapshot
    loadMarketSnapshot,
    getMarketSnapshot,

    // Technical indicators
    calculateRSI,
    calculateEMA,
    calculateEMAs,

    // UI helpers
    updatePremiumUI,
    setupUnlockButton,

    // Formatting
    formatPrice,
    formatPercent,
    formatCompact,
    formatDate,

    // Color helpers
    getColorClass,
    getFearGreedClass,

    // Utilities
    debounce,
    throttle
  };
})();

// Export for global use
if (typeof window !== 'undefined') {
  window.BTCSAIShared = BTCSAIShared;
}
