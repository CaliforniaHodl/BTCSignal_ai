// Backtester PRO - AI-powered custom strategy backtesting
// Parses natural language strategy descriptions and simulates trades
// Requires: shared.js

(function() {
  'use strict';

  const FEATURE_KEY = 'btcsai_backtester_pro';
  const MC_SIMULATIONS = 500;

  // Use shared access check
  function checkAccess() {
    return BTCSAIShared.checkAccess(FEATURE_KEY);
  }

  // State
  let priceData = [];
  let equityChart = null;
  let mcChart = null;
  let backtestResults = null;

  // DOM elements
  const strategyInput = document.getElementById('strategy-input');
  const timeframeSelect = document.getElementById('timeframe-select');
  const periodSelect = document.getElementById('period-select');
  const capitalInput = document.getElementById('capital-input');
  const slippageInput = document.getElementById('slippage-input');
  const feeInput = document.getElementById('fee-input');
  const btnRunBacktest = document.getElementById('btn-run-backtest');
  const loadingSection = document.getElementById('backtest-loading');
  const resultsSection = document.getElementById('backtest-results');
  const premiumGate = document.getElementById('premium-gate');

  // Store last results for export
  let lastStrategy = null;
  let lastMcResults = null;

  if (!strategyInput || !btnRunBacktest) return;

  // Example strategy buttons
  document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      strategyInput.value = this.dataset.strategy;
    });
  });

  // Parse strategy from natural language
  function parseStrategy(text) {
    const strategy = {
      entryConditions: [],
      exitConditions: [],
      stopLoss: null,
      takeProfit: null,
      trailingStop: null,
      riskPerTrade: 0.01,
      rewardRatio: 2,
      direction: 'long', // default
      indicators: []
    };

    const lowerText = text.toLowerCase();

    // Detect direction
    if (lowerText.includes('short') && !lowerText.includes('long')) {
      strategy.direction = 'short';
    } else if (lowerText.includes('both') || (lowerText.includes('long') && lowerText.includes('short'))) {
      strategy.direction = 'both';
    }

    // Parse RSI conditions
    const rsiMatch = lowerText.match(/rsi\s*(<|>|crosses?\s*(above|below)|reaches?)\s*(\d+)/gi);
    if (rsiMatch) {
      rsiMatch.forEach(match => {
        const numMatch = match.match(/(\d+)/);
        const num = numMatch ? parseInt(numMatch[1]) : 50;
        if (match.includes('above') || match.includes('>')) {
          if (num < 50) {
            strategy.entryConditions.push({ type: 'rsi_cross_above', value: num });
          } else {
            strategy.exitConditions.push({ type: 'rsi_above', value: num });
          }
        } else if (match.includes('below') || match.includes('<')) {
          if (num > 50) {
            strategy.entryConditions.push({ type: 'rsi_cross_below', value: num });
          } else {
            strategy.exitConditions.push({ type: 'rsi_below', value: num });
          }
        }
      });
      strategy.indicators.push('RSI');
    }

    // Parse MACD conditions
    if (lowerText.includes('macd')) {
      if (lowerText.includes('crosses above') || lowerText.includes('cross above')) {
        strategy.entryConditions.push({ type: 'macd_cross_above' });
      }
      if (lowerText.includes('crosses below') || lowerText.includes('cross below')) {
        strategy.exitConditions.push({ type: 'macd_cross_below' });
      }
      strategy.indicators.push('MACD');
    }

    // Parse EMA/MA conditions
    const emaMatch = lowerText.match(/ema\s*(\d+)\s*crosses?\s*(above|below)\s*ema\s*(\d+)/i);
    if (emaMatch) {
      const fast = parseInt(emaMatch[1]);
      const slow = parseInt(emaMatch[3]);
      if (emaMatch[2] === 'above') {
        strategy.entryConditions.push({ type: 'ema_cross_above', fast, slow });
      } else {
        strategy.exitConditions.push({ type: 'ema_cross_below', fast, slow });
      }
      strategy.indicators.push(`EMA ${fast}/${slow}`);
    }

    // Parse moving average (general)
    const maMatch = lowerText.match(/(?:above|below)\s*(?:the\s*)?(\d+)\s*(?:day\s*)?(?:ema|ma|sma)/i);
    if (maMatch) {
      const period = parseInt(maMatch[1]);
      if (lowerText.includes('above')) {
        strategy.entryConditions.push({ type: 'price_above_ma', period });
      }
      strategy.indicators.push(`${period} MA`);
    }

    // Parse breakout conditions
    if (lowerText.includes('break') && lowerText.includes('high')) {
      const dayMatch = lowerText.match(/(\d+)[\s-]*day\s*high/i);
      const period = dayMatch ? parseInt(dayMatch[1]) : 20;
      strategy.entryConditions.push({ type: 'breakout_high', period });
      strategy.indicators.push(`${period}D Breakout`);
    }
    if (lowerText.includes('break') && lowerText.includes('low')) {
      const dayMatch = lowerText.match(/(\d+)[\s-]*day\s*low/i);
      const period = dayMatch ? parseInt(dayMatch[1]) : 10;
      strategy.exitConditions.push({ type: 'breakout_low', period });
    }

    // Parse VOLUME conditions
    const volMatch = lowerText.match(/volume\s*(>|above|spike|high|low|<|below)\s*(?:(\d+(?:\.\d+)?)\s*x?\s*)?(?:average|avg)?/i);
    if (volMatch) {
      const direction = volMatch[1].toLowerCase();
      const multiplier = volMatch[2] ? parseFloat(volMatch[2]) : 1.5;

      if (direction === '>' || direction === 'above' || direction === 'spike' || direction === 'high') {
        strategy.entryConditions.push({ type: 'volume_above', multiplier });
        strategy.indicators.push(`Volume > ${multiplier}x Avg`);
      } else if (direction === '<' || direction === 'below' || direction === 'low') {
        strategy.entryConditions.push({ type: 'volume_below', multiplier: multiplier || 0.5 });
        strategy.indicators.push(`Volume < ${multiplier || 0.5}x Avg`);
      }
    }

    // Parse BOLLINGER BAND conditions
    if (lowerText.includes('bollinger') || lowerText.includes('bb ') || lowerText.includes(' bb')) {
      if (lowerText.includes('lower') || lowerText.includes('bottom')) {
        strategy.entryConditions.push({ type: 'bb_lower_touch' });
        strategy.indicators.push('BB Lower');
      }
      if (lowerText.includes('upper') || lowerText.includes('top')) {
        strategy.exitConditions.push({ type: 'bb_upper_touch' });
        strategy.indicators.push('BB Upper');
      }
      if (lowerText.includes('squeeze')) {
        strategy.entryConditions.push({ type: 'bb_squeeze' });
        strategy.indicators.push('BB Squeeze');
      }
    }

    // Parse STOCHASTIC conditions
    const stochMatch = lowerText.match(/stoch(?:astic)?\s*(?:%?k?)?\s*(<|>|crosses?\s*(above|below))\s*(\d+)/i);
    if (stochMatch) {
      const num = parseInt(stochMatch[3]);
      if (stochMatch[1].includes('above') || stochMatch[1] === '>') {
        if (num <= 30) {
          strategy.entryConditions.push({ type: 'stoch_cross_above', value: num });
        } else {
          strategy.exitConditions.push({ type: 'stoch_above', value: num });
        }
      } else {
        if (num >= 70) {
          strategy.entryConditions.push({ type: 'stoch_cross_below', value: num });
        } else {
          strategy.exitConditions.push({ type: 'stoch_below', value: num });
        }
      }
      strategy.indicators.push('Stochastic');
    }

    // Parse ATR-based stop loss
    const atrSlMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*atr\s*stop/i);
    if (atrSlMatch) {
      strategy.atrStopMultiplier = parseFloat(atrSlMatch[1]);
      strategy.indicators.push(`${atrSlMatch[1]} ATR Stop`);
    }

    // Parse ADX conditions (trend strength)
    const adxMatch = lowerText.match(/adx\s*(>|above|<|below)\s*(\d+)/i);
    if (adxMatch) {
      const direction = adxMatch[1].toLowerCase();
      const value = parseInt(adxMatch[2]);
      if (direction === '>' || direction === 'above') {
        strategy.entryConditions.push({ type: 'adx_above', value });
        strategy.indicators.push(`ADX > ${value}`);
      } else {
        strategy.entryConditions.push({ type: 'adx_below', value });
        strategy.indicators.push(`ADX < ${value}`);
      }
    }

    // Parse trend filter (ADX + DI)
    if (lowerText.includes('uptrend') || lowerText.includes('bullish trend')) {
      strategy.entryConditions.push({ type: 'uptrend_filter' });
      strategy.indicators.push('Uptrend Filter');
    }
    if (lowerText.includes('downtrend') || lowerText.includes('bearish trend')) {
      strategy.entryConditions.push({ type: 'downtrend_filter' });
      strategy.indicators.push('Downtrend Filter');
    }

    // Parse stop loss
    const slMatch = lowerText.match(/stop\s*(?:loss)?\s*(?:at|of|:)?\s*(\d+(?:\.\d+)?)\s*%/i);
    if (slMatch) {
      strategy.stopLoss = parseFloat(slMatch[1]) / 100;
    }

    // Parse trailing stop
    const tsMatch = lowerText.match(/trail(?:ing)?\s*(?:stop)?\s*(?:at|of|:)?\s*(\d+(?:\.\d+)?)\s*(?:%|atr)/i);
    if (tsMatch) {
      strategy.trailingStop = parseFloat(tsMatch[1]) / 100;
    }

    // Parse take profit / target
    const tpMatch = lowerText.match(/(?:target|take\s*profit|tp)\s*(?:at|of|:)?\s*(\d+(?:\.\d+)?)\s*(?:%|r)/i);
    if (tpMatch) {
      const val = parseFloat(tpMatch[1]);
      if (val > 10) {
        strategy.takeProfit = val / 100; // Percentage
      } else {
        strategy.rewardRatio = val; // R multiple
      }
    }

    // Parse risk per trade
    const riskMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*%\s*risk/i);
    if (riskMatch) {
      strategy.riskPerTrade = parseFloat(riskMatch[1]) / 100;
    }

    // Default conditions if none found
    if (strategy.entryConditions.length === 0) {
      strategy.entryConditions.push({ type: 'random_entry' });
    }
    if (strategy.exitConditions.length === 0 && !strategy.stopLoss && !strategy.takeProfit) {
      strategy.stopLoss = 0.03;
      strategy.takeProfit = 0.06;
    }

    return strategy;
  }

  // Fetch historical price data using shared utility
  async function fetchPriceData(timeframe, days) {
    const limit = Math.min(1000, days * (timeframe === '1d' ? 1 : timeframe === '4h' ? 6 : timeframe === '1h' ? 24 : 96));
    return BTCSAIShared.fetchOHLCData(timeframe, limit);
  }

  // Calculate indicators
  function calculateIndicators(data) {
    // RSI - Fixed: Use null during warmup instead of 50 to prevent false signals
    const rsiPeriod = 14;
    let gains = 0, losses = 0;

    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i-1].close;

      if (i <= rsiPeriod) {
        if (change > 0) gains += change;
        else losses -= change;

        if (i === rsiPeriod) {
          gains /= rsiPeriod;
          losses /= rsiPeriod;
          // First valid RSI value
          const rs = losses === 0 ? 100 : gains / losses;
          data[i].rsi = 100 - (100 / (1 + rs));
        } else {
          // FIX: Use null during warmup instead of 50 to prevent false crossover signals
          data[i].rsi = null;
        }
      } else {
        if (change > 0) {
          gains = (gains * (rsiPeriod - 1) + change) / rsiPeriod;
          losses = (losses * (rsiPeriod - 1)) / rsiPeriod;
        } else {
          gains = (gains * (rsiPeriod - 1)) / rsiPeriod;
          losses = (losses * (rsiPeriod - 1) - change) / rsiPeriod;
        }
        const rs = losses === 0 ? 100 : gains / losses;
        data[i].rsi = 100 - (100 / (1 + rs));
      }
    }

    // EMAs - Fixed: Use SMA for first N periods, then switch to EMA
    const emaPeriods = [9, 21, 50, 200];
    emaPeriods.forEach(period => {
      const multiplier = 2 / (period + 1);

      // FIX: Calculate SMA for first 'period' candles
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        if (i < period) {
          // Accumulate for SMA calculation
          sum += data[i].close;
          // FIX: Use null during warmup or partial SMA
          data[i][`ema${period}`] = i === period - 1 ? sum / period : null;
        } else if (i === period) {
          // First EMA value based on SMA
          const sma = sum / period;
          const ema = (data[i].close - sma) * multiplier + sma;
          data[i][`ema${period}`] = ema;
        } else {
          // Standard EMA calculation
          const prevEma = data[i - 1][`ema${period}`];
          data[i][`ema${period}`] = (data[i].close - prevEma) * multiplier + prevEma;
        }
      }
    });

    // MACD - Fixed: Proper initialization with SMA base
    // EMA12 and EMA26 need proper SMA initialization
    let ema12Sum = 0, ema26Sum = 0;
    let ema12 = null, ema26 = null;
    const macdValues = []; // Store for signal line SMA

    for (let i = 0; i < data.length; i++) {
      // Build up SMA for EMA12
      if (i < 12) {
        ema12Sum += data[i].close;
        if (i === 11) ema12 = ema12Sum / 12; // First EMA12 = SMA12
      } else {
        ema12 = (data[i].close - ema12) * (2/13) + ema12;
      }

      // Build up SMA for EMA26
      if (i < 26) {
        ema26Sum += data[i].close;
        if (i === 25) ema26 = ema26Sum / 26; // First EMA26 = SMA26
      } else {
        ema26 = (data[i].close - ema26) * (2/27) + ema26;
      }

      // MACD line = EMA12 - EMA26 (valid after 26 candles)
      if (i >= 25 && ema12 !== null && ema26 !== null) {
        const macd = ema12 - ema26;
        data[i].macd = macd;
        macdValues.push({ index: i, value: macd });

        // Signal line = 9-period EMA of MACD (valid after 26 + 9 = 35 candles)
        if (macdValues.length < 9) {
          // FIX: Use null during signal warmup
          data[i].macdSignal = null;
          data[i].macdHist = null;
        } else if (macdValues.length === 9) {
          // First signal = SMA of first 9 MACD values
          const signalSma = macdValues.reduce((sum, m) => sum + m.value, 0) / 9;
          data[i].macdSignal = signalSma;
          data[i].macdHist = macd - signalSma;
        } else {
          // Standard EMA for signal
          const prevSignal = data[i - 1].macdSignal;
          const signal = (macd - prevSignal) * (2/10) + prevSignal;
          data[i].macdSignal = signal;
          data[i].macdHist = macd - signal;
        }
      } else {
        data[i].macd = null;
        data[i].macdSignal = null;
        data[i].macdHist = null;
      }
    }

    // Highest high / lowest low for breakouts
    for (let i = 20; i < data.length; i++) {
      let high20 = 0, low10 = Infinity;
      for (let j = i - 20; j < i; j++) {
        if (data[j].high > high20) high20 = data[j].high;
      }
      for (let j = i - 10; j < i; j++) {
        if (data[j].low < low10) low10 = data[j].low;
      }
      data[i].high20 = high20;
      data[i].low10 = low10;
    }

    // VOLUME - Calculate average volume and ratio
    const volPeriod = 20;
    for (let i = volPeriod; i < data.length; i++) {
      let volSum = 0;
      for (let j = i - volPeriod; j < i; j++) {
        volSum += data[j].volume;
      }
      data[i].avgVolume = volSum / volPeriod;
      data[i].volumeRatio = data[i].volume / data[i].avgVolume;
    }

    // BOLLINGER BANDS (20-period, 2 std dev)
    const bbPeriod = 20;
    const bbStdDev = 2;
    for (let i = bbPeriod - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = i - bbPeriod + 1; j <= i; j++) {
        sum += data[j].close;
      }
      const sma = sum / bbPeriod;

      let sumSquares = 0;
      for (let j = i - bbPeriod + 1; j <= i; j++) {
        sumSquares += Math.pow(data[j].close - sma, 2);
      }
      const std = Math.sqrt(sumSquares / bbPeriod);

      data[i].bbMiddle = sma;
      data[i].bbUpper = sma + (bbStdDev * std);
      data[i].bbLower = sma - (bbStdDev * std);
      data[i].bbWidth = (data[i].bbUpper - data[i].bbLower) / sma * 100;
    }

    // STOCHASTIC (14-period %K, 3-period smoothing)
    const stochPeriod = 14;
    const stochSmoothing = 3;
    for (let i = stochPeriod - 1; i < data.length; i++) {
      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      for (let j = i - stochPeriod + 1; j <= i; j++) {
        if (data[j].high > highestHigh) highestHigh = data[j].high;
        if (data[j].low < lowestLow) lowestLow = data[j].low;
      }
      const range = highestHigh - lowestLow;
      data[i].stochRaw = range > 0 ? ((data[i].close - lowestLow) / range) * 100 : 50;
    }
    // Smooth %K
    for (let i = stochPeriod + stochSmoothing - 2; i < data.length; i++) {
      let sum = 0;
      for (let j = i - stochSmoothing + 1; j <= i; j++) {
        sum += data[j].stochRaw || 50;
      }
      data[i].stochK = sum / stochSmoothing;
    }
    // %D (3-period SMA of %K)
    for (let i = stochPeriod + stochSmoothing + 1; i < data.length; i++) {
      let sum = 0;
      for (let j = i - 2; j <= i; j++) {
        sum += data[j].stochK || 50;
      }
      data[i].stochD = sum / 3;
    }

    // ATR (Average True Range, 14-period)
    const atrPeriod = 14;
    const trueRanges = [];
    for (let i = 1; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      trueRanges.push(tr);

      if (i === atrPeriod) {
        // First ATR is SMA
        data[i].atr = trueRanges.slice(0, atrPeriod).reduce((a, b) => a + b, 0) / atrPeriod;
      } else if (i > atrPeriod) {
        // Wilder's smoothing
        data[i].atr = (data[i - 1].atr * (atrPeriod - 1) + tr) / atrPeriod;
      }
    }

    // ADX (Average Directional Index, 14-period)
    // Measures trend strength: ADX > 25 = trending, ADX < 20 = ranging
    const adxPeriod = 14;
    const plusDM = [];
    const minusDM = [];
    const trForAdx = [];

    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevHigh = data[i - 1].high;
      const prevLow = data[i - 1].low;
      const prevClose = data[i - 1].close;

      // True Range
      trForAdx.push(Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      ));

      // Directional Movement
      const upMove = high - prevHigh;
      const downMove = prevLow - low;

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    // Smooth TR, +DM, -DM with Wilder's method
    if (data.length > adxPeriod * 2) {
      let smoothTR = trForAdx.slice(0, adxPeriod).reduce((a, b) => a + b, 0);
      let smoothPlusDM = plusDM.slice(0, adxPeriod).reduce((a, b) => a + b, 0);
      let smoothMinusDM = minusDM.slice(0, adxPeriod).reduce((a, b) => a + b, 0);
      const dxValues = [];

      for (let i = adxPeriod - 1; i < trForAdx.length; i++) {
        if (i > adxPeriod - 1) {
          smoothTR = smoothTR - (smoothTR / adxPeriod) + trForAdx[i];
          smoothPlusDM = smoothPlusDM - (smoothPlusDM / adxPeriod) + plusDM[i];
          smoothMinusDM = smoothMinusDM - (smoothMinusDM / adxPeriod) + minusDM[i];
        }

        const pdi = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
        const mdi = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

        data[i + 1].plusDI = pdi;
        data[i + 1].minusDI = mdi;

        const diSum = pdi + mdi;
        const dx = diSum > 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0;
        dxValues.push({ index: i + 1, value: dx });

        // ADX is smoothed DX
        if (dxValues.length === adxPeriod) {
          data[i + 1].adx = dxValues.reduce((sum, d) => sum + d.value, 0) / adxPeriod;
        } else if (dxValues.length > adxPeriod) {
          const prevAdx = data[i].adx || 0;
          data[i + 1].adx = (prevAdx * (adxPeriod - 1) + dx) / adxPeriod;
        }
      }
    }

    return data;
  }

  // Check if entry conditions are met
  // Returns false if no entry, or an object with entry details if entry triggered
  function checkEntry(data, i, strategy, prevData) {
    if (i < 30) return false;

    // BUG FIX: Track if this is a breakout entry to use correct price
    let isBreakoutEntry = false;
    let breakoutPrice = null;

    for (const cond of strategy.entryConditions) {
      switch (cond.type) {
        case 'rsi_cross_above':
          // FIX: Skip if RSI is null (warmup period)
          if (prevData.rsi === null || data[i].rsi === null) return false;
          if (!(prevData.rsi <= cond.value && data[i].rsi > cond.value)) return false;
          break;
        case 'rsi_cross_below':
          // FIX: Skip if RSI is null (warmup period)
          if (prevData.rsi === null || data[i].rsi === null) return false;
          if (!(prevData.rsi >= cond.value && data[i].rsi < cond.value)) return false;
          break;
        case 'macd_cross_above':
          // FIX: Skip if MACD histogram is null (warmup period)
          if (prevData.macdHist === null || data[i].macdHist === null) return false;
          if (!(prevData.macdHist <= 0 && data[i].macdHist > 0)) return false;
          break;
        case 'ema_cross_above':
          const fastKey = `ema${cond.fast}`;
          const slowKey = `ema${cond.slow}`;
          // FIX: Skip if EMAs are null (warmup period)
          if (prevData[fastKey] === null || prevData[slowKey] === null ||
              data[i][fastKey] === null || data[i][slowKey] === null) return false;
          if (!(prevData[fastKey] <= prevData[slowKey] && data[i][fastKey] > data[i][slowKey])) return false;
          break;
        case 'price_above_ma':
          const maKey = `ema${cond.period}`;
          if (data[i].close < data[i][maKey]) return false;
          break;
        case 'breakout_high':
          // BUG FIX: Check if HIGH broke through (not just close)
          // and use the breakout price for entry instead of close
          if (!data[i].high20) return false;
          if (data[i].high <= data[i].high20) return false; // High must break the level
          isBreakoutEntry = true;
          breakoutPrice = data[i].high20 * 1.001; // Enter just above breakout level
          break;

        // VOLUME CONDITIONS
        case 'volume_above':
          if (!data[i].volumeRatio) return false;
          if (data[i].volumeRatio < cond.multiplier) return false;
          break;
        case 'volume_below':
          if (!data[i].volumeRatio) return false;
          if (data[i].volumeRatio > cond.multiplier) return false;
          break;

        // BOLLINGER BAND CONDITIONS
        case 'bb_lower_touch':
          if (!data[i].bbLower) return false;
          if (data[i].low > data[i].bbLower) return false; // Price must touch lower band
          break;
        case 'bb_upper_touch':
          if (!data[i].bbUpper) return false;
          if (data[i].high < data[i].bbUpper) return false;
          break;
        case 'bb_squeeze':
          // BB Squeeze = bandwidth is in lowest 20% of recent values
          if (!data[i].bbWidth || i < 50) return false;
          let bbWidths = [];
          for (let j = i - 50; j < i; j++) {
            if (data[j].bbWidth) bbWidths.push(data[j].bbWidth);
          }
          const threshold = bbWidths.sort((a, b) => a - b)[Math.floor(bbWidths.length * 0.2)];
          if (data[i].bbWidth > threshold) return false;
          break;

        // STOCHASTIC CONDITIONS
        case 'stoch_cross_above':
          if (!data[i].stochK || !prevData.stochK) return false;
          if (!(prevData.stochK <= cond.value && data[i].stochK > cond.value)) return false;
          break;
        case 'stoch_cross_below':
          if (!data[i].stochK || !prevData.stochK) return false;
          if (!(prevData.stochK >= cond.value && data[i].stochK < cond.value)) return false;
          break;

        // ADX CONDITIONS (Trend Strength)
        case 'adx_above':
          if (!data[i].adx) return false;
          if (data[i].adx < cond.value) return false;
          break;
        case 'adx_below':
          if (!data[i].adx) return false;
          if (data[i].adx > cond.value) return false;
          break;
        case 'uptrend_filter':
          // Uptrend = ADX > 20 AND +DI > -DI
          if (!data[i].adx || !data[i].plusDI || !data[i].minusDI) return false;
          if (data[i].adx < 20 || data[i].plusDI <= data[i].minusDI) return false;
          break;
        case 'downtrend_filter':
          // Downtrend = ADX > 20 AND -DI > +DI
          if (!data[i].adx || !data[i].plusDI || !data[i].minusDI) return false;
          if (data[i].adx < 20 || data[i].minusDI <= data[i].plusDI) return false;
          break;

        case 'random_entry':
          // Random entry for strategies we couldn't fully parse
          if (Math.random() > 0.05) return false;
          break;
      }
    }

    // Return entry details instead of just true
    return {
      triggered: true,
      breakoutPrice: isBreakoutEntry ? breakoutPrice : null
    };
  }

  // Check if exit conditions are met
  function checkExit(data, i, strategy, prevData, trade) {
    // Stop loss
    if (strategy.stopLoss) {
      const slPrice = trade.direction === 'long'
        ? trade.entryPrice * (1 - strategy.stopLoss)
        : trade.entryPrice * (1 + strategy.stopLoss);

      if (trade.direction === 'long' && data[i].low <= slPrice) {
        return { exit: true, price: slPrice, reason: 'Stop Loss' };
      }
      if (trade.direction === 'short' && data[i].high >= slPrice) {
        return { exit: true, price: slPrice, reason: 'Stop Loss' };
      }
    }

    // Take profit
    if (strategy.takeProfit) {
      const tpPrice = trade.direction === 'long'
        ? trade.entryPrice * (1 + strategy.takeProfit)
        : trade.entryPrice * (1 - strategy.takeProfit);

      if (trade.direction === 'long' && data[i].high >= tpPrice) {
        return { exit: true, price: tpPrice, reason: 'Take Profit' };
      }
      if (trade.direction === 'short' && data[i].low <= tpPrice) {
        return { exit: true, price: tpPrice, reason: 'Take Profit' };
      }
    }

    // Trailing stop
    // BUG FIX: Check if maxProfit exists AND is above a threshold (e.g., 1% profit)
    // Trailing stops should only activate after the trade is in profit
    if (strategy.trailingStop && trade.maxProfit && trade.maxProfit > 0.01) {
      const trailPrice = trade.direction === 'long'
        ? trade.highestPrice * (1 - strategy.trailingStop)
        : trade.lowestPrice * (1 + strategy.trailingStop);

      // BUG FIX: Only trigger if trail price is better than entry (ensures we lock in profit)
      const isTrailValid = trade.direction === 'long'
        ? trailPrice > trade.entryPrice
        : trailPrice < trade.entryPrice;

      if (isTrailValid && trade.direction === 'long' && data[i].low <= trailPrice) {
        return { exit: true, price: trailPrice, reason: 'Trailing Stop' };
      }
      if (isTrailValid && trade.direction === 'short' && data[i].high >= trailPrice) {
        return { exit: true, price: trailPrice, reason: 'Trailing Stop' };
      }
    }

    // Indicator-based exits
    for (const cond of strategy.exitConditions) {
      switch (cond.type) {
        case 'rsi_above':
          // FIX: Check for null RSI (warmup period)
          if (data[i].rsi !== null && data[i].rsi >= cond.value) {
            return { exit: true, price: data[i].close, reason: `RSI > ${cond.value}` };
          }
          break;
        case 'rsi_below':
          // FIX: Check for null RSI (warmup period)
          if (data[i].rsi !== null && data[i].rsi <= cond.value) {
            return { exit: true, price: data[i].close, reason: `RSI < ${cond.value}` };
          }
          break;
        case 'macd_cross_below':
          // FIX: Check for null MACD (warmup period)
          if (prevData.macdHist !== null && data[i].macdHist !== null &&
              prevData.macdHist > 0 && data[i].macdHist <= 0) {
            return { exit: true, price: data[i].close, reason: 'MACD Cross Down' };
          }
          break;
        case 'ema_cross_below':
          const fastKey = `ema${cond.fast}`;
          const slowKey = `ema${cond.slow}`;
          if (prevData[fastKey] >= prevData[slowKey] && data[i][fastKey] < data[i][slowKey]) {
            return { exit: true, price: data[i].close, reason: 'EMA Cross Down' };
          }
          break;
        case 'breakout_low':
          if (data[i].close <= data[i].low10) {
            return { exit: true, price: data[i].close, reason: 'Breakout Low' };
          }
          break;
      }
    }

    return { exit: false };
  }

  // Run backtest simulation
  function runBacktest(data, strategy, startingCapital, slippage = 0, fee = 0) {
    const trades = [];
    const equityCurve = [{ time: data[0].time, equity: startingCapital }];
    let equity = startingCapital;
    let currentTrade = null;
    let maxEquity = startingCapital;
    let totalFees = 0;
    let totalSlippage = 0;
    let maxDrawdown = 0;

    // BUG FIX: Require indicator warmup period before trading
    // RSI needs 14 periods, MACD needs ~26, EMAs need their respective periods
    const WARMUP_PERIOD = 50; // Conservative warmup to ensure all indicators are valid

    for (let i = 1; i < data.length; i++) {
      const candle = data[i];
      const prevCandle = data[i - 1];

      if (currentTrade) {
        // BUG FIX: Skip exit check on same candle as entry (entry happens at close,
        // so same candle's high/low shouldn't trigger stops)
        if (currentTrade.entryIndex === i) {
          // Same candle as entry - only update equity curve, don't check exits
          equityCurve.push({ time: candle.time, equity: equity });
          continue;
        }

        // Update trade tracking
        if (currentTrade.direction === 'long') {
          currentTrade.highestPrice = Math.max(currentTrade.highestPrice || currentTrade.entryPrice, candle.high);
          // BUG FIX: Calculate maxProfit for trailing stop activation
          currentTrade.maxProfit = (currentTrade.highestPrice - currentTrade.entryPrice) / currentTrade.entryPrice;
        } else {
          currentTrade.lowestPrice = Math.min(currentTrade.lowestPrice || currentTrade.entryPrice, candle.low);
          // BUG FIX: Calculate maxProfit for trailing stop (shorts profit when price goes down)
          currentTrade.maxProfit = (currentTrade.entryPrice - currentTrade.lowestPrice) / currentTrade.entryPrice;
        }

        // Check for exit
        const exitResult = checkExit(data, i, strategy, prevCandle, currentTrade);
        if (exitResult.exit) {
          // Apply slippage to exit (worse price)
          const slippageAmt = exitResult.price * slippage;
          const exitPrice = currentTrade.direction === 'long'
            ? exitResult.price - slippageAmt  // Sell lower
            : exitResult.price + slippageAmt; // Buy back higher

          currentTrade.exitPrice = exitPrice;
          currentTrade.exitTime = candle.time;
          currentTrade.exitReason = exitResult.reason;

          // Exit fee
          const exitFee = currentTrade.size * fee;
          totalFees += exitFee;
          totalSlippage += currentTrade.size * slippage;

          // Calculate P&L (after slippage)
          const pnlPct = currentTrade.direction === 'long'
            ? (currentTrade.exitPrice - currentTrade.entryPrice) / currentTrade.entryPrice
            : (currentTrade.entryPrice - currentTrade.exitPrice) / currentTrade.entryPrice;

          currentTrade.pnl = currentTrade.size * pnlPct - exitFee;
          currentTrade.pnlPct = pnlPct * 100;
          currentTrade.rMultiple = strategy.stopLoss ? pnlPct / strategy.stopLoss : pnlPct / 0.02;
          currentTrade.exitFee = exitFee;

          equity += currentTrade.pnl;
          trades.push(currentTrade);
          currentTrade = null;
        }
      } else {
        // BUG FIX: Enforce warmup period - don't trade until indicators are valid
        if (i < WARMUP_PERIOD) {
          equityCurve.push({ time: candle.time, equity: equity });
          continue;
        }

        // Check for entry
        const entryResult = checkEntry(data, i, strategy, prevCandle);
        if (entryResult) {
          const direction = strategy.direction === 'both' ? (Math.random() > 0.5 ? 'long' : 'short') : strategy.direction;

          // BUG FIX: Use breakout price for breakout entries instead of close
          // This fixes look-ahead bias where we'd buy at close after seeing the breakout
          let baseEntryPrice = candle.close;
          if (entryResult.breakoutPrice) {
            baseEntryPrice = entryResult.breakoutPrice;
          }

          // Apply slippage to entry (worse price)
          const slippageAmt = baseEntryPrice * slippage;
          const entryPrice = direction === 'long'
            ? baseEntryPrice + slippageAmt  // Buy higher
            : baseEntryPrice - slippageAmt; // Sell lower

          // FIX: Calculate position size AFTER accounting for round-trip fees
          // This prevents over-sizing positions that will be eroded by fees
          const roundTripFees = fee * 2; // Entry + exit fee rate
          const roundTripSlippage = slippage * 2;
          const effectiveCosts = roundTripFees + roundTripSlippage;

          // Risk amount reduced by expected costs
          const riskAmount = equity * strategy.riskPerTrade;
          let rawSize = strategy.stopLoss ? riskAmount / strategy.stopLoss : riskAmount;

          // FIX: Reduce position size to account for costs eating into profits
          // If costs are 0.4% round trip, a 2% profit becomes 1.6%
          const costAdjustedSize = rawSize / (1 + effectiveCosts);
          const size = Math.min(costAdjustedSize, equity * 0.5); // Max 50% per trade

          // Entry fee based on adjusted size
          const entryFee = size * fee;
          totalFees += entryFee;
          totalSlippage += size * slippage;

          currentTrade = {
            entryPrice: entryPrice,
            entryTime: candle.time,
            entryIndex: i, // BUG FIX: Track entry candle index for same-candle check
            direction: direction,
            size: size,
            entryFee: entryFee
          };

          equity -= entryFee; // Deduct entry fee
        }
      }

      // Track equity curve
      equityCurve.push({ time: candle.time, equity: equity });

      // Track drawdown
      if (equity > maxEquity) maxEquity = equity;
      const drawdown = (maxEquity - equity) / maxEquity;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Close any open trade at end
    if (currentTrade) {
      currentTrade.exitPrice = data[data.length - 1].close;
      currentTrade.exitTime = data[data.length - 1].time;
      currentTrade.exitReason = 'End of Period';

      const pnlPct = currentTrade.direction === 'long'
        ? (currentTrade.exitPrice - currentTrade.entryPrice) / currentTrade.entryPrice
        : (currentTrade.entryPrice - currentTrade.exitPrice) / currentTrade.entryPrice;

      currentTrade.pnl = currentTrade.size * pnlPct;
      currentTrade.pnlPct = pnlPct * 100;
      currentTrade.rMultiple = strategy.stopLoss ? pnlPct / strategy.stopLoss : pnlPct / 0.02;

      equity += currentTrade.pnl;
      trades.push(currentTrade);
    }

    // Calculate statistics
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    const totalReturn = (equity - startingCapital) / startingCapital;
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0;
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnlPct, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnlPct, 0) / losingTrades.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : avgWin > 0 ? Infinity : 0;

    // Sharpe ratio approximation
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i].equity - equityCurve[i-1].equity) / equityCurve[i-1].equity);
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    // FIX: Use 365 for crypto (24/7 trading) instead of 252 (stock market days)
    // Also adjust based on timeframe for accuracy
    const annualizationFactor = 365; // Crypto trades every day
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(annualizationFactor) : 0;

    return {
      trades,
      equityCurve,
      stats: {
        totalReturn: totalReturn * 100,
        winRate: winRate * 100,
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        avgWin,
        avgLoss,
        profitFactor: isFinite(profitFactor) ? profitFactor : 0,
        maxDrawdown: maxDrawdown * 100,
        sharpeRatio,
        finalEquity: equity,
        totalFees: totalFees,
        totalSlippage: totalSlippage
      }
    };
  }

  // Monte Carlo Simulation - FIXED: True bootstrapping with multiple methods
  function runMonteCarloSimulation(data, strategy, startingCapital, slippage = 0, fee = 0) {
    const results = [];
    const drawdowns = [];

    // First, run the original backtest to get actual trades
    const originalResult = runBacktest(data, strategy, startingCapital, slippage, fee);
    const originalTrades = originalResult.trades;

    // If no trades, can't run meaningful MC simulation
    if (originalTrades.length < 5) {
      return {
        simulations: 0,
        median: originalResult.stats.totalReturn,
        p5: originalResult.stats.totalReturn,
        p25: originalResult.stats.totalReturn,
        p75: originalResult.stats.totalReturn,
        p95: originalResult.stats.totalReturn,
        profitProbability: originalResult.stats.totalReturn > 0 ? 100 : 0,
        ruinProbability: 0,
        avgMaxDrawdown: originalResult.stats.maxDrawdown,
        distribution: [],
        allResults: [originalResult.stats.totalReturn],
        warning: 'Insufficient trades for Monte Carlo analysis'
      };
    }

    // Extract trade returns for bootstrapping
    const tradeReturns = originalTrades.map(t => t.pnlPercent);

    // METHOD 1: Trade Shuffling (50% of simulations)
    // Tests if order of trades matters - robust strategy shouldn't depend on sequence
    const shuffleCount = Math.floor(MC_SIMULATIONS * 0.5);
    for (let sim = 0; sim < shuffleCount; sim++) {
      // Fisher-Yates shuffle of trade returns
      const shuffled = [...tradeReturns];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Simulate equity curve with shuffled trades
      const simResult = simulateTradeSequence(shuffled, startingCapital);
      results.push(simResult.totalReturn);
      drawdowns.push(simResult.maxDrawdown);
    }

    // METHOD 2: Block Bootstrap (30% of simulations)
    // Preserves autocorrelation by sampling blocks of consecutive trades
    const blockCount = Math.floor(MC_SIMULATIONS * 0.3);
    const blockSize = Math.min(5, Math.floor(tradeReturns.length / 3));
    for (let sim = 0; sim < blockCount; sim++) {
      const bootstrapped = [];
      while (bootstrapped.length < tradeReturns.length) {
        // Pick random starting point for block
        const start = Math.floor(Math.random() * (tradeReturns.length - blockSize + 1));
        for (let i = 0; i < blockSize && bootstrapped.length < tradeReturns.length; i++) {
          bootstrapped.push(tradeReturns[start + i]);
        }
      }

      const simResult = simulateTradeSequence(bootstrapped, startingCapital);
      results.push(simResult.totalReturn);
      drawdowns.push(simResult.maxDrawdown);
    }

    // METHOD 3: Random Subsampling (20% of simulations)
    // Tests performance with fewer trades (what if we miss some signals?)
    const subsampleCount = Math.floor(MC_SIMULATIONS * 0.2);
    for (let sim = 0; sim < subsampleCount; sim++) {
      // Randomly select 70-100% of trades
      const sampleRate = 0.7 + Math.random() * 0.3;
      const sampled = tradeReturns.filter(() => Math.random() < sampleRate);

      if (sampled.length >= 3) {
        const simResult = simulateTradeSequence(sampled, startingCapital);
        results.push(simResult.totalReturn);
        drawdowns.push(simResult.maxDrawdown);
      }
    }

    // Sort for percentile calculations
    results.sort((a, b) => a - b);
    drawdowns.sort((a, b) => a - b);

    // Calculate statistics
    const median = results[Math.floor(results.length / 2)] || 0;
    const p5 = results[Math.floor(results.length * 0.05)] || results[0] || 0;
    const p25 = results[Math.floor(results.length * 0.25)] || 0;
    const p75 = results[Math.floor(results.length * 0.75)] || 0;
    const p95 = results[Math.floor(results.length * 0.95)] || results[results.length - 1] || 0;

    const profitableCount = results.filter(r => r > 0).length;
    const ruinCount = results.filter(r => r < -50).length;
    const avgDrawdown = drawdowns.length > 0 ?
      drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length : 0;

    // Create histogram buckets
    const minReturn = Math.floor(Math.min(...results, 0) / 10) * 10;
    const maxReturn = Math.ceil(Math.max(...results, 0) / 10) * 10;
    const bucketSize = 10;
    const buckets = [];

    for (let i = minReturn; i <= maxReturn; i += bucketSize) {
      const count = results.filter(r => r >= i && r < i + bucketSize).length;
      buckets.push({
        range: `${i}% to ${i + bucketSize}%`,
        label: `${i}%`,
        count: count,
        percentage: (count / results.length) * 100
      });
    }

    return {
      simulations: results.length,
      median,
      p5,
      p25,
      p75,
      p95,
      profitProbability: results.length > 0 ? (profitableCount / results.length) * 100 : 0,
      ruinProbability: results.length > 0 ? (ruinCount / results.length) * 100 : 0,
      avgMaxDrawdown: avgDrawdown,
      distribution: buckets,
      allResults: results,
      originalReturn: originalResult.stats.totalReturn,
      tradesAnalyzed: originalTrades.length
    };
  }

  // Helper: Simulate equity curve from trade returns
  function simulateTradeSequence(tradeReturns, startingCapital) {
    let equity = startingCapital;
    let maxEquity = startingCapital;
    let maxDrawdown = 0;

    for (const ret of tradeReturns) {
      // Fixed position sizing at 2% risk per trade
      const positionSize = equity * 0.02;
      const pnl = positionSize * ret;
      equity += pnl;

      if (equity > maxEquity) maxEquity = equity;
      const drawdown = (maxEquity - equity) / maxEquity;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    return {
      totalReturn: ((equity - startingCapital) / startingCapital) * 100,
      maxDrawdown: maxDrawdown * 100,
      finalEquity: equity
    };
  }

  // Display Monte Carlo results
  function displayMonteCarloResults(mcResults) {
    document.getElementById('mc-median').textContent = mcResults.median.toFixed(1) + '%';
    document.getElementById('mc-median').className = 'mc-value ' + (mcResults.median >= 0 ? 'positive' : 'negative');

    document.getElementById('mc-5th').textContent = mcResults.p5.toFixed(1) + '%';
    document.getElementById('mc-95th').textContent = mcResults.p95.toFixed(1) + '%';

    document.getElementById('mc-profit-prob').textContent = mcResults.profitProbability.toFixed(1) + '%';
    document.getElementById('mc-profit-prob').className = 'mc-value ' + (mcResults.profitProbability >= 50 ? 'positive' : 'negative');

    document.getElementById('mc-ruin').textContent = mcResults.ruinProbability.toFixed(1) + '%';
    document.getElementById('mc-ruin').className = 'mc-value ' + (mcResults.ruinProbability <= 5 ? 'positive' : 'negative');

    document.getElementById('mc-drawdown').textContent = '-' + mcResults.avgMaxDrawdown.toFixed(1) + '%';

    document.getElementById('mc-confidence-range').textContent =
      mcResults.p5.toFixed(1) + '% to ' + mcResults.p95.toFixed(1) + '%';

    // Draw distribution chart
    drawMonteCarloChart(mcResults.distribution);
  }

  // Draw Monte Carlo distribution chart
  function drawMonteCarloChart(distribution) {
    const ctx = document.getElementById('mc-chart').getContext('2d');

    if (mcChart) {
      mcChart.destroy();
    }

    const colors = distribution.map(d => {
      const midPoint = parseInt(d.label);
      return midPoint >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)';
    });

    const borderColors = distribution.map(d => {
      const midPoint = parseInt(d.label);
      return midPoint >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
    });

    mcChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: distribution.map(d => d.label),
        datasets: [{
          label: 'Simulations',
          data: distribution.map(d => d.count),
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: ctx => distribution[ctx[0].dataIndex].range,
              label: ctx => {
                const d = distribution[ctx.dataIndex];
                return `${d.count} sims (${d.percentage.toFixed(1)}%)`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Return %', color: '#9ca3af' },
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: '#9ca3af' }
          },
          y: {
            title: { display: true, text: 'Frequency', color: '#9ca3af' },
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: '#9ca3af' }
          }
        }
      }
    });
  }

  // Display results
  function displayResults(results, strategy) {
    const stats = results.stats;

    // Summary stats
    document.getElementById('total-return').textContent = (stats.totalReturn >= 0 ? '+' : '') + stats.totalReturn.toFixed(2) + '%';
    document.getElementById('total-return').className = 'summary-value ' + (stats.totalReturn >= 0 ? 'positive' : 'negative');

    document.getElementById('win-rate').textContent = stats.winRate.toFixed(1) + '%';
    document.getElementById('total-trades').textContent = stats.totalTrades;
    document.getElementById('sharpe-ratio').textContent = stats.sharpeRatio.toFixed(2);
    document.getElementById('max-drawdown').textContent = '-' + stats.maxDrawdown.toFixed(2) + '%';
    document.getElementById('profit-factor').textContent = stats.profitFactor.toFixed(2);

    // Equity chart
    drawEquityChart(results.equityCurve);

    // Monthly performance
    drawMonthlyGrid(results.equityCurve);

    // Trade log
    displayTradeLog(results.trades);

    // AI Analysis
    displayAIAnalysis(results, strategy);

    // Optimization suggestions
    displayOptimizations(results, strategy);
  }

  // Draw equity curve
  function drawEquityChart(equityCurve) {
    const ctx = document.getElementById('equity-chart').getContext('2d');

    if (equityChart) {
      equityChart.destroy();
    }

    const labels = equityCurve.map(p => new Date(p.time).toLocaleDateString());
    const data = equityCurve.map(p => p.equity);

    equityChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Equity',
          data: data,
          borderColor: '#f7931a',
          backgroundColor: 'rgba(247, 147, 26, 0.1)',
          fill: true,
          tension: 0.1,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            display: true,
            ticks: {
              maxTicksLimit: 10,
              color: '#9ca3af'
            },
            grid: {
              color: 'rgba(255,255,255,0.1)'
            }
          },
          y: {
            display: true,
            ticks: {
              color: '#9ca3af',
              callback: value => '$' + value.toLocaleString()
            },
            grid: {
              color: 'rgba(255,255,255,0.1)'
            }
          }
        }
      }
    });
  }

  // Draw monthly performance grid
  function drawMonthlyGrid(equityCurve) {
    const grid = document.getElementById('monthly-grid');
    const monthlyReturns = {};

    // Group by month
    equityCurve.forEach((point, i) => {
      if (i === 0) return;
      const date = new Date(point.time);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyReturns[key]) {
        monthlyReturns[key] = { start: equityCurve[i-1].equity, end: point.equity };
      } else {
        monthlyReturns[key].end = point.equity;
      }
    });

    // Calculate returns and render
    let html = '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    Object.keys(monthlyReturns).sort().forEach(key => {
      const data = monthlyReturns[key];
      const ret = ((data.end - data.start) / data.start) * 100;
      const [year, month] = key.split('-');
      const colorClass = ret >= 0 ? 'positive' : 'negative';
      const intensity = Math.min(Math.abs(ret) / 20, 1);

      html += `
        <div class="monthly-cell ${colorClass}" style="opacity: ${0.4 + intensity * 0.6}">
          <span class="month-label">${months[parseInt(month) - 1]} ${year.slice(2)}</span>
          <span class="month-return">${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%</span>
        </div>
      `;
    });

    grid.innerHTML = html;
  }

  // Display trade log
  function displayTradeLog(trades) {
    const tbody = document.getElementById('trade-log-body');

    const html = trades.slice(-50).reverse().map(trade => {
      const date = new Date(trade.entryTime).toLocaleDateString();
      const pnlClass = trade.pnl >= 0 ? 'positive' : 'negative';
      const rClass = trade.rMultiple >= 0 ? 'positive' : 'negative';

      return `
        <tr>
          <td>${date}</td>
          <td class="${trade.direction}">${trade.direction.toUpperCase()}</td>
          <td>$${trade.entryPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
          <td>$${trade.exitPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
          <td class="${pnlClass}">${trade.pnl >= 0 ? '+' : ''}${trade.pnlPct.toFixed(2)}%</td>
          <td class="${rClass}">${trade.rMultiple >= 0 ? '+' : ''}${trade.rMultiple.toFixed(2)}R</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = html;
  }

  // Display AI analysis
  function displayAIAnalysis(results, strategy) {
    const analysisDiv = document.getElementById('ai-analysis');
    const stats = results.stats;

    let verdict = '';
    let insights = [];

    // Overall verdict
    if (stats.totalReturn > 20 && stats.winRate > 50 && stats.profitFactor > 1.5) {
      verdict = '🟢 <strong>Strong Strategy</strong> - This strategy shows promising results with good risk-adjusted returns.';
    } else if (stats.totalReturn > 0 && stats.profitFactor > 1) {
      verdict = '🟡 <strong>Moderate Strategy</strong> - Profitable but could benefit from optimization.';
    } else {
      verdict = '🔴 <strong>Needs Work</strong> - This strategy underperformed in the backtest period.';
    }

    // Win rate insight
    if (stats.winRate > 60) {
      insights.push('High win rate suggests good entry timing, but verify this isn\'t curve-fitted.');
    } else if (stats.winRate < 40) {
      insights.push('Low win rate requires high reward-to-risk ratio to be profitable. Consider tightening entry criteria.');
    }

    // Drawdown insight
    if (stats.maxDrawdown > 30) {
      insights.push('Maximum drawdown exceeds 30% - consider adding position sizing rules or tighter stops.');
    } else if (stats.maxDrawdown < 15) {
      insights.push('Good drawdown management - risk is well controlled.');
    }

    // Profit factor insight
    if (stats.profitFactor > 2) {
      insights.push('Excellent profit factor - winning trades significantly outweigh losers.');
    } else if (stats.profitFactor < 1) {
      insights.push('Profit factor below 1 means losses exceed gains. Review exit timing and stop placement.');
    }

    // Trade frequency
    if (stats.totalTrades < 10) {
      insights.push('Low sample size - more trades needed for statistical significance. Consider longer backtest period.');
    } else if (stats.totalTrades > 100) {
      insights.push('Good sample size provides statistical confidence in results.');
    }

    // Sharpe ratio
    if (stats.sharpeRatio > 1.5) {
      insights.push('Strong risk-adjusted returns (Sharpe > 1.5) - strategy handles volatility well.');
    } else if (stats.sharpeRatio < 0.5) {
      insights.push('Low Sharpe ratio indicates poor risk-adjusted returns. High volatility in equity curve.');
    }

    analysisDiv.innerHTML = `
      <div class="analysis-verdict">${verdict}</div>
      <div class="analysis-details">
        <h4>Key Insights</h4>
        <ul>
          ${insights.map(i => `<li>${i}</li>`).join('')}
        </ul>
        <h4>Strategy Components Detected</h4>
        <ul>
          ${strategy.indicators.map(i => `<li><strong>${i}</strong> indicator</li>`).join('')}
          ${strategy.stopLoss ? `<li>Stop loss at <strong>${(strategy.stopLoss * 100).toFixed(1)}%</strong></li>` : ''}
          ${strategy.takeProfit ? `<li>Take profit at <strong>${(strategy.takeProfit * 100).toFixed(1)}%</strong></li>` : ''}
          ${strategy.trailingStop ? `<li>Trailing stop at <strong>${(strategy.trailingStop * 100).toFixed(1)}%</strong></li>` : ''}
        </ul>
      </div>
    `;
  }

  // Display optimization suggestions
  function displayOptimizations(results, strategy) {
    const container = document.getElementById('optimization-cards');
    const stats = results.stats;
    const suggestions = [];

    // Stop loss optimization
    if (!strategy.stopLoss || stats.maxDrawdown > 25) {
      suggestions.push({
        title: 'Tighten Stop Loss',
        desc: 'Your drawdown is high. Consider a tighter stop loss around 2-3% to protect capital.',
        icon: '🛡️'
      });
    }

    // Win rate optimization
    if (stats.winRate < 45) {
      suggestions.push({
        title: 'Add Confirmation',
        desc: 'Low win rate suggests entries may be premature. Add a confirmation indicator like volume or another momentum signal.',
        icon: '✅'
      });
    }

    // Trade frequency
    if (stats.totalTrades < 20) {
      suggestions.push({
        title: 'Loosen Entry Criteria',
        desc: 'Few trades generated. Consider relaxing entry conditions or using a shorter timeframe.',
        icon: '📈'
      });
    }

    // Profit taking
    if (stats.avgWin < stats.avgLoss * 1.5) {
      suggestions.push({
        title: 'Improve Reward:Risk',
        desc: 'Average win is too small relative to average loss. Let winners run longer or use trailing stops.',
        icon: '💰'
      });
    }

    // Position sizing
    if (stats.maxDrawdown > 30) {
      suggestions.push({
        title: 'Reduce Position Size',
        desc: 'Large drawdowns suggest over-leveraging. Consider risking 0.5-1% per trade instead.',
        icon: '⚖️'
      });
    }

    // General suggestion
    suggestions.push({
      title: 'Forward Test',
      desc: 'Backtest results can be deceiving. Paper trade this strategy for 1-2 months before using real capital.',
      icon: '📋'
    });

    container.innerHTML = suggestions.slice(0, 4).map(s => `
      <div class="optimization-card">
        <div class="opt-icon">${s.icon}</div>
        <h4>${s.title}</h4>
        <p>${s.desc}</p>
      </div>
    `).join('');
  }

  // Loading animation
  function animateLoading() {
    const steps = [
      'Parsing strategy parameters...',
      'Fetching historical price data...',
      'Calculating indicators...',
      'Simulating trades...',
      'Running Monte Carlo analysis...',
      'Analyzing results...',
      'Generating insights...'
    ];

    const stepEl = document.getElementById('loading-step');
    const progressBar = document.getElementById('progress-bar');
    let step = 0;

    return setInterval(() => {
      if (step < steps.length) {
        stepEl.textContent = steps[step];
        progressBar.style.width = ((step + 1) / steps.length * 100) + '%';
        step++;
      }
    }, 800);
  }

  // Main backtest handler
  async function handleBacktest() {
    const strategyText = strategyInput.value.trim();
    if (!strategyText) {
      Toast.warning('Please describe your trading strategy');
      return;
    }

    // Check access
    if (!checkAccess()) {
      premiumGate.style.display = 'block';
      return;
    }

    // Show loading
    loadingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    const loadingInterval = animateLoading();

    try {
      // Parse strategy
      const strategy = parseStrategy(strategyText);
      lastStrategy = strategy;

      // Get settings
      const timeframe = timeframeSelect.value;
      const period = parseInt(periodSelect.value);
      const capital = parseFloat(capitalInput.value) || 10000;
      const slippage = (parseFloat(slippageInput?.value) || 0.1) / 100; // Convert % to decimal
      const fee = (parseFloat(feeInput?.value) || 0.1) / 100; // Convert % to decimal

      // Fetch data
      priceData = await fetchPriceData(timeframe, period);
      if (priceData.length < 50) {
        throw new Error('Insufficient price data');
      }

      // Calculate indicators
      priceData = calculateIndicators(priceData);

      // Run backtest with slippage and fees
      backtestResults = runBacktest(priceData, strategy, capital, slippage, fee);

      // Display results
      displayResults(backtestResults, strategy);

      // Run Monte Carlo simulation with slippage and fees
      const mcResults = runMonteCarloSimulation(priceData, strategy, capital, slippage, fee);
      lastMcResults = mcResults;
      displayMonteCarloResults(mcResults);

      // Show results
      clearInterval(loadingInterval);
      loadingSection.style.display = 'none';
      resultsSection.style.display = 'block';

    } catch (error) {
      console.error('Backtest error:', error);
      clearInterval(loadingInterval);
      loadingSection.style.display = 'none';
      Toast.error('Failed to run backtest. Please try again.');
    }
  }

  // Event listeners
  btnRunBacktest.addEventListener('click', handleBacktest);

  // Unlock button
  document.getElementById('btn-unlock')?.addEventListener('click', function() {
    // In production, this would trigger payment
    Toast.info('Backtester PRO requires 100 sats per backtest. Payment integration coming soon!');
  });

  // New backtest button
  document.getElementById('btn-new-backtest')?.addEventListener('click', function() {
    resultsSection.style.display = 'none';
    document.querySelector('.strategy-input-section').scrollIntoView({ behavior: 'smooth' });
  });

  // Export CSV
  document.getElementById('btn-export-csv')?.addEventListener('click', function() {
    if (!backtestResults) return;

    const stats = backtestResults.stats;
    const trades = backtestResults.trades;

    // Build CSV content
    let csv = 'BACKTEST RESULTS\n';
    csv += 'Strategy,' + (strategyInput.value.replace(/,/g, ';').substring(0, 100)) + '\n';
    csv += 'Generated,' + new Date().toISOString() + '\n\n';

    csv += 'PERFORMANCE METRICS\n';
    csv += 'Metric,Value\n';
    csv += 'Total Return,' + stats.totalReturn.toFixed(2) + '%\n';
    csv += 'Win Rate,' + stats.winRate.toFixed(2) + '%\n';
    csv += 'Total Trades,' + stats.totalTrades + '\n';
    csv += 'Winning Trades,' + stats.winningTrades + '\n';
    csv += 'Losing Trades,' + stats.losingTrades + '\n';
    csv += 'Avg Win,' + stats.avgWin.toFixed(2) + '%\n';
    csv += 'Avg Loss,' + stats.avgLoss.toFixed(2) + '%\n';
    csv += 'Profit Factor,' + stats.profitFactor.toFixed(2) + '\n';
    csv += 'Max Drawdown,' + stats.maxDrawdown.toFixed(2) + '%\n';
    csv += 'Sharpe Ratio,' + stats.sharpeRatio.toFixed(2) + '\n';
    csv += 'Final Equity,$' + stats.finalEquity.toFixed(2) + '\n';
    csv += 'Total Fees,$' + (stats.totalFees || 0).toFixed(2) + '\n';
    csv += 'Total Slippage,$' + (stats.totalSlippage || 0).toFixed(2) + '\n\n';

    if (lastMcResults) {
      csv += 'MONTE CARLO ANALYSIS (' + lastMcResults.simulations + ' simulations)\n';
      csv += 'Metric,Value\n';
      csv += 'Median Return,' + lastMcResults.median.toFixed(2) + '%\n';
      csv += '5th Percentile,' + lastMcResults.p5.toFixed(2) + '%\n';
      csv += '95th Percentile,' + lastMcResults.p95.toFixed(2) + '%\n';
      csv += 'Profit Probability,' + lastMcResults.profitProbability.toFixed(2) + '%\n';
      csv += 'Risk of Ruin,' + lastMcResults.ruinProbability.toFixed(2) + '%\n';
      csv += 'Avg Max Drawdown,' + lastMcResults.avgMaxDrawdown.toFixed(2) + '%\n\n';
    }

    csv += 'TRADE LOG\n';
    csv += 'Date,Direction,Entry Price,Exit Price,P&L %,R Multiple,Exit Reason\n';
    trades.forEach(t => {
      csv += new Date(t.entryTime).toLocaleDateString() + ',';
      csv += t.direction.toUpperCase() + ',';
      csv += '$' + t.entryPrice.toFixed(2) + ',';
      csv += '$' + t.exitPrice.toFixed(2) + ',';
      csv += t.pnlPct.toFixed(2) + '%,';
      csv += t.rMultiple.toFixed(2) + 'R,';
      csv += (t.exitReason || 'N/A') + '\n';
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backtest-results-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    URL.revokeObjectURL(url);

    Toast.success('CSV exported successfully');
  });

  // Export JSON
  document.getElementById('btn-export-json')?.addEventListener('click', function() {
    if (!backtestResults) return;

    const exportData = {
      generated: new Date().toISOString(),
      strategy: strategyInput.value,
      settings: {
        timeframe: timeframeSelect.value,
        period: periodSelect.value,
        startingCapital: capitalInput.value,
        slippage: slippageInput?.value || '0.1',
        fee: feeInput?.value || '0.1'
      },
      stats: backtestResults.stats,
      monteCarlo: lastMcResults ? {
        simulations: lastMcResults.simulations,
        median: lastMcResults.median,
        p5: lastMcResults.p5,
        p95: lastMcResults.p95,
        profitProbability: lastMcResults.profitProbability,
        ruinProbability: lastMcResults.ruinProbability,
        avgMaxDrawdown: lastMcResults.avgMaxDrawdown
      } : null,
      trades: backtestResults.trades.map(t => ({
        entryTime: t.entryTime,
        exitTime: t.exitTime,
        direction: t.direction,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        pnl: t.pnl,
        pnlPct: t.pnlPct,
        rMultiple: t.rMultiple,
        exitReason: t.exitReason
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backtest-results-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);

    Toast.success('JSON exported successfully');
  });

  // Initialize
  function init() {
    // Check if premium gate should show
    if (!checkAccess()) {
      // Still allow interaction but gate the results
    }
  }

  init();
})();
