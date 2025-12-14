/**
 * Multi-Chart Integration Example
 * Shows how to integrate MultiChart with existing pages
 */

// ========== Example 1: Basic Integration ==========
function basicIntegration() {
  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize multi-chart in a container
    MultiChart.init('chart-container', {
      layout: 'quad',
      crosshairSync: true,
      timeframes: ['15m', '1h', '4h', '1d']
    });
  });
}

// ========== Example 2: With User Controls ==========
function withControls() {
  // HTML structure:
  // <div id="controls">
  //   <button id="btn-single">Single</button>
  //   <button id="btn-split-h">Split H</button>
  //   <button id="btn-split-v">Split V</button>
  //   <button id="btn-quad">Quad</button>
  // </div>
  // <div id="chart-container"></div>

  document.addEventListener('DOMContentLoaded', () => {
    // Initialize
    MultiChart.init('chart-container');

    // Add button handlers
    document.getElementById('btn-single').addEventListener('click', () => {
      MultiChart.setLayout('single', ['4h']);
    });

    document.getElementById('btn-split-h').addEventListener('click', () => {
      MultiChart.setLayout('splitHorizontal', ['1h', '4h']);
    });

    document.getElementById('btn-split-v').addEventListener('click', () => {
      MultiChart.setLayout('splitVertical', ['15m', '4h']);
    });

    document.getElementById('btn-quad').addEventListener('click', () => {
      MultiChart.setLayout('quad', ['15m', '1h', '4h', '1d']);
    });
  });
}

// ========== Example 3: Integrating with Existing Chart System ==========
function integrateWithExistingCharts() {
  // If you have an existing chart system, you can:
  // 1. Initialize MultiChart
  // 2. Get chart instances
  // 3. Add custom indicators/overlays

  document.addEventListener('DOMContentLoaded', async () => {
    // Initialize multi-chart
    MultiChart.init('chart-container', {
      layout: 'splitHorizontal',
      timeframes: ['1h', '4h']
    });

    // Wait a bit for charts to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get all chart instances
    const charts = MultiChart.getAllCharts();

    // Add custom indicators to each chart
    charts.forEach((chartObj, chartId) => {
      const chart = chartObj.chart;
      const candleSeries = chartObj.candleSeries;

      // Example: Add EMA line
      const emaSeries = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
        title: 'EMA 20'
      });

      // You would calculate and set EMA data here
      // emaSeries.setData(emaData);
    });
  });
}

// ========== Example 4: Dynamic Timeframe Selection ==========
function dynamicTimeframes() {
  // Allow users to pick timeframes for each chart position

  const timeframeSelector = {
    quad: {
      position1: '15m',
      position2: '1h',
      position3: '4h',
      position4: '1d'
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Initialize with default
    MultiChart.init('chart-container', {
      layout: 'quad'
    });

    // Create timeframe selector UI
    createTimeframeSelectors();
  });

  function createTimeframeSelectors() {
    // This would create dropdowns for each chart position
    // allowing users to customize which timeframe appears where
    const container = document.getElementById('timeframe-selectors');

    ['position1', 'position2', 'position3', 'position4'].forEach(pos => {
      const select = document.createElement('select');
      select.innerHTML = `
        <option value="1m">1m</option>
        <option value="5m">5m</option>
        <option value="15m">15m</option>
        <option value="1h">1H</option>
        <option value="4h">4H</option>
        <option value="1d">1D</option>
      `;
      select.value = timeframeSelector.quad[pos];
      select.addEventListener('change', updateTimeframes);
      container.appendChild(select);
    });
  }

  function updateTimeframes() {
    // Collect selected timeframes
    const selects = document.querySelectorAll('#timeframe-selectors select');
    const timeframes = Array.from(selects).map(s => s.value);

    // Update layout
    MultiChart.setLayout('quad', timeframes);
  }
}

// ========== Example 5: Save/Load Custom Configurations ==========
function saveLoadConfigurations() {
  const CONFIGS_KEY = 'my_chart_configs';

  // Save current configuration
  function saveConfiguration(name) {
    const configs = loadConfigurations();

    configs[name] = {
      layout: MultiChart._state.currentLayout,
      timeframes: Array.from(MultiChart._state.chartConfigs.values())
        .map(config => config.timeframe),
      crosshairSync: MultiChart._state.crosshairSync,
      timestamp: Date.now()
    };

    localStorage.setItem(CONFIGS_KEY, JSON.stringify(configs));
    console.log('Saved configuration:', name);
  }

  // Load configurations
  function loadConfigurations() {
    try {
      const saved = localStorage.getItem(CONFIGS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  // Apply a saved configuration
  function applyConfiguration(name) {
    const configs = loadConfigurations();
    const config = configs[name];

    if (!config) {
      console.error('Configuration not found:', name);
      return;
    }

    // Apply layout and timeframes
    MultiChart.setLayout(config.layout, config.timeframes);
    MultiChart.syncCrosshair(config.crosshairSync);

    console.log('Applied configuration:', name);
  }

  // UI Example
  document.addEventListener('DOMContentLoaded', () => {
    MultiChart.init('chart-container');

    // Add save button
    document.getElementById('btn-save-config').addEventListener('click', () => {
      const name = prompt('Enter configuration name:');
      if (name) {
        saveConfiguration(name);
      }
    });

    // Add load dropdown
    const loadSelect = document.getElementById('config-select');
    const configs = loadConfigurations();

    Object.keys(configs).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      loadSelect.appendChild(option);
    });

    loadSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        applyConfiguration(e.target.value);
      }
    });
  });
}

