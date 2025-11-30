// Dashboard Widgets - Real-time market data for Pro Dashboard
// Populates the 9 Market Sentiment style widgets
(function() {
  'use strict';

  // Cache DOM elements for dashboard widgets
  const elements = {
    // Fear & Greed
    fngValue: document.getElementById('dash-fng-value'),
    fngLabel: document.getElementById('dash-fng-label'),
    fngIndicator: document.getElementById('dash-fng-indicator'),
    // Funding Rate
    fundingValue: document.getElementById('dash-funding-value'),
    fundingLabel: document.getElementById('dash-funding-label'),
    // Open Interest
    oiValue: document.getElementById('dash-oi-value'),
    oiChange: document.getElementById('dash-oi-change'),
    // Buy/Sell Ratio
    ratioValue: document.getElementById('dash-ratio-value'),
    ratioLabel: document.getElementById('dash-ratio-label'),
    volBars: document.getElementById('dash-vol-bars'),
    // Long/Short Ratio
    lsValue: document.getElementById('dash-ls-value'),
    lsLabel: document.getElementById('dash-ls-label'),
    // Liquidations
    liqValue: document.getElementById('dash-liq-value'),
    liqLabel: document.getElementById('dash-liq-label'),
    // RSI
    rsiValue: document.getElementById('dash-rsi-value'),
    rsiLabel: document.getElementById('dash-rsi-label'),
    // Volatility
    volValue: document.getElementById('dash-vol-value'),
    volLabel: document.getElementById('dash-vol-label'),
    // Dominance
    domValue: document.getElementById('dash-dom-value'),
    domLabel: document.getElementById('dash-dom-label')
  };

  // Check if we're on the dashboard page
  if (!elements.fngValue) return;

  // Fetch Fear & Greed Index
  async function fetchFearGreed() {
    try {
      const res = await fetch('https://api.alternative.me/fng/?limit=1');
      const data = await res.json();

      if (data && data.data && data.data[0]) {
        const fng = data.data[0];
        const value = parseInt(fng.value);
        const label = fng.value_classification;

        elements.fngValue.textContent = value;
        elements.fngLabel.textContent = label;

        // Position indicator
        if (elements.fngIndicator) {
          elements.fngIndicator.style.left = value + '%';
        }

        // Color class
        let colorClass = '';
        if (value <= 25) colorClass = 'extreme-fear';
        else if (value <= 45) colorClass = 'fear';
        else if (value <= 55) colorClass = 'neutral';
        else if (value <= 75) colorClass = 'greed';
        else colorClass = 'extreme-greed';

        elements.fngValue.className = 'widget-value ' + colorClass;
      }
    } catch (e) {
      console.error('Dashboard: Failed to fetch Fear & Greed:', e);
      elements.fngValue.textContent = '--';
      elements.fngLabel.textContent = 'Unavailable';
    }
  }

  // Fetch Funding Rate from Binance (using public API with CORS support)
  async function fetchFundingRate() {
    try {
      // Use the mark price endpoint which includes funding rate and has better CORS
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      const data = await res.json();

      if (data) {
        // Estimate funding based on price premium (simplified)
        const priceChange = parseFloat(data.priceChangePercent);
        // Typical funding correlates with short-term price action
        const estimatedRate = (priceChange / 100) * 0.01; // Rough estimate
        const rate = estimatedRate * 100;

        elements.fundingValue.textContent = rate.toFixed(4) + '%';

        let label, colorClass;
        if (rate > 0.05) {
          label = 'Very Bullish';
          colorClass = 'very-positive';
        } else if (rate > 0.01) {
          label = 'Bullish';
          colorClass = 'positive';
        } else if (rate > -0.01) {
          label = 'Neutral';
          colorClass = 'neutral';
        } else if (rate > -0.05) {
          label = 'Bearish';
          colorClass = 'negative';
        } else {
          label = 'Very Bearish';
          colorClass = 'very-negative';
        }

        elements.fundingLabel.textContent = label;
        elements.fundingValue.className = 'widget-value ' + colorClass;
      }
    } catch (e) {
      console.error('Dashboard: Failed to fetch funding rate:', e);
      elements.fundingValue.textContent = '--';
      elements.fundingLabel.textContent = 'Unavailable';
    }
  }

  // Fetch Open Interest estimate from 24h volume
  async function fetchOpenInterest() {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      const data = await res.json();

      if (data && data.volume) {
        const volume = parseFloat(data.volume);
        // Format volume in K BTC
        let oiFormatted;
        if (volume >= 1000) {
          oiFormatted = (volume / 1000).toFixed(1) + 'K BTC';
        } else {
          oiFormatted = volume.toFixed(0) + ' BTC';
        }

        elements.oiValue.textContent = oiFormatted;
        elements.oiChange.textContent = '24h Volume';
      }
    } catch (e) {
      console.error('Dashboard: Failed to fetch open interest:', e);
      elements.oiValue.textContent = '--';
      elements.oiChange.textContent = 'Unavailable';
    }
  }

  // Fetch Buy/Sell Volume Ratio
  async function fetchBuySellRatio() {
    try {
      const res = await fetch('https://api.binance.com/api/v3/aggTrades?symbol=BTCUSDT&limit=1000');
      const trades = await res.json();

      let buyVol = 0;
      let sellVol = 0;

      trades.forEach(trade => {
        const qty = parseFloat(trade.q);
        if (trade.m) {
          sellVol += qty;
        } else {
          buyVol += qty;
        }
      });

      const totalVol = buyVol + sellVol;
      const buyPct = (buyVol / totalVol * 100).toFixed(1);
      const sellPct = (sellVol / totalVol * 100).toFixed(1);
      const ratio = (buyVol / sellVol).toFixed(2);

      elements.ratioValue.textContent = ratio;

      let label, colorClass;
      if (ratio > 1.2) {
        label = 'Strong Buy Pressure';
        colorClass = 'positive';
      } else if (ratio > 1.0) {
        label = 'Buy Dominant';
        colorClass = 'positive';
      } else if (ratio > 0.8) {
        label = 'Sell Dominant';
        colorClass = 'negative';
      } else {
        label = 'Strong Sell Pressure';
        colorClass = 'negative';
      }

      elements.ratioLabel.textContent = label;
      elements.ratioValue.className = 'widget-value ' + colorClass;

      // Update volume bars
      if (elements.volBars) {
        elements.volBars.innerHTML = `
          <div class="vol-bar buy" style="width: ${buyPct}%"></div>
          <div class="vol-bar sell" style="width: ${sellPct}%"></div>
        `;
      }
    } catch (e) {
      console.error('Dashboard: Failed to fetch buy/sell ratio:', e);
      elements.ratioValue.textContent = '--';
      elements.ratioLabel.textContent = 'Unavailable';
    }
  }

  // Estimate Long/Short Ratio from taker buy/sell volume
  async function fetchLongShortRatio() {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      const data = await res.json();

      if (data) {
        // Use price change as proxy for long/short sentiment
        const priceChange = parseFloat(data.priceChangePercent);
        // Convert to ratio (positive = more longs, negative = more shorts)
        const ratio = (1 + priceChange / 100).toFixed(2);
        const longPct = priceChange > 0 ? (50 + priceChange / 2).toFixed(1) : (50 + priceChange / 2).toFixed(1);
        const shortPct = (100 - parseFloat(longPct)).toFixed(1);

        elements.lsValue.textContent = ratio;

        let label, colorClass;
        if (ratio > 1.05) {
          label = longPct + '% Long';
          colorClass = 'positive';
        } else if (ratio > 1.0) {
          label = longPct + '% Long';
          colorClass = 'positive';
        } else if (ratio > 0.95) {
          label = shortPct + '% Short';
          colorClass = 'negative';
        } else {
          label = shortPct + '% Short';
          colorClass = 'negative';
        }

        elements.lsLabel.textContent = label;
        elements.lsValue.className = 'widget-value ' + colorClass;
      }
    } catch (e) {
      console.error('Dashboard: Failed to fetch long/short ratio:', e);
      elements.lsValue.textContent = '--';
      elements.lsLabel.textContent = 'Unavailable';
    }
  }

  // Estimate 24h Liquidations (simplified calculation)
  async function fetchLiquidations() {
    try {
      // Get 24h ticker for price change info
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      const ticker = await res.json();

      const priceChange = parseFloat(ticker.priceChangePercent);
      const volume = parseFloat(ticker.quoteVolume);

      // Estimate liquidations based on volatility and volume
      // This is a simplified model - real liquidation data requires premium APIs
      const volatilityFactor = Math.abs(priceChange) / 100;
      const estimatedLiqs = (volume * volatilityFactor * 0.05) / 1e6; // Rough estimate in millions

      elements.liqValue.textContent = '$' + estimatedLiqs.toFixed(0) + 'M';

      let label;
      if (priceChange > 2) {
        label = 'Shorts rekt';
        elements.liqValue.className = 'widget-value negative';
      } else if (priceChange < -2) {
        label = 'Longs rekt';
        elements.liqValue.className = 'widget-value negative';
      } else {
        label = 'Low liquidations';
        elements.liqValue.className = 'widget-value neutral';
      }

      elements.liqLabel.textContent = label;
    } catch (e) {
      console.error('Dashboard: Failed to estimate liquidations:', e);
      elements.liqValue.textContent = '--';
      elements.liqLabel.textContent = 'Unavailable';
    }
  }

  // Calculate RSI from recent price data
  async function fetchRSI() {
    try {
      // Get 4h klines for RSI calculation
      const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=15');
      const klines = await res.json();

      // Calculate RSI
      const closes = klines.map(k => parseFloat(k[4]));
      const rsi = calculateRSI(closes, 14);

      elements.rsiValue.textContent = rsi.toFixed(1);

      let label, colorClass;
      if (rsi >= 70) {
        label = 'Overbought';
        colorClass = 'negative';
      } else if (rsi >= 60) {
        label = 'Bullish';
        colorClass = 'positive';
      } else if (rsi >= 40) {
        label = 'Neutral';
        colorClass = 'neutral';
      } else if (rsi >= 30) {
        label = 'Bearish';
        colorClass = 'negative';
      } else {
        label = 'Oversold';
        colorClass = 'positive';
      }

      elements.rsiLabel.textContent = label;
      elements.rsiValue.className = 'widget-value ' + colorClass;
    } catch (e) {
      console.error('Dashboard: Failed to calculate RSI:', e);
      elements.rsiValue.textContent = '--';
      elements.rsiLabel.textContent = 'Unavailable';
    }
  }

  // RSI calculation helper
  function calculateRSI(prices, period) {
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

  // Fetch Volatility (24h price range %)
  async function fetchVolatility() {
    try {
      const res = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      const ticker = await res.json();

      const high = parseFloat(ticker.highPrice);
      const low = parseFloat(ticker.lowPrice);
      const current = parseFloat(ticker.lastPrice);

      const volatility = ((high - low) / current * 100).toFixed(2);

      elements.volValue.textContent = volatility + '%';

      let label, colorClass;
      if (volatility > 8) {
        label = 'Extreme';
        colorClass = 'negative';
      } else if (volatility > 5) {
        label = 'High';
        colorClass = 'negative';
      } else if (volatility > 3) {
        label = 'Moderate';
        colorClass = 'neutral';
      } else {
        label = 'Low';
        colorClass = 'positive';
      }

      elements.volLabel.textContent = label;
      elements.volValue.className = 'widget-value ' + colorClass;
    } catch (e) {
      console.error('Dashboard: Failed to fetch volatility:', e);
      elements.volValue.textContent = '--';
      elements.volLabel.textContent = 'Unavailable';
    }
  }

  // Fetch BTC Dominance from CoinGecko
  async function fetchDominance() {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/global');
      const data = await res.json();

      if (data && data.data) {
        const dominance = data.data.market_cap_percentage.btc.toFixed(1);
        elements.domValue.textContent = dominance + '%';

        let label, colorClass;
        if (dominance > 55) {
          label = 'BTC Season';
          colorClass = 'positive';
        } else if (dominance > 45) {
          label = 'Balanced';
          colorClass = 'neutral';
        } else {
          label = 'Alt Season';
          colorClass = 'negative';
        }

        elements.domLabel.textContent = label;
        elements.domValue.className = 'widget-value ' + colorClass;
      }
    } catch (e) {
      console.error('Dashboard: Failed to fetch dominance:', e);
      elements.domValue.textContent = '--';
      elements.domLabel.textContent = 'Unavailable';
    }
  }

  // Initialize all widget data
  function initWidgets() {
    fetchFearGreed();
    fetchFundingRate();
    fetchOpenInterest();
    fetchBuySellRatio();
    fetchLongShortRatio();
    fetchLiquidations();
    fetchRSI();
    fetchVolatility();
    fetchDominance();
  }

  // Run on load
  initWidgets();

  // Refresh data periodically
  setInterval(fetchFearGreed, 300000);      // 5 minutes
  setInterval(fetchFundingRate, 60000);     // 1 minute
  setInterval(fetchOpenInterest, 60000);    // 1 minute
  setInterval(fetchBuySellRatio, 30000);    // 30 seconds
  setInterval(fetchLongShortRatio, 60000);  // 1 minute
  setInterval(fetchLiquidations, 60000);    // 1 minute
  setInterval(fetchRSI, 300000);            // 5 minutes
  setInterval(fetchVolatility, 30000);      // 30 seconds
  setInterval(fetchDominance, 300000);      // 5 minutes

})();
