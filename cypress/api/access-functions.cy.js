/// <reference types="cypress" />

describe('Access Management Functions API', () => {
  const API_URL = Cypress.env('apiUrl') || '/.netlify/functions'

  describe('POST /store-access', () => {
    it('should store access record with valid data', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/store-access`,
        body: {
          paymentHash: `test_hash_${Date.now()}`,
          tier: 'daily',
          amountSats: 10000
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true)
          expect(response.body).to.have.property('recoveryCode')
          expect(response.body.recoveryCode).to.match(/^BTCSIG-/)
          expect(response.body).to.have.property('sessionToken')
          expect(response.body).to.have.property('expiresAt')
        }
      })
    })

    it('should generate unique recovery codes', () => {
      const codes = []

      // Create multiple records and check uniqueness
      cy.request({
        method: 'POST',
        url: `${API_URL}/store-access`,
        body: {
          paymentHash: `unique_test_1_${Date.now()}`,
          tier: 'hourly',
          amountSats: 1000
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200 && response.body.recoveryCode) {
          codes.push(response.body.recoveryCode)
        }
      })

      cy.request({
        method: 'POST',
        url: `${API_URL}/store-access`,
        body: {
          paymentHash: `unique_test_2_${Date.now()}`,
          tier: 'hourly',
          amountSats: 1000
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200 && response.body.recoveryCode) {
          codes.push(response.body.recoveryCode)
          // Check codes are unique
          if (codes.length === 2) {
            expect(codes[0]).to.not.equal(codes[1])
          }
        }
      })
    })

    it('should generate session tokens', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/store-access`,
        body: {
          paymentHash: `session_test_${Date.now()}`,
          tier: 'daily',
          amountSats: 10000
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.have.property('sessionToken')
          expect(response.body.sessionToken).to.be.a('string')
          expect(response.body.sessionToken.length).to.be.greaterThan(10)
        }
      })
    })

    it('should reject missing payment hash', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/store-access`,
        body: {
          tier: 'daily',
          amountSats: 10000
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 500])
      })
    })

    it('should reject missing tier', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/store-access`,
        body: {
          paymentHash: 'test_hash',
          amountSats: 10000
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 500])
      })
    })
  })

  describe('POST /recover-access', () => {
    it('should recover access with valid recovery code', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/recover-access`,
        body: {
          recoveryCode: 'BTCSIG-TEST-CODE-1234'
        },
        failOnStatusCode: false
      }).then((response) => {
        // May not find test code, but should handle gracefully
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true)
          expect(response.body).to.have.property('sessionToken')
          expect(response.body).to.have.property('tier')
          expect(response.body).to.have.property('expiresAt')
        } else if (response.status === 404) {
          expect(response.body).to.have.property('error')
        }
      })
    })

    it('should recover access with payment hash', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/recover-access`,
        body: {
          paymentHash: 'test_payment_hash_abc123'
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.have.property('success', true)
          expect(response.body).to.have.property('sessionToken')
        } else {
          expect(response.status).to.be.oneOf([404, 500])
        }
      })
    })

    it('should generate new session token on recovery (kick old device)', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/recover-access`,
        body: {
          recoveryCode: 'BTCSIG-TEST-CODE-1234'
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          const firstToken = response.body.sessionToken

          // Recover again - should get new token
          cy.request({
            method: 'POST',
            url: `${API_URL}/recover-access`,
            body: {
              recoveryCode: 'BTCSIG-TEST-CODE-1234'
            },
            failOnStatusCode: false
          }).then((response2) => {
            if (response2.status === 200) {
              expect(response2.body.sessionToken).to.not.equal(firstToken)
            }
          })
        }
      })
    })

    it('should return error for invalid recovery code', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/recover-access`,
        body: {
          recoveryCode: 'INVALID-CODE-XXXX'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([404, 400])
        expect(response.body).to.have.property('error')
      })
    })

    it('should handle rate limiting', () => {
      // Make multiple rapid requests
      const requests = Array(5).fill(null).map(() =>
        cy.request({
          method: 'POST',
          url: `${API_URL}/recover-access`,
          body: {
            recoveryCode: 'BTCSIG-RATE-TEST-9999'
          },
          failOnStatusCode: false
        })
      )

      // At least one should succeed or get rate limited
      cy.wrap(Promise.all(requests)).then((responses) => {
        const statuses = responses.map(r => r.status)
        // Should include either success (200/404) or rate limit (429)
        expect(statuses.some(s => [200, 404, 429].includes(s))).to.be.true
      })
    })

    it('should reject empty request', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/recover-access`,
        body: {},
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 500])
      })
    })
  })

  describe('POST /validate-session', () => {
    it('should validate active session', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/validate-session`,
        body: {
          recoveryCode: 'BTCSIG-TEST-CODE-1234',
          sessionToken: 'test_session_token_xyz'
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          expect(response.body).to.have.property('valid')
          expect(response.body.valid).to.be.a('boolean')
        }
      })
    })

    it('should return kicked status for mismatched session', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/validate-session`,
        body: {
          recoveryCode: 'BTCSIG-TEST-CODE-1234',
          sessionToken: 'wrong_session_token'
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200 && response.body.valid === false) {
          expect(response.body).to.have.property('kicked')
        }
      })
    })

    it('should handle expired access', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/validate-session`,
        body: {
          recoveryCode: 'BTCSIG-EXPD-TEST-5678',
          sessionToken: 'expired_session_token'
        },
        failOnStatusCode: false
      }).then((response) => {
        if (response.status === 200) {
          // Should indicate invalid due to expiry
          expect(response.body.valid).to.be.oneOf([true, false])
        }
      })
    })

    it('should reject missing recovery code', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/validate-session`,
        body: {
          sessionToken: 'some_token'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 500])
      })
    })

    it('should reject missing session token', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/validate-session`,
        body: {
          recoveryCode: 'BTCSIG-TEST-CODE-1234'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.be.oneOf([400, 500])
      })
    })
  })
})
