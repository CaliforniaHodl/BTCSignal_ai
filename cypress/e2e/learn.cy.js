/// <reference types="cypress" />

describe('Learn Hub', () => {
  beforeEach(() => {
    cy.visit('/learn/')
  })

  describe('Page Structure', () => {
    it('should load the learn hub successfully', () => {
      cy.get('body').should('be.visible')
      cy.url().should('include', '/learn')
    })

    it('should display the main title', () => {
      cy.get('h1').should('be.visible')
    })

    it('should display learning articles list', () => {
      // Check for article cards or list
      cy.get('article, .article, .post-card, .learn-card, .card, [class*="article"]')
        .should('have.length.at.least', 1)
    })
  })

  describe('Article Navigation', () => {
    it('should navigate to an article when clicking', () => {
      cy.get('a[href*="/learn/"]').first().click()
      cy.url().should('include', '/learn/')
    })
  })

  describe('Responsive Design', () => {
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

describe('Learn Article Page', () => {
  beforeEach(() => {
    cy.visit('/learn/funding-rates/')
  })

  describe('Article Structure', () => {
    it('should load the article successfully', () => {
      cy.get('body').should('be.visible')
    })

    it('should display article title', () => {
      cy.get('h1').should('be.visible')
    })

    it('should display article content', () => {
      cy.get('article, .article-content, .content, main').should('be.visible')
    })
  })

  describe('Related Articles', () => {
    it('should show related posts section if available', () => {
      cy.get('body').then(($body) => {
        if ($body.find('.related-posts, .related-articles, [class*="related"]').length > 0) {
          cy.get('.related-posts, .related-articles, [class*="related"]').should('be.visible')
        }
      })
    })
  })

  describe('Navigation', () => {
    it('should have link back to learn hub', () => {
      cy.get('a[href*="/learn"]').should('exist')
    })
  })
})
