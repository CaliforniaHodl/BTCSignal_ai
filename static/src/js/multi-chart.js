/**
 * BTC Signal AI - Multi-Chart Layout System
 * View multiple timeframes simultaneously with synced crosshairs
 * Supports single, split, quad, and custom grid layouts
 */

const MultiChart = (function() {
  'use strict';

  // ========== STATE ==========
  const state = {
    charts: new Map(), // chartId -> chart instance
    chartConfigs: new Map(), // chartId -> config object
    currentLayout: 'single',
    crosshairSync: true,
    container: null,
    nextChartId: 1
  };

  // ========== LAYOUT CONFIGURATIONS ==========
  const LAYOUTS = {
    single: {
      name: 'Single',
      grid: '1x1',
      cells: [{ id: 1, row: 0, col: 0, rowSpan: 1, colSpan: 1 }]
    },
    splitHorizontal: {
      name: 'Split Horizontal',
      grid: '1x2',
      cells: [
        { id: 1, row: 0, col: 0, rowSpan: 1, colSpan: 1 },
        { id: 2, row: 0, col: 1, rowSpan: 1, colSpan: 1 }
      ]
    },
    splitVertical: {
      name: 'Split Vertical',
      grid: '2x1',
      cells: [
        { id: 1, row: 0, col: 0, rowSpan: 1, colSpan: 1 },
        { id: 2, row: 1, col: 0, rowSpan: 1, colSpan: 1 }
      ]
    },
    quad: {
      name: 'Quad',
      grid: '2x2',
      cells: [
        { id: 1, row: 0, col: 0, rowSpan: 1, colSpan: 1 },
        { id: 2, row: 0, col: 1, rowSpan: 1, colSpan: 1 },
        { id: 3, row: 1, col: 0, rowSpan: 1, colSpan: 1 },
        { id: 4, row: 1, col: 1, rowSpan: 1, colSpan: 1 }
      ]
    }
  };

  // Default timeframes for multi-chart layouts
  const DEFAULT_TIMEFRAMES = {
    single: ['4h'],
    splitHorizontal: ['1h', '4h'],
    splitVertical: ['15m', '4h'],
    quad: ['15m', '1h', '4h', '1d']
  };

  // ========== CHART COLORS & THEME ==========
  const CHART_THEME = {
    background: '#0d1117',
    grid: '#21262d',
    text: '#8d96a0',
    crosshair: '#58a6ff',
    borderColor: '#30363d',
    bullish: '#3fb950',
    bearish: '#f85149'
  };

  // ========== INITIALIZATION ==========

  /**
   * Initialize the multi-chart system
   * @param {string|HTMLElement} container - Container element or ID
   * @param {Object} options - Configuration options
   * @returns {boolean} Success status
   */
  function init(container, options = {}) {
    // Get container element
    if (typeof container === 'string') {
      state.container = document.getElementById(container);
    } else {
      state.container = container;
    }

    if (!state.container) {
      console.error('[MultiChart] Container not found');
      return false;
    }

    // Check for LightweightCharts
    if (typeof LightweightCharts === 'undefined') {
      console.error('[MultiChart] LightweightCharts library not loaded');
      return false;
    }

    // Load saved layout or use default
    const savedLayout = loadLayoutPreference();
    const layout = options.layout || savedLayout || 'single';

    state.crosshairSync = options.crosshairSync !== undefined ?
      options.crosshairSync : true;

    // Inject styles
    injectStyles();

    // Create initial layout
    setLayout(layout, options.timeframes);

    console.log('[MultiChart] Initialized with layout:', layout);
    return true;
  }

  // ========== LAYOUT MANAGEMENT ==========

  /**
   * Set the chart layout
   * @param {string} layoutType - Layout type (single, splitHorizontal, splitVertical, quad)
   * @param {Array<string>} timeframes - Optional timeframes for each chart
   */
  function setLayout(layoutType, timeframes = null) {
    if (!LAYOUTS[layoutType]) {
      console.error('[MultiChart] Invalid layout type:', layoutType);
      return;
    }

    const layout = LAYOUTS[layoutType];
    state.currentLayout = layoutType;

    // Use provided timeframes or defaults
    const chartTimeframes = timeframes || DEFAULT_TIMEFRAMES[layoutType];

    // Clear existing charts
    clearAllCharts();

    // Create container structure
    createLayoutStructure(layout);

    // Create charts for each cell
    layout.cells.forEach((cell, index) => {
      const timeframe = chartTimeframes[index] || '4h';
      const chartId = `chart-${cell.id}`;

      createChart(chartId, {
        timeframe: timeframe,
        cellId: cell.id
      });
    });

    // Setup crosshair sync if enabled
    if (state.crosshairSync) {
      setupCrosshairSync();
    }

    // Save layout preference
    saveLayoutPreference(layoutType);

    // Emit layout change event
    emitEvent('layoutChange', { layout: layoutType, chartCount: layout.cells.length });
  }

  /**
   * Create the DOM structure for a layout
   * @param {Object} layout - Layout configuration
   */
  function createLayoutStructure(layout) {
    const [rows, cols] = layout.grid.split('x').map(Number);

    state.container.innerHTML = `
      <div class="mc-wrapper">
        <div class="mc-toolbar">
          <div class="mc-toolbar-left">
            <span class="mc-title">Multi-Chart</span>
            <div class="mc-layout-selector">
              ${Object.keys(LAYOUTS).map(key => `
                <button class="mc-layout-btn ${key === state.currentLayout ? 'active' : ''}"
                        data-layout="${key}"
                        title="${LAYOUTS[key].name}">
                  ${getLayoutIcon(key)}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="mc-toolbar-right">
            <label class="mc-sync-toggle">
              <input type="checkbox" id="mc-crosshair-sync" ${state.crosshairSync ? 'checked' : ''}>
              <span>Sync Crosshair</span>
            </label>
          </div>
        </div>
        <div class="mc-grid" style="grid-template-rows: repeat(${rows}, 1fr); grid-template-columns: repeat(${cols}, 1fr);">
          ${layout.cells.map(cell => `
            <div class="mc-cell"
                 data-cell-id="${cell.id}"
                 style="grid-row: ${cell.row + 1} / span ${cell.rowSpan}; grid-column: ${cell.col + 1} / span ${cell.colSpan};">
              <div class="mc-cell-header">
                <select class="mc-timeframe-select" data-chart-id="chart-${cell.id}">
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                  <option value="15m">15m</option>
                  <option value="1h">1H</option>
                  <option value="4h" selected>4H</option>
                  <option value="1d">1D</option>
                  <option value="1w">1W</option>
                </select>
                <span class="mc-cell-title">BTC/USD</span>
                <button class="mc-cell-close" data-chart-id="chart-${cell.id}" title="Remove chart">×</button>
              </div>
              <div class="mc-chart-container" id="chart-${cell.id}"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Setup event listeners
    setupEventListeners();
  }

  /**
   * Get icon SVG for layout button
   * @param {string} layoutType - Layout type
   * @returns {string} SVG icon
   */
  function getLayoutIcon(layoutType) {
    const icons = {
      single: '<svg width="16" height="16"><rect width="16" height="16" fill="currentColor"/></svg>',
      splitHorizontal: '<svg width="16" height="16"><rect width="7" height="16" fill="currentColor"/><rect x="9" width="7" height="16" fill="currentColor"/></svg>',
      splitVertical: '<svg width="16" height="16"><rect width="16" height="7" fill="currentColor"/><rect y="9" width="16" height="7" fill="currentColor"/></svg>',
      quad: '<svg width="16" height="16"><rect width="7" height="7" fill="currentColor"/><rect x="9" width="7" height="7" fill="currentColor"/><rect y="9" width="7" height="7" fill="currentColor"/><rect x="9" y="9" width="7" height="7" fill="currentColor"/></svg>'
    };
    return icons[layoutType] || '';
  }

  // ========== CHART CREATION ==========

  /**
   * Create a new chart instance
   * @param {string} chartId - Unique chart identifier
   * @param {Object} config - Chart configuration
   * @returns {Object} Chart instance
   */
  function createChart(chartId, config = {}) {
    const container = document.getElementById(chartId);
    if (!container) {
      console.error('[MultiChart] Chart container not found:', chartId);
      return null;
    }

    // Create chart with LightweightCharts
    const chart = LightweightCharts.createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight - 40, // Account for header
      layout: {
        background: { color: CHART_THEME.background },
        textColor: CHART_THEME.text
      },
      grid: {
        vertLines: { color: CHART_THEME.grid },
        horzLines: { color: CHART_THEME.grid }
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
          color: CHART_THEME.crosshair,
          width: 1,
          style: LightweightCharts.LineStyle.Dashed
        },
        horzLine: {
          color: CHART_THEME.crosshair,
          width: 1,
          style: LightweightCharts.LineStyle.Dashed
        }
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: CHART_THEME.borderColor
      },
      rightPriceScale: {
        borderColor: CHART_THEME.borderColor
      }
    });

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: CHART_THEME.bullish,
      downColor: CHART_THEME.bearish,
      borderUpColor: CHART_THEME.bullish,
      borderDownColor: CHART_THEME.bearish,
      wickUpColor: CHART_THEME.bullish,
      wickDownColor: CHART_THEME.bearish
    });

    // Store chart instance and config
    state.charts.set(chartId, {
      chart: chart,
      candleSeries: candleSeries,
      container: container
    });

    state.chartConfigs.set(chartId, {
      timeframe: config.timeframe || '4h',
      cellId: config.cellId,
      ...config
    });

    // Load data
    loadChartData(chartId, config.timeframe || '4h');

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height - 40;
        if (width > 0 && height > 0) {
          chart.resize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    return chart;
  }

  /**
   * Load data for a specific chart
   * @param {string} chartId - Chart identifier
   * @param {string} timeframe - Timeframe to load
   */
  async function loadChartData(chartId, timeframe) {
    const chartObj = state.charts.get(chartId);
    if (!chartObj) return;

    try {
      // Use BTCSAIShared if available, otherwise generate sample data
      let data;
      if (typeof BTCSAIShared !== 'undefined' && BTCSAIShared.fetchOHLCData) {
        data = await BTCSAIShared.fetchOHLCData(timeframe, 200);
      } else {
        data = generateSampleData(200);
      }

      // Set data to candlestick series
      chartObj.candleSeries.setData(data);

      // Update timeframe selector
      const selector = state.container.querySelector(`select[data-chart-id="${chartId}"]`);
      if (selector) {
        selector.value = timeframe;
      }

      // Update config
      const config = state.chartConfigs.get(chartId);
      if (config) {
        config.timeframe = timeframe;
        state.chartConfigs.set(chartId, config);
      }

      console.log(`[MultiChart] Loaded ${data.length} candles for ${chartId} (${timeframe})`);
    } catch (error) {
      console.error('[MultiChart] Error loading chart data:', error);
    }
  }

  /**
   * Generate sample OHLC data for testing
   * @param {number} count - Number of candles
   * @returns {Array} OHLC data
   */
  function generateSampleData(count) {
    const data = [];
    let basePrice = 45000;
    const now = Math.floor(Date.now() / 1000);
    const interval = 3600; // 1 hour

    for (let i = 0; i < count; i++) {
      const time = now - (count - i) * interval;
      const change = (Math.random() - 0.5) * 1000;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * 200;
      const low = Math.min(open, close) - Math.random() * 200;

      data.push({
        time: time,
        open: open,
        high: high,
        low: low,
        close: close
      });

      basePrice = close;
    }

    return data;
  }

  // ========== CROSSHAIR SYNCHRONIZATION ==========

  /**
   * Setup crosshair synchronization across all charts
   */
  function setupCrosshairSync() {
    if (!state.crosshairSync || state.charts.size < 2) return;

    const chartArray = Array.from(state.charts.values());

    chartArray.forEach((sourceChart, sourceIndex) => {
      sourceChart.chart.subscribeCrosshairMove(param => {
        if (!param || !param.time) {
          // Clear crosshair on other charts
          chartArray.forEach((targetChart, targetIndex) => {
            if (targetIndex !== sourceIndex) {
              targetChart.chart.clearCrosshairPosition();
            }
          });
          return;
        }

        // Sync crosshair position to other charts
        chartArray.forEach((targetChart, targetIndex) => {
          if (targetIndex !== sourceIndex) {
            targetChart.chart.setCrosshairPosition(
              param.seriesPrices.get(sourceChart.candleSeries),
              param.time,
              targetChart.candleSeries
            );
          }
        });
      });
    });

    console.log('[MultiChart] Crosshair sync enabled for', chartArray.length, 'charts');
  }

  /**
   * Enable or disable crosshair synchronization
   * @param {boolean} enable - Enable sync
   */
  function syncCrosshair(enable) {
    state.crosshairSync = enable;

    if (enable) {
      setupCrosshairSync();
    } else {
      // Clear all crosshairs
      state.charts.forEach(chartObj => {
        chartObj.chart.clearCrosshairPosition();
      });
    }

    // Update checkbox
    const checkbox = state.container.querySelector('#mc-crosshair-sync');
    if (checkbox) {
      checkbox.checked = enable;
    }

    console.log('[MultiChart] Crosshair sync', enable ? 'enabled' : 'disabled');
  }

  // ========== CHART MANAGEMENT ==========

  /**
   * Add a new chart to the layout
   * @param {Object} config - Chart configuration { timeframe, position }
   * @returns {string} Chart ID
   */
  function addChart(config = {}) {
    const chartId = `chart-custom-${state.nextChartId++}`;

    // For now, we'll need to switch to a custom grid layout
    // This is a simplified implementation
    console.warn('[MultiChart] addChart: Custom layouts not fully implemented yet');

    return chartId;
  }

  /**
   * Remove a chart from the layout
   * @param {string} chartId - Chart identifier
   */
  function removeChart(chartId) {
    const chartObj = state.charts.get(chartId);
    if (!chartObj) {
      console.warn('[MultiChart] Chart not found:', chartId);
      return;
    }

    // Remove the chart
    chartObj.chart.remove();
    state.charts.delete(chartId);
    state.chartConfigs.delete(chartId);

    // Remove the DOM element
    const cell = state.container.querySelector(`[data-cell-id]`);
    if (cell && cell.querySelector(`#${chartId}`)) {
      // For predefined layouts, we should switch to a smaller layout
      // This is a simplified approach
      const currentLayout = LAYOUTS[state.currentLayout];
      if (currentLayout && state.charts.size === currentLayout.cells.length - 1) {
        // Switch to appropriate smaller layout
        if (state.currentLayout === 'splitHorizontal' || state.currentLayout === 'splitVertical') {
          setLayout('single');
        } else if (state.currentLayout === 'quad') {
          setLayout('splitHorizontal');
        }
      }
    }

    console.log('[MultiChart] Removed chart:', chartId);
  }

  /**
   * Clear all charts
   */
  function clearAllCharts() {
    state.charts.forEach((chartObj, chartId) => {
      chartObj.chart.remove();
    });
    state.charts.clear();
    state.chartConfigs.clear();
  }

  /**
   * Get a specific chart instance
   * @param {string} chartId - Chart identifier
   * @returns {Object} Chart object
   */
  function getChart(chartId) {
    return state.charts.get(chartId);
  }

  /**
   * Get all chart instances
   * @returns {Map} All charts
   */
  function getAllCharts() {
    return state.charts;
  }

  // ========== EVENT HANDLING ==========

  /**
   * Setup event listeners for controls
   */
  function setupEventListeners() {
    if (!state.container) return;

    // Layout selector buttons
    state.container.querySelectorAll('.mc-layout-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const layout = btn.dataset.layout;
        setLayout(layout);
      });
    });

    // Crosshair sync toggle
    const syncCheckbox = state.container.querySelector('#mc-crosshair-sync');
    if (syncCheckbox) {
      syncCheckbox.addEventListener('change', (e) => {
        syncCrosshair(e.target.checked);
      });
    }

    // Timeframe selectors
    state.container.querySelectorAll('.mc-timeframe-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const chartId = e.target.dataset.chartId;
        const timeframe = e.target.value;
        loadChartData(chartId, timeframe);
      });
    });

    // Chart close buttons
    state.container.querySelectorAll('.mc-cell-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chartId = btn.dataset.chartId;
        if (state.charts.size > 1) {
          removeChart(chartId);
        } else {
          console.warn('[MultiChart] Cannot remove last chart');
        }
      });
    });
  }

  // ========== PERSISTENCE ==========

  const STORAGE_KEY = 'btcsai_multichart_layout';

  /**
   * Save layout preference to localStorage
   * @param {string} layout - Layout type
   */
  function saveLayoutPreference(layout) {
    try {
      const prefs = {
        layout: layout,
        crosshairSync: state.crosshairSync,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.warn('[MultiChart] Failed to save layout preference:', error);
    }
  }

  /**
   * Load layout preference from localStorage
   * @returns {string|null} Layout type
   */
  function loadLayoutPreference() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const prefs = JSON.parse(saved);

      // Update crosshair sync preference
      if (prefs.crosshairSync !== undefined) {
        state.crosshairSync = prefs.crosshairSync;
      }

      return prefs.layout;
    } catch (error) {
      console.warn('[MultiChart] Failed to load layout preference:', error);
      return null;
    }
  }

  // ========== EVENTS ==========

  const eventListeners = new Map();

  /**
   * Subscribe to events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  function on(event, callback) {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, []);
    }
    eventListeners.get(event).push(callback);
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  function emitEvent(event, data) {
    const listeners = eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // ========== STYLES ==========

  /**
   * Inject CSS styles for multi-chart layout
   */
  function injectStyles() {
    if (document.getElementById('mc-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'mc-styles';
    styles.textContent = `
      .mc-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: ${CHART_THEME.background};
        border-radius: 8px;
        overflow: hidden;
      }

      .mc-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: ${CHART_THEME.borderColor};
        border-bottom: 1px solid ${CHART_THEME.grid};
      }

      .mc-toolbar-left,
      .mc-toolbar-right {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .mc-title {
        font-size: 14px;
        font-weight: 600;
        color: ${CHART_THEME.text};
      }

      .mc-layout-selector {
        display: flex;
        gap: 4px;
        padding: 2px;
        background: ${CHART_THEME.background};
        border-radius: 4px;
      }

      .mc-layout-btn {
        padding: 6px 8px;
        background: transparent;
        border: none;
        border-radius: 3px;
        color: ${CHART_THEME.text};
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .mc-layout-btn:hover {
        background: ${CHART_THEME.grid};
      }

      .mc-layout-btn.active {
        background: ${CHART_THEME.crosshair};
        color: ${CHART_THEME.background};
      }

      .mc-sync-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: ${CHART_THEME.text};
        cursor: pointer;
        user-select: none;
      }

      .mc-sync-toggle input[type="checkbox"] {
        cursor: pointer;
      }

      .mc-grid {
        flex: 1;
        display: grid;
        gap: 1px;
        background: ${CHART_THEME.grid};
        padding: 1px;
        min-height: 0;
      }

      .mc-cell {
        background: ${CHART_THEME.background};
        display: flex;
        flex-direction: column;
        min-height: 0;
        position: relative;
      }

      .mc-cell-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: ${CHART_THEME.borderColor};
        border-bottom: 1px solid ${CHART_THEME.grid};
      }

      .mc-timeframe-select {
        padding: 4px 8px;
        background: ${CHART_THEME.background};
        border: 1px solid ${CHART_THEME.grid};
        border-radius: 4px;
        color: ${CHART_THEME.text};
        font-size: 12px;
        cursor: pointer;
        outline: none;
      }

      .mc-timeframe-select:focus {
        border-color: ${CHART_THEME.crosshair};
      }

      .mc-cell-title {
        flex: 1;
        font-size: 12px;
        font-weight: 500;
        color: ${CHART_THEME.text};
      }

      .mc-cell-close {
        padding: 2px 6px;
        background: transparent;
        border: none;
        color: ${CHART_THEME.text};
        font-size: 18px;
        cursor: pointer;
        border-radius: 3px;
        line-height: 1;
        transition: all 0.2s;
      }

      .mc-cell-close:hover {
        background: ${CHART_THEME.grid};
        color: ${CHART_THEME.bearish};
      }

      .mc-chart-container {
        flex: 1;
        min-height: 0;
        position: relative;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .mc-toolbar {
          flex-direction: column;
          gap: 12px;
          align-items: stretch;
        }

        .mc-toolbar-left,
        .mc-toolbar-right {
          justify-content: space-between;
        }

        .mc-grid {
          grid-template-columns: 1fr !important;
          grid-template-rows: auto !important;
        }

        .mc-cell {
          grid-column: 1 !important;
          grid-row: auto !important;
          min-height: 300px;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  // ========== PUBLIC API ==========

  return {
    init,
    setLayout,
    syncCrosshair,
    addChart,
    removeChart,
    getChart,
    getAllCharts,
    on,
    // Expose state for debugging
    _state: state,
    _layouts: LAYOUTS
  };

})();

// Export to window for global access
if (typeof window !== 'undefined') {
  window.MultiChart = MultiChart;
}
