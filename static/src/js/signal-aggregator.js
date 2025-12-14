/**
 * Signal Aggregator Dashboard Widget
 * Displays overall market signal with breakdown and factor analysis
 */

(function() {
  'use strict';

  const REPORT_CACHE_URL = 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/main/data/market-report.json';

  let signalData = null;

  /**
   * Initialize signal aggregator widget
   */
  function init() {
    loadSignalData();
  }

  /**
   * Load signal data from market report
   */
  async function loadSignalData() {
    try {
      const response = await fetch(REPORT_CACHE_URL + '?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch signal data');

      const reportData = await response.json();
      signalData = reportData.signal;

      renderSignal();
    } catch (error) {
      console.error('Failed to load signal data:', error);
      showSignalError();
    }
  }

  /**
   * Render signal display
   */
  function renderSignal() {
    if (!signalData) return;

    renderOverallSignal();
    renderConfidenceGauge();
    renderCategoryBreakdown();
    renderFactors();
  }

  /**
   * Render overall signal
   */
  function renderOverallSignal() {
    const signalEl = document.getElementById('overall-signal-value');
    const labelEl = document.getElementById('overall-signal-label');

    if (signalEl) {
      signalEl.textContent = signalData.overall;
      signalEl.className = 'overall-signal-value signal-' + signalData.overall.toLowerCase();
    }

    if (labelEl) {
      const labels = {
        'BULLISH': 'Market conditions favor upside',
        'BEARISH': 'Market conditions suggest downside',
        'NEUTRAL': 'Market is consolidating'
      };
      labelEl.textContent = labels[signalData.overall] || '';
    }
  }

  /**
   * Render confidence gauge
   */
  function renderConfidenceGauge() {
    const gaugeEl = document.getElementById('confidence-gauge-fill');
    const valueEl = document.getElementById('confidence-value');

    if (gaugeEl) {
      const percentage = signalData.confidence;
      gaugeEl.style.width = percentage + '%';

      // Color based on confidence
      if (percentage >= 70) {
        gaugeEl.style.backgroundColor = '#10b981';
      } else if (percentage >= 50) {
        gaugeEl.style.backgroundColor = '#f59e0b';
      } else {
        gaugeEl.style.backgroundColor = '#ef4444';
      }
    }

    if (valueEl) {
      valueEl.textContent = signalData.confidence + '%';
    }

    // Confidence label
    const confidenceLabelEl = document.getElementById('confidence-label');
    if (confidenceLabelEl) {
      let label;
      if (signalData.confidence >= 80) label = 'Very High';
      else if (signalData.confidence >= 60) label = 'High';
      else if (signalData.confidence >= 40) label = 'Moderate';
      else label = 'Low';

      confidenceLabelEl.textContent = label + ' Confidence';
    }
  }

  /**
   * Render category breakdown
   */
  function renderCategoryBreakdown() {
    const container = document.getElementById('signal-breakdown-bars');
    if (!container) return;

    const breakdown = signalData.breakdown;
    const categories = [
      { key: 'technical', name: 'Technical', icon: '📊' },
      { key: 'onchain', name: 'On-Chain', icon: '⛓️' },
      { key: 'derivatives', name: 'Derivatives', icon: '📈' },
      { key: 'priceModels', name: 'Models', icon: '💹' },
      { key: 'sentiment', name: 'Sentiment', icon: '🎭' }
    ];

    container.innerHTML = categories.map(cat => {
      const data = breakdown[cat.key];
      const score = data.score;
      const isPositive = score > 0;
      const barWidth = Math.abs(score);

      return `
        <div class="signal-breakdown-item">
          <div class="breakdown-label">
            <span class="breakdown-icon">${cat.icon}</span>
            <span class="breakdown-name">${cat.name}</span>
            <span class="breakdown-weight">(${data.weight}%)</span>
          </div>
          <div class="breakdown-bar-container">
            <div class="breakdown-bar-track">
              <div class="breakdown-bar-center"></div>
              <div class="breakdown-bar-fill ${isPositive ? 'positive' : 'negative'}"
                   style="width: ${barWidth}%; ${isPositive ? 'left' : 'right'}: 50%">
              </div>
            </div>
          </div>
          <div class="breakdown-value ${isPositive ? 'positive' : 'negative'}">
            ${score > 0 ? '+' : ''}${score.toFixed(0)}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render bullish and bearish factors
   */
  function renderFactors() {
    renderFactorList('bullish', signalData.bullishFactors);
    renderFactorList('bearish', signalData.bearishFactors);
  }

  /**
   * Render factor list
   */
  function renderFactorList(type, factors) {
    const container = document.getElementById(`${type}-factors-list`);
    if (!container) return;

    if (factors.length === 0) {
      container.innerHTML = `<p class="factors-empty">No significant ${type} factors</p>`;
      return;
    }

    container.innerHTML = factors.map((factor, index) => `
      <div class="factor-item">
        <div class="factor-rank">${index + 1}</div>
        <div class="factor-content">
          <div class="factor-header">
            <strong class="factor-name">${factor.name}</strong>
            <span class="factor-category">${factor.category}</span>
          </div>
          <p class="factor-explanation">${factor.explanation}</p>
          <div class="factor-footer">
            <span class="factor-value">Value: ${factor.value}</span>
            <span class="factor-weight">Weight: ${factor.weight}/10</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Show error message
   */
  function showSignalError() {
    const container = document.getElementById('signal-aggregator-container');
    if (container) {
      container.innerHTML = `
        <div class="signal-error">
          <span class="signal-error-icon">⚠️</span>
          <p>Failed to load signal data</p>
          <button class="btn-retry" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      renderSignal,
      renderOverallSignal,
      renderConfidenceGauge
    };
  }
})();
