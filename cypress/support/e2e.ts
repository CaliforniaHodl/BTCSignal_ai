// Cypress E2E Support File
// Global configurations and custom commands

// Custom command to check API health
Cypress.Commands.add('checkApiHealth', (endpoint: string) => {
  cy.request({
    url: endpoint,
    failOnStatusCode: false,
  }).then((response) => {
    expect(response.status).to.be.oneOf([200, 201, 202, 204]);
  });
});

// Custom command for Lightning payment simulation
Cypress.Commands.add('simulateLightningPayment', (amount: number) => {
  // Simulate a successful Lightning payment
  cy.window().then((win) => {
    win.localStorage.setItem('btcsai_access', JSON.stringify({
      tier: amount >= 50000 ? 'monthly' : amount >= 25000 ? 'weekly' : 'daily',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      paymentHash: 'test-' + Date.now(),
    }));
  });
});

// Custom command for dashboard access
Cypress.Commands.add('accessDashboard', () => {
  cy.simulateLightningPayment(50000);
  cy.visit('/dashboard/');
  cy.get('#dashboard-content').should('be.visible');
});

// Declare types for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      checkApiHealth(endpoint: string): Chainable<void>;
      simulateLightningPayment(amount: number): Chainable<void>;
      accessDashboard(): Chainable<void>;
    }
  }
}

export {};
