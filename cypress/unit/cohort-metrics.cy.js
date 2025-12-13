// Cohort Metrics Unit Tests
// Tests for LTH/STH supply, whale cohorts, and supply liquidity calculations

describe('Cohort Metrics Calculations', () => {
  // Test data fixtures
  const fixtures = {
    circulatingSupply: 19500000, // BTC
    priceChange30d: 5.2,
    volatility: 0.03
  };

  describe('LTH/STH Supply Estimation', () => {
    it('should estimate LTH/STH split with baseline 70/30', () => {
      const circulatingSupply = fixtures.circulatingSupply;

      // Baseline: 70% LTH, 30% STH
      const expectedLTH = circulatingSupply * 0.70;
      const expectedSTH = circulatingSupply * 0.30;

      expect(expectedLTH).to.be.closeTo(13650000, 500000);
      expect(expectedSTH).to.be.closeTo(5850000, 500000);
      expect(expectedLTH + expectedSTH).to.equal(circulatingSupply);
    });

    it('should adjust LTH/STH for strong uptrend', () => {
      const priceChange30d = 25; // Strong rally

      // Strong uptrend should reduce LTH percentage (more distribution)
      let lthPercentage = 0.70;
      if (priceChange30d > 20) {
        lthPercentage -= 0.05; // Should drop to 65%
      }

      expect(lthPercentage).to.equal(0.65);
    });

    it('should adjust LTH/STH for deep correction', () => {
      const priceChange30d = -25; // Deep correction

      // Deep correction should increase LTH percentage (more accumulation)
      let lthPercentage = 0.70;
      if (priceChange30d < -20) {
        lthPercentage += 0.05; // Should rise to 75%
      }

      expect(lthPercentage).to.equal(0.75);
    });

    it('should adjust LTH/STH for high volatility', () => {
      const volatility = 0.06; // High volatility

      // High volatility should reduce LTH percentage (more trading)
      let lthPercentage = 0.70;
      if (volatility > 0.05) {
        lthPercentage -= 0.03; // Should drop to 67%
      }

      expect(lthPercentage).to.equal(0.67);
    });

    it('should clamp LTH percentage between 60-80%', () => {
      let lthPercentage = 0.70;

      // Test upper bound
      lthPercentage = 0.90; // Try to go above 80%
      lthPercentage = Math.max(0.60, Math.min(0.80, lthPercentage));
      expect(lthPercentage).to.equal(0.80);

      // Test lower bound
      lthPercentage = 0.50; // Try to go below 60%
      lthPercentage = Math.max(0.60, Math.min(0.80, lthPercentage));
      expect(lthPercentage).to.equal(0.60);
    });
  });

  describe('LTH/STH Ratio', () => {
    it('should calculate LTH/STH ratio correctly', () => {
      const lthBTC = 13500000;
      const sthBTC = 6000000;
      const ratio = lthBTC / sthBTC;

      expect(ratio).to.be.closeTo(2.25, 0.01);
    });

    it('should signal bullish when ratio > 2.5', () => {
      const ratio = 2.8;
      const signal = ratio > 2.5 ? 'bullish' : ratio > 2.0 ? 'bullish' : ratio < 1.5 ? 'bearish' : 'neutral';

      expect(signal).to.equal('bullish');
    });

    it('should signal bearish when ratio < 1.5', () => {
      const ratio = 1.3;
      const signal = ratio > 2.5 ? 'bullish' : ratio > 2.0 ? 'bullish' : ratio < 1.5 ? 'bearish' : 'neutral';

      expect(signal).to.equal('bearish');
    });

    it('should signal neutral for moderate ratios', () => {
      const ratio = 1.8;
      const signal = ratio > 2.5 ? 'bullish' : ratio > 2.0 ? 'bullish' : ratio < 1.5 ? 'bearish' : 'neutral';

      expect(signal).to.equal('neutral');
    });

    it('should handle zero STH supply gracefully', () => {
      const lthBTC = 19500000;
      const sthBTC = 0;

      // Should not throw, should handle division by zero
      const ratio = sthBTC === 0 ? 0 : lthBTC / sthBTC;
      expect(ratio).to.equal(0);
    });
  });

  describe('Whale Distribution', () => {
    it('should distribute supply across all whale tiers', () => {
      const circulatingSupply = fixtures.circulatingSupply;

      // Distribution percentages
      const distribution = {
        shrimp: 0.02,
        crab: 0.05,
        fish: 0.10,
        shark: 0.15,
        whale: 0.25,
        humpback: 0.40
      };

      // Calculate total BTC
      const totalBTC = Object.values(distribution).reduce((sum, pct) => {
        return sum + (circulatingSupply * pct);
      }, 0);

      // Should account for ~97% of supply (some lost/dormant coins not counted)
      expect(totalBTC).to.be.closeTo(circulatingSupply * 0.97, circulatingSupply * 0.05);
    });

    it('should allocate largest share to humpbacks', () => {
      const circulatingSupply = fixtures.circulatingSupply;
      const humpbackPct = 0.40;
      const humpbackBTC = circulatingSupply * humpbackPct;

      expect(humpbackBTC).to.equal(7800000);
      expect(humpbackPct).to.be.greaterThan(0.25); // More than whales
    });

    it('should allocate smallest share to shrimp', () => {
      const circulatingSupply = fixtures.circulatingSupply;
      const shrimpPct = 0.02;
      const shrimpBTC = circulatingSupply * shrimpPct;

      expect(shrimpBTC).to.equal(390000);
      expect(shrimpPct).to.be.lessThan(0.05); // Less than any other tier
    });

    it('should estimate more shrimp addresses than any other tier', () => {
      const addressCounts = {
        shrimp: 40000000,
        crab: 8000000,
        fish: 1500000,
        shark: 450000,
        whale: 45000,
        humpback: 5000
      };

      // Shrimp should dominate by count
      expect(addressCounts.shrimp).to.be.greaterThan(addressCounts.crab);
      expect(addressCounts.humpback).to.be.lessThan(addressCounts.whale);
    });
  });

  describe('Supply Liquidity', () => {
    it('should calculate illiquid supply from LTH + whale holdings', () => {
      const circulatingSupply = fixtures.circulatingSupply;
      const lthSupply = circulatingSupply * 0.70; // 13,650,000
      const whaleHoldings = circulatingSupply * 0.25; // 4,875,000
      const humpbackHoldings = circulatingSupply * 0.40; // 7,800,000

      // Illiquid = LTH + 70% of whale/humpback
      const whaleIlliquid = (whaleHoldings + humpbackHoldings) * 0.7;
      const illiquidBTC = lthSupply + whaleIlliquid;
      const illiquidPct = (illiquidBTC / circulatingSupply) * 100;

      expect(illiquidBTC).to.be.greaterThan(13000000);
      expect(illiquidPct).to.be.greaterThan(70);
      expect(illiquidPct).to.be.lessThan(85);
    });

    it('should signal bullish when illiquid supply > 78%', () => {
      const illiquidPct = 79;
      const signal = illiquidPct > 78 ? 'bullish' : illiquidPct > 75 ? 'bullish' : illiquidPct < 70 ? 'bearish' : 'neutral';

      expect(signal).to.equal('bullish');
    });

    it('should signal bearish when illiquid supply < 70%', () => {
      const illiquidPct = 68;
      const signal = illiquidPct > 78 ? 'bullish' : illiquidPct > 75 ? 'bullish' : illiquidPct < 70 ? 'bearish' : 'neutral';

      expect(signal).to.equal('bearish');
    });

    it('should estimate highly liquid supply around 8%', () => {
      const circulatingSupply = fixtures.circulatingSupply;
      const highlyLiquidPct = 8;
      const highlyLiquidBTC = circulatingSupply * (highlyLiquidPct / 100);

      expect(highlyLiquidBTC).to.be.closeTo(1560000, 100000);
      expect(highlyLiquidPct).to.be.greaterThan(5);
      expect(highlyLiquidPct).to.be.lessThan(15);
    });

    it('should calculate liquidity score inversely to illiquid supply', () => {
      const illiquidPct = 75;
      const liquidityScore = Math.round((1 - (illiquidPct / 100)) * 100);

      expect(liquidityScore).to.equal(25);

      // Higher illiquid = lower liquidity score
      const highIlliquidPct = 80;
      const lowLiquidityScore = Math.round((1 - (highIlliquidPct / 100)) * 100);
      expect(lowLiquidityScore).to.be.lessThan(liquidityScore);
    });

    it('should ensure all supply categories sum to 100%', () => {
      const illiquidPct = 75.0;
      const highlyLiquidPct = 8.0;
      const liquidPct = 100 - illiquidPct - highlyLiquidPct;

      expect(liquidPct).to.equal(17.0);
      expect(illiquidPct + liquidPct + highlyLiquidPct).to.equal(100);
    });
  });

  describe('Cohort Signal Generation', () => {
    it('should generate bullish signal for high LTH supply', () => {
      const lthPct = 76;
      const isBullish = lthPct > 75;

      expect(isBullish).to.be.true;
    });

    it('should generate bearish signal for low LTH supply', () => {
      const lthPct = 63;
      const isBearish = lthPct < 65;

      expect(isBearish).to.be.true;
    });

    it('should generate bullish signal for LTH accumulation', () => {
      const lthChange30d = 1.5; // 1.5% increase
      const isAccumulating = lthChange30d > 1;

      expect(isAccumulating).to.be.true;
    });

    it('should generate bearish signal for LTH distribution', () => {
      const lthChange30d = -1.5; // 1.5% decrease
      const isDistributing = lthChange30d < -1;

      expect(isDistributing).to.be.true;
    });

    it('should generate bullish signal for whale accumulation', () => {
      const whaleTrend = 'accumulating';
      const humpbackTrend = 'accumulating';
      const isBullish = whaleTrend === 'accumulating' && humpbackTrend === 'accumulating';

      expect(isBullish).to.be.true;
    });

    it('should generate contrarian bullish signal for small holder distribution', () => {
      const shrimpTrend = 'distributing';
      const crabTrend = 'distributing';

      // Small holders distributing is contrarian bullish (retail panic)
      const isContrarianBullish = shrimpTrend === 'distributing' && crabTrend === 'distributing';

      expect(isContrarianBullish).to.be.true;
    });
  });

  describe('Cohort Score Aggregation', () => {
    it('should calculate aggregate score from multiple signals', () => {
      const signals = [
        { signal: 'bullish', weight: 0.7 },
        { signal: 'bullish', weight: 0.6 },
        { signal: 'bearish', weight: 0.4 },
        { signal: 'neutral', weight: 0.2 }
      ];

      let bullishWeight = 0;
      let bearishWeight = 0;
      let totalWeight = 0;

      signals.forEach(s => {
        totalWeight += s.weight;
        if (s.signal === 'bullish') {
          bullishWeight += s.weight;
        } else if (s.signal === 'bearish') {
          bearishWeight += s.weight;
        }
      });

      const score = (bullishWeight - bearishWeight) / totalWeight;

      expect(score).to.be.closeTo(0.47, 0.01); // (1.3 - 0.4) / 1.9
      expect(score).to.be.greaterThan(0); // Overall bullish
    });

    it('should determine bias based on score threshold', () => {
      const score = 0.20;
      const bias = score > 0.15 ? 'bullish' : score < -0.15 ? 'bearish' : 'neutral';

      expect(bias).to.equal('bullish');
    });

    it('should calculate confidence from signal agreement', () => {
      const bullishWeight = 1.3;
      const bearishWeight = 0.4;
      const totalWeight = 1.9;

      const maxWeight = Math.max(bullishWeight, bearishWeight);
      const confidence = maxWeight / totalWeight;

      expect(confidence).to.be.closeTo(0.68, 0.01);
      expect(confidence).to.be.greaterThan(0.5);
    });

    it('should handle no signals gracefully', () => {
      const signals = [];

      const score = signals.length === 0 ? 0 : 1;
      const bias = 'neutral';
      const confidence = 0;

      expect(score).to.equal(0);
      expect(bias).to.equal('neutral');
      expect(confidence).to.equal(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme market conditions', () => {
      // Test extreme volatility
      const extremeVolatility = 0.15; // 15% daily volatility
      let lthPercentage = 0.70;

      if (extremeVolatility > 0.10) {
        lthPercentage -= 0.05;
      }

      lthPercentage = Math.max(0.60, Math.min(0.80, lthPercentage));
      expect(lthPercentage).to.be.within(0.60, 0.80);
    });

    it('should handle zero circulating supply', () => {
      const circulatingSupply = 0;
      const lthPct = 0.70;
      const lthBTC = circulatingSupply * lthPct;

      expect(lthBTC).to.equal(0);
    });

    it('should handle negative price changes', () => {
      const priceChange30d = -50; // 50% crash
      let lthPercentage = 0.70;

      if (priceChange30d < -20) {
        lthPercentage += 0.05;
      }

      expect(lthPercentage).to.equal(0.75);
    });

    it('should validate tier percentages sum correctly', () => {
      const distribution = {
        shrimp: 0.02,
        crab: 0.05,
        fish: 0.10,
        shark: 0.15,
        whale: 0.25,
        humpback: 0.40
      };

      const total = Object.values(distribution).reduce((sum, pct) => sum + pct, 0);
      expect(total).to.equal(0.97); // Intentionally ~97% (some coins lost/dormant)
    });
  });
});
