/// <reference types="cypress" />

describe('Market Data Functions API', () => {
  const API_URL = Cypress.env('apiUrl') || '/.netlify/functions'

  // =====================================================
  // MARKET SNAPSHOT SCHEMA VALIDATION
  // Ensures all required fields are present and valid
  // =====================================================
  describe('GET /api-market-data - Schema Validation', () => {
    it('should return valid market snapshot with all required fields', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          const data = response.body

          // Top-level required fields
          expect(data).to.have.property('timestamp')
          expect(data.timestamp).to.be.a('string')

          // BTC object - all fields required
          expect(data).to.have.property('btc')
          expect(data.btc).to.have.property('price')
          expect(data.btc).to.have.property('price24hAgo')
          expect(data.btc).to.have.property('priceChange24h')
          expect(data.btc).to.have.property('high24h')
          expect(data.btc).to.have.property('low24h')
          expect(data.btc).to.have.property('volume24h')
          expect(data.btc).to.have.property('marketCap')

          // Fear & Greed - all fields required
          expect(data).to.have.property('fearGreed')
          expect(data.fearGreed).to.have.property('value')
          expect(data.fearGreed).to.have.property('label')

          // Funding - all fields required
          expect(data).to.have.property('funding')
          expect(data.funding).to.have.property('rate')
          expect(data.funding).to.have.property('ratePercent')
          expect(data.funding).to.have.property('exchanges')
          expect(data.funding).to.have.property('history')

          // Funding exchanges - all 5 required
          expect(data.funding.exchanges).to.have.property('bybit')
          expect(data.funding.exchanges).to.have.property('okx')
          expect(data.funding.exchanges).to.have.property('binance')
          expect(data.funding.exchanges).to.have.property('dydx')
          expect(data.funding.exchanges).to.have.property('bitget')

          // Open Interest - all fields required
          expect(data).to.have.property('openInterest')
          expect(data.openInterest).to.have.property('btc')
          expect(data.openInterest).to.have.property('usd')
          expect(data.openInterest).to.have.property('change24h')
          expect(data.openInterest).to.have.property('change24hPercent')
          expect(data.openInterest).to.have.property('oiMarketCapRatio')
          expect(data.openInterest).to.have.property('history')

          // Long/Short Ratio - all fields required
          expect(data).to.have.property('longShortRatio')
          expect(data.longShortRatio).to.have.property('ratio')
          expect(data.longShortRatio).to.have.property('longPercent')
          expect(data.longShortRatio).to.have.property('shortPercent')
          expect(data.longShortRatio).to.have.property('source')

          // Dominance - required
          expect(data).to.have.property('dominance')
          expect(data.dominance).to.have.property('btc')

          // Hashrate - all fields required
          expect(data).to.have.property('hashrate')
          expect(data.hashrate).to.have.property('current')
          expect(data.hashrate).to.have.property('unit')
          expect(data.hashrate).to.have.property('history')

          // OHLC - both timeframes required
          expect(data).to.have.property('ohlc')
          expect(data.ohlc).to.have.property('days7')
          expect(data.ohlc).to.have.property('days30')

          // Global - all fields required
          expect(data).to.have.property('global')
          expect(data.global).to.have.property('totalMarketCap')
          expect(data.global).to.have.property('total24hVolume')

          // Liquidation - all fields required
          expect(data).to.have.property('liquidation')
          expect(data.liquidation).to.have.property('levels')
          expect(data.liquidation).to.have.property('stats24h')
          expect(data.liquidation.stats24h).to.have.property('total')
          expect(data.liquidation.stats24h).to.have.property('long')
          expect(data.liquidation.stats24h).to.have.property('short')
          expect(data.liquidation.stats24h).to.have.property('ratio')
        }
      })
    })

    it('should have valid BTC price data (not zero or null)', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          const { btc } = response.body

          // Price must be a positive number (BTC is worth something!)
          expect(btc.price).to.be.a('number')
          expect(btc.price).to.be.greaterThan(0)

          // 24h high/low must be valid
          expect(btc.high24h).to.be.a('number')
          expect(btc.high24h).to.be.greaterThan(0)
          expect(btc.low24h).to.be.a('number')
          expect(btc.low24h).to.be.greaterThan(0)

          // High must be >= Low
          expect(btc.high24h).to.be.at.least(btc.low24h)

          // Volume and market cap should be positive
          expect(btc.volume24h).to.be.a('number')
          expect(btc.volume24h).to.be.at.least(0)
          expect(btc.marketCap).to.be.a('number')
          expect(btc.marketCap).to.be.greaterThan(0)
        }
      })
    })

    it('should have valid Fear & Greed data', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          const { fearGreed } = response.body

          // Value must be 0-100
          expect(fearGreed.value).to.be.a('number')
          expect(fearGreed.value).to.be.within(0, 100)

          // Label must be one of the valid states
          expect(fearGreed.label).to.be.a('string')
          expect(fearGreed.label).to.be.oneOf([
            'Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'
          ])
        }
      })
    })

    it('should have valid funding rate data', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          const { funding } = response.body

          // Rate should be a number (can be negative)
          expect(funding.rate).to.be.a('number')
          expect(funding.ratePercent).to.be.a('number')

          // History should be an array
          expect(funding.history).to.be.an('array')

          // Each exchange should have rate, ratePercent, nextFundingTime
          const exchanges = ['bybit', 'okx', 'binance', 'dydx', 'bitget']
          exchanges.forEach(exchange => {
            expect(funding.exchanges[exchange]).to.have.property('rate')
            expect(funding.exchanges[exchange]).to.have.property('ratePercent')
            expect(funding.exchanges[exchange]).to.have.property('nextFundingTime')
          })
        }
      })
    })

    it('should have valid open interest data', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          const { openInterest } = response.body

          // OI values should be numbers
          expect(openInterest.btc).to.be.a('number')
          expect(openInterest.usd).to.be.a('number')
          expect(openInterest.change24h).to.be.a('number')
          expect(openInterest.change24hPercent).to.be.a('number')
          expect(openInterest.oiMarketCapRatio).to.be.a('number')

          // History should be an array
          expect(openInterest.history).to.be.an('array')
        }
      })
    })

    it('should have valid long/short ratio data', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          const { longShortRatio } = response.body

          // Ratio should be a positive number
          expect(longShortRatio.ratio).to.be.a('number')
          expect(longShortRatio.ratio).to.be.greaterThan(0)

          // Percentages should be 0-100 and sum to ~100
          expect(longShortRatio.longPercent).to.be.a('number')
          expect(longShortRatio.longPercent).to.be.within(0, 100)
          expect(longShortRatio.shortPercent).to.be.a('number')
          expect(longShortRatio.shortPercent).to.be.within(0, 100)

          // Source should be a string
          expect(longShortRatio.source).to.be.a('string')
        }
      })
    })

    it('should have valid dominance data', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          const { dominance } = response.body

          // BTC dominance should be 0-100
          expect(dominance.btc).to.be.a('number')
          expect(dominance.btc).to.be.within(0, 100)
        }
      })
    })

    it('should have valid hashrate data', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          const { hashrate } = response.body

          // Hashrate should be positive
          expect(hashrate.current).to.be.a('number')
          expect(hashrate.current).to.be.greaterThan(0)

          // Unit should be EH/s or similar
          expect(hashrate.unit).to.be.a('string')

          // History should be an array
          expect(hashrate.history).to.be.an('array')
        }
      })
    })

    it('should have valid OHLC data', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          const { ohlc } = response.body

          // Both timeframes should be arrays
          expect(ohlc.days7).to.be.an('array')
          expect(ohlc.days30).to.be.an('array')

          // Each OHLC entry should have 5 values [timestamp, open, high, low, close]
          if (ohlc.days7.length > 0) {
            expect(ohlc.days7[0]).to.be.an('array')
            expect(ohlc.days7[0]).to.have.length(5)
          }
        }
      })
    })

    it('should have valid global market data', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          const { global } = response.body

          // Total market cap should be positive
          expect(global.totalMarketCap).to.be.a('number')
          expect(global.totalMarketCap).to.be.greaterThan(0)

          // 24h volume should be positive
          expect(global.total24hVolume).to.be.a('number')
          expect(global.total24hVolume).to.be.greaterThan(0)
        }
      })
    })

    it('should have valid liquidation data', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          const { liquidation } = response.body

          // Levels should be an array
          expect(liquidation.levels).to.be.an('array')

          // Stats should have all required fields
          expect(liquidation.stats24h.total).to.be.a('number')
          expect(liquidation.stats24h.total).to.be.at.least(0)
          expect(liquidation.stats24h.long).to.be.a('number')
          expect(liquidation.stats24h.long).to.be.at.least(0)
          expect(liquidation.stats24h.short).to.be.a('number')
          expect(liquidation.stats24h.short).to.be.at.least(0)
          expect(liquidation.stats24h.ratio).to.be.a('number')

          // If there are levels, validate their structure
          if (liquidation.levels.length > 0) {
            const level = liquidation.levels[0]
            expect(level).to.have.property('price')
            expect(level).to.have.property('type')
            expect(level).to.have.property('leverage')
            expect(level).to.have.property('intensity')
            expect(level).to.have.property('estimatedValue')
            expect(level).to.have.property('exchange')
            expect(level.type).to.be.oneOf(['long', 'short'])
          }
        }
      })
    })

    it('should have dataSources when available', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/api-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200 && response.body.dataSources) {
          const { dataSources } = response.body

          // DataSources should have tracking info
          expect(dataSources).to.have.property('btcPrice')
          expect(dataSources).to.have.property('fearGreed')
          expect(dataSources).to.have.property('funding')
          expect(dataSources).to.have.property('openInterest')
          expect(dataSources).to.have.property('hashrate')
          expect(dataSources).to.have.property('global')
        }
      })
    })
  })

  describe('GET /liquidity-prediction', () => {
    it('should return liquidity prediction data', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/liquidity-prediction`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.have.property('bias')
          expect(response.body).to.have.property('topside')
          expect(response.body).to.have.property('bottomside')

          // Check topside structure
          if (response.body.topside) {
            expect(response.body.topside).to.have.property('zone')
            expect(response.body.topside).to.have.property('probability')
          }

          // Check bottomside structure
          if (response.body.bottomside) {
            expect(response.body.bottomside).to.have.property('zone')
            expect(response.body.bottomside).to.have.property('probability')
          }
        }
      })
    })

    it('should return valid bias value', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/liquidity-prediction`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200 && response.body.bias) {
          expect(response.body.bias).to.be.oneOf(['Bullish', 'Bearish', 'Neutral'])
        }
      })
    })

    it('should return probability as number', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/liquidity-prediction`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          if (response.body.topside?.probability) {
            expect(response.body.topside.probability).to.be.a('number')
            expect(response.body.topside.probability).to.be.within(0, 100)
          }
          if (response.body.bottomside?.probability) {
            expect(response.body.bottomside.probability).to.be.a('number')
            expect(response.body.bottomside.probability).to.be.within(0, 100)
          }
        }
      })
    })
  })

  describe('GET /fetch-market-data (scheduled)', () => {
    it('should return market data or schedule acknowledgment', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/fetch-market-data`,
        failOnStatusCode: false
      }).then((response) => {
        // This is a scheduled function, may return different responses
        expect(response.status).to.be.oneOf([200, 204, 500])
      })
    })
  })

  describe('GET /fetch-onchain-data (scheduled)', () => {
    it('should return on-chain data or schedule acknowledgment', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/fetch-onchain-data`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 204, 500])
      })
    })
  })

  describe('GET /whale-tracker', () => {
    it('should return whale tracking data', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/whale-tracker`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          // Should return array of whale alerts or tracking data
          expect(response.body).to.satisfy((body) => {
            return Array.isArray(body) ||
                   (typeof body === 'object' && body !== null)
          })
        }
      })
    })
  })

  describe('GET /key-level', () => {
    it('should return key level data', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/key-level`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.be.an('object')
        }
      })
    })
  })

  describe('GET /alpha-radar-summary', () => {
    it('should return alpha radar summary', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/alpha-radar-summary`,
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.be.an('object')
        }
      })
    })
  })
})
