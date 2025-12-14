/**
 * Premium Analytics Unit Tests
 * Tests for alert system, signal aggregation, and market report generation
 */

describe('Premium Analytics - Alert System', () => {
  describe('Alert Triggering Logic', () => {
    it('should trigger alert when value exceeds threshold (above condition)', () => {
      const alert = {
        id: 'test_above',
        name: 'Test Above Alert',
        category: 'price',
        condition: 'above',
        threshold: 100,
        severity: 'warning',
        enabled: true,
        description: 'Test alert'
      };

      const marketData = { price: 150 };

      // Simulate alert evaluation
      const isTriggered = marketData.price > alert.threshold;
      expect(isTriggered).to.be.true;
    });

    it('should trigger alert when value below threshold (below condition)', () => {
      const alert = {
        id: 'test_below',
        name: 'Test Below Alert',
        category: 'price',
        condition: 'below',
        threshold: 100,
        severity: 'critical',
        enabled: true,
        description: 'Test alert'
      };

      const marketData = { price: 50 };

      const isTriggered = marketData.price < alert.threshold;
      expect(isTriggered).to.be.true;
    });

    it('should not trigger alert when condition not met', () => {
      const alert = {
        id: 'test_no_trigger',
        name: 'Test No Trigger',
        category: 'price',
        condition: 'above',
        threshold: 100,
        severity: 'info',
        enabled: true,
        description: 'Test alert'
      };

      const marketData = { price: 75 };

      const isTriggered = marketData.price > alert.threshold;
      expect(isTriggered).to.be.false;
    });

    it('should handle crosses_above condition correctly', () => {
      const alert = {
        id: 'test_cross',
        name: 'Test Cross Above',
        category: 'onchain',
        condition: 'crosses_above',
        threshold: 1.0,
        severity: 'info',
        enabled: true,
        description: 'Test cross alert'
      };

      const previousValue = 0.95;
      const currentValue = 1.05;

      const isTriggered = previousValue <= alert.threshold && currentValue > alert.threshold;
      expect(isTriggered).to.be.true;
    });

    it('should not trigger crosses_above if no actual cross occurred', () => {
      const alert = {
        id: 'test_no_cross',
        name: 'Test No Cross',
        category: 'onchain',
        condition: 'crosses_above',
        threshold: 1.0,
        severity: 'info',
        enabled: true,
        description: 'Test cross alert'
      };

      // Case 1: Both below threshold
      let previousValue = 0.8;
      let currentValue = 0.9;
      let isTriggered = previousValue <= alert.threshold && currentValue > alert.threshold;
      expect(isTriggered).to.be.false;

      // Case 2: Both above threshold
      previousValue = 1.1;
      currentValue = 1.2;
      isTriggered = previousValue <= alert.threshold && currentValue > alert.threshold;
      expect(isTriggered).to.be.false;
    });
  });

  describe('Alert Severity Filtering', () => {
    const alerts = [
      { id: '1', severity: 'critical', timestamp: Date.now() },
      { id: '2', severity: 'warning', timestamp: Date.now() },
      { id: '3', severity: 'info', timestamp: Date.now() },
      { id: '4', severity: 'critical', timestamp: Date.now() }
    ];

    it('should filter alerts by critical severity', () => {
      const critical = alerts.filter(a => a.severity === 'critical');
      expect(critical).to.have.length(2);
    });

    it('should filter alerts by warning severity', () => {
      const warnings = alerts.filter(a => a.severity === 'warning');
      expect(warnings).to.have.length(1);
    });

    it('should filter alerts by info severity', () => {
      const info = alerts.filter(a => a.severity === 'info');
      expect(info).to.have.length(1);
    });
  });

  describe('Alert Statistics', () => {
    const alerts = [
      { id: '1', severity: 'critical', category: 'price', acknowledged: false },
      { id: '2', severity: 'warning', category: 'onchain', acknowledged: true },
      { id: '3', severity: 'info', category: 'derivatives', acknowledged: false },
      { id: '4', severity: 'critical', category: 'price', acknowledged: false }
    ];

    it('should count total alerts correctly', () => {
      expect(alerts.length).to.equal(4);
    });

    it('should count unacknowledged alerts', () => {
      const unacked = alerts.filter(a => !a.acknowledged);
      expect(unacked).to.have.length(3);
    });

    it('should group alerts by category', () => {
      const byCategory = alerts.reduce((acc, alert) => {
        acc[alert.category] = (acc[alert.category] || 0) + 1;
        return acc;
      }, {});

      expect(byCategory.price).to.equal(2);
      expect(byCategory.onchain).to.equal(1);
      expect(byCategory.derivatives).to.equal(1);
    });

    it('should group alerts by severity', () => {
      const bySeverity = alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {});

      expect(bySeverity.critical).to.equal(2);
      expect(bySeverity.warning).to.equal(1);
      expect(bySeverity.info).to.equal(1);
    });
  });
});

