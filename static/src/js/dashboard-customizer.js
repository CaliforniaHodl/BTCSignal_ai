/**
 * Dashboard Customizer - Widget Layout Customization System
 *
 * Features:
 * - Drag-and-drop widget reordering using CSS Grid
 * - Widget show/hide toggles
 * - Widget size options (small, medium, large)
 * - Save layout to localStorage
 * - Reset to default layout
 * - Customization modal/panel
 *
 * Simple implementation with no external libraries
 */
(function() {
  'use strict';

  // Default configuration
  const CONFIG = {
    storageKey: 'btcsai_dashboard_layout',
    gridSelector: '.dashboard-grid',
    widgetSelector: '.widget-card',
    sizes: {
      small: 'widget-size-small',
      medium: 'widget-size-medium',
      large: 'widget-size-large'
    }
  };

  // State management
  let state = {
    widgets: [],
    draggedElement: null,
    draggedOver: null,
    isDragging: false
  };

  /**
   * Initialize the dashboard customizer
   */
  function init() {
    const grid = document.querySelector(CONFIG.gridSelector);
    if (!grid) {
      console.warn('DashboardCustomizer: Grid container not found');
      return;
    }

    // Load saved layout
    loadLayout();

    // Initialize widgets
    initializeWidgets();

    // Create customizer button
    createCustomizerButton();

    // Apply saved state
    applySavedState();
  }

  /**
   * Initialize all widget cards
   */
  function initializeWidgets() {
    const widgets = document.querySelectorAll(CONFIG.widgetSelector);

    widgets.forEach((widget, index) => {
      // Add unique ID if not present
      if (!widget.id) {
        widget.id = 'widget-' + index;
      }

      // Add data attribute for original order
      widget.dataset.originalOrder = index;

      // Make widgets draggable
      widget.draggable = true;

      // Add drag event listeners
      widget.addEventListener('dragstart', handleDragStart);
      widget.addEventListener('dragend', handleDragEnd);
      widget.addEventListener('dragover', handleDragOver);
      widget.addEventListener('drop', handleDrop);
      widget.addEventListener('dragenter', handleDragEnter);
      widget.addEventListener('dragleave', handleDragLeave);

      // Initialize widget state
      const widgetState = {
        id: widget.id,
        visible: widget.style.display !== 'none',
        size: getWidgetSize(widget),
        order: parseInt(widget.dataset.originalOrder)
      };

      state.widgets.push(widgetState);
    });
  }

  /**
   * Get current widget size class
   */
  function getWidgetSize(widget) {
    if (widget.classList.contains(CONFIG.sizes.large)) return 'large';
    if (widget.classList.contains(CONFIG.sizes.small)) return 'small';
    return 'medium';
  }

  /**
   * Drag and Drop Handlers
   */
  function handleDragStart(e) {
    if (e.target.closest('.customizer-panel')) return;

    state.draggedElement = this;
    state.isDragging = true;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
  }

  function handleDragEnd(e) {
    state.isDragging = false;
    this.classList.remove('dragging');

    // Remove all drag-over classes
    document.querySelectorAll(CONFIG.widgetSelector).forEach(widget => {
      widget.classList.remove('drag-over');
    });

    // Save new order
    saveLayout();
  }

  function handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter(e) {
    if (this !== state.draggedElement) {
      this.classList.add('drag-over');
      state.draggedOver = this;
    }
  }

  function handleDragLeave(e) {
    this.classList.remove('drag-over');
  }

  function handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (state.draggedElement !== this) {
      // Swap the elements in the DOM
      const grid = document.querySelector(CONFIG.gridSelector);
      const allWidgets = Array.from(grid.querySelectorAll(CONFIG.widgetSelector));
      const draggedIndex = allWidgets.indexOf(state.draggedElement);
      const targetIndex = allWidgets.indexOf(this);

      if (draggedIndex < targetIndex) {
        this.parentNode.insertBefore(state.draggedElement, this.nextSibling);
      } else {
        this.parentNode.insertBefore(state.draggedElement, this);
      }

      // Update order in state
      updateWidgetOrder();
    }

    return false;
  }

  /**
   * Update widget order in state
   */
  function updateWidgetOrder() {
    const widgets = document.querySelectorAll(CONFIG.widgetSelector);
    widgets.forEach((widget, index) => {
      const widgetState = state.widgets.find(w => w.id === widget.id);
      if (widgetState) {
        widgetState.order = index;
      }
    });
  }

  /**
   * Create customizer button and panel
   */
  function createCustomizerButton() {
    // Create button
    const button = document.createElement('button');
    button.className = 'btn-customize-dashboard';
    button.innerHTML = '<i class="fas fa-sliders-h"></i> Customize Dashboard';
    button.setAttribute('aria-label', 'Customize Dashboard Layout');
    button.addEventListener('click', openCustomizer);

    // Add to header actions
    const headerActions = document.querySelector('.dashboard-header-actions');
    if (headerActions) {
      headerActions.appendChild(button);
    }

    // Create customizer panel (hidden by default)
    createCustomizerPanel();
  }

  /**
   * Create the customizer panel
   */
  function createCustomizerPanel() {
    const panel = document.createElement('div');
    panel.className = 'customizer-panel';
    panel.id = 'customizer-panel';
    panel.innerHTML = `
      <div class="customizer-overlay"></div>
      <div class="customizer-content">
        <div class="customizer-header">
          <h3>Dashboard Customization</h3>
          <button class="btn-close-customizer" aria-label="Close customizer">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="customizer-body">
          <div class="customizer-section">
            <h4>Widget Visibility</h4>
            <p class="section-help">Show or hide widgets on your dashboard</p>
            <div class="widget-toggles" id="widget-toggles"></div>
          </div>
          <div class="customizer-section">
            <h4>Widget Sizes</h4>
            <p class="section-help">Adjust the size of each widget</p>
            <div class="widget-sizes" id="widget-sizes"></div>
          </div>
          <div class="customizer-section">
            <h4>Layout Tips</h4>
            <ul class="tips-list">
              <li><strong>Drag and drop</strong> widgets to reorder them</li>
              <li><strong>Hide widgets</strong> you don't need</li>
              <li><strong>Resize widgets</strong> to emphasize important metrics</li>
              <li>Changes are saved automatically</li>
            </ul>
          </div>
        </div>
        <div class="customizer-footer">
          <button class="btn-reset" id="btn-reset-layout">
            <i class="fas fa-undo"></i> Reset to Default
          </button>
          <button class="btn-primary" id="btn-save-layout">
            <i class="fas fa-check"></i> Done
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Add event listeners
    panel.querySelector('.btn-close-customizer').addEventListener('click', closeCustomizer);
    panel.querySelector('.customizer-overlay').addEventListener('click', closeCustomizer);
    panel.querySelector('#btn-reset-layout').addEventListener('click', resetLayout);
    panel.querySelector('#btn-save-layout').addEventListener('click', () => {
      saveLayout();
      closeCustomizer();
    });

    // Populate controls
    populateWidgetToggles();
    populateWidgetSizes();
  }

  /**
   * Populate widget visibility toggles
   */
  function populateWidgetToggles() {
    const container = document.getElementById('widget-toggles');
    if (!container) return;

    container.innerHTML = '';

    state.widgets.forEach(widgetState => {
      const widget = document.getElementById(widgetState.id);
      if (!widget) return;

      const title = widget.querySelector('h3')?.textContent || 'Widget';
      const icon = widget.querySelector('.widget-icon')?.textContent || '📊';

      const toggle = document.createElement('div');
      toggle.className = 'toggle-item';
      toggle.innerHTML = `
        <label class="toggle-label">
          <span class="toggle-icon">${icon}</span>
          <span class="toggle-text">${title}</span>
          <input type="checkbox"
                 class="toggle-checkbox"
                 data-widget-id="${widgetState.id}"
                 ${widgetState.visible ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      `;

      const checkbox = toggle.querySelector('input');
      checkbox.addEventListener('change', (e) => {
        toggleWidget(widgetState.id, e.target.checked);
      });

      container.appendChild(toggle);
    });
  }

  /**
   * Populate widget size controls
   */
  function populateWidgetSizes() {
    const container = document.getElementById('widget-sizes');
    if (!container) return;

    container.innerHTML = '';

    state.widgets.forEach(widgetState => {
      if (!widgetState.visible) return;

      const widget = document.getElementById(widgetState.id);
      if (!widget) return;

      const title = widget.querySelector('h3')?.textContent || 'Widget';

      const sizeControl = document.createElement('div');
      sizeControl.className = 'size-control';
      sizeControl.innerHTML = `
        <label class="size-label">${title}</label>
        <div class="size-buttons" data-widget-id="${widgetState.id}">
          <button class="btn-size ${widgetState.size === 'small' ? 'active' : ''}"
                  data-size="small"
                  aria-label="Small size">S</button>
          <button class="btn-size ${widgetState.size === 'medium' ? 'active' : ''}"
                  data-size="medium"
                  aria-label="Medium size">M</button>
          <button class="btn-size ${widgetState.size === 'large' ? 'active' : ''}"
                  data-size="large"
                  aria-label="Large size">L</button>
        </div>
      `;

      const buttons = sizeControl.querySelectorAll('.btn-size');
      buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const size = e.target.dataset.size;
          resizeWidget(widgetState.id, size);

          // Update active state
          buttons.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
        });
      });

      container.appendChild(sizeControl);
    });
  }

  /**
   * Toggle widget visibility
   */
  function toggleWidget(widgetId, visible) {
    const widget = document.getElementById(widgetId);
    if (!widget) return;

    widget.style.display = visible ? '' : 'none';

    // Update state
    const widgetState = state.widgets.find(w => w.id === widgetId);
    if (widgetState) {
      widgetState.visible = visible;
    }

    // Refresh size controls
    populateWidgetSizes();

    // Save
    saveLayout();
  }

  /**
   * Resize widget
   */
  function resizeWidget(widgetId, size) {
    const widget = document.getElementById(widgetId);
    if (!widget) return;

    // Remove all size classes
    Object.values(CONFIG.sizes).forEach(cls => {
      widget.classList.remove(cls);
    });

    // Add new size class
    if (size !== 'medium') {
      widget.classList.add(CONFIG.sizes[size]);
    }

    // Update state
    const widgetState = state.widgets.find(w => w.id === widgetId);
    if (widgetState) {
      widgetState.size = size;
    }

    // Save
    saveLayout();
  }

  /**
   * Open customizer panel
   */
  function openCustomizer() {
    const panel = document.getElementById('customizer-panel');
    if (panel) {
      panel.classList.add('active');
      document.body.classList.add('customizer-open');

      // Refresh controls
      populateWidgetToggles();
      populateWidgetSizes();
    }
  }

  /**
   * Close customizer panel
   */
  function closeCustomizer() {
    const panel = document.getElementById('customizer-panel');
    if (panel) {
      panel.classList.remove('active');
      document.body.classList.remove('customizer-open');
    }
  }

  /**
   * Save current layout to localStorage
   */
  function saveLayout() {
    // Update order before saving
    updateWidgetOrder();

    const layout = {
      version: 1,
      timestamp: Date.now(),
      widgets: state.widgets.map(w => ({
        id: w.id,
        visible: w.visible,
        size: w.size,
        order: w.order
      }))
    };

    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(layout));

      // Show toast notification if available
      if (typeof Toast !== 'undefined') {
        Toast.success('Dashboard layout saved');
      }
    } catch (e) {
      console.error('Failed to save dashboard layout:', e);
      if (typeof Toast !== 'undefined') {
        Toast.error('Failed to save layout');
      }
    }
  }

  /**
   * Load layout from localStorage
   */
  function loadLayout() {
    try {
      const stored = localStorage.getItem(CONFIG.storageKey);
      if (!stored) return false;

      const layout = JSON.parse(stored);
      if (!layout || !layout.widgets) return false;

      // Merge with current state
      layout.widgets.forEach(savedWidget => {
        const widgetState = state.widgets.find(w => w.id === savedWidget.id);
        if (widgetState) {
          Object.assign(widgetState, savedWidget);
        } else {
          state.widgets.push(savedWidget);
        }
      });

      return true;
    } catch (e) {
      console.error('Failed to load dashboard layout:', e);
      return false;
    }
  }

  /**
   * Apply saved state to DOM
   */
  function applySavedState() {
    const grid = document.querySelector(CONFIG.gridSelector);
    if (!grid) return;

    // Sort widgets by order
    const sortedWidgets = [...state.widgets].sort((a, b) => a.order - b.order);

    sortedWidgets.forEach(widgetState => {
      const widget = document.getElementById(widgetState.id);
      if (!widget) return;

      // Apply visibility
      widget.style.display = widgetState.visible ? '' : 'none';

      // Apply size
      Object.values(CONFIG.sizes).forEach(cls => {
        widget.classList.remove(cls);
      });
      if (widgetState.size && widgetState.size !== 'medium') {
        widget.classList.add(CONFIG.sizes[widgetState.size]);
      }

      // Reorder in DOM
      grid.appendChild(widget);
    });
  }

  /**
   * Reset layout to default
   */
  function resetLayout() {
    if (!confirm('Reset dashboard to default layout? This cannot be undone.')) {
      return;
    }

    // Clear localStorage
    localStorage.removeItem(CONFIG.storageKey);

    // Reset state
    state.widgets.forEach(widgetState => {
      widgetState.visible = true;
      widgetState.size = 'medium';
    });

    // Reset DOM
    const grid = document.querySelector(CONFIG.gridSelector);
    if (!grid) return;

    const widgets = Array.from(document.querySelectorAll(CONFIG.widgetSelector));
    widgets.sort((a, b) => {
      return parseInt(a.dataset.originalOrder) - parseInt(b.dataset.originalOrder);
    });

    widgets.forEach(widget => {
      // Show widget
      widget.style.display = '';

      // Remove size classes
      Object.values(CONFIG.sizes).forEach(cls => {
        widget.classList.remove(cls);
      });

      // Re-append in original order
      grid.appendChild(widget);
    });

    // Update order in state
    updateWidgetOrder();

    // Refresh customizer controls
    populateWidgetToggles();
    populateWidgetSizes();

    // Show notification
    if (typeof Toast !== 'undefined') {
      Toast.success('Dashboard reset to default layout');
    }
  }

  // Public API
  const DashboardCustomizer = {
    init,
    openCustomizer,
    closeCustomizer,
    saveLayout,
    resetLayout,
    toggleWidget,
    resizeWidget
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose to window
  window.DashboardCustomizer = DashboardCustomizer;

})();
