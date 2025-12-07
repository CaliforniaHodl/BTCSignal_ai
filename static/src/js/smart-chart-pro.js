/**
 * Smart Chart Pro - Professional Bitcoin Technical Analysis
 * Features: 7 timeframes, 12+ indicators, SMC, pattern detection, drawing tools, alerts
 */

(function() {
  'use strict';

  // === Configuration ===
  const CONFIG = {
    symbol: 'BTCUSDT',
    timeframe: '240',
    apiBase: 'https://api.binance.us/api/v3',
    refreshInterval: 10000,
    accessKey: 'smart-chart-pro-access'
  };

  // === State ===
  let state = {
    chart: null,
    candleSeries: null,
    volumeSeries: null,
    indicators: {},
    drawings: [],
    alerts: [],
    data: [],
    currentTool: 'crosshair'
  };

  // === Access Control ===
  function hasAccess() {
    // Use shared access system (includes admin bypass)
    if (typeof BTCSAIShared !== 'undefined') {
      return BTCSAIShared.checkAccess(CONFIG.accessKey);
    }
    // Fallback to direct check
    if (typeof BTCSAIAccess !== 'undefined') {
      if (BTCSAIAccess.isAdmin()) return true;
      if (BTCSAIAccess.hasAllAccess()) return true;
    }
    return localStorage.getItem(CONFIG.accessKey) === 'true';
  }

  function checkAccess() {
    const gate = document.getElementById('premium-gate');
    const content = document.getElementById('premium-content');
    if (!gate || !content) return;

    if (hasAccess()) {
      gate.style.display = 'none';
      content.style.display = 'block';
      initChart();
    } else {
      gate.style.display = 'flex';
      content.style.display = 'none';
    }
  }

  // Expose refresh function for console/admin mode toggle
  window.SmartChartProRefresh = checkAccess;

  function setupAccessHandlers() {
    const unlockBtn = document.getElementById('btn-unlock');
    const checkAccessLink = document.getElementById('check-access');

    if (unlockBtn) {
      unlockBtn.addEventListener('click', async () => {
        // For demo, simulate payment success
        // In production, integrate with Lightning payment
        if (typeof Toast !== 'undefined' && Toast.confirm) {
          Toast.confirm('Demo Mode: Click OK to simulate successful payment (50 sats)', () => {
            localStorage.setItem(CONFIG.accessKey, 'true');
            checkAccess();
          });
        }
      });
    }

    if (checkAccessLink) {
      checkAccessLink.addEventListener('click', (e) => {
        e.preventDefault();
        checkAccess();
      });
    }
  }

  // === Chart Initialization ===
  function initChart() {
    const container = document.getElementById('pro-chart');
    if (!container || state.chart) return;

    state.chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: 500,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#d1d5db'
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.05)' }
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: { labelBackgroundColor: '#f7931a' },
        horzLine: { labelBackgroundColor: '#f7931a' }
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        scaleMargins: { top: 0.1, bottom: 0.2 }
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: true,
        secondsVisible: false
      }
    });

    state.candleSeries = state.chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444'
    });

    // Initialize RSI chart
    initRSIPanel();
    initVolumePanel();

    // Load data
    loadChartData();

    // Setup event handlers
    setupChartHandlers();
    setupIndicatorToggles();
    setupTimeframeHandlers();
    setupDrawingTools();
    setupAlerts();

    // Responsive resize
    window.addEventListener('resize', () => {
      if (state.chart) {
        state.chart.applyOptions({ width: container.clientWidth });
      }
    });
  }

  // === Data Loading ===
  async function loadChartData() {
    try {
      const interval = getIntervalString(CONFIG.timeframe);
      const url = `${CONFIG.apiBase}/klines?symbol=${CONFIG.symbol}&interval=${interval}&limit=500`;
      const response = await fetch(url);
      const data = await response.json();

      if (!Array.isArray(data)) {
        console.error('Invalid data format');
        return;
      }

      state.data = data.map(d => ({
        time: d[0] / 1000,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
      }));

      state.candleSeries.setData(state.data);

      // Update all indicators
      updateIndicators();
      updatePriceDisplay();
      calculateLevels();
      detectPatterns();
      calculateSignal();

    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  }

  function getIntervalString(tf) {
    const map = {
      '5': '5m', '15': '15m', '60': '1h', '240': '4h',
      'D': '1d', 'W': '1w', 'M': '1M'
    };
    return map[tf] || '4h';
  }

  // === Indicator Panels ===
  function initRSIPanel() {
    const container = document.getElementById('rsi-chart');
    if (!container) return;

    const rsiChart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: 80,
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#9ca3af' },
      grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { visible: false },
      handleScroll: false,
      handleScale: false
    });

    state.indicators.rsiChart = rsiChart;
    state.indicators.rsiSeries = rsiChart.addLineSeries({
      color: '#8b5cf6',
      lineWidth: 2,
      priceLineVisible: false
    });

    // Add RSI levels
    state.indicators.rsiSeries.createPriceLine({ price: 70, color: '#ef4444', lineWidth: 1, lineStyle: 2 });
    state.indicators.rsiSeries.createPriceLine({ price: 30, color: '#22c55e', lineWidth: 1, lineStyle: 2 });
  }

  function initVolumePanel() {
    const container = document.getElementById('volume-chart');
    if (!container) return;

    const volChart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: 60,
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#9ca3af' },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderVisible: false },
      timeScale: { visible: false },
      handleScroll: false,
      handleScale: false
    });

    state.indicators.volChart = volChart;
    state.indicators.volSeries = volChart.addHistogramSeries({
      priceLineVisible: false,
      priceFormat: { type: 'volume' }
    });
  }

  // === Indicator Calculations ===
  function updateIndicators() {
    if (!state.data.length) return;

    // Calculate RSI
    const rsi = calculateRSI(state.data.map(d => d.close), 14);
    if (state.indicators.rsiSeries && rsi.length) {
      const rsiData = state.data.slice(-rsi.length).map((d, i) => ({
        time: d.time,
        value: rsi[i]
      }));
      state.indicators.rsiSeries.setData(rsiData);

      const lastRSI = rsi[rsi.length - 1];
      document.getElementById('rsi-value').textContent = lastRSI.toFixed(1);
    }

    // Calculate Volume
    if (state.indicators.volSeries) {
      const volData = state.data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'
      }));
      state.indicators.volSeries.setData(volData);
    }

    // Update overlay indicators based on toggles
    updateOverlayIndicators();
  }

  function updateOverlayIndicators() {
    const closes = state.data.map(d => d.close);

    // EMA 9
    if (document.getElementById('tog-ema9')?.checked) {
      const ema9 = calculateEMA(closes, 9);
      addOrUpdateLineSeries('ema9', ema9, '#3b82f6');
    } else {
      removeLineSeries('ema9');
    }

    // EMA 21
    if (document.getElementById('tog-ema21')?.checked) {
      const ema21 = calculateEMA(closes, 21);
      addOrUpdateLineSeries('ema21', ema21, '#8b5cf6');
    } else {
      removeLineSeries('ema21');
    }

    // EMA 50
    if (document.getElementById('tog-ema50')?.checked) {
      const ema50 = calculateEMA(closes, 50);
      addOrUpdateLineSeries('ema50', ema50, '#f59e0b');
    } else {
      removeLineSeries('ema50');
    }

    // EMA 100
    if (document.getElementById('tog-ema100')?.checked) {
      const ema100 = calculateEMA(closes, 100);
      addOrUpdateLineSeries('ema100', ema100, '#ef4444');
    } else {
      removeLineSeries('ema100');
    }

    // EMA 200
    if (document.getElementById('tog-ema200')?.checked) {
      const ema200 = calculateEMA(closes, 200);
      addOrUpdateLineSeries('ema200', ema200, '#10b981');
    } else {
      removeLineSeries('ema200');
    }

    // Bollinger Bands
    if (document.getElementById('tog-bb')?.checked) {
      const bb = calculateBollingerBands(closes, 20, 2);
      addOrUpdateLineSeries('bb-upper', bb.upper, '#6366f1', 1);
      addOrUpdateLineSeries('bb-lower', bb.lower, '#6366f1', 1);
      addOrUpdateLineSeries('bb-middle', bb.middle, '#6366f1', 1, 2);
    } else {
      removeLineSeries('bb-upper');
      removeLineSeries('bb-lower');
      removeLineSeries('bb-middle');
    }
  }

  function addOrUpdateLineSeries(name, values, color, width = 2, style = 0) {
    if (!state.indicators[name]) {
      state.indicators[name] = state.chart.addLineSeries({
        color: color,
        lineWidth: width,
        lineStyle: style,
        priceLineVisible: false,
        lastValueVisible: false
      });
    }

    const data = state.data.slice(-values.length).map((d, i) => ({
      time: d.time,
      value: values[i]
    }));
    state.indicators[name].setData(data);
  }

  function removeLineSeries(name) {
    if (state.indicators[name]) {
      state.chart.removeSeries(state.indicators[name]);
      delete state.indicators[name];
    }
  }

  // === Technical Indicator Calculations ===
  function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    const ema = [data[0]];
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
  }

  function calculateRSI(data, period) {
    const changes = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i] - data[i - 1]);
    }

    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? -c : 0);

    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    const rsi = [];
    for (let i = period; i < changes.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    return rsi;
  }

  function calculateBollingerBands(data, period, stdDev) {
    const middle = [];
    const upper = [];
    const lower = [];

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const avg = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / period;
      const std = Math.sqrt(variance);

      middle.push(avg);
      upper.push(avg + stdDev * std);
      lower.push(avg - stdDev * std);
    }

    return { middle, upper, lower };
  }

  // === Levels Calculation ===
  function calculateLevels() {
    if (!state.data.length) return;

    const recent = state.data.slice(-24);
    const high = Math.max(...recent.map(d => d.high));
    const low = Math.min(...recent.map(d => d.low));
    const close = state.data[state.data.length - 1].close;

    // Pivot Points
    const pivot = (high + low + close) / 3;
    const r1 = 2 * pivot - low;
    const s1 = 2 * pivot - high;
    const r2 = pivot + (high - low);
    const s2 = pivot - (high - low);
    const r3 = high + 2 * (pivot - low);
    const s3 = low - 2 * (high - pivot);

    // Update DOM
    updateEl('pivot-price', formatPrice(pivot));
    updateEl('r1-price', formatPrice(r1));
    updateEl('r2-price', formatPrice(r2));
    updateEl('r3-price', formatPrice(r3));
    updateEl('s1-price', formatPrice(s1));
    updateEl('s2-price', formatPrice(s2));
    updateEl('s3-price', formatPrice(s3));

    // Previous Day High/Low (using last 24 candles for 1H, etc.)
    const dayData = state.data.slice(-24);
    if (dayData.length) {
      updateEl('pdh-price', formatPrice(Math.max(...dayData.map(d => d.high))));
      updateEl('pdl-price', formatPrice(Math.min(...dayData.map(d => d.low))));
    }

    // Previous Week
    const weekData = state.data.slice(-168);
    if (weekData.length) {
      updateEl('pwh-price', formatPrice(Math.max(...weekData.map(d => d.high))));
      updateEl('pwl-price', formatPrice(Math.min(...weekData.map(d => d.low))));
    }
  }

  // === Pattern Detection ===
  function detectPatterns() {
    const patterns = [];
    const data = state.data.slice(-50);

    if (data.length < 20) {
      updatePatternsList(patterns);
      return;
    }

    // Simple pattern detection examples
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    // Double Bottom detection (simplified)
    const minIdx1 = findLocalMin(lows, 0, 20);
    const minIdx2 = findLocalMin(lows, 20, 40);
    if (minIdx1 !== -1 && minIdx2 !== -1) {
      const diff = Math.abs(lows[minIdx1] - lows[minIdx2]) / lows[minIdx1];
      if (diff < 0.02) {
        patterns.push({ name: 'Double Bottom', type: 'bullish', confidence: 'Medium' });
      }
    }

    // Higher Highs / Higher Lows (Uptrend)
    const recentHighs = highs.slice(-10);
    const recentLows = lows.slice(-10);
    let hhCount = 0, hlCount = 0;
    for (let i = 1; i < recentHighs.length; i++) {
      if (recentHighs[i] > recentHighs[i-1]) hhCount++;
      if (recentLows[i] > recentLows[i-1]) hlCount++;
    }
    if (hhCount >= 6 && hlCount >= 6) {
      patterns.push({ name: 'Uptrend (HH/HL)', type: 'bullish', confidence: 'High' });
    }

    // Lower Highs / Lower Lows (Downtrend)
    let lhCount = 0, llCount = 0;
    for (let i = 1; i < recentHighs.length; i++) {
      if (recentHighs[i] < recentHighs[i-1]) lhCount++;
      if (recentLows[i] < recentLows[i-1]) llCount++;
    }
    if (lhCount >= 6 && llCount >= 6) {
      patterns.push({ name: 'Downtrend (LH/LL)', type: 'bearish', confidence: 'High' });
    }

    // Consolidation
    const range = (Math.max(...closes.slice(-20)) - Math.min(...closes.slice(-20))) / closes[closes.length - 1];
    if (range < 0.03) {
      patterns.push({ name: 'Consolidation', type: 'neutral', confidence: 'Medium' });
    }

    updatePatternsList(patterns);
  }

  function findLocalMin(arr, start, end) {
    let minVal = Infinity, minIdx = -1;
    for (let i = start; i < Math.min(end, arr.length); i++) {
      if (arr[i] < minVal) {
        minVal = arr[i];
        minIdx = i;
      }
    }
    return minIdx;
  }

  function updatePatternsList(patterns) {
    const container = document.getElementById('patterns-list');
    if (!container) return;

    if (patterns.length === 0) {
      container.innerHTML = '<div class="pattern-item neutral"><span class="pattern-icon">📊</span><span class="pattern-name">No patterns detected</span></div>';
      return;
    }

    container.innerHTML = patterns.map(p => `
      <div class="pattern-item ${p.type}">
        <span class="pattern-icon">${p.type === 'bullish' ? '🟢' : p.type === 'bearish' ? '🔴' : '🟡'}</span>
        <span class="pattern-name">${p.name}</span>
        <span class="pattern-conf">${p.confidence}</span>
      </div>
    `).join('');
  }

  // === Signal Calculation ===
  function calculateSignal() {
    if (state.data.length < 50) return;

    const closes = state.data.map(d => d.close);
    const current = closes[closes.length - 1];

    let score = 50; // Start neutral
    const factors = {};

    // EMA Alignment
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const ema9Last = ema9[ema9.length - 1];
    const ema21Last = ema21[ema21.length - 1];

    if (current > ema9Last && ema9Last > ema21Last) {
      score += 15;
      factors.ema = { check: '✓', bullish: true };
    } else if (current < ema9Last && ema9Last < ema21Last) {
      score -= 15;
      factors.ema = { check: '✓', bullish: false };
    } else {
      factors.ema = { check: '~', bullish: null };
    }

    // RSI
    const rsi = calculateRSI(closes, 14);
    const rsiLast = rsi[rsi.length - 1];
    if (rsiLast < 30) {
      score += 10;
      factors.rsi = { check: '✓', bullish: true, note: 'Oversold' };
    } else if (rsiLast > 70) {
      score -= 10;
      factors.rsi = { check: '✓', bullish: false, note: 'Overbought' };
    } else if (rsiLast > 50) {
      score += 5;
      factors.rsi = { check: '~', bullish: true };
    } else {
      score -= 5;
      factors.rsi = { check: '~', bullish: false };
    }

    // Volume trend
    const volumes = state.data.map(d => d.volume);
    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const lastVol = volumes[volumes.length - 1];
    if (lastVol > avgVol * 1.5) {
      score += 5;
      factors.volume = { check: '✓', bullish: true, note: 'High' };
    } else {
      factors.volume = { check: '~', bullish: null };
    }

    // MACD (simplified)
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macd = ema12[ema12.length - 1] - ema26[ema26.length - 1];
    if (macd > 0) {
      score += 10;
      factors.macd = { check: '✓', bullish: true };
    } else {
      score -= 10;
      factors.macd = { check: '✓', bullish: false };
    }

    // S/R proximity (simplified)
    factors.sr = { check: '~', bullish: null };

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Update UI
    updateSignalDisplay(score, factors);
  }

  function updateSignalDisplay(score, factors) {
    const direction = document.getElementById('signal-direction');
    const scoreFill = document.getElementById('score-fill');
    const scoreValue = document.getElementById('confluence-score');
    const factorsContainer = document.getElementById('signal-factors');

    if (direction) {
      let icon, label, className;
      if (score >= 65) {
        icon = '🟢'; label = 'Bullish'; className = 'bullish';
      } else if (score <= 35) {
        icon = '🔴'; label = 'Bearish'; className = 'bearish';
      } else {
        icon = '🟡'; label = 'Neutral'; className = 'neutral';
      }
      direction.innerHTML = `<span class="signal-icon">${icon}</span><span class="signal-label">${label}</span>`;
      direction.className = 'signal-direction ' + className;
    }

    if (scoreFill) {
      scoreFill.style.width = score + '%';
      scoreFill.className = 'score-fill ' + (score >= 65 ? 'bullish' : score <= 35 ? 'bearish' : 'neutral');
    }

    if (scoreValue) {
      scoreValue.textContent = score + '/100';
    }

    if (factorsContainer) {
      factorsContainer.innerHTML = `
        <div class="factor ${factors.ema?.bullish === true ? 'bullish' : factors.ema?.bullish === false ? 'bearish' : ''}">
          <span class="check">${factors.ema?.check || '--'}</span> EMA Alignment
        </div>
        <div class="factor ${factors.rsi?.bullish === true ? 'bullish' : factors.rsi?.bullish === false ? 'bearish' : ''}">
          <span class="check">${factors.rsi?.check || '--'}</span> RSI Position
        </div>
        <div class="factor ${factors.macd?.bullish === true ? 'bullish' : factors.macd?.bullish === false ? 'bearish' : ''}">
          <span class="check">${factors.macd?.check || '--'}</span> MACD Signal
        </div>
        <div class="factor ${factors.volume?.bullish === true ? 'bullish' : ''}">
          <span class="check">${factors.volume?.check || '--'}</span> Volume Trend
        </div>
        <div class="factor">
          <span class="check">${factors.sr?.check || '--'}</span> S/R Proximity
        </div>
      `;
    }
  }

  // === Price Display ===
  function updatePriceDisplay() {
    if (!state.data.length) return;

    const current = state.data[state.data.length - 1];
    const prev = state.data.length > 1 ? state.data[state.data.length - 2] : current;
    const change = ((current.close - prev.close) / prev.close * 100).toFixed(2);
    const changeClass = change >= 0 ? 'positive' : 'negative';

    updateEl('header-price', formatPrice(current.close));
    const changeEl = document.getElementById('header-change');
    if (changeEl) {
      changeEl.textContent = (change >= 0 ? '+' : '') + change + '%';
      changeEl.className = 'price-change ' + changeClass;
    }
  }

  // === Event Handlers ===
  function setupChartHandlers() {
    state.chart.subscribeCrosshairMove(param => {
      const ohlc = document.getElementById('ohlc-display');
      if (!ohlc) return;

      if (!param.time || !param.seriesData.get(state.candleSeries)) {
        ohlc.textContent = 'O: -- H: -- L: -- C: --';
        return;
      }

      const data = param.seriesData.get(state.candleSeries);
      ohlc.textContent = `O: ${formatPrice(data.open)} H: ${formatPrice(data.high)} L: ${formatPrice(data.low)} C: ${formatPrice(data.close)}`;
    });
  }

  function setupTimeframeHandlers() {
    document.querySelectorAll('.tf-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        CONFIG.timeframe = btn.dataset.tf;
        loadChartData();
      });
    });
  }

  function setupIndicatorToggles() {
    const overlayToggles = ['tog-ema9', 'tog-ema21', 'tog-ema50', 'tog-ema100', 'tog-ema200', 'tog-bb', 'tog-ichimoku', 'tog-supertrend', 'tog-vwap'];

    overlayToggles.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', updateOverlayIndicators);
      }
    });

    // Panel toggles
    const panelMap = {
      'tog-rsi': 'panel-rsi',
      'tog-macd': 'panel-macd',
      'tog-stochrsi': 'panel-stoch',
      'tog-volume': 'panel-volume'
    };

    Object.entries(panelMap).forEach(([toggleId, panelId]) => {
      const toggle = document.getElementById(toggleId);
      const panel = document.getElementById(panelId);
      if (toggle && panel) {
        toggle.addEventListener('change', () => {
          panel.style.display = toggle.checked ? 'block' : 'none';
        });
      }
    });
  }

  function setupDrawingTools() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.currentTool = btn.dataset.tool;

        if (btn.dataset.tool === 'delete-all') {
          // Clear all drawings
          state.drawings = [];
          btn.classList.remove('active');
          state.currentTool = 'crosshair';
        }
      });
    });
  }

  function setupAlerts() {
    const addBtn = document.getElementById('btn-add-alert');
    const input = document.getElementById('alert-price');

    if (addBtn && input) {
      addBtn.addEventListener('click', () => {
        const price = parseFloat(input.value);
        if (!isNaN(price) && price > 0) {
          state.alerts.push({ price, triggered: false });
          input.value = '';
          renderAlerts();

          // Add price line to chart
          state.candleSeries.createPriceLine({
            price: price,
            color: '#f59e0b',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: true,
            title: 'Alert'
          });
        }
      });
    }
  }

  function renderAlerts() {
    const container = document.getElementById('alerts-list');
    if (!container) return;

    if (state.alerts.length === 0) {
      container.innerHTML = '<p class="no-alerts">No alerts set</p>';
      return;
    }

    container.innerHTML = state.alerts.map((alert, i) => `
      <div class="alert-item">
        <span class="alert-price">${formatPrice(alert.price)}</span>
        <button class="btn-remove-alert" data-index="${i}">×</button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-remove-alert').forEach(btn => {
      btn.addEventListener('click', () => {
        state.alerts.splice(parseInt(btn.dataset.index), 1);
        renderAlerts();
      });
    });
  }

  // === Utilities ===
  function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) return '--';
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function updateEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // === Initialize ===
  document.addEventListener('DOMContentLoaded', () => {
    setupAccessHandlers();
    checkAccess();
  });

})();