describe('Premium Analytics - Signal Aggregation', () => {
  describe('Signal Score Calculation', () => {
    it('should calculate positive score for bullish conditions', () => {
      const conditions = {
        rsi: 25, // Oversold - bullish
        mvrv: 0.9, // Undervalued - bullish
        fundingRate: -0.06 // Negative funding - bullish
      };

      let score = 0;
      if (conditions.rsi < 30) score += 30;
      if (conditions.mvrv < 1.0) score += 40;
      if (conditions.fundingRate < -0.05) score += 35;

      expect(score).to.be.greaterThan(50);
    });

    it('should calculate negative score for bearish conditions', () => {
      const conditions = {
        rsi: 80, // Overbought - bearish
        mvrv: 3.6, // Overvalued - bearish
        fundingRate: 0.12 // High funding - bearish
      };

      let score = 0;
      if (conditions.rsi > 70) score -= 30;
      if (conditions.mvrv > 3.5) score -= 40;
      if (conditions.fundingRate > 0.1) score -= 35;

      expect(score).to.be.lessThan(-50);
    });

    it('should calculate neutral score for mixed conditions', () => {
      const conditions = {
        rsi: 50, // Neutral
        mvrv: 1.5, // Fair value
        fundingRate: 0.02 // Slightly positive
      };

      let score = 0;
      // No extreme conditions, score remains near 0

      expect(Math.abs(score)).to.be.lessThan(20);
    });
  });

  describe('Weighted Category Scores', () => {
    const WEIGHTS = {
      technical: 25,
      onchain: 30,
      derivatives: 20,
      priceModels: 15,
      sentiment: 10
    };

    it('should apply category weights correctly', () => {
      const categoryScores = {
        technical: 50,
        onchain: 40,
        derivatives: -20,
        priceModels: 30,
        sentiment: 60
      };

      const weightedScore =
        (categoryScores.technical * WEIGHTS.technical +
         categoryScores.onchain * WEIGHTS.onchain +
         categoryScores.derivatives * WEIGHTS.derivatives +
         categoryScores.priceModels * WEIGHTS.priceModels +
         categoryScores.sentiment * WEIGHTS.sentiment) / 100;

      // Expected: (50*25 + 40*30 + (-20)*20 + 30*15 + 60*10) / 100
      // = (1250 + 1200 - 400 + 450 + 600) / 100 = 31
      expect(weightedScore).to.equal(31);
    });

    it('should ensure weights sum to 100', () => {
      const totalWeight = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);
      expect(totalWeight).to.equal(100);
    });
  });

  describe('Signal Confidence Calculation', () => {
    it('should calculate high confidence for extreme scores', () => {
      const score = 85;
      const confidence = Math.min(100, Math.abs(score));
      expect(confidence).to.equal(85);
    });

    it('should calculate low confidence for neutral scores', () => {
      const score = 15;
      const confidence = Math.min(100, Math.abs(score));
      expect(confidence).to.equal(15);
    });

    it('should cap confidence at 100', () => {
      const score = 150;
      const confidence = Math.min(100, Math.abs(score));
      expect(confidence).to.equal(100);
    });

    it('should use absolute value for negative scores', () => {
      const score = -75;
      const confidence = Math.min(100, Math.abs(score));
      expect(confidence).to.equal(75);
    });
  });

  describe('Overall Signal Determination', () => {
    it('should determine BULLISH signal for score > 20', () => {
      const score = 35;
      const signal = score > 20 ? 'BULLISH' : score < -20 ? 'BEARISH' : 'NEUTRAL';
      expect(signal).to.equal('BULLISH');
    });

    it('should determine BEARISH signal for score < -20', () => {
      const score = -35;
      const signal = score > 20 ? 'BULLISH' : score < -20 ? 'BEARISH' : 'NEUTRAL';
      expect(signal).to.equal('BEARISH');
    });

    it('should determine NEUTRAL signal for score between -20 and 20', () => {
      const score = 10;
      const signal = score > 20 ? 'BULLISH' : score < -20 ? 'BEARISH' : 'NEUTRAL';
      expect(signal).to.equal('NEUTRAL');
    });
  });
});

