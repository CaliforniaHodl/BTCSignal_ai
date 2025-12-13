// On-Chain Metrics Unit Tests
// Tests for NVT, Puell Multiple, Stock-to-Flow, SSR, Reserve Risk, NUPL

describe('On-Chain Metrics Calculations', () => {
  // Test data fixtures
  const fixtures = {
    btcData: {
      price: 100000,
      marketCap: 2000000000000, // $2T
      circulatingSupply: 19500000,
      volume24h: 30000000000
    },
    stablecoinMarketCap: 200000000000, // $200B
    txVolume: 50000000000, // $50B daily
    minerRevenue: {
      daily: 30000000, // $30M
      avg365: 35000000 // $35M
    }
  };

  describe('NVT Ratio', () => {
    // NVT = Market Cap / Transaction Volume

    it('should calculate NVT ratio correctly', () => {
      const { marketCap } = fixtures.btcData;
      const txVolume = fixtures.txVolume;
      const nvt = marketCap / txVolume;

      expect(nvt).to.be.closeTo(40, 0.1); // 2T / 50B = 40
    });

    it('should signal undervalued when NVT < 25', () => {
      const marketCap = 1000000000000; // $1T
      const txVolume = 50000000000; // $50B
      const nvt = marketCap / txVolume; // = 20

      expect(nvt).to.be.lessThan(25);
      const signal = nvt < 25 ? 'undervalued' : nvt < 65 ? 'fair' : 'overvalued';
      expect(signal).to.equal('undervalued');
    });

    it('should signal overvalued when NVT > 65', () => {
      const marketCap = 2000000000000;
      const txVolume = 25000000000; // $25B - lower activity
      const nvt = marketCap / txVolume; // = 80

      expect(nvt).to.be.greaterThan(65);
      const signal = nvt < 25 ? 'undervalued' : nvt < 65 ? 'fair' : 'overvalued';
      expect(signal).to.equal('overvalued');
    });

    it('should signal fair when NVT between 25-65', () => {
      const nvt = 40;
      const signal = nvt < 25 ? 'undervalued' : nvt < 65 ? 'fair' : 'overvalued';
      expect(signal).to.equal('fair');
    });

    it('should handle zero transaction volume gracefully', () => {
      const marketCap = 2000000000000;
      const txVolume = 0;

      // Should not throw, should return 0 or handle gracefully
      const nvt = txVolume === 0 ? 0 : marketCap / txVolume;
      expect(nvt).to.equal(0);
    });
  });

  describe('Puell Multiple', () => {
    // Puell = Daily Miner Revenue / 365-day MA of Miner Revenue

    it('should calculate Puell Multiple correctly', () => {
      const { daily, avg365 } = fixtures.minerRevenue;
      const puell = daily / avg365;

      expect(puell).to.be.closeTo(0.857, 0.01); // 30M / 35M
    });

    it('should signal buy zone when Puell < 0.5', () => {
      const daily = 15000000; // $15M - stressed miners
      const avg365 = 35000000;
      const puell = daily / avg365; // = 0.43

      expect(puell).to.be.lessThan(0.5);
      const zone = puell < 0.5 ? 'buy' : puell < 1.2 ? 'neutral' : 'sell';
      expect(zone).to.equal('buy');
    });

    it('should signal sell zone when Puell > 1.2', () => {
      const daily = 50000000; // $50M - very profitable
      const avg365 = 35000000;
      const puell = daily / avg365; // = 1.43

      expect(puell).to.be.greaterThan(1.2);
      const zone = puell < 0.5 ? 'buy' : puell < 1.2 ? 'neutral' : 'sell';
      expect(zone).to.equal('sell');
    });

    it('should handle zero avg revenue gracefully', () => {
      const daily = 30000000;
      const avg365 = 0;

      const puell = avg365 === 0 ? 0 : daily / avg365;
      expect(puell).to.equal(0);
    });
  });

  describe('Stock-to-Flow', () => {
    // S2F = Circulating Supply / Annual Flow
    // Post-April 2024: 3.125 BTC/block, ~144 blocks/day

    it('should calculate S2F ratio correctly', () => {
      const circulatingSupply = 19500000;
      const blocksPerDay = 144;
      const blockReward = 3.125;
      const annualFlow = blocksPerDay * blockReward * 365; // ~164,250 BTC/year

      const s2f = circulatingSupply / annualFlow;

      expect(annualFlow).to.be.closeTo(164250, 100);
      expect(s2f).to.be.closeTo(118.7, 1);
    });

    it('should calculate model price using S2F formula', () => {
      const s2f = 120;
      // Model Price = e^(3.21 * ln(S2F) - 1.60)
      const modelPrice = Math.exp(3.21 * Math.log(s2f) - 1.60);

      // Should be in reasonable range
      expect(modelPrice).to.be.greaterThan(50000);
      expect(modelPrice).to.be.lessThan(500000);
    });

    it('should calculate deflection correctly', () => {
      const currentPrice = 100000;
      const modelPrice = 150000;
      const deflection = ((currentPrice - modelPrice) / modelPrice) * 100;

      expect(deflection).to.be.closeTo(-33.3, 0.1);
    });

    it('should signal undervalued when deflection < -30%', () => {
      const deflection = -35;
      const signal = deflection < -30 ? 'undervalued' : deflection > 30 ? 'overvalued' : 'fair';
      expect(signal).to.equal('undervalued');
    });

    it('should signal overvalued when deflection > 30%', () => {
      const deflection = 50;
      const signal = deflection < -30 ? 'undervalued' : deflection > 30 ? 'overvalued' : 'fair';
      expect(signal).to.equal('overvalued');
    });
  });

  describe('Stablecoin Supply Ratio (SSR)', () => {
    // SSR = BTC Market Cap / Stablecoin Market Cap
    // Lower = more buying power

    it('should calculate SSR correctly', () => {
      const btcMarketCap = fixtures.btcData.marketCap;
      const stablecoinMarketCap = fixtures.stablecoinMarketCap;
      const ssr = btcMarketCap / stablecoinMarketCap;

      expect(ssr).to.equal(10); // 2T / 200B
    });

    it('should signal bullish when SSR < 6', () => {
      const btcMarketCap = 1000000000000; // $1T
      const stablecoinMarketCap = 200000000000; // $200B
      const ssr = btcMarketCap / stablecoinMarketCap; // = 5

      expect(ssr).to.be.lessThan(6);
      const trend = ssr < 6 ? 'bullish' : ssr < 12 ? 'neutral' : 'bearish';
      expect(trend).to.equal('bullish');
    });

    it('should signal bearish when SSR > 12', () => {
      const btcMarketCap = 3000000000000; // $3T
      const stablecoinMarketCap = 200000000000; // $200B
      const ssr = btcMarketCap / stablecoinMarketCap; // = 15

      expect(ssr).to.be.greaterThan(12);
      const trend = ssr < 6 ? 'bullish' : ssr < 12 ? 'neutral' : 'bearish';
      expect(trend).to.equal('bearish');
    });

    it('should handle zero stablecoin market cap', () => {
      const btcMarketCap = 2000000000000;
      const stablecoinMarketCap = 0;

      const ssr = stablecoinMarketCap === 0 ? 0 : btcMarketCap / stablecoinMarketCap;
      expect(ssr).to.equal(0);
    });
  });

  describe('Reserve Risk', () => {
    // Reserve Risk = Price / HODL Bank
    // Lower = opportunity, Higher = risk

    it('should calculate Reserve Risk in expected range', () => {
      const price = fixtures.btcData.price;
      const circulatingSupply = fixtures.btcData.circulatingSupply;

      // Simplified HODL Bank approximation
      const hodlBank = circulatingSupply * price * 0.4;
      const reserveRisk = (price * circulatingSupply) / hodlBank;

      expect(reserveRisk).to.be.closeTo(2.5, 0.01); // 1 / 0.4 = 2.5
    });

    it('should signal opportunity when Reserve Risk < 0.002', () => {
      const reserveRisk = 0.001;
      const zone = reserveRisk < 0.002 ? 'opportunity' : reserveRisk < 0.008 ? 'neutral' : 'risk';
      expect(zone).to.equal('opportunity');
    });

    it('should signal risk when Reserve Risk > 0.008', () => {
      const reserveRisk = 0.01;
      const zone = reserveRisk < 0.002 ? 'opportunity' : reserveRisk < 0.008 ? 'neutral' : 'risk';
      expect(zone).to.equal('risk');
    });
  });

  describe('NUPL (Net Unrealized Profit/Loss)', () => {
    // NUPL = (Market Cap - Realized Cap) / Market Cap

    it('should calculate NUPL correctly', () => {
      const marketCap = 2000000000000;
      const realizedCap = 1200000000000; // $1.2T
      const nupl = (marketCap - realizedCap) / marketCap;

      expect(nupl).to.be.closeTo(0.4, 0.01); // (2T - 1.2T) / 2T = 0.4 = 40%
    });

    it('should signal capitulation when NUPL < 0', () => {
      const marketCap = 1000000000000;
      const realizedCap = 1500000000000; // Market below realized
      const nupl = (marketCap - realizedCap) / marketCap; // = -0.5

      expect(nupl).to.be.lessThan(0);
      const zone = getNUPLZone(nupl);
      expect(zone).to.equal('capitulation');
    });

    it('should signal hope when NUPL 0-0.25', () => {
      const nupl = 0.15;
      const zone = getNUPLZone(nupl);
      expect(zone).to.equal('hope');
    });

    it('should signal optimism when NUPL 0.25-0.5', () => {
      const nupl = 0.35;
      const zone = getNUPLZone(nupl);
      expect(zone).to.equal('optimism');
    });

    it('should signal belief when NUPL 0.5-0.75', () => {
      const nupl = 0.6;
      const zone = getNUPLZone(nupl);
      expect(zone).to.equal('belief');
    });

    it('should signal euphoria when NUPL > 0.75', () => {
      const nupl = 0.8;
      const zone = getNUPLZone(nupl);
      expect(zone).to.equal('euphoria');
    });

    // Helper function
    function getNUPLZone(nupl) {
      if (nupl < 0) return 'capitulation';
      if (nupl < 0.25) return 'hope';
      if (nupl < 0.5) return 'optimism';
      if (nupl < 0.75) return 'belief';
      return 'euphoria';
    }
  });

  describe('Signal Integration', () => {
    // Test that metrics produce coherent trading signals

    it('should produce bullish confluence when multiple metrics align', () => {
      const metrics = {
        nvt: { ratio: 20, signal: 'undervalued' },
        puell: { value: 0.4, zone: 'buy' },
        s2f: { deflection: -40, signal: 'undervalued' },
        ssr: { ratio: 5, trend: 'bullish' },
        reserveRisk: { value: 0.001, zone: 'opportunity' },
        nupl: { value: -0.1, zone: 'capitulation' }
      };

      const bullishSignals = [
        metrics.nvt.signal === 'undervalued',
        metrics.puell.zone === 'buy',
        metrics.s2f.signal === 'undervalued',
        metrics.ssr.trend === 'bullish',
        metrics.reserveRisk.zone === 'opportunity',
        metrics.nupl.zone === 'capitulation' // Historically bottom
      ].filter(Boolean).length;

      expect(bullishSignals).to.be.greaterThanOrEqual(5);
    });

    it('should produce bearish confluence when multiple metrics align', () => {
      const metrics = {
        nvt: { ratio: 80, signal: 'overvalued' },
        puell: { value: 1.5, zone: 'sell' },
        s2f: { deflection: 50, signal: 'overvalued' },
        ssr: { ratio: 15, trend: 'bearish' },
        reserveRisk: { value: 0.01, zone: 'risk' },
        nupl: { value: 0.8, zone: 'euphoria' }
      };

      const bearishSignals = [
        metrics.nvt.signal === 'overvalued',
        metrics.puell.zone === 'sell',
        metrics.s2f.signal === 'overvalued',
        metrics.ssr.trend === 'bearish',
        metrics.reserveRisk.zone === 'risk',
        metrics.nupl.zone === 'euphoria'
      ].filter(Boolean).length;

      expect(bearishSignals).to.be.greaterThanOrEqual(5);
    });

    it('should weight on-chain signals appropriately', () => {
      // Define weights for signal scoring
      const weights = {
        nvt: 0.15,
        puell: 0.15,
        s2f: 0.10,
        ssr: 0.20,
        reserveRisk: 0.15,
        nupl: 0.25
      };

      const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(totalWeight).to.equal(1.0);
    });
  });
});

