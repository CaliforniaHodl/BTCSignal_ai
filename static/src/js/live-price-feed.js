/**
 * BTC Signal AI - Live Price Feed
 * WebSocket connection for real-time BTC price data
 * Used for paper trading auto-execution
 */

const BTCSAILiveFeed = (function() {
  'use strict';

  // WebSocket connection
  let ws = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_DELAY = 3000;

  // Current state
  let currentPrice = null;
  let lastUpdate = null;
  let isConnected = false;

  // Subscribers
  const priceSubscribers = [];
  const tradeSubscribers = [];

  // Open positions for auto-execution
  let openPositions = [];

  // ==================== WEBSOCKET CONNECTION ====================

  /**
   * Connect to Binance WebSocket
   */
  function connect() {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('[LiveFeed] Already connected');
      return;
    }

    try {
      // Binance US WebSocket for BTC/USDT trades
      ws = new WebSocket('wss://stream.binance.us:9443/ws/btcusdt@trade');

      ws.onopen = handleOpen;
      ws.onmessage = handleMessage;
      ws.onerror = handleError;
      ws.onclose = handleClose;

    } catch (error) {
      console.error('[LiveFeed] Connection error:', error);
      scheduleReconnect();
    }
  }

  function handleOpen() {
    console.log('[LiveFeed] Connected to Binance WebSocket');
    isConnected = true;
    reconnectAttempts = 0;
    notifyStatusChange('connected');
  }

  function handleMessage(event) {
    try {
      const data = JSON.parse(event.data);

      if (data.e === 'trade') {
        const price = parseFloat(data.p);
        const volume = parseFloat(data.q);
        const time = data.T;
        const isBuyerMaker = data.m;

        currentPrice = price;
        lastUpdate = time;

        // Notify price subscribers
        notifyPriceSubscribers({
          price,
          volume,
          time,
          side: isBuyerMaker ? 'sell' : 'buy'
        });

        // Check open positions for stop/take-profit
        checkOpenPositions(price);
      }
    } catch (error) {
      console.error('[LiveFeed] Message parse error:', error);
    }
  }

  function handleError(error) {
    console.error('[LiveFeed] WebSocket error:', error);
    notifyStatusChange('error');
  }

  function handleClose(event) {
    console.log('[LiveFeed] WebSocket closed:', event.code, event.reason);
    isConnected = false;
    notifyStatusChange('disconnected');

    if (event.code !== 1000) { // Not a clean close
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[LiveFeed] Max reconnect attempts reached');
      notifyStatusChange('failed');
      return;
    }

    reconnectAttempts++;
    const delay = RECONNECT_DELAY * reconnectAttempts;
    console.log(`[LiveFeed] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);

    setTimeout(() => {
      connect();
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  function disconnect() {
    if (ws) {
      ws.close(1000, 'User disconnected');
      ws = null;
    }
    isConnected = false;
  }

  // ==================== SUBSCRIPTION SYSTEM ====================

  /**
   * Subscribe to price updates
   * @param {Function} callback - Called with { price, volume, time, side }
   * @returns {Function} Unsubscribe function
   */
  function subscribeToPrices(callback) {
    priceSubscribers.push(callback);

    // Immediately call with current price if available
    if (currentPrice !== null) {
      callback({
        price: currentPrice,
        volume: 0,
        time: lastUpdate,
        side: null
      });
    }

    return () => {
      const index = priceSubscribers.indexOf(callback);
      if (index > -1) priceSubscribers.splice(index, 1);
    };
  }

  /**
   * Subscribe to trade executions (auto SL/TP hits)
   * @param {Function} callback - Called with trade execution details
   * @returns {Function} Unsubscribe function
   */
  function subscribeToTrades(callback) {
    tradeSubscribers.push(callback);
    return () => {
      const index = tradeSubscribers.indexOf(callback);
      if (index > -1) tradeSubscribers.splice(index, 1);
    };
  }

  function notifyPriceSubscribers(data) {
    priceSubscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[LiveFeed] Subscriber error:', error);
      }
    });
  }

  function notifyTradeSubscribers(data) {
    tradeSubscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[LiveFeed] Trade subscriber error:', error);
      }
    });
  }

  let statusSubscribers = [];
  function notifyStatusChange(status) {
    statusSubscribers.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[LiveFeed] Status subscriber error:', error);
      }
    });
  }

  function subscribeToStatus(callback) {
    statusSubscribers.push(callback);
    callback(isConnected ? 'connected' : 'disconnected');
    return () => {
      const index = statusSubscribers.indexOf(callback);
      if (index > -1) statusSubscribers.splice(index, 1);
    };
  }

  // ==================== POSITION TRACKING ====================

  /**
   * Add an open position to track
   * @param {Object} position
   */
  function trackPosition(position) {
    const tracked = {
      id: position.id || Date.now().toString(),
      entryPrice: position.entryPrice,
      direction: position.direction, // 'long' or 'short'
      size: position.size,
      stopLoss: position.stopLoss || null,
      takeProfit: position.takeProfit || null,
      trailingStop: position.trailingStop || null,
      trailingActivation: position.trailingActivation || 0.01, // 1% default
      highestPrice: position.entryPrice,
      lowestPrice: position.entryPrice,
      openTime: Date.now(),
      status: 'open'
    };

    openPositions.push(tracked);
    console.log('[LiveFeed] Tracking position:', tracked.id);

    return tracked.id;
  }

  /**
   * Close a tracked position
   * @param {string} positionId
   */
  function closePosition(positionId) {
    const index = openPositions.findIndex(p => p.id === positionId);
    if (index > -1) {
      openPositions.splice(index, 1);
      console.log('[LiveFeed] Position closed:', positionId);
    }
  }

  /**
   * Get all open positions
   * @returns {Array}
   */
  function getOpenPositions() {
    return [...openPositions];
  }

  /**
   * Check if any positions should be closed
   * @param {number} price - Current price
   */
  function checkOpenPositions(price) {
    openPositions.forEach(position => {
      if (position.status !== 'open') return;

      // Update high/low tracking
      if (price > position.highestPrice) position.highestPrice = price;
      if (price < position.lowestPrice) position.lowestPrice = price;

      // Calculate current P&L
      const pnlPercent = position.direction === 'long'
        ? (price - position.entryPrice) / position.entryPrice
        : (position.entryPrice - price) / position.entryPrice;

      // Check stop loss
      if (position.stopLoss) {
        const slPrice = position.direction === 'long'
          ? position.entryPrice * (1 - position.stopLoss)
          : position.entryPrice * (1 + position.stopLoss);

        if ((position.direction === 'long' && price <= slPrice) ||
            (position.direction === 'short' && price >= slPrice)) {
          executeClose(position, price, 'Stop Loss');
          return;
        }
      }

      // Check take profit
      if (position.takeProfit) {
        const tpPrice = position.direction === 'long'
          ? position.entryPrice * (1 + position.takeProfit)
          : position.entryPrice * (1 - position.takeProfit);

        if ((position.direction === 'long' && price >= tpPrice) ||
            (position.direction === 'short' && price <= tpPrice)) {
          executeClose(position, price, 'Take Profit');
          return;
        }
      }

      // Check trailing stop
      if (position.trailingStop) {
        const maxPnl = position.direction === 'long'
          ? (position.highestPrice - position.entryPrice) / position.entryPrice
          : (position.entryPrice - position.lowestPrice) / position.entryPrice;

        // Only activate after reaching activation threshold
        if (maxPnl >= position.trailingActivation) {
          const trailPrice = position.direction === 'long'
            ? position.highestPrice * (1 - position.trailingStop)
            : position.lowestPrice * (1 + position.trailingStop);

          // Only trigger if trail locks in profit
          const trailLockProfit = position.direction === 'long'
            ? trailPrice > position.entryPrice
            : trailPrice < position.entryPrice;

          if (trailLockProfit) {
            if ((position.direction === 'long' && price <= trailPrice) ||
                (position.direction === 'short' && price >= trailPrice)) {
              executeClose(position, price, 'Trailing Stop');
              return;
            }
          }
        }
      }
    });
  }

  /**
   * Execute position close and notify subscribers
   * @param {Object} position
   * @param {number} exitPrice
   * @param {string} reason
   */
  function executeClose(position, exitPrice, reason) {
    position.status = 'closed';
    position.exitPrice = exitPrice;
    position.exitTime = Date.now();
    position.exitReason = reason;

    // Calculate P&L
    const pnlPercent = position.direction === 'long'
      ? (exitPrice - position.entryPrice) / position.entryPrice
      : (position.entryPrice - exitPrice) / position.entryPrice;
    const pnlAmount = position.size * pnlPercent;

    position.pnlPercent = pnlPercent;
    position.pnlAmount = pnlAmount;

    console.log(`[LiveFeed] Position ${position.id} closed: ${reason} @ $${exitPrice.toFixed(2)} (${(pnlPercent * 100).toFixed(2)}%)`);

    // Notify trade subscribers
    notifyTradeSubscribers({
      type: 'close',
      position,
      exitPrice,
      reason,
      pnlPercent,
      pnlAmount
    });

    // Remove from open positions
    const index = openPositions.findIndex(p => p.id === position.id);
    if (index > -1) openPositions.splice(index, 1);
  }

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Get current price
   * @returns {number|null}
   */
  function getCurrentPrice() {
    return currentPrice;
  }

  /**
   * Get connection status
   * @returns {boolean}
   */
  function getIsConnected() {
    return isConnected;
  }

  /**
   * Get last update timestamp
   * @returns {number|null}
   */
  function getLastUpdate() {
    return lastUpdate;
  }

  // ==================== PUBLIC API ====================

  return {
    // Connection
    connect,
    disconnect,
    isConnected: getIsConnected,

    // Subscriptions
    subscribeToPrices,
    subscribeToTrades,
    subscribeToStatus,

    // Position tracking
    trackPosition,
    closePosition,
    getOpenPositions,

    // Utility
    getCurrentPrice,
    getLastUpdate
  };
})();

// Export for global use
if (typeof window !== 'undefined') {
  window.BTCSAILiveFeed = BTCSAILiveFeed;
}
