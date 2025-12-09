/**
 * TDD Tests for Phase 8.5 Free Tools
 * Tests for: Smart Chart, DCA Calculator, Fee Estimator, Sats Converter, HODL Waves, Difficulty Ribbon
 */

describe('Free Tools Suite', () => {

  // =====================================================
  // SMART CHART TESTS
  // =====================================================
  describe('Smart Chart (/smart-chart/)', () => {
    beforeEach(() => {
      cy.visit('/smart-chart/');
    });

    it('should load the page with correct header', () => {
      cy.get('h1').should('contain', 'Smart Chart');
      cy.get('.tool-badge').should('contain', 'Free Tool');
    });

    it('should display market summary bar with BTC price', () => {
      cy.get('.market-summary-bar').should('be.visible');
      cy.get('#btc-price').should('exist');
      cy.get('#price-change').should('exist');
      cy.get('#trend-direction').should('exist');
      cy.get('#market-bias').should('exist');
    });

    it('should have timeframe tabs with correct options', () => {
      cy.get('.timeframe-tabs').should('be.visible');
      cy.get('.tf-tab').should('have.length.at.least', 3);
      cy.get('.tf-tab[data-tf="60"]').should('contain', '1H');
      cy.get('.tf-tab[data-tf="240"]').should('contain', '4H');
      cy.get('.tf-tab[data-tf="D"]').should('contain', '1D');
    });

    it('should have Pro-only timeframes disabled', () => {
      cy.get('.tf-tab.pro-only').should('have.length.at.least', 1);
      cy.get('.tf-tab.pro-only').should('be.disabled');
    });

    it('should display chart container', () => {
      cy.get('#smart-chart').should('be.visible');
    });

    it('should have toggle checkboxes for overlays', () => {
      cy.get('#show-levels').should('be.checked');
      cy.get('#show-emas').should('be.checked');
      cy.get('#show-signals').should('be.checked');
    });

    it('should display RSI mini chart', () => {
      cy.get('#rsi-mini-chart').should('exist');
      cy.get('#rsi-display').should('exist');
    });

    it('should show analysis grid with key levels', () => {
      cy.get('.analysis-grid').should('be.visible');
      cy.get('#key-levels').should('exist');
      cy.get('#r1-price').should('exist');
      cy.get('#s1-price').should('exist');
    });

    it('should display signal card with current signal', () => {
      cy.get('.signal-card').should('be.visible');
      cy.get('#signal-display').should('exist');
      cy.get('#signal-reasoning').should('exist');
    });

    it('should show indicator summary with bars', () => {
      cy.get('.indicator-bars').should('be.visible');
      cy.get('#ema-bar').should('exist');
      cy.get('#rsi-bar').should('exist');
      cy.get('#macd-bar').should('exist');
      cy.get('#vol-bar').should('exist');
    });

    it('should display Pro features teaser section', () => {
      cy.get('.pro-teaser-section').should('be.visible');
      cy.get('.pro-features-grid').should('exist');
      cy.get('.pro-feature').should('have.length.at.least', 4);
    });

    it('should have upgrade to Pro CTA', () => {
      cy.get('.pro-teaser-section a[href="/pricing/"]').should('exist');
    });

    it('should switch timeframes when clicking tabs', () => {
      cy.get('.tf-tab[data-tf="60"]').click();
      cy.get('.tf-tab[data-tf="60"]').should('have.class', 'active');
      cy.get('.tf-tab[data-tf="240"]').should('not.have.class', 'active');
    });
  });

  // =====================================================
  // DCA CALCULATOR TESTS
  // =====================================================
  describe('DCA Calculator (/dca-calculator/)', () => {
    beforeEach(() => {
      cy.visit('/dca-calculator/');
    });

    it('should load the page with correct header', () => {
      cy.get('h1').should('contain', 'DCA Calculator');
      cy.get('.tool-badge').should('contain', 'Free Tool');
    });

    it('should have input form with required fields', () => {
      cy.get('#start-date').should('exist');
      cy.get('#end-date').should('exist');
      cy.get('#frequency').should('exist');
      cy.get('#amount').should('exist');
    });

    it('should have preset buttons for common periods', () => {
      cy.get('.preset-btn').should('have.length.at.least', 3);
    });

    it('should have calculate button', () => {
      cy.get('#calculate-btn').should('exist');
    });

    it('should display results section', () => {
      cy.get('.results-grid').should('exist');
      cy.get('#total-invested').should('exist');
      cy.get('#current-value').should('exist');
      cy.get('#total-btc').should('exist');
      cy.get('#avg-price').should('exist');
      cy.get('#roi').should('exist');
    });

    it('should have chart container', () => {
      cy.get('#dca-chart').should('exist');
    });

    it('should display comparison section', () => {
      cy.get('.comparison-card').should('exist');
    });

    it('should have education section', () => {
      cy.get('.education-section').should('exist');
    });

    it('should validate inputs before calculation', () => {
      cy.get('#amount').clear();
      cy.get('#calculate-btn').click();
      // Should not crash, should show default or error state
      cy.get('.results-grid').should('exist');
    });
  });

  // =====================================================
  // FEE ESTIMATOR TESTS
  // =====================================================
  describe('Fee Estimator (/fee-estimator/)', () => {
    beforeEach(() => {
      cy.visit('/fee-estimator/');
    });

    it('should load the page with correct header', () => {
      cy.get('h1').should('contain', 'Fee Estimator');
      cy.get('.tool-badge').should('contain', 'Free Tool');
    });

    it('should display three fee priority cards', () => {
      cy.get('.fee-card').should('have.length', 3);
      cy.get('#fee-fastest').should('exist');
      cy.get('#fee-medium').should('exist');
      cy.get('#fee-slow').should('exist');
    });

    it('should show mempool stats', () => {
      cy.get('#mempool-size').should('exist');
      cy.get('#pending-txs').should('exist');
      cy.get('#total-fees').should('exist');
    });

    it('should have fee calculator section', () => {
      cy.get('#tx-size').should('exist');
      cy.get('#calc-fast').should('exist');
      cy.get('#calc-medium').should('exist');
      cy.get('#calc-economy').should('exist');
    });

    it('should display fee chart', () => {
      cy.get('#fee-chart').should('exist');
    });

    it('should show recommendation section', () => {
      cy.get('#rec-title').should('exist');
      cy.get('#rec-desc').should('exist');
    });

    it('should update calculator on input change', () => {
      cy.get('#tx-size').clear().type('500');
      // Calculator results should update
      cy.get('#calc-fast').should('exist');
      cy.get('#calc-medium').should('exist');
      cy.get('#calc-economy').should('exist');
    });

    it('should have last updated timestamp', () => {
      cy.get('#last-updated').should('exist');
    });
  });

  // =====================================================
  // SATS CONVERTER TESTS
  // =====================================================
  describe('Sats Converter (/sats-converter/)', () => {
    beforeEach(() => {
      cy.visit('/sats-converter/');
    });

    it('should load the page with correct header', () => {
      cy.get('h1').should('contain', 'Sats Converter');
      cy.get('.tool-badge').should('contain', 'Free Tool');
    });

    it('should have three conversion inputs', () => {
      cy.get('#usd-input').should('exist');
      cy.get('#btc-input').should('exist');
      cy.get('#sats-input').should('exist');
    });

    it('should display live BTC price', () => {
      cy.get('#live-price').should('exist');
    });

    it('should convert USD to BTC and Sats', () => {
      cy.get('#usd-input').clear().type('100');
      // BTC and Sats inputs should update
      cy.get('#btc-input').should('not.have.value', '');
      cy.get('#sats-input').should('not.have.value', '');
    });

    it('should have stack tracker section', () => {
      cy.get('.stack-tracker').should('exist');
      cy.get('#purchase-date').should('exist');
      cy.get('#purchase-amount').should('exist');
      cy.get('#add-purchase').should('exist');
    });

    it('should display stack summary', () => {
      cy.get('#total-stack').should('exist');
      cy.get('#total-invested').should('exist');
      cy.get('#current-value').should('exist');
      cy.get('#pnl').should('exist');
    });

    it('should show fun stats', () => {
      cy.get('.fun-stats').should('exist');
      cy.get('#fun-stats').should('exist');
      cy.get('#shuffle-stats').should('exist');
      // Fun stats are now dynamically generated with 3 visible at a time
      cy.get('.fun-stat').should('have.length', 3);
    });

    it('should have education section', () => {
      cy.get('.education-section').should('exist');
    });
  });

  // =====================================================
  // HODL WAVES TESTS
  // =====================================================
  describe('HODL Waves (/hodl-waves/)', () => {
    beforeEach(() => {
      cy.visit('/hodl-waves/');
    });

    it('should load the page with correct header', () => {
      cy.get('h1').should('contain', 'HODL Waves');
      cy.get('.tool-badge').should('contain', 'Free Tool');
    });

    it('should display key holder metrics', () => {
      cy.get('.metrics-row').should('be.visible');
      cy.get('#hodl-1y').should('exist');
      cy.get('#hodl-2y').should('exist');
      cy.get('#hodl-5y').should('exist');
      cy.get('#active-supply').should('exist');
    });

    it('should have time range controls', () => {
      cy.get('.chart-controls').should('be.visible');
      cy.get('.time-btn[data-range="1y"]').should('exist');
      cy.get('.time-btn[data-range="2y"]').should('exist');
      cy.get('.time-btn[data-range="all"]').should('exist');
    });

    it('should display HODL waves chart', () => {
      cy.get('#hodl-chart').should('exist');
    });

    it('should show distribution grid', () => {
      cy.get('#distribution-grid').should('exist');
    });

    it('should display market insight card', () => {
      cy.get('.insight-card').should('exist');
      cy.get('#insight-title').should('exist');
      cy.get('#insight-text').should('exist');
    });

    it('should show cycle comparison', () => {
      cy.get('.cycle-comparison').should('exist');
      cy.get('.cycle-item').should('have.length.at.least', 4);
      cy.get('#current-1y-holders').should('exist');
      cy.get('#current-phase').should('exist');
    });

    it('should have education section', () => {
      cy.get('.education-section').should('exist');
    });

    it('should have age band legend', () => {
      cy.get('.legend-card').should('exist');
      cy.get('.legend-item').should('have.length.at.least', 8);
    });

    it('should switch time ranges when clicking buttons', () => {
      cy.get('.time-btn[data-range="2y"]').click();
      cy.get('.time-btn[data-range="2y"]').should('have.class', 'active');
    });
  });

  // =====================================================
  // DIFFICULTY RIBBON TESTS
  // =====================================================
  describe('Difficulty Ribbon (/difficulty-ribbon/)', () => {
    beforeEach(() => {
      cy.visit('/difficulty-ribbon/');
    });

    it('should load the page with correct header', () => {
      cy.get('h1').should('contain', 'Difficulty Ribbon');
      cy.get('.tool-badge').should('contain', 'Free Tool');
    });

    it('should display mining metrics', () => {
      cy.get('.metrics-row').should('be.visible');
      cy.get('#current-difficulty').should('exist');
      cy.get('#difficulty-change').should('exist');
      cy.get('#next-adjustment').should('exist');
      cy.get('#ribbon-signal').should('exist');
    });

    it('should show signal card', () => {
      cy.get('#signal-card').should('exist');
      cy.get('#signal-status').should('exist');
      cy.get('#signal-explanation').should('exist');
    });

    it('should have time range controls', () => {
      cy.get('.chart-controls').should('be.visible');
      cy.get('.time-btn[data-range="1y"]').should('exist');
      cy.get('.time-btn[data-range="2y"]').should('exist');
      cy.get('.time-btn[data-range="4y"]').should('exist');
    });

    it('should display difficulty ribbon chart', () => {
      cy.get('#ribbon-chart').should('exist');
    });

    it('should display hashrate chart', () => {
      cy.get('#hashrate-chart').should('exist');
    });

    it('should show historical signals section', () => {
      cy.get('.signal-history').should('exist');
      cy.get('.history-item').should('have.length.at.least', 3);
    });

    it('should have education section', () => {
      cy.get('.education-section').should('exist');
    });

    it('should display chart legend', () => {
      cy.get('.chart-legend').should('exist');
      cy.get('.legend-item').should('have.length.at.least', 3);
    });
  });

  // =====================================================
  // FREE TOOLS NAVIGATION TESTS
  // =====================================================
  describe('Free Tools Navigation', () => {
    it('should have Free Tools dropdown in header', () => {
      cy.visit('/');
      cy.get('.dropdown-toggle').contains('Free Tools').should('exist');
    });

    it('should show all free tools in dropdown', () => {
      cy.visit('/');
      cy.get('.dropdown-toggle').contains('Free Tools').click();
      cy.get('#free-tools-menu').should('be.visible');
      cy.get('#free-tools-menu a[href="/smart-chart/"]').should('exist');
      cy.get('#free-tools-menu a[href="/dca-calculator/"]').should('exist');
      cy.get('#free-tools-menu a[href="/fee-estimator/"]').should('exist');
      cy.get('#free-tools-menu a[href="/sats-converter/"]').should('exist');
      cy.get('#free-tools-menu a[href="/hodl-waves/"]').should('exist');
      cy.get('#free-tools-menu a[href="/difficulty-ribbon/"]').should('exist');
      cy.get('#free-tools-menu a[href="/learn/"]').should('exist');
    });
  });

  // =====================================================
  // FREE VS PRO COMPARISON TESTS
  // =====================================================
  describe('Free vs Pro Comparison (/pricing/)', () => {
    beforeEach(() => {
      cy.visit('/pricing/');
    });

    it('should display comparison table', () => {
      cy.get('.comparison-section').should('exist');
      cy.get('.comparison-table').should('exist');
    });

    it('should have Free and Pro columns', () => {
      cy.get('.free-col').should('exist');
      cy.get('.pro-col').should('exist');
    });

    it('should show free tools as available in both tiers', () => {
      cy.get('.comparison-table').contains('DCA Calculator')
        .parent()
        .find('.check-green')
        .should('have.length', 2);
    });

    it('should show Pro tools as Pro-only', () => {
      cy.get('.comparison-table').contains('Alpha Radar')
        .parent()
        .find('.x-red')
        .should('have.length', 1);
    });

    it('should have Try Free Tools CTA', () => {
      cy.get('.comparison-cta').should('exist');
      cy.get('.comparison-cta a[href="/smart-chart/"]').should('exist');
    });
  });

  // =====================================================
  // LEARN HUB CATEGORY FILTER TESTS
  // =====================================================
  describe('Learn Hub Category Filter (/learn/)', () => {
    beforeEach(() => {
      cy.visit('/learn/');
    });

    it('should display category filter dropdown', () => {
      cy.get('.learn-filters').should('exist');
      cy.get('#category-filter').should('exist');
    });

    it('should have All Categories selected by default', () => {
      cy.get('#category-filter').should('have.value', 'all');
    });

    it('should display difficulty filter dropdown', () => {
      cy.get('#difficulty-filter').should('exist');
      cy.get('#difficulty-filter').should('have.value', 'all');
    });

    it('should display article count', () => {
      cy.get('#article-count').should('exist');
    });

    it('should have search box', () => {
      cy.get('#article-search').should('exist');
    });

    it('should filter articles by category dropdown', () => {
      cy.get('#category-filter').select('fundamentals');
      cy.get('#category-filter').should('have.value', 'fundamentals');
      // Article count should update
      cy.get('#article-count').should('exist');
    });

    it('should filter articles by difficulty dropdown', () => {
      cy.get('#difficulty-filter').select('beginner');
      cy.get('#difficulty-filter').should('have.value', 'beginner');
    });

    it('should filter articles by search', () => {
      cy.get('#article-search').type('RSI');
      // Should filter to RSI-related articles
      cy.get('.article-card:visible').should('have.length.at.least', 1);
    });
  });
});
