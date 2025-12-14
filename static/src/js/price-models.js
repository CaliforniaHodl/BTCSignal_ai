// Price Models Dashboard Widget - Phase 6
// Frontend visualization for Bitcoin valuation models
// S2F, Thermocap, NUPL, Puell Multiple, MVRV Z-Score, RHODL, Delta Cap

(function() {
  'use strict';

  let priceModelsData = null;
  let updateInterval = null;

  /**
   * Initialize price models widget
   */
  function init() {
    console.log('Initializing price models widget...');
    loadPriceModels();

    // Update every 4 hours
    updateInterval = setInterval(loadPriceModels, 4 * 60 * 60 * 1000);
  }

  /**
   * Load price models data
   */
  async function loadPriceModels() {
    try {
      // Try GitHub cache first
      const response = await fetch('/data/price-models.json?' + Date.now());
      if (response.ok) {
        priceModelsData = await response.json();
        renderPriceModels();
        return;
      }
    } catch (e) {
      console.log('GitHub cache not available, fetching from API...');
    }

    try {
      // Fallback to Netlify function
      const response = await fetch('/.netlify/functions/price-models');
      if (response.ok) {
        priceModelsData = await response.json();
        renderPriceModels();
      } else {
        showError('Failed to load price models');
      }
    } catch (error) {
      console.error('Error loading price models:', error);
      showError('Error loading price models');
    }
  }

  /**
   * Render all price model widgets
   */
  function renderPriceModels() {
    if (!priceModelsData) return;

    renderOverallValuation();
    renderStockToFlow();
    renderNUPL();
    renderThermocap();
    renderPuellMultiple();
    renderMVRVZScore();
    renderRHODL();
    renderDeltaCap();
    updateMVRV();
    updateLastUpdated();
  }

  /**
   * Render overall valuation score
   */
  function renderOverallValuation() {
    const overall = priceModelsData.overallValuation;

    // Update main score
    const scoreEl = document.getElementById('pm-overall-score');
    const ratingEl = document.getElementById('pm-overall-rating');
    const confidenceEl = document.getElementById('pm-overall-confidence');
    const summaryEl = document.getElementById('pm-overall-summary');
    const agreementEl = document.getElementById('pm-model-agreement');

    if (scoreEl) {
      scoreEl.textContent = overall.score;
      scoreEl.className = 'valuation-score-value ' + getScoreClass(overall.score);
    }

    if (ratingEl) {
      ratingEl.textContent = formatRating(overall.rating);
      ratingEl.className = 'valuation-rating ' + getRatingClass(overall.rating);
    }

    if (confidenceEl) {
      confidenceEl.textContent = `${overall.confidence}%`;
    }

    if (summaryEl) {
      summaryEl.textContent = overall.summary;
    }

    if (agreementEl) {
      agreementEl.textContent = `${overall.modelAgreement}%`;
    }

    // Update gauge
    updateGauge('pm-overall-gauge', overall.score, -100, 100);

    // Update model lists
    renderModelLists(overall);
  }

  /**
   * Render bullish/bearish model lists
   */
  function renderModelLists(overall) {
    const bullishList = document.getElementById('pm-bullish-models');
    const bearishList = document.getElementById('pm-bearish-models');

    if (bullishList) {
      if (overall.bullishModels.length > 0) {
        bullishList.innerHTML = overall.bullishModels
          .map(m => `<span class="model-chip bullish">${m}</span>`)
          .join('');
      } else {
        bullishList.innerHTML = '<span class="model-chip neutral">None</span>';
      }
    }

    if (bearishList) {
      if (overall.bearishModels.length > 0) {
        bearishList.innerHTML = overall.bearishModels
          .map(m => `<span class="model-chip bearish">${m}</span>`)
          .join('');
      } else {
        bearishList.innerHTML = '<span class="model-chip neutral">None</span>';
      }
    }
  }

  /**
   * Render Stock-to-Flow model
   */
  function renderStockToFlow() {
    const s2f = priceModelsData.stockToFlow;

    setText('pm-s2f-ratio', s2f.currentRatio.toFixed(1));
    setText('pm-s2f-model-price', `$${s2f.modelPrice.toLocaleString()}`);
    setText('pm-s2f-actual-price', `$${s2f.actualPrice.toLocaleString()}`);
    setText('pm-s2f-deflection', `${s2f.deflection > 0 ? '+' : ''}${s2f.deflection.toFixed(1)}%`);
    setText('pm-s2f-signal', formatSignal(s2f.signal));
    setText('pm-s2f-description', s2f.description);

    // Update signal badge
    const signalEl = document.getElementById('pm-s2f-signal');
    if (signalEl) {
      signalEl.className = 'model-signal ' + getSignalClass(s2f.signal);
    }

    // Update deflection bar
    updateDeflectionBar('pm-s2f-deflection-bar', s2f.deflectionMultiple);

    // Halving info
    setText('pm-s2f-next-halving', s2f.halvingInfo.nextHalving);
    setText('pm-s2f-days-until', `${s2f.halvingInfo.daysUntilHalving} days`);
  }

  /**
   * Render NUPL zone indicator
   */
  function renderNUPL() {
    const nupl = priceModelsData.nupl;

    setText('pm-nupl-value', `${(nupl.value * 100).toFixed(1)}%`);
    setText('pm-nupl-zone', formatZone(nupl.zone));
    setText('pm-nupl-description', nupl.description);

    // Update zone badge
    const zoneEl = document.getElementById('pm-nupl-zone');
    if (zoneEl) {
      zoneEl.className = 'nupl-zone-badge ' + nupl.zone;
    }

    // Update NUPL meter position
    updateNUPLMeter(nupl.value);
  }

  /**
   * Update NUPL meter visualization
   */
  function updateNUPLMeter(value) {
    const marker = document.getElementById('pm-nupl-marker');
    if (!marker) return;

    // Map value from -1 to 1 to 0% to 100%
    const position = ((value + 1) / 2) * 100;
    marker.style.left = `${Math.max(0, Math.min(100, position))}%`;
  }

  /**
   * Render Thermocap multiple
   */
  function renderThermocap() {
    const thermocap = priceModelsData.thermocap;

    setText('pm-thermocap-multiple', `${thermocap.thermocapMultiple.toFixed(1)}x`);
    setText('pm-thermocap-signal', formatSignal(thermocap.signal));
    setText('pm-thermocap-description', thermocap.description);

    // Update signal badge
    const signalEl = document.getElementById('pm-thermocap-signal');
    if (signalEl) {
      signalEl.className = 'model-signal ' + getSignalClass(thermocap.signal);
    }

    // Update bar
    updateBar('pm-thermocap-bar', thermocap.thermocapMultiple, 0, 60);
  }

  /**
   * Render Puell Multiple
   */
  function renderPuellMultiple() {
    const puell = priceModelsData.puellMultiple;

    setText('pm-puell-value', puell.value.toFixed(2));
    setText('pm-puell-signal', formatSignal(puell.signal));
    setText('pm-puell-description', puell.description);

    // Update signal badge
    const signalEl = document.getElementById('pm-puell-signal');
    if (signalEl) {
      signalEl.className = 'model-signal ' + getSignalClass(puell.signal);
    }

    // Update gauge
    updateGauge('pm-puell-gauge', puell.value, 0, 4);
  }

  /**
   * Render MVRV Z-Score
   */
  function renderMVRVZScore() {
    const mvrvZ = priceModelsData.mvrvZScore;

    setText('pm-mvrv-z-score', mvrvZ.zScore.toFixed(2));
    setText('pm-mvrv-z-signal', formatSignal(mvrvZ.signal));
    setText('pm-mvrv-z-description', mvrvZ.description);

    // Update signal badge
    const signalEl = document.getElementById('pm-mvrv-z-signal');
    if (signalEl) {
      signalEl.className = 'model-signal ' + getSignalClass(mvrvZ.signal);
    }

    // Update gauge
    updateGauge('pm-mvrv-z-gauge', mvrvZ.zScore, -2, 10);
  }

  /**
   * Render RHODL Ratio
   */
  function renderRHODL() {
    const rhodl = priceModelsData.rhodlRatio;

    setText('pm-rhodl-ratio', rhodl.ratio.toFixed(2));
    setText('pm-rhodl-signal', formatSignal(rhodl.signal));
    setText('pm-rhodl-description', rhodl.description);

    // Update signal badge
    const signalEl = document.getElementById('pm-rhodl-signal');
    if (signalEl) {
      signalEl.className = 'model-signal ' + getSignalClass(rhodl.signal);
    }

    // Update bar
    updateBar('pm-rhodl-bar', rhodl.ratio, 0, 4);
  }

  /**
   * Render Delta Cap
   */
  function renderDeltaCap() {
    const delta = priceModelsData.deltaCap;

    setText('pm-delta-price', `$${delta.deltaPrice.toLocaleString()}`);
    setText('pm-delta-current-price', `$${delta.currentPrice.toLocaleString()}`);
    setText('pm-delta-signal', formatSignal(delta.signal));
    setText('pm-delta-description', delta.description);

    // Update signal badge
    const signalEl = document.getElementById('pm-delta-signal');
    if (signalEl) {
      signalEl.className = 'model-signal ' + getSignalClass(delta.signal);
    }

    // Price comparison
    const ratio = (delta.currentPrice / delta.deltaPrice) * 100;
    setText('pm-delta-ratio', `${ratio.toFixed(0)}%`);
  }

  /**
   * Update MVRV display (for the separate MVRV card)
   */
  function updateMVRV() {
    if (!priceModelsData || !priceModelsData.realizedCap) return;

    const mvrv = priceModelsData.realizedCap;

    setText('pm-mvrv-ratio', mvrv.mvrv.toFixed(2));
    setText('pm-mvrv-signal', formatSignal(mvrv.signal));
    setText('pm-mvrv-description', mvrv.description);

    // Update signal badge
    const signalEl = document.getElementById('pm-mvrv-signal');
    if (signalEl) {
      signalEl.className = 'model-signal ' + getSignalClass(mvrv.signal);
    }
  }

  /**
   * Update gauge visualization
   */
  function updateGauge(id, value, min, max) {
    const gauge = document.getElementById(id);
    if (!gauge) return;

    const percentage = ((value - min) / (max - min)) * 100;
    const clampedPct = Math.max(0, Math.min(100, percentage));

    // Assuming gauge has a fill element
    const fill = gauge.querySelector('.gauge-fill');
    if (fill) {
      fill.style.width = `${clampedPct}%`;
    }
  }

  /**
   * Update bar visualization
   */
  function updateBar(id, value, min, max) {
    const bar = document.getElementById(id);
    if (!bar) return;

    const percentage = ((value - min) / (max - min)) * 100;
    const clampedPct = Math.max(0, Math.min(100, percentage));

    bar.style.width = `${clampedPct}%`;
  }

  /**
   * Update deflection bar (shows over/under valuation)
   */
  function updateDeflectionBar(id, multiple) {
    const bar = document.getElementById(id);
    if (!bar) return;

    // Map multiple to position (0.5x = 0%, 1.0x = 50%, 2.0x = 100%)
    const minMultiple = 0.3;
    const maxMultiple = 2.5;
    const percentage = ((multiple - minMultiple) / (maxMultiple - minMultiple)) * 100;
    const clampedPct = Math.max(0, Math.min(100, percentage));

    bar.style.left = `${clampedPct}%`;
  }

  /**
   * Set text content safely
   */
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = text;
    }
  }

  /**
   * Get CSS class for score
   */
  function getScoreClass(score) {
    if (score < -50) return 'extreme-undervalued';
    if (score < -20) return 'undervalued';
    if (score < -10) return 'slightly-undervalued';
    if (score <= 10) return 'fair';
    if (score <= 20) return 'slightly-overvalued';
    if (score <= 50) return 'overvalued';
    return 'extreme-overvalued';
  }

  /**
   * Get CSS class for rating
   */
  function getRatingClass(rating) {
    return rating.replace(/_/g, '-');
  }

  /**
   * Get CSS class for signal
   */
  function getSignalClass(signal) {
    if (typeof signal === 'string') {
      return signal.replace(/_/g, '-');
    }
    return 'neutral';
  }

  /**
   * Format rating text
   */
  function formatRating(rating) {
    return rating
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format signal text
   */
  function formatSignal(signal) {
    if (typeof signal === 'string') {
      return signal
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return 'Unknown';
  }

  /**
   * Format zone text
   */
  function formatZone(zone) {
    return zone.charAt(0).toUpperCase() + zone.slice(1);
  }

  /**
   * Update last updated timestamp
   */
  function updateLastUpdated() {
    const el = document.getElementById('pm-last-updated');
    if (el && priceModelsData) {
      const date = new Date(priceModelsData.lastUpdated);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / 1000 / 60);

      let timeAgo;
      if (diffMinutes < 60) {
        timeAgo = `${diffMinutes} minutes ago`;
      } else if (diffMinutes < 1440) {
        timeAgo = `${Math.floor(diffMinutes / 60)} hours ago`;
      } else {
        timeAgo = `${Math.floor(diffMinutes / 1440)} days ago`;
      }

      el.textContent = `Updated ${timeAgo}`;
    }
  }

  /**
   * Show error message
   */
  function showError(message) {
    console.error('Price models error:', message);

    // Update overall score to show error
    const scoreEl = document.getElementById('pm-overall-score');
    if (scoreEl) {
      scoreEl.textContent = '--';
    }

    const summaryEl = document.getElementById('pm-overall-summary');
    if (summaryEl) {
      summaryEl.textContent = message;
      summaryEl.className = 'error-message';
    }
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });

  // Export for testing
  window.PriceModels = {
    loadPriceModels,
    renderPriceModels,
  };
})();