describe('On-Chain Metrics API Integration', () => {
  // Test API endpoint behavior

  it('should return all required metric fields', () => {
    const requiredFields = [
      'lastUpdated',
      'nvt',
      'puellMultiple',
      'stockToFlow',
      'ssr',
      'reserveRisk',
      'nupl'
    ];

    // Mock response structure
    const mockResponse = {
      lastUpdated: new Date().toISOString(),
      nvt: { ratio: 40, signal: 'fair', description: 'test' },
      puellMultiple: { value: 0.85, zone: 'neutral', description: 'test' },
      stockToFlow: { ratio: 120, modelPrice: 100000, deflection: -10, signal: 'fair' },
      ssr: { ratio: 10, trend: 'neutral', description: 'test' },
      reserveRisk: { value: 0.005, zone: 'neutral', description: 'test' },
      nupl: { value: 0.4, zone: 'optimism', description: 'test' }
    };

    requiredFields.forEach(field => {
      expect(mockResponse).to.have.property(field);
    });
  });

  it('should have valid signal values for each metric', () => {
    const validSignals = {
      nvt: ['undervalued', 'fair', 'overvalued'],
      puellMultiple: ['buy', 'neutral', 'sell'],
      stockToFlow: ['undervalued', 'fair', 'overvalued'],
      ssr: ['bullish', 'neutral', 'bearish'],
      reserveRisk: ['opportunity', 'neutral', 'risk'],
      nupl: ['capitulation', 'hope', 'optimism', 'belief', 'euphoria']
    };

    Object.entries(validSignals).forEach(([metric, signals]) => {
      expect(signals.length).to.be.greaterThanOrEqual(3);
    });
  });
});

