/**
 * Smart Chart - Free Bitcoin Analysis Tool
 * Auto-detected levels, signals, and trend analysis
 */

(function() {
  'use strict';

  // Chart instances
  let mainChart = null;
  let rsiChart = null;
  let candleSeries = null;
  let rsiSeries = null;
  let ema9Series = null;
  let ema21Series = null;

  // Price lines for levels
  let supportLines = [];
  let resistanceLines = [];

  // Data
  let ohlcData = [];
  let currentTimeframe = '240';

  // Colors
  const colors = {
    background: '#0d1117',
    grid: '#21262d',
    text: '#8d96a0',
    bullish: '#3fb950',
    bearish: '#f85149',
    ema9: '#58a6ff',
    ema21: '#a371f7',
    support: '#3fb950',
    resistance: '#f85149',
    rsi: '#a371f7',
    neutral: '#d29922'
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    if (typeof LightweightCharts === 'undefined') {
      console.error('Lightweight Charts not loaded');
      setTimeout(init, 100);
      return;
    }
    createCharts();
    setupEventListeners();
    await loadData(currentTimeframe);
    startPriceUpdates();
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
      timeScale: { borderColor: colors.grid, timeVisible: true, secondsVisible: false }
    };

    // Main chart
    const mainChartEl = document.getElementById('smart-chart');
    if (mainChartEl) {
      mainChart = LightweightCharts.createChart(mainChartEl, { ...chartOptions, height: 400 });

      candleSeries = mainChart.addCandlestickSeries({
        upColor: colors.bullish, downColor: colors.bearish,
        borderUpColor: colors.bullish, borderDownColor: colors.bearish,
        wickUpColor: colors.bullish, wickDownColor: colors.bearish
      });

      ema9Series = mainChart.addLineSeries({ color: colors.ema9, lineWidth: 2, title: 'EMA 9' });
      ema21Series = mainChart.addLineSeries({ color: colors.ema21, lineWidth: 2, title: 'EMA 21' });

      mainChart.subscribeCrosshairMove(updateLegend);
    }

    // RSI mini chart
    const rsiChartEl = document.getElementById('rsi-mini-chart');
    if (rsiChartEl) {
      rsiChart = LightweightCharts.createChart(rsiChartEl, { ...chartOptions, height: 80 });
      rsiSeries = rsiChart.addLineSeries({ color: colors.rsi, lineWidth: 2 });
      rsiChart.priceScale('right').applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });

      // Add overbought/oversold zones
      rsiChart.addLineSeries({ color: colors.bearish + '40', lineWidth: 1, lineStyle: 2 })
        .setData([{ time: 0, value: 70 }]);
      rsiChart.addLineSeries({ color: colors.bullish + '40', lineWidth: 1, lineStyle: 2 })
        .setData([{ time: 0, value: 30 }]);
    }

    // Sync charts
    if (mainChart && rsiChart) {
      mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        rsiChart.timeScale().setVisibleLogicalRange(range);
      });
    }

    window.addEventListener('resize', handleResize);
  }

  function setupEventListeners() {
    // Timeframe tabs
    document.querySelectorAll('.tf-tab:not(.pro-only)').forEach(tab => {
      tab.addEventListener('click', async (e) => {
        document.querySelectorAll('.tf-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentTimeframe = e.target.dataset.tf;
        await loadData(currentTimeframe);
      });
    });

    // Toggle checkboxes
    document.getElementById('show-levels')?.addEventListener('change', (e) => {
      const visible = e.target.checked;
      supportLines.forEach(line => { try { candleSeries.removePriceLine(line); } catch(err) {} });
      resistanceLines.forEach(line => { try { candleSeries.removePriceLine(line); } catch(err) {} });
      if (visible && ohlcData.length) {
        supportLines = [];
        resistanceLines = [];
        drawKeyLevels();
      }
    });

    document.getElementById('show-emas')?.addEventListener('change', (e) => {
      const visible = e.target.checked;
      ema9Series?.applyOptions({ visible });
      ema21Series?.applyOptions({ visible });
    });

    document.getElementById('show-signals')?.addEventListener('change', (e) => {
      // Toggle signal markers (future enhancement)
    });
  }

  async function loadData(timeframe) {
    try {
      const intervalMap = { '60': '1h', '240': '4h', 'D': '1d', '15': '15m', 'W': '1w' };
      const interval = intervalMap[timeframe] || '4h';

      const response = await fetch(`https://api.binance.us/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=300`);
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
      analyzeMarket();

    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  function updateChartData() {
    if (!ohlcData.length) return;

    candleSeries.setData(ohlcData);

    // EMAs
    const ema9Data = calculateEMA(ohlcData, 9);
    const ema21Data = calculateEMA(ohlcData, 21);
    ema9Series?.setData(ema9Data);
    ema21Series?.setData(ema21Data);

    // RSI
    const rsiData = calculateRSI(ohlcData, 14);
    rsiSeries?.setData(rsiData);

    // Draw key levels
    if (document.getElementById('show-levels')?.checked) {
      drawKeyLevels();
    }

    mainChart.timeScale().fitContent();
    rsiChart?.timeScale().fitContent();
  }

  function drawKeyLevels() {
    // Clear existing lines
    supportLines.forEach(line => { try { candleSeries.removePriceLine(line); } catch(err) {} });
    resistanceLines.forEach(line => { try { candleSeries.removePriceLine(line); } catch(err) {} });
    supportLines = [];
    resistanceLines = [];

    const levels = findKeyLevels(ohlcData);
    const currentPrice = ohlcData[ohlcData.length - 1].close;

    // Update level displays
    document.getElementById('current-price').textContent = '$' + currentPrice.toLocaleString();
    document.getElementById('r1-price').textContent = levels.resistances[0] ? '$' + levels.resistances[0].toLocaleString() : '--';
    document.getElementById('r2-price').textContent = levels.resistances[1] ? '$' + levels.resistances[1].toLocaleString() : '--';
    document.getElementById('s1-price').textContent = levels.supports[0] ? '$' + levels.supports[0].toLocaleString() : '--';
    document.getElementById('s2-price').textContent = levels.supports[1] ? '$' + levels.supports[1].toLocaleString() : '--';

    // Draw resistance lines
    levels.resistances.slice(0, 2).forEach((price, i) => {
      const line = candleSeries.createPriceLine({
        price: price,
        color: colors.resistance,
        lineWidth: 2,
        lineStyle: i === 0 ? LightweightCharts.LineStyle.Solid : LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'R' + (i + 1)
      });
      resistanceLines.push(line);
    });

    // Draw support lines
    levels.supports.slice(0, 2).forEach((price, i) => {
      const line = candleSeries.createPriceLine({
        price: price,
        color: colors.support,
        lineWidth: 2,
        lineStyle: i === 0 ? LightweightCharts.LineStyle.Solid : LightweightCharts.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'S' + (i + 1)
      });
      supportLines.push(line);
    });
  }

  function findKeyLevels(data) {
    const currentPrice = data[data.length - 1].close;
    const lookback = Math.min(50, data.length);
    const recentData = data.slice(-lookback);

    // Find swing highs and lows
    const swingHighs = [];
    const swingLows = [];

    for (let i = 2; i < recentData.length - 2; i++) {
      const candle = recentData[i];

      // Swing high
      if (candle.high > recentData[i-1].high &&
          candle.high > recentData[i-2].high &&
          candle.high > recentData[i+1].high &&
          candle.high > recentData[i+2].high) {
        swingHighs.push(candle.high);
      }

      // Swing low
      if (candle.low < recentData[i-1].low &&
          candle.low < recentData[i-2].low &&
          candle.low < recentData[i+1].low &&
          candle.low < recentData[i+2].low) {
        swingLows.push(candle.low);
      }
    }

    // Cluster nearby levels
    const resistances = clusterLevels(swingHighs.filter(p => p > currentPrice)).slice(0, 3);
    const supports = clusterLevels(swingLows.filter(p => p < currentPrice), false).slice(0, 3);

    return { resistances, supports };
  }

  function clusterLevels(levels, ascending = true) {
    if (levels.length === 0) return [];

    const sorted = [...levels].sort((a, b) => ascending ? a - b : b - a);
    const clustered = [];
    const threshold = sorted[0] * 0.005; // 0.5% clustering

    let currentCluster = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (Math.abs(sorted[i] - currentCluster[0]) < threshold) {
        currentCluster.push(sorted[i]);
      } else {
        clustered.push(currentCluster.reduce((a, b) => a + b) / currentCluster.length);
        currentCluster = [sorted[i]];
      }
    }
    clustered.push(currentCluster.reduce((a, b) => a + b) / currentCluster.length);

    return clustered;
  }

  function analyzeMarket() {
    if (ohlcData.length < 30) return;

    const currentPrice = ohlcData[ohlcData.length - 1].close;
    const ema9 = calculateEMA(ohlcData, 9);
    const ema21 = calculateEMA(ohlcData, 21);
    const rsi = calculateRSI(ohlcData, 14);
    const macd = calculateMACD(ohlcData);

    const ema9Val = ema9[ema9.length - 1]?.value || 0;
    const ema21Val = ema21[ema21.length - 1]?.value || 0;
    const rsiVal = rsi[rsi.length - 1]?.value || 50;
    const macdVal = macd.histogram[macd.histogram.length - 1]?.value || 0;
    const macdPrev = macd.histogram[macd.histogram.length - 2]?.value || 0;

    // Calculate individual scores (-1 to 1)
    let emaScore = 0, rsiScore = 0, macdScore = 0, volScore = 0;

    // EMA Score
    if (currentPrice > ema9Val && ema9Val > ema21Val) emaScore = 1;
    else if (currentPrice < ema9Val && ema9Val < ema21Val) emaScore = -1;
    else if (currentPrice > ema21Val) emaScore = 0.5;
    else if (currentPrice < ema21Val) emaScore = -0.5;

    // RSI Score
    if (rsiVal > 70) rsiScore = -0.5; // Overbought
    else if (rsiVal < 30) rsiScore = 0.5; // Oversold
    else if (rsiVal > 50) rsiScore = 0.3;
    else rsiScore = -0.3;

    // MACD Score
    if (macdVal > 0 && macdVal > macdPrev) macdScore = 1;
    else if (macdVal < 0 && macdVal < macdPrev) macdScore = -1;
    else if (macdVal > 0) macdScore = 0.5;
    else macdScore = -0.5;

    // Volume Score (compare recent to average)
    const recentVol = ohlcData.slice(-5).reduce((s, d) => s + d.volume, 0) / 5;
    const avgVol = ohlcData.slice(-20).reduce((s, d) => s + d.volume, 0) / 20;
    const volRatio = recentVol / avgVol;
    if (volRatio > 1.5) volScore = 0.5;
    else if (volRatio < 0.5) volScore = -0.5;

    // Update indicator bars
    updateIndicatorBar('ema', emaScore, emaScore > 0 ? 'Bullish' : emaScore < 0 ? 'Bearish' : 'Neutral');
    updateIndicatorBar('rsi', rsiScore, rsiVal > 70 ? 'Overbought' : rsiVal < 30 ? 'Oversold' : 'Neutral');
    updateIndicatorBar('macd', macdScore, macdScore > 0 ? 'Bullish' : 'Bearish');
    updateIndicatorBar('vol', volScore, volRatio > 1.2 ? 'High' : volRatio < 0.8 ? 'Low' : 'Normal');

    // Overall score
    const totalScore = (emaScore + rsiScore + macdScore + volScore) / 4;
    const scoreEl = document.getElementById('overall-score');
    if (scoreEl) {
      const scorePercent = Math.round((totalScore + 1) * 50);
      scoreEl.textContent = scorePercent + '/100';
      scoreEl.className = 'score-value ' + (totalScore > 0.2 ? 'bullish' : totalScore < -0.2 ? 'bearish' : 'neutral');
    }

    // RSI display
    const rsiDisplay = document.getElementById('rsi-display');
    if (rsiDisplay) {
      rsiDisplay.textContent = rsiVal.toFixed(1);
      rsiDisplay.className = 'mini-chart-value ' + (rsiVal > 70 ? 'bearish' : rsiVal < 30 ? 'bullish' : '');
    }

    // Trend direction
    const trendEl = document.getElementById('trend-direction');
    if (trendEl) {
      if (emaScore > 0.5) {
        trendEl.innerHTML = '<span class="trend-up">Uptrend</span>';
      } else if (emaScore < -0.5) {
        trendEl.innerHTML = '<span class="trend-down">Downtrend</span>';
      } else {
        trendEl.innerHTML = '<span class="trend-neutral">Ranging</span>';
      }
    }

    // Market bias
    const biasEl = document.getElementById('market-bias');
    if (biasEl) {
      if (totalScore > 0.3) {
        biasEl.innerHTML = '<span class="bias-bullish">Bullish</span>';
      } else if (totalScore < -0.3) {
        biasEl.innerHTML = '<span class="bias-bearish">Bearish</span>';
      } else {
        biasEl.innerHTML = '<span class="bias-neutral">Neutral</span>';
      }
    }

    // Signal generation
    generateSignal(emaScore, rsiScore, macdScore, rsiVal, currentPrice, ema9Val, ema21Val);
  }

  function updateIndicatorBar(id, score, label) {
    const bar = document.getElementById(id + '-bar');
    const labelEl = document.getElementById(id + '-label');

    if (bar) {
      const percent = Math.round((score + 1) * 50);
      bar.style.width = percent + '%';
      bar.className = 'ind-fill ' + (score > 0.2 ? 'bullish' : score < -0.2 ? 'bearish' : 'neutral');
    }
    if (labelEl) {
      labelEl.textContent = label;
      labelEl.className = 'ind-label ' + (score > 0.2 ? 'bullish' : score < -0.2 ? 'bearish' : 'neutral');
    }
  }

  function generateSignal(emaScore, rsiScore, macdScore, rsiVal, price, ema9, ema21) {
    const signalDisplay = document.getElementById('signal-display');
    const signalReasoning = document.getElementById('signal-reasoning');

    if (!signalDisplay || !signalReasoning) return;

    let signal = { icon: '⏳', text: 'Wait', class: 'neutral' };
    let reasons = [];

    // Strong bullish
    if (emaScore >= 0.5 && macdScore > 0 && rsiVal < 70) {
      signal = { icon: '🟢', text: 'Bullish', class: 'bullish' };
      reasons.push('Price above EMAs in uptrend');
      reasons.push('MACD showing momentum');
      if (rsiVal < 50) reasons.push('RSI has room to run');
    }
    // Strong bearish
    else if (emaScore <= -0.5 && macdScore < 0 && rsiVal > 30) {
      signal = { icon: '🔴', text: 'Bearish', class: 'bearish' };
      reasons.push('Price below EMAs in downtrend');
      reasons.push('MACD showing weakness');
      if (rsiVal > 50) reasons.push('RSI has room to fall');
    }
    // Oversold bounce potential
    else if (rsiVal < 30) {
      signal = { icon: '👀', text: 'Oversold', class: 'watch-bullish' };
      reasons.push('RSI in oversold territory');
      reasons.push('Watch for bounce at support');
    }
    // Overbought pullback potential
    else if (rsiVal > 70) {
      signal = { icon: '👀', text: 'Overbought', class: 'watch-bearish' };
      reasons.push('RSI in overbought territory');
      reasons.push('Watch for pullback at resistance');
    }
    // EMA crossover potential
    else if (Math.abs(ema9 - ema21) / ema21 < 0.005) {
      signal = { icon: '⚡', text: 'Crossover Soon', class: 'neutral' };
      reasons.push('EMAs converging');
      reasons.push('Watch for trend change');
    }
    // Default
    else {
      reasons.push('No clear signal');
      reasons.push('Wait for better setup');
    }

    signalDisplay.innerHTML = `
      <span class="signal-icon">${signal.icon}</span>
      <span class="signal-text ${signal.class}">${signal.text}</span>
    `;

    signalReasoning.innerHTML = reasons.map(r => `<div class="reason">• ${r}</div>`).join('');
  }

  function updateLegend(param) {
    const legend = document.getElementById('chart-legend');
    if (!legend || !param.time) return;

    const data = param.seriesData.get(candleSeries);
    if (data) {
      const change = ((data.close - data.open) / data.open * 100).toFixed(2);
      const changeClass = change >= 0 ? 'bullish' : 'bearish';
      legend.innerHTML = `
        <span class="ohlc-data">
          O: $${data.open?.toLocaleString()}
          H: $${data.high?.toLocaleString()}
          L: $${data.low?.toLocaleString()}
          C: $${data.close?.toLocaleString()}
          <span class="${changeClass}">(${change >= 0 ? '+' : ''}${change}%)</span>
        </span>
      `;
    }
  }

  async function startPriceUpdates() {
    await updatePriceDisplay();
    setInterval(updatePriceDisplay, 10000);
  }

  async function updatePriceDisplay() {
    try {
      const response = await fetch('https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT');
      const data = await response.json();

      const priceEl = document.getElementById('btc-price');
      if (priceEl) priceEl.textContent = '$' + parseFloat(data.lastPrice).toLocaleString();

      const changeEl = document.getElementById('price-change');
      if (changeEl) {
        const change = parseFloat(data.priceChangePercent);
        changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
        changeEl.className = 'summary-value ' + (change >= 0 ? 'bullish' : 'bearish');
      }
    } catch (err) {
      console.error('Price update error:', err);
    }
  }

  function handleResize() {
    const mainEl = document.getElementById('smart-chart');
    const rsiEl = document.getElementById('rsi-mini-chart');
    if (mainChart && mainEl) mainChart.applyOptions({ width: mainEl.clientWidth });
    if (rsiChart && rsiEl) rsiChart.applyOptions({ width: rsiEl.clientWidth });
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

  function calculateMACD(data) {
    const fast = 12, slow = 26, signal = 9;
    const closes = data.map(d => d.close);

    const fastEMA = calculateEMAValues(closes, fast);
    const slowEMA = calculateEMAValues(closes, slow);

    const macdLine = [];
    for (let i = slow - 1; i < data.length; i++) {
      macdLine.push({ time: data[i].time, value: fastEMA[i] - slowEMA[i] });
    }

    const signalEMA = calculateEMAValues(macdLine.map(d => d.value), signal);
    const histogram = [];

    for (let i = signal - 1; i < macdLine.length; i++) {
      histogram.push({
        time: macdLine[i].time,
        value: macdLine[i].value - signalEMA[i]
      });
    }

    return { macdLine, histogram };
  }

  function calculateEMAValues(values, period) {
    const result = new Array(values.length).fill(0);
    const multiplier = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period && i < values.length; i++) sum += values[i];
    if (values.length >= period) {
      result[period - 1] = sum / period;
      for (let i = period; i < values.length; i++) {
        result[i] = (values[i] - result[i - 1]) * multiplier + result[i - 1];
      }
    }
    return result;
  }

})();