// ========== Example 6: Event-Driven Architecture ==========
function eventDrivenExample() {
  document.addEventListener('DOMContentLoaded', () => {
    MultiChart.init('chart-container', {
      layout: 'quad'
    });

    // Listen to layout changes
    MultiChart.on('layoutChange', (data) => {
      console.log('Layout changed:', data);

      // Update analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'chart_layout_change', {
          layout: data.layout,
          chart_count: data.chartCount
        });
      }

      // Update UI
      updateLayoutIndicator(data.layout);

      // Notify user
      if (typeof BTCSAIToast !== 'undefined') {
        BTCSAIToast.show(`Layout changed to ${data.layout}`, 'success');
      }
    });

    function updateLayoutIndicator(layout) {
      document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelector(`[data-layout="${layout}"]`)?.classList.add('active');
    }
  });
}

// ========== Example 7: Responsive Layout Selection ==========
function responsiveLayoutSelection() {
  document.addEventListener('DOMContentLoaded', () => {
    // Choose layout based on screen size
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    const isDesktop = window.innerWidth >= 1024;

    let layout = 'single';
    let timeframes = ['4h'];

    if (isMobile) {
      layout = 'single';
      timeframes = ['4h'];
    } else if (isTablet) {
      layout = 'splitHorizontal';
      timeframes = ['1h', '4h'];
    } else {
      layout = 'quad';
      timeframes = ['15m', '1h', '4h', '1d'];
    }

    MultiChart.init('chart-container', {
      layout: layout,
      timeframes: timeframes
    });

    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        location.reload(); // Simple approach - reload page
      }, 500);
    });
  });
}

// ========== Example 8: Integrating with Data Feeds ==========
function liveDataIntegration() {
  // Connect to WebSocket for live data
  let ws;

  document.addEventListener('DOMContentLoaded', () => {
    MultiChart.init('chart-container', {
      layout: 'quad',
      timeframes: ['15m', '1h', '4h', '1d']
    });

    // Connect to WebSocket
    connectWebSocket();
  });

  function connectWebSocket() {
    ws = new WebSocket('wss://api.example.com/btc/realtime');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Update all charts with new candle data
      const charts = MultiChart.getAllCharts();
      charts.forEach((chartObj) => {
        // Update last candle or add new one
        // This depends on your data structure
        updateChartData(chartObj, data);
      });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed, reconnecting...');
      setTimeout(connectWebSocket, 5000);
    };
  }

  function updateChartData(chartObj, newData) {
    // Example: Update the last candle
    // You would need to implement this based on your data structure
    // chartObj.candleSeries.update({
    //   time: newData.time,
    //   open: newData.open,
    //   high: newData.high,
    //   low: newData.low,
    //   close: newData.close
    // });
  }
}

// ========== Example 9: Keyboard Shortcuts ==========
function keyboardShortcuts() {
  document.addEventListener('DOMContentLoaded', () => {
    MultiChart.init('chart-container');

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Only if Ctrl/Cmd is pressed
      if (!(e.ctrlKey || e.metaKey)) return;

      switch(e.key) {
        case '1':
          e.preventDefault();
          MultiChart.setLayout('single');
          break;
        case '2':
          e.preventDefault();
          MultiChart.setLayout('splitHorizontal');
          break;
        case '3':
          e.preventDefault();
          MultiChart.setLayout('splitVertical');
          break;
        case '4':
          e.preventDefault();
          MultiChart.setLayout('quad');
          break;
        case 's':
          e.preventDefault();
          const currentSync = MultiChart._state.crosshairSync;
          MultiChart.syncCrosshair(!currentSync);
          break;
        case 'r':
          e.preventDefault();
          // Reset to default
          MultiChart.setLayout('quad', ['15m', '1h', '4h', '1d']);
          break;
      }
    });
  });
}

// ========== Example 10: Chart Screenshots ==========
function chartScreenshots() {
  // Take screenshots of individual charts or entire layout

  async function takeScreenshot(chartId) {
    const chartObj = MultiChart.getChart(chartId);
    if (!chartObj) return;

    // Use LightweightCharts' built-in screenshot method
    const screenshot = chartObj.chart.takeScreenshot();

    // Download the screenshot
    const link = document.createElement('a');
    link.download = `chart-${chartId}-${Date.now()}.png`;
    link.href = screenshot.toDataURL();
    link.click();
  }

  async function takeLayoutScreenshot() {
    // Take screenshot of entire layout using html2canvas or similar
    // This is a simplified example
    const container = document.getElementById('chart-container');

    if (typeof html2canvas !== 'undefined') {
      const canvas = await html2canvas(container);
      const link = document.createElement('a');
      link.download = `layout-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } else {
      console.error('html2canvas library not loaded');
    }
  }

  // Add screenshot buttons
  document.addEventListener('DOMContentLoaded', () => {
    MultiChart.init('chart-container');

    document.getElementById('btn-screenshot')?.addEventListener('click', () => {
      takeLayoutScreenshot();
    });
  });
}

// Export examples for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    basicIntegration,
    withControls,
    integrateWithExistingCharts,
    dynamicTimeframes,
    saveLoadConfigurations,
    eventDrivenExample,
    responsiveLayoutSelection,
    liveDataIntegration,
    keyboardShortcuts,
    chartScreenshots
  };
}
