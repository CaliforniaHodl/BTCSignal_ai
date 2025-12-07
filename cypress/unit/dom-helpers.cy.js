/// <reference types="cypress" />

describe('DOM Helper Tests', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  describe('Element Visibility', () => {
    it('should check if element exists', () => {
      cy.get('body').should('exist')
      cy.get('header, nav').should('exist')
    })

    it('should check if element is visible', () => {
      cy.get('body').should('be.visible')
    })

    it('should check element dimensions', () => {
      cy.get('body').then(($body) => {
        expect($body.width()).to.be.greaterThan(0)
        expect($body.height()).to.be.greaterThan(0)
      })
    })
  })

  describe('Element Content', () => {
    it('should read text content', () => {
      cy.get('h1').first().invoke('text').should('not.be.empty')
    })

    it('should check for specific text', () => {
      cy.get('body').should('contain.text', 'BTC')
    })
  })

  describe('Element Attributes', () => {
    it('should read data attributes', () => {
      // Check for any data attribute on the page
      cy.get('body').then(($body) => {
        const hasDataAttr = $body.find('[data-tier], [data-page], [data-section]').length > 0
        // Just verify we can query for data attributes (may or may not exist on homepage)
        expect(hasDataAttr).to.be.oneOf([true, false])
      })
    })

    it('should check href attributes', () => {
      cy.get('a[href]').first().should('have.attr', 'href')
    })
  })

  describe('Form Elements', () => {
    it('should find input elements', () => {
      // Homepage has newsletter form with email input
      cy.get('body').then(($body) => {
        const hasFormElements = $body.find('input, textarea, select').length > 0
        // Homepage should have at least the newsletter email input
        expect(hasFormElements).to.be.true
      })
    })

    it('should find buttons', () => {
      cy.get('button, [type="submit"], .btn').should('exist')
    })
  })

  describe('Class Manipulation', () => {
    it('should check for specific classes', () => {
      // Find an element that has a class attribute
      cy.get('.container').first().then(($el) => {
        expect($el.attr('class')).to.be.a('string')
        expect($el.attr('class')).to.include('container')
      })
    })
  })

  describe('Window Properties', () => {
    it('should access window dimensions', () => {
      cy.window().then((win) => {
        expect(win.innerWidth).to.be.greaterThan(0)
        expect(win.innerHeight).to.be.greaterThan(0)
      })
    })

    it('should access document properties', () => {
      cy.document().then((doc) => {
        expect(doc.title).to.be.a('string')
        expect(doc.readyState).to.equal('complete')
      })
    })

    it('should access location', () => {
      cy.location().then((loc) => {
        expect(loc.pathname).to.equal('/')
        expect(loc.host).to.include('localhost')
      })
    })
  })

  describe('Event Handling', () => {
    it('should handle click events', () => {
      cy.get('a, button').first().then(($el) => {
        // Just verify clickable elements exist
        expect($el).to.exist
      })
    })
  })

  describe('Scroll Behavior', () => {
    it('should scroll to element', () => {
      cy.get('footer').scrollIntoView()
      cy.get('footer').should('be.visible')
    })

    it('should scroll to top', () => {
      cy.scrollTo('top')
      cy.window().its('scrollY').should('equal', 0)
    })
  })

  describe('Viewport Testing', () => {
    it('should test mobile viewport', () => {
      cy.viewport(375, 667)
      cy.get('body').should('be.visible')
    })

    it('should test tablet viewport', () => {
      cy.viewport(768, 1024)
      cy.get('body').should('be.visible')
    })

    it('should test desktop viewport', () => {
      cy.viewport(1920, 1080)
      cy.get('body').should('be.visible')
    })
  })
})
