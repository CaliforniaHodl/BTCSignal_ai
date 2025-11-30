// Market Sentiment Dashboard - Homepage widgets
// Provides Fear & Greed, Funding Rate, Volume Profile, and Liquidation Zones

(function() {
  'use strict';

  // Cache DOM elements
  const elements = {
    fngValue: document.getElementById('home-fng-value'),
    fngLabel: document.getElementById('home-fng-label'),
    fngIndicator: document.getElementById('home-fng-indicator'),
    fundingValue: document.getElementById('home-funding-value'),
    fundingLabel: document.getElementById('home-funding-label'),
    fundingFill: document.getElementById('home-funding-fill'),
    volumeBars: document.getElementById('home-volume-bars'),
    buyVol: document.getElementById('home-buy-vol'),
    sellVol: document.getElementById('home-sell-vol'),
    volRatio: document.getElementById('home-vol-ratio'),
    liqHeatmap: document.getElementById('home-liq-heatmap'),
    liqAbove: document.getElementById('home-liq-above'),
    liqCurrent: document.getElementById('home-liq-current'),
    liqBelow: document.getElementById('home-liq-below'),
    // Hero card elements
    heroFundingValue: document.getElementById('hero-funding-value'),
    heroFundingLabel: document.getElementById('hero-funding-label'),
    // Quick stats bar elements
    statHigh: document.getElementById('stat-high'),
    statLow: document.getElementById('stat-low'),
    statVolume: document.getElementById('stat-volume'),
    statMcap: document.getElementById('stat-mcap')
  };

  // Check if elements exist (only run on homepage)
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

        // Position indicator (0-100 maps to 0-100%)
        elements.fngIndicator.style.left = value + '%';

        // Determine color class based on value
        let colorClass;
        if (value <= 25) {
          colorClass = 'extreme-fear';
        } else if (value <= 45) {
          colorClass = 'fear';
        } else if (value <= 55) {
          colorClass = 'neutral';
        } else if (value <= 75) {
          colorClass = 'greed';
        } else {
          colorClass = 'extreme-greed';
        }

        elements.fngValue.className = 'fng-value-large ' + colorClass;
      }
    } catch (e) {
      console.error('Failed to fetch Fear & Greed:', e);
      elements.fngValue.textContent = '--';
      elements.fngLabel.textContent = 'Unavailable';
    }
  }

  // Fetch Funding Rate from Binance
  async function fetchFundingRate() {
    try {
      const res = await fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1');
      const data = await res.json();

      if (data && data[0]) {
        const rate = parseFloat(data[0].fundingRate) * 100;
        const rateStr = rate.toFixed(4) + '%';

        elements.fundingValue.textContent = rateStr;

        // Determine label and styling
        let label, fillWidth, fillDirection;

        if (rate > 0.05) {
          label = 'Very Bullish';
          elements.fundingValue.className = 'funding-value-large very-positive';
        } else if (rate > 0.01) {
          label = 'Bullish';
          elements.fundingValue.className = 'funding-value-large positive';
        } else if (rate > -0.01) {
          label = 'Neutral';
          elements.fundingValue.className = 'funding-value-large neutral';
        } else if (rate > -0.05) {
          label = 'Bearish';
          elements.fundingValue.className = 'funding-value-large negative';
        } else {
          label = 'Very Bearish';
          elements.fundingValue.className = 'funding-value-large very-negative';
        }

        elements.fundingLabel.textContent = label;

        // Update hero funding card
        if (elements.heroFundingValue) {
          elements.heroFundingValue.textContent = rateStr;
          let heroColorClass = 'funding-quick-value';
          if (rate > 0.01) heroColorClass += ' positive';
          else if (rate < -0.01) heroColorClass += ' negative';
          else heroColorClass += ' neutral';
          elements.heroFundingValue.className = heroColorClass;
        }
        if (elements.heroFundingLabel) {
          elements.heroFundingLabel.textContent = label;
        }

        // Position the fill bar (center at 50%, scale to max 0.1%)
        const maxRate = 0.1;
        const normalizedRate = Math.max(-maxRate, Math.min(maxRate, rate));
        const percentage = (normalizedRate / maxRate) * 50;

        if (rate >= 0) {
          elements.fundingFill.style.left = '50%';
          elements.fundingFill.style.width = percentage + '%';
          elements.fundingFill.className = 'funding-fill positive';
        } else {
          elements.fundingFill.style.left = (50 + percentage) + '%';
          elements.fundingFill.style.width = Math.abs(percentage) + '%';
          elements.fundingFill.className = 'funding-fill negative';
        }
      }
    } catch (e) {
      console.error('Failed to fetch funding rate:', e);
      elements.fundingValue.textContent = '--';
      elements.fundingLabel.textContent = 'Unavailable';
    }
  }

  // Fetch 24H Volume from Binance
  async function fetchVolumeProfile() {
    try {
      // Get 24hr ticker for volume
      const tickerRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      const ticker = await tickerRes.json();

      // Get recent trades for buy/sell ratio estimation
      const tradesRes = await fetch('https://api.binance.com/api/v3/aggTrades?symbol=BTCUSDT&limit=1000');
      const trades = await tradesRes.json();

      // Calculate buy/sell volumes from recent trades
      let buyVol = 0;
      let sellVol = 0;

      trades.forEach(trade => {
        const qty = parseFloat(trade.q);
        if (trade.m) {
          sellVol += qty; // Market sell (maker was buyer)
        } else {
          buyVol += qty; // Market buy (maker was seller)
        }
      });

      const totalVol = buyVol + sellVol;
      const buyPct = (buyVol / totalVol * 100).toFixed(1);
      const sellPct = (sellVol / totalVol * 100).toFixed(1);
      const ratio = (buyVol / sellVol).toFixed(2);

      // Display stats
      elements.buyVol.textContent = buyPct + '%';
      elements.sellVol.textContent = sellPct + '%';
      elements.volRatio.textContent = ratio;

      // Create volume bar visualization
      renderVolumeBars(buyPct, sellPct);

    } catch (e) {
      console.error('Failed to fetch volume:', e);
      elements.buyVol.textContent = '--';
      elements.sellVol.textContent = '--';
      elements.volRatio.textContent = '--';
    }
  }

  // Render volume bars visualization
  function renderVolumeBars(buyPct, sellPct) {
    const barsHTML = `
      <div class="vol-bar-container">
        <div class="vol-bar buy" style="width: ${buyPct}%"></div>
        <div class="vol-bar sell" style="width: ${sellPct}%"></div>
      </div>
    `;
    elements.volumeBars.innerHTML = barsHTML;
  }

  // Fetch current price and calculate liquidation zones
  async function fetchLiquidationZones() {
    try {
      // Get current price
      const priceRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
      const priceData = await priceRes.json();
      const currentPrice = parseFloat(priceData.price);

      // Calculate estimated liquidation zones
      // These are simplified estimates based on common leverage levels
      // Real liquidation data would require exchange API access

      // Longs get liquidated when price drops (10x leverage = ~10% move)
      // Shorts get liquidated when price rises
      const longLiqZone = currentPrice * 0.95; // ~5% below (20x leverage)
      const shortLiqZone = currentPrice * 1.05; // ~5% above (20x leverage)

      // Format prices
      elements.liqCurrent.textContent = '$' + currentPrice.toLocaleString(undefined, {maximumFractionDigits: 0});
      elements.liqAbove.textContent = '$' + shortLiqZone.toLocaleString(undefined, {maximumFractionDigits: 0});
      elements.liqBelow.textContent = '$' + longLiqZone.toLocaleString(undefined, {maximumFractionDigits: 0});

      // Render mini heatmap
      renderLiqHeatmap(currentPrice, longLiqZone, shortLiqZone);

    } catch (e) {
      console.error('Failed to fetch liquidation zones:', e);
      elements.liqCurrent.textContent = '--';
      elements.liqAbove.textContent = '--';
      elements.liqBelow.textContent = '--';
    }
  }

  // Render mini liquidation heatmap
  function renderLiqHeatmap(currentPrice, longZone, shortZone) {
    // Create a simple visual representation
    const range = shortZone - longZone;
    const currentPct = ((currentPrice - longZone) / range * 100).toFixed(1);

    const heatmapHTML = `
      <div class="liq-heatmap-visual">
        <div class="liq-zone short-zone" title="Short liquidation zone">
          <div class="liq-intensity high"></div>
          <div class="liq-intensity medium"></div>
          <div class="liq-intensity low"></div>
        </div>
        <div class="liq-current-marker" style="bottom: ${currentPct}%">
          <span class="marker-line"></span>
        </div>
        <div class="liq-zone long-zone" title="Long liquidation zone">
          <div class="liq-intensity low"></div>
          <div class="liq-intensity medium"></div>
          <div class="liq-intensity high"></div>
        </div>
      </div>
    `;
    elements.liqHeatmap.innerHTML = heatmapHTML;
  }

  // Fetch quick stats for the stats bar
  async function fetchQuickStats() {
    try {
      // Get 24hr ticker for high/low/volume
      const tickerRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      const ticker = await tickerRes.json();

      // Format numbers
      const high24h = parseFloat(ticker.highPrice);
      const low24h = parseFloat(ticker.lowPrice);
      const volume24h = parseFloat(ticker.quoteVolume);

      if (elements.statHigh) {
        elements.statHigh.textContent = '$' + high24h.toLocaleString(undefined, {maximumFractionDigits: 0});
      }
      if (elements.statLow) {
        elements.statLow.textContent = '$' + low24h.toLocaleString(undefined, {maximumFractionDigits: 0});
      }
      if (elements.statVolume) {
        // Format volume in billions/millions
        if (volume24h >= 1e9) {
          elements.statVolume.textContent = '$' + (volume24h / 1e9).toFixed(1) + 'B';
        } else {
          elements.statVolume.textContent = '$' + (volume24h / 1e6).toFixed(0) + 'M';
        }
      }

      // Fetch market cap from CoinGecko
      const mcapRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_market_cap=true');
      const mcapData = await mcapRes.json();

      if (elements.statMcap && mcapData.bitcoin) {
        const mcap = mcapData.bitcoin.usd_market_cap;
        elements.statMcap.textContent = '$' + (mcap / 1e12).toFixed(2) + 'T';
      }

    } catch (e) {
      console.error('Failed to fetch quick stats:', e);
    }
  }

  // Initialize all data fetching
  function init() {
    fetchFearGreed();
    fetchFundingRate();
    fetchVolumeProfile();
    fetchLiquidationZones();
    fetchQuickStats();
  }

  // Run on load
  init();

  // Refresh data periodically
  setInterval(fetchFearGreed, 300000); // 5 minutes
  setInterval(fetchFundingRate, 60000); // 1 minute
  setInterval(fetchVolumeProfile, 30000); // 30 seconds
  setInterval(fetchLiquidationZones, 30000); // 30 seconds
  setInterval(fetchQuickStats, 30000); // 30 seconds

})();
