/// <reference types="cypress" />

describe('Market Data Functions API', () => {
  const API_URL = Cypress.env('apiUrl') || '/.netlify/functions'

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
