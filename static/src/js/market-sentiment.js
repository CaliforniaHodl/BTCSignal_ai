// Market Sentiment Dashboard - Homepage widgets
// Uses pre-fetched static snapshot for most data

(function() {
  'use strict';

  // Market snapshot data
  let marketData = null;

  // Load static market snapshot
  async function loadMarketSnapshot() {
    try {
      const res = await fetch('/data/market-snapshot.json');
      if (res.ok) {
        marketData = await res.json();
        console.log('Sentiment: Market snapshot loaded:', marketData.timestamp);
      }
    } catch (e) {
      console.error('Sentiment: Failed to load market snapshot:', e);
    }
  }

  const elements = {
    fngValue: document.getElementById('home-fng-value'),
    fngLabel: document.getElementById('home-fng-label'),
    fngIndicator: document.getElementById('home-fng-indicator'),
    fundingValue: document.getElementById('home-funding-value'),
    fundingLabel: document.getElementById('home-funding-label'),
    fundingFill: document.getElementById('home-funding-fill'),
    volumeBars: document.getElementById('home-volume-bars'),
    buyVol: document.getElementById('home-buy-vol'),
    sellVol: document.getElementById('home-sell-vol'),
    volRatio: document.getElementById('home-vol-ratio'),
    liqHeatmap: document.getElementById('home-liq-heatmap'),
    liqAbove: document.getElementById('home-liq-above'),
    liqCurrent: document.getElementById('home-liq-current'),
    liqBelow: document.getElementById('home-liq-below'),
    heroFundingValue: document.getElementById('hero-funding-value'),
    heroFundingLabel: document.getElementById('hero-funding-label'),
    statHigh: document.getElementById('stat-high'),
    statLow: document.getElementById('stat-low'),
    statVolume: document.getElementById('stat-volume'),
    statMcap: document.getElementById('stat-mcap')
  };

  if (!elements.fngValue) return;

  // Display Fear & Greed from static snapshot
  function fetchFearGreed() {
    if (!marketData || !marketData.fearGreed) {
      elements.fngValue.textContent = '--';
      elements.fngLabel.textContent = 'Loading...';
      return;
    }

    const value = marketData.fearGreed.value;
    const label = marketData.fearGreed.label;
    elements.fngValue.textContent = value;
    elements.fngLabel.textContent = label;
    elements.fngIndicator.style.left = value + '%';
    let colorClass;
    if (value <= 25) colorClass = 'extreme-fear';
    else if (value <= 45) colorClass = 'fear';
    else if (value <= 55) colorClass = 'neutral';
    else if (value <= 75) colorClass = 'greed';
    else colorClass = 'extreme-greed';
    elements.fngValue.className = 'fng-value-large ' + colorClass;
  }

  // Display Funding Rate from static snapshot
  function fetchFundingRate() {
    if (!marketData || !marketData.funding) {
      elements.fundingValue.textContent = '--';
      elements.fundingLabel.textContent = 'Loading...';
      return;
    }

    const fundingRate = marketData.funding.ratePercent;
    const rateStr = fundingRate.toFixed(4) + '%';
    elements.fundingValue.textContent = rateStr;
    let label;
    if (fundingRate > 0.02) {
      label = 'Very Bullish';
      elements.fundingValue.className = 'funding-value-large very-positive';
    } else if (fundingRate > 0.005) {
      label = 'Bullish';
      elements.fundingValue.className = 'funding-value-large positive';
    } else if (fundingRate > -0.005) {
      label = 'Neutral';
      elements.fundingValue.className = 'funding-value-large neutral';
    } else if (fundingRate > -0.02) {
      label = 'Bearish';
      elements.fundingValue.className = 'funding-value-large negative';
    } else {
      label = 'Very Bearish';
      elements.fundingValue.className = 'funding-value-large very-negative';
    }
    elements.fundingLabel.textContent = label;
    if (elements.heroFundingValue) {
      elements.heroFundingValue.textContent = rateStr;
      let heroColorClass = 'funding-quick-value';
      if (fundingRate > 0.005) heroColorClass += ' positive';
      else if (fundingRate < -0.005) heroColorClass += ' negative';
      else heroColorClass += ' neutral';
      elements.heroFundingValue.className = heroColorClass;
    }
    if (elements.heroFundingLabel) {
      elements.heroFundingLabel.textContent = label;
    }
    const maxRate = 0.05;
    const normalizedRate = Math.max(-maxRate, Math.min(maxRate, fundingRate));
    const percentage = (normalizedRate / maxRate) * 50;
    if (elements.fundingFill) {
      if (fundingRate >= 0) {
        elements.fundingFill.style.left = '50%';
        elements.fundingFill.style.width = percentage + '%';
        elements.fundingFill.className = 'funding-fill positive';
      } else {
        elements.fundingFill.style.left = (50 + percentage) + '%';
        elements.fundingFill.style.width = Math.abs(percentage) + '%';
        elements.fundingFill.className = 'funding-fill negative';
      }
    }
  }

  // Display Volume Profile from static snapshot
  function fetchVolumeProfile() {
    if (!marketData || !marketData.btc) {
      elements.buyVol.textContent = '--';
      elements.sellVol.textContent = '--';
      elements.volRatio.textContent = '--';
      return;
    }

    const priceChange24h = marketData.btc.priceChange24h || 0;
    let buyPct, sellPct;
    if (priceChange24h >= 0) {
      buyPct = 50 + Math.min(priceChange24h * 2, 25);
      sellPct = 100 - buyPct;
    } else {
      sellPct = 50 + Math.min(Math.abs(priceChange24h) * 2, 25);
      buyPct = 100 - sellPct;
    }
    const ratio = (buyPct / sellPct).toFixed(2);
    elements.buyVol.textContent = buyPct.toFixed(1) + '%';
    elements.sellVol.textContent = sellPct.toFixed(1) + '%';
    elements.volRatio.textContent = ratio;
    renderVolumeBars(buyPct.toFixed(1), sellPct.toFixed(1));
  }

  function renderVolumeBars(buyPct, sellPct) {
    elements.volumeBars.innerHTML = '<div class="vol-bar-container"><div class="vol-bar buy" style="width: ' + buyPct + '%"></div><div class="vol-bar sell" style="width: ' + sellPct + '%"></div></div>';
  }

  // Display Liquidation Zones from static snapshot
  function fetchLiquidationZones() {
    if (!marketData || !marketData.btc || !marketData.btc.price) {
      elements.liqCurrent.textContent = '--';
      elements.liqAbove.textContent = '--';
      elements.liqBelow.textContent = '--';
      return;
    }

    const currentPrice = marketData.btc.price;
    const longLiqZone = currentPrice * 0.95;
    const shortLiqZone = currentPrice * 1.05;
    elements.liqCurrent.textContent = '$' + currentPrice.toLocaleString(undefined, {maximumFractionDigits: 0});
    elements.liqAbove.textContent = '$' + shortLiqZone.toLocaleString(undefined, {maximumFractionDigits: 0});
    elements.liqBelow.textContent = '$' + longLiqZone.toLocaleString(undefined, {maximumFractionDigits: 0});
    renderLiqHeatmap(currentPrice, longLiqZone, shortLiqZone);
  }

  function renderLiqHeatmap(currentPrice, longZone, shortZone) {
    const range = shortZone - longZone;
    const currentPct = ((currentPrice - longZone) / range * 100).toFixed(1);
    elements.liqHeatmap.innerHTML = '<div class="liq-heatmap-visual"><div class="liq-zone short-zone" title="Short liquidation zone"><div class="liq-intensity high"></div><div class="liq-intensity medium"></div><div class="liq-intensity low"></div></div><div class="liq-current-marker" style="bottom: ' + currentPct + '%"><span class="marker-line"></span></div><div class="liq-zone long-zone" title="Long liquidation zone"><div class="liq-intensity low"></div><div class="liq-intensity medium"></div><div class="liq-intensity high"></div></div></div>';
  }

  // Display Quick Stats from static snapshot
  function fetchQuickStats() {
    if (!marketData || !marketData.btc) {
      return;
    }

    const btc = marketData.btc;
    if (elements.statHigh && btc.high24h) {
      elements.statHigh.textContent = '$' + btc.high24h.toLocaleString(undefined, {maximumFractionDigits: 0});
    }
    if (elements.statLow && btc.low24h) {
      elements.statLow.textContent = '$' + btc.low24h.toLocaleString(undefined, {maximumFractionDigits: 0});
    }
    if (elements.statVolume && btc.volume24h) {
      const vol = btc.volume24h;
      if (vol >= 1e9) {
        elements.statVolume.textContent = '$' + (vol / 1e9).toFixed(1) + 'B';
      } else {
        elements.statVolume.textContent = '$' + (vol / 1e6).toFixed(0) + 'M';
      }
    }
    if (elements.statMcap && btc.marketCap) {
      elements.statMcap.textContent = '$' + (btc.marketCap / 1e12).toFixed(2) + 'T';
    }
  }

  async function init() {
    // Load static market snapshot
    await loadMarketSnapshot();

    // Display all widgets from snapshot
    fetchFearGreed();
    fetchFundingRate();
    fetchVolumeProfile();
    fetchLiquidationZones();
    fetchQuickStats();
  }

  init();

  // No need for refresh intervals - data comes from static snapshot
  // Updated every 4 hours via scheduled function

})();
