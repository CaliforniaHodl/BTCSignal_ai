/// <reference types="cypress" />

describe('Pricing Page', () => {
  beforeEach(() => {
    cy.clearAccess()
    cy.visit('/pricing/')
  })

  describe('Page Structure', () => {
    it('should load the pricing page successfully', () => {
      cy.get('.pricing-page').should('be.visible')
      cy.get('h1').should('contain', 'Unlock Premium Access')
    })

    it('should display access status indicator', () => {
      cy.get('#access-status').should('be.visible')
      cy.get('#status-text').should('contain', 'No active subscription')
    })

    it('should display all pricing tiers', () => {
      cy.get('.pricing-card').should('have.length', 5)
      cy.get('.pricing-card.single').should('exist')
      cy.get('.pricing-card.hourly').should('exist')
      cy.get('.pricing-card.daily').should('exist')
      cy.get('.pricing-card.weekly').should('exist')
      cy.get('.pricing-card.monthly').should('exist')
    })

    it('should show correct prices for each tier', () => {
      cy.get('.pricing-card.single .price-amount').should('contain', '21')
      cy.get('.pricing-card.hourly .price-amount').should('contain', '1,000')
      cy.get('.pricing-card.daily .price-amount').should('contain', '10,000')
      cy.get('.pricing-card.weekly .price-amount').should('contain', '25,000')
      cy.get('.pricing-card.monthly .price-amount').should('contain', '50,000')
    })

    it('should highlight the daily tier as featured', () => {
      cy.get('.pricing-card.daily').should('have.class', 'featured')
      cy.get('.pricing-card.daily .card-badge').should('contain', 'Most Popular')
    })

    it('should show discount badges on weekly and monthly', () => {
      cy.get('.pricing-card.weekly .discount-badge').should('contain', '64% OFF')
      cy.get('.pricing-card.monthly .discount-badge').should('contain', '83% OFF')
    })
  })

  describe('Purchase Buttons', () => {
    it('should have purchase buttons with correct data attributes', () => {
      cy.get('.pricing-card.single .btn-purchase')
        .should('have.attr', 'data-tier', 'single')
        .and('have.attr', 'data-amount', '21')

      cy.get('.pricing-card.daily .btn-purchase')
        .should('have.attr', 'data-tier', 'daily')
        .and('have.attr', 'data-amount', '10000')
    })

    it('should open payment modal when clicking purchase button', () => {
      cy.get('#payment-modal').should('not.be.visible')
      cy.get('.pricing-card.daily .btn-purchase').click()
      cy.get('#payment-modal').should('be.visible')
    })
  })

  describe('Payment Modal', () => {
    beforeEach(() => {
      // Mock the invoice API
      cy.intercept('POST', '/.netlify/functions/create-invoice', {
        statusCode: 200,
        body: {
          payment_request: 'lnbc100n1test_invoice_string',
          payment_hash: 'test_payment_hash_123',
          expires_at: Date.now() + 600000,
          qr_code: 'data:image/png;base64,test'
        }
      }).as('createInvoice')

      cy.get('.pricing-card.daily .btn-purchase').click()
    })

    it('should display the modal with correct title', () => {
      cy.get('#payment-modal').should('be.visible')
      cy.get('#modal-title').should('contain', 'Pay with Lightning')
    })

    it('should show QR container', () => {
      cy.get('#qr-container').should('be.visible')
    })

    it('should have copy invoice button', () => {
      cy.get('#btn-copy').should('be.visible')
    })

    it('should have open wallet button', () => {
      cy.get('#btn-wallet').should('be.visible')
    })

    it('should close modal when clicking close button', () => {
      cy.get('#modal-close').click()
      cy.get('#payment-modal').should('not.be.visible')
    })

    it('should show payment status', () => {
      cy.get('#payment-status').should('be.visible')
      cy.get('.status-waiting').should('contain', 'Waiting for payment')
    })
  })

  describe('Recovery Code Modal', () => {
    it('should show recovery modal after successful payment', () => {
      // Mock payment flow
      cy.mockPaymentSuccess()

      cy.get('.pricing-card.daily .btn-purchase').click()

      // Simulate payment success by triggering the recovery modal directly
      cy.window().then((win) => {
        // Trigger the recovery modal
        if (win.showRecoveryModal) {
          win.showRecoveryModal({
            recoveryCode: 'BTCSIG-TEST-CODE-1234',
            tier: 'daily',
            expiresAt: new Date(Date.now() + 86400000).toISOString()
          })
          cy.get('#recovery-modal').should('be.visible')
          cy.get('#recovery-code-text').should('contain', 'BTCSIG')
        }
      })
    })
  })

  describe('FAQ Section', () => {
    it('should display FAQ section', () => {
      cy.get('.pricing-faq').should('be.visible')
      cy.get('.pricing-faq h2').should('contain', 'Frequently Asked Questions')
    })

    it('should have all FAQ items', () => {
      cy.get('.faq-item').should('have.length.at.least', 4)
    })

    it('should have link to recovery page', () => {
      cy.get('.recover-link').should('have.attr', 'href', '/recover/')
    })
  })

  describe('Value Props Section', () => {
    it('should display value propositions', () => {
      cy.get('.value-props').should('be.visible')
      cy.get('.prop-item').should('have.length', 4)
    })
  })

  describe('With Active Access', () => {
    beforeEach(() => {
      cy.grantAccess('daily', 86400)
      cy.visit('/pricing/')
    })

    it('should show active subscription status', () => {
      cy.get('#status-text').should('not.contain', 'No active subscription')
    })
  })

  describe('Responsive Design', () => {
    it('should display correctly on mobile', () => {
      cy.setMobileViewport()
      cy.get('.pricing-grid').should('be.visible')
      cy.get('.pricing-card').should('be.visible')
    })

    it('should display correctly on tablet', () => {
      cy.setTabletViewport()
      cy.get('.pricing-grid').should('be.visible')
    })
  })
})
