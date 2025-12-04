// BART Pattern Pre-Warning System
// Detects conditions that typically precede BART (Bart Simpson head) manipulation patterns
// Also tracks and logs actual BART events when they occur
// Uses pre-fetched static snapshot for market data, real-time only for price tracking

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
        console.log('BART: Market snapshot loaded:', marketData.timestamp);
      }
    } catch (e) {
      console.error('BART: Failed to load market snapshot:', e);
    }
  }

  const CONFIG = {
    UPDATE_INTERVAL: 30000, // 30 seconds
    BART_CHECK_INTERVAL: 10000, // 10 seconds for BART detection
    FUNDING_EXTREME_THRESHOLD: 0.03, // 0.03% is considered extreme
    VOLATILITY_LOOKBACK: 24, // hours for volatility calculation
    OI_VOLUME_RATIO_THRESHOLD: 5, // High OI relative to volume
    BART_THRESHOLD: 2.0, // 2% move threshold for BART detection
    BART_TIME_WINDOW: 300000, // 5 minutes for initial spike
    BART_REVERSAL_WINDOW: 14400000, // 4 hours for reversal
    HISTORY_MAX_ITEMS: 100 // Max BART events to store
  };

  // Storage keys
  const STORAGE_KEYS = {
    BART_HISTORY: 'btc_bart_history',
    RISK_HISTORY: 'btc_bart_risk_history',
    PRICE_SNAPSHOTS: 'btc_price_snapshots'
  };

  const elements = {
    riskScore: document.getElementById('bart-risk-score'),
    riskLevel: document.getElementById('bart-risk-level'),
    riskBar: document.getElementById('bart-risk-bar'),
    riskFactors: document.getElementById('bart-risk-factors'),
    riskStatus: document.getElementById('bart-risk-status')
  };

  // Risk factor weights (total = 100)
  const WEIGHTS = {
    timeOfWeek: 20,      // Weekend/off-hours risk
    fundingExtreme: 25,  // Over-leveraged market
    volatilityCompression: 20, // Calm before storm
    oiVolumeRatio: 20,   // Positions vs activity
    priceStagnation: 15  // Coiled spring
  };

  let cachedData = {
    fundingRate: null,
    openInterest: null,
    volatility: null,
    volume24h: null,
    price: null,
    priceHistory: []
  };

  let currentRiskScore = 0;
  let priceSnapshots = [];

  // =====================================================
  // LOCAL STORAGE HELPERS
  // =====================================================

  function getStoredData(key, defaultValue = []) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return defaultValue;
    }
  }

  function setStoredData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error writing to localStorage:', e);
    }
  }

  // =====================================================
  // BART EVENT DETECTION & LOGGING
  // =====================================================

  function addPriceSnapshot(price) {
    const now = Date.now();
    priceSnapshots.push({ time: now, price: price });

    // Keep only last 4 hours of snapshots
    const cutoff = now - CONFIG.BART_REVERSAL_WINDOW;
    priceSnapshots = priceSnapshots.filter(s => s.time > cutoff);

    // Persist snapshots
    setStoredData(STORAGE_KEYS.PRICE_SNAPSHOTS, priceSnapshots);
  }

  function detectBartEvent() {
    if (priceSnapshots.length < 10) return null;

    const now = Date.now();
    const recentSnapshots = priceSnapshots.filter(s => s.time > now - CONFIG.BART_REVERSAL_WINDOW);

    if (recentSnapshots.length < 5) return null;

    // Find max and min prices in the window
    let maxPrice = -Infinity, minPrice = Infinity;
    let maxTime = 0, minTime = 0;

    recentSnapshots.forEach(s => {
      if (s.price > maxPrice) { maxPrice = s.price; maxTime = s.time; }
      if (s.price < minPrice) { minPrice = s.price; minTime = s.time; }
    });

    const currentPrice = recentSnapshots[recentSnapshots.length - 1].price;
    const startPrice = recentSnapshots[0].price;
    const priceRange = ((maxPrice - minPrice) / startPrice) * 100;

    // BART pattern: Big spike followed by return to origin
    // Check if we had a significant move and returned close to start
    if (priceRange >= CONFIG.BART_THRESHOLD) {
      const returnToOrigin = Math.abs((currentPrice - startPrice) / startPrice) * 100;

      // If price returned within 0.5% of starting price after a 2%+ range
      if (returnToOrigin < 0.5 && priceRange >= CONFIG.BART_THRESHOLD) {
        // Determine if it was up-BART or down-BART
        const isUpBart = maxTime < minTime; // Spike up first, then down

        return {
          type: isUpBart ? 'up' : 'down',
          startPrice: startPrice,
          peakPrice: isUpBart ? maxPrice : minPrice,
          endPrice: currentPrice,
          magnitude: priceRange,
          timestamp: now,
          riskScoreAtTime: currentRiskScore,
          duration: now - recentSnapshots[0].time
        };
      }
    }

    return null;
  }

  function logBartEvent(bartEvent) {
    const history = getStoredData(STORAGE_KEYS.BART_HISTORY);

    // Check if we already logged a similar event recently (within 30 min)
    const recentDuplicate = history.find(h =>
      Math.abs(h.timestamp - bartEvent.timestamp) < 1800000
    );

    if (recentDuplicate) return;

    history.unshift(bartEvent);

    // Keep only last N events
    if (history.length > CONFIG.HISTORY_MAX_ITEMS) {
      history.length = CONFIG.HISTORY_MAX_ITEMS;
    }

    setStoredData(STORAGE_KEYS.BART_HISTORY, history);

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('bartDetected', { detail: bartEvent }));

    console.log('BART DETECTED:', bartEvent);
  }

  function logRiskScore(score, factors) {
    const history = getStoredData(STORAGE_KEYS.RISK_HISTORY);

    history.push({
      timestamp: Date.now(),
      score: score,
      factors: factors
    });

    // Keep only last 24 hours (2880 entries at 30s intervals)
    const cutoff = Date.now() - 86400000;
    const filtered = history.filter(h => h.timestamp > cutoff);

    setStoredData(STORAGE_KEYS.RISK_HISTORY, filtered);
  }

  // =====================================================
  // RISK FACTOR CALCULATIONS
  // =====================================================

  function getTimeRisk() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcDay = now.getUTCDay();

    let risk = 0;
    let reason = '';

    if (utcDay === 0 || utcDay === 6) {
      risk += 15;
      reason = 'Weekend - thin liquidity';
    }

    if (utcHour >= 0 && utcHour <= 6) {
      risk += 5;
      reason = reason ? reason + ', off-peak hours' : 'Off-peak trading hours';
    }

    if (utcDay === 0 && utcHour >= 18) {
      risk += 5;
      reason = 'Sunday close - CME gap risk';
    }

    return {
      score: Math.min(risk, WEIGHTS.timeOfWeek),
      maxScore: WEIGHTS.timeOfWeek,
      reason: reason || 'Normal trading hours',
      isWarning: risk >= 10
    };
  }

  function getFundingRisk(fundingRate) {
    if (fundingRate === null) {
      return { score: 0, maxScore: WEIGHTS.fundingExtreme, reason: 'Loading...', isWarning: false };
    }

    const absRate = Math.abs(fundingRate);
    let risk = 0;
    let reason = '';

    if (absRate >= 0.05) {
      risk = WEIGHTS.fundingExtreme;
      reason = fundingRate > 0 ? 'Extreme long leverage - squeeze risk' : 'Extreme short leverage - squeeze risk';
    } else if (absRate >= 0.03) {
      risk = 18;
      reason = fundingRate > 0 ? 'High long leverage' : 'High short leverage';
    } else if (absRate >= 0.015) {
      risk = 10;
      reason = fundingRate > 0 ? 'Elevated long positions' : 'Elevated short positions';
    } else {
      risk = 0;
      reason = 'Balanced leverage';
    }

    return {
      score: risk,
      maxScore: WEIGHTS.fundingExtreme,
      reason: reason,
      isWarning: risk >= 15,
      value: (fundingRate * 100).toFixed(4) + '%'
    };
  }

  function getVolatilityRisk(recentVolatility, avgVolatility) {
    if (recentVolatility === null || avgVolatility === null) {
      return { score: 0, maxScore: WEIGHTS.volatilityCompression, reason: 'Loading...', isWarning: false };
    }

    const volRatio = recentVolatility / avgVolatility;
    let risk = 0;
    let reason = '';

    if (volRatio < 0.3) {
      risk = WEIGHTS.volatilityCompression;
      reason = 'Extreme volatility compression';
    } else if (volRatio < 0.5) {
      risk = 15;
      reason = 'Low volatility - breakout pending';
    } else if (volRatio < 0.7) {
      risk = 8;
      reason = 'Below average volatility';
    } else {
      risk = 0;
      reason = 'Normal volatility';
    }

    return {
      score: risk,
      maxScore: WEIGHTS.volatilityCompression,
      reason: reason,
      isWarning: risk >= 12
    };
  }

  function getOIVolumeRisk(openInterest, volume24h, price) {
    if (openInterest === null || volume24h === null || price === null) {
      return { score: 0, maxScore: WEIGHTS.oiVolumeRatio, reason: 'Loading...', isWarning: false };
    }

    const oiUsd = openInterest * price;
    const ratio = oiUsd / volume24h;

    let risk = 0;
    let reason = '';

    if (ratio > 8) {
      risk = WEIGHTS.oiVolumeRatio;
      reason = 'Very high OI vs volume - liquidation cascade risk';
    } else if (ratio > 5) {
      risk = 15;
      reason = 'High open interest relative to volume';
    } else if (ratio > 3) {
      risk = 8;
      reason = 'Moderate position buildup';
    } else {
      risk = 0;
      reason = 'Healthy OI/Volume ratio';
    }

    return {
      score: risk,
      maxScore: WEIGHTS.oiVolumeRatio,
      reason: reason,
      isWarning: risk >= 12
    };
  }

  function getPriceStagnationRisk(high24h, low24h, currentPrice) {
    if (high24h === null || low24h === null) {
      return { score: 0, maxScore: WEIGHTS.priceStagnation, reason: 'Loading...', isWarning: false };
    }

    const range = ((high24h - low24h) / currentPrice) * 100;
    let risk = 0;
    let reason = '';

    if (range < 1.5) {
      risk = WEIGHTS.priceStagnation;
      reason = 'Extremely tight range - breakout imminent';
    } else if (range < 2.5) {
      risk = 10;
      reason = 'Tight consolidation';
    } else if (range < 4) {
      risk = 5;
      reason = 'Moderate range';
    } else {
      risk = 0;
      reason = 'Normal price action';
    }

    return {
      score: risk,
      maxScore: WEIGHTS.priceStagnation,
      reason: reason,
      isWarning: risk >= 10
    };
  }

  // =====================================================
  // DATA FETCHING (Using static snapshot + live price for BART detection)
  // =====================================================

  async function fetchMarketData() {
    try {
      // Load static snapshot on first run
      if (!marketData) {
        await loadMarketSnapshot();
      }

      // Use static data for most metrics
      if (marketData) {
        // Use OHLC data for volatility calculation
        const ohlc = marketData.ohlc && marketData.ohlc.days7 ? marketData.ohlc.days7 : [];
        const recentKlines = ohlc.slice(-24);
        const allKlines = ohlc;

        const recentVol = calculateVolatility(recentKlines);
        const avgVol = calculateVolatility(allKlines);

        // Use static data for funding, OI, etc.
        cachedData.fundingRate = marketData.funding ? marketData.funding.rate : null;
        cachedData.openInterest = marketData.openInterest ? marketData.openInterest.btc : null;
        cachedData.recentVolatility = recentVol;
        cachedData.avgVolatility = avgVol;
        cachedData.volume24h = marketData.btc ? marketData.btc.volume24h : null;
        cachedData.high24h = marketData.btc ? marketData.btc.high24h : null;
        cachedData.low24h = marketData.btc ? marketData.btc.low24h : null;
      }

      // Fetch ONLY live price for real-time BART detection
      try {
        const priceRes = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
        const priceData = await priceRes.json();
        if (priceData && priceData.data && priceData.data.amount) {
          cachedData.price = parseFloat(priceData.data.amount);
          // Add price snapshot for BART detection
          addPriceSnapshot(cachedData.price);
        }
      } catch (priceErr) {
        console.error('BART: Failed to fetch live price:', priceErr);
        // Fallback to static price
        if (marketData && marketData.btc) {
          cachedData.price = marketData.btc.price;
        }
      }

      calculateRiskScore();

      // Check for BART events
      const bartEvent = detectBartEvent();
      if (bartEvent) {
        logBartEvent(bartEvent);
      }

    } catch (e) {
      console.error('BART detector fetch error:', e);
      if (elements.riskStatus) {
        elements.riskStatus.textContent = 'Data unavailable';
      }
    }
  }

  function calculateVolatility(klines) {
    if (klines.length < 2) return null;

    const returns = [];
    for (let i = 1; i < klines.length; i++) {
      const prevClose = parseFloat(klines[i][4]);
      const currClose = parseFloat(klines[i][4]);
      if (i > 0 && klines[i-1]) {
        const prev = parseFloat(klines[i-1][4]);
        returns.push((currClose - prev) / prev);
      }
    }

    if (returns.length === 0) return 0.5; // default volatility

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100;
  }

  // =====================================================
  // RISK SCORE CALCULATION & DISPLAY
  // =====================================================

  function calculateRiskScore() {
    const timeRisk = getTimeRisk();
    const fundingRisk = getFundingRisk(cachedData.fundingRate);
    const volRisk = getVolatilityRisk(cachedData.recentVolatility, cachedData.avgVolatility);
    const oiRisk = getOIVolumeRisk(cachedData.openInterest, cachedData.volume24h, cachedData.price);
    const stagnationRisk = getPriceStagnationRisk(cachedData.high24h, cachedData.low24h, cachedData.price);

    const totalScore = timeRisk.score + fundingRisk.score + volRisk.score + oiRisk.score + stagnationRisk.score;
    const maxPossible = 100;
    const percentage = Math.round((totalScore / maxPossible) * 100);

    currentRiskScore = percentage;

    // Log risk score for historical tracking
    const factors = {
      time: timeRisk.score,
      funding: fundingRisk.score,
      volatility: volRisk.score,
      oiVolume: oiRisk.score,
      stagnation: stagnationRisk.score
    };
    logRiskScore(percentage, factors);

    // Update display if elements exist (homepage widget)
    if (!elements.riskScore) return;

    elements.riskScore.textContent = percentage;

    let level, levelClass;
    if (percentage >= 70) {
      level = 'EXTREME';
      levelClass = 'extreme';
    } else if (percentage >= 50) {
      level = 'HIGH';
      levelClass = 'high';
    } else if (percentage >= 30) {
      level = 'MODERATE';
      levelClass = 'moderate';
    } else {
      level = 'LOW';
      levelClass = 'low';
    }

    elements.riskLevel.textContent = level;
    elements.riskLevel.className = 'bart-risk-level ' + levelClass;
    elements.riskScore.className = 'bart-risk-score ' + levelClass;

    elements.riskBar.style.width = percentage + '%';
    elements.riskBar.className = 'bart-risk-bar-fill ' + levelClass;

    const factorsArray = [
      { name: 'Market Hours', ...timeRisk, icon: '🕐' },
      { name: 'Funding Rate', ...fundingRisk, icon: '💰' },
      { name: 'Volatility', ...volRisk, icon: '📊' },
      { name: 'OI/Volume', ...oiRisk, icon: '📈' },
      { name: 'Price Range', ...stagnationRisk, icon: '🎯' }
    ];

    factorsArray.sort((a, b) => b.score - a.score);

    let factorsHtml = '';
    factorsArray.forEach(f => {
      const warningClass = f.isWarning ? 'warning' : '';
      factorsHtml += `
        <div class="bart-factor ${warningClass}">
          <span class="bart-factor-icon">${f.icon}</span>
          <span class="bart-factor-name">${f.name}</span>
          <span class="bart-factor-reason">${f.reason}</span>
          <span class="bart-factor-score">${f.score}/${f.maxScore}</span>
        </div>
      `;
    });
    elements.riskFactors.innerHTML = factorsHtml;

    let statusMsg;
    if (percentage >= 70) {
      statusMsg = '⚠️ High manipulation risk - exercise caution';
    } else if (percentage >= 50) {
      statusMsg = '🔶 Elevated risk - watch for sudden moves';
    } else if (percentage >= 30) {
      statusMsg = '🔵 Moderate conditions - stay alert';
    } else {
      statusMsg = '✅ Normal market conditions';
    }
    elements.riskStatus.textContent = statusMsg;
  }

  // =====================================================
  // PUBLIC API (for dashboard and other components)
  // =====================================================

  window.BartDetector = {
    getBartHistory: function() {
      return getStoredData(STORAGE_KEYS.BART_HISTORY);
    },
    getRiskHistory: function() {
      return getStoredData(STORAGE_KEYS.RISK_HISTORY);
    },
    getCurrentRisk: function() {
      return currentRiskScore;
    },
    getCurrentData: function() {
      return { ...cachedData };
    },
    getConfig: function() {
      return { ...CONFIG };
    },
    clearHistory: function() {
      setStoredData(STORAGE_KEYS.BART_HISTORY, []);
      setStoredData(STORAGE_KEYS.RISK_HISTORY, []);
      setStoredData(STORAGE_KEYS.PRICE_SNAPSHOTS, []);
    }
  };

  // =====================================================
  // INITIALIZATION
  // =====================================================

  function init() {
    // Load persisted price snapshots
    priceSnapshots = getStoredData(STORAGE_KEYS.PRICE_SNAPSHOTS, []);

    // Clean old snapshots
    const cutoff = Date.now() - CONFIG.BART_REVERSAL_WINDOW;
    priceSnapshots = priceSnapshots.filter(s => s.time > cutoff);

    fetchMarketData();
    setInterval(fetchMarketData, CONFIG.UPDATE_INTERVAL);
  }

  init();
})();
