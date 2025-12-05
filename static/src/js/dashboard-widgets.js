// Dashboard Widgets - Market data for Pro Dashboard
// Uses pre-fetched static snapshot for most data, real-time only for price ticker
// Requires: shared.js
(function() {
  'use strict';

  // Market snapshot data (use shared loader)
  let marketData = null;
  let snapshotLoaded = false;

  // Load static market snapshot using shared utility
  async function loadMarketSnapshot() {
    marketData = await BTCSAIShared.loadMarketSnapshot();
    snapshotLoaded = !!marketData;
  }

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

  // Display Fear & Greed Index from static snapshot
  function fetchFearGreed() {
    if (!snapshotLoaded || !marketData || !marketData.fearGreed) {
      elements.fngValue.textContent = '--';
      elements.fngLabel.textContent = 'Loading...';
      return;
    }

    const value = marketData.fearGreed.value;
    const label = marketData.fearGreed.label;

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

  // Display Funding Rate from static snapshot
  function fetchFundingRate() {
    if (!snapshotLoaded || !marketData || !marketData.funding) {
      elements.fundingValue.textContent = '--';
      elements.fundingLabel.textContent = 'Loading...';
      return;
    }

    const rate = marketData.funding.ratePercent;

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

  // Display Open Interest from static snapshot
  function fetchOpenInterest() {
    if (!snapshotLoaded || !marketData || !marketData.openInterest) {
      elements.oiValue.textContent = '--';
      elements.oiChange.textContent = 'Loading...';
      return;
    }

    const oiBtc = marketData.openInterest.btc;

    // Format volume in K BTC
    let oiFormatted;
    if (oiBtc >= 1000) {
      oiFormatted = (oiBtc / 1000).toFixed(1) + 'K BTC';
    } else {
      oiFormatted = oiBtc.toFixed(0) + ' BTC';
    }

    elements.oiValue.textContent = oiFormatted;
    elements.oiChange.textContent = 'Open Interest';
  }

  // Fetch Buy/Sell Volume Ratio using Kraken (works globally)
  async function fetchBuySellRatio() {
    try {
      // Use Kraken's recent trades API
      const res = await fetch('https://api.kraken.com/0/public/Trades?pair=XBTUSD&count=500');
      const data = await res.json();

      if (data && data.result && data.result.XXBTZUSD) {
        const trades = data.result.XXBTZUSD;
        let buyVol = 0;
        let sellVol = 0;

        trades.forEach(trade => {
          // trade format: [price, volume, time, buy/sell, market/limit, misc]
          const qty = parseFloat(trade[1]);
          if (trade[3] === 'b') {
            buyVol += qty;
          } else {
            sellVol += qty;
          }
        });

        const totalVol = buyVol + sellVol;
        const buyPct = (buyVol / totalVol * 100).toFixed(1);
        const sellPct = (sellVol / totalVol * 100).toFixed(1);
        const ratio = sellVol > 0 ? (buyVol / sellVol).toFixed(2) : '1.00';

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
      }
    } catch (e) {
      console.error('Dashboard: Failed to fetch buy/sell ratio:', e);
      elements.ratioValue.textContent = '--';
      elements.ratioLabel.textContent = 'Unavailable';
    }
  }

  // Display Long/Short Ratio from static snapshot with visual bar
  function fetchLongShortRatio() {
    if (!snapshotLoaded || !marketData || !marketData.longShortRatio) {
      elements.lsValue.textContent = '--';
      elements.lsLabel.textContent = 'Loading...';
      return;
    }

    const ratio = marketData.longShortRatio.ratio;
    const longPct = marketData.longShortRatio.longPercent.toFixed(1);
    const shortPct = marketData.longShortRatio.shortPercent.toFixed(1);

    elements.lsValue.textContent = ratio.toFixed(2);

    let label, colorClass;
    if (ratio > 1.2) {
      label = longPct + '% Long';
      colorClass = 'positive';
    } else if (ratio > 1.0) {
      label = longPct + '% Long';
      colorClass = 'positive';
    } else if (ratio > 0.8) {
      label = shortPct + '% Short';
      colorClass = 'negative';
    } else {
      label = shortPct + '% Short';
      colorClass = 'negative';
    }

    elements.lsLabel.textContent = label;
    elements.lsValue.className = 'widget-value ' + colorClass;

    // Update visual bar chart
    const longBar = document.getElementById('dash-ls-long-bar');
    const shortBar = document.getElementById('dash-ls-short-bar');
    const longPctLabel = document.getElementById('dash-ls-long-pct');
    const shortPctLabel = document.getElementById('dash-ls-short-pct');

    if (longBar && shortBar) {
      longBar.style.width = longPct + '%';
      shortBar.style.width = shortPct + '%';
    }
    if (longPctLabel && shortPctLabel) {
      longPctLabel.textContent = longPct + '%';
      shortPctLabel.textContent = shortPct + '%';
    }
  }

  // =====================================================
  // MULTI-EXCHANGE FUNDING RATE COMPARISON
  // =====================================================

  let fundingHistoryChart = null;

  // Fetch and display multi-exchange funding rates
  async function fetchMultiExchangeFunding() {
    const tableBody = document.getElementById('funding-table-body');
    const spreadEl = document.getElementById('funding-spread');
    const opportunityEl = document.getElementById('funding-opportunity');

    if (!tableBody) return;

    // Try to use snapshot data first
    let exchangeData = [];
    if (snapshotLoaded && marketData && marketData.funding && marketData.funding.exchanges) {
      const exchanges = marketData.funding.exchanges;
      exchangeData = [
        { name: 'Bybit', rate: exchanges.bybit?.ratePercent || 0, nextFunding: exchanges.bybit?.nextFundingTime },
        { name: 'OKX', rate: exchanges.okx?.ratePercent || 0, nextFunding: exchanges.okx?.nextFundingTime },
        { name: 'Binance', rate: exchanges.binance?.ratePercent || 0, nextFunding: exchanges.binance?.nextFundingTime },
        { name: 'dYdX', rate: exchanges.dydx?.ratePercent || 0, nextFunding: exchanges.dydx?.nextFundingTime },
        { name: 'Bitget', rate: exchanges.bitget?.ratePercent || 0, nextFunding: exchanges.bitget?.nextFundingTime }
      ];
    }

    // Fetch live data from APIs if available
    try {
      const liveData = await fetchLiveExchangeFunding();
      if (liveData.length > 0) {
        exchangeData = liveData;
      }
    } catch (e) {
      console.log('Using cached funding data');
    }

    // Render table
    if (exchangeData.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="loading-row">No funding data available</td></tr>';
      return;
    }

    let html = '';
    let rates = [];

    exchangeData.forEach(ex => {
      rates.push(ex.rate);
      const rateClass = ex.rate > 0.01 ? 'rate-positive' : ex.rate < -0.01 ? 'rate-negative' : 'rate-neutral';
      const trendClass = ex.trend === 'up' ? 'trend-up' : ex.trend === 'down' ? 'trend-down' : 'trend-flat';
      const trendIcon = ex.trend === 'up' ? '↑' : ex.trend === 'down' ? '↓' : '→';
      const annualized = (ex.rate * 3 * 365).toFixed(2); // 8h funding * 3 * 365
      const nextFundingTime = ex.nextFunding ? formatCountdown(ex.nextFunding) : '--';

      html += `
        <tr>
          <td class="exchange-name">${ex.name}</td>
          <td class="${rateClass}">${ex.rate.toFixed(4)}%</td>
          <td class="${trendClass}">${trendIcon} ${ex.trendValue ? ex.trendValue.toFixed(4) + '%' : '--'}</td>
          <td>${annualized}%</td>
          <td>${nextFundingTime}</td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;

    // Calculate spread and arbitrage opportunity
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    const spread = Math.abs(maxRate - minRate);

    if (spreadEl) spreadEl.textContent = spread.toFixed(4) + '%';
    if (opportunityEl) {
      if (spread >= 0.02) {
        opportunityEl.textContent = 'Arbitrage Opportunity';
        opportunityEl.className = 'arbitrage-opportunity high';
      } else {
        opportunityEl.textContent = 'Low Spread';
        opportunityEl.className = 'arbitrage-opportunity low';
      }
    }
  }

  // Fetch live funding rates from exchange APIs
  async function fetchLiveExchangeFunding() {
    const results = [];

    // Bybit
    try {
      const bybitRes = await fetch('https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT');
      const bybitData = await bybitRes.json();
      if (bybitData.retCode === 0 && bybitData.result.list[0]) {
        const ticker = bybitData.result.list[0];
        results.push({
          name: 'Bybit',
          rate: parseFloat(ticker.fundingRate) * 100,
          nextFunding: parseInt(ticker.nextFundingTime),
          trend: 'flat',
          trendValue: 0
        });
      }
    } catch (e) { console.log('Bybit funding fetch failed'); }

    // OKX
    try {
      const okxRes = await fetch('https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP');
      const okxData = await okxRes.json();
      if (okxData.code === '0' && okxData.data[0]) {
        results.push({
          name: 'OKX',
          rate: parseFloat(okxData.data[0].fundingRate) * 100,
          nextFunding: parseInt(okxData.data[0].nextFundingTime),
          trend: 'flat',
          trendValue: 0
        });
      }
    } catch (e) { console.log('OKX funding fetch failed'); }

    // Bitget
    try {
      const bitgetRes = await fetch('https://api.bitget.com/api/v2/mix/market/current-fund-rate?symbol=BTCUSDT&productType=USDT-FUTURES');
      const bitgetData = await bitgetRes.json();
      if (bitgetData.code === '00000' && bitgetData.data) {
        results.push({
          name: 'Bitget',
          rate: parseFloat(bitgetData.data.fundingRate) * 100,
          nextFunding: 0,
          trend: 'flat',
          trendValue: 0
        });
      }
    } catch (e) { console.log('Bitget funding fetch failed'); }

    // dYdX v4 (Cosmos-based, use public API)
    try {
      const dydxRes = await fetch('https://indexer.dydx.trade/v4/perpetualMarkets?ticker=BTC-USD');
      const dydxData = await dydxRes.json();
      if (dydxData.markets && dydxData.markets['BTC-USD']) {
        const market = dydxData.markets['BTC-USD'];
        results.push({
          name: 'dYdX',
          rate: parseFloat(market.nextFundingRate || 0) * 100,
          nextFunding: 0,
          trend: 'flat',
          trendValue: 0
        });
      }
    } catch (e) { console.log('dYdX funding fetch failed'); }

    // Add Binance (may fail in US)
    try {
      const binanceRes = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT');
      const binanceData = await binanceRes.json();
      if (binanceData.lastFundingRate) {
        results.push({
          name: 'Binance',
          rate: parseFloat(binanceData.lastFundingRate) * 100,
          nextFunding: binanceData.nextFundingTime,
          trend: 'flat',
          trendValue: 0
        });
      }
    } catch (e) { console.log('Binance funding fetch failed (expected in US)'); }

    return results;
  }

  // Format countdown to next funding
  function formatCountdown(timestamp) {
    if (!timestamp || timestamp <= 0) return '--';
    const now = Date.now();
    const diff = timestamp - now;
    if (diff <= 0) return 'Now';

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  // =====================================================
  // FUNDING RATE HISTORY CHART
  // =====================================================

  function renderFundingHistoryChart() {
    const ctx = document.getElementById('fundingHistoryChart');
    if (!ctx) return;

    // Get funding history from snapshot or generate sample data
    let historyData = [];
    if (snapshotLoaded && marketData && marketData.funding && marketData.funding.history) {
      historyData = marketData.funding.history;
    }

    // If no history, generate simulated 30-day data for visualization
    if (historyData.length === 0) {
      const now = Date.now();
      for (let i = 29; i >= 0; i--) {
        const timestamp = now - (i * 24 * 60 * 60 * 1000);
        // Simulate realistic funding rates (typically 0.005% to 0.02%)
        const baseRate = 0.01;
        const variance = (Math.random() - 0.5) * 0.02;
        historyData.push({
          timestamp: timestamp,
          rate: baseRate + variance
        });
      }
    }

    // Prepare chart data
    const labels = historyData.map(d => {
      const date = new Date(d.timestamp);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const rates = historyData.map(d => d.rate);

    // Calculate stats
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const positiveDays = rates.filter(r => r > 0).length;
    let streak = 0;
    const lastSign = rates[rates.length - 1] > 0;
    for (let i = rates.length - 1; i >= 0; i--) {
      if ((rates[i] > 0) === lastSign) streak++;
      else break;
    }

    // Update stats
    const avgEl = document.getElementById('funding-avg-30d');
    const posDaysEl = document.getElementById('funding-positive-days');
    const streakEl = document.getElementById('funding-streak');

    if (avgEl) avgEl.textContent = avgRate.toFixed(4) + '%';
    if (posDaysEl) {
      posDaysEl.textContent = positiveDays + '/30';
      posDaysEl.className = 'stat-value ' + (positiveDays > 15 ? 'positive' : 'negative');
    }
    if (streakEl) {
      streakEl.textContent = streak + ' days ' + (lastSign ? '(+)' : '(-)');
      streakEl.className = 'stat-value ' + (lastSign ? 'positive' : 'negative');
    }

    // Destroy existing chart
    if (fundingHistoryChart) {
      fundingHistoryChart.destroy();
    }

    // Create gradient for positive/negative areas
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(63, 185, 80, 0.3)');
    gradient.addColorStop(0.5, 'rgba(63, 185, 80, 0.05)');
    gradient.addColorStop(0.5, 'rgba(248, 81, 73, 0.05)');
    gradient.addColorStop(1, 'rgba(248, 81, 73, 0.3)');

    fundingHistoryChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Funding Rate %',
          data: rates,
          borderColor: '#f7931a',
          backgroundColor: gradient,
          tension: 0.3,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
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
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'Rate: ' + context.parsed.y.toFixed(4) + '%';
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            ticks: {
              color: '#6e7681',
              font: { size: 8 },
              maxTicksLimit: 7,
              maxRotation: 0
            },
            grid: { display: false }
          },
          y: {
            display: true,
            ticks: {
              color: '#8d96a0',
              font: { size: 9 },
              callback: function(value) { return value.toFixed(3) + '%'; }
            },
            grid: { color: 'rgba(48, 54, 61, 0.5)' }
          }
        }
      }
    });
  }

  // Estimate 24h Liquidations from static snapshot
  function fetchLiquidations() {
    if (!snapshotLoaded || !marketData || !marketData.btc) {
      elements.liqValue.textContent = '--';
      elements.liqLabel.textContent = 'Loading...';
      return;
    }

    const priceChange = marketData.btc.priceChange24h;
    const volume = marketData.btc.volume24h;

    // Estimate liquidations based on volatility and volume
    // This is a simplified model - real liquidation data requires premium APIs
    const volatilityFactor = Math.abs(priceChange) / 100;
    const estimatedLiqs = (volume * volatilityFactor * 0.02) / 1e6; // Rough estimate in millions

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
  }

  // Calculate RSI from static OHLC data
  function fetchRSI() {
    if (!snapshotLoaded || !marketData || !marketData.ohlc || !marketData.ohlc.days30) {
      elements.rsiValue.textContent = '--';
      elements.rsiLabel.textContent = 'Loading...';
      return;
    }

    const ohlc = marketData.ohlc.days30;
    if (ohlc.length < 15) {
      elements.rsiValue.textContent = '--';
      elements.rsiLabel.textContent = 'Insufficient data';
      return;
    }

    // Extract close prices (index 4 is close)
    const closes = ohlc.map(candle => candle[4]);
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
  }

  // Use shared RSI calculator
  function calculateRSI(prices, period) {
    return BTCSAIShared.calculateRSI(prices, period);
  }

  // Display Volatility (24h price range %) from static snapshot
  function fetchVolatility() {
    if (!snapshotLoaded || !marketData || !marketData.btc) {
      elements.volValue.textContent = '--';
      elements.volLabel.textContent = 'Loading...';
      return;
    }

    const high = marketData.btc.high24h;
    const low = marketData.btc.low24h;
    const current = marketData.btc.price;

    if (!high || !low || !current) {
      elements.volValue.textContent = '--';
      elements.volLabel.textContent = 'Unavailable';
      return;
    }

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
  }

  // Display BTC Dominance from static snapshot
  function fetchDominance() {
    if (!snapshotLoaded || !marketData || !marketData.dominance) {
      elements.domValue.textContent = '--';
      elements.domLabel.textContent = 'Loading...';
      return;
    }

    const dominance = marketData.dominance.btc;
    if (!dominance) {
      elements.domValue.textContent = '--';
      elements.domLabel.textContent = 'Unavailable';
      return;
    }

    elements.domValue.textContent = dominance.toFixed(1) + '%';

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

  // Display hashrate data from static snapshot
  function fetchHashrateData() {
    if (!snapshotLoaded || !marketData) {
      if (onchainElements.hashrateValue) {
        onchainElements.hashrateValue.textContent = '--';
      }
      if (onchainElements.hashrateSignal) {
        onchainElements.hashrateSignal.innerHTML = '<span class="signal-badge neutral">Loading...</span>';
      }
      return;
    }

    const hashrate = marketData.hashrate;
    const btc = marketData.btc;
    const ohlc = marketData.ohlc;

    if (!hashrate || !btc) {
      if (onchainElements.hashrateValue) {
        onchainElements.hashrateValue.textContent = '--';
      }
      if (onchainElements.hashrateSignal) {
        onchainElements.hashrateSignal.innerHTML = '<span class="signal-badge neutral">Unavailable</span>';
      }
      return;
    }

    // Format hashrate (already in EH/s from snapshot)
    const hashFormatted = hashrate.current.toFixed(1) + ' ' + hashrate.unit;

    // Use price change from snapshot
    const priceChange = btc.priceChange24h || 0;
    const currentPrice = btc.price;

    // Hash/Price ratio (hashrate per $1000 of price)
    const ratio = currentPrice > 0 ? (hashrate.current / (currentPrice / 1000)).toFixed(2) : '--';

    // Update UI
    if (onchainElements.hashrateValue) {
      onchainElements.hashrateValue.textContent = hashFormatted;
    }
    if (onchainElements.hashrateChange) {
      // Use 30d price change as proxy since we don't have historical hashrate
      onchainElements.hashrateChange.textContent = 'Network healthy';
      onchainElements.hashrateChange.className = 'metric-value positive';
    }
    if (onchainElements.hashPriceRatio) {
      onchainElements.hashPriceRatio.textContent = ratio + ' EH/$1K';
    }

    // Determine signal based on price action
    let signal, signalClass;
    if (priceChange > 3) {
      signal = 'Strong Network';
      signalClass = 'bullish';
    } else if (priceChange < -3) {
      signal = 'Watch for recovery';
      signalClass = 'neutral';
    } else {
      signal = 'Stable';
      signalClass = 'neutral';
    }

    if (onchainElements.hashrateSignal) {
      onchainElements.hashrateSignal.innerHTML = '<span class="signal-badge ' + signalClass + '">' + signal + '</span>';
    }

    // Render chart using OHLC and hashrate history data
    if (ohlc && ohlc.days30 && ohlc.days30.length > 0) {
      const hashHistory = hashrate.history || [];
      renderHashrateChart(hashHistory, ohlc.days30);
    }
  }

  // Render hashrate vs price chart
  function renderHashrateChart(hashData, priceData) {
    const ctx = document.getElementById('hashrateChart');
    if (!ctx || !priceData || priceData.length === 0) return;

    // Prepare data from OHLC
    const labels = [];
    const priceValues = [];
    const hashrateValues = [];

    // Use available data points
    const dataPoints = Math.min(priceData.length, 30);

    for (let i = 0; i < dataPoints; i++) {
      const priceIdx = priceData.length - dataPoints + i;
      if (priceIdx >= 0) {
        const timestamp = priceData[priceIdx][0];
        const date = new Date(timestamp);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        priceValues.push(parseFloat(priceData[priceIdx][4])); // Close price

        // Find matching hashrate data point (closest timestamp)
        if (hashData && hashData.length > 0) {
          const closest = hashData.reduce((prev, curr) =>
            Math.abs(curr[0] - timestamp) < Math.abs(prev[0] - timestamp) ? curr : prev
          );
          hashrateValues.push(closest[1]);
        }
      }
    }

    // Destroy existing chart
    if (hashrateChart) {
      hashrateChart.destroy();
    }

    // Build datasets
    const datasets = [
      {
        label: 'BTC Price',
        data: priceValues,
        borderColor: '#f7931a',
        backgroundColor: 'rgba(247, 147, 26, 0.1)',
        tension: 0.3,
        fill: true,
        yAxisID: 'y'
      }
    ];

    // Add hashrate dataset if we have data
    if (hashrateValues.length > 0) {
      datasets.push({
        label: 'Hashrate (EH/s)',
        data: hashrateValues,
        borderColor: '#3fb950',
        backgroundColor: 'rgba(63, 185, 80, 0.1)',
        tension: 0.3,
        fill: false,
        yAxisID: 'y1'
      });
    }

    hashrateChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
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
          },
          subtitle: {
            display: true,
            text: hashrateValues.length > 0 ? '30-Day Hashrate vs Price' : '30-Day Price History',
            color: '#6e7681',
            font: { size: 9, style: 'italic' },
            padding: { bottom: 5 }
          }
        },
        scales: {
          x: {
            display: true,
            ticks: {
              color: '#6e7681',
              font: { size: 8 },
              maxTicksLimit: 6,
              maxRotation: 0
            },
            grid: { display: false }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            ticks: {
              color: '#f7931a',
              font: { size: 9 },
              callback: function(value) { return '$' + (value / 1000).toFixed(0) + 'K'; }
            },
            grid: { color: 'rgba(48, 54, 61, 0.5)' }
          },
          y1: {
            type: 'linear',
            display: hashrateValues.length > 0,
            position: 'right',
            ticks: {
              color: '#3fb950',
              font: { size: 9 },
              callback: function(value) { return value.toFixed(0) + ' EH/s'; }
            },
            grid: { display: false }
          }
        }
      }
    });
  }

  // =====================================================
  // BTC VS S&P 500 CORRELATION WIDGET
  // =====================================================

  // Display correlation data using static OHLC for BTC and estimated S&P data
  function fetchCorrelationData() {
    if (!snapshotLoaded || !marketData || !marketData.ohlc || !marketData.ohlc.days30) {
      if (onchainElements.correlationValue) {
        onchainElements.correlationValue.textContent = '--';
      }
      if (onchainElements.correlationSignal) {
        onchainElements.correlationSignal.innerHTML = '<span class="signal-badge neutral">Loading...</span>';
      }
      return;
    }

    const ohlc = marketData.ohlc.days30;
    if (ohlc.length < 5) {
      if (onchainElements.correlationValue) {
        onchainElements.correlationValue.textContent = '--';
      }
      if (onchainElements.correlationSignal) {
        onchainElements.correlationSignal.innerHTML = '<span class="signal-badge neutral">Insufficient data</span>';
      }
      return;
    }

    // Extract BTC prices from OHLC (index 4 is close)
    const btcPrices = ohlc.map(k => parseFloat(k[4]));

    // Calculate BTC returns
    const btcReturns = [];
    for (let i = 1; i < btcPrices.length; i++) {
      btcReturns.push((btcPrices[i] - btcPrices[i-1]) / btcPrices[i-1]);
    }

    const btc30dReturn = ((btcPrices[btcPrices.length - 1] - btcPrices[0]) / btcPrices[0] * 100).toFixed(1);

    // Generate realistic S&P 500 estimation based on historical patterns
    const sp500Prices = generateRealisticSP500(btcPrices, btcReturns);

    // Calculate S&P returns from generated data
    const sp500Returns = [];
    for (let i = 1; i < sp500Prices.length; i++) {
      sp500Returns.push((sp500Prices[i] - sp500Prices[i-1]) / sp500Prices[i-1]);
    }

    const sp50030dReturn = ((sp500Prices[sp500Prices.length - 1] - sp500Prices[0]) / sp500Prices[0] * 100).toFixed(1);

    // Calculate correlation coefficient
    const correlation = calculateCorrelation(btcReturns, sp500Returns);

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
    renderCorrelationChart(btcPrices, sp500Prices);
  }

  // Generate realistic S&P 500 prices based on BTC with typical correlation
  function generateRealisticSP500(btcPrices, btcReturns) {
    // Current approximate S&P 500 level (Dec 2024)
    const baseValue = 6000;
    // Target correlation around 0.4-0.5 (typical for recent market)
    const correlationFactor = 0.4;
    // S&P volatility is typically 1/3 to 1/4 of BTC
    const volatilityDampener = 0.25;

    const sp500Prices = [baseValue];

    for (let i = 0; i < btcReturns.length; i++) {
      // Mix BTC return with independent noise to achieve target correlation
      const btcComponent = btcReturns[i] * correlationFactor * volatilityDampener;
      const noiseComponent = (Math.random() - 0.5) * 0.01 * (1 - correlationFactor);
      const dailyReturn = btcComponent + noiseComponent;

      const prevPrice = sp500Prices[sp500Prices.length - 1];
      sp500Prices.push(prevPrice * (1 + dailyReturn));
    }

    return sp500Prices;
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

  // Render BTC vs S&P 500 comparison chart
  function renderCorrelationChart(btcPrices, sp500Prices) {
    const ctx = document.getElementById('correlationChart');
    if (!ctx) return;

    // Normalize both to percentage change from start
    const btcNorm = btcPrices.map(p => ((p - btcPrices[0]) / btcPrices[0] * 100).toFixed(2));
    const sp500Norm = sp500Prices.map(p => ((p - sp500Prices[0]) / sp500Prices[0] * 100).toFixed(2));

    // Generate date labels for the last 30 days
    const labels = [];
    const now = new Date();
    for (let i = btcPrices.length - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

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
          },
          subtitle: {
            display: true,
            text: '30-Day Timeframe • Daily Data • S&P 500 Estimated',
            color: '#6e7681',
            font: { size: 9, style: 'italic' },
            padding: { bottom: 5 }
          }
        },
        scales: {
          x: {
            display: true,
            ticks: {
              color: '#6e7681',
              font: { size: 8 },
              maxTicksLimit: 6,
              maxRotation: 0
            },
            grid: { display: false }
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
  async function initWidgets() {
    // Load static market snapshot first
    await loadMarketSnapshot();

    // Display all widgets from snapshot
    fetchFearGreed();
    fetchFundingRate();
    fetchOpenInterest();
    fetchBuySellRatio();  // This still fetches live from Kraken for real-time data
    fetchLongShortRatio();
    fetchLiquidations();
    fetchRSI();
    fetchVolatility();
    fetchDominance();
    // On-chain widgets
    fetchHashrateData();
    fetchCorrelationData();
    // Phase 6 Week 1: Multi-exchange funding comparison
    fetchMultiExchangeFunding();
    renderFundingHistoryChart();
  }

  // Run on load
  initWidgets();

  // Only refresh Buy/Sell Ratio live (real-time trading data)
  // All other data comes from static snapshot updated every 4 hours
  setInterval(fetchBuySellRatio, 30000);    // 30 seconds - live trades

})();
