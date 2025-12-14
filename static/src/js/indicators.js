/**
 * BTC Signal AI - Technical Indicators Module
 * Pure functions for indicator calculations - easily testable
 *
 * All functions expect price data in format:
 * { time, open, high, low, close, volume }
 */

const BTCSAIIndicators = (function() {
  'use strict';

  // ==================== MOVING AVERAGES ====================

  /**
   * Simple Moving Average
   * @param {number[]} data - Array of values
   * @param {number} period - SMA period
   * @returns {number[]} - Array with null for insufficient data
   */
  function SMA(data, period) {
    const result = new Array(data.length).fill(null);
    if (data.length < period) return result;

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
      if (i >= period - 1) {
        result[i] = sum / period;
        sum -= data[i - period + 1];
      }
    }
    return result;
  }

  /**
   * Exponential Moving Average
   * Uses SMA for first N periods, then EMA formula
   * @param {number[]} data - Array of values
   * @param {number} period - EMA period
   * @returns {number[]} - Array with null for insufficient data
   */
  function EMA(data, period) {
    const result = new Array(data.length).fill(null);
    if (data.length < period) return result;

    const multiplier = 2 / (period + 1);

    // First value is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i];
    }
    result[period - 1] = sum / period;

    // Rest are EMA
    for (let i = period; i < data.length; i++) {
      result[i] = (data[i] - result[i - 1]) * multiplier + result[i - 1];
    }

    return result;
  }

  /**
   * Weighted Moving Average
   * @param {number[]} data - Array of values
   * @param {number} period - WMA period
   * @returns {number[]}
   */
  function WMA(data, period) {
    const result = new Array(data.length).fill(null);
    if (data.length < period) return result;

    const denominator = (period * (period + 1)) / 2;

    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - period + 1 + j] * (j + 1);
      }
      result[i] = sum / denominator;
    }
    return result;
  }

  // ==================== MOMENTUM INDICATORS ====================

  /**
   * Relative Strength Index (RSI)
   * @param {Object[]} candles - OHLC data
   * @param {number} period - RSI period (default 14)
   * @returns {number[]} - Array with null for insufficient data
   */
  function RSI(candles, period = 14) {
    const result = new Array(candles.length).fill(null);
    if (candles.length < period + 1) return result;

    let gains = 0, losses = 0;

    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) gains += change;
      else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // First RSI value
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[period] = 100 - (100 / (1 + rs));

    // Calculate rest using smoothed averages (Wilder's method)
    for (let i = period + 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result[i] = 100 - (100 / (1 + rs));
    }

    return result;
  }

  /**
   * Stochastic Oscillator
   * @param {Object[]} candles - OHLC data
   * @param {number} kPeriod - %K period (default 14)
   * @param {number} kSmoothing - %K smoothing (default 3)
   * @param {number} dPeriod - %D period (default 3)
   * @returns {Object} - { k: number[], d: number[] }
   */
  function Stochastic(candles, kPeriod = 14, kSmoothing = 3, dPeriod = 3) {
    const rawK = new Array(candles.length).fill(null);
    const k = new Array(candles.length).fill(null);
    const d = new Array(candles.length).fill(null);

    if (candles.length < kPeriod) return { k, d };

    // Calculate raw %K
    for (let i = kPeriod - 1; i < candles.length; i++) {
      let highestHigh = -Infinity;
      let lowestLow = Infinity;

      for (let j = i - kPeriod + 1; j <= i; j++) {
        if (candles[j].high > highestHigh) highestHigh = candles[j].high;
        if (candles[j].low < lowestLow) lowestLow = candles[j].low;
      }

      const range = highestHigh - lowestLow;
      rawK[i] = range > 0 ? ((candles[i].close - lowestLow) / range) * 100 : 50;
    }

    // Smooth %K with SMA
    const smoothedK = SMA(rawK.filter(v => v !== null), kSmoothing);
    let smoothIdx = 0;
    for (let i = 0; i < candles.length; i++) {
      if (rawK[i] !== null && smoothIdx < smoothedK.length) {
        k[i] = smoothedK[smoothIdx];
        smoothIdx++;
      }
    }

    // Calculate %D (SMA of %K)
    const kValues = k.filter(v => v !== null);
    const dValues = SMA(kValues, dPeriod);
    let dIdx = 0;
    for (let i = 0; i < candles.length; i++) {
      if (k[i] !== null && dIdx < dValues.length) {
        d[i] = dValues[dIdx];
        dIdx++;
      }
    }

    return { k, d };
  }

  /**
   * MACD (Moving Average Convergence Divergence)
   * @param {Object[]} candles - OHLC data
   * @param {number} fastPeriod - Fast EMA period (default 12)
   * @param {number} slowPeriod - Slow EMA period (default 26)
   * @param {number} signalPeriod - Signal line period (default 9)
   * @returns {Object} - { macd: number[], signal: number[], histogram: number[] }
   */
  function MACD(candles, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const closes = candles.map(c => c.close);
    const macdLine = new Array(candles.length).fill(null);
    const signal = new Array(candles.length).fill(null);
    const histogram = new Array(candles.length).fill(null);

    if (candles.length < slowPeriod + signalPeriod) {
      return { macd: macdLine, signal, histogram };
    }

    const fastEMA = EMA(closes, fastPeriod);
    const slowEMA = EMA(closes, slowPeriod);

    // MACD line = Fast EMA - Slow EMA
    for (let i = slowPeriod - 1; i < candles.length; i++) {
      if (fastEMA[i] !== null && slowEMA[i] !== null) {
        macdLine[i] = fastEMA[i] - slowEMA[i];
      }
    }

    // Signal line = EMA of MACD
    const macdValues = macdLine.filter(v => v !== null);
    const signalEMA = EMA(macdValues, signalPeriod);

    let signalIdx = 0;
    for (let i = 0; i < candles.length; i++) {
      if (macdLine[i] !== null) {
        if (signalIdx >= signalPeriod - 1 && signalIdx < signalEMA.length) {
          signal[i] = signalEMA[signalIdx];
          histogram[i] = macdLine[i] - signal[i];
        }
        signalIdx++;
      }
    }

    return { macd: macdLine, signal, histogram };
  }

  // ==================== VOLATILITY INDICATORS ====================

  /**
   * Bollinger Bands
   * @param {Object[]} candles - OHLC data
   * @param {number} period - SMA period (default 20)
   * @param {number} stdDev - Standard deviation multiplier (default 2)
   * @returns {Object} - { upper: number[], middle: number[], lower: number[], bandwidth: number[] }
   */
  function BollingerBands(candles, period = 20, stdDev = 2) {
    const closes = candles.map(c => c.close);
    const upper = new Array(candles.length).fill(null);
    const middle = new Array(candles.length).fill(null);
    const lower = new Array(candles.length).fill(null);
    const bandwidth = new Array(candles.length).fill(null);

    if (candles.length < period) {
      return { upper, middle, lower, bandwidth };
    }

    // Calculate middle band (SMA)
    const sma = SMA(closes, period);

    for (let i = period - 1; i < candles.length; i++) {
      // Calculate standard deviation
      let sumSquares = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumSquares += Math.pow(closes[j] - sma[i], 2);
      }
      const std = Math.sqrt(sumSquares / period);

      middle[i] = sma[i];
      upper[i] = sma[i] + (stdDev * std);
      lower[i] = sma[i] - (stdDev * std);
      bandwidth[i] = middle[i] > 0 ? ((upper[i] - lower[i]) / middle[i]) * 100 : 0;
    }

    return { upper, middle, lower, bandwidth };
  }

  /**
   * Average True Range (ATR)
   * @param {Object[]} candles - OHLC data
   * @param {number} period - ATR period (default 14)
   * @returns {number[]}
   */
  function ATR(candles, period = 14) {
    const result = new Array(candles.length).fill(null);
    if (candles.length < period + 1) return result;

    const trueRanges = [];

    // Calculate True Range for each candle
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }

    // First ATR is SMA of first 'period' true ranges
    let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result[period] = atr;

    // Rest use smoothed average (Wilder's method)
    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]) / period;
      result[i + 1] = atr;
    }

    return result;
  }

  /**
   * Keltner Channels
   * @param {Object[]} candles - OHLC data
   * @param {number} emaPeriod - EMA period (default 20)
   * @param {number} atrPeriod - ATR period (default 10)
   * @param {number} atrMult - ATR multiplier (default 2)
   * @returns {Object} - { upper: number[], middle: number[], lower: number[] }
   */
  function KeltnerChannels(candles, emaPeriod = 20, atrPeriod = 10, atrMult = 2) {
    const closes = candles.map(c => c.close);
    const emaValues = EMA(closes, emaPeriod);
    const atrValues = ATR(candles, atrPeriod);

    const upper = new Array(candles.length).fill(null);
    const middle = new Array(candles.length).fill(null);
    const lower = new Array(candles.length).fill(null);

    for (let i = 0; i < candles.length; i++) {
      if (emaValues[i] !== null && atrValues[i] !== null) {
        middle[i] = emaValues[i];
        upper[i] = emaValues[i] + (atrMult * atrValues[i]);
        lower[i] = emaValues[i] - (atrMult * atrValues[i]);
      }
    }

    return { upper, middle, lower };
  }

  // ==================== TREND INDICATORS ====================

  /**
   * Average Directional Index (ADX)
   * @param {Object[]} candles - OHLC data
   * @param {number} period - ADX period (default 14)
   * @returns {Object} - { adx: number[], plusDI: number[], minusDI: number[] }
   */
  function ADX(candles, period = 14) {
    const adx = new Array(candles.length).fill(null);
    const plusDI = new Array(candles.length).fill(null);
    const minusDI = new Array(candles.length).fill(null);

    if (candles.length < period * 2) {
      return { adx, plusDI, minusDI };
    }

    const tr = [];
    const plusDM = [];
    const minusDM = [];

    // Calculate TR, +DM, -DM
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevHigh = candles[i - 1].high;
      const prevLow = candles[i - 1].low;
      const prevClose = candles[i - 1].close;

      // True Range
      tr.push(Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      ));

      // Directional Movement
      const upMove = high - prevHigh;
      const downMove = prevLow - low;

      if (upMove > downMove && upMove > 0) {
        plusDM.push(upMove);
      } else {
        plusDM.push(0);
      }

      if (downMove > upMove && downMove > 0) {
        minusDM.push(downMove);
      } else {
        minusDM.push(0);
      }
    }

    // Smooth TR, +DM, -DM with Wilder's method
    let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

    const dx = [];

    for (let i = period - 1; i < tr.length; i++) {
      if (i > period - 1) {
        smoothTR = smoothTR - (smoothTR / period) + tr[i];
        smoothPlusDM = smoothPlusDM - (smoothPlusDM / period) + plusDM[i];
        smoothMinusDM = smoothMinusDM - (smoothMinusDM / period) + minusDM[i];
      }

      const pdi = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
      const mdi = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

      plusDI[i + 1] = pdi;
      minusDI[i + 1] = mdi;

      const diSum = pdi + mdi;
      const dxVal = diSum > 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0;
      dx.push(dxVal);
    }

    // Calculate ADX as smoothed DX
    if (dx.length >= period) {
      let adxVal = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
      adx[period * 2 - 1] = adxVal;

      for (let i = period; i < dx.length; i++) {
        adxVal = (adxVal * (period - 1) + dx[i]) / period;
        adx[period + i] = adxVal;
      }
    }

    return { adx, plusDI, minusDI };
  }

  // ==================== VOLUME INDICATORS ====================

  /**
   * On-Balance Volume (OBV)
   * @param {Object[]} candles - OHLC data with volume
   * @returns {number[]}
   */
  function OBV(candles) {
    const result = new Array(candles.length).fill(null);
    if (candles.length === 0) return result;

    result[0] = candles[0].volume;

    for (let i = 1; i < candles.length; i++) {
      if (candles[i].close > candles[i - 1].close) {
        result[i] = result[i - 1] + candles[i].volume;
      } else if (candles[i].close < candles[i - 1].close) {
        result[i] = result[i - 1] - candles[i].volume;
      } else {
        result[i] = result[i - 1];
      }
    }

    return result;
  }

  /**
   * Volume SMA
   * @param {Object[]} candles - OHLC data with volume
   * @param {number} period - SMA period
   * @returns {number[]}
   */
  function VolumeSMA(candles, period = 20) {
    const volumes = candles.map(c => c.volume);
    return SMA(volumes, period);
  }

  /**
   * Volume Ratio (current volume / average volume)
   * @param {Object[]} candles - OHLC data with volume
   * @param {number} period - Average period
   * @returns {number[]}
   */
  function VolumeRatio(candles, period = 20) {
    const result = new Array(candles.length).fill(null);
    const avgVolume = VolumeSMA(candles, period);

    for (let i = 0; i < candles.length; i++) {
      if (avgVolume[i] !== null && avgVolume[i] > 0) {
        result[i] = candles[i].volume / avgVolume[i];
      }
    }

    return result;
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Check for crossover (value1 crosses above value2)
   * @param {number} prev1 - Previous value of series 1
   * @param {number} curr1 - Current value of series 1
   * @param {number} prev2 - Previous value of series 2
   * @param {number} curr2 - Current value of series 2
   * @returns {boolean}
   */
  function crossover(prev1, curr1, prev2, curr2) {
    if (prev1 === null || curr1 === null || prev2 === null || curr2 === null) {
      return false;
    }
    return prev1 <= prev2 && curr1 > curr2;
  }

  /**
   * Check for crossunder (value1 crosses below value2)
   * @param {number} prev1 - Previous value of series 1
   * @param {number} curr1 - Current value of series 1
   * @param {number} prev2 - Previous value of series 2
   * @param {number} curr2 - Current value of series 2
   * @returns {boolean}
   */
  function crossunder(prev1, curr1, prev2, curr2) {
    if (prev1 === null || curr1 === null || prev2 === null || curr2 === null) {
      return false;
    }
    return prev1 >= prev2 && curr1 < curr2;
  }

  /**
   * Find highest value in lookback period
   * @param {number[]} data - Array of values
   * @param {number} index - Current index
   * @param {number} period - Lookback period
   * @returns {number|null}
   */
  function highest(data, index, period) {
    if (index < period - 1) return null;
    let max = -Infinity;
    for (let i = index - period + 1; i <= index; i++) {
      if (data[i] > max) max = data[i];
    }
    return max;
  }

  /**
   * Find lowest value in lookback period
   * @param {number[]} data - Array of values
   * @param {number} index - Current index
   * @param {number} period - Lookback period
   * @returns {number|null}
   */
  function lowest(data, index, period) {
    if (index < period - 1) return null;
    let min = Infinity;
    for (let i = index - period + 1; i <= index; i++) {
      if (data[i] < min) min = data[i];
    }
    return min;
  }

  // ==================== PUBLIC API ====================

  return {
    // Moving Averages
    SMA,
    EMA,
    WMA,

    // Momentum
    RSI,
    Stochastic,
    MACD,

    // Volatility
    BollingerBands,
    ATR,
    KeltnerChannels,

    // Trend
    ADX,

    // Volume
    OBV,
    VolumeSMA,
    VolumeRatio,

    // Helpers
    crossover,
    crossunder,
    highest,
    lowest
  };
})();

// Export for global use
if (typeof window !== 'undefined') {
  window.BTCSAIIndicators = BTCSAIIndicators;
}

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BTCSAIIndicators;
}
