/// <reference types="cypress" />

describe('Alpha Radar Page', () => {
  describe('Without Access (Premium Gate)', () => {
    beforeEach(() => {
      cy.clearAccess()
      cy.visit('/alpha-radar/')
    })

    it('should show premium gate', () => {
      cy.get('#premium-gate').should('be.visible')
      cy.get('#premium-content').should('not.be.visible')
    })

    it('should display correct title and description', () => {
      cy.get('#premium-gate h1').should('contain', 'Alpha Radar')
      cy.get('.gate-desc').should('contain', 'Market intelligence')
    })

    it('should show feature list', () => {
      cy.get('.gate-features .feature-item').should('have.length', 4)
      cy.get('.gate-features').should('contain', 'BTC Dominance')
      cy.get('.gate-features').should('contain', 'Whale')
    })

    it('should display unlock button', () => {
      cy.get('#btn-unlock').should('be.visible')
      cy.get('#btn-unlock').should('contain', 'Unlock')
    })

    it('should have check access link', () => {
      cy.get('#check-access').should('exist')
    })
  })

  describe('With Access (Premium Content)', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/alpha-radar/')
    })

    it('should show premium content', () => {
      cy.get('#premium-content').should('be.visible')
      cy.get('#premium-gate').should('not.be.visible')
    })

    it('should display header', () => {
      cy.get('.radar-header h1').should('contain', 'Alpha Radar')
      cy.get('.radar-header .subtitle').should('be.visible')
    })

    it('should show last scan time and refresh button', () => {
      cy.get('#last-scan').should('exist')
      cy.get('#btn-refresh').should('be.visible')
    })

    describe('Market Overview Section', () => {
      it('should display market overview', () => {
        cy.get('.market-overview').should('be.visible')
        cy.get('.market-overview h2').should('contain', 'Market Overview')
      })

      it('should display BTC Dominance card', () => {
        cy.get('.overview-card.dominance').should('be.visible')
        cy.get('.overview-card.dominance h3').should('contain', 'BTC Dominance')
        cy.get('#btc-dom').should('exist')
      })

      it('should display Stablecoin Supply card', () => {
        cy.get('.overview-card.stablecoin').should('be.visible')
        cy.get('#stable-supply').should('exist')
      })

      it('should display Fear & Greed card', () => {
        cy.get('.overview-card.fear-greed').should('be.visible')
        cy.get('#fear-greed').should('exist')
        cy.get('.fear-greed-bar').should('exist')
      })

      it('should display Funding Rate card', () => {
        cy.get('.overview-card.funding').should('be.visible')
        cy.get('#funding-rate').should('exist')
      })
    })

    describe('Whale Activity Section', () => {
      it('should display whale activity section', () => {
        cy.get('.whale-activity').should('be.visible')
        cy.get('.whale-activity h2').should('contain', 'Whale Activity')
      })

      it('should display whale cards', () => {
        cy.get('.whale-card').should('have.length.at.least', 3)
      })

      it('should display alert count', () => {
        cy.get('#whale-alert-count').should('exist')
      })

      it('should display exchange inflow', () => {
        cy.get('#exchange-inflow').should('exist')
      })

      it('should display exchange outflow', () => {
        cy.get('#exchange-outflow').should('exist')
      })

      it('should display largest transaction', () => {
        cy.get('#largest-tx').should('exist')
      })
    })

    describe('Whale Alerts Feed', () => {
      it('should display whale alerts section', () => {
        cy.get('.whale-alerts').should('be.visible')
        cy.get('.whale-alerts h2').should('contain', 'Whale Alerts')
      })

      it('should have whale alerts list', () => {
        cy.get('#whale-alerts-list').should('exist')
      })

      it('should have link to view all whale alerts', () => {
        cy.get('.view-all-link').should('have.attr', 'href', '/whales/')
      })
    })

    describe('HTF Liquidity Zones', () => {
      it('should display liquidity zones section', () => {
        cy.get('.liquidity-zones').should('be.visible')
        cy.get('.liquidity-zones h2').should('contain', 'Liquidity')
      })

      it('should have liquidity zones container', () => {
        cy.get('#liquidity-zones').should('exist')
      })
    })

    describe('Anomaly Detection', () => {
      it('should display anomalies section', () => {
        cy.get('.anomalies').should('be.visible')
        cy.get('.anomalies h2').should('contain', 'Anomalies')
      })

      it('should have anomaly list', () => {
        cy.get('#anomaly-list').should('exist')
      })
    })

    describe('AI Summary', () => {
      it('should display AI summary section', () => {
        cy.get('.ai-summary').should('be.visible')
        cy.get('.ai-summary h2').should('contain', 'AI Market Summary')
      })

      it('should have summary content container', () => {
        cy.get('#ai-summary').should('exist')
      })
    })

    describe('Refresh Functionality', () => {
      it('should have working refresh button', () => {
        cy.get('#btn-refresh').should('be.visible')
        cy.get('#btn-refresh').click()
        // Button should trigger refresh
      })
    })
  })

  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/alpha-radar/')
    })

    it('should display correctly on mobile', () => {
      cy.setMobileViewport()
      cy.get('#premium-content').should('be.visible')
      cy.get('.overview-grid').should('be.visible')
    })

    it('should display correctly on tablet', () => {
      cy.setTabletViewport()
      cy.get('#premium-content').should('be.visible')
    })
  })
})
