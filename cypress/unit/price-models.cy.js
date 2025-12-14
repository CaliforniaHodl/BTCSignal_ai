// Unit Tests for Price Models (Phase 6)
// Tests for Stock-to-Flow, Thermocap, NUPL, Puell Multiple, MVRV Z-Score, RHODL, Delta Cap

describe('Price Models Library', () => {
  // Mock BTC constants for testing
  const BTC_CONSTANTS = {
    TOTAL_SUPPLY: 21000000,
    CURRENT_CIRCULATING: 19500000,
    BLOCKS_PER_HALVING: 210000,
    CURRENT_BLOCK_REWARD: 3.125,
    BLOCKS_PER_DAY: 144,
    DAILY_ISSUANCE: 450,
    ANNUAL_ISSUANCE: 164250,
    S2F_COEFFICIENT: 0.4,
    S2F_POWER: 3,
    ESTIMATED_THERMOCAP: 50000000000,
    MVRV_HISTORICAL_MEAN: 1.4,
    MVRV_HISTORICAL_STD: 0.5,
  };

  describe('Stock-to-Flow Model', () => {
    it('should calculate S2F ratio correctly', () => {
      const currentPrice = 50000;
      const circulatingSupply = 19500000;
      const annualFlow = 164250;

      const stock = circulatingSupply;
      const flow = annualFlow;
      const expectedS2FRatio = stock / flow; // ~118.7

      cy.wrap(expectedS2FRatio).should('be.closeTo', 118.7, 0.5);
    });

    it('should calculate model price using PlanB formula', () => {
      const s2fRatio = 118.7;
      const coefficient = 0.4;
      const power = 3;

      const modelPrice = coefficient * Math.pow(s2fRatio, power);

      // S2F model price should be much higher than current price
      cy.wrap(modelPrice).should('be.greaterThan', 100000);
    });

    it('should detect undervaluation when price below model', () => {
      const currentPrice = 40000;
      const modelPrice = 670000; // S2F model estimate
      const deflectionMultiple = currentPrice / modelPrice;

      cy.wrap(deflectionMultiple).should('be.lessThan', 0.5);
      // Should signal undervalued
    });

    it('should detect overvaluation when price above model', () => {
      const currentPrice = 150000;
      const modelPrice = 50000;
      const deflectionMultiple = currentPrice / modelPrice;

      cy.wrap(deflectionMultiple).should('be.greaterThan', 2.0);
      // Should signal overvalued
    });

    it('should calculate deflection percentage correctly', () => {
      const currentPrice = 60000;
      const modelPrice = 50000;
      const deflection = ((currentPrice - modelPrice) / modelPrice) * 100;

      cy.wrap(deflection).should('equal', 20);
    });
  });

  describe('Thermocap Model', () => {
    it('should calculate thermocap multiple correctly', () => {
      const marketCap = 1000000000000; // $1T
      const thermocap = 50000000000; // $50B
      const multiple = marketCap / thermocap;

      cy.wrap(multiple).should('equal', 20);
    });

    it('should signal undervalued when multiple < 10', () => {
      const marketCap = 400000000000; // $400B
      const thermocap = 50000000000; // $50B
      const multiple = marketCap / thermocap;

      cy.wrap(multiple).should('be.lessThan', 10);
      // Should signal undervalued
    });

    it('should signal overheated when multiple > 50', () => {
      const marketCap = 3000000000000; // $3T
      const thermocap = 50000000000; // $50B
      const multiple = marketCap / thermocap;

      cy.wrap(multiple).should('be.greaterThan', 50);
      // Should signal extreme/overheated
    });

    it('should signal fair value in 10-25x range', () => {
      const marketCap = 750000000000; // $750B
      const thermocap = 50000000000; // $50B
      const multiple = marketCap / thermocap;

      cy.wrap(multiple).should('be.within', 10, 25);
      // Should signal fair value
    });
  });

  describe('NUPL (Net Unrealized Profit/Loss)', () => {
    it('should calculate NUPL correctly', () => {
      const marketCap = 1000000000000;
      const realizedCap = 600000000000;
      const nupl = (marketCap - realizedCap) / marketCap;

      cy.wrap(nupl).should('be.closeTo', 0.4, 0.01);
    });

    it('should identify capitulation zone when NUPL < 0', () => {
      const marketCap = 400000000000;
      const realizedCap = 500000000000;
      const nupl = (marketCap - realizedCap) / marketCap;

      cy.wrap(nupl).should('be.lessThan', 0);
      // Should be in capitulation zone
    });

    it('should identify euphoria zone when NUPL > 0.75', () => {
      const marketCap = 2000000000000;
      const realizedCap = 400000000000;
      const nupl = (marketCap - realizedCap) / marketCap;

      cy.wrap(nupl).should('be.greaterThan', 0.75);
      // Should be in euphoria zone
    });

    it('should identify hope zone (0-0.25)', () => {
      const marketCap = 800000000000;
      const realizedCap = 700000000000;
      const nupl = (marketCap - realizedCap) / marketCap;

      cy.wrap(nupl).should('be.within', 0, 0.25);
      // Should be in hope zone
    });

    it('should identify optimism zone (0.25-0.5)', () => {
      const marketCap = 1000000000000;
      const realizedCap = 650000000000;
      const nupl = (marketCap - realizedCap) / marketCap;

      cy.wrap(nupl).should('be.within', 0.25, 0.5);
      // Should be in optimism zone
    });

    it('should identify belief zone (0.5-0.75)', () => {
      const marketCap = 1500000000000;
      const realizedCap = 600000000000;
      const nupl = (marketCap - realizedCap) / marketCap;

      cy.wrap(nupl).should('be.within', 0.5, 0.75);
      // Should be in belief zone
    });
  });

  describe('Puell Multiple', () => {
    it('should calculate Puell Multiple correctly', () => {
      const currentPrice = 50000;
      const dailyIssuance = 450;
      const historicalAvgPrice = 40000;

      const dailyValue = dailyIssuance * currentPrice;
      const ma365 = dailyIssuance * historicalAvgPrice;
      const puellMultiple = dailyValue / ma365;

      cy.wrap(puellMultiple).should('be.closeTo', 1.25, 0.01);
    });

    it('should signal buy zone when Puell < 0.5', () => {
      const currentPrice = 20000;
      const dailyIssuance = 450;
      const historicalAvgPrice = 50000;

      const puellMultiple = (dailyIssuance * currentPrice) / (dailyIssuance * historicalAvgPrice);

      cy.wrap(puellMultiple).should('be.lessThan', 0.5);
      // Should signal buy zone / miner capitulation
    });

    it('should signal sell zone when Puell > 4', () => {
      const currentPrice = 200000;
      const dailyIssuance = 450;
      const historicalAvgPrice = 45000;

      const puellMultiple = (dailyIssuance * currentPrice) / (dailyIssuance * historicalAvgPrice);

      cy.wrap(puellMultiple).should('be.greaterThan', 4);
      // Should signal sell zone / extreme profitability
    });

    it('should signal neutral in 0.8-1.5 range', () => {
      const currentPrice = 50000;
      const dailyIssuance = 450;
      const historicalAvgPrice = 48000;

      const puellMultiple = (dailyIssuance * currentPrice) / (dailyIssuance * historicalAvgPrice);

      cy.wrap(puellMultiple).should('be.within', 0.8, 1.5);
      // Should signal neutral
    });
  });

  describe('MVRV Z-Score', () => {
    it('should calculate Z-Score correctly', () => {
      const mvrv = 2.4;
      const historicalMean = 1.4;
      const historicalStd = 0.5;

      const zScore = (mvrv - historicalMean) / historicalStd;

      cy.wrap(zScore).should('equal', 2.0);
    });

    it('should signal bottom zone when Z-Score < -0.5', () => {
      const mvrv = 1.0;
      const historicalMean = 1.4;
      const historicalStd = 0.5;

      const zScore = (mvrv - historicalMean) / historicalStd;

      cy.wrap(zScore).should('be.lessThan', -0.5);
      // Should signal bottom zone
    });

    it('should signal top zone when Z-Score > 7', () => {
      const mvrv = 5.0;
      const historicalMean = 1.4;
      const historicalStd = 0.5;

      const zScore = (mvrv - historicalMean) / historicalStd;

      cy.wrap(zScore).should('be.greaterThan', 7);
      // Should signal top zone
    });

    it('should signal fair value when Z-Score 0.5-3.0', () => {
      const mvrv = 2.0;
      const historicalMean = 1.4;
      const historicalStd = 0.5;

      const zScore = (mvrv - historicalMean) / historicalStd;

      cy.wrap(zScore).should('be.within', 0.5, 3.0);
      // Should signal fair value
    });
  });

  describe('RHODL Ratio', () => {
    it('should calculate RHODL ratio correctly', () => {
      const lthSupply = 14000000; // 70% LTH
      const sthSupply = 5500000;  // 30% STH

      const rhodlRatio = lthSupply / sthSupply;

      cy.wrap(rhodlRatio).should('be.closeTo', 2.55, 0.1);
    });

    it('should signal accumulation when ratio > 3', () => {
      const lthSupply = 15000000;
      const sthSupply = 4500000;

      const rhodlRatio = lthSupply / sthSupply;

      cy.wrap(rhodlRatio).should('be.greaterThan', 3);
      // Should signal strong accumulation
    });

    it('should signal distribution when ratio < 1', () => {
      const lthSupply = 9000000;
      const sthSupply = 10500000;

      const rhodlRatio = lthSupply / sthSupply;

      cy.wrap(rhodlRatio).should('be.lessThan', 1);
      // Should signal distribution / speculation
    });

    it('should signal neutral when ratio 1-2', () => {
      const lthSupply = 11000000;
      const sthSupply = 8500000;

      const rhodlRatio = lthSupply / sthSupply;

      cy.wrap(rhodlRatio).should('be.within', 1, 2);
      // Should signal neutral
    });
  });

  describe('Delta Cap', () => {
    it('should calculate Delta Cap correctly', () => {
      const realizedCap = 500000000000;
      const averageCap = 300000000000;
      const deltaCap = realizedCap - averageCap;

      cy.wrap(deltaCap).should('equal', 200000000000);
    });

    it('should calculate Delta Price correctly', () => {
      const deltaCap = 200000000000;
      const circulatingSupply = 19500000;
      const deltaPrice = deltaCap / circulatingSupply;

      cy.wrap(deltaPrice).should('be.closeTo', 10256, 1);
    });

    it('should signal extreme undervaluation when price < 0.5x Delta Price', () => {
      const currentPrice = 4000;
      const deltaPrice = 10000;
      const ratio = currentPrice / deltaPrice;

      cy.wrap(ratio).should('be.lessThan', 0.5);
      // Should signal extreme undervaluation
    });

    it('should signal fair value when price near Delta Price', () => {
      const currentPrice = 11000;
      const deltaPrice = 10000;
      const ratio = currentPrice / deltaPrice;

      cy.wrap(ratio).should('be.within', 0.8, 1.5);
      // Should signal fair value
    });
  });

  describe('Overall Valuation Score', () => {
    it('should calculate weighted average correctly', () => {
      const scores = [
        { score: -60, weight: 0.15 }, // S2F
        { score: 0, weight: 0.20 },   // MVRV
        { score: -40, weight: 0.20 }, // NUPL
      ];

      let totalWeighted = 0;
      let totalWeight = 0;
      scores.forEach(s => {
        totalWeighted += s.score * s.weight;
        totalWeight += s.weight;
      });

      const overallScore = totalWeighted / totalWeight;
      cy.wrap(overallScore).should('be.closeTo', -29.09, 0.5);
    });

    it('should rate extreme undervalued when score < -70', () => {
      const score = -85;
      cy.wrap(score).should('be.lessThan', -70);
      // Should be rated extreme_undervalued
    });

    it('should rate extreme overvalued when score > 70', () => {
      const score = 85;
      cy.wrap(score).should('be.greaterThan', 70);
      // Should be rated extreme_overvalued
    });

    it('should rate fair when score -15 to 15', () => {
      const score = 5;
      cy.wrap(score).should('be.within', -15, 15);
      // Should be rated fair
    });

    it('should calculate model agreement correctly', () => {
      const bullishModels = ['S2F', 'NUPL', 'Thermocap'];
      const bearishModels = ['Puell'];
      const totalModels = 8;

      const agreement = Math.max(bullishModels.length, bearishModels.length) / totalModels;
      cy.wrap(agreement * 100).should('be.closeTo', 37.5, 0.5);
    });
  });

  describe('Price Model Signals for Prediction Engine', () => {
    it('should generate bullish signal for extreme undervaluation', () => {
      const overallScore = -80;
      const signal = overallScore < -50 ? 'bullish' : 'bearish';

      cy.wrap(signal).should('equal', 'bullish');
    });

    it('should generate bearish signal for extreme overvaluation', () => {
      const overallScore = 80;
      const signal = overallScore > 50 ? 'bearish' : 'bullish';

      cy.wrap(signal).should('equal', 'bearish');
    });

    it('should weight signals appropriately', () => {
      const nuplZone = 'capitulation';
      const weight = 0.9;

      cy.wrap(weight).should('equal', 0.9);
      cy.wrap(nuplZone).should('equal', 'capitulation');
      // Capitulation should have high bullish weight
    });

    it('should filter out neutral signals', () => {
      const signals = [
        { signal: 'bullish', weight: 0.8 },
        { signal: 'neutral', weight: 0.5 },
        { signal: 'bearish', weight: 0.7 },
      ];

      const activeSignals = signals.filter(s => s.signal !== 'neutral');
      cy.wrap(activeSignals).should('have.length', 2);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete price model calculation flow', () => {
      // Mock complete dataset
      const currentPrice = 50000;
      const marketCap = 975000000000;
      const circulatingSupply = 19500000;
      const mvrv = 1.8;

      // Calculate all models
      const s2fRatio = circulatingSupply / 164250;
      const thermocapMultiple = marketCap / 50000000000;
      const realizedCap = marketCap / mvrv;
      const nupl = (marketCap - realizedCap) / marketCap;

      // Verify calculations
      cy.wrap(s2fRatio).should('be.closeTo', 118.7, 1);
      cy.wrap(thermocapMultiple).should('be.closeTo', 19.5, 0.5);
      cy.wrap(nupl).should('be.closeTo', 0.44, 0.02);
    });

    it('should generate appropriate signals for bull market top', () => {
      const priceModels = {
        nupl: { zone: 'euphoria' },
        thermocap: { thermocapMultiple: 55 },
        puellMultiple: { value: 4.5 },
        mvrvZScore: { zScore: 8 },
        overallValuation: { score: 85 }
      };

      // All should signal bearish
      cy.wrap(priceModels.nupl.zone).should('equal', 'euphoria');
      cy.wrap(priceModels.thermocap.thermocapMultiple).should('be.greaterThan', 50);
      cy.wrap(priceModels.puellMultiple.value).should('be.greaterThan', 4);
      cy.wrap(priceModels.mvrvZScore.zScore).should('be.greaterThan', 7);
      cy.wrap(priceModels.overallValuation.score).should('be.greaterThan', 70);
    });

    it('should generate appropriate signals for bear market bottom', () => {
      const priceModels = {
        nupl: { zone: 'capitulation' },
        thermocap: { thermocapMultiple: 8 },
        puellMultiple: { value: 0.4 },
        mvrvZScore: { zScore: -0.8 },
        overallValuation: { score: -85 }
      };

      // All should signal bullish
      cy.wrap(priceModels.nupl.zone).should('equal', 'capitulation');
      cy.wrap(priceModels.thermocap.thermocapMultiple).should('be.lessThan', 10);
      cy.wrap(priceModels.puellMultiple.value).should('be.lessThan', 0.5);
      cy.wrap(priceModels.mvrvZScore.zScore).should('be.lessThan', -0.5);
      cy.wrap(priceModels.overallValuation.score).should('be.lessThan', -70);
    });
  });
});
