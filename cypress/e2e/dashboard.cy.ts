/**
 * Dashboard E2E Tests
 * Tests for all dashboard widgets and features
 */

describe('Pro Trading Dashboard', () => {
  beforeEach(() => {
    // Simulate paid access
    cy.window().then((win) => {
      win.localStorage.setItem('btcsai_access', JSON.stringify({
        tier: 'monthly',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        paymentHash: 'test-payment-hash',
      }));
    });
    cy.visit('/dashboard/');
  });

  describe('Dashboard Access', () => {
    it('should show dashboard content when paid', () => {
      cy.get('#dashboard-content').should('be.visible');
      cy.get('#dashboard-locked').should('not.be.visible');
    });

    it('should show locked message when not paid', () => {
      cy.clearLocalStorage();
      cy.reload();
      cy.get('#dashboard-locked').should('be.visible');
      cy.get('#dashboard-content').should('not.be.visible');
    });
  });

  describe('Market Intelligence Widgets', () => {
    it('should display Fear & Greed Index', () => {
      cy.get('.widget-fng').should('exist');
      cy.get('#dash-fng-value').should('exist');
      cy.get('.fng-gradient-bar').should('exist');
    });

    it('should display Funding Rate widget', () => {
      cy.get('.widget-funding').should('exist');
      cy.get('#dash-funding-value').should('exist');
    });

    it('should display Open Interest widget', () => {
      cy.get('.widget-volume').should('exist');
      cy.get('#dash-oi-value').should('exist');
    });

    it('should display Buy/Sell Ratio widget', () => {
      cy.get('.widget-signals').should('exist');
      cy.get('#dash-ratio-value').should('exist');
    });

    it('should display Long/Short Ratio widget', () => {
      cy.get('.widget-performance').should('exist');
    });

    it('should display 24h Liquidations widget', () => {
      cy.get('.widget-liquidations').should('exist');
    });
  });

  describe('On-Chain Intelligence', () => {
    it('should display Exchange Reserves', () => {
      cy.get('.reserves-card').should('exist');
      cy.get('#reserves-total').should('exist');
    });

    it('should display Whale Flows', () => {
      cy.get('.whale-card').should('exist');
      cy.get('#whale-inflow').should('exist');
      cy.get('#whale-outflow').should('exist');
    });

    it('should display MVRV Ratio', () => {
      cy.get('.mvrv-card').should('exist');
      cy.get('#mvrv-value').should('exist');
      cy.get('.mvrv-meter').should('exist');
    });
  });

  describe('Signal Aggregator Section', () => {
    it('should display overall signal', () => {
      cy.get('.signal-aggregator-section').should('exist');
      cy.get('#overall-signal-value').should('exist');
    });

    it('should display confidence gauge', () => {
      cy.get('#confidence-gauge-fill').should('exist');
      cy.get('#confidence-value').should('exist');
    });

    it('should display category breakdown', () => {
      cy.get('.signal-aggregator-grid').should('exist');
    });
  });

  describe('Price Models Section', () => {
    it('should display price models section', () => {
      cy.get('#price-models-section').should('exist');
    });

    it('should show overall valuation', () => {
      cy.get('#pm-overall-score').should('exist');
      cy.get('#pm-overall-rating').should('exist');
    });

    it('should display S2F model', () => {
      cy.get('.price-models-grid').should('exist');
    });
  });

  describe('Market Report Section', () => {
    it('should display market report', () => {
      cy.get('.market-report-section').should('exist');
      cy.get('#market-report-container').should('exist');
    });

    it('should show report date', () => {
      cy.get('#market-report-date').should('exist');
    });

    it('should have export button', () => {
      cy.get('#btn-export-report-pdf').should('exist');
    });
  });

  describe('Paper Trading Journal', () => {
    it('should display paper trading section', () => {
      cy.get('#paper-trading-section').should('exist');
    });

    it('should show stats cards', () => {
      cy.get('.paper-stats-grid').should('exist');
      cy.get('#paper-capital').should('exist');
      cy.get('#paper-pnl').should('exist');
      cy.get('#paper-winrate').should('exist');
      cy.get('#paper-trades').should('exist');
    });

    it('should have trade form', () => {
      cy.get('#paper-trade-form').should('exist');
      cy.get('#paper-direction').should('exist');
      cy.get('#paper-entry').should('exist');
      cy.get('#paper-size').should('exist');
      cy.get('#paper-sl').should('exist');
    });

    it('should submit a new paper trade', () => {
      cy.get('#paper-direction').select('long');
      cy.get('#paper-entry').type('42000');
      cy.get('#paper-size').type('10');
      cy.get('#paper-sl').type('41500');
      cy.get('#paper-tp').type('43000');
      cy.get('#paper-notes').type('Test trade');

      cy.get('.btn-paper-trade').click();

      // Trade should appear in history
      cy.get('.paper-trades-list').should('not.contain', 'No trades yet');
    });

    it('should display risk management rules', () => {
      cy.get('.paper-risk-rules').should('exist');
      cy.get('.risk-rules-list').should('exist');
    });

    it('should clear all trades', () => {
      // Add a trade first
      cy.get('#paper-direction').select('long');
      cy.get('#paper-entry').type('42000');
      cy.get('#paper-size').type('10');
      cy.get('#paper-sl').type('41500');
      cy.get('.btn-paper-trade').click();

      // Clear trades
      cy.get('#btn-paper-clear').click();
      cy.on('window:confirm', () => true);

      // Should be empty
      cy.get('.paper-trades-list').should('contain', 'No trades yet');
    });
  });

  describe('Watchlist Section', () => {
    it('should display watchlist section', () => {
      cy.get('.watchlist-section').should('exist');
    });

    it('should show empty state initially', () => {
      cy.get('.watchlist-empty').should('exist');
    });
  });

  describe('Export Functionality', () => {
    it('should have CSV export button', () => {
      cy.get('#btn-export-csv').should('exist');
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('#dashboard-content').should('be.visible');
      cy.get('.dashboard-grid').should('be.visible');
    });

    it('should be responsive on tablet', () => {
      cy.viewport('ipad-2');
      cy.get('#dashboard-content').should('be.visible');
    });
  });

  describe('Data Loading', () => {
    it('should show loading states initially', () => {
      cy.reload();
      cy.get('.skeleton-stat, .skeleton-text', { timeout: 1000 }).should('exist');
    });

    it('should have cache status indicator', () => {
      cy.get('#cache-status').should('exist');
      cy.get('#cache-dot').should('exist');
    });
  });
});