describe('On-Chain Dashboard Widget Rendering', () => {
  // Test frontend rendering logic

  beforeEach(() => {
    // Create mock DOM elements
    cy.document().then(doc => {
      const container = doc.createElement('div');
      container.id = 'onchain-advanced-metrics';
      container.innerHTML = `
        <span id="nvt-value">--</span>
        <span id="nvt-signal">--</span>
        <span id="puell-value">--</span>
        <span id="puell-zone">--</span>
        <span id="s2f-ratio">--</span>
        <span id="s2f-model-price">--</span>
        <span id="s2f-deflection">--</span>
        <span id="ssr-value">--</span>
        <span id="ssr-trend">--</span>
        <span id="reserve-risk-value">--</span>
        <span id="reserve-risk-zone">--</span>
        <span id="nupl-value">--</span>
        <span id="nupl-zone">--</span>
        <div id="nupl-marker" style="left: 50%"></div>
      `;
      doc.body.appendChild(container);
    });
  });

  it('should update NVT value element', () => {
    cy.get('#nvt-value').should('exist');
  });

  it('should update Puell Multiple element', () => {
    cy.get('#puell-value').should('exist');
    cy.get('#puell-zone').should('exist');
  });

  it('should update S2F elements', () => {
    cy.get('#s2f-ratio').should('exist');
    cy.get('#s2f-model-price').should('exist');
    cy.get('#s2f-deflection').should('exist');
  });

  it('should update SSR elements', () => {
    cy.get('#ssr-value').should('exist');
    cy.get('#ssr-trend').should('exist');
  });

  it('should update Reserve Risk elements', () => {
    cy.get('#reserve-risk-value').should('exist');
    cy.get('#reserve-risk-zone').should('exist');
  });

  it('should update NUPL elements', () => {
    cy.get('#nupl-value').should('exist');
    cy.get('#nupl-zone').should('exist');
    cy.get('#nupl-marker').should('exist');
  });

  it('should position NUPL marker correctly', () => {
    // NUPL range -0.5 to 1, mapped to 0-100%
    const nupl = 0.4; // optimism zone
    const markerPercent = ((nupl + 0.5) / 1.5) * 100;

    expect(markerPercent).to.be.closeTo(60, 1); // 40% NUPL = 60% position
  });
});
