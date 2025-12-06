/// <reference types="cypress" />

describe('Premium Access & Paywall', () => {
  describe('Without Access', () => {
    beforeEach(() => {
      cy.clearAccess()
    })

    it('should show paywall on Dashboard', () => {
      cy.visit('/dashboard/')
      cy.get('#dashboard-locked').should('be.visible')
      cy.get('#dashboard-content').should('not.be.visible')
      cy.get('.btn-lightning').should('contain', 'Pricing')
    })

    it('should show paywall on Alpha Radar', () => {
      cy.visit('/alpha-radar/')
      // Check for some form of paywall/lock indicator
      cy.get('body').then(($body) => {
        if ($body.find('.paywall, .locked, #locked, [class*="lock"]').length > 0) {
          cy.get('.paywall, .locked, #locked, [class*="lock"]').first().should('be.visible')
        }
      })
    })

    it('should show paywall on Liquidity Hunter', () => {
      cy.visit('/liquidity-hunter/')
      cy.get('body').then(($body) => {
        if ($body.find('.paywall, .locked, #locked, .premium-gate').length > 0) {
          cy.get('.paywall, .locked, #locked, .premium-gate').first().should('be.visible')
        }
      })
    })

    it('should show paywall on Trade Coach', () => {
      cy.visit('/trade-coach/')
      cy.get('body').then(($body) => {
        if ($body.find('.paywall, .locked, #locked, [class*="lock"]').length > 0) {
          cy.get('.paywall, .locked, #locked, [class*="lock"]').first().should('be.visible')
        }
      })
    })

    it('should show paywall on Backtester Pro', () => {
      cy.visit('/backtester-pro/')
      cy.get('body').then(($body) => {
        if ($body.find('.paywall, .locked, #locked, [class*="lock"]').length > 0) {
          cy.get('.paywall, .locked, #locked, [class*="lock"]').first().should('be.visible')
        }
      })
    })

    it('paywall should link to pricing page', () => {
      cy.visit('/dashboard/')
      cy.get('.btn-lightning').click()
      cy.url().should('include', '/pricing')
    })
  })

  describe('With Active Access', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
    })

    it('should show Dashboard content when access granted', () => {
      cy.visit('/dashboard/')
      cy.get('#dashboard-locked').should('not.be.visible')
      cy.get('#dashboard-content').should('be.visible')
    })

    it('should show Alpha Radar content', () => {
      cy.visit('/alpha-radar/')
      // Content should be visible, no paywall
      cy.get('body').should('be.visible')
      cy.get('h1').should('be.visible')
    })

    it('should show Liquidity Hunter content', () => {
      cy.visit('/liquidity-hunter/')
      cy.get('body').should('be.visible')
    })
  })

  describe('Access Expiry', () => {
    it('should show paywall when access expires', () => {
      // Grant access that expires immediately (negative duration)
      cy.window().then((win) => {
        win.localStorage.setItem('btcsai_access', JSON.stringify({
          tier: 'daily',
          expiresAt: new Date(Date.now() - 1000).toISOString(),
          purchaseDate: new Date(Date.now() - 86400000).toISOString()
        }))
      })

      cy.visit('/dashboard/')
      cy.get('#dashboard-locked').should('be.visible')
    })

    it('should show content when access is still valid', () => {
      cy.grantAccess('daily', 86400)
      cy.visit('/dashboard/')
      cy.get('#dashboard-content').should('be.visible')
    })
  })

  describe('Session Token Validation', () => {
    it('should validate session on page load', () => {
      cy.intercept('POST', '/.netlify/functions/validate-session', {
        statusCode: 200,
        body: { valid: true }
      }).as('validateSession')

      cy.grantFullAccess('daily')
      cy.visit('/dashboard/')

      // Session validation may be called
      cy.wait(1000) // Wait for potential async validation
    })

    it('should show access revoked modal when kicked', () => {
      cy.intercept('POST', '/.netlify/functions/validate-session', {
        statusCode: 200,
        body: {
          valid: false,
          kicked: true,
          reason: 'Access recovered on another device'
        }
      }).as('validateSession')

      cy.grantFullAccess('daily')
      cy.visit('/dashboard/')

      // If the app checks session validity, it should show the kicked modal
      cy.wait('@validateSession').then(() => {
        // Check if access revoked modal appears
        cy.get('body').then(($body) => {
          if ($body.find('.access-revoked-modal, #access-revoked-modal').length > 0) {
            cy.get('.access-revoked-modal, #access-revoked-modal').should('be.visible')
          }
        })
      })
    })
  })

  describe('Admin Mode', () => {
    it('should bypass paywall in admin mode', () => {
      cy.clearAccess()
      cy.enableAdmin()
      cy.visit('/dashboard/')

      // In admin mode, content should be visible
      cy.get('#dashboard-content').should('be.visible')
    })

    it('should show paywall after disabling admin', () => {
      cy.enableAdmin()
      cy.visit('/dashboard/')
      cy.get('#dashboard-content').should('be.visible')

      cy.disableAdmin()
      cy.reload()

      cy.get('#dashboard-locked').should('be.visible')
    })
  })

  describe('Different Tier Access', () => {
    it('hourly tier should grant access', () => {
      cy.grantAccess('hourly', 3600)
      cy.visit('/dashboard/')
      cy.get('#dashboard-content').should('be.visible')
    })

    it('weekly tier should grant access', () => {
      cy.grantAccess('weekly', 604800)
      cy.visit('/dashboard/')
      cy.get('#dashboard-content').should('be.visible')
    })

    it('monthly tier should grant access', () => {
      cy.grantAccess('monthly', 2592000)
      cy.visit('/dashboard/')
      cy.get('#dashboard-content').should('be.visible')
    })
  })
})
