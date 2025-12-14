/// <reference types="cypress" />

/**
 * Unit Tests for BTCSAIIndicators Module
 * Tests pure indicator calculation functions
 */

describe('BTCSAIIndicators', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().should('have.property', 'BTCSAIIndicators');
  });

  // Helper to generate mock OHLC data
  function generateCandles(count, startPrice = 50000, trend = 'flat') {
    const candles = [];
    let price = startPrice;

    for (let i = 0; i < count; i++) {
      let change = 0;
      if (trend === 'up') change = Math.random() * 0.02;
      else if (trend === 'down') change = -Math.random() * 0.02;
      else change = (Math.random() - 0.5) * 0.02;

      const open = price;
      const close = price * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);

      candles.push({
        time: Date.now() - (count - i) * 86400000,
        open,
        high,
        low,
        close,
        volume: Math.random() * 1000000000
      });

      price = close;
    }
    return candles;
  }

  describe('SMA (Simple Moving Average)', () => {
    it('should return null for insufficient data', () => {
      cy.window().then(win => {
        const result = win.BTCSAIIndicators.SMA([10, 20, 30], 5);
        expect(result[0]).to.be.null;
        expect(result[1]).to.be.null;
        expect(result[2]).to.be.null;
      });
    });

    it('should calculate correct SMA values', () => {
      cy.window().then(win => {
        const result = win.BTCSAIIndicators.SMA([10, 20, 30, 40, 50], 3);
        expect(result[0]).to.be.null;
        expect(result[1]).to.be.null;
        expect(result[2]).to.equal(20); // (10+20+30)/3
        expect(result[3]).to.equal(30); // (20+30+40)/3
        expect(result[4]).to.equal(40); // (30+40+50)/3
      });
    });

    it('should handle single period SMA', () => {
      cy.window().then(win => {
        const data = [10, 20, 30];
        const result = win.BTCSAIIndicators.SMA(data, 1);
        expect(result[0]).to.equal(10);
        expect(result[1]).to.equal(20);
        expect(result[2]).to.equal(30);
      });
    });
  });

  describe('EMA (Exponential Moving Average)', () => {
    it('should return null for insufficient data', () => {
      cy.window().then(win => {
        const result = win.BTCSAIIndicators.EMA([10, 20], 5);
        expect(result[0]).to.be.null;
        expect(result[1]).to.be.null;
      });
    });

    it('should start with SMA value', () => {
      cy.window().then(win => {
        const data = [10, 20, 30, 40, 50];
        const result = win.BTCSAIIndicators.EMA(data, 3);
        // First EMA value equals SMA of first 3 values
        expect(result[2]).to.equal(20); // (10+20+30)/3
      });
    });

    it('should weight recent prices more heavily', () => {
      cy.window().then(win => {
        const data = [10, 10, 10, 10, 50]; // Spike at end
        const ema = win.BTCSAIIndicators.EMA(data, 3);
        const sma = win.BTCSAIIndicators.SMA(data, 3);
        // EMA should be higher than SMA due to recent spike
        expect(ema[4]).to.be.greaterThan(sma[4]);
      });
    });
  });

  describe('RSI (Relative Strength Index)', () => {
    it('should return null during warmup period', () => {
      cy.window().then(win => {
        const candles = generateCandles(10);
        const result = win.BTCSAIIndicators.RSI(candles, 14);
        expect(result[5]).to.be.null;
        expect(result[10]).to.be.null;
      });
    });

    it('should return values between 0 and 100', () => {
      cy.window().then(win => {
        const candles = generateCandles(50);
        const result = win.BTCSAIIndicators.RSI(candles, 14);
        for (let i = 15; i < result.length; i++) {
          if (result[i] !== null) {
            expect(result[i]).to.be.at.least(0);
            expect(result[i]).to.be.at.most(100);
          }
        }
      });
    });

    it('should be above 50 in uptrend', () => {
      cy.window().then(win => {
        const candles = generateCandles(50, 50000, 'up');
        const result = win.BTCSAIIndicators.RSI(candles, 14);
        const lastRSI = result[result.length - 1];
        expect(lastRSI).to.be.greaterThan(50);
      });
    });

    it('should be below 50 in downtrend', () => {
      cy.window().then(win => {
        const candles = generateCandles(50, 50000, 'down');
        const result = win.BTCSAIIndicators.RSI(candles, 14);
        const lastRSI = result[result.length - 1];
        expect(lastRSI).to.be.lessThan(50);
      });
    });
  });

  describe('MACD', () => {
    it('should return null during warmup', () => {
      cy.window().then(win => {
        const candles = generateCandles(20);
        const result = win.BTCSAIIndicators.MACD(candles);
        expect(result.macd[10]).to.be.null;
        expect(result.signal[10]).to.be.null;
      });
    });

    it('should have valid structure', () => {
      cy.window().then(win => {
        const candles = generateCandles(50);
        const result = win.BTCSAIIndicators.MACD(candles);
        expect(result).to.have.property('macd');
        expect(result).to.have.property('signal');
        expect(result).to.have.property('histogram');
        expect(result.macd.length).to.equal(candles.length);
      });
    });

    it('should have histogram = macd - signal', () => {
      cy.window().then(win => {
        const candles = generateCandles(50);
        const result = win.BTCSAIIndicators.MACD(candles);
        for (let i = 35; i < result.macd.length; i++) {
          if (result.macd[i] !== null && result.signal[i] !== null) {
            const expected = result.macd[i] - result.signal[i];
            expect(result.histogram[i]).to.be.closeTo(expected, 0.001);
          }
        }
      });
    });
  });

  describe('Bollinger Bands', () => {
    it('should return null during warmup', () => {
      cy.window().then(win => {
        const candles = generateCandles(10);
        const result = win.BTCSAIIndicators.BollingerBands(candles, 20);
        expect(result.upper[5]).to.be.null;
        expect(result.middle[5]).to.be.null;
        expect(result.lower[5]).to.be.null;
      });
    });

    it('should have upper > middle > lower', () => {
      cy.window().then(win => {
        const candles = generateCandles(50);
        const result = win.BTCSAIIndicators.BollingerBands(candles, 20);
        for (let i = 20; i < result.upper.length; i++) {
          if (result.upper[i] !== null) {
            expect(result.upper[i]).to.be.greaterThan(result.middle[i]);
            expect(result.middle[i]).to.be.greaterThan(result.lower[i]);
          }
        }
      });
    });

    it('should narrow during low volatility', () => {
      cy.window().then(win => {
        // Flat prices = low volatility
        const flatCandles = [];
        for (let i = 0; i < 50; i++) {
          flatCandles.push({
            time: Date.now() - (50 - i) * 86400000,
            open: 50000,
            high: 50100,
            low: 49900,
            close: 50000,
            volume: 1000000000
          });
        }
        const result = win.BTCSAIIndicators.BollingerBands(flatCandles, 20);
        const lastBandwidth = result.bandwidth[result.bandwidth.length - 1];
        expect(lastBandwidth).to.be.lessThan(1); // Less than 1% bandwidth
      });
    });
  });

  describe('ATR (Average True Range)', () => {
    it('should return null during warmup', () => {
      cy.window().then(win => {
        const candles = generateCandles(10);
        const result = win.BTCSAIIndicators.ATR(candles, 14);
        expect(result[5]).to.be.null;
        expect(result[10]).to.be.null;
      });
    });

    it('should be positive', () => {
      cy.window().then(win => {
        const candles = generateCandles(50);
        const result = win.BTCSAIIndicators.ATR(candles, 14);
        for (let i = 15; i < result.length; i++) {
          if (result[i] !== null) {
            expect(result[i]).to.be.greaterThan(0);
          }
        }
      });
    });

    it('should increase with higher volatility', () => {
      cy.window().then(win => {
        // Low volatility candles
        const lowVolCandles = [];
        for (let i = 0; i < 30; i++) {
          lowVolCandles.push({
            time: Date.now() - (30 - i) * 86400000,
            open: 50000,
            high: 50100,
            low: 49900,
            close: 50000,
            volume: 1000000000
          });
        }

        // High volatility candles
        const highVolCandles = [];
        for (let i = 0; i < 30; i++) {
          highVolCandles.push({
            time: Date.now() - (30 - i) * 86400000,
            open: 50000,
            high: 52000,
            low: 48000,
            close: 50000,
            volume: 1000000000
          });
        }

        const lowATR = win.BTCSAIIndicators.ATR(lowVolCandles, 14);
        const highATR = win.BTCSAIIndicators.ATR(highVolCandles, 14);

        expect(highATR[29]).to.be.greaterThan(lowATR[29]);
      });
    });
  });

  describe('Stochastic', () => {
    it('should return k and d arrays', () => {
      cy.window().then(win => {
        const candles = generateCandles(50);
        const result = win.BTCSAIIndicators.Stochastic(candles);
        expect(result).to.have.property('k');
        expect(result).to.have.property('d');
        expect(result.k.length).to.equal(candles.length);
        expect(result.d.length).to.equal(candles.length);
      });
    });

    it('should have values between 0 and 100', () => {
      cy.window().then(win => {
        const candles = generateCandles(50);
        const result = win.BTCSAIIndicators.Stochastic(candles);
        for (let i = 20; i < result.k.length; i++) {
          if (result.k[i] !== null) {
            expect(result.k[i]).to.be.at.least(0);
            expect(result.k[i]).to.be.at.most(100);
          }
        }
      });
    });
  });

  describe('Helper Functions', () => {
    it('crossover should detect upward cross', () => {
      cy.window().then(win => {
        // prev1 < prev2, curr1 > curr2 = crossover
        expect(win.BTCSAIIndicators.crossover(10, 30, 20, 20)).to.be.true;
        expect(win.BTCSAIIndicators.crossover(30, 40, 20, 20)).to.be.false;
      });
    });

    it('crossunder should detect downward cross', () => {
      cy.window().then(win => {
        // prev1 > prev2, curr1 < curr2 = crossunder
        expect(win.BTCSAIIndicators.crossunder(30, 10, 20, 20)).to.be.true;
        expect(win.BTCSAIIndicators.crossunder(10, 5, 20, 20)).to.be.false;
      });
    });

    it('highest should find max in lookback', () => {
      cy.window().then(win => {
        const data = [10, 20, 50, 30, 40];
        expect(win.BTCSAIIndicators.highest(data, 4, 3)).to.equal(50);
        expect(win.BTCSAIIndicators.highest(data, 4, 2)).to.equal(40);
      });
    });

    it('lowest should find min in lookback', () => {
      cy.window().then(win => {
        const data = [10, 20, 50, 30, 5];
        expect(win.BTCSAIIndicators.lowest(data, 4, 3)).to.equal(5);
        expect(win.BTCSAIIndicators.lowest(data, 3, 3)).to.equal(20);
      });
    });
  });

  describe('OBV (On-Balance Volume)', () => {
    it('should increase on up days', () => {
      cy.window().then(win => {
        const candles = [
          { close: 100, volume: 1000 },
          { close: 110, volume: 2000 }, // Up day
          { close: 120, volume: 3000 }  // Up day
        ];
        const result = win.BTCSAIIndicators.OBV(candles);
        expect(result[1]).to.be.greaterThan(result[0]);
        expect(result[2]).to.be.greaterThan(result[1]);
      });
    });

    it('should decrease on down days', () => {
      cy.window().then(win => {
        const candles = [
          { close: 100, volume: 1000 },
          { close: 90, volume: 2000 },  // Down day
          { close: 80, volume: 3000 }   // Down day
        ];
        const result = win.BTCSAIIndicators.OBV(candles);
        expect(result[1]).to.be.lessThan(result[0]);
        expect(result[2]).to.be.lessThan(result[1]);
      });
    });
  });
});
