// Chart Templates System
// Sprint 10: Save, load, and share chart configurations
// Works with smart-chart-pro.js

(function() {
  'use strict';

  const STORAGE_KEY = 'btcsai_chart_templates';
  const MAX_TEMPLATES = 20;

  // Default templates
  const DEFAULT_TEMPLATES = [
    {
      id: 'scalping',
      name: 'Scalping Setup',
      description: 'Fast trades with RSI, volume, and 5-min candles',
      isDefault: true,
      timeframe: '5',
      indicators: ['rsi', 'volume', 'ema20'],
      settings: {
        rsiPeriod: 7,
        emaPeriod: 20
      }
    },
    {
      id: 'swing-trading',
      name: 'Swing Trading',
      description: '4H chart with EMA cloud and MACD',
      isDefault: true,
      timeframe: '240',
      indicators: ['ema20', 'ema50', 'macd', 'volume'],
      settings: {
        ema1Period: 20,
        ema2Period: 50
      }
    },
    {
      id: 'position-trading',
      name: 'Position Trading',
      description: 'Daily with Bollinger Bands and volume',
      isDefault: true,
      timeframe: '1440',
      indicators: ['bb', 'volume', 'ema200'],
      settings: {
        bbPeriod: 20,
        bbStdDev: 2
      }
    },
    {
      id: 'smc-analysis',
      name: 'SMC Analysis',
      description: 'Smart Money Concepts - OB, FVG, liquidity',
      isDefault: true,
      timeframe: '60',
      indicators: ['orderBlocks', 'fvg', 'liquidity', 'volume'],
      settings: {}
    },
    {
      id: 'trend-following',
      name: 'Trend Following',
      description: 'EMA ribbon with RSI confirmation',
      isDefault: true,
      timeframe: '240',
      indicators: ['ema20', 'ema50', 'ema200', 'rsi'],
      settings: {}
    }
  ];

  // State
  let templates = [];
  let activeTemplate = null;

  // Load templates from storage
  function loadTemplates() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const userTemplates = saved ? JSON.parse(saved) : [];
      // Merge default templates with user templates
      templates = [...DEFAULT_TEMPLATES, ...userTemplates];
    } catch (e) {
      console.error('Error loading chart templates:', e);
      templates = [...DEFAULT_TEMPLATES];
    }
  }

  // Save user templates to storage
  function saveTemplates() {
    try {
      // Only save non-default templates
      const userTemplates = templates.filter(t => !t.isDefault);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userTemplates));
    } catch (e) {
      console.error('Error saving chart templates:', e);
    }
  }

  /**
   * Get all templates
   */
  function getAll() {
    return templates;
  }

  /**
   * Get template by ID
   */
  function getById(id) {
    return templates.find(t => t.id === id);
  }

  /**
   * Get active template
   */
  function getActive() {
    return activeTemplate;
  }

  /**
   * Create a new template from current chart state
   * @param {string} name - Template name
   * @param {string} description - Template description
   * @param {Object} chartState - Current chart configuration
   */
  function create(name, description, chartState) {
    // Check limit
    const userTemplates = templates.filter(t => !t.isDefault);
    if (userTemplates.length >= MAX_TEMPLATES) {
      throw new Error(`Maximum ${MAX_TEMPLATES} custom templates allowed`);
    }

    const template = {
      id: 'custom_' + Date.now(),
      name: name.trim(),
      description: description.trim(),
      isDefault: false,
      timeframe: chartState.timeframe || '240',
      indicators: chartState.indicators || [],
      settings: chartState.settings || {},
      drawings: chartState.drawings || [],
      createdAt: new Date().toISOString()
    };

    templates.push(template);
    saveTemplates();

    window.dispatchEvent(new CustomEvent('chartTemplateCreated', {
      detail: { template }
    }));

    return template;
  }

  /**
   * Update an existing template
   */
  function update(id, updates) {
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Template not found');

    const template = templates[index];
    if (template.isDefault) throw new Error('Cannot modify default templates');

    templates[index] = { ...template, ...updates, id };
    saveTemplates();

    return templates[index];
  }

  /**
   * Delete a template
   */
  function remove(id) {
    const template = templates.find(t => t.id === id);
    if (!template) throw new Error('Template not found');
    if (template.isDefault) throw new Error('Cannot delete default templates');

    templates = templates.filter(t => t.id !== id);
    saveTemplates();

    if (activeTemplate?.id === id) {
      activeTemplate = null;
    }
  }

  /**
   * Apply a template to the chart
   * @param {string} id - Template ID
   */
  function apply(id) {
    const template = getById(id);
    if (!template) throw new Error('Template not found');

    activeTemplate = template;

    // Dispatch event for chart to handle
    window.dispatchEvent(new CustomEvent('applyChartTemplate', {
      detail: { template }
    }));

    // Also try to apply directly if SmartChartPro exposes methods
    applyToChart(template);

    return template;
  }

  /**
   * Apply template configuration to chart
   */
  function applyToChart(template) {
    // Change timeframe if timeframe buttons exist
    const tfBtn = document.querySelector(`[data-timeframe="${template.timeframe}"]`);
    if (tfBtn) tfBtn.click();

    // Toggle indicators
    setTimeout(() => {
      // First, turn off all indicators
      document.querySelectorAll('.indicator-toggle.active').forEach(btn => {
        const indicator = btn.dataset.indicator;
        if (!template.indicators.includes(indicator)) {
          btn.click(); // Turn off
        }
      });

      // Then turn on template indicators
      template.indicators.forEach(indicator => {
        const btn = document.querySelector(`.indicator-toggle[data-indicator="${indicator}"]`);
        if (btn && !btn.classList.contains('active')) {
          btn.click(); // Turn on
        }
      });
    }, 100);
  }

  /**
   * Export template as JSON
   */
  function exportTemplate(id) {
    const template = getById(id);
    if (!template) throw new Error('Template not found');

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      template: {
        ...template,
        isDefault: false // Remove default flag on export
      }
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-template-${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import template from JSON
   */
  function importTemplate(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      if (!data.template || !data.template.name) {
        throw new Error('Invalid template format');
      }

      const imported = {
        ...data.template,
        id: 'imported_' + Date.now(),
        isDefault: false,
        importedAt: new Date().toISOString()
      };

      // Check for duplicates
      const existing = templates.find(t =>
        t.name.toLowerCase() === imported.name.toLowerCase() && !t.isDefault
      );

      if (existing) {
        imported.name = imported.name + ' (imported)';
      }

      templates.push(imported);
      saveTemplates();

      return imported;
    } catch (e) {
      throw new Error('Failed to import template: ' + e.message);
    }
  }

  /**
   * Get shareable URL for template
   */
  function getShareUrl(id) {
    const template = getById(id);
    if (!template) throw new Error('Template not found');

    const encoded = btoa(JSON.stringify({
      n: template.name,
      tf: template.timeframe,
      ind: template.indicators
    }));

    return `${window.location.origin}/pro-tools/smart-chart/?template=${encoded}`;
  }

  /**
   * Load template from URL if present
   */
  function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const templateParam = params.get('template');

    if (templateParam) {
      try {
        const decoded = JSON.parse(atob(templateParam));
        const tempTemplate = {
          id: 'shared_' + Date.now(),
          name: decoded.n || 'Shared Template',
          timeframe: decoded.tf || '240',
          indicators: decoded.ind || [],
          settings: {},
          isDefault: false,
          isTemporary: true
        };

        activeTemplate = tempTemplate;
        applyToChart(tempTemplate);

        return tempTemplate;
      } catch (e) {
        console.error('Failed to load template from URL:', e);
      }
    }

    return null;
  }

  /**
   * Render template selector UI
   */
  function renderSelector(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const html = `
      <div class="template-selector">
        <label class="template-label">Chart Template:</label>
        <select id="template-select" class="template-select">
          <option value="">-- Select Template --</option>
          <optgroup label="Default Templates">
            ${templates.filter(t => t.isDefault).map(t => `
              <option value="${t.id}" ${activeTemplate?.id === t.id ? 'selected' : ''}>
                ${t.name}
              </option>
            `).join('')}
          </optgroup>
          ${templates.filter(t => !t.isDefault).length > 0 ? `
            <optgroup label="My Templates">
              ${templates.filter(t => !t.isDefault).map(t => `
                <option value="${t.id}" ${activeTemplate?.id === t.id ? 'selected' : ''}>
                  ${t.name}
                </option>
              `).join('')}
            </optgroup>
          ` : ''}
        </select>
        <button id="btn-save-template" class="template-btn" title="Save current setup">
          💾
        </button>
      </div>
    `;

    container.innerHTML = html;

    // Event handlers
    const select = container.querySelector('#template-select');
    select?.addEventListener('change', function() {
      if (this.value) {
        apply(this.value);
      }
    });

    const saveBtn = container.querySelector('#btn-save-template');
    saveBtn?.addEventListener('click', function() {
      showSaveModal();
    });
  }

  /**
   * Show save template modal
   */
  function showSaveModal() {
    const modal = document.createElement('div');
    modal.className = 'template-modal-overlay';
    modal.innerHTML = `
      <div class="template-modal">
        <h3>Save Chart Template</h3>
        <div class="form-group">
          <label for="template-name">Template Name</label>
          <input type="text" id="template-name" placeholder="My Trading Setup">
        </div>
        <div class="form-group">
          <label for="template-desc">Description (optional)</label>
          <input type="text" id="template-desc" placeholder="What this setup is for...">
        </div>
        <div class="modal-actions">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-save">Save Template</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Get current chart state
    function getCurrentState() {
      const activeIndicators = [];
      document.querySelectorAll('.indicator-toggle.active').forEach(btn => {
        activeIndicators.push(btn.dataset.indicator);
      });

      const activeTimeframe = document.querySelector('.timeframe-btn.active')?.dataset.timeframe || '240';

      return {
        timeframe: activeTimeframe,
        indicators: activeIndicators,
        settings: {}
      };
    }

    modal.querySelector('.btn-cancel').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('.btn-save').addEventListener('click', () => {
      const name = modal.querySelector('#template-name').value.trim();
      const desc = modal.querySelector('#template-desc').value.trim();

      if (!name) {
        alert('Please enter a template name');
        return;
      }

      try {
        const template = create(name, desc, getCurrentState());
        modal.remove();

        if (window.Toast) {
          Toast.show('Template saved: ' + template.name, 'success');
        }

        // Re-render selector if exists
        const selector = document.querySelector('.template-selector-container');
        if (selector) renderSelector('.template-selector-container');
      } catch (e) {
        alert(e.message);
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // Add modal styles
  const styles = document.createElement('style');
  styles.textContent = `
    .template-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .template-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .template-select {
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 0.375rem 0.75rem;
      color: var(--text-primary);
      font-size: 0.875rem;
      min-width: 180px;
    }
    .template-select:focus {
      border-color: var(--bitcoin-orange);
      outline: none;
    }
    .template-btn {
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 0.375rem 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .template-btn:hover {
      background: var(--bg-card-hover);
      border-color: var(--bitcoin-orange);
    }

    .template-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .template-modal {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 1.5rem;
      width: 90%;
      max-width: 400px;
    }
    .template-modal h3 {
      margin: 0 0 1rem;
      color: var(--text-primary);
    }
    .template-modal .form-group {
      margin-bottom: 1rem;
    }
    .template-modal label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
      text-transform: uppercase;
    }
    .template-modal input {
      width: 100%;
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      color: var(--text-primary);
      font-size: 0.875rem;
    }
    .template-modal input:focus {
      border-color: var(--bitcoin-orange);
      outline: none;
    }
    .modal-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }
    .modal-actions button {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-cancel {
      background: var(--bg-dark);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
    }
    .btn-cancel:hover {
      background: var(--bg-card-hover);
    }
    .btn-save {
      background: linear-gradient(135deg, var(--bitcoin-orange), var(--bitcoin-gold));
      border: none;
      color: #fff;
      font-weight: 600;
    }
    .btn-save:hover {
      filter: brightness(1.1);
    }
  `;
  document.head.appendChild(styles);

  // Initialize
  loadTemplates();

  // Check for URL template on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFromUrl);
  } else {
    setTimeout(loadFromUrl, 500);
  }

  // Expose public API
  window.ChartTemplates = {
    getAll,
    getById,
    getActive,
    create,
    update,
    remove,
    apply,
    exportTemplate,
    importTemplate,
    getShareUrl,
    renderSelector,
    DEFAULT_TEMPLATES
  };

})();
