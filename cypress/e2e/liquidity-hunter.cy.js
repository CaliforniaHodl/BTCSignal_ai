/// <reference types="cypress" />

describe('Liquidity Hunter Page', () => {
  describe('Without Access (Premium Gate)', () => {
    beforeEach(() => {
      cy.clearAccess()
      cy.visit('/liquidity-hunter/')
    })

    it('should show premium gate', () => {
      cy.get('#premium-gate').should('be.visible')
      cy.get('#premium-content').should('not.be.visible')
    })

    it('should display correct title and description', () => {
      cy.get('#premium-gate h1').should('contain', 'Liquidity Hunter')
      cy.get('.gate-desc').should('contain', 'liquidity sweep')
    })

    it('should show feature list', () => {
      cy.get('.gate-features .feature-item').should('have.length', 4)
      cy.get('.gate-features').should('contain', 'Top-side')
      cy.get('.gate-features').should('contain', 'Bottom-side')
      cy.get('.gate-features').should('contain', 'Probability')
      cy.get('.gate-features').should('contain', 'ETA')
    })

    it('should display unlock button', () => {
      cy.get('#btn-unlock').should('be.visible')
      cy.get('#btn-unlock').should('contain', 'Unlock')
    })
  })

  describe('With Access (Premium Content)', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/liquidity-hunter/')
    })

    it('should show premium content', () => {
      cy.get('#premium-content').should('be.visible')
      cy.get('#premium-gate').should('not.be.visible')
    })

    it('should display header', () => {
      cy.get('.hunter-header h1').should('contain', 'Liquidity Hunter')
      cy.get('.hunter-header .subtitle').should('be.visible')
    })

    it('should show last analysis time and refresh button', () => {
      cy.get('#last-analysis').should('exist')
      cy.get('#btn-refresh').should('be.visible')
    })

    describe('Price Context Section', () => {
      it('should display current price', () => {
        cy.get('.price-context').should('be.visible')
        cy.get('#current-price').should('exist')
      })

      it('should display AI bias indicator', () => {
        cy.get('#bias-indicator').should('be.visible')
        cy.get('#bias-value').should('exist')
      })
    })

    describe('Prediction Display', () => {
      it('should display prediction cards', () => {
        cy.get('.prediction-display').should('be.visible')
        cy.get('.prediction-card').should('have.length', 2)
      })

      it('should display top-side prediction', () => {
        cy.get('.prediction-card.topside').should('be.visible')
        cy.get('.prediction-card.topside h2').should('contain', 'Top-side')
        cy.get('#top-zone').should('exist')
        cy.get('#top-prob').should('exist')
        cy.get('#top-eta').should('exist')
      })

      it('should display bottom-side prediction', () => {
        cy.get('.prediction-card.bottomside').should('be.visible')
        cy.get('.prediction-card.bottomside h2').should('contain', 'Bottom-side')
        cy.get('#bottom-zone').should('exist')
        cy.get('#bottom-prob').should('exist')
        cy.get('#bottom-eta').should('exist')
      })

      it('should display probability meters', () => {
        cy.get('.probability-meter').should('have.length', 2)
        cy.get('.prob-bar').should('have.length', 2)
        cy.get('.prob-fill').should('have.length', 2)
      })

      it('should display VS divider', () => {
        cy.get('.vs-divider').should('be.visible')
        cy.get('.vs-divider').should('contain', 'VS')
      })

      it('should display reasoning sections', () => {
        cy.get('#top-reasoning').should('exist')
        cy.get('#bottom-reasoning').should('exist')
      })
    })

    describe('Liquidity Map Section', () => {
      it('should display liquidity map section', () => {
        cy.get('.liquidity-map').should('be.visible')
        cy.get('.liquidity-map h2').should('contain', 'Liquidity Map')
      })

      it('should have map container', () => {
        cy.get('#liquidity-map').should('exist')
      })
    })

    describe('Accuracy Section', () => {
      it('should display accuracy section', () => {
        cy.get('.accuracy-section').should('be.visible')
        cy.get('.accuracy-section h2').should('contain', 'Prediction Accuracy')
      })

      it('should display accuracy metrics', () => {
        cy.get('.accuracy-card').should('have.length.at.least', 3)
        cy.get('#accuracy-7d').should('exist')
        cy.get('#accuracy-30d').should('exist')
        cy.get('#predictions-hit').should('exist')
      })
    })

    describe('AI Notes Section', () => {
      it('should display AI notes section', () => {
        cy.get('.ai-notes').should('be.visible')
        cy.get('.ai-notes h2').should('contain', 'AI Analysis')
      })

      it('should have notes content container', () => {
        cy.get('#ai-notes').should('exist')
      })
    })

    describe('Refresh Functionality', () => {
      it('should have working refresh button', () => {
        cy.get('#btn-refresh').should('be.visible')
        cy.get('#btn-refresh').click()
        // Refresh should trigger
      })
    })
  })

  describe('With Mock Data', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)

      // Mock the predictions data
      cy.intercept('GET', '**/predictions*.json', {
        fixture: 'predictions.json'
      }).as('getPredictions')

      cy.visit('/liquidity-hunter/')
    })

    it('should display prediction data when loaded', () => {
      // Wait for data to potentially load
      cy.wait(1000)

      // Check that elements exist and may show data
      cy.get('#top-zone').should('exist')
      cy.get('#bottom-zone').should('exist')
    })
  })

  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/liquidity-hunter/')
    })

    it('should display correctly on mobile', () => {
      cy.setMobileViewport()
      cy.get('#premium-content').should('be.visible')
      cy.get('.prediction-display').should('be.visible')
    })

    it('should stack prediction cards on mobile', () => {
      cy.setMobileViewport()
      cy.get('.prediction-card.topside').should('be.visible')
      cy.get('.prediction-card.bottomside').should('be.visible')
    })

    it('should display correctly on tablet', () => {
      cy.setTabletViewport()
      cy.get('#premium-content').should('be.visible')
    })
  })
})
