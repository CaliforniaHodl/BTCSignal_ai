/// <reference types="cypress" />

describe('Portfolio Simulator Page', () => {
  describe('Without Access (Premium Gate)', () => {
    beforeEach(() => {
      cy.clearAccess()
      cy.visit('/portfolio-simulator/')
    })

    it('should show premium gate', () => {
      cy.get('#premium-gate').should('be.visible')
      cy.get('#premium-content').should('not.be.visible')
    })

    it('should display correct title', () => {
      cy.get('#premium-gate h1').should('contain', 'Portfolio Simulator')
    })

    it('should show feature list', () => {
      cy.get('.gate-features .feature-item').should('have.length', 4)
      cy.get('.gate-features').should('contain', 'Equity Curves')
      cy.get('.gate-features').should('contain', 'Drawdown')
    })

    it('should have unlock button', () => {
      cy.get('#btn-unlock').should('be.visible')
    })
  })

  describe('With Access (Premium Content)', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/portfolio-simulator/')
    })

    it('should show premium content', () => {
      cy.get('#premium-content').should('be.visible')
      cy.get('#premium-gate').should('not.be.visible')
    })

    it('should display header', () => {
      cy.get('.simulator-header h1').should('contain', 'Portfolio Simulator')
    })

    describe('Strategy Configuration', () => {
      it('should display strategy config section', () => {
        cy.get('.strategy-config').should('be.visible')
      })

      it('should have strategy preset dropdown', () => {
        cy.get('#strategy-preset').should('be.visible')
      })

      it('should have preset options', () => {
        cy.get('#strategy-preset option').should('have.length.at.least', 5)
        cy.get('#strategy-preset option[value="dca-weekly"]').should('exist')
        cy.get('#strategy-preset option[value="dca-monthly"]').should('exist')
        cy.get('#strategy-preset option[value="ema-cross"]').should('exist')
      })

      it('should have date range inputs', () => {
        cy.get('#start-date').should('be.visible')
        cy.get('#end-date').should('be.visible')
      })

      it('should have capital inputs', () => {
        cy.get('#initial-capital').should('be.visible')
        cy.get('#initial-capital').should('have.value', '10000')
        cy.get('#position-size').should('be.visible')
      })

      it('should display custom strategy options', () => {
        cy.get('#strategy-preset').select('custom')
        cy.get('#custom-options').should('be.visible')
      })

      it('should have entry condition dropdown', () => {
        cy.get('#strategy-preset').select('custom')
        cy.get('#entry-condition').should('be.visible')
        cy.get('#entry-condition option').should('have.length.at.least', 5)
      })

      it('should have exit condition dropdown', () => {
        cy.get('#strategy-preset').select('custom')
        cy.get('#exit-condition').should('be.visible')
      })

      it('should have take profit and stop loss inputs', () => {
        cy.get('#strategy-preset').select('custom')
        cy.get('#take-profit-pct').should('be.visible')
        cy.get('#stop-loss-pct').should('be.visible')
      })

      it('should have allow shorts checkbox', () => {
        cy.get('#strategy-preset').select('custom')
        cy.get('#allow-shorts').should('exist')
      })

      it('should have compound gains checkbox', () => {
        cy.get('#strategy-preset').select('custom')
        cy.get('#compound-gains').should('be.checked')
      })

      it('should have simulate button', () => {
        cy.get('#btn-simulate').should('be.visible')
        cy.get('#btn-simulate').should('contain', 'Run Simulation')
      })
    })

    describe('Strategy Preset Selection', () => {
      it('should switch to DCA Weekly strategy', () => {
        cy.get('#strategy-preset').select('dca-weekly')
        cy.get('#strategy-preset').should('have.value', 'dca-weekly')
      })

      it('should switch to EMA Cross strategy', () => {
        cy.get('#strategy-preset').select('ema-cross')
        cy.get('#strategy-preset').should('have.value', 'ema-cross')
      })

      it('should switch to Follow BTC Signal AI', () => {
        cy.get('#strategy-preset').select('signal-follow')
        cy.get('#strategy-preset').should('have.value', 'signal-follow')
      })
    })

    describe('Form Submission', () => {
      it('should allow configuring and submitting simulation', () => {
        // Set dates
        const startDate = '2024-01-01'
        const endDate = '2024-12-01'
        cy.get('#start-date').type(startDate)
        cy.get('#end-date').type(endDate)

        // Set capital
        cy.get('#initial-capital').clear().type('10000')
        cy.get('#position-size').clear().type('10')

        // Select preset
        cy.get('#strategy-preset').select('dca-weekly')

        // Submit
        cy.get('#btn-simulate').click()

        // Results should appear
        cy.get('#simulation-results', { timeout: 15000 }).should('be.visible')
      })
    })

    describe('Simulation Results', () => {
      beforeEach(() => {
        // Configure and run simulation
        cy.get('#start-date').type('2024-06-01')
        cy.get('#end-date').type('2024-12-01')
        cy.get('#strategy-preset').select('dca-weekly')
        cy.get('#btn-simulate').click()
      })

      it('should display results section', () => {
        cy.get('#simulation-results', { timeout: 15000 }).should('be.visible')
      })

      it('should show total return', () => {
        cy.get('#total-return', { timeout: 15000 }).should('exist')
      })

      it('should show final balance', () => {
        cy.get('#final-balance', { timeout: 15000 }).should('exist')
      })

      it('should display results summary cards', () => {
        cy.get('.results-summary', { timeout: 15000 }).should('be.visible')
        cy.get('.summary-card').should('have.length.at.least', 2)
      })
    })
  })

  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/portfolio-simulator/')
    })

    it('should display correctly on mobile', () => {
      cy.setMobileViewport()
      cy.get('#premium-content').should('be.visible')
      cy.get('#simulator-form').should('be.visible')
    })

    it('should display correctly on tablet', () => {
      cy.setTabletViewport()
      cy.get('#premium-content').should('be.visible')
    })
  })
})
