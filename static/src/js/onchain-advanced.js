// On-Chain Advanced Metrics - Phase 1 Sprint 1
// NVT Ratio, Puell Multiple, Stock-to-Flow, SSR, Reserve Risk, NUPL
(function() {
  'use strict';

  // Cache DOM elements
  const elements = {
    // NVT
    nvtValue: document.getElementById('nvt-value'),
    nvtSignal: document.getElementById('nvt-signal'),
    nvtDescription: document.getElementById('nvt-description'),
    nvtGauge: document.getElementById('nvt-gauge-fill'),

    // Puell Multiple
    puellValue: document.getElementById('puell-value'),
    puellZone: document.getElementById('puell-zone'),
    puellDescription: document.getElementById('puell-description'),
    puellGauge: document.getElementById('puell-gauge-fill'),

    // Stock-to-Flow
    s2fRatio: document.getElementById('s2f-ratio'),
    s2fModelPrice: document.getElementById('s2f-model-price'),
    s2fDeflection: document.getElementById('s2f-deflection'),
    s2fSignal: document.getElementById('s2f-signal'),

    // SSR
    ssrValue: document.getElementById('ssr-value'),
    ssrTrend: document.getElementById('ssr-trend'),
    ssrDescription: document.getElementById('ssr-description'),
    ssrGauge: document.getElementById('ssr-gauge-fill'),

    // Reserve Risk
    reserveRiskValue: document.getElementById('reserve-risk-value'),
    reserveRiskZone: document.getElementById('reserve-risk-zone'),
    reserveRiskDescription: document.getElementById('reserve-risk-description'),

    // NUPL
    nuplValue: document.getElementById('nupl-value'),
    nuplZone: document.getElementById('nupl-zone'),
    nuplDescription: document.getElementById('nupl-description'),
    nuplMarker: document.getElementById('nupl-marker'),

    // Container
    metricsContainer: document.getElementById('onchain-advanced-metrics')
  };

  // Check if we're on a page with these widgets
  if (!elements.nvtValue && !elements.metricsContainer) return;

  // Color mappings for signals/zones
  const signalColors = {
    undervalued: '#3fb950',
    fair: '#d29922',
    overvalued: '#f85149',
    buy: '#3fb950',
    neutral: '#d29922',
    sell: '#f85149',
    bullish: '#3fb950',
    bearish: '#f85149',
    opportunity: '#3fb950',
    risk: '#f85149',
    capitulation: '#f85149',
    hope: '#d29922',
    optimism: '#58a6ff',
    belief: '#3fb950',
    euphoria: '#a371f7'
  };

  // Load metrics from JSON file
  async function loadOnChainMetrics() {
    try {
      const res = await fetch('/data/onchain-metrics.json');
      if (!res.ok) {
        console.log('On-chain metrics not available, fetching live...');
        await fetchLiveMetrics();
        return;
      }
      const data = await res.json();
      renderMetrics(data);
    } catch (e) {
      console.error('Failed to load on-chain metrics:', e);
      await fetchLiveMetrics();
    }
  }

  // Fetch live metrics from the serverless function
  async function fetchLiveMetrics() {
    try {
      const res = await fetch('/.netlify/functions/onchain-metrics');
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          renderMetrics(result.data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch live on-chain metrics:', e);
      renderError();
    }
  }

  // Render all metrics
  function renderMetrics(data) {
    renderNVT(data.nvt);
    renderPuellMultiple(data.puellMultiple);
    renderStockToFlow(data.stockToFlow);
    renderSSR(data.ssr);
    renderReserveRisk(data.reserveRisk);
    renderNUPL(data.nupl);
  }

  // Render NVT Ratio
  function renderNVT(nvt) {
    if (!nvt || !elements.nvtValue) return;

    elements.nvtValue.textContent = nvt.ratio.toFixed(1);
    elements.nvtValue.style.color = signalColors[nvt.signal];

    if (elements.nvtSignal) {
      elements.nvtSignal.textContent = capitalizeFirst(nvt.signal);
      elements.nvtSignal.className = 'metric-badge ' + nvt.signal;
    }

    if (elements.nvtDescription) {
      elements.nvtDescription.textContent = nvt.description;
    }

    if (elements.nvtGauge) {
      // Map NVT ratio 0-100 to gauge (0-100%)
      const gaugePercent = Math.min(Math.max(nvt.ratio / 100 * 100, 0), 100);
      elements.nvtGauge.style.width = gaugePercent + '%';
      elements.nvtGauge.style.backgroundColor = signalColors[nvt.signal];
    }
  }

  // Render Puell Multiple
  function renderPuellMultiple(puell) {
    if (!puell || !elements.puellValue) return;

    elements.puellValue.textContent = puell.value.toFixed(2);
    elements.puellValue.style.color = signalColors[puell.zone];

    if (elements.puellZone) {
      const zoneLabels = { buy: 'Buy Zone', neutral: 'Neutral', sell: 'Sell Zone' };
      elements.puellZone.textContent = zoneLabels[puell.zone] || puell.zone;
      elements.puellZone.className = 'metric-badge ' + puell.zone;
    }

    if (elements.puellDescription) {
      elements.puellDescription.textContent = puell.description;
    }

    if (elements.puellGauge) {
      // Puell typical range 0-3, map to gauge
      const gaugePercent = Math.min(Math.max(puell.value / 3 * 100, 0), 100);
      elements.puellGauge.style.width = gaugePercent + '%';
      elements.puellGauge.style.backgroundColor = signalColors[puell.zone];
    }
  }

  // Render Stock-to-Flow
  function renderStockToFlow(s2f) {
    if (!s2f || !elements.s2fRatio) return;

    elements.s2fRatio.textContent = s2f.ratio.toFixed(1);

    if (elements.s2fModelPrice) {
      elements.s2fModelPrice.textContent = '$' + formatNumber(s2f.modelPrice);
    }

    if (elements.s2fDeflection) {
      const prefix = s2f.deflection >= 0 ? '+' : '';
      elements.s2fDeflection.textContent = prefix + s2f.deflection.toFixed(1) + '%';
      elements.s2fDeflection.style.color = signalColors[s2f.signal];
    }

    if (elements.s2fSignal) {
      elements.s2fSignal.textContent = capitalizeFirst(s2f.signal);
      elements.s2fSignal.className = 'metric-badge ' + s2f.signal;
    }
  }

  // Render Stablecoin Supply Ratio
  function renderSSR(ssr) {
    if (!ssr || !elements.ssrValue) return;

    elements.ssrValue.textContent = ssr.ratio.toFixed(1);
    elements.ssrValue.style.color = signalColors[ssr.trend];

    if (elements.ssrTrend) {
      elements.ssrTrend.textContent = capitalizeFirst(ssr.trend);
      elements.ssrTrend.className = 'metric-badge ' + ssr.trend;
    }

    if (elements.ssrDescription) {
      elements.ssrDescription.textContent = ssr.description;
    }

    if (elements.ssrGauge) {
      // SSR typical range 2-20, map to gauge (inverted - lower is better)
      const gaugePercent = Math.min(Math.max((20 - ssr.ratio) / 18 * 100, 0), 100);
      elements.ssrGauge.style.width = gaugePercent + '%';
      elements.ssrGauge.style.backgroundColor = signalColors[ssr.trend];
    }
  }

  // Render Reserve Risk
  function renderReserveRisk(rr) {
    if (!rr || !elements.reserveRiskValue) return;

    elements.reserveRiskValue.textContent = rr.value.toFixed(4);
    elements.reserveRiskValue.style.color = signalColors[rr.zone];

    if (elements.reserveRiskZone) {
      const zoneLabels = { opportunity: 'Opportunity', neutral: 'Neutral', risk: 'Risk Zone' };
      elements.reserveRiskZone.textContent = zoneLabels[rr.zone] || rr.zone;
      elements.reserveRiskZone.className = 'metric-badge ' + rr.zone;
    }

    if (elements.reserveRiskDescription) {
      elements.reserveRiskDescription.textContent = rr.description;
    }
  }

  // Render NUPL
  function renderNUPL(nupl) {
    if (!nupl || !elements.nuplValue) return;

    const displayValue = (nupl.value * 100).toFixed(1);
    elements.nuplValue.textContent = displayValue + '%';
    elements.nuplValue.style.color = signalColors[nupl.zone];

    if (elements.nuplZone) {
      elements.nuplZone.textContent = capitalizeFirst(nupl.zone);
      elements.nuplZone.className = 'metric-badge ' + nupl.zone;
    }

    if (elements.nuplDescription) {
      elements.nuplDescription.textContent = nupl.description;
    }

    if (elements.nuplMarker) {
      // NUPL range -0.5 to 1, map to 0-100%
      const markerPercent = Math.min(Math.max((nupl.value + 0.5) / 1.5 * 100, 0), 100);
      elements.nuplMarker.style.left = markerPercent + '%';
    }
  }

  // Render error state
  function renderError() {
    const errorText = 'Unavailable';
    if (elements.nvtValue) elements.nvtValue.textContent = errorText;
    if (elements.puellValue) elements.puellValue.textContent = errorText;
    if (elements.s2fRatio) elements.s2fRatio.textContent = errorText;
    if (elements.ssrValue) elements.ssrValue.textContent = errorText;
    if (elements.reserveRiskValue) elements.reserveRiskValue.textContent = errorText;
    if (elements.nuplValue) elements.nuplValue.textContent = errorText;
  }

  // Helper: capitalize first letter
  function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Helper: format large numbers
  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  }

  // Initialize on load
  loadOnChainMetrics();

  // Refresh every 30 minutes (these metrics don't change rapidly)
  setInterval(loadOnChainMetrics, 30 * 60 * 1000);

  // Expose for manual refresh
  window.BTCSAIOnChain = {
    refresh: loadOnChainMetrics
  };

})();
