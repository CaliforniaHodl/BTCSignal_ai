// Profitability Metrics - Phase 3
// SOPR, aSOPR, STH-SOPR, LTH-SOPR, and Realized Price
(function() {
  'use strict';

  // Cache DOM elements
  const elements = {
    // SOPR
    soprValue: document.getElementById('sopr-value'),
    soprSignal: document.getElementById('sopr-signal'),
    soprDescription: document.getElementById('sopr-description'),
    soprTrend: document.getElementById('sopr-trend'),

    // aSOPR
    asoprValue: document.getElementById('asopr-value'),
    asoprSignal: document.getElementById('asopr-signal'),
    asoprDescription: document.getElementById('asopr-description'),

    // STH-SOPR
    sthSoprValue: document.getElementById('sth-sopr-value'),
    sthSoprSignal: document.getElementById('sth-sopr-signal'),
    sthSoprDescription: document.getElementById('sth-sopr-description'),
    sthSoprGauge: document.getElementById('sth-sopr-gauge-fill'),

    // LTH-SOPR
    lthSoprValue: document.getElementById('lth-sopr-value'),
    lthSoprSignal: document.getElementById('lth-sopr-signal'),
    lthSoprDescription: document.getElementById('lth-sopr-description'),
    lthSoprGauge: document.getElementById('lth-sopr-gauge-fill'),

    // Realized Price
    realizedPrice: document.getElementById('realized-price'),
    realizedPriceVsCurrent: document.getElementById('realized-price-vs-current'),
    realizedPriceSignal: document.getElementById('realized-price-signal'),
    realizedPriceDescription: document.getElementById('realized-price-description'),
    realizedPriceMarker: document.getElementById('realized-price-marker'),

    // STH/LTH Realized Prices
    sthRealizedPrice: document.getElementById('sth-realized-price'),
    lthRealizedPrice: document.getElementById('lth-realized-price'),

    // Container
    metricsContainer: document.getElementById('profitability-metrics')
  };

  // Check if we're on a page with these widgets
  if (!elements.soprValue && !elements.metricsContainer) return;

  // Color mappings for signals
  const signalColors = {
    profit_taking: '#f85149',
    capitulation: '#3fb950',
    equilibrium: '#d29922',
    neutral: '#d29922',
    above: '#f85149',
    below: '#3fb950',
    near: '#d29922',
    increasing: '#3fb950',
    decreasing: '#f85149',
    stable: '#d29922'
  };

  // Load metrics from JSON file
  async function loadProfitabilityMetrics() {
    try {
      const res = await fetch('/data/profitability-metrics.json');
      if (!res.ok) {
        console.log('Profitability metrics not available, fetching live...');
        await fetchLiveMetrics();
        return;
      }
      const data = await res.json();
      renderMetrics(data);
    } catch (e) {
      console.error('Failed to load profitability metrics:', e);
      await fetchLiveMetrics();
    }
  }

  // Fetch live metrics from the serverless function
  async function fetchLiveMetrics() {
    try {
      const res = await fetch('/.netlify/functions/profitability-metrics');
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          renderMetrics(result.data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch live profitability metrics:', e);
      renderError();
    }
  }

  // Render all metrics
  function renderMetrics(data) {
    console.log('Rendering profitability metrics:', data);

    // SOPR
    if (elements.soprValue && data.sopr) {
      elements.soprValue.textContent = data.sopr.value.toFixed(3);
      elements.soprSignal.textContent = formatSignalText(data.sopr.signal);
      elements.soprSignal.style.color = signalColors[data.sopr.signal] || '#d29922';
      elements.soprDescription.textContent = data.sopr.description;

      if (elements.soprTrend) {
        elements.soprTrend.textContent = getTrendIcon(data.sopr.trend);
        elements.soprTrend.style.color = signalColors[data.sopr.trend] || '#d29922';
      }
    }

    // aSOPR
    if (elements.asoprValue && data.asopr) {
      elements.asoprValue.textContent = data.asopr.value.toFixed(3);
      elements.asoprSignal.textContent = formatSignalText(data.asopr.signal);
      elements.asoprSignal.style.color = signalColors[data.asopr.signal] || '#d29922';
      elements.asoprDescription.textContent = data.asopr.description;
    }

    // STH-SOPR
    if (elements.sthSoprValue && data.sthSopr) {
      elements.sthSoprValue.textContent = data.sthSopr.value.toFixed(3);
      elements.sthSoprSignal.textContent = formatSignalText(data.sthSopr.signal);
      elements.sthSoprSignal.style.color = signalColors[data.sthSopr.signal] || '#d29922';
      elements.sthSoprDescription.textContent = data.sthSopr.description;

      // Update gauge (0.5 to 1.5 range)
      if (elements.sthSoprGauge) {
        const percentage = Math.min(100, Math.max(0, ((data.sthSopr.value - 0.5) / 1.0) * 100));
        elements.sthSoprGauge.style.width = percentage + '%';
        elements.sthSoprGauge.style.backgroundColor = signalColors[data.sthSopr.signal] || '#d29922';
      }
    }

    // LTH-SOPR
    if (elements.lthSoprValue && data.lthSopr) {
      elements.lthSoprValue.textContent = data.lthSopr.value.toFixed(3);
      elements.lthSoprSignal.textContent = formatSignalText(data.lthSopr.signal);
      elements.lthSoprSignal.style.color = signalColors[data.lthSopr.signal] || '#d29922';
      elements.lthSoprDescription.textContent = data.lthSopr.description;

      // Update gauge (0.3 to 2.5 range)
      if (elements.lthSoprGauge) {
        const percentage = Math.min(100, Math.max(0, ((data.lthSopr.value - 0.3) / 2.2) * 100));
        elements.lthSoprGauge.style.width = percentage + '%';
        elements.lthSoprGauge.style.backgroundColor = signalColors[data.lthSopr.signal] || '#d29922';
      }
    }

    // Realized Price
    if (elements.realizedPrice && data.realizedPrice) {
      elements.realizedPrice.textContent = '$' + data.realizedPrice.price.toLocaleString();

      if (elements.realizedPriceVsCurrent) {
        const vsText = data.realizedPrice.vsCurrentPrice >= 0 ? '+' : '';
        elements.realizedPriceVsCurrent.textContent = vsText + data.realizedPrice.vsCurrentPrice + '%';
        elements.realizedPriceVsCurrent.style.color = signalColors[data.realizedPrice.signal] || '#d29922';
      }

      if (elements.realizedPriceSignal) {
        elements.realizedPriceSignal.textContent = formatSignalText(data.realizedPrice.signal);
        elements.realizedPriceSignal.style.color = signalColors[data.realizedPrice.signal] || '#d29922';
      }

      elements.realizedPriceDescription.textContent = data.realizedPrice.description;

      // Position marker on visual scale
      if (elements.realizedPriceMarker) {
        // Map -50% to +50% to 0-100% scale
        const percentage = Math.min(100, Math.max(0, (data.realizedPrice.vsCurrentPrice + 50)));
        elements.realizedPriceMarker.style.left = percentage + '%';
      }
    }

    // STH/LTH Realized Prices
    if (elements.sthRealizedPrice && data.sthRealizedPrice) {
      elements.sthRealizedPrice.textContent = '$' + data.sthRealizedPrice.toLocaleString();
    }

    if (elements.lthRealizedPrice && data.lthRealizedPrice) {
      elements.lthRealizedPrice.textContent = '$' + data.lthRealizedPrice.toLocaleString();
    }

    // Update last updated timestamp
    const lastUpdated = new Date(data.lastUpdated);
    const updateElements = document.querySelectorAll('.profitability-last-updated');
    updateElements.forEach(el => {
      el.textContent = 'Updated: ' + lastUpdated.toLocaleString();
    });

    // Show container if it was hidden
    if (elements.metricsContainer) {
      elements.metricsContainer.classList.remove('loading');
    }
  }

  // Format signal text for display
  function formatSignalText(signal) {
    const map = {
      profit_taking: 'Profit Taking',
      capitulation: 'Capitulation',
      equilibrium: 'Equilibrium',
      neutral: 'Neutral',
      above: 'Above',
      below: 'Below',
      near: 'Near',
      increasing: 'Increasing',
      decreasing: 'Decreasing',
      stable: 'Stable'
    };
    return map[signal] || signal;
  }

  // Get trend icon
  function getTrendIcon(trend) {
    const map = {
      increasing: '↗',
      decreasing: '↘',
      stable: '→'
    };
    return map[trend] || '→';
  }

  // Render error state
  function renderError() {
    const errorMsg = 'Failed to load profitability metrics. Please try again later.';

    if (elements.soprDescription) {
      elements.soprDescription.textContent = errorMsg;
      elements.soprDescription.style.color = '#f85149';
    }

    if (elements.metricsContainer) {
      elements.metricsContainer.classList.remove('loading');
    }
  }

  // Initialize - load metrics
  loadProfitabilityMetrics();

  // Refresh every 15 minutes
  setInterval(loadProfitabilityMetrics, 15 * 60 * 1000);

})();
