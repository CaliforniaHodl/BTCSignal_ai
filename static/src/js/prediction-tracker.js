/**
 * 30-Day Prediction Tracker
 * Visualizes AI predictions vs actual BTC price
 */

(function() {
  'use strict';

  let mainChart = null;
  let actualPriceSeries = null;
  let predictionLines = [];
  let historicalCalls = [];

  // Prediction line colors (rotating palette)
  const predictionColors = [
    '#f7931a', // Bitcoin orange
    '#58a6ff', // Blue
    '#a371f7', // Purple
    '#3fb950', // Green
    '#f85149', // Red
    '#d29922', // Yellow
    '#7ee787', // Light green
    '#db6d28', // Orange
    '#bc8cff', // Light purple
    '#39d353'  // Bright green
  ];

  const colors = {
    background: '#0d1117',
    grid: '#21262d',
    text: '#8d96a0',
    textBright: '#e6edf3',
    actualPrice: '#ffffff',
    bullish: '#3fb950',
    bearish: '#f85149'
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    if (typeof LightweightCharts === 'undefined') {
      console.error('Lightweight Charts not loaded');
      return;
    }

    await loadHistoricalCalls();
    createChart();
    await loadActualPriceData();
    drawPredictionLines();
    updateStats();
    renderTimeline();
  }

  async function loadHistoricalCalls() {
    try {
      const response = await fetch('/data/historical-calls.json');
      historicalCalls = await response.json();

      // Filter to current 30-day cycle
      const cycleStart = getCycleStartDate();
      historicalCalls = historicalCalls.filter(call => {
        const callDate = new Date(call.date);
        return callDate >= cycleStart;
      });
    } catch (error) {
      console.error('Error loading historical calls:', error);
      historicalCalls = [];
    }
  }

  function getCycleStartDate() {
    // Cycles start on the 1st of each month (or closest approximation)
    const now = new Date();
    const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Update cycle info display
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setDate(cycleEnd.getDate() + 29);

    const dayOfCycle = Math.floor((now - cycleStart) / (1000 * 60 * 60 * 24)) + 1;

    document.getElementById('cycle-dates').textContent =
      `${formatDate(cycleStart)} - ${formatDate(cycleEnd)}`;
    document.getElementById('cycle-day').textContent = `${dayOfCycle}/30`;

    return cycleStart;
  }

  function formatDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function createChart() {
    const chartEl = document.getElementById('prediction-chart');
    if (!chartEl) return;

    mainChart = LightweightCharts.createChart(chartEl, {
      layout: {
        background: { type: 'solid', color: colors.background },
        textColor: colors.text
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid }
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: { color: colors.text, width: 1, style: LightweightCharts.LineStyle.Dashed },
        horzLine: { color: colors.text, width: 1, style: LightweightCharts.LineStyle.Dashed }
      },
      rightPriceScale: {
        borderColor: colors.grid,
        scaleMargins: { top: 0.1, bottom: 0.1 }
      },
      timeScale: {
        borderColor: colors.grid,
        timeVisible: true,
        secondsVisible: false
      },
      height: 450
    });

    // Actual price line (white, prominent)
    actualPriceSeries = mainChart.addLineSeries({
      color: colors.actualPrice,
      lineWidth: 3,
      title: 'BTC Price',
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6
    });
  }

  async function loadActualPriceData() {
    try {
      const cycleStart = getCycleStartDate();
      const startTime = cycleStart.getTime();

      // Fetch daily data for the cycle period
      const response = await fetch(
        `https://api.binance.us/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=${startTime}&limit=720`
      );
      const data = await response.json();

      const priceData = data.map(d => ({
        time: Math.floor(d[0] / 1000),
        value: parseFloat(d[4]) // Close price
      }));

      actualPriceSeries.setData(priceData);
      mainChart.timeScale().fitContent();
    } catch (error) {
      console.error('Error loading price data:', error);
    }
  }

  function drawPredictionLines() {
    const legendContainer = document.getElementById('chart-legend');

    historicalCalls.forEach((call, index) => {
      const color = predictionColors[index % predictionColors.length];
      const callDate = new Date(call.date);

      // Create a line series for this prediction
      const predictionSeries = mainChart.addLineSeries({
        color: color,
        lineWidth: 2,
        lineStyle: call.actualResult === 'pending'
          ? LightweightCharts.LineStyle.Dashed
          : LightweightCharts.LineStyle.Solid,
        title: `Day ${index + 1}`,
        crosshairMarkerVisible: false
      });

      // Create the prediction line from entry to target
      const entryTime = Math.floor(callDate.getTime() / 1000);

      // Prediction extends 24 hours (to next day's signal)
      const targetTime = entryTime + (24 * 60 * 60);

      const predictionData = [
        { time: entryTime, value: call.entryPrice },
        { time: targetTime, value: call.targetPrice }
      ];

      predictionSeries.setData(predictionData);
      predictionLines.push(predictionSeries);

      // Add marker at entry point
      predictionSeries.setMarkers([{
        time: entryTime,
        position: 'inBar',
        color: color,
        shape: call.direction === 'up' ? 'arrowUp' : 'arrowDown',
        text: call.direction.toUpperCase()
      }]);

      // Add to legend
      const legendItem = document.createElement('div');
      legendItem.className = `legend-item prediction ${call.actualResult}`;
      legendItem.innerHTML = `
        <span class="legend-line" style="background: ${color}"></span>
        <span>Day ${index + 1} (${call.direction.toUpperCase()}) ${getResultIcon(call.actualResult)}</span>
      `;
      legendContainer.appendChild(legendItem);
    });
  }

  function getResultIcon(result) {
    switch (result) {
      case 'win': return '<span class="result-icon win">&#x2714;</span>';
      case 'loss': return '<span class="result-icon loss">&#x2718;</span>';
      default: return '<span class="result-icon pending">&#x23F3;</span>';
    }
  }

  function updateStats() {
    const wins = historicalCalls.filter(c => c.actualResult === 'win').length;
    const losses = historicalCalls.filter(c => c.actualResult === 'loss').length;
    const pending = historicalCalls.filter(c => c.actualResult === 'pending').length;

    const totalPnl = historicalCalls
      .filter(c => c.pnlPercent !== null)
      .reduce((sum, c) => sum + c.pnlPercent, 0);

    document.getElementById('predictions-count').textContent = historicalCalls.length;
    document.getElementById('stat-wins').textContent = wins;
    document.getElementById('stat-losses').textContent = losses;
    document.getElementById('stat-pending').textContent = pending;

    const pnlEl = document.getElementById('stat-pnl');
    pnlEl.textContent = `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}%`;
    pnlEl.className = `stat-value ${totalPnl >= 0 ? 'positive' : 'negative'}`;

    // Cycle accuracy
    const completed = wins + losses;
    const accuracy = completed > 0 ? ((wins / completed) * 100).toFixed(0) : 0;
    document.getElementById('cycle-accuracy').textContent = `${accuracy}%`;
  }

  function renderTimeline() {
    const container = document.getElementById('predictions-timeline');
    container.innerHTML = '';

    if (historicalCalls.length === 0) {
      container.innerHTML = '<div class="empty-state">No predictions yet this cycle</div>';
      return;
    }

    historicalCalls.forEach((call, index) => {
      const color = predictionColors[index % predictionColors.length];
      const callDate = new Date(call.date);

      const card = document.createElement('div');
      card.className = `prediction-card ${call.actualResult}`;
      card.style.borderLeftColor = color;

      const priceChange = ((call.targetPrice - call.entryPrice) / call.entryPrice * 100).toFixed(2);

      card.innerHTML = `
        <div class="prediction-header">
          <span class="prediction-day">Day ${index + 1}</span>
          <span class="prediction-date">${callDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
        </div>
        <div class="prediction-direction ${call.direction}">
          <span class="direction-arrow">${call.direction === 'up' ? '&#x25B2;' : '&#x25BC;'}</span>
          <span class="direction-text">${call.direction.toUpperCase()}</span>
          <span class="confidence">${(call.confidence * 100).toFixed(0)}% conf</span>
        </div>
        <div class="prediction-prices">
          <div class="price-row">
            <span class="price-label">Entry</span>
            <span class="price-value">$${call.entryPrice.toLocaleString()}</span>
          </div>
          <div class="price-row">
            <span class="price-label">Target</span>
            <span class="price-value ${call.direction === 'up' ? 'bullish' : 'bearish'}">
              $${call.targetPrice.toLocaleString()} (${priceChange > 0 ? '+' : ''}${priceChange}%)
            </span>
          </div>
          <div class="price-row">
            <span class="price-label">Stop Loss</span>
            <span class="price-value">$${call.stopLoss.toLocaleString()}</span>
          </div>
        </div>
        <div class="prediction-result ${call.actualResult}">
          ${call.actualResult === 'pending'
            ? '<span class="result-pending">&#x23F3; Pending</span>'
            : call.actualResult === 'win'
              ? `<span class="result-win">&#x2714; Win ${call.pnlPercent ? `(+${call.pnlPercent.toFixed(2)}%)` : ''}</span>`
              : `<span class="result-loss">&#x2718; Loss ${call.pnlPercent ? `(${call.pnlPercent.toFixed(2)}%)` : ''}</span>`
          }
        </div>
      `;

      container.appendChild(card);
    });
  }

})();
