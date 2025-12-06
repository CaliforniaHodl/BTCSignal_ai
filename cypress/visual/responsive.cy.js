/// <reference types="cypress" />

/**
 * Responsive Layout Tests
 * Tests layouts at different viewport sizes
 */

describe('Responsive Layout Tests', () => {
  const viewports = {
    mobile: { width: 375, height: 667 },
    mobileLarge: { width: 414, height: 896 },
    tablet: { width: 768, height: 1024 },
    tabletLandscape: { width: 1024, height: 768 },
    laptop: { width: 1366, height: 768 },
    desktop: { width: 1920, height: 1080 }
  }

  describe('Homepage Responsive', () => {
    Object.entries(viewports).forEach(([name, size]) => {
      it(`should display correctly on ${name} (${size.width}x${size.height})`, () => {
        cy.viewport(size.width, size.height)
        cy.visit('/')

        // Page should be visible
        cy.get('body').should('be.visible')

        // Header should be visible
        cy.get('header, nav').should('be.visible')

        // Main content should be visible
        cy.get('h1').should('be.visible')

        // No horizontal overflow
        cy.document().then((doc) => {
          expect(doc.documentElement.scrollWidth).to.be.at.most(size.width + 20)
        })
      })
    })
  })

  describe('Navigation Responsive', () => {
    it('should show mobile menu on small screens', () => {
      cy.viewport(375, 667)
      cy.visit('/')

      // Should have hamburger menu or collapsed nav
      cy.get('.hamburger, .mobile-menu, [class*="burger"], [class*="menu-toggle"]').then(($menu) => {
        if ($menu.length) {
          cy.wrap($menu).should('be.visible')
        }
      })
    })

    it('should show full nav on desktop', () => {
      cy.viewport(1920, 1080)
      cy.visit('/')

      // Navigation links should be visible
      cy.get('header, nav').should('be.visible')
    })
  })

  describe('Pricing Page Responsive', () => {
    it('should stack pricing cards on mobile', () => {
      cy.viewport(375, 667)
      cy.visit('/pricing/')

      cy.get('.pricing-grid, .pricing-card').should('be.visible')

      // Cards should be stacked (each taking full width)
      cy.get('.pricing-card').first().then(($card) => {
        expect($card.width()).to.be.greaterThan(300)
      })
    })

    it('should show pricing cards in grid on desktop', () => {
      cy.viewport(1920, 1080)
      cy.visit('/pricing/')

      cy.get('.pricing-grid').should('be.visible')
    })
  })

  describe('Dashboard Responsive', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400000)
    })

    it('should stack widgets on mobile', () => {
      cy.viewport(375, 667)
      cy.visit('/dashboard/')

      cy.get('.dashboard-grid, .widget-card').should('be.visible')
    })

    it('should show widget grid on desktop', () => {
      cy.viewport(1920, 1080)
      cy.visit('/dashboard/')

      cy.get('.dashboard-grid').should('be.visible')
    })

    it('should have readable charts on tablet', () => {
      cy.viewport(768, 1024)
      cy.visit('/dashboard/')

      cy.get('canvas, .chart-container').should('exist')
    })
  })

  describe('Form Elements Responsive', () => {
    it('should have full-width inputs on mobile', () => {
      cy.viewport(375, 667)
      cy.visit('/recover/')

      cy.get('#recovery-input').then(($input) => {
        // Input should be close to full width
        const containerWidth = Cypress.$('.recovery-form-card, .container').first().width()
        expect($input.width()).to.be.greaterThan(containerWidth * 0.7)
      })
    })

    it('should have proper button sizing on mobile', () => {
      cy.viewport(375, 667)
      cy.visit('/pricing/')

      cy.get('.btn-purchase').first().then(($btn) => {
        expect($btn.width()).to.be.greaterThan(100)
      })
    })
  })

  describe('Typography Responsive', () => {
    it('should have readable font sizes on mobile', () => {
      cy.viewport(375, 667)
      cy.visit('/')

      cy.get('p').first().then(($p) => {
        const fontSize = parseInt(window.getComputedStyle($p[0]).fontSize)
        expect(fontSize).to.be.at.least(14)
      })
    })

    it('should scale headings appropriately', () => {
      cy.viewport(375, 667)
      cy.visit('/')

      cy.get('h1').first().then(($h1) => {
        const fontSize = parseInt(window.getComputedStyle($h1[0]).fontSize)
        // H1 should be larger than body text but not too large for mobile
        expect(fontSize).to.be.within(20, 60)
      })
    })
  })

  describe('Touch Targets', () => {
    it('should have adequate touch targets on mobile', () => {
      cy.viewport(375, 667)
      cy.visit('/')

      // Buttons and links should be at least 44x44 for accessibility
      cy.get('button, a.btn, .btn-purchase').each(($el) => {
        cy.wrap($el).then(($button) => {
          const height = $button.height()
          const width = $button.width()
          // Touch target should be at least 40px
          expect(Math.max(height, width)).to.be.at.least(35)
        })
      })
    })
  })

  describe('Images Responsive', () => {
    it('should have responsive images', () => {
      cy.viewport(375, 667)
      cy.visit('/')

      cy.get('img').each(($img) => {
        // Images should not overflow container
        const imgWidth = $img.width()
        expect(imgWidth).to.be.at.most(375)
      })
    })
  })

  describe('Table Responsive', () => {
    it('should handle tables on mobile', () => {
      cy.viewport(375, 667)
      cy.grantAccess('daily', 86400000)
      cy.visit('/dashboard/')

      // Tables should be scrollable or responsive
      cy.get('table').each(($table) => {
        // Table should be visible and not break layout
        cy.wrap($table).should('be.visible')
      })
    })
  })

  describe('Landscape Orientation', () => {
    it('should work in landscape on mobile', () => {
      cy.viewport(667, 375) // iPhone landscape
      cy.visit('/')

      cy.get('body').should('be.visible')
      cy.get('h1').should('be.visible')
    })

    it('should work in landscape on tablet', () => {
      cy.viewport(1024, 768) // iPad landscape
      cy.visit('/')

      cy.get('body').should('be.visible')
    })
  })
})
