// Liquidation Map - Interactive Heatmap Visualization
// Shows liquidation levels and price magnets for BTC

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

  // Fetch current price
  async function fetchPrice() {
    try {
      const res = await fetch('https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT');
      const data = await res.json();
      currentPrice = parseFloat(data.lastPrice);

      document.getElementById('current-btc').textContent = '$' + currentPrice.toLocaleString(undefined, {maximumFractionDigits: 0});

      const change = parseFloat(data.priceChangePercent);
      const changeEl = document.getElementById('price-change-24h');
      changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
      changeEl.className = 'change ' + (change >= 0 ? 'positive' : 'negative');

      document.getElementById('magnet-current').textContent = '$' + currentPrice.toLocaleString(undefined, {maximumFractionDigits: 0});

      return currentPrice;
    } catch (e) {
      console.error('Failed to fetch price:', e);
      return 0;
    }
  }

  // Generate simulated liquidation data based on price levels
  // In production, this would come from exchange APIs or data providers
  function generateLiquidationData(price) {
    const data = [];
    const range = price * 0.15; // 15% range above and below

    // Generate liquidation clusters at key levels
    const leverageLevels = [10, 25, 50, 100];

    leverageLevels.forEach(leverage => {
      // Longs get liquidated below price
      const longLiqDistance = price / leverage;
      for (let i = 1; i <= 5; i++) {
        const level = price - (longLiqDistance * i * 0.5);
        const intensity = Math.random() * 0.5 + 0.3 + (1 / leverage); // Higher leverage = more intense
        data.push({
          price: level,
          type: 'long',
          leverage: leverage,
          intensity: Math.min(intensity, 1),
          estimatedValue: Math.floor(Math.random() * 50 + 10) * leverage * 100000
        });
      }

      // Shorts get liquidated above price
      for (let i = 1; i <= 5; i++) {
        const level = price + (longLiqDistance * i * 0.5);
        const intensity = Math.random() * 0.5 + 0.3 + (1 / leverage);
        data.push({
          price: level,
          type: 'short',
          leverage: leverage,
          intensity: Math.min(intensity, 1),
          estimatedValue: Math.floor(Math.random() * 50 + 10) * leverage * 100000
        });
      }
    });

    // Add some random clusters for realism
    for (let i = 0; i < 20; i++) {
      const randomOffset = (Math.random() - 0.5) * range * 2;
      const level = price + randomOffset;
      const type = level > price ? 'short' : 'long';
      data.push({
        price: level,
        type: type,
        leverage: leverageLevels[Math.floor(Math.random() * leverageLevels.length)],
        intensity: Math.random() * 0.6 + 0.2,
        estimatedValue: Math.floor(Math.random() * 100 + 5) * 100000
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

      // Color based on type
      let color;
      if (liq.type === 'long') {
        // Red gradient for longs (below price)
        const alpha = liq.intensity * 0.8;
        color = `rgba(239, 68, 68, ${alpha})`;
      } else {
        // Green gradient for shorts (above price)
        const alpha = liq.intensity * 0.8;
        color = `rgba(34, 197, 94, ${alpha})`;
      }

      ctx.fillStyle = color;
      ctx.fillRect(width - barWidth, y - 2, barWidth, 4);

      // Add glow effect for high intensity
      if (liq.intensity > 0.7) {
        ctx.shadowColor = liq.type === 'long' ? '#ef4444' : '#22c55e';
        ctx.shadowBlur = 10;
        ctx.fillRect(width - barWidth, y - 2, barWidth, 4);
        ctx.shadowBlur = 0;
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

    // Get top liquidation zones
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
    // Find the strongest liquidation clusters above and below
    const shorts = liquidationData.filter(d => d.type === 'short');
    const longs = liquidationData.filter(d => d.type === 'long');

    // Aggregate nearby levels
    const upside = aggregateLevels(shorts);
    const downside = aggregateLevels(longs);

    // Find strongest magnet
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
    const threshold = currentPrice * 0.01; // 1% grouping

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

  // Update 24h stats
  function update24hStats() {
    // Simulated stats - in production would come from API
    const totalLiq = Math.floor(Math.random() * 200 + 100);
    const longLiq = Math.floor(totalLiq * (0.3 + Math.random() * 0.4));
    const shortLiq = totalLiq - longLiq;
    const ratio = (longLiq / shortLiq).toFixed(2);

    document.getElementById('total-liq-24h').textContent = '$' + totalLiq + 'M';
    document.getElementById('long-liq-24h').textContent = '$' + longLiq + 'M';
    document.getElementById('short-liq-24h').textContent = '$' + shortLiq + 'M';
    document.getElementById('liq-ratio').textContent = ratio;
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

  // Initialize
  async function init() {
    // Check access
    if (!checkAccess()) {
      document.getElementById('premium-gate').style.display = 'block';
    }

    initCanvas();
    setupEventHandlers();

    // Fetch price and generate data
    await fetchPrice();
    liquidationData = generateLiquidationData(currentPrice);

    // Hide loading, show chart
    if (loading) loading.style.display = 'none';

    // Draw and update
    drawHeatmap();
    updateLiquidationZones();
    calculateMagnets();
    update24hStats();

    // Refresh periodically
    setInterval(async () => {
      await fetchPrice();
      liquidationData = generateLiquidationData(currentPrice);
      drawHeatmap();
      updateLiquidationZones();
      calculateMagnets();
      update24hStats();
    }, 30000);
  }

  init();
})();
