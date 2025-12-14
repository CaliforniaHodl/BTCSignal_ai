// WebSocket Manager for Real-Time BTC Price Updates
// Enhanced IIFE module with auto-reconnect, heartbeat, and fallback to REST polling

(function(global) {
  'use strict';

  // Connection states
  const ConnectionState = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    FAILED: 'failed'
  };

  const WSManager = (function() {
    // Private state
    let ws = null;
    let connectionState = ConnectionState.DISCONNECTED;
    let subscribers = new Map();
    let reconnectAttempts = 0;
    let reconnectTimer = null;
    let heartbeatTimer = null;
    let restFallbackTimer = null;
    let lastPriceData = null;
    let nextSubscriberId = 0;

    // Configuration
    const config = {
      wsUrl: 'wss://stream.binance.com:9443/ws/btcusdt@ticker',
      maxReconnectAttempts: 10,
      baseReconnectDelay: 1000, // Start with 1 second
      maxReconnectDelay: 30000, // Max 30 seconds
      heartbeatInterval: 30000, // 30 seconds
      restFallbackInterval: 5000, // Poll every 5 seconds when WS fails
      restApiUrl: 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'
    };

    // Calculate exponential backoff delay
    function getReconnectDelay() {
      const exponentialDelay = Math.min(
        config.baseReconnectDelay * Math.pow(2, reconnectAttempts),
        config.maxReconnectDelay
      );
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000;
      return exponentialDelay + jitter;
    }

    // Clear all timers
    function clearTimers() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (restFallbackTimer) {
        clearInterval(restFallbackTimer);
        restFallbackTimer = null;
      }
    }

    // Start heartbeat/ping-pong
    function startHeartbeat() {
      stopHeartbeat();
      heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            // Binance WebSocket automatically handles ping/pong
            // We just verify connection is alive
            if (Date.now() - (lastPriceData?.timestamp || 0) > config.heartbeatInterval * 2) {
              console.warn('[WSManager] No data received in 60s, reconnecting...');
              reconnect();
            }
          } catch (error) {
            console.error('[WSManager] Heartbeat check failed:', error);
            reconnect();
          }
        }
      }, config.heartbeatInterval);
    }

    // Stop heartbeat
    function stopHeartbeat() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    }

    // REST API fallback
    async function fetchPriceFromRest() {
      try {
        const response = await fetch(config.restApiUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();

        // Normalize to match WebSocket format
        const normalizedData = {
          symbol: data.symbol,
          price: parseFloat(data.lastPrice),
          priceChange: parseFloat(data.priceChange),
          priceChangePercent: parseFloat(data.priceChangePercent),
          high24h: parseFloat(data.highPrice),
          low24h: parseFloat(data.lowPrice),
          volume24h: parseFloat(data.volume),
          quoteVolume24h: parseFloat(data.quoteVolume),
          timestamp: Date.now(),
          source: 'rest'
        };

        lastPriceData = normalizedData;
        notifySubscribers(normalizedData);

      } catch (error) {
        console.error('[WSManager] REST fallback failed:', error);
      }
    }

    // Start REST polling fallback
    function startRestFallback() {
      stopRestFallback();
      console.log('[WSManager] Starting REST API fallback polling');

      // Fetch immediately
      fetchPriceFromRest();

      // Then poll on interval
      restFallbackTimer = setInterval(fetchPriceFromRest, config.restFallbackInterval);
    }

    // Stop REST polling
    function stopRestFallback() {
      if (restFallbackTimer) {
        clearInterval(restFallbackTimer);
        restFallbackTimer = null;
      }
    }

    // Update connection state
    function setConnectionState(newState) {
      if (connectionState !== newState) {
        const oldState = connectionState;
        connectionState = newState;
        console.log(`[WSManager] State: ${oldState} -> ${newState}`);

        // Notify state change to subscribers with special 'state' event
        notifySubscribers({
          type: 'state',
          oldState,
          newState,
          timestamp: Date.now()
        });
      }
    }

    // Notify all subscribers
    function notifySubscribers(data) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[WSManager] Subscriber callback error:', error);
        }
      });
    }

    // Normalize Binance WebSocket ticker data
    function normalizeTickerData(data) {
      return {
        symbol: data.s,
        price: parseFloat(data.c),
        priceChange: parseFloat(data.p),
        priceChangePercent: parseFloat(data.P),
        high24h: parseFloat(data.h),
        low24h: parseFloat(data.l),
        volume24h: parseFloat(data.v),
        quoteVolume24h: parseFloat(data.q),
        openPrice: parseFloat(data.o),
        numberOfTrades: parseInt(data.n),
        timestamp: data.E,
        source: 'websocket'
      };
    }

    // Handle WebSocket message
    function handleMessage(event) {
      try {
        const data = JSON.parse(event.data);

        // Binance 24hr ticker stream
        if (data.e === '24hrTicker') {
          const normalizedData = normalizeTickerData(data);
          lastPriceData = normalizedData;
          notifySubscribers(normalizedData);
        }
      } catch (error) {
        console.error('[WSManager] Message parsing error:', error);
      }
    }

    // Handle WebSocket open
    function handleOpen() {
      console.log('[WSManager] WebSocket connected');
      setConnectionState(ConnectionState.CONNECTED);
      reconnectAttempts = 0;

      // Stop REST fallback if running
      stopRestFallback();

      // Start heartbeat
      startHeartbeat();
    }

    // Handle WebSocket error
    function handleError(error) {
      console.error('[WSManager] WebSocket error:', error);
    }

    // Handle WebSocket close
    function handleClose(event) {
      console.log(`[WSManager] WebSocket closed: code=${event.code}, reason=${event.reason || 'none'}`);

      stopHeartbeat();

      // Clean close codes that shouldn't reconnect
      if (event.code === 1000 || event.code === 1001) {
        setConnectionState(ConnectionState.DISCONNECTED);
        return;
      }

      // Attempt reconnection
      reconnect();
    }

    // Reconnect logic
    function reconnect() {
      // Close existing connection if any
      if (ws) {
        try {
          ws.close();
        } catch (e) {
          // Ignore close errors
        }
        ws = null;
      }

      // Check if we've exceeded max attempts
      if (reconnectAttempts >= config.maxReconnectAttempts) {
        console.error(`[WSManager] Max reconnect attempts (${config.maxReconnectAttempts}) reached`);
        setConnectionState(ConnectionState.FAILED);

        // Start REST fallback
        startRestFallback();
        return;
      }

      setConnectionState(ConnectionState.RECONNECTING);

      const delay = getReconnectDelay();
      console.log(`[WSManager] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts + 1}/${config.maxReconnectAttempts})`);

      reconnectTimer = setTimeout(() => {
        reconnectAttempts++;
        connect();
      }, delay);
    }

    // Establish WebSocket connection
    function connect() {
      // Clean up existing connection
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          ws.close();
        } catch (e) {
          // Ignore
        }
      }

      setConnectionState(ConnectionState.CONNECTING);

      try {
        ws = new WebSocket(config.wsUrl);

        ws.onopen = handleOpen;
        ws.onmessage = handleMessage;
        ws.onerror = handleError;
        ws.onclose = handleClose;

      } catch (error) {
        console.error('[WSManager] Failed to create WebSocket:', error);
        reconnect();
      }

      return ws;
    }

    // Public API
    return {
      /**
       * Connect to Binance WebSocket for BTC/USDT real-time price
       * @returns {boolean} Success status
       */
      connect() {
        if (connectionState === ConnectionState.CONNECTED ||
            connectionState === ConnectionState.CONNECTING) {
          console.warn('[WSManager] Already connected or connecting');
          return false;
        }

        reconnectAttempts = 0;
        connect();
        return true;
      },

      /**
       * Disconnect from WebSocket and stop all polling
       */
      disconnect() {
        clearTimers();
        stopRestFallback();
        stopHeartbeat();

        if (ws) {
          try {
            ws.close(1000, 'Client disconnect');
          } catch (error) {
            console.error('[WSManager] Error during disconnect:', error);
          }
          ws = null;
        }

        setConnectionState(ConnectionState.DISCONNECTED);
        console.log('[WSManager] Disconnected');
      },

      /**
       * Subscribe to price updates
       * @param {Function} callback - Called with price data
       * @returns {number} Subscriber ID for later unsubscribe
       */
      subscribe(callback) {
        if (typeof callback !== 'function') {
          throw new Error('Callback must be a function');
        }

        const id = nextSubscriberId++;
        subscribers.set(id, callback);

        console.log(`[WSManager] Subscriber ${id} added (total: ${subscribers.size})`);

        // Send last known data immediately if available
        if (lastPriceData) {
          try {
            callback(lastPriceData);
          } catch (error) {
            console.error('[WSManager] Error in immediate callback:', error);
          }
        }

        return id;
      },

      /**
       * Unsubscribe from price updates
       * @param {number} subscriberId - ID returned from subscribe()
       * @returns {boolean} Success status
       */
      unsubscribe(subscriberId) {
        const deleted = subscribers.delete(subscriberId);
        if (deleted) {
          console.log(`[WSManager] Subscriber ${subscriberId} removed (remaining: ${subscribers.size})`);
        }
        return deleted;
      },

      /**
       * Get current connection state
       * @returns {string} One of: disconnected, connecting, connected, reconnecting, failed
       */
      getConnectionState() {
        return connectionState;
      },

      /**
       * Check if currently connected via WebSocket
       * @returns {boolean}
       */
      isConnected() {
        return connectionState === ConnectionState.CONNECTED;
      },

      /**
       * Get last received price data
       * @returns {Object|null} Last price data or null if none
       */
      getLastPrice() {
        return lastPriceData ? { ...lastPriceData } : null;
      },

      /**
       * Get subscriber count
       * @returns {number}
       */
      getSubscriberCount() {
        return subscribers.size;
      },

      /**
       * Force reconnect
       */
      forceReconnect() {
        console.log('[WSManager] Force reconnect requested');
        reconnectAttempts = 0;
        reconnect();
      },

      /**
       * Get connection states enum
       * @returns {Object}
       */
      ConnectionState
    };
  })();

  // Expose to window
  global.WSManager = WSManager;

  // Auto-connect on page load if not in admin or special pages
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      // Don't auto-connect on admin pages or embed pages
      const isAdminPage = window.location.pathname.includes('/admin');
      const isEmbedPage = window.location.pathname.includes('/embed');

      if (!isAdminPage && !isEmbedPage) {
        console.log('[WSManager] Auto-connecting...');
        WSManager.connect();
      }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      WSManager.disconnect();
    });
  }

})(typeof window !== 'undefined' ? window : this);
