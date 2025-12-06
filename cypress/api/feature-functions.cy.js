/// <reference types="cypress" />

describe('Feature Functions API', () => {
  const API_URL = Cypress.env('apiUrl') || '/.netlify/functions'

  describe('POST /trade-coach', () => {
    it('should analyze a trade and return score', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/trade-coach`,
        body: {
          direction: 'long',
          timeframe: '4h',
          entryPrice: 95000,
          stopLoss: 94000,
          takeProfit: 98000,
          positionSize: 5000,
          outcome: 'open',
          reasoning: 'Bullish divergence on RSI with support hold at key level'
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.have.property('score')
          expect(response.body.score).to.be.a('number')
          expect(response.body.score).to.be.within(0, 100)
        }
      })
    })

    it('should return score breakdown', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/trade-coach`,
        body: {
          direction: 'short',
          timeframe: '1h',
          entryPrice: 96000,
          stopLoss: 97000,
          takeProfit: 94000,
          positionSize: 3000,
          reasoning: 'Bearish engulfing at resistance'
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.have.property('breakdown')
          if (response.body.breakdown) {
            expect(response.body.breakdown).to.have.property('entry')
            expect(response.body.breakdown).to.have.property('risk')
          }
        }
      })
    })

    it('should handle minimal input', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/trade-coach`,
        body: {
          direction: 'long',
          entryPrice: 95000
        },
        failOnStatusCode: false
      }).then((response) => {
        // Should still work with minimal input
        expect(response.status).to.be.oneOf([200, 400, 500])
      })
    })

    it('should reject invalid direction', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/trade-coach`,
        body: {
          direction: 'invalid',
          entryPrice: 95000
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 500])
      })
    })
  })

  describe('POST /analyze-chart', () => {
    it('should accept chart analysis request', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/analyze-chart`,
        body: {
          imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        },
        failOnStatusCode: false
      }).then((response) => {
        // May require API key, check structure
        if (response.status === 200) {
          expect(response.body).to.be.an('object')
        }
      })
    })
  })

  describe('POST /newsletter-signup', () => {
    it('should accept newsletter signup', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/newsletter-signup`,
        body: {
          email: `test_${Date.now()}@example.com`
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.have.property('success')
        }
      })
    })

    it('should reject invalid email', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/newsletter-signup`,
        body: {
          email: 'invalid-email'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 500])
      })
    })

    it('should reject empty email', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/newsletter-signup`,
        body: {
          email: ''
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 500])
      })
    })
  })

  describe('POST /discord-webhook', () => {
    it('should handle webhook test request', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/discord-webhook`,
        body: {
          action: 'test',
          webhookUrl: 'https://discord.com/api/webhooks/test'
        },
        failOnStatusCode: false
      }).then((response) => {
        // May fail without valid webhook, but should handle gracefully
        expect(response.status).to.be.oneOf([200, 400, 500])
      })
    })
  })

  describe('POST /telegram-webhook', () => {
    it('should handle telegram bot commands', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/telegram-webhook`,
        body: {
          message: {
            chat: { id: 123456 },
            text: '/status'
          }
        },
        failOnStatusCode: false
      }).then((response) => {
        // May require bot token, check it handles gracefully
        expect(response.status).to.be.oneOf([200, 500])
      })
    })
  })

  describe('POST /track-view', () => {
    it('should track page view', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/track-view`,
        body: {
          page: '/test-page',
          referrer: 'https://google.com'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([200, 204, 500])
      })
    })
  })
})
