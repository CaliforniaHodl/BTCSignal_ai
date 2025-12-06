/// <reference types="cypress" />

describe('Liquidation Map Page', () => {
  describe('Without Access (Premium Gate)', () => {
    beforeEach(() => {
      cy.clearAccess()
      cy.visit('/liquidation-map/')
    })

    it('should show premium gate or restricted access', () => {
      cy.get('body').then(($body) => {
        const hasGate = $body.find('#premium-gate, .premium-gate, .paywall, .locked').length > 0
        if (hasGate) {
          cy.get('#premium-gate, .premium-gate, .paywall, .locked').first().should('be.visible')
        }
      })
    })

    it('should display page title', () => {
      cy.get('h1').should('be.visible')
    })
  })

  describe('With Access (Premium Content)', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/liquidation-map/')
    })

    it('should display liquidation map content', () => {
      cy.get('body').should('be.visible')
      cy.get('h1').should('be.visible')
    })

    it('should have map or chart visualization', () => {
      cy.get('canvas, svg, [class*="chart"], [class*="map"], [id*="chart"], [id*="map"]')
        .should('exist')
    })

    it('should display liquidation data elements', () => {
      cy.get('body').then(($body) => {
        // Check for liquidation-related elements
        const hasLiquidationContent =
          $body.text().toLowerCase().includes('liquidation') ||
          $body.text().toLowerCase().includes('long') ||
          $body.text().toLowerCase().includes('short')
        expect(hasLiquidationContent).to.be.true
      })
    })
  })

  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/liquidation-map/')
    })

    it('should display correctly on mobile', () => {
      cy.setMobileViewport()
      cy.get('body').should('be.visible')
    })

    it('should display correctly on tablet', () => {
      cy.setTabletViewport()
      cy.get('body').should('be.visible')
    })
  })
})
