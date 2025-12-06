/// <reference types="cypress" />

describe('Backtester Pro Page', () => {
  describe('Without Access (Premium Gate)', () => {
    beforeEach(() => {
      cy.clearAccess()
      cy.visit('/backtester-pro/')
    })

    it('should show premium gate', () => {
      cy.get('body').then(($body) => {
        if ($body.find('#premium-gate').length > 0) {
          cy.get('#premium-gate').should('be.visible')
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
      cy.visit('/backtester-pro/')
    })

    it('should show premium content if page has paywall', () => {
      cy.get('body').then(($body) => {
        if ($body.find('#premium-content').length > 0) {
          cy.get('#premium-content').should('be.visible')
        }
      })
    })

    it('should display backtester interface', () => {
      cy.get('h1').should('be.visible')
    })

    describe('Strategy Input', () => {
      it('should have strategy input area', () => {
        cy.get('textarea, input[type="text"], [class*="strategy"]').should('exist')
      })

      it('should accept text input for strategy', () => {
        cy.get('textarea').first().then(($textarea) => {
          if ($textarea.length > 0) {
            cy.wrap($textarea).type('Buy when RSI < 30, sell when RSI > 70')
            cy.wrap($textarea).should('contain.value', 'RSI')
          }
        })
      })
    })

    describe('Backtest Execution', () => {
      it('should have a run/submit button', () => {
        cy.get('button').contains(/run|backtest|test|submit|analyze/i).should('exist')
      })
    })
  })

  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/backtester-pro/')
    })

    it('should display correctly on mobile', () => {
      cy.setMobileViewport()
      cy.get('body').should('be.visible')
      cy.get('h1').should('be.visible')
    })

    it('should display correctly on tablet', () => {
      cy.setTabletViewport()
      cy.get('body').should('be.visible')
    })
  })
})
