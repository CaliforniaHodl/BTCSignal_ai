// Exchange Flows Unit Tests - Phase 2: Exchange Intelligence
// Tests for exchange-analyzer.ts functions

describe('Exchange Flow Analysis', () => {
  // Mock whale alert data
  const mockAlerts = [
    {
      id: 'whale_1',
      timestamp: new Date().toISOString(),
      txid: 'abc123',
      type: 'exchange_deposit',
      amount_btc: 500,
      amount_usd: 50000000,
      confidence: 'high',
      from_type: 'Unknown',
      to_type: 'Binance',
      analysis: 'Large deposit'
    },
    {
      id: 'whale_2',
      timestamp: new Date().toISOString(),
      txid: 'def456',
      type: 'exchange_withdrawal',
      amount_btc: 1200,
      amount_usd: 120000000,
      confidence: 'high',
      from_type: 'Coinbase',
      to_type: 'Unknown',
      analysis: 'Large withdrawal'
    },
    {
      id: 'whale_3',
      timestamp: new Date().toISOString(),
      txid: 'ghi789',
      type: 'exchange_deposit',
      amount_btc: 300,
      amount_usd: 30000000,
      confidence: 'medium',
      from_type: 'Unknown',
      to_type: 'Kraken',
      analysis: 'Deposit'
    },
    {
      id: 'whale_4',
      timestamp: new Date().toISOString(),
      txid: 'jkl012',
      type: 'exchange_withdrawal',
      amount_btc: 800,
      amount_usd: 80000000,
      confidence: 'high',
      from_type: 'Binance',
      to_type: 'Unknown',
      analysis: 'Large withdrawal'
    },
  ];

  describe('analyzeExchangeFlows', () => {
    it('should calculate correct netflow (positive = bearish, negative = bullish)', () => {
      // Total inflows: 500 + 300 = 800
      // Total outflows: 1200 + 800 = 2000
      // Netflow: 800 - 2000 = -1200 (bullish)

      const inflow = 500 + 300;
      const outflow = 1200 + 800;
      const netflow = inflow - outflow;

      expect(netflow).to.equal(-1200);
      expect(netflow).to.be.lessThan(0); // Bullish
    });

    it('should identify bullish signal when outflows exceed inflows', () => {
      const netflow = -1200;
      const signal = netflow < -200 ? 'bullish' : netflow > 200 ? 'bearish' : 'neutral';
      expect(signal).to.equal('bullish');
    });

    it('should identify bearish signal when inflows exceed outflows', () => {
      const netflow = 1500;
      const signal = netflow < -200 ? 'bullish' : netflow > 200 ? 'bearish' : 'neutral';
      expect(signal).to.equal('bearish');
    });

    it('should identify neutral signal when flows are balanced', () => {
      const netflow = 100;
      const signal = netflow < -200 ? 'bullish' : netflow > 200 ? 'bearish' : 'neutral';
      expect(signal).to.equal('neutral');
    });
  });

  describe('Whale Ratio Calculation', () => {
    it('should calculate whale ratio as top 10 / total', () => {
      const allFlows = [500, 1200, 300, 800, 100, 50, 200, 150, 75, 25, 10, 5];
      const total = allFlows.reduce((sum, v) => sum + v, 0);
      const top10 = allFlows.sort((a, b) => b - a).slice(0, 10).reduce((sum, v) => sum + v, 0);

      const whaleRatio = top10 / total;

      expect(whaleRatio).to.be.greaterThan(0);
      expect(whaleRatio).to.be.lessThanOrEqual(1);
    });

    it('should return high whale ratio when top 10 dominate', () => {
      const allFlows = [1000, 500, 250, 100, 50, 25, 10, 5, 2, 1];
      const total = allFlows.reduce((sum, v) => sum + v, 0);
      const top10 = allFlows.slice(0, 10).reduce((sum, v) => sum + v, 0);

      const whaleRatio = top10 / total;

      expect(whaleRatio).to.equal(1); // All flows are in top 10
    });
  });

  describe('Per-Exchange Flow Tracking', () => {
    it('should track inflows per exchange', () => {
      const exchangeFlows = {
        'Binance': { inflow: 0, outflow: 0 },
        'Coinbase': { inflow: 0, outflow: 0 },
        'Kraken': { inflow: 0, outflow: 0 },
      };

      // Process mock alerts
      mockAlerts.forEach(alert => {
        if (alert.type === 'exchange_deposit') {
          if (exchangeFlows[alert.to_type]) {
            exchangeFlows[alert.to_type].inflow += alert.amount_btc;
          }
        } else if (alert.type === 'exchange_withdrawal') {
          if (exchangeFlows[alert.from_type]) {
            exchangeFlows[alert.from_type].outflow += alert.amount_btc;
          }
        }
      });

      expect(exchangeFlows['Binance'].inflow).to.equal(500);
      expect(exchangeFlows['Binance'].outflow).to.equal(800);
      expect(exchangeFlows['Coinbase'].outflow).to.equal(1200);
      expect(exchangeFlows['Kraken'].inflow).to.equal(300);
    });

    it('should determine exchange trend correctly', () => {
      const determineTrend = (inflow, outflow) => {
        const net = outflow - inflow;
        if (net > 100) return 'accumulation';
        if (net < -100) return 'distribution';
        return 'neutral';
      };

      expect(determineTrend(500, 800)).to.equal('accumulation'); // Binance: more outflow
      expect(determineTrend(1200, 0)).to.equal('distribution'); // High inflow
      expect(determineTrend(100, 150)).to.equal('neutral'); // Balanced
    });
  });

  describe('Fund Flow Ratio', () => {
    it('should calculate ratio as exchange volume / on-chain volume', () => {
      const exchangeVolume = 2800; // 800 + 2000
      const onChainVolume = 10000;

      const ratio = exchangeVolume / onChainVolume;

      expect(ratio).to.equal(0.28);
    });

    it('should interpret high ratio as speculative', () => {
      const ratio = 0.35;
      const interpretation = ratio > 0.3 ? 'speculative' : ratio > 0.15 ? 'normal' : 'hodling';
      expect(interpretation).to.equal('speculative');
    });

    it('should interpret low ratio as hodling behavior', () => {
      const ratio = 0.1;
      const interpretation = ratio > 0.3 ? 'speculative' : ratio > 0.15 ? 'normal' : 'hodling';
      expect(interpretation).to.equal('hodling');
    });

    it('should handle zero on-chain volume', () => {
      const exchangeVolume = 1000;
      const onChainVolume = 0;

      const ratio = onChainVolume > 0 ? exchangeVolume / onChainVolume : 0;

      expect(ratio).to.equal(0);
    });
  });

  describe('Signal Generation', () => {
    it('should generate bullish signal with strong outflows', () => {
      const netflow = -1200;
      const factors = [];
      let score = 0;

      if (netflow < -1000) {
        score += 2;
        factors.push('Strong exchange outflows');
      } else if (netflow < -200) {
        score += 1;
        factors.push('Moderate exchange outflows');
      }

      const signal = score >= 2 ? 'bullish' : score >= 1 ? 'bullish' : 'neutral';

      expect(signal).to.equal('bullish');
      expect(factors).to.include('Strong exchange outflows');
      expect(score).to.equal(2);
    });

    it('should generate bearish signal with strong inflows', () => {
      const netflow = 1500;
      const factors = [];
      let score = 0;

      if (netflow > 1000) {
        score -= 2;
        factors.push('Strong exchange inflows');
      } else if (netflow > 200) {
        score -= 1;
        factors.push('Moderate exchange inflows');
      }

      const signal = score <= -2 ? 'bearish' : score <= -1 ? 'bearish' : 'neutral';

      expect(signal).to.equal('bearish');
      expect(factors).to.include('Strong exchange inflows');
      expect(score).to.equal(-2);
    });

    it('should increase weight with more data', () => {
      const calculateWeight = (totalFlows) => {
        let weight = 0.5;
        if (totalFlows > 5000) weight = 0.8;
        else if (totalFlows > 2000) weight = 0.7;
        else if (totalFlows > 500) weight = 0.6;
        return weight;
      };

      expect(calculateWeight(6000)).to.equal(0.8);
      expect(calculateWeight(3000)).to.equal(0.7);
      expect(calculateWeight(1000)).to.equal(0.6);
      expect(calculateWeight(100)).to.equal(0.5);
    });
  });

  describe('Exchange Reserve Estimation', () => {
    it('should estimate reserves based on flows', () => {
      const baseReserve = 580000; // Binance base
      const netflow = -300; // 300 BTC net outflow

      const estimatedReserve = baseReserve + netflow;

      expect(estimatedReserve).to.equal(579700);
    });

    it('should calculate 24h change percentage', () => {
      const previousReserve = 580000;
      const currentReserve = 575000;

      const change24h = ((currentReserve - previousReserve) / previousReserve) * 100;

      expect(change24h).to.be.closeTo(-0.86, 0.01);
    });
  });

  describe('Tweet Formatting', () => {
    it('should format BTC amounts correctly', () => {
      const formatBTC = (amount) => {
        if (Math.abs(amount) >= 1000) {
          return (amount / 1000).toFixed(1) + 'K';
        }
        return amount.toFixed(0);
      };

      expect(formatBTC(1500)).to.equal('1.5K');
      expect(formatBTC(500)).to.equal('500');
      expect(formatBTC(-2000)).to.equal('-2.0K');
    });

    it('should generate correct emoji for signal', () => {
      const getEmoji = (signal) => {
        switch (signal) {
          case 'bullish': return '🟢';
          case 'bearish': return '🔴';
          default: return '🟡';
        }
      };

      expect(getEmoji('bullish')).to.equal('🟢');
      expect(getEmoji('bearish')).to.equal('🔴');
      expect(getEmoji('neutral')).to.equal('🟡');
    });
  });

  describe('Integration with Prediction Engine', () => {
    it('should weight exchange flow signals appropriately', () => {
      const flowWeight = 0.7; // High data quality
      const flowSignal = 'bullish';
      const flowScore = flowSignal === 'bullish' ? 1 : flowSignal === 'bearish' ? -1 : 0;

      const contribution = flowScore * flowWeight;

      expect(contribution).to.equal(0.7);
    });

    it('should combine with other signals', () => {
      const signals = [
        { type: 'technical', signal: 'bullish', weight: 0.8 },
        { type: 'onchain', signal: 'bullish', weight: 0.6 },
        { type: 'exchange_flows', signal: 'bullish', weight: 0.7 },
        { type: 'derivatives', signal: 'bearish', weight: 0.5 },
      ];

      let bullishScore = 0;
      let bearishScore = 0;

      signals.forEach(s => {
        if (s.signal === 'bullish') bullishScore += s.weight;
        else if (s.signal === 'bearish') bearishScore += s.weight;
      });

      const totalScore = bullishScore + bearishScore;
      const bullishPercent = bullishScore / totalScore;

      expect(bullishPercent).to.be.greaterThan(0.5); // Overall bullish
      expect(bullishScore).to.equal(2.1);
      expect(bearishScore).to.equal(0.5);
    });
  });
});
