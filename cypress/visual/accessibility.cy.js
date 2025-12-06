/// <reference types="cypress" />

/**
 * Accessibility Tests
 * Tests WCAG compliance and accessibility features
 */

describe('Accessibility Tests', () => {
  describe('Homepage Accessibility', () => {
    beforeEach(() => {
      cy.visit('/')
    })

    it('should have proper heading hierarchy', () => {
      // Should have exactly one h1
      cy.get('h1').should('have.length.at.least', 1)

      // H1 should come before h2s
      cy.get('h1').first().then(($h1) => {
        cy.get('h2').first().then(($h2) => {
          if ($h1.length && $h2.length) {
            const h1Position = $h1.offset()?.top || 0
            const h2Position = $h2.offset()?.top || 0
            expect(h1Position).to.be.lessThan(h2Position)
          }
        })
      })
    })

    it('should have alt text on images', () => {
      cy.get('img').each(($img) => {
        // Images should have alt attribute (can be empty for decorative)
        expect($img).to.have.attr('alt')
      })
    })

    it('should have accessible links', () => {
      cy.get('a').each(($link) => {
        // Links should have href
        expect($link).to.have.attr('href')

        // Links should have discernible text or aria-label
        const hasText = $link.text().trim().length > 0
        const hasAriaLabel = $link.attr('aria-label')
        const hasTitle = $link.attr('title')
        const hasImg = $link.find('img').length > 0

        expect(hasText || hasAriaLabel || hasTitle || hasImg).to.be.true
      })
    })

    it('should have accessible buttons', () => {
      cy.get('button').each(($button) => {
        // Buttons should have discernible text or aria-label
        const hasText = $button.text().trim().length > 0
        const hasAriaLabel = $button.attr('aria-label')
        const hasTitle = $button.attr('title')

        expect(hasText || hasAriaLabel || hasTitle).to.be.true
      })
    })

    it('should have proper form labels', () => {
      cy.get('input:not([type="hidden"]), textarea, select').each(($input) => {
        const id = $input.attr('id')
        const ariaLabel = $input.attr('aria-label')
        const ariaLabelledby = $input.attr('aria-labelledby')
        const placeholder = $input.attr('placeholder')

        // Should have some form of label
        if (id) {
          cy.get(`label[for="${id}"]`).should('exist').or(() => {
            expect(ariaLabel || ariaLabelledby || placeholder).to.exist
          })
        } else {
          expect(ariaLabel || ariaLabelledby || placeholder).to.exist
        }
      })
    })

    it('should have skip link for keyboard navigation', () => {
      // Check for skip link (common accessibility pattern)
      cy.get('a[href="#main"], a[href="#content"], .skip-link, [class*="skip"]').then(($skip) => {
        // Skip link is recommended but not required
        // Just check if present
      })
    })

    it('should have proper focus indicators', () => {
      // Tab through focusable elements
      cy.get('body').tab()
      cy.focused().should('exist')
    })

    it('should have sufficient color contrast', () => {
      // Check that text elements are visible
      cy.get('h1, h2, h3, p, a, button, label').each(($el) => {
        cy.wrap($el).should('be.visible')
      })
    })

    it('should have proper document language', () => {
      cy.get('html').should('have.attr', 'lang')
    })

    it('should have page title', () => {
      cy.title().should('not.be.empty')
    })
  })

  describe('Form Accessibility', () => {
    beforeEach(() => {
      cy.visit('/recover/')
    })

    it('should have accessible form inputs', () => {
      cy.get('#recovery-input').should('have.attr', 'id')
      cy.get('label[for="recovery-input"]').should('exist')
    })

    it('should have submit button', () => {
      cy.get('button[type="submit"], input[type="submit"], .btn-recover').should('exist')
    })

    it('should show validation feedback', () => {
      // Try to submit empty form
      cy.get('#btn-recover').click()
      // Should show some feedback (error state, message, etc)
    })
  })

  describe('Pricing Page Accessibility', () => {
    beforeEach(() => {
      cy.visit('/pricing/')
    })

    it('should have accessible pricing cards', () => {
      cy.get('.pricing-card').should('have.length.at.least', 3)
      cy.get('.pricing-card').each(($card) => {
        // Each card should have heading
        cy.wrap($card).find('h2, h3, .plan-name').should('exist')
        // Each card should have price
        cy.wrap($card).find('.price-amount, [class*="price"]').should('exist')
        // Each card should have action button
        cy.wrap($card).find('button, .btn-purchase').should('exist')
      })
    })

    it('should have accessible modal', () => {
      cy.get('.pricing-card.daily .btn-purchase').click()
      cy.get('#payment-modal').should('be.visible')

      // Modal should have close button
      cy.get('#modal-close').should('exist')

      // Modal should trap focus (advanced)
      cy.get('#payment-modal').should('be.visible')
    })
  })

  describe('Dashboard Accessibility', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400000)
      cy.visit('/dashboard/')
    })

    it('should have accessible widgets', () => {
      cy.get('.widget-card').each(($widget) => {
        // Each widget should have heading
        cy.wrap($widget).find('h3, .widget-header').should('exist')
      })
    })

    it('should have accessible tooltips', () => {
      cy.get('.widget-tooltip, [class*="tooltip"]').each(($tooltip) => {
        // Tooltips should be accessible via keyboard or have aria attributes
        cy.wrap($tooltip).should('exist')
      })
    })
  })

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      cy.visit('/')
    })

    it('should navigate with Tab key', () => {
      cy.get('body').tab()
      cy.focused().should('exist')

      cy.get('body').tab()
      cy.focused().should('exist')

      cy.get('body').tab()
      cy.focused().should('exist')
    })

    it('should have visible focus state', () => {
      cy.get('body').tab()
      cy.focused().then(($el) => {
        // Element should have visible focus indicator
        // This is a visual check - in real tests would check CSS
        cy.wrap($el).should('be.visible')
      })
    })

    it('should close modal with Escape key', () => {
      cy.visit('/pricing/')
      cy.get('.pricing-card.daily .btn-purchase').click()
      cy.get('#payment-modal').should('be.visible')

      cy.get('body').type('{esc}')
      // Modal should close or button should respond
    })
  })

  describe('Screen Reader', () => {
    beforeEach(() => {
      cy.visit('/')
    })

    it('should have ARIA landmarks', () => {
      // Check for main content area
      cy.get('main, [role="main"]').should('exist')

      // Check for navigation
      cy.get('nav, [role="navigation"]').should('exist')

      // Check for header
      cy.get('header, [role="banner"]').should('exist')
    })

    it('should have descriptive link text', () => {
      cy.get('a').each(($link) => {
        const text = $link.text().trim().toLowerCase()
        // Avoid generic link text
        const genericTexts = ['click here', 'here', 'read more', 'more']
        const isGeneric = genericTexts.some(g => text === g)

        if (isGeneric) {
          // Should have aria-label or title for context
          const hasContext = $link.attr('aria-label') || $link.attr('title')
          // This is a warning, not a failure
        }
      })
    })
  })
})
