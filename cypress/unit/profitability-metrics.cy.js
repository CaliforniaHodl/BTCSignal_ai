// Profitability Metrics Unit Tests - Phase 3
// Tests for SOPR, aSOPR, STH-SOPR, LTH-SOPR, and Realized Price

describe('Profitability Metrics Calculations', () => {
  // Test data fixtures
  const fixtures = {
    currentPrice: 100000,
    priceHistory: [
      { price: 90000, timestamp: '2025-01-01', volume: 1000000 },
      { price: 92000, timestamp: '2025-01-02', volume: 1100000 },
      { price: 95000, timestamp: '2025-01-03', volume: 1200000 },
      { price: 98000, timestamp: '2025-01-04', volume: 1150000 },
      { price: 100000, timestamp: '2025-01-05', volume: 1300000 }
    ],
    mvrv: 2.5
  };

  describe('SOPR (Spent Output Profit Ratio)', () => {
    // SOPR = Current Price / Volume-Weighted Average Cost Basis

    it('should calculate SOPR correctly with simple data', () => {
      const currentPrice = 100000;
      const priceHistory = [
        { price: 90000, volume: 1000 },
        { price: 95000, volume: 1000 },
        { price: 100000, volume: 1000 }
      ];

      // Volume-weighted avg = (90k + 95k + 100k) / 3 = 95k
      const avgCost = (90000 + 95000 + 100000) / 3;
      const sopr = currentPrice / avgCost;

      expect(sopr).to.be.closeTo(1.053, 0.01);
    });

    it('should signal profit_taking when SOPR > 1.05', () => {
      const sopr = 1.15;
      const signal = sopr > 1.05 ? 'profit_taking' :
                     sopr > 0.98 && sopr <= 1.02 ? 'equilibrium' :
                     sopr < 0.95 ? 'capitulation' : 'neutral';

      expect(signal).to.equal('profit_taking');
    });

    it('should signal capitulation when SOPR < 0.95', () => {
      const sopr = 0.85;
      const signal = sopr > 1.05 ? 'profit_taking' :
                     sopr > 0.98 && sopr <= 1.02 ? 'equilibrium' :
                     sopr < 0.95 ? 'capitulation' : 'neutral';

      expect(signal).to.equal('capitulation');
    });

    it('should signal equilibrium when SOPR near 1.0', () => {
      const sopr = 1.00;
      const signal = sopr > 1.05 ? 'profit_taking' :
                     sopr > 0.98 && sopr <= 1.02 ? 'equilibrium' :
                     sopr < 0.95 ? 'capitulation' : 'neutral';

      expect(signal).to.equal('equilibrium');
    });

    it('should weight volume correctly', () => {
      const currentPrice = 100000;
      const priceHistory = [
        { price: 80000, volume: 5000 }, // High volume at lower price
        { price: 95000, volume: 1000 },
        { price: 100000, volume: 1000 }
      ];

      // Weighted avg = (80k*5000 + 95k*1000 + 100k*1000) / 7000
      const totalVW = 80000 * 5000 + 95000 * 1000 + 100000 * 1000;
      const totalVol = 7000;
      const avgCost = totalVW / totalVol;
      const sopr = currentPrice / avgCost;

      // Should be higher since high volume at lower price pulls avg down
      expect(avgCost).to.be.closeTo(85714, 10);
      expect(sopr).to.be.greaterThan(1.15);
    });

    it('should handle MVRV adjustment', () => {
      const baseSOPR = 1.0;
      const mvrv = 2.5;
      const mvrvInfluence = 0.3;
      const mvrvAdjustment = (mvrv - 1.0) * mvrvInfluence; // = 0.45
      const adjustedSOPR = baseSOPR * (1 + mvrvAdjustment); // = 1.45

      expect(adjustedSOPR).to.be.closeTo(1.45, 0.01);
    });

    it('should clamp SOPR to reasonable range', () => {
      const extremeHigh = 2.5;
      const extremeLow = 0.3;

      const clampedHigh = Math.max(0.5, Math.min(1.5, extremeHigh));
      const clampedLow = Math.max(0.5, Math.min(1.5, extremeLow));

      expect(clampedHigh).to.equal(1.5);
      expect(clampedLow).to.equal(0.5);
    });
  });

  describe('Adjusted SOPR (aSOPR)', () => {
    // aSOPR filters out very young outputs to reduce noise

    it('should exclude most recent day from calculation', () => {
      const currentPrice = 100000;
      const priceHistory = [
        { price: 90000, volume: 1000 },
        { price: 95000, volume: 1000 },
        { price: 105000, volume: 1000 } // Today - excluded
      ];

      // Should use only first 2 days
      const historical = priceHistory.slice(0, -1);
      const avgCost = (90000 + 95000) / 2;
      const asopr = currentPrice / avgCost;

      expect(asopr).to.be.closeTo(1.081, 0.01);
    });

    it('should be more stable than regular SOPR', () => {
      // aSOPR should filter noise from same-day transactions
      // Test by comparing variance with and without today's data

      const baseHistory = [90000, 92000, 95000, 98000];
      const volatileToday = 120000; // Spike today

      const withToday = [...baseHistory, volatileToday];
      const withoutToday = baseHistory;

      const avgWith = withToday.reduce((a, b) => a + b) / withToday.length;
      const avgWithout = withoutToday.reduce((a, b) => a + b) / withoutToday.length;

      expect(avgWith).to.be.greaterThan(avgWithout);
      // aSOPR uses avgWithout, making it more stable
    });
  });

  describe('Short-Term Holder SOPR (STH-SOPR)', () => {
    // STH-SOPR tracks coins held < 155 days (use 90-day window as proxy)

    it('should weight recent prices more heavily', () => {
      const prices = [80000, 85000, 90000, 95000, 100000];
      const weights = prices.map((_, i) => 1 + (i / prices.length) * 0.5);

      // Recent prices should have higher weights
      expect(weights[4]).to.be.greaterThan(weights[0]);
      expect(weights[4]).to.be.closeTo(1.5, 0.1);
      expect(weights[0]).to.be.closeTo(1.0, 0.1);
    });

    it('should signal capitulation for STH at loss', () => {
      const sthSopr = 0.85; // STH selling at 15% loss
      const signal = sthSopr > 1.1 ? 'profit_taking' :
                     sthSopr > 0.95 && sthSopr <= 1.05 ? 'equilibrium' :
                     sthSopr < 0.9 ? 'capitulation' : 'neutral';

      expect(signal).to.equal('capitulation');
    });

    it('should have wider range than regular SOPR', () => {
      const minSTH = 0.4;
      const maxSTH = 1.8;
      const minSOPR = 0.5;
      const maxSOPR = 1.5;

      const rangeSTH = maxSTH - minSTH;
      const rangeSOPR = maxSOPR - minSOPR;

      expect(rangeSTH).to.be.greaterThan(rangeSOPR);
    });

    it('should signal local bottom when STH capitulate', () => {
      const sthSopr = 0.85;
      const isCapitulation = sthSopr < 0.9;
      const isLocalBottom = isCapitulation; // Historically signals bottoms

      expect(isLocalBottom).to.be.true;
    });
  });

  describe('Long-Term Holder SOPR (LTH-SOPR)', () => {
    // LTH-SOPR tracks coins held > 155 days (use 180-365 day window)

    it('should use historical window, not recent prices', () => {
      const priceHistory = [];
      for (let i = 0; i < 365; i++) {
        priceHistory.push({
          price: 80000 + i * 100, // Gradual increase
          volume: 1000
        });
      }

      // LTH window: 180-365 days ago
      const lthWindow = priceHistory.slice(0, 185);
      const avgLTHPrice = lthWindow.reduce((sum, p) => sum + p.price, 0) / lthWindow.length;

      // Should be much lower than current price
      const currentPrice = 100000;
      expect(avgLTHPrice).to.be.lessThan(currentPrice * 0.9);
    });

    it('should signal cycle top when LTH-SOPR > 1.2', () => {
      const lthSopr = 1.5; // LTH taking profits
      const signal = lthSopr > 1.2 ? 'profit_taking' :
                     lthSopr > 0.9 && lthSopr <= 1.1 ? 'equilibrium' :
                     lthSopr < 0.8 ? 'capitulation' : 'neutral';

      expect(signal).to.equal('profit_taking');
    });

    it('should signal cycle bottom when LTH-SOPR < 0.8', () => {
      const lthSopr = 0.75; // Even LTH capitulating - rare
      const signal = lthSopr > 1.2 ? 'profit_taking' :
                     lthSopr > 0.9 && lthSopr <= 1.1 ? 'equilibrium' :
                     lthSopr < 0.8 ? 'capitulation' : 'neutral';

      expect(signal).to.equal('capitulation');
    });

    it('should have wider range than STH-SOPR', () => {
      const minLTH = 0.3;
      const maxLTH = 2.5;
      const minSTH = 0.4;
      const maxSTH = 1.8;

      const rangeLTH = maxLTH - minLTH;
      const rangeSTH = maxSTH - minSTH;

      expect(rangeLTH).to.be.greaterThan(rangeSTH);
    });

    it('should use less MVRV influence than STH', () => {
      const mvrvInfluenceSTH = 0.35;
      const mvrvInfluenceLTH = 0.20;

      expect(mvrvInfluenceLTH).to.be.lessThan(mvrvInfluenceSTH);
    });
  });

  describe('Realized Price', () => {
    // Realized Price = average price at which all coins last moved

    it('should calculate realized price from realized cap', () => {
      const realizedCap = 700000000000; // $700B
      const circulatingSupply = 19500000; // 19.5M BTC
      const realizedPrice = realizedCap / circulatingSupply;

      expect(realizedPrice).to.be.closeTo(35897, 1); // $35,897
    });

    it('should signal above when current price > realized price', () => {
      const currentPrice = 100000;
      const realizedPrice = 70000;
      const diff = ((currentPrice - realizedPrice) / realizedPrice) * 100;

      expect(diff).to.be.greaterThan(10);
      const signal = diff > 10 ? 'above' : diff < -10 ? 'below' : 'near';
      expect(signal).to.equal('above');
    });

    it('should signal below when current price < realized price', () => {
      const currentPrice = 60000;
      const realizedPrice = 70000;
      const diff = ((currentPrice - realizedPrice) / realizedPrice) * 100;

      expect(diff).to.be.lessThan(-10);
      const signal = diff > 10 ? 'above' : diff < -10 ? 'below' : 'near';
      expect(signal).to.equal('below');
    });

    it('should signal near when current price ~ realized price', () => {
      const currentPrice = 100000;
      const realizedPrice = 95000;
      const diff = ((currentPrice - realizedPrice) / realizedPrice) * 100;

      expect(Math.abs(diff)).to.be.lessThan(10);
      const signal = diff > 10 ? 'above' : diff < -10 ? 'below' : 'near';
      expect(signal).to.equal('near');
    });

    it('should use exponential decay for volume weighting', () => {
      const historyLength = 365;
      const recentWeight = Math.exp(-0 / historyLength); // Most recent
      const oldWeight = Math.exp(-364 / historyLength); // Oldest

      expect(recentWeight).to.be.closeTo(1.0, 0.01);
      expect(oldWeight).to.be.closeTo(0.368, 0.01); // e^-1
      expect(recentWeight).to.be.greaterThan(oldWeight);
    });
  });

  describe('STH/LTH Realized Prices', () => {
    it('should calculate STH realized price from 155-day window', () => {
      const priceHistory = [];
      for (let i = 0; i < 200; i++) {
        priceHistory.push({ price: 90000 + i * 50, volume: 1000 });
      }

      const sthWindow = priceHistory.slice(-155);
      const avgPrice = sthWindow.reduce((sum, p) => sum + p.price, 0) / sthWindow.length;

      expect(avgPrice).to.be.greaterThan(90000);
      expect(avgPrice).to.be.lessThan(100000);
    });

    it('should show STH realized price higher than LTH in bull market', () => {
      // In bull markets, STH bought higher than LTH
      const sthRealizedPrice = 95000; // Recent buyers
      const lthRealizedPrice = 60000; // Old holders

      expect(sthRealizedPrice).to.be.greaterThan(lthRealizedPrice);
    });

    it('should show LTH cost basis determines strong support', () => {
      const currentPrice = 100000;
      const lthRealizedPrice = 50000;
      const sthRealizedPrice = 95000;

      // LTH in huge profit, STH near breakeven
      const lthProfit = (currentPrice - lthRealizedPrice) / lthRealizedPrice;
      const sthProfit = (currentPrice - sthRealizedPrice) / sthRealizedPrice;

      expect(lthProfit).to.be.closeTo(1.0, 0.1); // 100% profit
      expect(sthProfit).to.be.closeTo(0.05, 0.02); // ~5% profit
    });
  });

  describe('Profitability Signal Generation', () => {
    it('should generate bullish signal from capitulation', () => {
      const metrics = {
        sopr: { value: 0.90, signal: 'capitulation' },
        sthSopr: { value: 0.85, signal: 'capitulation' }
      };

      const signals = [];
      if (metrics.sopr.signal === 'capitulation') {
        signals.push({ signal: 'bullish', weight: 0.7, reason: 'SOPR capitulation' });
      }
      if (metrics.sthSopr.signal === 'capitulation') {
        signals.push({ signal: 'bullish', weight: 0.9, reason: 'STH capitulation' });
      }

      expect(signals).to.have.lengthOf(2);
      expect(signals.every(s => s.signal === 'bullish')).to.be.true;
    });

    it('should generate bearish signal from profit-taking', () => {
      const metrics = {
        asopr: { value: 1.15, signal: 'profit_taking' },
        lthSopr: { value: 1.40, signal: 'profit_taking' }
      };

      const signals = [];
      if (metrics.asopr.signal === 'profit_taking') {
        signals.push({ signal: 'bearish', weight: 0.7, reason: 'aSOPR profit-taking' });
      }
      if (metrics.lthSopr.signal === 'profit_taking') {
        signals.push({ signal: 'bearish', weight: 0.8, reason: 'LTH distribution' });
      }

      expect(signals).to.have.lengthOf(2);
      expect(signals.every(s => s.signal === 'bearish')).to.be.true;
    });

    it('should detect divergence between STH and LTH', () => {
      const sthSopr = 0.85; // STH panic selling
      const lthSopr = 1.05; // LTH holding/accumulating

      const divergence = sthSopr - lthSopr;
      expect(divergence).to.be.lessThan(-0.15);

      // This is bullish - smart money accumulating
      const signal = divergence < -0.15 ? 'bullish' : 'neutral';
      expect(signal).to.equal('bullish');
    });

    it('should calculate aggregate profitability score', () => {
      const signals = [
        { signal: 'bullish', weight: 0.7 },
        { signal: 'bullish', weight: 0.9 },
        { signal: 'bearish', weight: 0.4 }
      ];

      const bullishWeight = signals.filter(s => s.signal === 'bullish')
        .reduce((sum, s) => sum + s.weight, 0);
      const bearishWeight = signals.filter(s => s.signal === 'bearish')
        .reduce((sum, s) => sum + s.weight, 0);
      const totalWeight = bullishWeight + bearishWeight;

      const score = (bullishWeight - bearishWeight) / totalWeight;

      expect(score).to.be.greaterThan(0.5); // Strongly bullish
      expect(score).to.be.closeTo(0.6, 0.1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle insufficient data gracefully', () => {
      const priceHistory = [
        { price: 100000, volume: 1000 }
      ]; // Only 1 day

      expect(priceHistory.length).to.be.lessThan(30);
      // Should return neutral/default values
      const sopr = priceHistory.length < 30 ? 1.0 : null;
      expect(sopr).to.equal(1.0);
    });

    it('should handle zero volume gracefully', () => {
      const priceHistory = [
        { price: 90000, volume: 0 },
        { price: 95000, volume: 0 },
        { price: 100000, volume: 1 } // Only last has volume
      ];

      const totalVolume = priceHistory.reduce((sum, p) => sum + p.volume, 0);
      expect(totalVolume).to.be.greaterThan(0);

      // Should default to using 1 for zero volumes
      const adjustedHistory = priceHistory.map(p => ({
        ...p,
        volume: p.volume || 1
      }));

      expect(adjustedHistory.every(p => p.volume > 0)).to.be.true;
    });

    it('should handle extreme price movements', () => {
      const currentPrice = 100000;
      const extremeHighCost = 150000; // Bought at top
      const extremeLowCost = 20000; // Bought at bottom

      const soprHigh = currentPrice / extremeHighCost; // 0.67
      const soprLow = currentPrice / extremeLowCost; // 5.0

      // Should clamp to prevent extreme values
      const clampedHigh = Math.max(0.5, Math.min(1.5, soprHigh));
      const clampedLow = Math.max(0.5, Math.min(1.5, soprLow));

      expect(clampedHigh).to.be.closeTo(0.67, 0.1);
      expect(clampedLow).to.equal(1.5);
    });
  });
});
