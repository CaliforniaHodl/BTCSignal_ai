/// <reference types="cypress" />

describe('Pattern Detector Page', () => {
  describe('Public Access (Free Preview)', () => {
    beforeEach(() => {
      cy.clearAccess()
      cy.visit('/pattern-detector/')
    })

    it('should load the page successfully', () => {
      cy.get('.pattern-detector-page').should('be.visible')
    })

    it('should display header with title', () => {
      cy.get('.detector-header h1').should('contain', 'Pattern Detector')
    })

    describe('Timeframe Selector', () => {
      it('should display timeframe buttons', () => {
        cy.get('.timeframe-selector').should('be.visible')
        cy.get('.tf-btn').should('have.length', 4)
      })

      it('should have correct timeframe options', () => {
        cy.get('.tf-btn[data-tf="15m"]').should('contain', '15M')
        cy.get('.tf-btn[data-tf="1h"]').should('contain', '1H')
        cy.get('.tf-btn[data-tf="4h"]').should('contain', '4H')
        cy.get('.tf-btn[data-tf="1d"]').should('contain', '1D')
      })

      it('should have 15M as default active', () => {
        cy.get('.tf-btn[data-tf="15m"]').should('have.class', 'active')
      })

      it('should switch timeframe when clicking button', () => {
        cy.get('.tf-btn[data-tf="4h"]').click()
        cy.get('.tf-btn[data-tf="4h"]').should('have.class', 'active')
        cy.get('.tf-btn[data-tf="15m"]').should('not.have.class', 'active')
      })
    })

    describe('Chart Section', () => {
      it('should display chart section', () => {
        cy.get('.chart-section').should('be.visible')
      })

      it('should have chart canvas', () => {
        cy.get('#pattern-chart').should('exist')
      })

      it('should display current price element', () => {
        cy.get('#current-price').should('exist')
      })

      it('should have refresh button', () => {
        cy.get('#btn-refresh').should('be.visible')
      })
    })

    describe('Free Pattern Preview', () => {
      it('should display pattern preview section', () => {
        cy.get('.patterns-preview').should('be.visible')
      })

      it('should show free preview pattern card', () => {
        cy.get('#main-pattern').should('be.visible')
        cy.get('#main-pattern .pattern-badge').should('contain', 'FREE')
      })

      it('should display pattern elements', () => {
        cy.get('#pattern-name').should('exist')
        cy.get('#pattern-confidence').should('exist')
        cy.get('#support-level').should('exist')
        cy.get('#resistance-level').should('exist')
      })

      it('should show locked premium patterns', () => {
        cy.get('.pattern-card.locked').should('have.length.at.least', 3)
      })

      it('should show premium badges on locked patterns', () => {
        cy.get('.pattern-card.locked .pattern-badge').first().should('contain', 'PREMIUM')
      })
    })

    describe('Premium Upsell', () => {
      it('should display premium upsell section', () => {
        cy.get('#premium-gate').should('be.visible')
      })

      it('should show unlock button', () => {
        cy.get('#btn-unlock').should('be.visible')
        cy.get('#btn-unlock').should('contain', 'Unlock')
      })

      it('should list premium features', () => {
        cy.get('.upsell-features .upsell-feature').should('have.length.at.least', 4)
      })
    })

    describe('Pattern Education', () => {
      it('should display education section', () => {
        cy.get('.pattern-education').should('be.visible')
      })

      it('should have education cards linking to learn articles', () => {
        cy.get('.edu-card').should('have.length', 4)
        cy.get('.edu-card[href*="/learn/"]').should('have.length', 4)
      })
    })
  })

  describe('With Premium Access', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/pattern-detector/')
    })

    it('should show premium content', () => {
      cy.get('#premium-content').should('be.visible')
    })

    it('should have full patterns section', () => {
      cy.get('#full-patterns').should('exist')
    })

    it('should have trendlines section', () => {
      cy.get('#trendlines-grid').should('exist')
    })

    it('should have order blocks section', () => {
      cy.get('#orderblocks-grid').should('exist')
    })

    it('should have FVG section', () => {
      cy.get('#fvg-grid').should('exist')
    })

    it('should have AI summary', () => {
      cy.get('#ai-summary').should('exist')
    })
  })

  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.visit('/pattern-detector/')
    })

    it('should display correctly on mobile', () => {
      cy.setMobileViewport()
      cy.get('.pattern-detector-page').should('be.visible')
      cy.get('.timeframe-selector').should('be.visible')
    })

    it('should display correctly on tablet', () => {
      cy.setTabletViewport()
      cy.get('.pattern-detector-page').should('be.visible')
    })
  })
})
