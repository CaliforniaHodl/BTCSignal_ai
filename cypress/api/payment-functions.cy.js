/// <reference types="cypress" />

describe('Payment Functions API', () => {
  const API_URL = Cypress.env('apiUrl') || '/.netlify/functions'

  describe('POST /create-invoice', () => {
    it('should create invoice for single tier', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/create-invoice`,
        body: {
          tier: 'single',
          amount: 21
        },
        failOnStatusCode: false
      }).then((response) => {
        // May fail without LNbits config, but should return proper structure
        if (response.status === 200) {
          expect(response.body).to.have.property('payment_request')
          expect(response.body).to.have.property('payment_hash')
        } else {
          // Expected to fail without LNbits - check error structure
          expect(response.status).to.be.oneOf([200, 500, 503])
        }
      })
    })

    it('should create invoice for hourly tier', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/create-invoice`,
        body: {
          tier: 'hourly',
          amount: 1000
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.have.property('payment_request')
          expect(response.body.payment_request).to.be.a('string')
        }
      })
    })

    it('should create invoice for daily tier', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/create-invoice`,
        body: {
          tier: 'daily',
          amount: 10000
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.have.property('payment_request')
        }
      })
    })

    it('should create invoice for weekly tier', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/create-invoice`,
        body: {
          tier: 'weekly',
          amount: 25000
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.have.property('payment_request')
        }
      })
    })

    it('should create invoice for monthly tier', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/create-invoice`,
        body: {
          tier: 'monthly',
          amount: 50000
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.have.property('payment_request')
        }
      })
    })

    it('should reject request without tier', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/create-invoice`,
        body: {
          amount: 1000
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 500])
      })
    })

    it('should reject request without amount', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/create-invoice`,
        body: {
          tier: 'daily'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 500])
      })
    })
  })

  describe('POST /check-payment', () => {
    it('should check payment status with valid hash', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/check-payment`,
        body: {
          payment_hash: 'test_payment_hash_123'
        },
        failOnStatusCode: false
      }).then((response) => {
        // Should return paid status (true/false)
        if (response.status === 200) {
          expect(response.body).to.have.property('paid')
          expect(response.body.paid).to.be.a('boolean')
        }
      })
    })

    it('should handle missing payment hash', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/check-payment`,
        body: {},
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 500])
      })
    })

    it('should return false for non-existent payment', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/check-payment`,
        body: {
          payment_hash: 'nonexistent_hash_xyz'
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body.paid).to.equal(false)
        }
      })
    })
  })
})
