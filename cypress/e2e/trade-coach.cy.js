/// <reference types="cypress" />

describe('Trade Coach Page', () => {
  describe('Without Access (Premium Gate)', () => {
    beforeEach(() => {
      cy.clearAccess()
      cy.visit('/trade-coach/')
    })

    it('should show premium gate', () => {
      cy.get('#premium-gate').should('be.visible')
      cy.get('#premium-content').should('not.be.visible')
    })

    it('should display correct title', () => {
      cy.get('#premium-gate h1').should('contain', 'Trade Coach')
    })

    it('should show feature list', () => {
      cy.get('.gate-features .feature-item').should('have.length', 4)
    })

    it('should have unlock button', () => {
      cy.get('#btn-unlock').should('be.visible')
    })
  })

  describe('With Access (Premium Content)', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/trade-coach/')
    })

    it('should show premium content', () => {
      cy.get('#premium-content').should('be.visible')
      cy.get('#premium-gate').should('not.be.visible')
    })

    it('should display header', () => {
      cy.get('.coach-header h1').should('contain', 'Trade Coach')
    })

    describe('Trade Input Form', () => {
      it('should display the trade form', () => {
        cy.get('#trade-form').should('be.visible')
      })

      it('should have direction select', () => {
        cy.get('#trade-direction').should('be.visible')
        cy.get('#trade-direction option').should('have.length.at.least', 3)
      })

      it('should have timeframe select', () => {
        cy.get('#trade-timeframe').should('be.visible')
        cy.get('#trade-timeframe option').should('have.length.at.least', 6)
      })

      it('should have entry price input', () => {
        cy.get('#entry-price').should('be.visible')
        cy.get('#entry-price').should('have.attr', 'type', 'number')
      })

      it('should have stop loss input', () => {
        cy.get('#stop-loss').should('be.visible')
      })

      it('should have take profit input', () => {
        cy.get('#take-profit').should('be.visible')
      })

      it('should have position size input', () => {
        cy.get('#position-size').should('be.visible')
      })

      it('should have outcome select', () => {
        cy.get('#trade-outcome').should('be.visible')
      })

      it('should have reasoning textarea', () => {
        cy.get('#trade-reasoning').should('be.visible')
      })

      it('should have analyze button', () => {
        cy.get('#btn-analyze').should('be.visible')
        cy.get('#btn-analyze').should('contain', 'Analyze')
      })
    })

    describe('Form Interactions', () => {
      it('should allow filling out the form', () => {
        cy.get('#trade-direction').select('long')
        cy.get('#trade-timeframe').select('4h')
        cy.get('#entry-price').type('95000')
        cy.get('#stop-loss').type('94000')
        cy.get('#take-profit').type('98000')
        cy.get('#position-size').type('5000')
        cy.get('#trade-reasoning').type('Bullish divergence on RSI with support hold')

        cy.get('#trade-direction').should('have.value', 'long')
        cy.get('#entry-price').should('have.value', '95000')
      })

      it('should submit form and show results', () => {
        // Fill required fields
        cy.get('#trade-direction').select('long')
        cy.get('#trade-timeframe').select('1h')
        cy.get('#entry-price').type('95000')

        // Submit
        cy.get('#btn-analyze').click()

        // Results section should appear (may show loading first)
        cy.get('#analysis-results', { timeout: 10000 }).should('be.visible')
      })
    })

    describe('Analysis Results', () => {
      beforeEach(() => {
        // Fill and submit form
        cy.get('#trade-direction').select('long')
        cy.get('#trade-timeframe').select('4h')
        cy.get('#entry-price').type('95000')
        cy.get('#stop-loss').type('94000')
        cy.get('#take-profit').type('98000')
        cy.get('#btn-analyze').click()
      })

      it('should display score circle', () => {
        cy.get('.score-display', { timeout: 10000 }).should('be.visible')
        cy.get('#trade-score').should('exist')
      })

      it('should display score breakdown', () => {
        cy.get('.score-breakdown', { timeout: 10000 }).should('be.visible')
        cy.get('#entry-score').should('exist')
        cy.get('#risk-score').should('exist')
        cy.get('#logic-score').should('exist')
      })

      it('should display feedback cards', () => {
        cy.get('.feedback-grid', { timeout: 10000 }).should('be.visible')
        cy.get('.feedback-card').should('have.length.at.least', 4)
      })

      it('should have strengths section', () => {
        cy.get('#strengths-content', { timeout: 10000 }).should('exist')
      })

      it('should have improvements section', () => {
        cy.get('#improvements-content').should('exist')
      })

      it('should have psychology section', () => {
        cy.get('#psychology-content').should('exist')
      })

      it('should have analyze another button', () => {
        cy.get('#btn-new-trade', { timeout: 10000 }).should('be.visible')
      })
    })

    describe('User Stats Section', () => {
      it('should display user stats section', () => {
        cy.get('#user-stats-section').should('be.visible')
      })
    })

    describe('Recent Analyses Section', () => {
      it('should display recent analyses section', () => {
        cy.get('.recent-analyses').should('be.visible')
        cy.get('#analyses-list').should('exist')
      })
    })
  })

  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/trade-coach/')
    })

    it('should display correctly on mobile', () => {
      cy.setMobileViewport()
      cy.get('#premium-content').should('be.visible')
      cy.get('#trade-form').should('be.visible')
    })

    it('should display correctly on tablet', () => {
      cy.setTabletViewport()
      cy.get('#premium-content').should('be.visible')
    })
  })
})
