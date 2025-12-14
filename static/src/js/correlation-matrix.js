/**
 * BTC Signal AI - Correlation Matrix Component
 * Analyzes correlations between BTC and major assets (SPX, Gold, DXY, etc.)
 * Similar to Glassnode/CryptoQuant correlation tools
 */

const BTCSAICorrelationMatrix = (function() {
  'use strict';

  // Configuration
  const CONFIG = {
    // Correlation windows (days)
    windows: [7, 30, 90, 365],
    defaultWindow: 30,
    updateInterval: 3600000, // 1 hour

    // Assets to correlate
    assets: {
      BTC: { name: 'Bitcoin', symbol: 'BTC', color: '#f7931a' },
      SPX: { name: 'S&P 500', symbol: 'SPX', color: '#3b82f6' },
      GOLD: { name: 'Gold', symbol: 'XAU', color: '#fbbf24' },
      DXY: { name: 'US Dollar', symbol: 'DXY', color: '#22c55e' },
      ETH: { name: 'Ethereum', symbol: 'ETH', color: '#627eea' },
      NASDAQ: { name: 'NASDAQ', symbol: 'NDX', color: '#8b5cf6' },
      BONDS: { name: '10Y Treasury', symbol: 'TNX', color: '#ef4444' },
      VIX: { name: 'VIX', symbol: 'VIX', color: '#f97316' }
    },

    // API endpoints for different assets
    apis: {
      crypto: 'https://api.coingecko.com/api/v3',
      // Note: Stock/commodity data requires paid APIs in production
      // Using CoinGecko for crypto and simulated data for others
    },

    storageKey: 'btcsai_correlations'
  };

  // State
  let state = {
    data: {},
    correlations: {},
    selectedWindow: CONFIG.defaultWindow,
    chart: null,
    heatmapChart: null
  };

  // ==================== DATA FETCHING ====================

  /**
   * Fetch historical data for all assets
   * @param {number} days - Number of days of history
   * @returns {Object}
   */
  async function fetchAllData(days = 365) {
    const data = {};

    // Fetch BTC data
    try {
      const btcData = await fetchCryptoData('bitcoin', days);
      if (btcData) data.BTC = btcData;
    } catch (e) {
      console.error('[Correlation] Error fetching BTC:', e);
    }

    // Fetch ETH data
    try {
      const ethData = await fetchCryptoData('ethereum', days);
      if (ethData) data.ETH = ethData;
    } catch (e) {
      console.error('[Correlation] Error fetching ETH:', e);
    }

    // For traditional assets, we'll generate synthetic data based on
    // known correlation patterns (in production, use real market data APIs)
    data.SPX = generateSyntheticAsset(data.BTC, 0.4, 0.15, days);
    data.GOLD = generateSyntheticAsset(data.BTC, -0.1, 0.08, days);
    data.DXY = generateSyntheticAsset(data.BTC, -0.3, 0.05, days);
    data.NASDAQ = generateSyntheticAsset(data.BTC, 0.5, 0.18, days);
    data.BONDS = generateSyntheticAsset(data.BTC, -0.2, 0.03, days);
    data.VIX = generateSyntheticAsset(data.BTC, -0.35, 0.25, days);

    state.data = data;
    return data;
  }

  /**
   * Fetch crypto data from CoinGecko
   * @param {string} coinId
   * @param {number} days
   * @returns {Array}
   */
  async function fetchCryptoData(coinId, days) {
    try {
      const url = `${CONFIG.apis.crypto}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.prices) return null;

      return data.prices.map(([timestamp, price]) => ({
        date: timestamp,
        price: price,
        return: 0 // Will calculate later
      }));
    } catch (e) {
      console.error('[Correlation] API error:', e);
      return null;
    }
  }

  /**
   * Generate synthetic asset data for demo
   * In production, replace with real API calls
   * @param {Array} baseData - BTC data to correlate with
   * @param {number} correlation - Target correlation coefficient
   * @param {number} volatility - Asset volatility
   * @param {number} days - Number of days
   * @returns {Array}
   */
  function generateSyntheticAsset(baseData, correlation, volatility, days) {
    if (!baseData || baseData.length === 0) return [];

    const result = [];
    let price = 100; // Normalized start price

    for (let i = 0; i < baseData.length; i++) {
      const baseReturn = i > 0
        ? (baseData[i].price - baseData[i-1].price) / baseData[i-1].price
        : 0;

      // Generate correlated return with noise
      const noise = (Math.random() - 0.5) * 2 * volatility;
      const correlatedReturn = baseReturn * correlation + noise * Math.sqrt(1 - correlation * correlation);

      price = price * (1 + correlatedReturn);

      result.push({
        date: baseData[i].date,
        price: price,
        return: correlatedReturn
      });
    }

    return result;
  }

  // ==================== CORRELATION CALCULATION ====================

  /**
   * Calculate daily returns for price series
   * @param {Array} data
   * @returns {Array}
   */
  function calculateReturns(data) {
    if (!data || data.length < 2) return [];

    const returns = [];
    for (let i = 1; i < data.length; i++) {
      const ret = (data[i].price - data[i-1].price) / data[i-1].price;
      returns.push(ret);
    }
    return returns;
  }

  /**
   * Calculate Pearson correlation coefficient
   * @param {Array} x
   * @param {Array} y
   * @returns {number}
   */
  function pearsonCorrelation(x, y) {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
  }

  /**
   * Calculate correlation matrix for all assets
   * @param {number} window - Rolling window in days
   * @returns {Object}
   */
  function calculateCorrelationMatrix(window = CONFIG.defaultWindow) {
    const assets = Object.keys(state.data);
    const matrix = {};

    assets.forEach(asset1 => {
      matrix[asset1] = {};
      assets.forEach(asset2 => {
        if (asset1 === asset2) {
          matrix[asset1][asset2] = 1;
        } else {
          // Get returns for the window
          const data1 = state.data[asset1];
          const data2 = state.data[asset2];

          if (!data1 || !data2) {
            matrix[asset1][asset2] = 0;
            return;
          }

          const returns1 = calculateReturns(data1.slice(-window));
          const returns2 = calculateReturns(data2.slice(-window));

          // Align arrays (take minimum length)
          const minLen = Math.min(returns1.length, returns2.length);
          const r1 = returns1.slice(-minLen);
          const r2 = returns2.slice(-minLen);

          matrix[asset1][asset2] = pearsonCorrelation(r1, r2);
        }
      });
    });

    state.correlations[window] = matrix;
    return matrix;
  }

  /**
   * Calculate rolling correlation time series
   * @param {string} asset1
   * @param {string} asset2
   * @param {number} window
   * @returns {Array}
   */
  function calculateRollingCorrelation(asset1, asset2, window = 30) {
    const data1 = state.data[asset1];
    const data2 = state.data[asset2];

    if (!data1 || !data2) return [];

    const returns1 = calculateReturns(data1);
    const returns2 = calculateReturns(data2);

    const minLen = Math.min(returns1.length, returns2.length);
    const r1 = returns1.slice(-minLen);
    const r2 = returns2.slice(-minLen);
    const dates = data1.slice(-minLen).map(d => d.date);

    const rolling = [];
    for (let i = window; i <= r1.length; i++) {
      const slice1 = r1.slice(i - window, i);
      const slice2 = r2.slice(i - window, i);
      rolling.push({
        date: dates[i - 1],
        correlation: pearsonCorrelation(slice1, slice2)
      });
    }

    return rolling;
  }

  // ==================== VISUALIZATION ====================

  /**
   * Initialize the correlation component
   * @param {Object} options
   */
  async function init(options = {}) {
    const { matrixId, chartId, onLoad } = options;

    // Fetch data
    await fetchAllData(365);

    // Calculate correlations for all windows
    CONFIG.windows.forEach(window => {
      calculateCorrelationMatrix(window);
    });

    // Render matrix
    if (matrixId) {
      renderMatrix(matrixId, state.selectedWindow);
    }

    // Render chart
    if (chartId) {
      renderCorrelationChart(chartId, 'BTC', 'SPX');
    }

    if (onLoad) onLoad(state.correlations);

    console.log('[Correlation] Initialized');
  }

  /**
   * Render correlation matrix heatmap
   * @param {string} containerId
   * @param {number} window
   */
  function renderMatrix(containerId, window = CONFIG.defaultWindow) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const matrix = state.correlations[window];
    if (!matrix) return;

    const assets = Object.keys(matrix);

    // Build HTML table
    let html = `
      <div class="correlation-controls">
        <div class="window-select">
          ${CONFIG.windows.map(w => `
            <button class="window-btn ${w === window ? 'active' : ''}" data-window="${w}">
              ${w}D
            </button>
          `).join('')}
        </div>
      </div>
      <div class="correlation-matrix-container">
        <table class="correlation-matrix">
          <thead>
            <tr>
              <th></th>
              ${assets.map(a => `<th title="${CONFIG.assets[a]?.name || a}">${a}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${assets.map(asset1 => `
              <tr>
                <td class="row-header" title="${CONFIG.assets[asset1]?.name || asset1}">${asset1}</td>
                ${assets.map(asset2 => {
                  const corr = matrix[asset1][asset2];
                  const color = getCorrelationColor(corr);
                  return `
                    <td class="corr-cell"
                        style="background-color: ${color}"
                        title="${asset1} vs ${asset2}: ${corr.toFixed(3)}"
                        data-asset1="${asset1}"
                        data-asset2="${asset2}">
                      ${asset1 === asset2 ? '1' : corr.toFixed(2)}
                    </td>
                  `;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="correlation-legend">
        <span class="legend-label">-1.0 (Inverse)</span>
        <div class="legend-gradient"></div>
        <span class="legend-label">+1.0 (Positive)</span>
      </div>
    `;

    container.innerHTML = html;

    // Add event listeners
    container.querySelectorAll('.window-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedWindow = parseInt(btn.dataset.window);
        renderMatrix(containerId, state.selectedWindow);
      });
    });

    // Add click handler for cells
    container.querySelectorAll('.corr-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const a1 = cell.dataset.asset1;
        const a2 = cell.dataset.asset2;
        if (a1 !== a2) {
          showCorrelationDetail(a1, a2);
        }
      });
    });

    // Add styles
    addStyles();
  }

  /**
   * Get color for correlation value
   * @param {number} corr - Correlation coefficient (-1 to 1)
   * @returns {string}
   */
  function getCorrelationColor(corr) {
    // Red for negative, green for positive, intensity based on absolute value
    const intensity = Math.abs(corr);
    const alpha = 0.2 + intensity * 0.6;

    if (corr < 0) {
      return `rgba(239, 68, 68, ${alpha})`; // Red
    } else if (corr > 0) {
      return `rgba(34, 197, 94, ${alpha})`; // Green
    }
    return 'rgba(128, 128, 128, 0.2)'; // Gray for zero
  }

  /**
   * Render rolling correlation chart
   * @param {string} containerId
   * @param {string} asset1
   * @param {string} asset2
   */
  function renderCorrelationChart(containerId, asset1, asset2) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear existing chart
    if (state.chart) {
      state.chart.destroy();
    }

    const rolling = calculateRollingCorrelation(asset1, asset2, state.selectedWindow);
    if (!rolling.length) return;

    const ctx = container.getContext ? container.getContext('2d') : null;
    if (!ctx) {
      // Container is not a canvas, create one
      const canvas = document.createElement('canvas');
      canvas.id = containerId + '-canvas';
      container.innerHTML = '';
      container.appendChild(canvas);
      return renderCorrelationChart(containerId + '-canvas', asset1, asset2);
    }

    state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: rolling.map(d => new Date(d.date).toLocaleDateString()),
        datasets: [{
          label: `${asset1}/${asset2} Correlation (${state.selectedWindow}D)`,
          data: rolling.map(d => d.correlation),
          borderColor: '#3b82f6',
          backgroundColor: rolling.map(d =>
            d.correlation >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'
          ),
          fill: true,
          tension: 0.4,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: '#9ca3af' }
          },
          tooltip: {
            callbacks: {
              label: ctx => `Correlation: ${ctx.raw.toFixed(3)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#9ca3af', maxTicksLimit: 8 }
          },
          y: {
            min: -1,
            max: 1,
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: '#9ca3af' }
          }
        }
      }
    });
  }

  /**
   * Show detail modal/panel for correlation pair
   * @param {string} asset1
   * @param {string} asset2
   */
  function showCorrelationDetail(asset1, asset2) {
    const rolling = calculateRollingCorrelation(asset1, asset2, state.selectedWindow);
    const current = rolling.length > 0 ? rolling[rolling.length - 1].correlation : 0;
    const avg = rolling.length > 0
      ? rolling.reduce((s, r) => s + r.correlation, 0) / rolling.length
      : 0;
    const min = rolling.length > 0 ? Math.min(...rolling.map(r => r.correlation)) : 0;
    const max = rolling.length > 0 ? Math.max(...rolling.map(r => r.correlation)) : 0;

    // Create or update detail panel
    let panel = document.getElementById('correlation-detail');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'correlation-detail';
      panel.className = 'correlation-detail-panel';
      document.body.appendChild(panel);
    }

    panel.innerHTML = `
      <div class="detail-header">
        <h3>${asset1} vs ${asset2}</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="detail-stats">
        <div class="stat">
          <span class="stat-label">Current</span>
          <span class="stat-value ${current >= 0 ? 'positive' : 'negative'}">${current.toFixed(3)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Average</span>
          <span class="stat-value">${avg.toFixed(3)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Min</span>
          <span class="stat-value negative">${min.toFixed(3)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Max</span>
          <span class="stat-value positive">${max.toFixed(3)}</span>
        </div>
      </div>
      <div class="detail-chart">
        <canvas id="detail-chart-canvas"></canvas>
      </div>
      <div class="detail-interpretation">
        <h4>Interpretation</h4>
        <p>${getCorrelationInterpretation(current, asset1, asset2)}</p>
      </div>
    `;

    panel.style.display = 'block';

    // Close button
    panel.querySelector('.close-btn').addEventListener('click', () => {
      panel.style.display = 'none';
    });

    // Render mini chart
    setTimeout(() => {
      const ctx = document.getElementById('detail-chart-canvas');
      if (ctx) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: rolling.slice(-60).map(d => new Date(d.date).toLocaleDateString()),
            datasets: [{
              data: rolling.slice(-60).map(d => d.correlation),
              borderColor: '#3b82f6',
              fill: false,
              tension: 0.4,
              pointRadius: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { display: false },
              y: { min: -1, max: 1, ticks: { color: '#9ca3af' } }
            }
          }
        });
      }
    }, 100);
  }

  /**
   * Get interpretation text for correlation
   * @param {number} corr
   * @param {string} asset1
   * @param {string} asset2
   * @returns {string}
   */
  function getCorrelationInterpretation(corr, asset1, asset2) {
    const a1 = CONFIG.assets[asset1]?.name || asset1;
    const a2 = CONFIG.assets[asset2]?.name || asset2;
    const abs = Math.abs(corr);

    let strength = '';
    if (abs >= 0.7) strength = 'strong';
    else if (abs >= 0.4) strength = 'moderate';
    else if (abs >= 0.2) strength = 'weak';
    else strength = 'negligible';

    if (corr > 0.2) {
      return `${a1} and ${a2} show a ${strength} positive correlation (${corr.toFixed(2)}). When ${a2} moves up, ${a1} tends to move in the same direction. This suggests they may share common market drivers or risk sentiment.`;
    } else if (corr < -0.2) {
      return `${a1} and ${a2} show a ${strength} negative correlation (${corr.toFixed(2)}). When ${a2} moves up, ${a1} tends to move in the opposite direction. ${a2} may serve as a hedge against ${a1} movements.`;
    } else {
      return `${a1} and ${a2} show ${strength} to no correlation (${corr.toFixed(2)}). Their price movements are largely independent of each other, making ${a2} useful for portfolio diversification.`;
    }
  }

  /**
   * Add component styles
   */
  function addStyles() {
    if (document.getElementById('corr-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'corr-styles';
    styles.textContent = `
      .correlation-controls {
        margin-bottom: 15px;
      }
      .window-select {
        display: flex;
        gap: 8px;
      }
      .window-btn {
        padding: 6px 12px;
        border: 1px solid rgba(255,255,255,0.2);
        background: transparent;
        color: #9ca3af;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }
      .window-btn:hover {
        background: rgba(255,255,255,0.1);
      }
      .window-btn.active {
        background: #3b82f6;
        border-color: #3b82f6;
        color: white;
      }
      .correlation-matrix-container {
        overflow-x: auto;
      }
      .correlation-matrix {
        border-collapse: collapse;
        width: 100%;
        font-size: 12px;
      }
      .correlation-matrix th,
      .correlation-matrix td {
        padding: 8px;
        text-align: center;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .correlation-matrix th {
        background: rgba(255,255,255,0.05);
        color: #9ca3af;
        font-weight: 500;
      }
      .correlation-matrix .row-header {
        background: rgba(255,255,255,0.05);
        color: #9ca3af;
        font-weight: 500;
      }
      .corr-cell {
        cursor: pointer;
        transition: transform 0.2s;
        color: #fff;
        font-weight: 500;
      }
      .corr-cell:hover {
        transform: scale(1.1);
        z-index: 10;
        position: relative;
      }
      .correlation-legend {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 15px;
        font-size: 11px;
        color: #9ca3af;
      }
      .legend-gradient {
        flex: 1;
        height: 8px;
        background: linear-gradient(to right, #ef4444, #6b7280, #22c55e);
        border-radius: 4px;
      }
      .correlation-detail-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1a1a2e;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 20px;
        width: 400px;
        max-width: 90vw;
        z-index: 1000;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      }
      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }
      .detail-header h3 {
        margin: 0;
        color: #fff;
      }
      .close-btn {
        background: none;
        border: none;
        color: #9ca3af;
        font-size: 24px;
        cursor: pointer;
      }
      .detail-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 15px;
      }
      .stat {
        text-align: center;
      }
      .stat-label {
        display: block;
        font-size: 11px;
        color: #9ca3af;
      }
      .stat-value {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
      }
      .stat-value.positive { color: #22c55e; }
      .stat-value.negative { color: #ef4444; }
      .detail-chart {
        height: 150px;
        margin-bottom: 15px;
      }
      .detail-interpretation {
        background: rgba(255,255,255,0.05);
        padding: 10px;
        border-radius: 4px;
      }
      .detail-interpretation h4 {
        margin: 0 0 8px 0;
        color: #9ca3af;
        font-size: 12px;
      }
      .detail-interpretation p {
        margin: 0;
        color: #d1d5db;
        font-size: 13px;
        line-height: 1.5;
      }
    `;
    document.head.appendChild(styles);
  }

  // ==================== PUBLIC API ====================

  return {
    init,
    fetchAllData,
    calculateCorrelationMatrix,
    calculateRollingCorrelation,
    renderMatrix,
    renderCorrelationChart,
    setWindow: (window) => {
      state.selectedWindow = window;
    },
    getCorrelation: (asset1, asset2, window = CONFIG.defaultWindow) => {
      const matrix = state.correlations[window];
      return matrix?.[asset1]?.[asset2] || 0;
    },
    getState: () => ({ ...state }),
    CONFIG
  };
})();

// Export
if (typeof window !== 'undefined') {
  window.BTCSAICorrelationMatrix = BTCSAICorrelationMatrix;
}
