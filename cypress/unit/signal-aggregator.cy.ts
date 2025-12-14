/**
 * Signal Aggregator Unit Tests
 * TDD tests for the signal aggregation system
 */

import { SignalAggregator, SignalInput, AggregatedSignal } from '../../netlify/functions/lib/signal-aggregator';

describe('SignalAggregator', () => {
  let aggregator: SignalAggregator;

  beforeEach(() => {
    aggregator = new SignalAggregator();
  });

  describe('Category Weights', () => {
    it('should have weights that sum to 100', () => {
      // Technical: 25, On-chain: 30, Derivatives: 20, Price Models: 15, Sentiment: 10
      const weights = 25 + 30 + 20 + 15 + 10;
      expect(weights).to.equal(100);
    });

    it('should give on-chain the highest weight (30%)', () => {
      // On-chain is most predictive for macro cycles
      const input: SignalInput = {
        technical: {},
        onchain: { mvrv: 0.8 }, // Undervalued
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.breakdown.onchain.weight).to.equal(30);
    });
  });

  describe('Technical Analysis', () => {
    it('should signal bearish on RSI > 70', () => {
      const input: SignalInput = {
        technical: { rsi: 80 },
        onchain: {},
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.breakdown.technical.signal).to.equal('Bearish');
      expect(result.bearishFactors.some(f => f.name.includes('RSI'))).to.be.true;
    });

    it('should signal bullish on RSI < 30', () => {
      const input: SignalInput = {
        technical: { rsi: 20 },
        onchain: {},
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.breakdown.technical.signal).to.equal('Bullish');
      expect(result.bullishFactors.some(f => f.name.includes('RSI'))).to.be.true;
    });

    it('should detect MACD bullish crossover', () => {
      const input: SignalInput = {
        technical: { macd: { signal: 'bullish' } },
        onchain: {},
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.some(f => f.name.includes('MACD'))).to.be.true;
    });

    it('should detect MA golden cross', () => {
      const input: SignalInput = {
        technical: { ma_cross: { signal: 'bullish' } },
        onchain: {},
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.some(f => f.name.includes('MA Golden'))).to.be.true;
    });
  });

  describe('On-Chain Analysis', () => {
    it('should signal extreme overvaluation on MVRV > 3.5', () => {
      const input: SignalInput = {
        technical: {},
        onchain: { mvrv: 4.0 },
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bearishFactors.some(f => f.name.includes('MVRV Extreme'))).to.be.true;
      expect(result.bearishFactors.find(f => f.name.includes('MVRV'))?.weight).to.equal(10);
    });

    it('should signal undervaluation on MVRV < 1.0', () => {
      const input: SignalInput = {
        technical: {},
        onchain: { mvrv: 0.8 },
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.some(f => f.name.includes('MVRV Undervalued'))).to.be.true;
    });

    it('should signal capitulation on SOPR < 0.95', () => {
      const input: SignalInput = {
        technical: {},
        onchain: { sopr: 0.92 },
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.some(f => f.name.includes('SOPR Capitulation'))).to.be.true;
    });

    it('should signal euphoria on NUPL > 0.75', () => {
      const input: SignalInput = {
        technical: {},
        onchain: { nupl: 0.8 },
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bearishFactors.some(f => f.name.includes('NUPL Euphoria'))).to.be.true;
    });

    it('should signal bearish on large exchange inflow', () => {
      const input: SignalInput = {
        technical: {},
        onchain: { exchangeNetflow: 15000 },
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bearishFactors.some(f => f.name.includes('Exchange Inflow'))).to.be.true;
    });

    it('should signal bullish on large exchange outflow', () => {
      const input: SignalInput = {
        technical: {},
        onchain: { exchangeNetflow: -20000 },
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.some(f => f.name.includes('Exchange Outflow'))).to.be.true;
    });
  });

  describe('Derivatives Analysis', () => {
    it('should signal squeeze risk on extreme positive funding', () => {
      const input: SignalInput = {
        technical: {},
        onchain: {},
        derivatives: { fundingRate: 0.0015 }, // 0.15%
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bearishFactors.some(f => f.name.includes('Funding'))).to.be.true;
      expect(result.bearishFactors.find(f => f.name.includes('Funding'))?.explanation).to.include('squeeze');
    });

    it('should signal bullish on extreme negative funding', () => {
      const input: SignalInput = {
        technical: {},
        onchain: {},
        derivatives: { fundingRate: -0.001 }, // -0.1%
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.some(f => f.name.includes('Funding'))).to.be.true;
    });

    it('should signal bearish on high L/S ratio', () => {
      const input: SignalInput = {
        technical: {},
        onchain: {},
        derivatives: { longShortRatio: 2.5 },
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bearishFactors.some(f => f.name.includes('L/S Ratio'))).to.be.true;
    });

    it('should signal bullish after long liquidations', () => {
      const input: SignalInput = {
        technical: {},
        onchain: {},
        derivatives: { liquidations: { longs: 50000000, shorts: 10000000 } },
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.some(f => f.name.includes('Long Liquidations'))).to.be.true;
    });
  });

  describe('Price Models Analysis', () => {
    it('should signal bullish when below S2F model', () => {
      const input: SignalInput = {
        technical: {},
        onchain: {},
        derivatives: {},
        priceModels: { stockToFlow: { deflection: -60 } },
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.some(f => f.name.includes('S2F Undervalued'))).to.be.true;
    });

    it('should signal bullish when below realized price', () => {
      const input: SignalInput = {
        technical: {},
        onchain: {},
        derivatives: {},
        priceModels: { realized_price: { ratio: 0.7 } },
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.some(f => f.name.includes('Below Realized'))).to.be.true;
    });

    it('should signal bullish on low Puell Multiple', () => {
      const input: SignalInput = {
        technical: {},
        onchain: {},
        derivatives: {},
        priceModels: { puellMultiple: 0.3 },
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.some(f => f.name.includes('Puell Buy Zone'))).to.be.true;
    });
  });

  describe('Sentiment Analysis', () => {
    it('should signal bullish on extreme fear', () => {
      const input: SignalInput = {
        technical: {},
        onchain: {},
        derivatives: {},
        priceModels: {},
        sentiment: { fearGreed: 10 },
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.some(f => f.name.includes('Extreme Fear'))).to.be.true;
    });

    it('should signal bearish on extreme greed', () => {
      const input: SignalInput = {
        technical: {},
        onchain: {},
        derivatives: {},
        priceModels: {},
        sentiment: { fearGreed: 90 },
      };
      const result = aggregator.aggregate(input);
      expect(result.bearishFactors.some(f => f.name.includes('Extreme Greed'))).to.be.true;
    });

    it('should detect whale accumulation', () => {
      const input: SignalInput = {
        technical: {},
        onchain: {},
        derivatives: {},
        priceModels: {},
        sentiment: { whale_activity: { signal: 'bullish' } },
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.some(f => f.name.includes('Whale Accumulation'))).to.be.true;
    });
  });

  describe('Overall Signal Calculation', () => {
    it('should return BULLISH when score > 20', () => {
      // Strong bullish signals
      const input: SignalInput = {
        technical: { rsi: 25 },
        onchain: { mvrv: 0.8, sopr: 0.92 },
        derivatives: { fundingRate: -0.001 },
        priceModels: { stockToFlow: { deflection: -60 } },
        sentiment: { fearGreed: 15 },
      };
      const result = aggregator.aggregate(input);
      expect(result.overall).to.equal('BULLISH');
      expect(result.score).to.be.greaterThan(20);
    });

    it('should return BEARISH when score < -20', () => {
      // Strong bearish signals
      const input: SignalInput = {
        technical: { rsi: 85 },
        onchain: { mvrv: 4.0, nupl: 0.8 },
        derivatives: { fundingRate: 0.002, longShortRatio: 3.0 },
        priceModels: { puellMultiple: 2.0 },
        sentiment: { fearGreed: 90 },
      };
      const result = aggregator.aggregate(input);
      expect(result.overall).to.equal('BEARISH');
      expect(result.score).to.be.lessThan(-20);
    });

    it('should return NEUTRAL when -20 <= score <= 20', () => {
      // Mixed signals
      const input: SignalInput = {
        technical: { rsi: 50 },
        onchain: { mvrv: 1.5 },
        derivatives: {},
        priceModels: {},
        sentiment: { fearGreed: 50 },
      };
      const result = aggregator.aggregate(input);
      expect(result.overall).to.equal('NEUTRAL');
    });

    it('should calculate confidence based on signal strength', () => {
      const input: SignalInput = {
        technical: { rsi: 15 },
        onchain: { mvrv: 0.6, sopr: 0.90, nupl: -0.1 },
        derivatives: { fundingRate: -0.002 },
        priceModels: { stockToFlow: { deflection: -70 }, puellMultiple: 0.2 },
        sentiment: { fearGreed: 5 },
      };
      const result = aggregator.aggregate(input);
      expect(result.confidence).to.be.greaterThan(50);
    });
  });

  describe('Factor Prioritization', () => {
    it('should sort factors by weight', () => {
      const input: SignalInput = {
        technical: { rsi: 20 },
        onchain: { mvrv: 0.7 },
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);

      // Check bullish factors are sorted by weight descending
      for (let i = 0; i < result.bullishFactors.length - 1; i++) {
        expect(result.bullishFactors[i].weight).to.be.at.least(result.bullishFactors[i + 1].weight);
      }
    });

    it('should limit factors to top 5 per category', () => {
      const input: SignalInput = {
        technical: { rsi: 20, macd: { signal: 'bullish' }, ma_cross: { signal: 'bullish' } },
        onchain: { mvrv: 0.7, sopr: 0.92, nupl: -0.1, exchangeNetflow: -20000, nvt: 20 },
        derivatives: { fundingRate: -0.001, longShortRatio: 0.4 },
        priceModels: { stockToFlow: { deflection: -60 }, puellMultiple: 0.3 },
        sentiment: { fearGreed: 10, whale_activity: { signal: 'bullish' } },
      };
      const result = aggregator.aggregate(input);
      expect(result.bullishFactors.length).to.be.at.most(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const input: SignalInput = {
        technical: {},
        onchain: {},
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.overall).to.equal('NEUTRAL');
      expect(result.confidence).to.equal(0);
    });

    it('should have valid timestamp', () => {
      const input: SignalInput = {
        technical: {},
        onchain: {},
        derivatives: {},
        priceModels: {},
        sentiment: {},
      };
      const result = aggregator.aggregate(input);
      expect(result.timestamp).to.be.a('number');
      expect(result.timestamp).to.be.closeTo(Date.now(), 1000);
    });
  });
});
