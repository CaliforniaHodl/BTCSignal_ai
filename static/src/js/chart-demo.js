/**
 * TradingView-style Chart
 * Candlestick chart with overlay indicators and drawing tools
 */

(function() {
  'use strict';

  // Chart instances
  let mainChart = null;
  let volumeChart = null;
  let rsiChart = null;
  let macdChart = null;
  let stochChart = null;

  // Series references
  let candleSeries = null;
  let volumeSeries = null;
  let rsiSeries = null;
  let macdLineSeries = null;
  let macdSignalSeries = null;
  let macdHistogramSeries = null;
  let stochKSeries = null;
  let stochDSeries = null;

  // Overlay series
  let ema9Series = null;
  let ema21Series = null;
  let ema50Series = null;
  let bbUpperSeries = null;
  let bbMiddleSeries = null;
  let bbLowerSeries = null;
  let vwapSeries = null;
  let supertrendSeries = null;

  // Ichimoku series
  let tenkanSeries = null;
  let kijunSeries = null;
  let chikouSeries = null;

  // Drawing state
  let drawings = [];
  let currentTool = 'crosshair';
  let isDrawing = false;
  let drawingStart = null;
  let horizontalLines = [];
  let trendLines = [];
  let fibLevels = [];

  // Current data
  let ohlcData = [];
  let currentTimeframe = '240';

  // Chart colors
  const colors = {
    background: '#0d1117',
    grid: '#21262d',
    text: '#8d96a0',
    textBright: '#e6edf3',
    bullish: '#3fb950',
    bearish: '#f85149',
    ema9: '#58a6ff',
    ema21: '#a371f7',
    ema50: '#f7931a',
    bbLine: '#58a6ff',
    vwap: '#d29922',
    macdLine: '#58a6ff',
    macdSignal: '#f7931a',
    macdHistPos: '#3fb950',
    macdHistNeg: '#f85149',
    rsiLine: '#a371f7',
    stochK: '#58a6ff',
    stochD: '#f7931a',
    supertrend: { up: '#3fb950', down: '#f85149' },
    ichimoku: { tenkan: '#58a6ff', kijun: '#f85149', chikou: '#a371f7' },
    drawing: { line: '#f7931a', horizontal: '#58a6ff', fib: '#a371f7' }
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    if (typeof LightweightCharts === 'undefined') {
      console.error('Lightweight Charts not loaded');
      return;
    }
    createCharts();
    setupEventListeners();
    setupDrawingTools();
    await loadData(currentTimeframe);
    updatePriceInfo();
  }

  function createCharts() {
    const chartOptions = {
      layout: { background: { type: 'solid', color: colors.background }, textColor: colors.text },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: { color: colors.text, width: 1, style: LightweightCharts.LineStyle.Dashed },
        horzLine: { color: colors.text, width: 1, style: LightweightCharts.LineStyle.Dashed }
      },
      rightPriceScale: { borderColor: colors.grid, scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: colors.grid, timeVisible: true, secondsVisible: false },
      handleScroll: { vertTouchDrag: false }
    };

    const mainChartEl = document.getElementById('main-chart');
    if (!mainChartEl) return;

    mainChart = LightweightCharts.createChart(mainChartEl, { ...chartOptions, height: 450 });

    candleSeries = mainChart.addCandlestickSeries({
      upColor: colors.bullish, downColor: colors.bearish,
      borderUpColor: colors.bullish, borderDownColor: colors.bearish,
      wickUpColor: colors.bullish, wickDownColor: colors.bearish
    });

    // EMAs
    ema9Series = mainChart.addLineSeries({ color: colors.ema9, lineWidth: 1, title: 'EMA 9', visible: true });
    ema21Series = mainChart.addLineSeries({ color: colors.ema21, lineWidth: 1, title: 'EMA 21', visible: true });
    ema50Series = mainChart.addLineSeries({ color: colors.ema50, lineWidth: 1, title: 'EMA 50', visible: false });

    // Bollinger Bands
    bbUpperSeries = mainChart.addLineSeries({ color: colors.bbLine, lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, visible: false });
    bbMiddleSeries = mainChart.addLineSeries({ color: colors.bbLine, lineWidth: 1, visible: false });
    bbLowerSeries = mainChart.addLineSeries({ color: colors.bbLine, lineWidth: 1, lineStyle: LightweightCharts.LineStyle.Dashed, visible: false });

    // VWAP
    vwapSeries = mainChart.addLineSeries({ color: colors.vwap, lineWidth: 2, title: 'VWAP', visible: false });

    // Supertrend
    supertrendSeries = mainChart.addLineSeries({ color: colors.supertrend.up, lineWidth: 2, title: 'Supertrend', visible: false });

    // Ichimoku
    tenkanSeries = mainChart.addLineSeries({ color: colors.ichimoku.tenkan, lineWidth: 1, title: 'Tenkan', visible: false });
    kijunSeries = mainChart.addLineSeries({ color: colors.ichimoku.kijun, lineWidth: 1, title: 'Kijun', visible: false });
    chikouSeries = mainChart.addLineSeries({ color: colors.ichimoku.chikou, lineWidth: 1, title: 'Chikou', visible: false });

    // Volume chart
    const volumeChartEl = document.getElementById('volume-chart');
    if (volumeChartEl) {
      volumeChart = LightweightCharts.createChart(volumeChartEl, { ...chartOptions, height: 80 });
      volumeSeries = volumeChart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
      volumeChart.priceScale('').applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });
    }

    // RSI chart
    const rsiChartEl = document.getElementById('rsi-chart');
    if (rsiChartEl) {
      rsiChart = LightweightCharts.createChart(rsiChartEl, { ...chartOptions, height: 100 });
      rsiSeries = rsiChart.addLineSeries({ color: colors.rsiLine, lineWidth: 2, priceScaleId: 'right' });
      rsiChart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
    }

    // MACD chart
    const macdChartEl = document.getElementById('macd-chart');
    if (macdChartEl) {
      macdChart = LightweightCharts.createChart(macdChartEl, { ...chartOptions, height: 100 });
      macdLineSeries = macdChart.addLineSeries({ color: colors.macdLine, lineWidth: 2 });
      macdSignalSeries = macdChart.addLineSeries({ color: colors.macdSignal, lineWidth: 1 });
      macdHistogramSeries = macdChart.addHistogramSeries({ priceFormat: { type: 'price' } });
    }

    // Stochastic RSI chart
    const stochChartEl = document.getElementById('stoch-chart');
    if (stochChartEl) {
      stochChart = LightweightCharts.createChart(stochChartEl, { ...chartOptions, height: 100 });
      stochKSeries = stochChart.addLineSeries({ color: colors.stochK, lineWidth: 2, title: '%K' });
      stochDSeries = stochChart.addLineSeries({ color: colors.stochD, lineWidth: 1, title: '%D' });
      stochChart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
    }

    const chartsToSync = [mainChart, volumeChart, rsiChart, macdChart, stochChart].filter(Boolean);
    syncCharts(chartsToSync);
    mainChart.subscribeCrosshairMove(updateLegend);
  }

  function syncCharts(charts) {
    charts.forEach((chart, index) => {
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        charts.forEach((otherChart, otherIndex) => {
          if (index !== otherIndex && otherChart) {
            otherChart.timeScale().setVisibleLogicalRange(range);
          }
        });
      });
    });
  }

  function setupEventListeners() {
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentTimeframe = e.target.dataset.tf;
        await loadData(currentTimeframe);
      });
    });

    const toggles = {
      'toggle-ema9': () => ema9Series?.applyOptions({ visible: document.getElementById('toggle-ema9')?.checked }),
      'toggle-ema21': () => ema21Series?.applyOptions({ visible: document.getElementById('toggle-ema21')?.checked }),
      'toggle-ema50': () => ema50Series?.applyOptions({ visible: document.getElementById('toggle-ema50')?.checked }),
      'toggle-bb': () => {
        const v = document.getElementById('toggle-bb')?.checked;
        bbUpperSeries?.applyOptions({ visible: v });
        bbMiddleSeries?.applyOptions({ visible: v });
        bbLowerSeries?.applyOptions({ visible: v });
      },
      'toggle-vwap': () => vwapSeries?.applyOptions({ visible: document.getElementById('toggle-vwap')?.checked }),
      'toggle-supertrend': () => supertrendSeries?.applyOptions({ visible: document.getElementById('toggle-supertrend')?.checked }),
      'toggle-ichimoku': () => {
        const v = document.getElementById('toggle-ichimoku')?.checked;
        tenkanSeries?.applyOptions({ visible: v });
        kijunSeries?.applyOptions({ visible: v });
        chikouSeries?.applyOptions({ visible: v });
      }
    };

    Object.entries(toggles).forEach(([id, handler]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', handler);
    });

    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const toolId = e.currentTarget.id.replace('tool-', '');
        if (toolId === 'clear') {
          clearDrawings();
        } else {
          document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          currentTool = toolId;
          updateCursor();
        }
      });
    });

    window.addEventListener('resize', handleResize);
  }

  function setupDrawingTools() {
    const chartContainer = document.getElementById('main-chart');
    if (!chartContainer || !mainChart) return;

    const drawingCanvas = document.createElement('canvas');
    drawingCanvas.id = 'drawing-canvas';
    drawingCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;';
    chartContainer.style.position = 'relative';
    chartContainer.appendChild(drawingCanvas);

    function resizeDrawingCanvas() {
      drawingCanvas.width = chartContainer.clientWidth;
      drawingCanvas.height = chartContainer.clientHeight;
      redrawAllDrawings();
    }
    resizeDrawingCanvas();
    window.addEventListener('resize', resizeDrawingCanvas);

    chartContainer.addEventListener('mousedown', handleDrawingStart);
    chartContainer.addEventListener('mousemove', handleDrawingMove);
    chartContainer.addEventListener('mouseup', handleDrawingEnd);
    chartContainer.addEventListener('mouseleave', handleDrawingEnd);

    mainChart.subscribeCrosshairMove((param) => {
      if (param.point) {
        window.lastChartPoint = param.point;
        window.lastChartTime = param.time;
      }
    });
  }

  function handleDrawingStart(e) {
    if (currentTool === 'crosshair') return;
    isDrawing = true;
    const rect = e.currentTarget.getBoundingClientRect();
    drawingStart = { x: e.clientX - rect.left, y: e.clientY - rect.top, price: getPriceFromY(e.clientY - rect.top) };
  }

  function handleDrawingMove(e) {
    if (!isDrawing || currentTool === 'crosshair') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    drawPreview(drawingStart, currentPoint);
  }

  function handleDrawingEnd(e) {
    if (!isDrawing || currentTool === 'crosshair') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const endPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top, price: getPriceFromY(e.clientY - rect.top) };

    if (currentTool === 'horizontal') addHorizontalLine(drawingStart.price);
    else if (currentTool === 'trendline') addTrendLine(drawingStart, endPoint);
    else if (currentTool === 'fib') addFibonacci(drawingStart, endPoint);

    isDrawing = false;
    drawingStart = null;
  }

  function getPriceFromY(y) {
    const chartHeight = document.getElementById('main-chart')?.clientHeight || 450;
    const priceRange = mainChart.priceScale('right').getVisiblePriceRange();
    if (!priceRange) return 0;
    const ratio = y / chartHeight;
    return priceRange.maxValue - (ratio * (priceRange.maxValue - priceRange.minValue));
  }

  function drawPreview(start, end) {
    const canvas = document.getElementById('drawing-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redrawAllDrawings();
    ctx.strokeStyle = colors.drawing.line;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    if (currentTool === 'horizontal') {
      ctx.beginPath();
      ctx.moveTo(0, start.y);
      ctx.lineTo(canvas.width, start.y);
      ctx.stroke();
    } else if (currentTool === 'trendline') {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (currentTool === 'fib') {
      drawFibPreview(ctx, start, end);
    }
    ctx.setLineDash([]);
  }

  function drawFibPreview(ctx, start, end) {
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const fibColors = ['#f85149', '#db6d28', '#d29922', '#58a6ff', '#3fb950', '#7ee787', '#a371f7'];
    const height = end.y - start.y;

    levels.forEach((level, i) => {
      const y = start.y + (height * level);
      ctx.strokeStyle = fibColors[i];
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.stroke();
      ctx.fillStyle = fibColors[i];
      ctx.font = '11px monospace';
      ctx.fillText(`${(level * 100).toFixed(1)}%`, 10, y - 5);
    });
  }

  function addHorizontalLine(price) {
    const line = candleSeries.createPriceLine({
      price: price, color: colors.drawing.horizontal, lineWidth: 2,
      lineStyle: LightweightCharts.LineStyle.Solid, axisLabelVisible: true,
      title: `$${price.toLocaleString()}`
    });
    horizontalLines.push({ price, line });
    drawings.push({ type: 'horizontal', price, line });
  }

  function addTrendLine(start, end) {
    trendLines.push({ start, end });
    drawings.push({ type: 'trendline', start, end });
    redrawAllDrawings();
  }

  function addFibonacci(start, end) {
    fibLevels.push({ start, end });
    drawings.push({ type: 'fib', start, end });
    redrawAllDrawings();
  }

  function redrawAllDrawings() {
    const canvas = document.getElementById('drawing-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = colors.drawing.line;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    trendLines.forEach(({ start, end }) => {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    });

    fibLevels.forEach(({ start, end }) => {
      drawFibPreview(ctx, start, end);
    });
  }

  function clearDrawings() {
    horizontalLines.forEach(({ line }) => {
      try { candleSeries.removePriceLine(line); } catch (e) {}
    });
    horizontalLines = [];
    trendLines = [];
    fibLevels = [];
    drawings = [];

    const canvas = document.getElementById('drawing-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function updateCursor() {
    const chartContainer = document.getElementById('main-chart');
    if (!chartContainer) return;
    const cursors = { crosshair: 'crosshair', trendline: 'crosshair', horizontal: 'ew-resize', fib: 'crosshair' };
    chartContainer.style.cursor = cursors[currentTool] || 'default';
  }

  function handleResize() {
    const containers = [
      { chart: mainChart, el: 'main-chart' },
      { chart: volumeChart, el: 'volume-chart' },
      { chart: rsiChart, el: 'rsi-chart' },
      { chart: macdChart, el: 'macd-chart' },
      { chart: stochChart, el: 'stoch-chart' }
    ];
    containers.forEach(({ chart, el }) => {
      const container = document.getElementById(el);
      if (chart && container) chart.applyOptions({ width: container.clientWidth });
    });
  }

  async function loadData(timeframe) {
    try {
      const intervalMap = { '15': '15m', '60': '1h', '240': '4h', 'D': '1d', 'W': '1w' };
      const interval = intervalMap[timeframe] || '4h';

      const response = await fetch(`https://api.binance.us/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=500`);
      const data = await response.json();

      ohlcData = data.map(d => ({
        time: Math.floor(d[0] / 1000),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
      }));

      updateChartData();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  function updateChartData() {
    if (!ohlcData.length) return;

    candleSeries.setData(ohlcData);

    if (volumeSeries) {
      const volumeData = ohlcData.map(d => ({
        time: d.time, value: d.volume,
        color: d.close >= d.open ? colors.bullish + '80' : colors.bearish + '80'
      }));
      volumeSeries.setData(volumeData);
    }

    ema9Series?.setData(calculateEMA(ohlcData, 9));
    ema21Series?.setData(calculateEMA(ohlcData, 21));
    ema50Series?.setData(calculateEMA(ohlcData, 50));

    const bb = calculateBollingerBands(ohlcData, 20, 2);
    bbUpperSeries?.setData(bb.upper);
    bbMiddleSeries?.setData(bb.middle);
    bbLowerSeries?.setData(bb.lower);

    vwapSeries?.setData(calculateVWAP(ohlcData));
    supertrendSeries?.setData(calculateSupertrend(ohlcData, 10, 3));

    const ichimoku = calculateIchimoku(ohlcData);
    tenkanSeries?.setData(ichimoku.tenkan);
    kijunSeries?.setData(ichimoku.kijun);
    chikouSeries?.setData(ichimoku.chikou);

    if (rsiSeries) rsiSeries.setData(calculateRSI(ohlcData, 14));

    if (macdLineSeries && macdSignalSeries && macdHistogramSeries) {
      const macdData = calculateMACD(ohlcData, 12, 26, 9);
      macdLineSeries.setData(macdData.macdLine);
      macdSignalSeries.setData(macdData.signalLine);
      macdHistogramSeries.setData(macdData.histogram);
    }

    if (stochKSeries && stochDSeries) {
      const stochData = calculateStochRSI(ohlcData, 14, 14, 3, 3);
      stochKSeries.setData(stochData.k);
      stochDSeries.setData(stochData.d);
    }

    mainChart.timeScale().fitContent();
  }

  // ============== INDICATOR CALCULATIONS ==============

  function calculateEMA(data, period) {
    const result = [];
    const multiplier = 2 / (period + 1);
    let ema = null;

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) continue;
      if (i === period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[i - j].close;
        ema = sum / period;
      } else {
        ema = (data[i].close - ema) * multiplier + ema;
      }
      result.push({ time: data[i].time, value: ema });
    }
    return result;
  }

  function calculateEMAValues(values, period) {
    const result = new Array(values.length).fill(0);
    const multiplier = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += values[i];
    result[period - 1] = sum / period;
    for (let i = period; i < values.length; i++) {
      result[i] = (values[i] - result[i - 1]) * multiplier + result[i - 1];
    }
    return result;
  }

  function calculateBollingerBands(data, period, stdDev) {
    const upper = [], middle = [], lower = [];
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const closes = slice.map(d => d.close);
      const sma = closes.reduce((a, b) => a + b, 0) / period;
      const variance = closes.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push({ time: data[i].time, value: sma + stdDev * std });
      middle.push({ time: data[i].time, value: sma });
      lower.push({ time: data[i].time, value: sma - stdDev * std });
    }
    return { upper, middle, lower };
  }

  function calculateVWAP(data) {
    const result = [];
    let cumulativeTPV = 0, cumulativeVolume = 0;
    for (let i = 0; i < data.length; i++) {
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      cumulativeTPV += typicalPrice * data[i].volume;
      cumulativeVolume += data[i].volume;
      result.push({ time: data[i].time, value: cumulativeTPV / cumulativeVolume });
    }
    return result;
  }

  function calculateSupertrend(data, period, multiplier) {
    const result = [];
    const atr = calculateATR(data, period);

    let direction = 1;
    let upperBand = 0, lowerBand = 0;
    let prevUpperBand = 0, prevLowerBand = 0;

    for (let i = period; i < data.length; i++) {
      const hl2 = (data[i].high + data[i].low) / 2;
      const atrVal = atr[i - period]?.value || 0;

      upperBand = hl2 + (multiplier * atrVal);
      lowerBand = hl2 - (multiplier * atrVal);

      if (i > period) {
        if (lowerBand > prevLowerBand || data[i - 1].close < prevLowerBand) lowerBand = lowerBand;
        else lowerBand = prevLowerBand;

        if (upperBand < prevUpperBand || data[i - 1].close > prevUpperBand) upperBand = upperBand;
        else upperBand = prevUpperBand;
      }

      if (data[i].close > upperBand) direction = 1;
      else if (data[i].close < lowerBand) direction = -1;

      result.push({
        time: data[i].time,
        value: direction === 1 ? lowerBand : upperBand,
        color: direction === 1 ? colors.supertrend.up : colors.supertrend.down
      });

      prevUpperBand = upperBand;
      prevLowerBand = lowerBand;
    }
    return result;
  }

  function calculateATR(data, period) {
    const result = [];
    const trValues = [];

    for (let i = 1; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      trValues.push(tr);

      if (i >= period) {
        const atr = trValues.slice(-period).reduce((a, b) => a + b, 0) / period;
        result.push({ time: data[i].time, value: atr });
      }
    }
    return result;
  }

  function calculateIchimoku(data, tenkanPeriod = 9, kijunPeriod = 26, displacement = 26) {
    const tenkan = [], kijun = [], chikou = [];

    const getHighLow = (slice) => {
      const highs = slice.map(d => d.high);
      const lows = slice.map(d => d.low);
      return { high: Math.max(...highs), low: Math.min(...lows) };
    };

    for (let i = 0; i < data.length; i++) {
      if (i >= tenkanPeriod - 1) {
        const { high, low } = getHighLow(data.slice(i - tenkanPeriod + 1, i + 1));
        tenkan.push({ time: data[i].time, value: (high + low) / 2 });
      }

      if (i >= kijunPeriod - 1) {
        const { high, low } = getHighLow(data.slice(i - kijunPeriod + 1, i + 1));
        kijun.push({ time: data[i].time, value: (high + low) / 2 });
      }

      if (i >= displacement) {
        chikou.push({ time: data[i - displacement].time, value: data[i].close });
      }
    }

    return { tenkan, kijun, chikou };
  }

  function calculateRSI(data, period) {
    const result = [];
    let avgGain = 0, avgLoss = 0;

    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      if (i <= period) {
        avgGain += gain;
        avgLoss += loss;
        if (i === period) {
          avgGain /= period;
          avgLoss /= period;
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          result.push({ time: data[i].time, value: 100 - (100 / (1 + rs)) });
        }
      } else {
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        result.push({ time: data[i].time, value: 100 - (100 / (1 + rs)) });
      }
    }
    return result;
  }

  function calculateStochRSI(data, rsiPeriod, stochPeriod, kPeriod, dPeriod) {
    const rsiData = calculateRSI(data, rsiPeriod);
    const k = [], d = [];

    for (let i = stochPeriod - 1; i < rsiData.length; i++) {
      const rsiSlice = rsiData.slice(i - stochPeriod + 1, i + 1).map(r => r.value);
      const minRSI = Math.min(...rsiSlice);
      const maxRSI = Math.max(...rsiSlice);
      const stochRSI = maxRSI === minRSI ? 50 : ((rsiData[i].value - minRSI) / (maxRSI - minRSI)) * 100;
      k.push({ time: rsiData[i].time, value: stochRSI });
    }

    for (let i = kPeriod - 1; i < k.length; i++) {
      const kSmooth = k.slice(i - kPeriod + 1, i + 1).reduce((a, b) => a + b.value, 0) / kPeriod;
      k[i].value = kSmooth;
    }

    for (let i = dPeriod - 1; i < k.length; i++) {
      const dVal = k.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b.value, 0) / dPeriod;
      d.push({ time: k[i].time, value: dVal });
    }

    return { k: k.slice(kPeriod - 1), d };
  }

  function calculateMACD(data, fastPeriod, slowPeriod, signalPeriod) {
    const fastEMA = calculateEMAValues(data.map(d => d.close), fastPeriod);
    const slowEMA = calculateEMAValues(data.map(d => d.close), slowPeriod);

    const macdLine = [];
    for (let i = slowPeriod - 1; i < data.length; i++) {
      macdLine.push({ time: data[i].time, value: fastEMA[i] - slowEMA[i] });
    }

    const macdValues = macdLine.map(d => d.value);
    const signalEMA = calculateEMAValues(macdValues, signalPeriod);

    const signalLine = [], histogram = [];
    for (let i = signalPeriod - 1; i < macdLine.length; i++) {
      signalLine.push({ time: macdLine[i].time, value: signalEMA[i] });
      const histValue = macdLine[i].value - signalEMA[i];
      histogram.push({
        time: macdLine[i].time, value: histValue,
        color: histValue >= 0 ? colors.macdHistPos : colors.macdHistNeg
      });
    }

    return { macdLine, signalLine, histogram };
  }

  function updateLegend(param) {
    const legend = document.getElementById('chart-legend');
    if (!legend || !param.time || !param.seriesData.size) return;

    const data = param.seriesData.get(candleSeries);
    if (data) {
      const change = ((data.close - data.open) / data.open * 100).toFixed(2);
      const changeClass = change >= 0 ? 'bullish' : 'bearish';
      legend.innerHTML = `
        <span class="legend-ohlc">O: ${data.open?.toLocaleString()} H: ${data.high?.toLocaleString()} L: ${data.low?.toLocaleString()} C: ${data.close?.toLocaleString()}</span>
        <span class="legend-change ${changeClass}">${change >= 0 ? '+' : ''}${change}%</span>
      `;
    }

    const rsiData = param.seriesData.get(rsiSeries);
    const rsiEl = document.getElementById('rsi-value');
    if (rsiData && rsiEl) {
      const rsi = rsiData.value.toFixed(1);
      rsiEl.textContent = rsi;
      rsiEl.className = 'subchart-value ' + (rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : '');
    }

    const macdData = param.seriesData.get(macdLineSeries);
    const macdEl = document.getElementById('macd-value');
    if (macdData && macdEl) macdEl.textContent = macdData.value.toFixed(2);

    const stochKData = param.seriesData.get(stochKSeries);
    const stochEl = document.getElementById('stoch-value');
    if (stochKData && stochEl) {
      const stoch = stochKData.value.toFixed(1);
      stochEl.textContent = stoch;
      stochEl.className = 'subchart-value ' + (stoch > 80 ? 'overbought' : stoch < 20 ? 'oversold' : '');
    }
  }

  async function updatePriceInfo() {
    try {
      const response = await fetch('https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT');
      const data = await response.json();

      const priceEl = document.getElementById('current-price');
      if (priceEl) priceEl.textContent = '$' + parseFloat(data.lastPrice).toLocaleString();

      const changeEl = document.getElementById('price-change');
      if (changeEl) {
        const changePercent = parseFloat(data.priceChangePercent);
        changeEl.textContent = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%';
        changeEl.className = 'info-value ' + (changePercent >= 0 ? 'bullish' : 'bearish');
      }

      const highEl = document.getElementById('high-24h');
      if (highEl) highEl.textContent = '$' + parseFloat(data.highPrice).toLocaleString();

      const lowEl = document.getElementById('low-24h');
      if (lowEl) lowEl.textContent = '$' + parseFloat(data.lowPrice).toLocaleString();
    } catch (error) {
      console.error('Error fetching price info:', error);
    }
  }

  window.BTCChart = { init, loadData, clearDrawings, setTimeframe: async (tf) => { currentTimeframe = tf; await loadData(tf); } };
})();
