// WebSocket Manager for Real-Time Exchange Data
// Handles connections to Binance and Bybit WebSocket streams

(function(global) {
  'use strict';

  const WebSocketManager = {
    connections: {},
    callbacks: {},
    reconnectAttempts: {},
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,

    // WebSocket endpoints
    endpoints: {
      binance: 'wss://fstream.binance.com/ws',
      bybit: 'wss://stream.bybit.com/v5/public/linear'
    },

    // Subscribe to Binance streams
    subscribeBinance(streams, callback) {
      const wsUrl = `${this.endpoints.binance}/${streams.join('/')}`;
      return this.connect('binance', wsUrl, callback, (ws) => {
        // Binance auto-subscribes via URL, no additional message needed
      });
    },

    // Subscribe to Bybit streams
    subscribeBybit(topics, callback) {
      return this.connect('bybit', this.endpoints.bybit, callback, (ws) => {
        // Bybit requires subscription message
        const subscribeMsg = {
          op: 'subscribe',
          args: topics
        };
        ws.send(JSON.stringify(subscribeMsg));
      });
    },

    // Generic connect function
    connect(exchange, url, callback, onOpen) {
      // Close existing connection if any
      if (this.connections[exchange]) {
        this.connections[exchange].close();
      }

      const ws = new WebSocket(url);
      this.connections[exchange] = ws;
      this.callbacks[exchange] = callback;
      this.reconnectAttempts[exchange] = 0;

      ws.onopen = () => {
        console.log(`[${exchange}] WebSocket connected`);
        this.reconnectAttempts[exchange] = 0;
        if (onOpen) onOpen(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(exchange, data);
        } catch (e) {
          console.error(`[${exchange}] Parse error:`, e);
        }
      };

      ws.onerror = (error) => {
        console.error(`[${exchange}] WebSocket error:`, error);
      };

      ws.onclose = (event) => {
        console.log(`[${exchange}] WebSocket closed:`, event.code, event.reason);
        this.handleReconnect(exchange, url, callback, onOpen);
      };

      return ws;
    },

    // Handle incoming messages
    handleMessage(exchange, data) {
      const callback = this.callbacks[exchange];
      if (!callback) return;

      // Normalize data format
      let normalizedData;

      if (exchange === 'binance') {
        normalizedData = this.normalizeBinanceData(data);
      } else if (exchange === 'bybit') {
        normalizedData = this.normalizeBybitData(data);
      } else {
        normalizedData = data;
      }

      if (normalizedData) {
        callback(normalizedData);
      }
    },

    // Normalize Binance WebSocket data
    normalizeBinanceData(data) {
      // Mark price stream: btcusdt@markPrice
      if (data.e === 'markPriceUpdate') {
        return {
          type: 'price',
          exchange: 'binance',
          symbol: data.s,
          price: parseFloat(data.p),
          indexPrice: parseFloat(data.i),
          fundingRate: parseFloat(data.r),
          nextFundingTime: data.T,
          timestamp: data.E
        };
      }

      // Aggregate trade stream: btcusdt@aggTrade
      if (data.e === 'aggTrade') {
        return {
          type: 'trade',
          exchange: 'binance',
          symbol: data.s,
          price: parseFloat(data.p),
          quantity: parseFloat(data.q),
          isBuyerMaker: data.m,
          timestamp: data.T
        };
      }

      // Liquidation stream: btcusdt@forceOrder
      if (data.e === 'forceOrder') {
        return {
          type: 'liquidation',
          exchange: 'binance',
          symbol: data.o.s,
          side: data.o.S, // SELL = long liquidated, BUY = short liquidated
          orderType: data.o.o,
          price: parseFloat(data.o.p),
          quantity: parseFloat(data.o.q),
          avgPrice: parseFloat(data.o.ap),
          status: data.o.X,
          timestamp: data.o.T
        };
      }

      // Depth update: btcusdt@depth
      if (data.e === 'depthUpdate') {
        return {
          type: 'orderbook',
          exchange: 'binance',
          symbol: data.s,
          bids: data.b.map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
          asks: data.a.map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
          timestamp: data.E
        };
      }

      // 24hr ticker: btcusdt@ticker
      if (data.e === '24hrTicker') {
        return {
          type: 'ticker',
          exchange: 'binance',
          symbol: data.s,
          price: parseFloat(data.c),
          priceChange: parseFloat(data.p),
          priceChangePercent: parseFloat(data.P),
          high24h: parseFloat(data.h),
          low24h: parseFloat(data.l),
          volume24h: parseFloat(data.q),
          timestamp: data.E
        };
      }

      return null;
    },

    // Normalize Bybit WebSocket data
    normalizeBybitData(data) {
      if (!data.topic) return null;

      const topic = data.topic;

      // Ticker: tickers.BTCUSDT
      if (topic.startsWith('tickers.')) {
        const d = data.data;
        return {
          type: 'ticker',
          exchange: 'bybit',
          symbol: d.symbol,
          price: parseFloat(d.lastPrice),
          priceChange: parseFloat(d.price24hPcnt) * parseFloat(d.lastPrice),
          priceChangePercent: parseFloat(d.price24hPcnt) * 100,
          high24h: parseFloat(d.highPrice24h),
          low24h: parseFloat(d.lowPrice24h),
          volume24h: parseFloat(d.turnover24h),
          fundingRate: parseFloat(d.fundingRate || 0),
          nextFundingTime: d.nextFundingTime,
          timestamp: data.ts
        };
      }

      // Trade: publicTrade.BTCUSDT
      if (topic.startsWith('publicTrade.')) {
        const trades = data.data.map(d => ({
          type: 'trade',
          exchange: 'bybit',
          symbol: d.s,
          price: parseFloat(d.p),
          quantity: parseFloat(d.v),
          side: d.S,
          timestamp: d.T
        }));
        return trades.length === 1 ? trades[0] : { type: 'trades', exchange: 'bybit', trades };
      }

      // Orderbook: orderbook.50.BTCUSDT
      if (topic.startsWith('orderbook.')) {
        const d = data.data;
        return {
          type: 'orderbook',
          exchange: 'bybit',
          symbol: d.s,
          bids: d.b.map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
          asks: d.a.map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
          timestamp: data.ts
        };
      }

      // Liquidation: liquidation.BTCUSDT
      if (topic.startsWith('liquidation.')) {
        const d = data.data;
        return {
          type: 'liquidation',
          exchange: 'bybit',
          symbol: d.symbol,
          side: d.side,
          price: parseFloat(d.price),
          quantity: parseFloat(d.size),
          timestamp: d.updatedTime
        };
      }

      return null;
    },

    // Handle reconnection
    handleReconnect(exchange, url, callback, onOpen) {
      if (this.reconnectAttempts[exchange] >= this.maxReconnectAttempts) {
        console.error(`[${exchange}] Max reconnect attempts reached`);
        return;
      }

      this.reconnectAttempts[exchange]++;
      const delay = this.reconnectDelay * this.reconnectAttempts[exchange];

      console.log(`[${exchange}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts[exchange]})`);

      setTimeout(() => {
        this.connect(exchange, url, callback, onOpen);
      }, delay);
    },

    // Disconnect from an exchange
    disconnect(exchange) {
      if (this.connections[exchange]) {
        this.connections[exchange].close();
        delete this.connections[exchange];
        delete this.callbacks[exchange];
      }
    },

    // Disconnect all
    disconnectAll() {
      Object.keys(this.connections).forEach(exchange => {
        this.disconnect(exchange);
      });
    },

    // Check connection status
    isConnected(exchange) {
      return this.connections[exchange] && this.connections[exchange].readyState === WebSocket.OPEN;
    },

    // Subscribe to BTC liquidations from both exchanges
    subscribeToLiquidations(callback) {
      const aggregatedCallback = (data) => {
        callback(data);
      };

      // Binance: subscribe to forceOrder stream
      this.subscribeBinance(['btcusdt@forceOrder'], aggregatedCallback);

      // Bybit: subscribe to liquidation topic
      this.subscribeBybit(['liquidation.BTCUSDT'], aggregatedCallback);
    },

    // Subscribe to real-time price updates
    subscribeToPriceUpdates(callback) {
      // Binance mark price (includes funding rate)
      this.subscribeBinance(['btcusdt@markPrice@1s'], callback);

      // Bybit ticker
      this.subscribeBybit(['tickers.BTCUSDT'], callback);
    },

    // Subscribe to order book updates (for liquidation level estimation)
    subscribeToOrderBook(callback, depth = 50) {
      // Binance depth
      this.subscribeBinance([`btcusdt@depth${depth}@100ms`], callback);

      // Bybit orderbook
      this.subscribeBybit([`orderbook.${depth}.BTCUSDT`], callback);
    },

    // Combined subscription for liquidation map
    subscribeForLiquidationMap(callbacks = {}) {
      const { onPrice, onLiquidation, onOrderBook } = callbacks;

      // Price + funding stream
      this.subscribeBinance([
        'btcusdt@markPrice@1s',
        'btcusdt@forceOrder',
        'btcusdt@ticker'
      ], (data) => {
        if (data.type === 'price' || data.type === 'ticker') {
          onPrice && onPrice(data);
        } else if (data.type === 'liquidation') {
          onLiquidation && onLiquidation(data);
        }
      });

      this.subscribeBybit([
        'tickers.BTCUSDT',
        'liquidation.BTCUSDT'
      ], (data) => {
        if (data.type === 'ticker') {
          onPrice && onPrice(data);
        } else if (data.type === 'liquidation') {
          onLiquidation && onLiquidation(data);
        }
      });
    }
  };

  // Export to global scope
  global.WebSocketManager = WebSocketManager;

})(typeof window !== 'undefined' ? window : this);
