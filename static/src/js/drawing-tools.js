/**
 * BTC Signal AI - Advanced Drawing Tools Module
 * TradingView-style drawing tools for technical analysis
 */

const BTCSAIDrawingTools = (function() {
  'use strict';

  // Configuration
  const CONFIG = {
    colors: {
      default: '#f59e0b',
      bullish: '#22c55e',
      bearish: '#ef4444',
      neutral: '#3b82f6',
      fib: ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']
    },
    lineWidths: [1, 2, 3],
    defaultWidth: 2,
    fibLevels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618],
    storageKey: 'btcsai_drawings'
  };

  // State
  let state = {
    chart: null,
    series: null,
    currentTool: 'crosshair',
    drawings: [],
    drawingInProgress: null,
    selectedDrawing: null,
    undoStack: [],
    redoStack: [],
    currentColor: CONFIG.colors.default,
    currentWidth: CONFIG.defaultWidth
  };

  // ==================== INITIALIZATION ====================

  /**
   * Initialize drawing tools
   * @param {Object} chart - Lightweight Charts instance
   * @param {Object} series - Main price series
   * @param {string} containerId - Chart container ID
   */
  function init(chart, series, containerId) {
    state.chart = chart;
    state.series = series;

    // Load saved drawings
    loadDrawings();

    // Setup event listeners
    setupChartEvents(containerId);
    setupKeyboardShortcuts();

    // Render saved drawings
    renderAllDrawings();

    console.log('[DrawingTools] Initialized');
  }

  /**
   * Setup chart click/drag events
   * @param {string} containerId
   */
  function setupChartEvents(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let isDragging = false;
    let startPoint = null;

    container.addEventListener('mousedown', (e) => {
      if (state.currentTool === 'crosshair' || state.currentTool === 'delete') return;

      const point = getChartPoint(e, container);
      if (!point) return;

      isDragging = true;
      startPoint = point;

      // For single-click tools
      if (['horizontal', 'vertical', 'marker-buy', 'marker-sell', 'text'].includes(state.currentTool)) {
        handleSingleClickTool(point);
        isDragging = false;
      }
    });

    container.addEventListener('mousemove', (e) => {
      if (!isDragging || !startPoint) return;

      const point = getChartPoint(e, container);
      if (!point) return;

      // Preview drawing
      previewDrawing(startPoint, point);
    });

    container.addEventListener('mouseup', (e) => {
      if (!isDragging || !startPoint) {
        isDragging = false;
        return;
      }

      const endPoint = getChartPoint(e, container);
      if (!endPoint) {
        isDragging = false;
        return;
      }

      // Complete drawing
      completeDrawing(startPoint, endPoint);

      isDragging = false;
      startPoint = null;
      clearPreview();
    });

    // Delete on click when delete tool selected
    container.addEventListener('click', (e) => {
      if (state.currentTool !== 'delete') return;

      const point = getChartPoint(e, container);
      if (!point) return;

      deleteNearestDrawing(point);
    });
  }

  /**
   * Get price/time from mouse event
   * @param {MouseEvent} e
   * @param {Element} container
   * @returns {Object|null}
   */
  function getChartPoint(e, container) {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      const price = state.chart.priceScale('right').coordinateToPrice(y);
      const time = state.chart.timeScale().coordinateToTime(x);

      if (price === null || time === null || isNaN(price)) return null;

      return { price, time, x, y };
    } catch (err) {
      return null;
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Undo: Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((e.ctrlKey && e.shiftKey && e.key === 'z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        redo();
      }
      // Delete: Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedDrawing) {
        e.preventDefault();
        deleteDrawing(state.selectedDrawing.id);
      }
      // Escape: Cancel current drawing
      if (e.key === 'Escape') {
        cancelCurrentDrawing();
        setTool('crosshair');
      }
    });
  }

  // ==================== DRAWING TOOLS ====================

  /**
   * Handle single-click tools
   * @param {Object} point
   */
  function handleSingleClickTool(point) {
    switch (state.currentTool) {
      case 'horizontal':
        addDrawing({
          type: 'horizontal',
          price: point.price,
          color: state.currentColor,
          width: state.currentWidth
        });
        break;

      case 'vertical':
        addDrawing({
          type: 'vertical',
          time: point.time,
          color: state.currentColor,
          width: state.currentWidth
        });
        break;

      case 'marker-buy':
        addDrawing({
          type: 'marker',
          time: point.time,
          position: 'belowBar',
          color: CONFIG.colors.bullish,
          shape: 'arrowUp',
          text: 'BUY'
        });
        break;

      case 'marker-sell':
        addDrawing({
          type: 'marker',
          time: point.time,
          position: 'aboveBar',
          color: CONFIG.colors.bearish,
          shape: 'arrowDown',
          text: 'SELL'
        });
        break;

      case 'text':
        const text = prompt('Enter text:');
        if (text) {
          addDrawing({
            type: 'marker',
            time: point.time,
            position: 'aboveBar',
            color: state.currentColor,
            shape: 'text',
            text: text
          });
        }
        break;
    }
  }

  /**
   * Complete multi-point drawing
   * @param {Object} start
   * @param {Object} end
   */
  function completeDrawing(start, end) {
    switch (state.currentTool) {
      case 'trendline':
        addDrawing({
          type: 'trendline',
          startPrice: start.price,
          startTime: start.time,
          endPrice: end.price,
          endTime: end.time,
          color: state.currentColor,
          width: state.currentWidth
        });
        break;

      case 'ray':
        addDrawing({
          type: 'ray',
          startPrice: start.price,
          startTime: start.time,
          endPrice: end.price,
          endTime: end.time,
          color: state.currentColor,
          width: state.currentWidth
        });
        break;

      case 'channel':
        addDrawing({
          type: 'channel',
          startPrice: start.price,
          startTime: start.time,
          endPrice: end.price,
          endTime: end.time,
          color: state.currentColor,
          width: state.currentWidth
        });
        break;

      case 'rectangle':
        addDrawing({
          type: 'rectangle',
          startPrice: start.price,
          startTime: start.time,
          endPrice: end.price,
          endTime: end.time,
          color: state.currentColor
        });
        break;

      case 'fib-retrace':
        const high = Math.max(start.price, end.price);
        const low = Math.min(start.price, end.price);
        addDrawing({
          type: 'fibonacci',
          high: high,
          low: low,
          startTime: start.time,
          endTime: end.time,
          levels: CONFIG.fibLevels
        });
        break;

      case 'fib-extension':
        addDrawing({
          type: 'fib-extension',
          startPrice: start.price,
          endPrice: end.price,
          startTime: start.time,
          endTime: end.time,
          levels: [0, 0.618, 1, 1.618, 2.618, 4.236]
        });
        break;

      case 'measure':
        const priceDiff = end.price - start.price;
        const percentDiff = (priceDiff / start.price) * 100;
        addDrawing({
          type: 'measure',
          startPrice: start.price,
          endPrice: end.price,
          startTime: start.time,
          endTime: end.time,
          priceDiff: priceDiff,
          percentDiff: percentDiff
        });
        break;
    }
  }

  /**
   * Preview drawing while dragging
   * @param {Object} start
   * @param {Object} end
   */
  function previewDrawing(start, end) {
    // Clear previous preview
    clearPreview();

    // For now, we'll just update the crosshair
    // Full preview would require canvas overlay
  }

  /**
   * Clear preview
   */
  function clearPreview() {
    if (state.drawingInProgress && state.drawingInProgress.line) {
      try {
        state.series.removePriceLine(state.drawingInProgress.line);
      } catch (e) {}
      state.drawingInProgress = null;
    }
  }

  // ==================== DRAWING MANAGEMENT ====================

  /**
   * Add a new drawing
   * @param {Object} drawing
   */
  function addDrawing(drawing) {
    drawing.id = 'draw_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    drawing.createdAt = Date.now();

    // Add to state
    state.drawings.push(drawing);

    // Add to undo stack
    state.undoStack.push({ action: 'add', drawing: { ...drawing } });
    state.redoStack = []; // Clear redo on new action

    // Render the drawing
    renderDrawing(drawing);

    // Save
    saveDrawings();

    console.log('[DrawingTools] Added:', drawing.type);
  }

  /**
   * Delete a drawing
   * @param {string} drawingId
   */
  function deleteDrawing(drawingId) {
    const index = state.drawings.findIndex(d => d.id === drawingId);
    if (index === -1) return;

    const drawing = state.drawings[index];

    // Remove from chart
    removeDrawingFromChart(drawing);

    // Remove from state
    state.drawings.splice(index, 1);

    // Add to undo stack
    state.undoStack.push({ action: 'delete', drawing: { ...drawing } });
    state.redoStack = [];

    // Save
    saveDrawings();

    if (state.selectedDrawing?.id === drawingId) {
      state.selectedDrawing = null;
    }
  }

  /**
   * Delete nearest drawing to point
   * @param {Object} point
   */
  function deleteNearestDrawing(point) {
    let nearest = null;
    let minDistance = Infinity;

    state.drawings.forEach(drawing => {
      const dist = getDistanceToDrawing(point, drawing);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = drawing;
      }
    });

    // Only delete if close enough (within 2% of price)
    if (nearest && minDistance < point.price * 0.02) {
      deleteDrawing(nearest.id);
    }
  }

  /**
   * Calculate distance from point to drawing
   * @param {Object} point
   * @param {Object} drawing
   * @returns {number}
   */
  function getDistanceToDrawing(point, drawing) {
    switch (drawing.type) {
      case 'horizontal':
        return Math.abs(point.price - drawing.price);
      case 'fibonacci':
        // Distance to nearest fib level
        const range = drawing.high - drawing.low;
        let minDist = Infinity;
        drawing.levels.forEach(level => {
          const levelPrice = drawing.low + range * level;
          minDist = Math.min(minDist, Math.abs(point.price - levelPrice));
        });
        return minDist;
      case 'trendline':
      case 'ray':
        // Distance to line (simplified)
        const midPrice = (drawing.startPrice + drawing.endPrice) / 2;
        return Math.abs(point.price - midPrice);
      default:
        return Infinity;
    }
  }

  /**
   * Undo last action
   */
  function undo() {
    if (state.undoStack.length === 0) return;

    const action = state.undoStack.pop();
    state.redoStack.push(action);

    if (action.action === 'add') {
      // Undo add = remove
      const index = state.drawings.findIndex(d => d.id === action.drawing.id);
      if (index !== -1) {
        removeDrawingFromChart(state.drawings[index]);
        state.drawings.splice(index, 1);
      }
    } else if (action.action === 'delete') {
      // Undo delete = add back
      state.drawings.push(action.drawing);
      renderDrawing(action.drawing);
    }

    saveDrawings();
  }

  /**
   * Redo last undone action
   */
  function redo() {
    if (state.redoStack.length === 0) return;

    const action = state.redoStack.pop();
    state.undoStack.push(action);

    if (action.action === 'add') {
      // Redo add = add back
      state.drawings.push(action.drawing);
      renderDrawing(action.drawing);
    } else if (action.action === 'delete') {
      // Redo delete = remove again
      const index = state.drawings.findIndex(d => d.id === action.drawing.id);
      if (index !== -1) {
        removeDrawingFromChart(state.drawings[index]);
        state.drawings.splice(index, 1);
      }
    }

    saveDrawings();
  }

  /**
   * Cancel current drawing in progress
   */
  function cancelCurrentDrawing() {
    clearPreview();
    state.drawingInProgress = null;
  }

  /**
   * Clear all drawings
   */
  function clearAll() {
    state.drawings.forEach(drawing => {
      removeDrawingFromChart(drawing);
    });
    state.drawings = [];
    state.undoStack = [];
    state.redoStack = [];
    saveDrawings();
  }

  // ==================== RENDERING ====================

  /**
   * Render all drawings
   */
  function renderAllDrawings() {
    state.drawings.forEach(drawing => {
      renderDrawing(drawing);
    });
  }

  /**
   * Render a single drawing on the chart
   * @param {Object} drawing
   */
  function renderDrawing(drawing) {
    if (!state.series) return;

    switch (drawing.type) {
      case 'horizontal':
        drawing._line = state.series.createPriceLine({
          price: drawing.price,
          color: drawing.color,
          lineWidth: drawing.width || 2,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: ''
        });
        break;

      case 'fibonacci':
        drawing._lines = [];
        const range = drawing.high - drawing.low;
        drawing.levels.forEach((level, i) => {
          const price = drawing.low + range * level;
          const line = state.series.createPriceLine({
            price: price,
            color: CONFIG.colors.fib[i % CONFIG.colors.fib.length],
            lineWidth: 1,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: `${(level * 100).toFixed(1)}%`
          });
          drawing._lines.push(line);
        });
        break;

      case 'trendline':
      case 'ray':
        // Lightweight Charts doesn't support native trendlines
        // We'll approximate with start/end price lines
        drawing._lines = [
          state.series.createPriceLine({
            price: drawing.startPrice,
            color: drawing.color,
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: false,
            title: 'Start'
          }),
          state.series.createPriceLine({
            price: drawing.endPrice,
            color: drawing.color,
            lineWidth: drawing.width || 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: ''
          })
        ];
        break;

      case 'measure':
        // Show measurement as price line with label
        drawing._line = state.series.createPriceLine({
          price: drawing.endPrice,
          color: drawing.priceDiff >= 0 ? CONFIG.colors.bullish : CONFIG.colors.bearish,
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${drawing.percentDiff >= 0 ? '+' : ''}${drawing.percentDiff.toFixed(2)}%`
        });
        break;

      case 'marker':
        // Markers are handled separately via series.setMarkers()
        updateMarkers();
        break;
    }
  }

  /**
   * Remove drawing from chart
   * @param {Object} drawing
   */
  function removeDrawingFromChart(drawing) {
    try {
      if (drawing._line) {
        state.series.removePriceLine(drawing._line);
      }
      if (drawing._lines) {
        drawing._lines.forEach(line => {
          state.series.removePriceLine(line);
        });
      }
      if (drawing.type === 'marker') {
        updateMarkers();
      }
    } catch (e) {
      console.warn('[DrawingTools] Error removing drawing:', e);
    }
  }

  /**
   * Update all markers on chart
   */
  function updateMarkers() {
    const markers = state.drawings
      .filter(d => d.type === 'marker')
      .map(d => ({
        time: d.time,
        position: d.position,
        color: d.color,
        shape: d.shape === 'text' ? 'square' : d.shape,
        text: d.text,
        size: 2
      }))
      .sort((a, b) => a.time - b.time);

    if (state.series) {
      state.series.setMarkers(markers);
    }
  }

  // ==================== PERSISTENCE ====================

  /**
   * Save drawings to localStorage
   */
  function saveDrawings() {
    try {
      // Only save data properties, not chart references
      const toSave = state.drawings.map(d => {
        const clean = { ...d };
        delete clean._line;
        delete clean._lines;
        return clean;
      });
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(toSave));
    } catch (e) {
      console.error('[DrawingTools] Error saving:', e);
    }
  }

  /**
   * Load drawings from localStorage
   */
  function loadDrawings() {
    try {
      const saved = localStorage.getItem(CONFIG.storageKey);
      if (saved) {
        state.drawings = JSON.parse(saved);
      }
    } catch (e) {
      console.error('[DrawingTools] Error loading:', e);
      state.drawings = [];
    }
  }

  /**
   * Export drawings as JSON
   * @returns {string}
   */
  function exportDrawings() {
    const toExport = state.drawings.map(d => {
      const clean = { ...d };
      delete clean._line;
      delete clean._lines;
      return clean;
    });
    return JSON.stringify(toExport, null, 2);
  }

  /**
   * Import drawings from JSON
   * @param {string} json
   */
  function importDrawings(json) {
    try {
      const imported = JSON.parse(json);
      if (!Array.isArray(imported)) throw new Error('Invalid format');

      // Clear existing
      clearAll();

      // Add imported
      imported.forEach(drawing => {
        drawing.id = 'draw_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        state.drawings.push(drawing);
        renderDrawing(drawing);
      });

      saveDrawings();
    } catch (e) {
      console.error('[DrawingTools] Import error:', e);
    }
  }

  // ==================== TOOL SELECTION ====================

  /**
   * Set current drawing tool
   * @param {string} tool
   */
  function setTool(tool) {
    state.currentTool = tool;
    cancelCurrentDrawing();

    // Update cursor
    const cursors = {
      crosshair: 'crosshair',
      delete: 'not-allowed',
      horizontal: 'ew-resize',
      vertical: 'ns-resize',
      trendline: 'cell',
      ray: 'cell',
      channel: 'cell',
      rectangle: 'cell',
      'fib-retrace': 'cell',
      'fib-extension': 'cell',
      measure: 'cell',
      'marker-buy': 'pointer',
      'marker-sell': 'pointer',
      text: 'text'
    };

    document.body.style.cursor = cursors[tool] || 'default';
  }

  /**
   * Set drawing color
   * @param {string} color
   */
  function setColor(color) {
    state.currentColor = color;
  }

  /**
   * Set line width
   * @param {number} width
   */
  function setWidth(width) {
    state.currentWidth = width;
  }

  // ==================== PUBLIC API ====================

  return {
    init,
    setTool,
    setColor,
    setWidth,
    undo,
    redo,
    clearAll,
    deleteDrawing,
    getDrawings: () => [...state.drawings],
    exportDrawings,
    importDrawings,
    getCurrentTool: () => state.currentTool,
    availableTools: [
      'crosshair', 'horizontal', 'vertical', 'trendline', 'ray',
      'channel', 'rectangle', 'fib-retrace', 'fib-extension',
      'measure', 'marker-buy', 'marker-sell', 'text', 'delete'
    ]
  };
})();

// Export
if (typeof window !== 'undefined') {
  window.BTCSAIDrawingTools = BTCSAIDrawingTools;
}
