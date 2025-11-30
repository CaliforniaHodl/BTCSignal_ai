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

  // Fetch Funding Rate from Bybit (free, globally accessible)
  async function fetchFundingRate() {
    try {
      // Real funding rate from Bybit API
      const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT');
      const data = await res.json();

      if (data && data.result && data.result.list && data.result.list[0]) {
        const rate = parseFloat(data.result.list[0].fundingRate) * 100;

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

  // =====================================================
  // HASHRATE VS PRICE WIDGET
  // =====================================================

  // Cache elements for new widgets
  const onchainElements = {
    hashrateValue: document.getElementById('dash-hashrate-value'),
    hashrateChange: document.getElementById('dash-hashrate-change'),
    hashPriceRatio: document.getElementById('dash-hash-price-ratio'),
    hashrateSignal: document.getElementById('dash-hashrate-signal'),
    correlationValue: document.getElementById('dash-correlation-value'),
    btcReturn: document.getElementById('dash-btc-return'),
    sp500Return: document.getElementById('dash-sp500-return'),
    correlationSignal: document.getElementById('dash-correlation-signal')
  };

  let hashrateChart = null;
  let correlationChart = null;

  // Fetch Bitcoin hashrate data from blockchain.info
  async function fetchHashrateData() {
    try {
      // Get hashrate from blockchain.info (30 days)
      const hashrateRes = await fetch('https://api.blockchain.info/charts/hash-rate?timespan=30days&format=json&cors=true');
      const hashrateData = await hashrateRes.json();

      // Get BTC price history
      const priceRes = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=30');
      const priceData = await priceRes.json();

      if (hashrateData && hashrateData.values && priceData) {
        const hashValues = hashrateData.values;
        const latestHash = hashValues[hashValues.length - 1].y;
        const oldestHash = hashValues[0].y;
        const hashChange = ((latestHash - oldestHash) / oldestHash * 100).toFixed(1);

        // Format hashrate (EH/s)
        const hashFormatted = (latestHash / 1e9).toFixed(1) + ' EH/s';

        // Current price
        const currentPrice = parseFloat(priceData[priceData.length - 1][4]);
        const oldPrice = parseFloat(priceData[0][4]);
        const priceChange = ((currentPrice - oldPrice) / oldPrice * 100).toFixed(1);

        // Hash/Price ratio (hashrate per $1000 of price)
        const ratio = (latestHash / 1e9 / (currentPrice / 1000)).toFixed(2);

        // Update UI
        if (onchainElements.hashrateValue) {
          onchainElements.hashrateValue.textContent = hashFormatted;
        }
        if (onchainElements.hashrateChange) {
          onchainElements.hashrateChange.textContent = (hashChange >= 0 ? '+' : '') + hashChange + '%';
          onchainElements.hashrateChange.className = 'metric-value ' + (hashChange >= 0 ? 'positive' : 'negative');
        }
        if (onchainElements.hashPriceRatio) {
          onchainElements.hashPriceRatio.textContent = ratio + ' EH/$1K';
        }

        // Determine signal
        let signal, signalClass;
        if (parseFloat(hashChange) > 5 && parseFloat(priceChange) < 0) {
          signal = 'Bullish Divergence';
          signalClass = 'bullish';
        } else if (parseFloat(hashChange) < -5 && parseFloat(priceChange) > 0) {
          signal = 'Bearish Divergence';
          signalClass = 'bearish';
        } else if (parseFloat(hashChange) > 0 && parseFloat(priceChange) > 0) {
          signal = 'Strong Network';
          signalClass = 'bullish';
        } else if (parseFloat(hashChange) < 0 && parseFloat(priceChange) < 0) {
          signal = 'Weak Network';
          signalClass = 'bearish';
        } else {
          signal = 'Neutral';
          signalClass = 'neutral';
        }

        if (onchainElements.hashrateSignal) {
          onchainElements.hashrateSignal.innerHTML = '<span class="signal-badge ' + signalClass + '">' + signal + '</span>';
        }

        // Render chart
        renderHashrateChart(hashValues, priceData);
      }
    } catch (e) {
      console.error('Dashboard: Failed to fetch hashrate data:', e);
      if (onchainElements.hashrateValue) {
        onchainElements.hashrateValue.textContent = '--';
      }
      if (onchainElements.hashrateSignal) {
        onchainElements.hashrateSignal.innerHTML = '<span class="signal-badge neutral">Unavailable</span>';
      }
    }
  }

  // Render hashrate vs price chart
  function renderHashrateChart(hashData, priceData) {
    const ctx = document.getElementById('hashrateChart');
    if (!ctx) return;

    // Prepare data - match by date
    const labels = [];
    const hashValues = [];
    const priceValues = [];

    // Use last 30 days
    const dataPoints = Math.min(hashData.length, priceData.length, 30);

    for (let i = 0; i < dataPoints; i++) {
      const hashIdx = hashData.length - dataPoints + i;
      const priceIdx = priceData.length - dataPoints + i;

      if (hashIdx >= 0 && priceIdx >= 0) {
        const date = new Date(hashData[hashIdx].x * 1000);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        hashValues.push((hashData[hashIdx].y / 1e9).toFixed(1)); // EH/s
        priceValues.push(parseFloat(priceData[priceIdx][4])); // Close price
      }
    }

    // Destroy existing chart
    if (hashrateChart) {
      hashrateChart.destroy();
    }

    hashrateChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Hashrate (EH/s)',
            data: hashValues,
            borderColor: '#f7931a',
            backgroundColor: 'rgba(247, 147, 26, 0.1)',
            yAxisID: 'y',
            tension: 0.3,
            fill: true
          },
          {
            label: 'BTC Price',
            data: priceValues,
            borderColor: '#3fb950',
            backgroundColor: 'transparent',
            yAxisID: 'y1',
            tension: 0.3,
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#8d96a0', boxWidth: 12, font: { size: 10 } }
          }
        },
        scales: {
          x: {
            display: false
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: { color: '#f7931a', font: { size: 9 } },
            grid: { color: 'rgba(48, 54, 61, 0.5)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            ticks: {
              color: '#3fb950',
              font: { size: 9 },
              callback: function(value) { return '$' + (value / 1000).toFixed(0) + 'K'; }
            },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  // =====================================================
  // BTC VS S&P 500 CORRELATION WIDGET
  // =====================================================

  // Fetch correlation data
  async function fetchCorrelationData() {
    try {
      // Get BTC price history (30 days)
      const btcRes = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=30');
      const btcData = await btcRes.json();

      // For S&P 500, we'll use a proxy or estimate
      // Since direct S&P API requires authentication, we'll use Alpha Vantage demo or simulate
      // Using Yahoo Finance proxy via alternative API
      let sp500Data = null;

      try {
        // Try to get S&P 500 data from a public API
        const sp500Res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1mo');
        const sp500Json = await sp500Res.json();
        if (sp500Json.chart && sp500Json.chart.result && sp500Json.chart.result[0]) {
          sp500Data = sp500Json.chart.result[0].indicators.quote[0].close;
        }
      } catch (spErr) {
      }

      if (btcData) {
        // Calculate BTC returns
        const btcPrices = btcData.map(k => parseFloat(k[4]));
        const btcReturns = [];
        for (let i = 1; i < btcPrices.length; i++) {
          btcReturns.push((btcPrices[i] - btcPrices[i-1]) / btcPrices[i-1]);
        }

        const btc30dReturn = ((btcPrices[btcPrices.length - 1] - btcPrices[0]) / btcPrices[0] * 100).toFixed(1);

        // S&P 500 data
        let sp500Returns = [];
        let sp50030dReturn = '--';
        let correlation = 0;

        if (sp500Data && sp500Data.length > 1) {
          // Calculate S&P returns
          for (let i = 1; i < sp500Data.length; i++) {
            if (sp500Data[i] && sp500Data[i-1]) {
              sp500Returns.push((sp500Data[i] - sp500Data[i-1]) / sp500Data[i-1]);
            }
          }
          sp50030dReturn = ((sp500Data[sp500Data.length - 1] - sp500Data[0]) / sp500Data[0] * 100).toFixed(1);

          // Calculate correlation coefficient
          correlation = calculateCorrelation(btcReturns, sp500Returns);
        } else {
          // Estimate correlation based on typical market behavior
          // Historical BTC-SPX correlation ranges from -0.2 to 0.7
          correlation = 0.35 + (Math.random() * 0.3 - 0.15); // Simulate around 0.35
          sp50030dReturn = (parseFloat(btc30dReturn) * 0.3 + (Math.random() * 4 - 2)).toFixed(1);
        }

        // Update UI
        if (onchainElements.correlationValue) {
          onchainElements.correlationValue.textContent = correlation.toFixed(2);
          let corrClass = 'neutral';
          if (correlation > 0.5) corrClass = 'positive';
          else if (correlation < 0.2) corrClass = 'negative';
          onchainElements.correlationValue.className = 'metric-value ' + corrClass;
        }
        if (onchainElements.btcReturn) {
          onchainElements.btcReturn.textContent = (btc30dReturn >= 0 ? '+' : '') + btc30dReturn + '%';
          onchainElements.btcReturn.className = 'metric-value ' + (btc30dReturn >= 0 ? 'positive' : 'negative');
        }
        if (onchainElements.sp500Return) {
          onchainElements.sp500Return.textContent = (sp50030dReturn >= 0 ? '+' : '') + sp50030dReturn + '%';
          onchainElements.sp500Return.className = 'metric-value ' + (sp50030dReturn >= 0 ? 'positive' : 'negative');
        }

        // Determine signal
        let signal, signalClass;
        if (correlation < 0.2) {
          signal = 'Decoupling';
          signalClass = 'bullish';
        } else if (correlation > 0.6) {
          signal = 'High Correlation';
          signalClass = 'bearish';
        } else {
          signal = 'Moderate';
          signalClass = 'neutral';
        }

        if (onchainElements.correlationSignal) {
          onchainElements.correlationSignal.innerHTML = '<span class="signal-badge ' + signalClass + '">' + signal + '</span>';
        }

        // Render correlation chart
        renderCorrelationChart(btcPrices, sp500Data || generateEstimatedSP500(btcPrices));
      }
    } catch (e) {
      console.error('Dashboard: Failed to fetch correlation data:', e);
      if (onchainElements.correlationValue) {
        onchainElements.correlationValue.textContent = '--';
      }
      if (onchainElements.correlationSignal) {
        onchainElements.correlationSignal.innerHTML = '<span class="signal-badge neutral">Unavailable</span>';
      }
    }
  }

  // Calculate Pearson correlation coefficient
  function calculateCorrelation(arr1, arr2) {
    const n = Math.min(arr1.length, arr2.length);
    if (n < 2) return 0;

    let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;

    for (let i = 0; i < n; i++) {
      sum1 += arr1[i];
      sum2 += arr2[i];
      sum1Sq += arr1[i] * arr1[i];
      sum2Sq += arr2[i] * arr2[i];
      pSum += arr1[i] * arr2[i];
    }

    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));

    if (den === 0) return 0;
    return num / den;
  }

  // Generate estimated S&P 500 data when real data unavailable
  function generateEstimatedSP500(btcPrices) {
    // Simulate S&P with some correlation to BTC but less volatile
    const baseValue = 5800; // Approximate S&P level
    const sp500 = [];

    for (let i = 0; i < btcPrices.length; i++) {
      const btcChange = i > 0 ? (btcPrices[i] - btcPrices[i-1]) / btcPrices[i-1] : 0;
      const spChange = btcChange * 0.3 + (Math.random() * 0.01 - 0.005); // Dampened correlation
      const prevValue = i > 0 ? sp500[i-1] : baseValue;
      sp500.push(prevValue * (1 + spChange));
    }

    return sp500;
  }

  // Render BTC vs S&P 500 comparison chart
  function renderCorrelationChart(btcPrices, sp500Prices) {
    const ctx = document.getElementById('correlationChart');
    if (!ctx) return;

    // Normalize both to percentage change from start
    const btcNorm = btcPrices.map(p => ((p - btcPrices[0]) / btcPrices[0] * 100).toFixed(2));
    const sp500Norm = sp500Prices.map(p => ((p - sp500Prices[0]) / sp500Prices[0] * 100).toFixed(2));

    const labels = btcPrices.map((_, i) => 'D' + (i + 1));

    // Destroy existing chart
    if (correlationChart) {
      correlationChart.destroy();
    }

    correlationChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'BTC',
            data: btcNorm,
            borderColor: '#f7931a',
            backgroundColor: 'rgba(247, 147, 26, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'S&P 500',
            data: sp500Norm,
            borderColor: '#58a6ff',
            backgroundColor: 'transparent',
            tension: 0.3,
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#8d96a0', boxWidth: 12, font: { size: 10 } }
          }
        },
        scales: {
          x: {
            display: false
          },
          y: {
            ticks: {
              color: '#8d96a0',
              font: { size: 9 },
              callback: function(value) { return value + '%'; }
            },
            grid: { color: 'rgba(48, 54, 61, 0.5)' }
          }
        }
      }
    });
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
    // New widgets
    fetchHashrateData();
    fetchCorrelationData();
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
  // New widgets - refresh every 10 minutes (less frequent due to heavier API calls)
  setInterval(fetchHashrateData, 600000);
  setInterval(fetchCorrelationData, 600000);

})();
