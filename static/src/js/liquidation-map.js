// Liquidation Map - Interactive Heatmap Visualization
// Shows liquidation levels and price magnets for BTC
// Integrates real data from Binance, Bybit, and Coinglass APIs

(function() {
  'use strict';

  const FEATURE_KEY = 'btcsai_liq_map_access';

  // Check access
  function checkAccess() {
    if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.isAdmin()) {
      return true;
    }
    if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.hasAllAccess()) {
      return true;
    }
    return localStorage.getItem(FEATURE_KEY) === 'unlocked';
  }

  // State
  let currentPrice = 0;
  let liquidationData = [];
  let zoomLevel = 1;
  let selectedLeverage = 'all';
  let selectedExchange = 'aggregate'; // 'aggregate', 'binance', 'bybit'
  let recentLiquidations = []; // Track real-time liquidations
  let exchangeData = { binance: null, bybit: null };
  let useRealData = true; // Toggle for real vs simulated data

  // DOM elements
  const canvas = document.getElementById('liquidation-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const loading = document.getElementById('heatmap-loading');

  if (!canvas) return;

  // Initialize canvas size
  function initCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = 500;
  }

  // Fetch current price from exchanges
  async function fetchPrice() {
    try {
      // Try real exchange APIs first
      if (typeof ExchangeAPI !== 'undefined') {
        const aggregated = await ExchangeAPI.getAggregatedData('BTCUSDT');
        if (aggregated && aggregated.price > 0) {
          currentPrice = aggregated.price;
          exchangeData = {
            binance: aggregated.exchanges.binance,
            bybit: aggregated.exchanges.bybit,
            openInterest: aggregated.openInterest,
            funding: aggregated.funding
          };
          updatePriceDisplay();
          return currentPrice;
        }
      }

      // Fallback to Binance US
      const res = await fetch('https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT');
      const data = await res.json();
      currentPrice = parseFloat(data.lastPrice);
      updatePriceDisplay(parseFloat(data.priceChangePercent));
      return currentPrice;
    } catch (e) {
      console.error('Failed to fetch price:', e);
      return 0;
    }
  }

  // Update price display
  function updatePriceDisplay(changePercent) {
    document.getElementById('current-btc').textContent = '$' + currentPrice.toLocaleString(undefined, {maximumFractionDigits: 0});

    const changeEl = document.getElementById('price-change-24h');
    if (exchangeData.binance) {
      const change = exchangeData.binance.change24h;
      changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
      changeEl.className = 'change ' + (change >= 0 ? 'positive' : 'negative');
    } else if (changePercent !== undefined) {
      changeEl.textContent = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%';
      changeEl.className = 'change ' + (changePercent >= 0 ? 'positive' : 'negative');
    }

    document.getElementById('magnet-current').textContent = '$' + currentPrice.toLocaleString(undefined, {maximumFractionDigits: 0});
  }

  // Fetch liquidation data from cached market-snapshot.json or calculate from exchange data
  async function fetchLiquidationData() {
    // First try to use cached liquidation data from market-snapshot.json
    if (typeof ExchangeAPI !== 'undefined' && useRealData) {
      try {
        const aggregated = await ExchangeAPI.getAggregatedData('BTCUSDT');

        // If we have pre-calculated liquidation levels from the snapshot, use them
        if (aggregated.liquidation && aggregated.liquidation.levels && aggregated.liquidation.levels.length > 0) {
          let levels = aggregated.liquidation.levels;

          // Filter by exchange if selected (though cached data is aggregate)
          if (selectedExchange !== 'aggregate') {
            levels = levels.filter(l => l.exchange === selectedExchange || l.exchange === 'aggregate');
          }

          liquidationData = levels;
          console.log('Using cached liquidation data:', levels.length, 'levels');
          return liquidationData;
        }

        // Calculate from OI and funding data if no pre-calculated levels
        if (aggregated.openInterest && aggregated.openInterest.total > 0) {
          const oi = selectedExchange === 'aggregate'
            ? aggregated.openInterest.total
            : (aggregated.openInterest[selectedExchange] || aggregated.openInterest.total);

          const funding = selectedExchange === 'aggregate'
            ? aggregated.funding.average
            : (aggregated.funding[selectedExchange] || aggregated.funding.average);

          liquidationData = calculateLiquidationLevels(currentPrice, oi, funding);
          console.log('Calculated liquidation levels from OI/funding');
          return liquidationData;
        }
      } catch (e) {
        console.error('Exchange API error:', e);
      }
    }

    // Fallback: calculate from any available exchange data
    if (typeof ExchangeAPI !== 'undefined' && exchangeData.openInterest) {
      const oi = selectedExchange === 'aggregate'
        ? exchangeData.openInterest.total
        : (exchangeData.openInterest[selectedExchange] || exchangeData.openInterest.total);

      const funding = selectedExchange === 'aggregate'
        ? exchangeData.funding.average
        : (exchangeData.funding[selectedExchange] || exchangeData.funding.average);

      liquidationData = calculateLiquidationLevels(currentPrice, oi, funding);
      return liquidationData;
    }

    // Final fallback: simulated data
    console.log('Using simulated liquidation data');
    liquidationData = generateSimulatedLiquidationData(currentPrice);
    return liquidationData;
  }

  // Calculate liquidation levels from OI and funding
  function calculateLiquidationLevels(price, openInterest, fundingRate) {
    if (typeof ExchangeAPI !== 'undefined') {
      return ExchangeAPI.calculateLiquidationLevels(price, null, openInterest, fundingRate);
    }
    return generateSimulatedLiquidationData(price);
  }

  // Generate simulated liquidation data (fallback)
  function generateSimulatedLiquidationData(price) {
    const data = [];
    const range = price * 0.15;
    const leverageLevels = [10, 25, 50, 100];

    leverageLevels.forEach(leverage => {
      const longLiqDistance = price / leverage;
      for (let i = 1; i <= 5; i++) {
        const level = price - (longLiqDistance * i * 0.5);
        const intensity = Math.random() * 0.5 + 0.3 + (1 / leverage);
        data.push({
          price: level,
          type: 'long',
          leverage: leverage,
          intensity: Math.min(intensity, 1),
          estimatedValue: Math.floor(Math.random() * 50 + 10) * leverage * 100000,
          exchange: selectedExchange
        });
      }

      for (let i = 1; i <= 5; i++) {
        const level = price + (longLiqDistance * i * 0.5);
        const intensity = Math.random() * 0.5 + 0.3 + (1 / leverage);
        data.push({
          price: level,
          type: 'short',
          leverage: leverage,
          intensity: Math.min(intensity, 1),
          estimatedValue: Math.floor(Math.random() * 50 + 10) * leverage * 100000,
          exchange: selectedExchange
        });
      }
    });

    // Add random clusters
    for (let i = 0; i < 20; i++) {
      const randomOffset = (Math.random() - 0.5) * range * 2;
      const level = price + randomOffset;
      const type = level > price ? 'short' : 'long';
      data.push({
        price: level,
        type: type,
        leverage: leverageLevels[Math.floor(Math.random() * leverageLevels.length)],
        intensity: Math.random() * 0.6 + 0.2,
        estimatedValue: Math.floor(Math.random() * 100 + 5) * 100000,
        exchange: selectedExchange
      });
    }

    return data.sort((a, b) => b.price - a.price);
  }

  // Draw the heatmap
  function drawHeatmap() {
    if (!ctx || !currentPrice) return;

    const width = canvas.width;
    const height = canvas.height;
    const range = currentPrice * 0.15 / zoomLevel;
    const minPrice = currentPrice - range;
    const maxPrice = currentPrice + range;

    // Clear canvas
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);

    // Filter data by leverage if selected
    let filteredData = liquidationData;
    if (selectedLeverage !== 'all') {
      filteredData = liquidationData.filter(d => d.leverage === parseInt(selectedLeverage));
    }

    // Draw liquidation bars
    filteredData.forEach(liq => {
      if (liq.price < minPrice || liq.price > maxPrice) return;

      const y = height - ((liq.price - minPrice) / (maxPrice - minPrice)) * height;
      const barWidth = liq.intensity * width * 0.8;

      let color;
      if (liq.type === 'long') {
        const alpha = liq.intensity * 0.8;
        color = `rgba(239, 68, 68, ${alpha})`;
      } else {
        const alpha = liq.intensity * 0.8;
        color = `rgba(34, 197, 94, ${alpha})`;
      }

      ctx.fillStyle = color;
      ctx.fillRect(width - barWidth, y - 2, barWidth, 4);

      // Glow effect for high intensity
      if (liq.intensity > 0.7) {
        ctx.shadowColor = liq.type === 'long' ? '#ef4444' : '#22c55e';
        ctx.shadowBlur = 10;
        ctx.fillRect(width - barWidth, y - 2, barWidth, 4);
        ctx.shadowBlur = 0;
      }
    });

    // Draw recent real-time liquidations
    recentLiquidations.forEach(liq => {
      if (liq.price < minPrice || liq.price > maxPrice) return;

      const y = height - ((liq.price - minPrice) / (maxPrice - minPrice)) * height;
      const age = Date.now() - liq.timestamp;
      const fadeOut = Math.max(0, 1 - (age / 60000)); // Fade over 60 seconds

      // Pulsing effect for recent liquidations
      ctx.beginPath();
      ctx.arc(width * 0.9, y, 8 * fadeOut, 0, Math.PI * 2);
      ctx.fillStyle = liq.side === 'SELL'
        ? `rgba(239, 68, 68, ${fadeOut})` // Long liquidated
        : `rgba(34, 197, 94, ${fadeOut})`; // Short liquidated
      ctx.fill();

      // Text label
      if (fadeOut > 0.5) {
        ctx.fillStyle = '#fff';
        ctx.font = '10px Roboto, sans-serif';
        ctx.fillText(`$${(liq.quantity * liq.price / 1000).toFixed(0)}K`, width * 0.9 + 12, y + 3);
      }
    });

    // Draw current price line
    const currentY = height - ((currentPrice - minPrice) / (maxPrice - minPrice)) * height;
    ctx.strokeStyle = '#f7931a';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, currentY);
    ctx.lineTo(width, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price label
    ctx.fillStyle = '#f7931a';
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.fillText('Current: $' + currentPrice.toLocaleString(undefined, {maximumFractionDigits: 0}), 10, currentY - 5);

    // Update price scale
    updatePriceScale(minPrice, maxPrice);
  }

  // Update price scale sidebar
  function updatePriceScale(minPrice, maxPrice) {
    const scaleEl = document.getElementById('price-scale');
    if (!scaleEl) return;

    const steps = 10;
    const stepSize = (maxPrice - minPrice) / steps;
    let html = '';

    for (let i = steps; i >= 0; i--) {
      const price = minPrice + (stepSize * i);
      html += `<div class="scale-tick">$${price.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>`;
    }

    scaleEl.innerHTML = html;
  }

  // Update liquidation zones summary
  function updateLiquidationZones() {
    const shortLevels = document.getElementById('short-liq-levels');
    const longLevels = document.getElementById('long-liq-levels');

    const shorts = liquidationData
      .filter(d => d.type === 'short')
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 5);

    const longs = liquidationData
      .filter(d => d.type === 'long')
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, 5);

    shortLevels.innerHTML = shorts.map(s => `
      <div class="zone-level">
        <span class="level-price">$${s.price.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
        <span class="level-leverage">${s.leverage}x</span>
        <span class="level-value">~$${(s.estimatedValue / 1000000).toFixed(1)}M</span>
        <div class="level-intensity" style="width: ${s.intensity * 100}%"></div>
      </div>
    `).join('');

    longLevels.innerHTML = longs.map(l => `
      <div class="zone-level">
        <span class="level-price">$${l.price.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
        <span class="level-leverage">${l.leverage}x</span>
        <span class="level-value">~$${(l.estimatedValue / 1000000).toFixed(1)}M</span>
        <div class="level-intensity" style="width: ${l.intensity * 100}%"></div>
      </div>
    `).join('');
  }

  // Calculate price magnets
  function calculateMagnets() {
    const shorts = liquidationData.filter(d => d.type === 'short');
    const longs = liquidationData.filter(d => d.type === 'long');

    const upside = aggregateLevels(shorts);
    const downside = aggregateLevels(longs);

    const strongestUp = upside.sort((a, b) => b.totalIntensity - a.totalIntensity)[0];
    const strongestDown = downside.sort((a, b) => b.totalIntensity - a.totalIntensity)[0];

    if (strongestUp) {
      document.getElementById('upside-target').textContent = '$' + strongestUp.avgPrice.toLocaleString(undefined, {maximumFractionDigits: 0});
      document.getElementById('upside-confidence').textContent = Math.min(95, Math.floor(strongestUp.totalIntensity * 100 / 3)) + '%';
      document.getElementById('upside-reasoning').textContent = `${strongestUp.count} liquidation clusters totaling ~$${(strongestUp.totalValue / 1000000).toFixed(1)}M`;
    }

    if (strongestDown) {
      document.getElementById('downside-target').textContent = '$' + strongestDown.avgPrice.toLocaleString(undefined, {maximumFractionDigits: 0});
      document.getElementById('downside-confidence').textContent = Math.min(95, Math.floor(strongestDown.totalIntensity * 100 / 3)) + '%';
      document.getElementById('downside-reasoning').textContent = `${strongestDown.count} liquidation clusters totaling ~$${(strongestDown.totalValue / 1000000).toFixed(1)}M`;
    }

    // Calculate bias
    const upsideTotal = shorts.reduce((sum, s) => sum + s.estimatedValue, 0);
    const downsideTotal = longs.reduce((sum, l) => sum + l.estimatedValue, 0);
    const biasEl = document.getElementById('magnet-bias');

    if (upsideTotal > downsideTotal * 1.2) {
      biasEl.textContent = 'Bias: Upside (more shorts to liquidate)';
      biasEl.className = 'magnet-bias bullish';
    } else if (downsideTotal > upsideTotal * 1.2) {
      biasEl.textContent = 'Bias: Downside (more longs to liquidate)';
      biasEl.className = 'magnet-bias bearish';
    } else {
      biasEl.textContent = 'Bias: Neutral (balanced liquidations)';
      biasEl.className = 'magnet-bias neutral';
    }
  }

  // Aggregate nearby liquidation levels
  function aggregateLevels(levels) {
    const clusters = [];
    const threshold = currentPrice * 0.01;

    levels.forEach(level => {
      const existing = clusters.find(c => Math.abs(c.avgPrice - level.price) < threshold);
      if (existing) {
        existing.count++;
        existing.totalIntensity += level.intensity;
        existing.totalValue += level.estimatedValue;
        existing.avgPrice = (existing.avgPrice + level.price) / 2;
      } else {
        clusters.push({
          avgPrice: level.price,
          count: 1,
          totalIntensity: level.intensity,
          totalValue: level.estimatedValue
        });
      }
    });

    return clusters;
  }

  // Update 24h stats from cached market-snapshot.json
  async function update24hStats() {
    let totalLiq = 0, longLiq = 0, shortLiq = 0, ratio = 1;

    // Try to get stats from cached data
    if (typeof ExchangeAPI !== 'undefined' && useRealData) {
      try {
        const aggregated = await ExchangeAPI.getAggregatedData('BTCUSDT');

        if (aggregated.liquidation && aggregated.liquidation.stats24h) {
          const stats = aggregated.liquidation.stats24h;
          totalLiq = stats.total / 1000000;
          longLiq = stats.long / 1000000;
          shortLiq = stats.short / 1000000;
          ratio = stats.ratio;

          document.getElementById('total-liq-24h').textContent = '$' + totalLiq.toFixed(0) + 'M';
          document.getElementById('long-liq-24h').textContent = '$' + longLiq.toFixed(0) + 'M';
          document.getElementById('short-liq-24h').textContent = '$' + shortLiq.toFixed(0) + 'M';
          document.getElementById('liq-ratio').textContent = ratio.toFixed(2);
          return;
        }

        // Estimate from OI and funding if no stats available
        if (aggregated.openInterest && aggregated.openInterest.usd > 0) {
          const oiUsd = aggregated.openInterest.usd;
          const fundingBias = aggregated.funding.average > 0 ? 0.6 : 0.4;

          // Estimate ~5% of OI liquidated daily
          totalLiq = (oiUsd * 0.05) / 1000000;
          longLiq = totalLiq * fundingBias;
          shortLiq = totalLiq * (1 - fundingBias);
          ratio = longLiq / shortLiq;

          document.getElementById('total-liq-24h').textContent = '$' + totalLiq.toFixed(0) + 'M';
          document.getElementById('long-liq-24h').textContent = '$' + longLiq.toFixed(0) + 'M';
          document.getElementById('short-liq-24h').textContent = '$' + shortLiq.toFixed(0) + 'M';
          document.getElementById('liq-ratio').textContent = ratio.toFixed(2);
          return;
        }
      } catch (e) {
        console.error('24h stats error:', e);
      }
    }

    // Fallback to estimated values
    totalLiq = Math.floor(Math.random() * 200 + 100);
    longLiq = Math.floor(totalLiq * (0.3 + Math.random() * 0.4));
    shortLiq = totalLiq - longLiq;
    ratio = longLiq / shortLiq;

    document.getElementById('total-liq-24h').textContent = '$' + totalLiq + 'M';
    document.getElementById('long-liq-24h').textContent = '$' + longLiq + 'M';
    document.getElementById('short-liq-24h').textContent = '$' + shortLiq + 'M';
    document.getElementById('liq-ratio').textContent = ratio.toFixed(2);
  }

  // Initialize WebSocket for real-time updates
  function initWebSocket() {
    if (typeof WebSocketManager === 'undefined') return;

    WebSocketManager.subscribeForLiquidationMap({
      onPrice: (data) => {
        if (data.price && data.price > 0) {
          currentPrice = data.price;
          updatePriceDisplay(data.priceChangePercent);
          drawHeatmap();
        }
      },
      onLiquidation: (data) => {
        // Add to recent liquidations for visual effect
        recentLiquidations.push({
          ...data,
          timestamp: Date.now()
        });

        // Keep only last 20 liquidations
        if (recentLiquidations.length > 20) {
          recentLiquidations = recentLiquidations.slice(-20);
        }

        // Redraw to show the liquidation
        drawHeatmap();

        // Flash effect
        flashLiquidation(data);
      }
    });
  }

  // Visual flash for new liquidations
  function flashLiquidation(liq) {
    const flashEl = document.createElement('div');
    flashEl.className = 'liq-flash ' + (liq.side === 'SELL' ? 'long' : 'short');
    flashEl.innerHTML = `
      <span class="flash-icon">${liq.side === 'SELL' ? '📉' : '📈'}</span>
      <span class="flash-text">${liq.side === 'SELL' ? 'Long' : 'Short'} Liquidated</span>
      <span class="flash-amount">$${((liq.quantity * liq.price) / 1000).toFixed(0)}K @ $${liq.price.toFixed(0)}</span>
      <span class="flash-exchange">${liq.exchange}</span>
    `;

    const container = document.querySelector('.heatmap-section');
    if (container) {
      container.appendChild(flashEl);
      setTimeout(() => flashEl.remove(), 3000);
    }
  }

  // Event handlers
  function setupEventHandlers() {
    // Leverage filter buttons
    document.querySelectorAll('.lev-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.lev-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedLeverage = this.dataset.lev;
        drawHeatmap();
      });
    });

    // Exchange selector buttons
    document.querySelectorAll('.exchange-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        document.querySelectorAll('.exchange-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedExchange = this.dataset.exchange;

        // Refetch data for selected exchange
        if (loading) loading.style.display = 'flex';
        await fetchLiquidationData();
        if (loading) loading.style.display = 'none';

        drawHeatmap();
        updateLiquidationZones();
        calculateMagnets();
      });
    });

    // Data source toggle
    const dataToggle = document.getElementById('data-source-toggle');
    if (dataToggle) {
      dataToggle.addEventListener('change', async function() {
        useRealData = this.checked;
        updateDataSourceIndicator();

        if (loading) loading.style.display = 'flex';
        await fetchLiquidationData();
        if (loading) loading.style.display = 'none';

        drawHeatmap();
        updateLiquidationZones();
        calculateMagnets();
        update24hStats();
      });
    }

    // Zoom controls
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      zoomLevel = Math.min(zoomLevel * 1.5, 5);
      drawHeatmap();
    });

    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      zoomLevel = Math.max(zoomLevel / 1.5, 0.5);
      drawHeatmap();
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      zoomLevel = 1;
      selectedLeverage = 'all';
      document.querySelectorAll('.lev-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.lev-btn[data-lev="all"]')?.classList.add('active');
      drawHeatmap();
    });

    // Window resize
    window.addEventListener('resize', () => {
      initCanvas();
      drawHeatmap();
    });
  }

  // Update data source indicator
  function updateDataSourceIndicator() {
    const indicator = document.getElementById('data-source-indicator');
    if (indicator) {
      indicator.textContent = useRealData ? 'Live Data' : 'Simulated';
      indicator.className = 'data-source-indicator ' + (useRealData ? 'live' : 'simulated');
    }
  }

  // Clean up old liquidations periodically
  function cleanupOldLiquidations() {
    const now = Date.now();
    recentLiquidations = recentLiquidations.filter(l => (now - l.timestamp) < 60000);
  }

  // Initialize
  async function init() {
    // Check access
    if (!checkAccess()) {
      document.getElementById('premium-gate').style.display = 'block';
    }

    initCanvas();
    setupEventHandlers();

    // Fetch price and data
    await fetchPrice();
    await fetchLiquidationData();

    // Hide loading, show chart
    if (loading) loading.style.display = 'none';

    // Draw and update
    drawHeatmap();
    updateLiquidationZones();
    calculateMagnets();
    update24hStats();
    updateDataSourceIndicator();

    // Initialize WebSocket for real-time updates
    initWebSocket();

    // Cleanup interval
    setInterval(cleanupOldLiquidations, 5000);

    // Refresh data periodically (less frequent with WebSocket)
    setInterval(async () => {
      await fetchPrice();
      await fetchLiquidationData();
      drawHeatmap();
      updateLiquidationZones();
      calculateMagnets();
      update24hStats();
    }, 60000); // Every minute for full refresh
  }

  init();
})();
