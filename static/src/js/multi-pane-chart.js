/**
 * BTC Signal AI - Multi-Pane Chart Component
 * TradingView-style charts with price and indicator panes
 */

const BTCSAIMultiPaneChart = (function() {
  'use strict';

  // Chart instances
  let priceChart = null;
  let indicatorCharts = {};
  let chartData = null;
  let currentTimeframe = '1h';

  // Configuration
  const CONFIG = {
    priceHeight: 400,
    indicatorHeight: 150,
    colors: {
      background: '#1a1a2e',
      grid: 'rgba(255,255,255,0.05)',
      text: '#9ca3af',
      bullish: '#22c55e',
      bearish: '#ef4444',
      volume: 'rgba(59, 130, 246, 0.5)',
      ema9: '#f59e0b',
      ema21: '#8b5cf6',
      ema50: '#06b6d4',
      ema200: '#ec4899',
      bbUpper: 'rgba(147, 51, 234, 0.5)',
      bbLower: 'rgba(147, 51, 234, 0.5)',
      bbMiddle: '#9333ea',
      rsi: '#f59e0b',
      rsiOverbought: 'rgba(239, 68, 68, 0.3)',
      rsiOversold: 'rgba(34, 197, 94, 0.3)',
      macdLine: '#3b82f6',
      macdSignal: '#f59e0b',
      macdHistPositive: 'rgba(34, 197, 94, 0.5)',
      macdHistNegative: 'rgba(239, 68, 68, 0.5)'
    }
  };

  /**
   * Initialize multi-pane chart
   * @param {string} containerId - Container element ID
   * @param {Object} options - { indicators: ['RSI', 'MACD', 'Volume'] }
   */
  async function init(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const indicators = options.indicators || ['Volume'];

    // Create container structure
    container.innerHTML = `
      <div class="mpc-controls">
        <div class="mpc-timeframes">
          <button class="mpc-tf-btn" data-tf="15m">15m</button>
          <button class="mpc-tf-btn active" data-tf="1h">1H</button>
          <button class="mpc-tf-btn" data-tf="4h">4H</button>
          <button class="mpc-tf-btn" data-tf="1d">1D</button>
        </div>
        <div class="mpc-indicators">
          <button class="mpc-ind-btn ${indicators.includes('RSI') ? 'active' : ''}" data-ind="RSI">RSI</button>
          <button class="mpc-ind-btn ${indicators.includes('MACD') ? 'active' : ''}" data-ind="MACD">MACD</button>
          <button class="mpc-ind-btn ${indicators.includes('Volume') ? 'active' : ''}" data-ind="Volume">Vol</button>
          <button class="mpc-ind-btn ${indicators.includes('BB') ? 'active' : ''}" data-ind="BB">BB</button>
          <button class="mpc-ind-btn ${indicators.includes('Stoch') ? 'active' : ''}" data-ind="Stoch">Stoch</button>
        </div>
      </div>
      <div class="mpc-price-pane">
        <canvas id="${containerId}-price"></canvas>
      </div>
      ${indicators.map(ind => `
        <div class="mpc-indicator-pane" data-indicator="${ind}">
          <div class="mpc-ind-label">${ind}</div>
          <canvas id="${containerId}-${ind.toLowerCase()}"></canvas>
        </div>
      `).join('')}
    `;

    // Add styles
    addStyles();

    // Setup event listeners
    setupEventListeners(containerId, indicators);

    // Load data and render
    await loadData(currentTimeframe);
    renderCharts(containerId, indicators);
  }

  /**
   * Load OHLC data
   * @param {string} timeframe
   */
  async function loadData(timeframe) {
    currentTimeframe = timeframe;
    const data = await BTCSAIShared.fetchOHLCData(timeframe, 200);

    if (data && data.length > 0) {
      // Calculate all indicators
      chartData = calculateAllIndicators(data);
    }
  }

  /**
   * Calculate all indicators for chart data
   * @param {Array} data - OHLC data
   * @returns {Object}
   */
  function calculateAllIndicators(data) {
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    // Use BTCSAIIndicators module if available
    const ind = window.BTCSAIIndicators || {};

    return {
      candles: data,
      ema9: ind.EMA ? ind.EMA(closes, 9) : [],
      ema21: ind.EMA ? ind.EMA(closes, 21) : [],
      ema50: ind.EMA ? ind.EMA(closes, 50) : [],
      ema200: ind.EMA ? ind.EMA(closes, 200) : [],
      rsi: ind.RSI ? ind.RSI(data, 14) : [],
      macd: ind.MACD ? ind.MACD(data) : { macd: [], signal: [], histogram: [] },
      bb: ind.BollingerBands ? ind.BollingerBands(data, 20, 2) : { upper: [], middle: [], lower: [] },
      stoch: ind.Stochastic ? ind.Stochastic(data) : { k: [], d: [] },
      volume: data.map(d => d.volume)
    };
  }

  /**
   * Render all charts
   * @param {string} containerId
   * @param {Array} indicators
   */
  function renderCharts(containerId, indicators) {
    if (!chartData) return;

    // Destroy existing charts
    if (priceChart) priceChart.destroy();
    Object.values(indicatorCharts).forEach(c => c.destroy());
    indicatorCharts = {};

    // Render price chart
    renderPriceChart(containerId);

    // Render indicator charts
    indicators.forEach(ind => {
      renderIndicatorChart(containerId, ind);
    });
  }

  /**
   * Render main price chart
   * @param {string} containerId
   */
  function renderPriceChart(containerId) {
    const ctx = document.getElementById(`${containerId}-price`);
    if (!ctx) return;

    const labels = chartData.candles.map(c =>
      new Date(c.time).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    );

    // Prepare candlestick-like data using line chart
    const ohlcData = chartData.candles.map((c, i) => ({
      x: i,
      o: c.open,
      h: c.high,
      l: c.low,
      c: c.close
    }));

    const datasets = [
      // Close price line
      {
        label: 'Price',
        data: chartData.candles.map(c => c.close),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0,
        pointRadius: 0
      },
      // EMAs
      {
        label: 'EMA 9',
        data: chartData.ema9,
        borderColor: CONFIG.colors.ema9,
        borderWidth: 1,
        fill: false,
        pointRadius: 0
      },
      {
        label: 'EMA 21',
        data: chartData.ema21,
        borderColor: CONFIG.colors.ema21,
        borderWidth: 1,
        fill: false,
        pointRadius: 0
      }
    ];

    // Add Bollinger Bands if enabled
    if (chartData.bb.upper.length > 0) {
      datasets.push({
        label: 'BB Upper',
        data: chartData.bb.upper,
        borderColor: CONFIG.colors.bbUpper,
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      });
      datasets.push({
        label: 'BB Lower',
        data: chartData.bb.lower,
        borderColor: CONFIG.colors.bbLower,
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      });
    }

    priceChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
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
            labels: { color: CONFIG.colors.text, boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: $${context.raw?.toLocaleString() || '--'}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: CONFIG.colors.grid },
            ticks: { color: CONFIG.colors.text, maxTicksLimit: 10 }
          },
          y: {
            grid: { color: CONFIG.colors.grid },
            ticks: {
              color: CONFIG.colors.text,
              callback: value => '$' + value.toLocaleString()
            }
          }
        }
      }
    });
  }

  /**
   * Render indicator chart
   * @param {string} containerId
   * @param {string} indicator
   */
  function renderIndicatorChart(containerId, indicator) {
    const ctx = document.getElementById(`${containerId}-${indicator.toLowerCase()}`);
    if (!ctx) return;

    const labels = chartData.candles.map((c, i) => i);
    let datasets = [];
    let options = getBaseIndicatorOptions();

    switch (indicator) {
      case 'RSI':
        datasets = [{
          label: 'RSI',
          data: chartData.rsi,
          borderColor: CONFIG.colors.rsi,
          borderWidth: 2,
          fill: false,
          pointRadius: 0
        }];
        options.scales.y.min = 0;
        options.scales.y.max = 100;
        // Add overbought/oversold zones
        options.plugins.annotation = {
          annotations: {
            overbought: {
              type: 'box',
              yMin: 70, yMax: 100,
              backgroundColor: CONFIG.colors.rsiOverbought,
              borderWidth: 0
            },
            oversold: {
              type: 'box',
              yMin: 0, yMax: 30,
              backgroundColor: CONFIG.colors.rsiOversold,
              borderWidth: 0
            }
          }
        };
        break;

      case 'MACD':
        datasets = [
          {
            label: 'MACD',
            data: chartData.macd.macd,
            borderColor: CONFIG.colors.macdLine,
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'Signal',
            data: chartData.macd.signal,
            borderColor: CONFIG.colors.macdSignal,
            borderWidth: 1,
            fill: false,
            pointRadius: 0
          },
          {
            label: 'Histogram',
            data: chartData.macd.histogram,
            type: 'bar',
            backgroundColor: chartData.macd.histogram.map(v =>
              v >= 0 ? CONFIG.colors.macdHistPositive : CONFIG.colors.macdHistNegative
            ),
            borderWidth: 0
          }
        ];
        break;

      case 'Volume':
        datasets = [{
          label: 'Volume',
          data: chartData.volume,
          type: 'bar',
          backgroundColor: chartData.candles.map((c, i) =>
            c.close >= c.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
          ),
          borderWidth: 0
        }];
        options.scales.y.ticks.callback = v => formatCompact(v);
        break;

      case 'Stoch':
        datasets = [
          {
            label: '%K',
            data: chartData.stoch.k,
            borderColor: '#3b82f6',
            borderWidth: 2,
            fill: false,
            pointRadius: 0
          },
          {
            label: '%D',
            data: chartData.stoch.d,
            borderColor: '#f59e0b',
            borderWidth: 1,
            fill: false,
            pointRadius: 0
          }
        ];
        options.scales.y.min = 0;
        options.scales.y.max = 100;
        break;

      case 'BB':
        // BB is shown on price chart, not separate pane
        return;
    }

    indicatorCharts[indicator] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options
    });
  }

  /**
   * Get base options for indicator charts
   * @returns {Object}
   */
  function getBaseIndicatorOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          display: false,
          grid: { display: false }
        },
        y: {
          grid: { color: CONFIG.colors.grid },
          ticks: { color: CONFIG.colors.text }
        }
      }
    };
  }

  /**
   * Setup event listeners
   * @param {string} containerId
   * @param {Array} indicators
   */
  function setupEventListeners(containerId, indicators) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Timeframe buttons
    container.querySelectorAll('.mpc-tf-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        container.querySelectorAll('.mpc-tf-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        await loadData(this.dataset.tf);
        renderCharts(containerId, getActiveIndicators(container));
      });
    });

    // Indicator toggle buttons
    container.querySelectorAll('.mpc-ind-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        this.classList.toggle('active');
        const ind = this.dataset.ind;
        const pane = container.querySelector(`.mpc-indicator-pane[data-indicator="${ind}"]`);

        if (this.classList.contains('active')) {
          // Add pane if doesn't exist
          if (!pane) {
            const newPane = document.createElement('div');
            newPane.className = 'mpc-indicator-pane';
            newPane.dataset.indicator = ind;
            newPane.innerHTML = `
              <div class="mpc-ind-label">${ind}</div>
              <canvas id="${containerId}-${ind.toLowerCase()}"></canvas>
            `;
            container.appendChild(newPane);
            renderIndicatorChart(containerId, ind);
          } else {
            pane.style.display = 'block';
          }
        } else {
          // Hide pane
          if (pane) pane.style.display = 'none';
          if (indicatorCharts[ind]) {
            indicatorCharts[ind].destroy();
            delete indicatorCharts[ind];
          }
        }
      });
    });
  }

  /**
   * Get active indicators from UI
   * @param {Element} container
   * @returns {Array}
   */
  function getActiveIndicators(container) {
    const active = [];
    container.querySelectorAll('.mpc-ind-btn.active').forEach(btn => {
      active.push(btn.dataset.ind);
    });
    return active;
  }

  /**
   * Add CSS styles
   */
  function addStyles() {
    if (document.getElementById('mpc-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'mpc-styles';
    styles.textContent = `
      .mpc-controls {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        flex-wrap: wrap;
        gap: 10px;
      }
      .mpc-timeframes, .mpc-indicators {
        display: flex;
        gap: 5px;
      }
      .mpc-tf-btn, .mpc-ind-btn {
        padding: 6px 12px;
        border: 1px solid rgba(255,255,255,0.2);
        background: transparent;
        color: #9ca3af;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      .mpc-tf-btn:hover, .mpc-ind-btn:hover {
        background: rgba(255,255,255,0.1);
      }
      .mpc-tf-btn.active {
        background: #3b82f6;
        border-color: #3b82f6;
        color: white;
      }
      .mpc-ind-btn.active {
        background: rgba(59, 130, 246, 0.3);
        border-color: #3b82f6;
        color: #3b82f6;
      }
      .mpc-price-pane {
        height: ${CONFIG.priceHeight}px;
        margin-bottom: 5px;
      }
      .mpc-indicator-pane {
        height: ${CONFIG.indicatorHeight}px;
        margin-top: 5px;
        position: relative;
        border-top: 1px solid rgba(255,255,255,0.1);
      }
      .mpc-ind-label {
        position: absolute;
        top: 5px;
        left: 10px;
        font-size: 11px;
        color: #9ca3af;
        z-index: 10;
      }
    `;
    document.head.appendChild(styles);
  }

  function formatCompact(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toFixed(0);
  }

  // Public API
  return {
    init,
    loadData,
    refresh: async function(containerId, indicators) {
      await loadData(currentTimeframe);
      renderCharts(containerId, indicators);
    }
  };
})();

// Export
if (typeof window !== 'undefined') {
  window.BTCSAIMultiPaneChart = BTCSAIMultiPaneChart;
}
