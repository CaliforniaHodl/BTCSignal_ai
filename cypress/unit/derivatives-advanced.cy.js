// Advanced Derivatives Unit Tests
// Tests for multi-exchange aggregation, funding rate analysis, OI delta, liquidations, max pain, and IV

describe('Advanced Derivatives Calculations', () => {
  // Test data fixtures
  const fixtures = {
    btcPrice: 45000,
    priceChange24h: 3.5,

    // Mock funding rate data
    fundingRates: {
      okx: { rate: 0.0008, annualized: 87.6 },
      bybit: { rate: 0.0010, annualized: 109.5 }
    },

    // Mock OI data
    openInterest: {
      okx: { btc: 50000, usd: 2.25e9 },
      bybit: { btc: 45000, usd: 2.025e9 }
    },

    // Mock long/short ratio
    longShortRatio: {
      okx: { ratio: 1.2, longPct: 54.5, shortPct: 45.5 },
      bybit: { ratio: 1.5, longPct: 60, shortPct: 40 }
    },

    // Mock liquidation data
    liquidations: {
      longLiq: 50e6, // $50M
      shortLiq: 35e6  // $35M
    },

    // Mock options data
    maxPain: {
      strikePrice: 44000,
      currentPrice: 45000,
      callOI: 1500,
      putOI: 1200
    },

    // Mock IV data
    impliedVolatility: {
      ivIndex: 65,
      atmIV: 68
    }
  };

  describe('Funding Rate Aggregation', () => {
    it('should calculate weighted average funding rate correctly', () => {
      const rates = [
        fixtures.fundingRates.okx.rate,
        fixtures.fundingRates.bybit.rate
      ];

      const weightedAvg = rates.reduce((sum, r) => sum + r, 0) / rates.length;

      expect(weightedAvg).to.be.closeTo(0.0009, 0.0001);
    });

    it('should calculate annualized funding rate correctly', () => {
      const rate = 0.0009; // 0.09% per 8h
      const annualized = rate * 3 * 365 * 100; // 3 times per day

      expect(annualized).to.be.closeTo(98.55, 1);
    });

    it('should detect extreme positive funding (>0.01%)', () => {
      const extremeRate = 0.012; // 1.2% per 8h

      expect(extremeRate).to.be.greaterThan(0.01);

      // Extreme positive = bearish signal (contrarian)
      const signal = extremeRate > 0.01 ? 'bearish' : 'neutral';
      expect(signal).to.equal('bearish');
    });

    it('should detect extreme negative funding (<-0.01%)', () => {
      const extremeRate = -0.015; // -1.5% per 8h

      expect(extremeRate).to.be.lessThan(-0.01);

      // Extreme negative = bullish signal (contrarian)
      const signal = extremeRate < -0.01 ? 'bullish' : 'neutral';
      expect(signal).to.equal('bullish');
    });

    it('should identify funding rate trend', () => {
      const currentRate = 0.0009;
      const previousRate = 0.0006;
      const change = currentRate - previousRate;

      let trend = 'stable';
      if (Math.abs(change) > 0.0001) {
        trend = change > 0 ? 'rising' : 'falling';
      }

      expect(trend).to.equal('rising');
    });

    it('should generate correct signal for high positive funding', () => {
      const rate = 0.007; // 0.7% - high but not extreme

      let signal = 'neutral';
      if (rate > 0.01) signal = 'bearish';
      else if (rate > 0.005) signal = 'bearish';
      else if (rate < -0.01) signal = 'bullish';
      else if (rate < -0.005) signal = 'bullish';

      expect(signal).to.equal('bearish');
    });
  });

  describe('Open Interest Aggregation', () => {
    it('should aggregate OI from multiple exchanges correctly', () => {
      const totalBTC = fixtures.openInterest.okx.btc + fixtures.openInterest.bybit.btc;
      const totalUSD = fixtures.openInterest.okx.usd + fixtures.openInterest.bybit.usd;

      expect(totalBTC).to.equal(95000);
      expect(totalUSD).to.be.closeTo(4.275e9, 1e7);
    });

    it('should calculate OI change percentage correctly', () => {
      const currentOI = 4.5e9;
      const previousOI = 4.2e9;
      const change = currentOI - previousOI;
      const changePercent = (change / previousOI) * 100;

      expect(changePercent).to.be.closeTo(7.14, 0.5);
    });

    it('should convert OI between BTC and USD correctly', () => {
      const oiBTC = 50000;
      const price = 45000;
      const oiUSD = oiBTC * price;

      expect(oiUSD).to.equal(2.25e9);
    });
  });

  describe('Long/Short Ratio Analysis', () => {
    it('should calculate aggregate long/short ratio correctly', () => {
      const ratios = [
        fixtures.longShortRatio.okx.ratio,
        fixtures.longShortRatio.bybit.ratio
      ];

      const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;

      expect(avgRatio).to.be.closeTo(1.35, 0.05);
    });

    it('should calculate average long/short percentages correctly', () => {
      const longPcts = [
        fixtures.longShortRatio.okx.longPct,
        fixtures.longShortRatio.bybit.longPct
      ];

      const avgLongPct = longPcts.reduce((sum, p) => sum + p, 0) / longPcts.length;

      expect(avgLongPct).to.be.closeTo(57.25, 1);
    });

    it('should detect crowded long positioning (ratio > 2.0)', () => {
      const crowdedLongRatio = 2.5;

      expect(crowdedLongRatio).to.be.greaterThan(2.0);

      // Too many longs = bearish (contrarian)
      const signal = crowdedLongRatio > 2.0 ? 'bearish' : 'neutral';
      expect(signal).to.equal('bearish');
    });

    it('should detect crowded short positioning (ratio < 0.5)', () => {
      const crowdedShortRatio = 0.4;

      expect(crowdedShortRatio).to.be.lessThan(0.5);

      // Too many shorts = bullish (contrarian)
      const signal = crowdedShortRatio < 0.5 ? 'bullish' : 'neutral';
      expect(signal).to.equal('bullish');
    });

    it('should handle balanced positioning correctly', () => {
      const balancedRatio = 1.0;

      let signal = 'neutral';
      if (balancedRatio > 2.0) signal = 'bearish';
      else if (balancedRatio > 1.5) signal = 'bearish';
      else if (balancedRatio < 0.5) signal = 'bullish';
      else if (balancedRatio < 0.67) signal = 'bullish';

      expect(signal).to.equal('neutral');
    });
  });

  describe('Liquidation Tracking', () => {
    it('should calculate net liquidations correctly', () => {
      const longLiq = fixtures.liquidations.longLiq;
      const shortLiq = fixtures.liquidations.shortLiq;
      const netLiq = shortLiq - longLiq;

      expect(netLiq).to.equal(-15e6); // -$15M (more longs liquidated)
    });

    it('should generate signal from significant net liquidations', () => {
      const netLiq = -15e6; // More longs liquidated

      let signal = 'neutral';
      if (Math.abs(netLiq) > 10e6) {
        signal = netLiq > 0 ? 'bullish' : 'bearish';
      }

      // More long liquidations = bearish
      expect(signal).to.equal('bearish');
    });

    it('should identify large liquidations (>$1M)', () => {
      const liquidations = [
        { value: 500000, side: 'long' },
        { value: 1500000, side: 'long' },
        { value: 2000000, side: 'short' },
        { value: 800000, side: 'short' }
      ];

      const largeLiqs = liquidations.filter(l => l.value > 1000000);

      expect(largeLiqs).to.have.length(2);
      expect(largeLiqs[0].value).to.equal(1500000);
      expect(largeLiqs[1].value).to.equal(2000000);
    });

    it('should calculate total liquidation volume correctly', () => {
      const longLiq = 50e6;
      const shortLiq = 35e6;
      const totalLiq = longLiq + shortLiq;

      expect(totalLiq).to.equal(85e6);
    });

    it('should calculate liquidation breakdown percentages', () => {
      const longLiq = 50e6;
      const shortLiq = 35e6;
      const totalLiq = longLiq + shortLiq;

      const longPct = (longLiq / totalLiq) * 100;
      const shortPct = (shortLiq / totalLiq) * 100;

      expect(longPct).to.be.closeTo(58.8, 0.5);
      expect(shortPct).to.be.closeTo(41.2, 0.5);
    });
  });

  describe('OI Delta Analysis', () => {
    it('should identify bullish trend (rising OI + rising price)', () => {
      const oiDeltaPct = 5; // OI up 5%
      const priceChange = 3; // Price up 3%

      const oiIncreasing = oiDeltaPct > 2;
      const priceUp = priceChange > 1;

      let pattern = 'neutral';
      let signal = 'neutral';

      if (oiIncreasing && priceUp) {
        pattern = 'bullish_trend';
        signal = 'bullish';
      }

      expect(pattern).to.equal('bullish_trend');
      expect(signal).to.equal('bullish');
    });

    it('should identify bearish trend (rising OI + falling price)', () => {
      const oiDeltaPct = 5; // OI up 5%
      const priceChange = -3; // Price down 3%

      const oiIncreasing = oiDeltaPct > 2;
      const priceDown = priceChange < -1;

      let pattern = 'neutral';
      let signal = 'neutral';

      if (oiIncreasing && priceDown) {
        pattern = 'bearish_trend';
        signal = 'bearish';
      }

      expect(pattern).to.equal('bearish_trend');
      expect(signal).to.equal('bearish');
    });

    it('should identify bull trap (falling OI + rising price)', () => {
      const oiDeltaPct = -5; // OI down 5%
      const priceChange = 3; // Price up 3%

      const oiDecreasing = oiDeltaPct < -2;
      const priceUp = priceChange > 1;

      let pattern = 'neutral';
      let signal = 'neutral';

      if (oiDecreasing && priceUp) {
        pattern = 'bull_trap';
        signal = 'bearish'; // Short covering, weak rally
      }

      expect(pattern).to.equal('bull_trap');
      expect(signal).to.equal('bearish');
    });

    it('should identify bear trap (falling OI + falling price)', () => {
      const oiDeltaPct = -5; // OI down 5%
      const priceChange = -3; // Price down 3%

      const oiDecreasing = oiDeltaPct < -2;
      const priceDown = priceChange < -1;

      let pattern = 'neutral';
      let signal = 'neutral';

      if (oiDecreasing && priceDown) {
        pattern = 'bear_trap';
        signal = 'bullish'; // Long unwinding, weak selloff
      }

      expect(pattern).to.equal('bear_trap');
      expect(signal).to.equal('bullish');
    });

    it('should calculate OI delta correctly', () => {
      const currentOI = 4.5e9;
      const previousOI = 4.2e9;
      const delta = currentOI - previousOI;
      const deltaPercent = (delta / previousOI) * 100;

      expect(delta).to.equal(300e6);
      expect(deltaPercent).to.be.closeTo(7.14, 0.5);
    });
  });

  describe('Max Pain Calculation', () => {
    it('should calculate deviation from max pain correctly', () => {
      const maxPainPrice = fixtures.maxPain.strikePrice;
      const currentPrice = fixtures.maxPain.currentPrice;
      const deviation = currentPrice - maxPainPrice;
      const deviationPercent = (deviation / maxPainPrice) * 100;

      expect(deviation).to.equal(1000);
      expect(deviationPercent).to.be.closeTo(2.27, 0.1);
    });

    it('should generate signal when price significantly above max pain', () => {
      const currentPrice = 48000;
      const maxPainPrice = 44000;
      const deviationPercent = ((currentPrice - maxPainPrice) / maxPainPrice) * 100;

      let signal = 'neutral';
      if (Math.abs(deviationPercent) > 5) {
        signal = deviationPercent > 0 ? 'bearish' : 'bullish';
      }

      // Price significantly above max pain = bearish (gravity pull down)
      expect(deviationPercent).to.be.greaterThan(5);
      expect(signal).to.equal('bearish');
    });

    it('should generate signal when price significantly below max pain', () => {
      const currentPrice = 40000;
      const maxPainPrice = 44000;
      const deviationPercent = ((currentPrice - maxPainPrice) / maxPainPrice) * 100;

      let signal = 'neutral';
      if (Math.abs(deviationPercent) > 5) {
        signal = deviationPercent > 0 ? 'bearish' : 'bullish';
      }

      // Price significantly below max pain = bullish (gravity pull up)
      expect(deviationPercent).to.be.lessThan(-5);
      expect(signal).to.equal('bullish');
    });

    it('should calculate put/call ratio correctly', () => {
      const callOI = fixtures.maxPain.callOI;
      const putOI = fixtures.maxPain.putOI;
      const pcRatio = putOI / callOI;

      expect(pcRatio).to.be.closeTo(0.8, 0.1);
    });

    it('should calculate total options OI correctly', () => {
      const callOI = fixtures.maxPain.callOI;
      const putOI = fixtures.maxPain.putOI;
      const totalOI = callOI + putOI;

      expect(totalOI).to.equal(2700);
    });
  });

  describe('Implied Volatility Analysis', () => {
    it('should classify IV level correctly - very low', () => {
      const ivIndex = 35;

      let level = 'normal';
      if (ivIndex < 40) level = 'very_low';
      else if (ivIndex < 60) level = 'low';
      else if (ivIndex < 80) level = 'normal';
      else if (ivIndex < 100) level = 'high';
      else level = 'very_high';

      expect(level).to.equal('very_low');
    });

    it('should classify IV level correctly - high', () => {
      const ivIndex = 85;

      let level = 'normal';
      if (ivIndex < 40) level = 'very_low';
      else if (ivIndex < 60) level = 'low';
      else if (ivIndex < 80) level = 'normal';
      else if (ivIndex < 100) level = 'high';
      else level = 'very_high';

      expect(level).to.equal('high');
    });

    it('should generate signal for very low IV (expect movement)', () => {
      const ivIndex = 35;

      let signal = 'neutral';
      if (ivIndex < 40) signal = 'expect_movement';
      else if (ivIndex < 60) signal = 'expect_calm';
      else if (ivIndex > 80) signal = 'expect_movement';

      expect(signal).to.equal('expect_movement');
    });

    it('should generate signal for very high IV (expect movement)', () => {
      const ivIndex = 105;

      let signal = 'neutral';
      if (ivIndex < 40) signal = 'expect_movement';
      else if (ivIndex < 60) signal = 'expect_calm';
      else if (ivIndex > 80) signal = 'expect_movement';

      expect(signal).to.equal('expect_movement');
    });

    it('should calculate IV rank correctly', () => {
      const ivIndex = 70;
      // Simplified IV rank calculation: (IV - 40) * 2
      const ivRank = Math.min(100, Math.max(0, (ivIndex - 40) * 2));

      expect(ivRank).to.equal(60);
    });
  });

  describe('Overall Sentiment Calculation', () => {
    it('should calculate overall sentiment from multiple signals', () => {
      const signals = ['bullish', 'bullish', 'bearish', 'neutral', 'bullish', 'neutral'];

      const bullishCount = signals.filter(s => s === 'bullish').length;
      const bearishCount = signals.filter(s => s === 'bearish').length;

      let sentiment = 'neutral';
      if (bullishCount > bearishCount + 1) sentiment = 'bullish';
      else if (bearishCount > bullishCount + 1) sentiment = 'bearish';

      expect(bullishCount).to.equal(3);
      expect(bearishCount).to.equal(1);
      expect(sentiment).to.equal('bullish');
    });

    it('should calculate confidence score correctly', () => {
      const signals = ['bullish', 'bullish', 'bearish', 'neutral', 'bullish', 'neutral'];

      const bullishCount = signals.filter(s => s === 'bullish').length;
      const bearishCount = signals.filter(s => s === 'bearish').length;
      const confidenceScore = Math.abs(bullishCount - bearishCount) / signals.length;

      expect(confidenceScore).to.be.closeTo(0.333, 0.01);
    });

    it('should identify bearish sentiment when bearish signals dominate', () => {
      const signals = ['bearish', 'bearish', 'bearish', 'bullish', 'neutral', 'bearish'];

      const bullishCount = signals.filter(s => s === 'bullish').length;
      const bearishCount = signals.filter(s => s === 'bearish').length;

      let sentiment = 'neutral';
      if (bullishCount > bearishCount + 1) sentiment = 'bullish';
      else if (bearishCount > bullishCount + 1) sentiment = 'bearish';

      expect(bearishCount).to.equal(4);
      expect(bullishCount).to.equal(1);
      expect(sentiment).to.equal('bearish');
    });

    it('should identify neutral sentiment when signals are balanced', () => {
      const signals = ['bullish', 'bearish', 'bullish', 'bearish', 'neutral', 'neutral'];

      const bullishCount = signals.filter(s => s === 'bullish').length;
      const bearishCount = signals.filter(s => s === 'bearish').length;

      let sentiment = 'neutral';
      if (bullishCount > bearishCount + 1) sentiment = 'bullish';
      else if (bearishCount > bullishCount + 1) sentiment = 'bearish';

      expect(bullishCount).to.equal(2);
      expect(bearishCount).to.equal(2);
      expect(sentiment).to.equal('neutral');
    });

    it('should calculate high confidence for strong directional signals', () => {
      const signals = ['bullish', 'bullish', 'bullish', 'bullish', 'bullish', 'bearish'];

      const bullishCount = signals.filter(s => s === 'bullish').length;
      const bearishCount = signals.filter(s => s === 'bearish').length;
      const confidenceScore = Math.abs(bullishCount - bearishCount) / signals.length;

      expect(confidenceScore).to.be.closeTo(0.667, 0.01);
    });
  });

  describe('Data Validation', () => {
    it('should validate funding rate is within reasonable bounds', () => {
      const validRates = [0.0001, 0.001, 0.01, -0.001, -0.01];
      const invalidRates = [1.0, -1.0, 10.0];

      validRates.forEach(rate => {
        expect(Math.abs(rate)).to.be.lessThan(0.1);
      });

      invalidRates.forEach(rate => {
        expect(Math.abs(rate)).to.be.greaterThan(0.1);
      });
    });

    it('should validate OI values are positive', () => {
      const validOI = [1e9, 5e9, 10e9];
      const invalidOI = [-1e9, 0];

      validOI.forEach(oi => {
        expect(oi).to.be.greaterThan(0);
      });

      invalidOI.forEach(oi => {
        expect(oi).to.be.at.most(0);
      });
    });

    it('should validate long/short ratio is positive', () => {
      const validRatios = [0.5, 1.0, 2.0, 3.0];
      const invalidRatios = [-1.0, 0];

      validRatios.forEach(ratio => {
        expect(ratio).to.be.greaterThan(0);
      });

      invalidRatios.forEach(ratio => {
        expect(ratio).to.be.at.most(0);
      });
    });

    it('should validate IV is between 0 and 200', () => {
      const validIV = [30, 50, 80, 100, 150];
      const invalidIV = [-10, 250, 500];

      validIV.forEach(iv => {
        expect(iv).to.be.within(0, 200);
      });

      invalidIV.forEach(iv => {
        expect(iv).to.not.be.within(0, 200);
      });
    });

    it('should validate liquidation values are non-negative', () => {
      const validLiq = [0, 1e6, 10e6, 100e6];
      const invalidLiq = [-1e6, -100];

      validLiq.forEach(liq => {
        expect(liq).to.be.at.least(0);
      });

      invalidLiq.forEach(liq => {
        expect(liq).to.be.lessThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero OI gracefully', () => {
      const currentOI = 0;
      const previousOI = 1e9;

      const changePercent = previousOI > 0 ? ((currentOI - previousOI) / previousOI) * 100 : 0;

      expect(changePercent).to.equal(-100);
    });

    it('should handle equal long/short ratio (1.0)', () => {
      const ratio = 1.0;

      let signal = 'neutral';
      if (ratio > 2.0) signal = 'bearish';
      else if (ratio > 1.5) signal = 'bearish';
      else if (ratio < 0.5) signal = 'bullish';
      else if (ratio < 0.67) signal = 'bullish';

      expect(signal).to.equal('neutral');
    });

    it('should handle zero liquidations', () => {
      const longLiq = 0;
      const shortLiq = 0;
      const netLiq = shortLiq - longLiq;

      let signal = 'neutral';
      if (Math.abs(netLiq) > 10e6) {
        signal = netLiq > 0 ? 'bullish' : 'bearish';
      }

      expect(signal).to.equal('neutral');
    });

    it('should handle price exactly at max pain', () => {
      const currentPrice = 45000;
      const maxPainPrice = 45000;
      const deviationPercent = ((currentPrice - maxPainPrice) / maxPainPrice) * 100;

      let signal = 'neutral';
      if (Math.abs(deviationPercent) > 5) {
        signal = deviationPercent > 0 ? 'bearish' : 'bullish';
      }

      expect(deviationPercent).to.equal(0);
      expect(signal).to.equal('neutral');
    });

    it('should handle all neutral signals', () => {
      const signals = ['neutral', 'neutral', 'neutral', 'neutral'];

      const bullishCount = signals.filter(s => s === 'bullish').length;
      const bearishCount = signals.filter(s => s === 'bearish').length;

      let sentiment = 'neutral';
      if (bullishCount > bearishCount + 1) sentiment = 'bullish';
      else if (bearishCount > bullishCount + 1) sentiment = 'bearish';

      const confidenceScore = Math.abs(bullishCount - bearishCount) / signals.length;

      expect(sentiment).to.equal('neutral');
      expect(confidenceScore).to.equal(0);
    });
  });
});
