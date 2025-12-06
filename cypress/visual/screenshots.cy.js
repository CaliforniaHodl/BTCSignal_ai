/// <reference types="cypress" />

/**
 * Visual Regression Tests
 * Captures screenshots of all pages at different viewports
 * Run with: npm run test:visual
 */

describe('Visual Regression - Page Screenshots', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
  ]

  // Public pages
  const publicPages = [
    { path: '/', name: 'homepage' },
    { path: '/pricing/', name: 'pricing' },
    { path: '/recover/', name: 'recover' },
    { path: '/learn/', name: 'learn-hub' },
    { path: '/posts/', name: 'posts' },
    { path: '/about/', name: 'about' },
    { path: '/faq/', name: 'faq' },
    { path: '/how-it-works/', name: 'how-it-works' },
    { path: '/whales/', name: 'whales' },
    { path: '/alerts/', name: 'alerts' },
    { path: '/newsletter/', name: 'newsletter' }
  ]

  // Premium pages (need access)
  const premiumPages = [
    { path: '/dashboard/', name: 'dashboard' },
    { path: '/alpha-radar/', name: 'alpha-radar' },
    { path: '/liquidity-hunter/', name: 'liquidity-hunter' },
    { path: '/pattern-detector/', name: 'pattern-detector' },
    { path: '/trade-coach/', name: 'trade-coach' },
    { path: '/portfolio-simulator/', name: 'portfolio-simulator' },
    { path: '/backtester-pro/', name: 'backtester-pro' },
    { path: '/liquidation-map/', name: 'liquidation-map' },
    { path: '/analyze/', name: 'chart-ai' },
    { path: '/trading-history/', name: 'trading-history' }
  ]

  describe('Public Pages', () => {
    viewports.forEach((viewport) => {
      describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
        beforeEach(() => {
          cy.viewport(viewport.width, viewport.height)
          cy.clearAccess()
        })

        publicPages.forEach((page) => {
          it(`should capture ${page.name}`, () => {
            cy.visit(page.path)
            cy.wait(1000) // Wait for animations/loading
            cy.screenshot(`${page.name}-${viewport.name}`, {
              capture: 'fullPage'
            })
          })
        })
      })
    })
  })

  describe('Premium Pages (With Access)', () => {
    viewports.forEach((viewport) => {
      describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
        beforeEach(() => {
          cy.viewport(viewport.width, viewport.height)
          cy.grantAccess('daily', 86400000)
        })

        premiumPages.forEach((page) => {
          it(`should capture ${page.name} with access`, () => {
            cy.visit(page.path)
            cy.wait(1500) // Wait for data loading
            cy.screenshot(`${page.name}-premium-${viewport.name}`, {
              capture: 'fullPage'
            })
          })
        })
      })
    })
  })

  describe('Premium Pages (Paywall State)', () => {
    beforeEach(() => {
      cy.viewport(1440, 900)
      cy.clearAccess()
    })

    premiumPages.forEach((page) => {
      it(`should capture ${page.name} paywall`, () => {
        cy.visit(page.path)
        cy.wait(500)
        cy.screenshot(`${page.name}-paywall`, {
          capture: 'fullPage'
        })
      })
    })
  })
})
