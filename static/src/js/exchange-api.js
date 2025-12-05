// Exchange API Service
// Handles connections to Binance US (spot) and Bybit (derivatives) for market data
// Uses cached data from market-snapshot.json when available

(function(global) {
  'use strict';

  const ExchangeAPI = {
    // API endpoints - Using Binance US for spot data
    endpoints: {
      binance: {
        rest: 'https://api.binance.us',
        ws: 'wss://stream.binance.us:9443/ws',
        ticker: '/api/v3/ticker/24hr',
        orderBook: '/api/v3/depth'
      },
      bybit: {
        rest: 'https://api.bybit.com',
        ws: 'wss://stream.bybit.com/v5/public/linear',
        ticker: '/v5/market/tickers',
        orderBook: '/v5/market/orderbook',
        openInterest: '/v5/market/open-interest',
        fundingRate: '/v5/market/funding/history'
      }
    },

    // Cache for rate limiting
    cache: {
      data: {},
      ttl: 30000, // 30 second cache to reduce API calls
      marketSnapshot: null,
      marketSnapshotTimestamp: 0
    },

    // Load cached market snapshot
    async loadMarketSnapshot() {
      const now = Date.now();
      // Refresh snapshot cache every 5 minutes
      if (this.cache.marketSnapshot && (now - this.cache.marketSnapshotTimestamp) < 300000) {
        return this.cache.marketSnapshot;
      }
      try {
        const res = await fetch('/data/market-snapshot.json');
        if (res.ok) {
          this.cache.marketSnapshot = await res.json();
          this.cache.marketSnapshotTimestamp = now;
          return this.cache.marketSnapshot;
        }
      } catch (e) {
        console.error('Failed to load market snapshot:', e);
      }
      return null;
    },

    // Get cached or fetch fresh
    async getCached(key, fetcher) {
      const now = Date.now();
      if (this.cache.data[key] && (now - this.cache.data[key].timestamp) < this.cache.ttl) {
        return this.cache.data[key].value;
      }
      const value = await fetcher();
      this.cache.data[key] = { value, timestamp: now };
      return value;
    },

    // Binance US API (spot only - no futures in US)
    binance: {
      async getTicker(symbol = 'BTCUSDT') {
        try {
          const res = await fetch(`https://api.binance.us/api/v3/ticker/24hr?symbol=${symbol}`);
          const data = await res.json();
          return {
            exchange: 'binance',
            symbol: data.symbol,
            price: parseFloat(data.lastPrice),
            change24h: parseFloat(data.priceChangePercent),
            high24h: parseFloat(data.highPrice),
            low24h: parseFloat(data.lowPrice),
            volume24h: parseFloat(data.quoteVolume)
          };
        } catch (e) {
          console.error('Binance US ticker error:', e);
          return null;
        }
      },

      async getOrderBook(symbol = 'BTCUSDT', limit = 100) {
        try {
          const res = await fetch(`https://api.binance.us/api/v3/depth?symbol=${symbol}&limit=${limit}`);
          const data = await res.json();
          return {
            exchange: 'binance',
            symbol,
            bids: data.bids.map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
            asks: data.asks.map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
            timestamp: Date.now()
          };
        } catch (e) {
          console.error('Binance US orderbook error:', e);
          return null;
        }
      }
    },

    // Bybit API
    bybit: {
      async getTicker(symbol = 'BTCUSDT') {
        try {
          const res = await fetch(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${symbol}`);
          const data = await res.json();
          if (data.retCode === 0 && data.result.list.length > 0) {
            const ticker = data.result.list[0];
            return {
              exchange: 'bybit',
              symbol: ticker.symbol,
              price: parseFloat(ticker.lastPrice),
              change24h: parseFloat(ticker.price24hPcnt) * 100,
              high24h: parseFloat(ticker.highPrice24h),
              low24h: parseFloat(ticker.lowPrice24h),
              volume24h: parseFloat(ticker.turnover24h)
            };
          }
          return null;
        } catch (e) {
          console.error('Bybit ticker error:', e);
          return null;
        }
      },

      async getOrderBook(symbol = 'BTCUSDT', limit = 100) {
        try {
          const res = await fetch(`https://api.bybit.com/v5/market/orderbook?category=linear&symbol=${symbol}&limit=${limit}`);
          const data = await res.json();
          if (data.retCode === 0) {
            return {
              exchange: 'bybit',
              symbol,
              bids: data.result.b.map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
              asks: data.result.a.map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) })),
              timestamp: data.result.ts
            };
          }
          return null;
        } catch (e) {
          console.error('Bybit orderbook error:', e);
          return null;
        }
      },

      async getOpenInterest(symbol = 'BTCUSDT') {
        try {
          const res = await fetch(`https://api.bybit.com/v5/market/open-interest?category=linear&symbol=${symbol}&intervalTime=1h&limit=1`);
          const data = await res.json();
          if (data.retCode === 0 && data.result.list.length > 0) {
            return {
              exchange: 'bybit',
              symbol,
              openInterest: parseFloat(data.result.list[0].openInterest),
              timestamp: data.result.list[0].timestamp
            };
          }
          return null;
        } catch (e) {
          console.error('Bybit open interest error:', e);
          return null;
        }
      },

      async getFundingRate(symbol = 'BTCUSDT') {
        try {
          const res = await fetch(`https://api.bybit.com/v5/market/funding/history?category=linear&symbol=${symbol}&limit=1`);
          const data = await res.json();
          if (data.retCode === 0 && data.result.list.length > 0) {
            return {
              exchange: 'bybit',
              symbol,
              fundingRate: parseFloat(data.result.list[0].fundingRate),
              fundingTime: data.result.list[0].fundingRateTimestamp,
              timestamp: Date.now()
            };
          }
          return null;
        } catch (e) {
          console.error('Bybit funding rate error:', e);
          return null;
        }
      }
    },

    // Aggregate data from multiple exchanges
    // Prioritizes cached market-snapshot.json, falls back to live API calls
    async getAggregatedData(symbol = 'BTCUSDT') {
      // First try to get data from cached market snapshot
      const snapshot = await this.loadMarketSnapshot();

      if (snapshot && snapshot.btc && snapshot.btc.price > 0) {
        // Use cached data for OI and funding (derivatives data)
        const oi = snapshot.openInterest || { btc: 0, usd: 0 };
        const funding = snapshot.funding || { rate: 0, ratePercent: 0 };

        // Get fresh price from Binance US (lightweight call)
        let currentPrice = snapshot.btc.price;
        let change24h = snapshot.btc.priceChange24h;

        try {
          const binanceTicker = await this.binance.getTicker(symbol);
          if (binanceTicker && binanceTicker.price > 0) {
            currentPrice = binanceTicker.price;
            change24h = binanceTicker.change24h;
          }
        } catch (e) {
          console.log('Using cached price from snapshot');
        }

        return {
          price: currentPrice,
          exchanges: {
            binance: {
              exchange: 'binance',
              symbol: symbol,
              price: currentPrice,
              change24h: change24h,
              high24h: snapshot.btc.high24h,
              low24h: snapshot.btc.low24h,
              volume24h: snapshot.btc.volume24h
            },
            bybit: null // Bybit data comes from snapshot OI/funding
          },
          openInterest: {
            total: oi.btc,
            usd: oi.usd,
            binance: oi.binance?.btc || 0,
            bybit: oi.bybit?.btc || oi.btc // Use total if per-exchange not available
          },
          funding: {
            average: funding.rate,
            ratePercent: funding.ratePercent,
            binance: funding.binance || funding.rate,
            bybit: funding.bybit || funding.rate
          },
          longShortRatio: snapshot.longShortRatio || { ratio: 1, longPercent: 50, shortPercent: 50 },
          liquidation: snapshot.liquidation || null,
          timestamp: Date.now(),
          fromCache: true
        };
      }

      // Fallback: fetch live from APIs
      console.log('No cached data, fetching live...');
      const [binanceTicker, bybitTicker, bybitOI, bybitFunding] = await Promise.all([
        this.binance.getTicker(symbol),
        this.bybit.getTicker(symbol),
        this.bybit.getOpenInterest(symbol),
        this.bybit.getFundingRate(symbol)
      ]);

      // Calculate weighted average price
      const prices = [binanceTicker, bybitTicker].filter(t => t !== null);
      const avgPrice = prices.length > 0 ? prices.reduce((sum, t) => sum + t.price, 0) / prices.length : 0;

      return {
        price: avgPrice,
        exchanges: {
          binance: binanceTicker,
          bybit: bybitTicker
        },
        openInterest: {
          total: bybitOI?.openInterest || 0,
          usd: (bybitOI?.openInterest || 0) * avgPrice,
          binance: 0,
          bybit: bybitOI?.openInterest || 0
        },
        funding: {
          average: bybitFunding?.fundingRate || 0,
          ratePercent: (bybitFunding?.fundingRate || 0) * 100,
          binance: 0,
          bybit: bybitFunding?.fundingRate || 0
        },
        timestamp: Date.now(),
        fromCache: false
      };
    },

    // Calculate estimated liquidation levels from order book and OI
    calculateLiquidationLevels(price, orderBook, openInterest, fundingRate) {
      const leverageLevels = [10, 25, 50, 100];
      const liquidations = [];

      leverageLevels.forEach(leverage => {
        // Liquidation price for longs: entry * (1 - 1/leverage + maintenance margin)
        // Simplified: entry * (1 - 0.9/leverage) for most exchanges
        const longLiqMultiplier = 1 - (0.9 / leverage);
        const shortLiqMultiplier = 1 + (0.9 / leverage);

        // Calculate liquidation prices
        const longLiqPrice = price * longLiqMultiplier;
        const shortLiqPrice = price * shortLiqMultiplier;

        // Estimate value based on OI distribution (assumes even distribution)
        const leverageShare = leverage <= 10 ? 0.4 : leverage <= 25 ? 0.3 : leverage <= 50 ? 0.2 : 0.1;
        const estimatedValue = openInterest * leverageShare * price;

        // Intensity based on leverage and funding rate
        // Positive funding = more longs, negative = more shorts
        const fundingBias = fundingRate > 0 ? 1.2 : 0.8;

        liquidations.push({
          price: longLiqPrice,
          type: 'long',
          leverage,
          intensity: Math.min(1, (leverageShare * 2) * (fundingRate > 0 ? fundingBias : 1)),
          estimatedValue: estimatedValue * (fundingRate > 0 ? fundingBias : 1)
        });

        liquidations.push({
          price: shortLiqPrice,
          type: 'short',
          leverage,
          intensity: Math.min(1, (leverageShare * 2) * (fundingRate < 0 ? fundingBias : 1)),
          estimatedValue: estimatedValue * (fundingRate < 0 ? fundingBias : 1)
        });
      });

      // Add order book depth analysis for additional liquidation clusters
      if (orderBook) {
        // Large bid walls could indicate long liquidation support
        const largeBids = orderBook.bids.filter(b => b.qty * b.price > 100000);
        largeBids.forEach(bid => {
          const existing = liquidations.find(l => Math.abs(l.price - bid.price) < price * 0.005);
          if (existing) {
            existing.intensity = Math.min(1, existing.intensity + 0.2);
            existing.estimatedValue += bid.qty * bid.price;
          }
        });

        // Large ask walls for short liquidation resistance
        const largeAsks = orderBook.asks.filter(a => a.qty * a.price > 100000);
        largeAsks.forEach(ask => {
          const existing = liquidations.find(l => Math.abs(l.price - ask.price) < price * 0.005);
          if (existing) {
            existing.intensity = Math.min(1, existing.intensity + 0.2);
            existing.estimatedValue += ask.qty * ask.price;
          }
        });
      }

      return liquidations.sort((a, b) => b.price - a.price);
    }
  };

  // Export to global scope
  global.ExchangeAPI = ExchangeAPI;

})(typeof window !== 'undefined' ? window : this);