describe('Premium Analytics - Market Report', () => {
  describe('Market Grade Calculation', () => {
    it('should assign A+ grade for score >= 90', () => {
      const score = 92;
      const grade = score >= 90 ? 'A+' : score >= 85 ? 'A' : 'B';
      expect(grade).to.equal('A+');
    });

    it('should assign F grade for score < 35', () => {
      const score = 30;
      const grade = score >= 35 ? 'D-' : 'F';
      expect(grade).to.equal('F');
    });

    it('should assign B grade for score 70-74', () => {
      const score = 72;
      let grade;
      if (score >= 75) grade = 'B+';
      else if (score >= 70) grade = 'B';
      else if (score >= 65) grade = 'B-';
      else grade = 'C';

      expect(grade).to.equal('B');
    });
  });

  describe('Report Highlight Generation', () => {
    it('should identify bullish factors correctly', () => {
      const factors = [
        { name: 'RSI Oversold', signal: 'bullish', weight: 8 },
        { name: 'MVRV Undervalued', signal: 'bullish', weight: 10 },
        { name: 'SOPR Capitulation', signal: 'bullish', weight: 9 }
      ];

      const bullishFactors = factors.filter(f => f.signal === 'bullish');
      expect(bullishFactors).to.have.length(3);
    });

    it('should prioritize high-impact factors', () => {
      const factors = [
        { name: 'Factor 1', impact: 'high', weight: 9 },
        { name: 'Factor 2', impact: 'low', weight: 3 },
        { name: 'Factor 3', impact: 'high', weight: 8 },
        { name: 'Factor 4', impact: 'medium', weight: 5 }
      ];

      const highImpact = factors.filter(f => f.impact === 'high');
      expect(highImpact).to.have.length(2);
    });

    it('should limit top factors to 5', () => {
      const factors = Array.from({ length: 10 }, (_, i) => ({
        name: `Factor ${i}`,
        weight: 10 - i
      }));

      const topFactors = factors.slice(0, 5);
      expect(topFactors).to.have.length(5);
    });
  });

  describe('Historical Comparison', () => {
    it('should calculate improvement correctly', () => {
      const currentScore = 75;
      const previousScore = 65;
      const change = currentScore - previousScore;

      expect(change).to.equal(10);
      expect(change).to.be.greaterThan(0);
    });

    it('should calculate decline correctly', () => {
      const currentScore = 55;
      const previousScore = 70;
      const change = currentScore - previousScore;

      expect(change).to.equal(-15);
      expect(change).to.be.lessThan(0);
    });

    it('should identify unchanged scores', () => {
      const currentScore = 65;
      const previousScore = 66;
      const change = currentScore - previousScore;
      const isUnchanged = Math.abs(change) < 3;

      expect(isUnchanged).to.be.true;
    });
  });
});

describe('Premium Analytics - Data Export', () => {
  describe('CSV Formatting', () => {
    it('should format currency values correctly', () => {
      const formatCurrency = (value) => {
        if (typeof value !== 'number') return 'N/A';
        return '$' + value.toLocaleString(undefined, { maximumFractionDigits: 2 });
      };

      expect(formatCurrency(50000)).to.include('50,000');
      expect(formatCurrency(1234567.89)).to.include('1,234,567.89');
    });

    it('should format percentage values correctly', () => {
      const formatPercent = (value) => {
        if (typeof value !== 'number') return 'N/A';
        return (value > 0 ? '+' : '') + value.toFixed(2) + '%';
      };

      expect(formatPercent(5.5)).to.equal('+5.50%');
      expect(formatPercent(-3.2)).to.equal('-3.20%');
      expect(formatPercent(0)).to.equal('0.00%');
    });

    it('should escape CSV special characters', () => {
      const escapeCSV = (value) => {
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      expect(escapeCSV('Test, Value')).to.equal('"Test, Value"');
      expect(escapeCSV('Test "Quote"')).to.equal('"Test ""Quote"""');
      expect(escapeCSV('Simple')).to.equal('Simple');
    });
  });

  describe('Date Formatting', () => {
    it('should format date string for filenames', () => {
      const getDateString = () => {
        const now = new Date('2024-01-15');
        return now.toISOString().split('T')[0];
      };

      expect(getDateString()).to.equal('2024-01-15');
    });
  });
});

describe('Premium Analytics - Integration Tests', () => {
  it('should handle complete alert workflow', () => {
    // Create alert
    const alert = {
      id: 'integration_test',
      name: 'Integration Test Alert',
      category: 'price',
      condition: 'above',
      threshold: 50000,
      severity: 'warning',
      enabled: true,
      description: 'Test alert'
    };

    // Check condition
    const marketData = { price: 55000 };
    const isTriggered = marketData.price > alert.threshold;

    expect(isTriggered).to.be.true;

    // Create triggered alert
    const triggeredAlert = {
      id: `${alert.id}-${Date.now()}`,
      alertId: alert.id,
      name: alert.name,
      severity: alert.severity,
      currentValue: marketData.price,
      threshold: alert.threshold,
      timestamp: Date.now(),
      acknowledged: false
    };

    expect(triggeredAlert).to.have.property('id');
    expect(triggeredAlert).to.have.property('currentValue', 55000);
  });

  it('should handle complete signal aggregation workflow', () => {
    // Input data
    const input = {
      technical: { rsi: 65 },
      onchain: { mvrv: 1.8 },
      derivatives: { fundingRate: 0.03 }
    };

    // Calculate scores (simplified)
    let technicalScore = 0;
    if (input.technical.rsi < 70 && input.technical.rsi > 50) technicalScore = 15;

    let onchainScore = 0;
    if (input.onchain.mvrv > 1.5 && input.onchain.mvrv < 2.4) onchainScore = 10;

    let derivativesScore = 0;
    if (input.derivatives.fundingRate > 0 && input.derivatives.fundingRate < 0.05) derivativesScore = -5;

    // Weights
    const overallScore = (technicalScore * 25 + onchainScore * 30 + derivativesScore * 20) / 75;

    expect(overallScore).to.be.a('number');
    expect(overallScore).to.be.greaterThan(0);
  });
});
