// Live BTC price ticker - Updated to use WebSocket manager
(function() {
  'use strict';

  let subscriberId = null;

  // Format price with animation
  function updatePriceDisplay(price) {
    const priceElement = document.getElementById('btc-price');
    if (!priceElement) return;

    const formattedPrice = '$' + price.toLocaleString(undefined, { maximumFractionDigits: 0 });

    // Add flash animation on price change
    if (priceElement.textContent !== formattedPrice) {
      priceElement.classList.remove('price-flash');
      // Force reflow to restart animation
      void priceElement.offsetWidth;
      priceElement.classList.add('price-flash');

      priceElement.textContent = formattedPrice;
    }
  }

  // Update 24h change display
  function updateChangeDisplay(priceChange, priceChangePercent) {
    const changeElement = document.getElementById('btc-change');
    if (!changeElement) return;

    const isPositive = priceChange >= 0;
    const arrow = isPositive ? '▲' : '▼';
    const sign = isPositive ? '+' : '';

    changeElement.textContent = `${arrow} ${sign}${priceChangePercent.toFixed(2)}%`;
    changeElement.className = 'ticker-change ' + (isPositive ? 'positive' : 'negative');
  }

  // Update 24h stats
  function updateStats(data) {
    // 24h High
    const highElement = document.getElementById('stat-high');
    if (highElement && data.high24h) {
      highElement.textContent = '$' + data.high24h.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }

    // 24h Low
    const lowElement = document.getElementById('stat-low');
    if (lowElement && data.low24h) {
      lowElement.textContent = '$' + data.low24h.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }

    // 24h Volume
    const volumeElement = document.getElementById('stat-volume');
    if (volumeElement && data.quoteVolume24h) {
      const volumeInBillions = (data.quoteVolume24h / 1e9).toFixed(2);
      volumeElement.textContent = '$' + volumeInBillions + 'B';
    }
  }

  // Update connection status indicator (if exists)
  function updateConnectionStatus(state) {
    const statusElement = document.getElementById('ws-status');
    if (!statusElement) return;

    const statusMap = {
      'disconnected': { text: 'Offline', class: 'status-offline' },
      'connecting': { text: 'Connecting...', class: 'status-connecting' },
      'connected': { text: 'Live', class: 'status-live' },
      'reconnecting': { text: 'Reconnecting...', class: 'status-reconnecting' },
      'failed': { text: 'Using Fallback', class: 'status-fallback' }
    };

    const status = statusMap[state] || statusMap.disconnected;
    statusElement.textContent = status.text;
    statusElement.className = 'ws-status ' + status.class;
  }

  // Handle price updates from WebSocket
  function handlePriceUpdate(data) {
    // Skip state change events
    if (data.type === 'state') {
      updateConnectionStatus(data.newState);
      return;
    }

    // Update price
    if (data.price) {
      updatePriceDisplay(data.price);
    }

    // Update 24h change
    if (data.priceChange !== undefined && data.priceChangePercent !== undefined) {
      updateChangeDisplay(data.priceChange, data.priceChangePercent);
    }

    // Update stats
    updateStats(data);
  }

  // Initialize when DOM is ready
  function init() {
    // Wait for WSManager to be available
    if (typeof window.WSManager === 'undefined') {
      console.warn('[PriceTicker] WSManager not available, retrying in 100ms...');
      setTimeout(init, 100);
      return;
    }

    // Subscribe to price updates
    subscriberId = window.WSManager.subscribe(handlePriceUpdate);

    console.log('[PriceTicker] Subscribed to WebSocket updates');

    // Update connection status
    updateConnectionStatus(window.WSManager.getConnectionState());
  }

  // Cleanup on page unload
  function cleanup() {
    if (subscriberId !== null && typeof window.WSManager !== 'undefined') {
      window.WSManager.unsubscribe(subscriberId);
      console.log('[PriceTicker] Unsubscribed from WebSocket updates');
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Cleanup on unload
  window.addEventListener('beforeunload', cleanup);
})();
