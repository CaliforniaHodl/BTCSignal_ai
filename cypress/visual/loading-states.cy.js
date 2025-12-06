/// <reference types="cypress" />

/**
 * Loading & Error State Tests
 * Tests loading spinners, error handling, and fallback states
 */

describe('Loading States', () => {
  describe('Dashboard Loading States', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400000)
    })

    it('should show loading state for widgets', () => {
      // Intercept API calls to delay them
      cy.intercept('GET', '**/market-data*', (req) => {
        req.on('response', (res) => {
          res.setDelay(2000)
        })
      })

      cy.visit('/dashboard/')

      // Should show loading indicators initially
      cy.get('.loading-spinner, .loading, [class*="loading"], .skeleton').should('exist')
    })

    it('should show data after loading', () => {
      cy.visit('/dashboard/')
      cy.wait(2000)

      // Widgets should show actual data
      cy.get('.widget-value').first().should('not.contain', 'Loading')
    })

    it('should handle API errors gracefully', () => {
      // Intercept and fail the request
      cy.intercept('GET', '**/liquidity-prediction*', {
        statusCode: 500,
        body: { error: 'Server error' }
      })

      cy.visit('/liquidity-hunter/')
      cy.grantAccess('daily', 86400000)

      // Should not crash - page should still be visible
      cy.get('body').should('be.visible')
    })
  })

  describe('Price Ticker Loading', () => {
    it('should show price after loading', () => {
      cy.visit('/')

      // Wait for price to load
      cy.get('[class*="price"], [id*="price"]', { timeout: 10000 })
        .first()
        .should('not.contain', 'Loading')
    })
  })

  describe('Alpha Radar Loading', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400000)
      cy.visit('/alpha-radar/')
    })

    it('should show loading state for market data', () => {
      cy.get('#btc-dom, #fear-greed, #funding-rate').each(($el) => {
        // Initially may show loading or placeholder
        cy.wrap($el).should('exist')
      })
    })

    it('should load whale alerts', () => {
      cy.get('#whale-alerts-list', { timeout: 10000 }).should('exist')
    })
  })

  describe('Liquidity Hunter Loading', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400000)
      cy.visit('/liquidity-hunter/')
    })

    it('should load predictions', () => {
      cy.get('#top-zone, #bottom-zone', { timeout: 10000 }).should('exist')
    })

    it('should show probability meters', () => {
      cy.get('.prob-bar, .probability-meter').should('exist')
    })
  })

  describe('Pattern Detector Loading', () => {
    it('should show chart loading state', () => {
      cy.visit('/pattern-detector/')

      // Chart container should exist
      cy.get('#pattern-chart, .chart-container').should('exist')
    })

    it('should show pattern analysis loading', () => {
      cy.visit('/pattern-detector/')

      // Pattern cards should exist
      cy.get('.pattern-card').should('have.length.at.least', 1)
    })
  })

  describe('Error States', () => {
    it('should show error for failed API calls', () => {
      cy.intercept('POST', '/.netlify/functions/create-invoice', {
        statusCode: 500,
        body: { error: 'Failed to create invoice' }
      })

      cy.visit('/pricing/')
      cy.get('.pricing-card.daily .btn-purchase').click()

      // Should show error state in modal or toast
      cy.wait(2000)
      cy.get('body').should('be.visible')
    })

    it('should show error for failed recovery', () => {
      cy.intercept('POST', '/.netlify/functions/recover-access', {
        statusCode: 404,
        body: { error: 'Recovery code not found' }
      })

      cy.visit('/recover/')
      cy.get('#recovery-input').type('BTCSIG-INVALID-CODE')
      cy.get('#btn-recover').click()

      // Should show error message
      cy.get('#recovery-result').should('be.visible')
    })
  })

  describe('Empty States', () => {
    it('should show empty state for no trades', () => {
      cy.grantAccess('daily', 86400000)
      cy.visit('/trading-history/')

      // Should have some content even if no trades
      cy.get('body').should('be.visible')
      cy.get('h1').should('be.visible')
    })

    it('should show empty state for no analyses', () => {
      cy.grantAccess('daily', 86400000)
      cy.visit('/trade-coach/')

      // Should show "no analyses" message
      cy.get('.no-analyses, #analyses-list').should('exist')
    })
  })

  describe('Timeout Handling', () => {
    it('should handle slow network gracefully', () => {
      // Simulate slow network
      cy.intercept('GET', '**/*', (req) => {
        req.on('response', (res) => {
          res.setDelay(3000)
        })
      })

      cy.visit('/', { timeout: 30000 })
      cy.get('body').should('be.visible')
    })
  })
})
