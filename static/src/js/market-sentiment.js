// Market Sentiment Dashboard - Homepage widgets
// Using US-friendly APIs (CoinGecko, alternative.me)

(function() {
  'use strict';

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

  let cachedBtcData = null;

  async function fetchBtcData() {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false');
      cachedBtcData = await res.json();
      return cachedBtcData;
    } catch (e) {
      console.error('Failed to fetch BTC data:', e);
      return null;
    }
  }

  async function fetchFearGreed() {
    try {
      const res = await fetch('https://api.alternative.me/fng/?limit=1');
      const data = await res.json();
      if (data && data.data && data.data[0]) {
        const fng = data.data[0];
        const value = parseInt(fng.value);
        const label = fng.value_classification;
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
    } catch (e) {
      console.error('Failed to fetch Fear and Greed:', e);
      elements.fngValue.textContent = '--';
      elements.fngLabel.textContent = 'Unavailable';
    }
  }

  async function fetchFundingRate() {
    try {
      // Real funding rate from Bybit (free, globally accessible)
      const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT');
      const data = await res.json();
      if (data && data.result && data.result.list && data.result.list[0]) {
        const fundingRate = parseFloat(data.result.list[0].fundingRate) * 100;
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
    } catch (e) {
      console.error('Failed to fetch funding rate:', e);
      elements.fundingValue.textContent = '--';
      elements.fundingLabel.textContent = 'Unavailable';
    }
  }

  async function fetchVolumeProfile() {
    try {
      const data = cachedBtcData || await fetchBtcData();
      if (data && data.market_data) {
        const priceChange24h = data.market_data.price_change_percentage_24h || 0;
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
    } catch (e) {
      console.error('Failed to fetch volume:', e);
      elements.buyVol.textContent = '--';
      elements.sellVol.textContent = '--';
      elements.volRatio.textContent = '--';
    }
  }

  function renderVolumeBars(buyPct, sellPct) {
    elements.volumeBars.innerHTML = '<div class="vol-bar-container"><div class="vol-bar buy" style="width: ' + buyPct + '%"></div><div class="vol-bar sell" style="width: ' + sellPct + '%"></div></div>';
  }

  async function fetchLiquidationZones() {
    try {
      const data = cachedBtcData || await fetchBtcData();
      if (data && data.market_data) {
        const currentPrice = data.market_data.current_price.usd;
        const longLiqZone = currentPrice * 0.95;
        const shortLiqZone = currentPrice * 1.05;
        elements.liqCurrent.textContent = '$' + currentPrice.toLocaleString(undefined, {maximumFractionDigits: 0});
        elements.liqAbove.textContent = '$' + shortLiqZone.toLocaleString(undefined, {maximumFractionDigits: 0});
        elements.liqBelow.textContent = '$' + longLiqZone.toLocaleString(undefined, {maximumFractionDigits: 0});
        renderLiqHeatmap(currentPrice, longLiqZone, shortLiqZone);
      }
    } catch (e) {
      console.error('Failed to fetch liquidation zones:', e);
      elements.liqCurrent.textContent = '--';
      elements.liqAbove.textContent = '--';
      elements.liqBelow.textContent = '--';
    }
  }

  function renderLiqHeatmap(currentPrice, longZone, shortZone) {
    const range = shortZone - longZone;
    const currentPct = ((currentPrice - longZone) / range * 100).toFixed(1);
    elements.liqHeatmap.innerHTML = '<div class="liq-heatmap-visual"><div class="liq-zone short-zone" title="Short liquidation zone"><div class="liq-intensity high"></div><div class="liq-intensity medium"></div><div class="liq-intensity low"></div></div><div class="liq-current-marker" style="bottom: ' + currentPct + '%"><span class="marker-line"></span></div><div class="liq-zone long-zone" title="Long liquidation zone"><div class="liq-intensity low"></div><div class="liq-intensity medium"></div><div class="liq-intensity high"></div></div></div>';
  }

  async function fetchQuickStats() {
    try {
      const data = cachedBtcData || await fetchBtcData();
      if (data && data.market_data) {
        const md = data.market_data;
        if (elements.statHigh) {
          elements.statHigh.textContent = '$' + md.high_24h.usd.toLocaleString(undefined, {maximumFractionDigits: 0});
        }
        if (elements.statLow) {
          elements.statLow.textContent = '$' + md.low_24h.usd.toLocaleString(undefined, {maximumFractionDigits: 0});
        }
        if (elements.statVolume) {
          const vol = md.total_volume.usd;
          if (vol >= 1e9) {
            elements.statVolume.textContent = '$' + (vol / 1e9).toFixed(1) + 'B';
          } else {
            elements.statVolume.textContent = '$' + (vol / 1e6).toFixed(0) + 'M';
          }
        }
        if (elements.statMcap) {
          elements.statMcap.textContent = '$' + (md.market_cap.usd / 1e12).toFixed(2) + 'T';
        }
      }
    } catch (e) {
      console.error('Failed to fetch quick stats:', e);
    }
  }

  async function init() {
    await fetchBtcData();
    fetchFearGreed();
    fetchFundingRate();
    fetchVolumeProfile();
    fetchLiquidationZones();
    fetchQuickStats();
  }

  init();

  setInterval(async () => {
    await fetchBtcData();
    fetchQuickStats();
    fetchVolumeProfile();
    fetchLiquidationZones();
  }, 60000);

  setInterval(fetchFearGreed, 300000);
  setInterval(fetchFundingRate, 300000);

})();
