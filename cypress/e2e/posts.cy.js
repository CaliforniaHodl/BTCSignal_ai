/// <reference types="cypress" />

describe('Analysis Posts Page', () => {
  beforeEach(() => {
    cy.visit('/posts/')
  })

  describe('Page Structure', () => {
    it('should load the posts page successfully', () => {
      cy.get('body').should('be.visible')
      cy.url().should('include', '/posts')
    })

    it('should display the main title', () => {
      cy.get('h1').should('be.visible')
    })

    it('should display posts list or table', () => {
      cy.get('table, .posts-list, .post-card, article, [class*="post"]')
        .should('exist')
    })
  })

  describe('Post Entries', () => {
    it('should display at least one post entry', () => {
      cy.get('a[href*="/posts/"]').should('have.length.at.least', 1)
    })

    it('should navigate to a post when clicking', () => {
      cy.get('a[href*="/posts/2"]').first().click()
      cy.url().should('include', '/posts/')
    })
  })

  describe('Responsive Design', () => {
    it('should display correctly on mobile', () => {
      cy.setMobileViewport()
      cy.get('body').should('be.visible')
    })
  })
})

describe('Single Analysis Post', () => {
  beforeEach(() => {
    // Visit the most recent post
    cy.visit('/posts/')
    cy.get('a[href*="/posts/2"]').first().then(($link) => {
      cy.visit($link.attr('href'))
    })
  })

  describe('Post Structure', () => {
    it('should load the post successfully', () => {
      cy.get('body').should('be.visible')
    })

    it('should display post title', () => {
      cy.get('h1').should('be.visible')
    })

    it('should display post content', () => {
      cy.get('article, .post-content, .content, main').should('be.visible')
    })

    it('should display post metadata (date, sentiment)', () => {
      cy.get('body').then(($body) => {
        // Look for date or sentiment indicators
        const hasMetadata =
          $body.text().includes('2025') ||
          $body.text().toLowerCase().includes('bullish') ||
          $body.text().toLowerCase().includes('bearish')
        expect(hasMetadata).to.be.true
      })
    })
  })
})
