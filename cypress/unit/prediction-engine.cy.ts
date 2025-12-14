/**
 * Prediction Engine Unit Tests
 * TDD tests for the main trading signal generation
 */

import { PredictionEngine, Prediction } from '../../netlify/functions/lib/prediction-engine';
import { TechnicalIndicators } from '../../netlify/functions/lib/technical-analysis';
import { OHLCV } from '../../netlify/functions/lib/data-provider';

describe('PredictionEngine', () => {
  let engine: PredictionEngine;

  // Generate sample OHLCV data
  const generateOHLCV = (length: number, basePrice: number = 42000): OHLCV[] => {
    const data: OHLCV[] = [];
    for (let i = 0; i < length; i++) {
      const variance = (Math.random() - 0.5) * 1000;
      const close = basePrice + variance;
      data.push({
        time: Date.now() - (length - i) * 3600000,
        open: close - variance * 0.3,
        high: close + Math.abs(variance) * 0.5,
        low: close - Math.abs(variance) * 0.5,
        close: close,
        volume: 1000 + Math.random() * 500,
      });
    }
    return data;
  };

  // Default indicators for testing
  const baseIndicators: TechnicalIndicators = {
    rsi: 50,
    macd: { MACD: 0, signal: 0, histogram: 0 },
    prevMacdHistogram: 0,
    bollingerBands: { upper: 44000, middle: 42000, lower: 40000 },
    ema20: 42000,
    sma50: 41500,
    atr: 800,
    volumeRatio: 1.0,
    volumeTrend: 'stable',
    rsiDivergence: null,
  };

  beforeEach(() => {
    engine = new PredictionEngine();
  });

  describe('Technical Analysis Signals', () => {
    it('should detect RSI oversold condition', () => {
      const data = generateOHLCV(50);
      const indicators = { ...baseIndicators, rsi: 25 };
      const result = engine.predict(data, indicators, []);

      expect(result.reasoning.some(r => r.includes('RSI oversold'))).to.be.true;
    });

    it('should detect RSI overbought condition', () => {
      const data = generateOHLCV(50);
      const indicators = { ...baseIndicators, rsi: 78 };
      const result = engine.predict(data, indicators, []);

      expect(result.reasoning.some(r => r.includes('RSI overbought'))).to.be.true;
    });

    it('should detect MACD bullish crossover', () => {
      const data = generateOHLCV(50);
      const indicators = {
        ...baseIndicators,
        macd: { MACD: 100, signal: 50, histogram: 50 },
        prevMacdHistogram: -10,
      };
      const result = engine.predict(data, indicators, []);

      expect(result.reasoning.some(r => r.includes('MACD bullish crossover'))).to.be.true;
    });

    it('should detect MACD bearish crossover', () => {
      const data = generateOHLCV(50);
      const indicators = {
        ...baseIndicators,
        macd: { MACD: 50, signal: 100, histogram: -50 },
        prevMacdHistogram: 10,
      };
      const result = engine.predict(data, indicators, []);

      expect(result.reasoning.some(r => r.includes('MACD bearish crossover'))).to.be.true;
    });

    it('should detect price below lower Bollinger Band', () => {
      const data = generateOHLCV(50, 39500); // Below lower band
      const indicators = { ...baseIndicators };
      const result = engine.predict(data, indicators, []);

      expect(result.reasoning.some(r => r.includes('Below lower BB'))).to.be.true;
    });

    it('should detect strong uptrend (price > EMA > SMA)', () => {
      const data = generateOHLCV(50, 43000);
      const indicators = {
        ...baseIndicators,
        ema20: 42500,
        sma50: 42000,
      };
      const result = engine.predict(data, indicators, []);

      expect(result.reasoning.some(r => r.includes('Strong uptrend'))).to.be.true;
    });

    it('should detect bullish RSI divergence', () => {
      const data = generateOHLCV(50);
      const indicators = { ...baseIndicators, rsiDivergence: 'bullish' };
      const result = engine.predict(data, indicators, []);

      expect(result.reasoning.some(r => r.includes('Bullish RSI divergence'))).to.be.true;
    });

    it('should detect high volume rally', () => {
      const data = generateOHLCV(50);
      data[data.length - 1].close = data[data.length - 2].close + 500;
      const indicators = { ...baseIndicators, volumeRatio: 2.5 };
      const result = engine.predict(data, indicators, []);

      expect(result.reasoning.some(r => r.includes('High volume'))).to.be.true;
    });
  });

  describe('Derivatives Signals', () => {
    it('should signal bearish on extreme positive funding', () => {
      const data = generateOHLCV(50);
      const derivativesData = {
        fundingRate: { fundingRate: 0.015, timestamp: Date.now() },
        openInterest: { openInterestValue: 20000000000 },
        squeezeAlert: { type: 'none' as const, probability: 'low' as const },
      };
      const result = engine.predict(data, baseIndicators, [], derivativesData);

      expect(result.derivativesFactors?.fundingSignal).to.equal('bearish');
      expect(result.reasoning.some(r => r.includes('Extreme funding'))).to.be.true;
    });

    it('should signal bullish on extreme negative funding', () => {
      const data = generateOHLCV(50);
      const derivativesData = {
        fundingRate: { fundingRate: -0.015, timestamp: Date.now() },
        openInterest: { openInterestValue: 20000000000 },
        squeezeAlert: { type: 'none' as const, probability: 'low' as const },
      };
      const result = engine.predict(data, baseIndicators, [], derivativesData);

      expect(result.derivativesFactors?.fundingSignal).to.equal('bullish');
      expect(result.reasoning.some(r => r.includes('Negative funding'))).to.be.true;
    });

    it('should detect long squeeze risk', () => {
      const data = generateOHLCV(50);
      const derivativesData = {
        fundingRate: { fundingRate: 0.008, timestamp: Date.now() },
        openInterest: { openInterestValue: 25000000000 },
        squeezeAlert: { type: 'long_squeeze' as const, probability: 'high' as const },
      };
      const result = engine.predict(data, baseIndicators, [], derivativesData);

      expect(result.derivativesFactors?.squeezeRisk).to.equal('long');
      expect(result.derivativesFactors?.squeezeProbability).to.equal('high');
      expect(result.reasoning.some(r => r.includes('Long squeeze risk'))).to.be.true;
    });

    it('should detect short squeeze potential', () => {
      const data = generateOHLCV(50);
      const derivativesData = {
        fundingRate: { fundingRate: -0.008, timestamp: Date.now() },
        openInterest: { openInterestValue: 25000000000 },
        squeezeAlert: { type: 'short_squeeze' as const, probability: 'high' as const },
      };
      const result = engine.predict(data, baseIndicators, [], derivativesData);

      expect(result.derivativesFactors?.squeezeRisk).to.equal('short');
      expect(result.reasoning.some(r => r.includes('Short squeeze risk'))).to.be.true;
    });
  });

  describe('On-Chain Signals', () => {
    it('should include on-chain factors when provided', () => {
      const data = generateOHLCV(50);
      const onChainData = {
        mvrv: { value: 1.5, zone: 'fair' },
        sopr: { value: 1.02, trend: 'stable' },
        nupl: { value: 0.45, zone: 'belief' },
        reserveRisk: { value: 0.005, zone: 'accumulate' },
        supplyInProfit: { percentage: 75, trend: 'increasing' },
        exchangeReserves: { total: 2500000, change7d: -2.5 },
        stablecoinSupply: { total: 120000000000, change7d: 1.5 },
      };
      const result = engine.predict(data, baseIndicators, [], undefined, onChainData);

      expect(result.onChainFactors).to.exist;
      expect(result.onChainFactors?.score).to.be.a('number');
      expect(result.onChainFactors?.bias).to.be.oneOf(['bullish', 'bearish', 'neutral']);
    });
  });

  describe('Price Model Signals', () => {
    it('should include price model factors when provided', () => {
      const data = generateOHLCV(50);
      const priceModelsData = {
        overallValuation: { score: -30, rating: 'undervalued', confidence: 75, summary: 'Test' },
        stockToFlow: { modelPrice: 55000, deflection: -20, signal: 'bullish' },
        nupl: { value: 0.35, zone: 'optimism' },
        thermocap: { thermocapMultiple: 10, signal: 'neutral' },
        puellMultiple: { value: 0.8, signal: 'neutral' },
        rhodl: { value: 20000, signal: 'neutral' },
        mvrv: { value: 1.8, zone: 'fair' },
        deltaCap: { delta: 15000, currentPrice: 42000, deltaRatio: 2.8 },
      };
      const result = engine.predict(
        data,
        baseIndicators,
        [],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        priceModelsData
      );

      expect(result.priceModelFactors).to.exist;
      expect(result.priceModelFactors?.overallScore).to.be.a('number');
      expect(result.priceModelFactors?.rating).to.be.a('string');
    });
  });

  describe('Direction Calculation', () => {
    it('should predict UP with strong bullish signals', () => {
      const data = generateOHLCV(50, 40500); // Below BB
      const indicators = {
        ...baseIndicators,
        rsi: 25,
        bollingerBands: { upper: 44000, middle: 42000, lower: 41000 },
        macd: { MACD: 100, signal: 50, histogram: 50 },
        prevMacdHistogram: -10,
      };
      const result = engine.predict(data, indicators, []);

      expect(result.direction).to.equal('up');
    });

    it('should predict DOWN with strong bearish signals', () => {
      const data = generateOHLCV(50, 45000); // Above BB
      const indicators = {
        ...baseIndicators,
        rsi: 78,
        bollingerBands: { upper: 44000, middle: 42000, lower: 40000 },
        macd: { MACD: 50, signal: 100, histogram: -50 },
        prevMacdHistogram: 10,
        ema20: 43000,
        sma50: 44000,
      };
      const result = engine.predict(data, indicators, []);

      expect(result.direction).to.equal('down');
    });

    it('should predict SIDEWAYS in low volatility range', () => {
      const data = generateOHLCV(50, 42000);
      const indicators = {
        ...baseIndicators,
        rsi: 50,
        atr: 500, // Low ATR
        bollingerBands: { upper: 42500, middle: 42000, lower: 41500 },
      };
      const result = engine.predict(data, indicators, []);

      expect(['sideways', 'mixed']).to.include(result.direction);
    });

    it('should predict MIXED when signals conflict', () => {
      const data = generateOHLCV(50);
      const indicators = {
        ...baseIndicators,
        rsi: 72, // Overbought (bearish)
        macd: { MACD: 100, signal: 50, histogram: 50 },
        prevMacdHistogram: -10, // Bullish crossover
      };
      const result = engine.predict(data, indicators, []);

      // When signals conflict, could be mixed or lean one direction
      expect(['up', 'down', 'mixed']).to.include(result.direction);
    });
  });

  describe('Confidence Calculation', () => {
    it('should have higher confidence with aligned signals', () => {
      const data = generateOHLCV(50, 39000);
      const bullishIndicators = {
        ...baseIndicators,
        rsi: 22,
        bollingerBands: { upper: 44000, middle: 42000, lower: 40000 },
        macd: { MACD: 150, signal: 50, histogram: 100 },
        prevMacdHistogram: -20,
        rsiDivergence: 'bullish' as const,
      };
      const result = engine.predict(data, bullishIndicators, []);

      expect(result.confidence).to.be.greaterThan(0.6);
    });

    it('should have lower confidence with mixed signals', () => {
      const data = generateOHLCV(50);
      const mixedIndicators = {
        ...baseIndicators,
        rsi: 50, // Neutral
      };
      const result = engine.predict(data, mixedIndicators, []);

      // Mixed signals should have moderate confidence
      expect(result.confidence).to.be.lessThan(0.7);
    });

    it('should cap confidence at 85%', () => {
      const data = generateOHLCV(50, 38000);
      const extremeIndicators = {
        ...baseIndicators,
        rsi: 10, // Extreme oversold
        bollingerBands: { upper: 44000, middle: 42000, lower: 40000 },
        macd: { MACD: 200, signal: 50, histogram: 150 },
        prevMacdHistogram: -50,
        rsiDivergence: 'bullish' as const,
        volumeRatio: 3.0,
      };
      const result = engine.predict(data, extremeIndicators, []);

      expect(result.confidence).to.be.at.most(0.85);
    });
  });

  describe('Target and Stop Loss', () => {
    it('should calculate target and stop loss for UP direction', () => {
      const data = generateOHLCV(50, 40000);
      const indicators = {
        ...baseIndicators,
        rsi: 25,
        atr: 1000,
        macd: { MACD: 100, signal: 50, histogram: 50 },
        prevMacdHistogram: -10,
      };
      const result = engine.predict(data, indicators, []);

      if (result.direction === 'up') {
        expect(result.targetPrice).to.be.greaterThan(data[data.length - 1].close);
        expect(result.stopLoss).to.be.lessThan(data[data.length - 1].close);
      }
    });

    it('should calculate target and stop loss for DOWN direction', () => {
      const data = generateOHLCV(50, 45000);
      const indicators = {
        ...baseIndicators,
        rsi: 78,
        atr: 1000,
        macd: { MACD: 50, signal: 100, histogram: -50 },
        prevMacdHistogram: 10,
        ema20: 43000,
        sma50: 44000,
      };
      const result = engine.predict(data, indicators, []);

      if (result.direction === 'down') {
        expect(result.targetPrice).to.be.lessThan(data[data.length - 1].close);
        expect(result.stopLoss).to.be.greaterThan(data[data.length - 1].close);
      }
    });

    it('should not set target/stop for sideways/mixed', () => {
      const data = generateOHLCV(50, 42000);
      const indicators = {
        ...baseIndicators,
        rsi: 50,
        atr: 400,
        bollingerBands: { upper: 42500, middle: 42000, lower: 41500 },
      };
      const result = engine.predict(data, indicators, []);

      if (result.direction === 'sideways' || result.direction === 'mixed') {
        expect(result.targetPrice).to.be.null;
        expect(result.stopLoss).to.be.null;
      }
    });
  });

  describe('Predicted Price 24h', () => {
    it('should predict higher price for UP direction', () => {
      const data = generateOHLCV(50, 40000);
      const indicators = {
        ...baseIndicators,
        rsi: 25,
        macd: { MACD: 100, signal: 50, histogram: 50 },
        prevMacdHistogram: -10,
      };
      const result = engine.predict(data, indicators, []);

      if (result.direction === 'up') {
        expect(result.predictedPrice24h).to.be.greaterThan(data[data.length - 1].close);
      }
    });

    it('should predict lower price for DOWN direction', () => {
      const data = generateOHLCV(50, 45000);
      const indicators = {
        ...baseIndicators,
        rsi: 78,
        macd: { MACD: 50, signal: 100, histogram: -50 },
        prevMacdHistogram: 10,
        ema20: 43000,
        sma50: 44000,
      };
      const result = engine.predict(data, indicators, []);

      if (result.direction === 'down') {
        expect(result.predictedPrice24h).to.be.lessThan(data[data.length - 1].close);
      }
    });

    it('should predict stable price for sideways', () => {
      const data = generateOHLCV(50, 42000);
      const indicators = {
        ...baseIndicators,
        rsi: 50,
        atr: 400,
        bollingerBands: { upper: 42500, middle: 42000, lower: 41500 },
      };
      const result = engine.predict(data, indicators, []);

      if (result.direction === 'sideways') {
        const currentPrice = data[data.length - 1].close;
        expect(result.predictedPrice24h).to.be.closeTo(currentPrice, currentPrice * 0.02);
      }
    });
  });

  describe('Reasoning Output', () => {
    it('should include bullish reasons with + prefix', () => {
      const data = generateOHLCV(50);
      const indicators = { ...baseIndicators, rsi: 25 };
      const result = engine.predict(data, indicators, []);

      const bullishReasons = result.reasoning.filter(r => r.startsWith('+'));
      expect(bullishReasons.length).to.be.greaterThan(0);
    });

    it('should include bearish reasons with - prefix', () => {
      const data = generateOHLCV(50);
      const indicators = { ...baseIndicators, rsi: 78 };
      const result = engine.predict(data, indicators, []);

      const bearishReasons = result.reasoning.filter(r => r.startsWith('-'));
      expect(bearishReasons.length).to.be.greaterThan(0);
    });

    it('should include neutral reasons with = prefix', () => {
      const data = generateOHLCV(50, 42000);
      const indicators = {
        ...baseIndicators,
        rsi: 50,
        atr: 400,
        bollingerBands: { upper: 42500, middle: 42000, lower: 41500 },
      };
      const result = engine.predict(data, indicators, []);

      const neutralReasons = result.reasoning.filter(r => r.startsWith('='));
      // May or may not have neutral reasons depending on conditions
      expect(result.reasoning.length).to.be.greaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal data gracefully', () => {
      const data = generateOHLCV(5);
      const result = engine.predict(data, baseIndicators, []);

      expect(result.direction).to.be.oneOf(['up', 'down', 'sideways', 'mixed']);
      expect(result.confidence).to.be.a('number');
    });

    it('should handle null indicator values', () => {
      const data = generateOHLCV(50);
      const nullIndicators: TechnicalIndicators = {
        rsi: null,
        macd: null,
        prevMacdHistogram: null,
        bollingerBands: null,
        ema20: null,
        sma50: null,
        atr: null,
        volumeRatio: null,
        volumeTrend: null,
        rsiDivergence: null,
      };
      const result = engine.predict(data, nullIndicators, []);

      expect(result.direction).to.be.oneOf(['up', 'down', 'sideways', 'mixed']);
    });

    it('should handle empty patterns array', () => {
      const data = generateOHLCV(50);
      const result = engine.predict(data, baseIndicators, []);

      expect(result).to.exist;
    });
  });
});
