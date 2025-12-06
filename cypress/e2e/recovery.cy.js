/// <reference types="cypress" />

describe('Recovery Page', () => {
  beforeEach(() => {
    cy.clearAccess()
    cy.visit('/recover/')
  })

  describe('Page Structure', () => {
    it('should load the recovery page successfully', () => {
      cy.get('.recover-page').should('be.visible')
      cy.get('h1').should('contain', 'Recover Your Access')
    })

    it('should display current access status section', () => {
      cy.get('#current-access-section').should('be.visible')
      cy.get('#recover-status-text').should('contain', 'No active access')
    })

    it('should display recovery form', () => {
      cy.get('#recovery-form').should('be.visible')
      cy.get('#recovery-input').should('be.visible')
      cy.get('#btn-recover').should('be.visible')
    })

    it('should have correct input placeholder', () => {
      cy.get('#recovery-input')
        .should('have.attr', 'placeholder')
        .and('contain', 'BTCSIG')
    })

    it('should display help section', () => {
      cy.get('.recovery-help').should('be.visible')
      cy.get('.help-item').should('have.length.at.least', 3)
    })

    it('should have link to pricing page', () => {
      cy.get('.btn-pricing').should('have.attr', 'href', '/pricing/')
    })
  })

  describe('Recovery Form Validation', () => {
    it('should show error for empty input', () => {
      cy.get('#btn-recover').click()
      // Form should not submit or should show validation
      cy.get('#recovery-result').should('not.contain', 'success')
    })

    it('should accept recovery code format', () => {
      cy.get('#recovery-input').type('BTCSIG-TEST-CODE-1234')
      cy.get('#recovery-input').should('have.value', 'BTCSIG-TEST-CODE-1234')
    })

    it('should accept payment hash format', () => {
      const paymentHash = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1'
      cy.get('#recovery-input').type(paymentHash)
      cy.get('#recovery-input').should('have.value', paymentHash)
    })
  })

  describe('Recovery Code Submission', () => {
    it('should call recover API with valid recovery code', () => {
      cy.intercept('POST', '/.netlify/functions/recover-access', {
        statusCode: 200,
        body: {
          success: true,
          tier: 'daily',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          recoveryCode: 'BTCSIG-TEST-CODE-1234',
          sessionToken: 'new_session_token_xyz'
        }
      }).as('recoverAccess')

      cy.get('#recovery-input').type('BTCSIG-TEST-CODE-1234')
      cy.get('#btn-recover').click()

      cy.wait('@recoverAccess').its('request.body').should('deep.include', {
        recoveryCode: 'BTCSIG-TEST-CODE-1234'
      })
    })

    it('should show success message after valid recovery', () => {
      cy.intercept('POST', '/.netlify/functions/recover-access', {
        statusCode: 200,
        body: {
          success: true,
          tier: 'daily',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          recoveryCode: 'BTCSIG-TEST-CODE-1234',
          sessionToken: 'new_session_token_xyz'
        }
      }).as('recoverAccess')

      cy.get('#recovery-input').type('BTCSIG-TEST-CODE-1234')
      cy.get('#btn-recover').click()

      cy.wait('@recoverAccess')
      cy.get('#recovery-result').should('be.visible')
    })

    it('should show error for invalid recovery code', () => {
      cy.intercept('POST', '/.netlify/functions/recover-access', {
        statusCode: 404,
        body: {
          error: 'Recovery code not found'
        }
      }).as('recoverAccess')

      cy.get('#recovery-input').type('BTCSIG-INVALID-CODE')
      cy.get('#btn-recover').click()

      cy.wait('@recoverAccess')
      cy.get('#recovery-result').should('be.visible')
    })
  })

  describe('Payment Hash Recovery', () => {
    it('should call recover API with payment hash', () => {
      const paymentHash = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1'

      cy.intercept('POST', '/.netlify/functions/recover-access', {
        statusCode: 200,
        body: {
          success: true,
          tier: 'hourly',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          recoveryCode: 'BTCSIG-HASH-RECOV-5678',
          sessionToken: 'hash_session_token_xyz'
        }
      }).as('recoverAccess')

      cy.get('#recovery-input').type(paymentHash)
      cy.get('#btn-recover').click()

      cy.wait('@recoverAccess').its('request.body').should('deep.include', {
        paymentHash: paymentHash
      })
    })
  })

  describe('Rate Limiting', () => {
    it('should handle rate limiting after too many attempts', () => {
      cy.intercept('POST', '/.netlify/functions/recover-access', {
        statusCode: 429,
        body: {
          error: 'Too many recovery attempts. Please try again later.'
        }
      }).as('recoverAccess')

      cy.get('#recovery-input').type('BTCSIG-TEST-CODE-1234')
      cy.get('#btn-recover').click()

      cy.wait('@recoverAccess')
      cy.get('#recovery-result').should('be.visible')
    })
  })

  describe('With Existing Access', () => {
    beforeEach(() => {
      cy.grantFullAccess('daily')
      cy.visit('/recover/')
    })

    it('should show active status', () => {
      cy.get('#recover-status-icon').should('not.contain', '🔒')
    })

    it('should show stored recovery code if available', () => {
      // The stored code section should be visible if there's a stored code
      cy.get('#stored-code-section').then(($section) => {
        if ($section.is(':visible')) {
          cy.get('#stored-recovery-code').should('be.visible')
        }
      })
    })
  })

  describe('Responsive Design', () => {
    it('should display correctly on mobile', () => {
      cy.setMobileViewport()
      cy.get('.recover-page').should('be.visible')
      cy.get('#recovery-form').should('be.visible')
    })

    it('should display correctly on tablet', () => {
      cy.setTabletViewport()
      cy.get('.recover-page').should('be.visible')
    })
  })
})
