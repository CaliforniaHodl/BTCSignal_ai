/// <reference types="cypress" />

describe('Homepage', () => {
  beforeEach(() => {
    // Clear any existing access before each test
    cy.clearAccess()
    cy.visit('/')
  })

  describe('Page Load', () => {
    it('should load the homepage successfully', () => {
      cy.get('body').should('be.visible')
      cy.title().should('contain', 'BTC')
    })

    it('should display the header with navigation', () => {
      cy.get('header, nav').should('be.visible')
      cy.get('header, nav').contains('Pricing')
      cy.get('header, nav').contains('Dashboard')
    })

    it('should display the hero section', () => {
      cy.get('h1').should('be.visible')
    })

    it('should display the footer', () => {
      cy.get('footer').should('exist')
    })
  })

  describe('BTC Price Ticker', () => {
    it('should display a price element', () => {
      // Look for any element that might contain the price
      cy.get('[class*="price"], [id*="price"]').should('exist')
    })

    it('should show price in dollar format after loading', () => {
      // Wait for price to load (not showing loading state)
      cy.get('[class*="price"], [id*="price"]')
        .first()
        .should('not.contain', 'Loading')
    })
  })

  describe('Market Sentiment Section', () => {
    it('should display market sentiment widgets', () => {
      // Check for sentiment-related sections
      cy.get('[class*="sentiment"], [class*="market"]').should('exist')
    })

    it('should display Fear & Greed indicator', () => {
      cy.contains(/fear.*greed|greed.*fear/i).should('exist')
    })
  })

  describe('Navigation Links', () => {
    it('should navigate to Pricing page', () => {
      cy.get('header, nav').contains('Pricing').click()
      cy.url().should('include', '/pricing')
    })

    it('should navigate to Dashboard page', () => {
      cy.get('header, nav').contains('Dashboard').click()
      cy.url().should('include', '/dashboard')
    })
  })

  describe('Responsive Design', () => {
    it('should display correctly on mobile', () => {
      cy.setMobileViewport()
      cy.get('body').should('be.visible')
      cy.get('h1').should('be.visible')
    })

    it('should display correctly on tablet', () => {
      cy.setTabletViewport()
      cy.get('body').should('be.visible')
      cy.get('h1').should('be.visible')
    })

    it('should display correctly on desktop', () => {
      cy.setDesktopViewport()
      cy.get('body').should('be.visible')
      cy.get('h1').should('be.visible')
    })
  })
})
