/// <reference types="cypress" />

describe('Dashboard Page', () => {
  beforeEach(() => {
    cy.grantAccess('daily', 86400)
    cy.visit('/dashboard/')
  })

  describe('Page Structure', () => {
    it('should load the dashboard successfully', () => {
      cy.get('.dashboard-page').should('be.visible')
      cy.get('#dashboard-content').should('be.visible')
    })

    it('should display the header', () => {
      cy.get('.dashboard-header h1').should('contain', 'Pro Trading Dashboard')
    })

    it('should display cache status indicator', () => {
      cy.get('#cache-status').should('be.visible')
      cy.get('#cache-dot').should('exist')
    })
  })

  describe('Market Intelligence Widgets', () => {
    it('should display all main widgets', () => {
      cy.get('.dashboard-grid').should('be.visible')
      cy.get('.widget-card').should('have.length.at.least', 6)
    })

    it('should display Fear & Greed widget', () => {
      cy.get('.widget-fng').should('be.visible')
      cy.get('.widget-fng h3').should('contain', 'Fear & Greed')
      cy.get('#dash-fng-value').should('exist')
    })

    it('should display Funding Rate widget', () => {
      cy.get('.widget-funding').should('be.visible')
      cy.get('.widget-funding h3').should('contain', 'Funding Rate')
      cy.get('#dash-funding-value').should('exist')
    })

    it('should display Open Interest widget', () => {
      cy.get('.widget-volume').should('be.visible')
      cy.get('.widget-volume h3').should('contain', 'Open Interest')
      cy.get('#dash-oi-value').should('exist')
    })

    it('should display Buy/Sell Ratio widget', () => {
      cy.get('.widget-signals').should('be.visible')
      cy.get('.widget-signals h3').should('contain', 'Buy/Sell Ratio')
      cy.get('#dash-ratio-value').should('exist')
    })

    it('should display Long/Short Ratio widget', () => {
      cy.get('.widget-performance').should('be.visible')
      cy.get('.widget-performance h3').should('contain', 'Long/Short Ratio')
      cy.get('#dash-ls-value').should('exist')
    })

    it('should display 24h Liquidations widget', () => {
      cy.get('.widget-liquidation').should('be.visible')
      cy.get('.widget-liquidation h3').should('contain', 'Liquidations')
    })

    it('should display RSI widget', () => {
      cy.get('.widget-patterns').should('be.visible')
      cy.get('.widget-patterns h3').should('contain', 'RSI')
    })

    it('should display Volatility widget', () => {
      cy.get('.widget-alerts').should('be.visible')
      cy.get('.widget-alerts h3').should('contain', 'Volatility')
    })

    it('should display BTC Dominance widget', () => {
      cy.get('.widget-calendar').should('be.visible')
      cy.get('.widget-calendar h3').should('contain', 'Dominance')
    })
  })

  describe('Widget Tooltips', () => {
    it('should have tooltips on widgets', () => {
      cy.get('.widget-tooltip').should('have.length.at.least', 5)
    })

    it('should show tooltip on hover', () => {
      cy.get('.widget-fng .widget-tooltip').first().trigger('mouseenter')
      // Tooltip should be visible or have hover state
      cy.get('.widget-fng .widget-tooltip').first().should('be.visible')
    })
  })

  describe('Open Interest Analysis Section', () => {
    it('should display OI section', () => {
      cy.get('.oi-history-section').should('be.visible')
      cy.get('.oi-history-section h2').should('contain', 'Open Interest Analysis')
    })

    it('should display OI stats cards', () => {
      cy.get('.oi-stat-card').should('have.length.at.least', 3)
      cy.get('#oi-total-btc').should('exist')
      cy.get('#oi-total-usd').should('exist')
      cy.get('#oi-change-24h').should('exist')
    })

    it('should display OI chart', () => {
      cy.get('#oiHistoryChart').should('exist')
    })
  })

  describe('Multi-Exchange Funding Rates Section', () => {
    it('should display funding comparison section', () => {
      cy.get('.funding-comparison-section').should('be.visible')
      cy.get('.funding-comparison-section h2').should('contain', 'Multi-Exchange Funding')
    })

    it('should display funding comparison table', () => {
      cy.get('#funding-comparison-table').should('be.visible')
      cy.get('#funding-comparison-table th').should('contain', 'Exchange')
    })

    it('should display funding history chart', () => {
      cy.get('#fundingHistoryChart').should('exist')
    })

    it('should display arbitrage spread info', () => {
      cy.get('#funding-arbitrage').should('be.visible')
    })
  })

  describe('Arbitrage Calculator Section', () => {
    it('should display arbitrage calculator', () => {
      cy.get('.arbitrage-calculator-section').should('be.visible')
      cy.get('.arbitrage-calculator-section h2').should('contain', 'Arbitrage Calculator')
    })

    it('should have position size input', () => {
      cy.get('#arb-position-size').should('be.visible')
      cy.get('#arb-position-size').should('have.value', '10000')
    })

    it('should have holding period dropdown', () => {
      cy.get('#arb-period').should('be.visible')
    })

    it('should have exchange selection dropdowns', () => {
      cy.get('#arb-long-exchange').should('be.visible')
      cy.get('#arb-short-exchange').should('be.visible')
    })

    it('should calculate profit when clicking calculate button', () => {
      cy.get('#arb-position-size').clear().type('10000')
      cy.get('#btn-calculate-arb').click()
      cy.get('#arb-results').should('be.visible')
    })
  })

  describe('On-Chain Intelligence Section', () => {
    it('should display on-chain section', () => {
      cy.get('.onchain-section').first().should('be.visible')
    })

    it('should display exchange reserves card', () => {
      cy.get('.reserves-card').should('be.visible')
      cy.get('.reserves-card h3').should('contain', 'Exchange Reserves')
    })

    it('should display whale flows card', () => {
      cy.get('.whale-card').should('be.visible')
      cy.get('.whale-card h3').should('contain', 'Whale Flows')
    })

    it('should display MVRV card', () => {
      cy.get('.mvrv-card').should('be.visible')
      cy.get('.mvrv-card h3').should('contain', 'MVRV')
    })
  })

  describe('Signal Accuracy Section', () => {
    it('should display accuracy tracking section', () => {
      cy.get('.accuracy-section').should('be.visible')
      cy.get('.accuracy-section h2').should('contain', 'Signal Accuracy')
    })

    it('should display accuracy metrics', () => {
      cy.get('#accuracy-all').should('exist')
      cy.get('#accuracy-7d').should('exist')
      cy.get('#accuracy-30d').should('exist')
    })
  })

  describe('Signal Performance Section', () => {
    it('should display stats section', () => {
      cy.get('.stats-section').should('be.visible')
      cy.get('.stats-section h2').should('contain', 'Signal Performance')
    })

    it('should display win/loss stats', () => {
      cy.get('#win-count').should('exist')
      cy.get('#loss-count').should('exist')
      cy.get('#win-rate').should('exist')
    })

    it('should display calendar heatmap', () => {
      cy.get('#calendar-heatmap').should('be.visible')
    })
  })

  describe('Simulated Portfolio Section', () => {
    it('should display portfolio section', () => {
      cy.get('.portfolio-section').should('be.visible')
      cy.get('.portfolio-section h2').should('contain', 'Simulated Portfolio')
    })

    it('should display current balance', () => {
      cy.get('#portfolio-balance').should('be.visible')
    })

    it('should display portfolio stats', () => {
      cy.get('#portfolio-total-trades').should('exist')
      cy.get('#portfolio-winning-trades').should('exist')
    })

    it('should have link to trading history', () => {
      cy.get('.btn-view-history').should('have.attr', 'href', '/trading-history/')
    })
  })

  describe('BART Analysis Section', () => {
    it('should display BART analysis section', () => {
      cy.get('.bart-analysis-section').should('be.visible')
      cy.get('.bart-analysis-section h2').should('contain', 'BART Pattern')
    })

    it('should display current BART risk', () => {
      cy.get('.bart-current-risk').should('be.visible')
      cy.get('#dash-bart-score').should('exist')
    })

    it('should display risk factor breakdown', () => {
      cy.get('.bart-factors-detail').should('be.visible')
    })

    it('should display BART history chart', () => {
      cy.get('#bartRiskChart').should('exist')
    })
  })

  describe('On-Chain & Macro Analysis Section', () => {
    it('should display hashrate vs price widget', () => {
      cy.get('#hashrateChart').should('exist')
    })

    it('should display BTC vs S&P 500 widget', () => {
      cy.get('#correlationChart').should('exist')
    })
  })

  describe('Liquidation Watchlist Section', () => {
    it('should display liquidation section', () => {
      cy.get('.liquidation-section').should('be.visible')
      cy.get('.liquidation-section h2').should('contain', 'Liquidation Watchlist')
    })

    it('should display long liquidations', () => {
      cy.get('#long-liquidations').should('be.visible')
    })

    it('should display short liquidations', () => {
      cy.get('#short-liquidations').should('be.visible')
    })

    it('should display current BTC price', () => {
      cy.get('#current-btc-price').should('be.visible')
    })
  })

  describe('Responsive Design', () => {
    it('should display correctly on mobile', () => {
      cy.setMobileViewport()
      cy.get('#dashboard-content').should('be.visible')
      cy.get('.dashboard-grid').should('be.visible')
    })

    it('should display correctly on tablet', () => {
      cy.setTabletViewport()
      cy.get('#dashboard-content').should('be.visible')
    })
  })
})
