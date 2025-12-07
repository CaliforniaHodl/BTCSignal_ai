/**
 * TDD Tests for Smart Chart Pro
 * Comprehensive testing: Premium gate, 7 timeframes, 12+ indicators,
 * Smart Money Concepts, drawing tools, patterns, alerts, signals
 */

describe('Smart Chart Pro', () => {

  // =====================================================
  // PREMIUM GATE / PAYWALL TESTS
  // =====================================================
  describe('Premium Gate (Paywall)', () => {
    beforeEach(() => {
      // Clear access before each test
      cy.clearLocalStorage('smart-chart-pro-access');
      cy.visit('/smart-chart-pro/');
    });

    it('should display premium gate when not unlocked', () => {
      cy.get('#premium-gate').should('be.visible');
      cy.get('#premium-content').should('not.be.visible');
    });

    it('should show correct page title and description', () => {
      cy.get('.gate-content h1').should('contain', 'Smart Chart Pro');
      cy.get('.gate-desc').should('contain', 'Professional-grade Bitcoin charting');
    });

    it('should display 6 feature highlights', () => {
      cy.get('.gate-features .feature-item').should('have.length', 6);
      cy.get('.gate-features').should('contain', 'Smart Money Concepts');
      cy.get('.gate-features').should('contain', '12+ Technical Indicators');
      cy.get('.gate-features').should('contain', 'Pattern Detection');
      cy.get('.gate-features').should('contain', 'Drawing Tools');
      cy.get('.gate-features').should('contain', '7 Timeframes');
      cy.get('.gate-features').should('contain', 'Price Alerts');
    });

    it('should show price as 50 sats', () => {
      cy.get('.price-amount').should('contain', '50 sats');
      cy.get('.price-period').should('contain', 'one-time');
    });

    it('should have unlock button', () => {
      cy.get('#btn-unlock').should('be.visible');
      cy.get('#btn-unlock').should('contain', 'Unlock Smart Chart Pro');
    });

    it('should have check access link', () => {
      cy.get('#check-access').should('exist');
    });

    it('should have link to free Smart Chart', () => {
      cy.get('.gate-free-link a[href="/smart-chart/"]').should('exist');
    });

    it('should unlock content when access granted', () => {
      // Simulate unlock
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.reload();
      cy.get('#premium-gate').should('not.be.visible');
      cy.get('#premium-content').should('be.visible');
    });

    it('should persist access across page reloads', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.reload();
      cy.get('#premium-content').should('be.visible');
      cy.reload();
      cy.get('#premium-content').should('be.visible');
    });
  });

  // =====================================================
  // PRO CONTENT - HEADER & PRICE BAR
  // =====================================================
  describe('Pro Content - Header & Price', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.intercept('GET', '**/api.binance.us/**').as('binanceApi');
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should display Pro header with title and badge', () => {
      cy.get('.chart-pro-header h1').should('contain', 'Smart Chart Pro');
      cy.get('.pro-badge').should('contain', 'PRO');
    });

    it('should have header action buttons', () => {
      cy.get('#btn-screenshot').should('exist');
      cy.get('#btn-fullscreen').should('exist');
      cy.get('#btn-settings').should('exist');
    });

    it('should display BTC/USDT symbol label', () => {
      cy.get('.symbol-label').should('contain', 'BTC/USDT');
    });

    it('should display price in header', () => {
      cy.get('#header-price').should('exist');
      cy.get('#header-change').should('exist');
    });
  });

  // =====================================================
  // 7 TIMEFRAMES
  // =====================================================
  describe('7 Timeframes', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should display all 7 timeframe options', () => {
      cy.get('.tf-tab').should('have.length', 7);
    });

    it('should have correct timeframe values', () => {
      cy.get('.tf-tab[data-tf="5"]').should('contain', '5m');
      cy.get('.tf-tab[data-tf="15"]').should('contain', '15m');
      cy.get('.tf-tab[data-tf="60"]').should('contain', '1H');
      cy.get('.tf-tab[data-tf="240"]').should('contain', '4H');
      cy.get('.tf-tab[data-tf="D"]').should('contain', '1D');
      cy.get('.tf-tab[data-tf="W"]').should('contain', '1W');
      cy.get('.tf-tab[data-tf="M"]').should('contain', '1M');
    });

    it('should have 4H selected by default', () => {
      cy.get('.tf-tab[data-tf="240"]').should('have.class', 'active');
    });

    it('should switch timeframes when clicked', () => {
      cy.get('.tf-tab[data-tf="15"]').click();
      cy.get('.tf-tab[data-tf="15"]').should('have.class', 'active');
      cy.get('.tf-tab[data-tf="240"]').should('not.have.class', 'active');
    });

    it('should have chart type options', () => {
      cy.get('.type-tab[data-type="candles"]').should('exist');
      cy.get('.type-tab[data-type="line"]').should('exist');
      cy.get('.type-tab[data-type="heikin"]').should('exist');
    });

    it('should have candlesticks selected by default', () => {
      cy.get('.type-tab[data-type="candles"]').should('have.class', 'active');
    });
  });

  // =====================================================
  // DRAWING TOOLS SIDEBAR
  // =====================================================
  describe('Drawing Tools', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should display tools sidebar', () => {
      cy.get('.tools-sidebar').should('be.visible');
    });

    it('should have crosshair tool', () => {
      cy.get('.tool-btn[data-tool="crosshair"]').should('exist');
    });

    it('should have line drawing tools', () => {
      cy.get('.tool-btn[data-tool="trendline"]').should('exist');
      cy.get('.tool-btn[data-tool="horizontal"]').should('exist');
      cy.get('.tool-btn[data-tool="vertical"]').should('exist');
      cy.get('.tool-btn[data-tool="ray"]').should('exist');
    });

    it('should have fibonacci tools', () => {
      cy.get('.tool-btn[data-tool="fib-retrace"]').should('exist');
      cy.get('.tool-btn[data-tool="fib-extension"]').should('exist');
    });

    it('should have channel and pitchfork tools', () => {
      cy.get('.tool-btn[data-tool="channel"]').should('exist');
      cy.get('.tool-btn[data-tool="pitchfork"]').should('exist');
    });

    it('should have shape tools', () => {
      cy.get('.tool-btn[data-tool="rectangle"]').should('exist');
      cy.get('.tool-btn[data-tool="circle"]').should('exist');
      cy.get('.tool-btn[data-tool="text"]').should('exist');
      cy.get('.tool-btn[data-tool="arrow"]').should('exist');
    });

    it('should have measure and delete tools', () => {
      cy.get('.tool-btn[data-tool="measure"]').should('exist');
      cy.get('.tool-btn[data-tool="delete-all"]').should('exist');
    });

    it('should activate tool when clicked', () => {
      cy.get('.tool-btn[data-tool="trendline"]').click();
      cy.get('.tool-btn[data-tool="trendline"]').should('have.class', 'active');
    });

    it('should deactivate other tools when one is selected', () => {
      cy.get('.tool-btn[data-tool="trendline"]').click();
      cy.get('.tool-btn[data-tool="horizontal"]').click();
      cy.get('.tool-btn[data-tool="trendline"]').should('not.have.class', 'active');
      cy.get('.tool-btn[data-tool="horizontal"]').should('have.class', 'active');
    });
  });

  // =====================================================
  // MAIN CHART AREA
  // =====================================================
  describe('Main Chart', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.intercept('GET', '**/api.binance.us/**').as('binanceApi');
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should display chart container', () => {
      cy.get('#pro-chart').should('be.visible');
    });

    it('should display OHLC overlay', () => {
      cy.get('#ohlc-display').should('exist');
    });

    it('should show chart after data loads', () => {
      cy.wait('@binanceApi', { timeout: 10000 });
      cy.get('#pro-chart canvas').should('exist');
    });
  });

  // =====================================================
  // 12+ INDICATORS - OVERLAY TOGGLES
  // =====================================================
  describe('Overlay Indicators (12+)', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should have Overlays section', () => {
      cy.get('.sidebar-section h3').should('contain', 'Overlays');
    });

    it('should have EMA toggles (9, 21, 50, 100, 200)', () => {
      cy.get('#tog-ema9').should('exist');
      cy.get('#tog-ema21').should('exist');
      cy.get('#tog-ema50').should('exist');
      cy.get('#tog-ema100').should('exist');
      cy.get('#tog-ema200').should('exist');
    });

    it('should have EMA 9 and 21 checked by default', () => {
      cy.get('#tog-ema9').should('be.checked');
      cy.get('#tog-ema21').should('be.checked');
    });

    it('should have EMA 50, 100, 200 unchecked by default', () => {
      cy.get('#tog-ema50').should('not.be.checked');
      cy.get('#tog-ema100').should('not.be.checked');
      cy.get('#tog-ema200').should('not.be.checked');
    });

    it('should have Bollinger Bands toggle', () => {
      cy.get('#tog-bb').should('exist');
    });

    it('should have Ichimoku Cloud toggle', () => {
      cy.get('#tog-ichimoku').should('exist');
    });

    it('should have Supertrend toggle', () => {
      cy.get('#tog-supertrend').should('exist');
    });

    it('should have VWAP toggle', () => {
      cy.get('#tog-vwap').should('exist');
    });

    it('should toggle indicators on/off', () => {
      cy.get('#tog-ema50').check();
      cy.get('#tog-ema50').should('be.checked');
      cy.get('#tog-ema50').uncheck();
      cy.get('#tog-ema50').should('not.be.checked');
    });

    it('should display color indicators for each overlay', () => {
      cy.get('.indicator-toggle .toggle-color').should('have.length.at.least', 9);
    });
  });

  // =====================================================
  // PANEL INDICATORS (RSI, MACD, etc.)
  // =====================================================
  describe('Panel Indicators', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should have Panels section', () => {
      cy.get('.sidebar-section h3').should('contain', 'Panels');
    });

    it('should have RSI toggle', () => {
      cy.get('#tog-rsi').should('exist');
    });

    it('should have MACD toggle', () => {
      cy.get('#tog-macd').should('exist');
    });

    it('should have Stoch RSI toggle', () => {
      cy.get('#tog-stochrsi').should('exist');
    });

    it('should have Volume toggle', () => {
      cy.get('#tog-volume').should('exist');
    });

    it('should have OBV toggle', () => {
      cy.get('#tog-obv').should('exist');
    });

    it('should have ATR toggle', () => {
      cy.get('#tog-atr').should('exist');
    });

    it('should have RSI and Volume checked by default', () => {
      cy.get('#tog-rsi').should('be.checked');
      cy.get('#tog-volume').should('be.checked');
    });

    it('should display RSI panel', () => {
      cy.get('#panel-rsi').should('be.visible');
    });

    it('should display Volume panel', () => {
      cy.get('#panel-volume').should('be.visible');
    });

    it('should have RSI value display', () => {
      cy.get('#rsi-value').should('exist');
    });

    it('should hide MACD panel by default', () => {
      cy.get('#panel-macd').should('not.be.visible');
    });

    it('should show MACD panel when toggled', () => {
      cy.get('#tog-macd').check();
      cy.get('#panel-macd').should('be.visible');
    });

    it('should have close button on panels', () => {
      cy.get('.panel-close[data-panel="rsi"]').should('exist');
      cy.get('.panel-close[data-panel="volume"]').should('exist');
    });
  });

  // =====================================================
  // SMART MONEY CONCEPTS
  // =====================================================
  describe('Smart Money Concepts', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should have Smart Money section', () => {
      cy.get('.sidebar-section h3').should('contain', 'Smart Money');
    });

    it('should have Order Blocks toggle', () => {
      cy.get('#tog-orderblocks').should('exist');
      cy.get('label').contains('Order Blocks').should('exist');
    });

    it('should have Fair Value Gaps toggle', () => {
      cy.get('#tog-fvg').should('exist');
      cy.get('label').contains('Fair Value Gaps').should('exist');
    });

    it('should have Liquidity Zones toggle', () => {
      cy.get('#tog-liquidity').should('exist');
      cy.get('label').contains('Liquidity Zones').should('exist');
    });

    it('should have Breaker Blocks toggle', () => {
      cy.get('#tog-breaker').should('exist');
      cy.get('label').contains('Breaker Blocks').should('exist');
    });

    it('should have SMC color indicators', () => {
      cy.get('.toggle-color.smc').should('have.length', 4);
    });

    it('should toggle SMC features on/off', () => {
      cy.get('#tog-orderblocks').check();
      cy.get('#tog-orderblocks').should('be.checked');
      cy.get('#tog-fvg').check();
      cy.get('#tog-fvg').should('be.checked');
    });
  });

  // =====================================================
  // KEY LEVELS (Extended)
  // =====================================================
  describe('Key Levels (Extended)', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.intercept('GET', '**/api.binance.us/**').as('binanceApi');
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should have Key Levels section', () => {
      cy.get('.sidebar-section h3').should('contain', 'Key Levels');
    });

    it('should display pivot point levels (R3-S3)', () => {
      cy.get('#r3-price').should('exist');
      cy.get('#r2-price').should('exist');
      cy.get('#r1-price').should('exist');
      cy.get('#pivot-price').should('exist');
      cy.get('#s1-price').should('exist');
      cy.get('#s2-price').should('exist');
      cy.get('#s3-price').should('exist');
    });

    it('should display previous day high/low', () => {
      cy.get('#pdh-price').should('exist');
      cy.get('#pdl-price').should('exist');
    });

    it('should display previous week high/low', () => {
      cy.get('#pwh-price').should('exist');
      cy.get('#pwl-price').should('exist');
    });

    it('should have correct level classes', () => {
      cy.get('.level-row.resistance').should('have.length', 3);
      cy.get('.level-row.support').should('have.length', 3);
      cy.get('.level-row.pivot').should('have.length', 1);
      cy.get('.level-row.htf').should('have.length', 4);
    });

    it('should populate levels after data loads', () => {
      cy.wait('@binanceApi', { timeout: 10000 });
      cy.get('#pivot-price').should('not.contain', '--');
    });

    it('should show R levels above pivot', () => {
      cy.wait('@binanceApi', { timeout: 10000 });
      cy.get('#pivot-price').invoke('text').then((pivotText) => {
        cy.get('#r1-price').invoke('text').then((r1Text) => {
          if (pivotText !== '--' && r1Text !== '--') {
            const pivot = parseFloat(pivotText.replace(/[$,]/g, ''));
            const r1 = parseFloat(r1Text.replace(/[$,]/g, ''));
            expect(r1).to.be.greaterThan(pivot);
          }
        });
      });
    });

    it('should show S levels below pivot', () => {
      cy.wait('@binanceApi', { timeout: 10000 });
      cy.get('#pivot-price').invoke('text').then((pivotText) => {
        cy.get('#s1-price').invoke('text').then((s1Text) => {
          if (pivotText !== '--' && s1Text !== '--') {
            const pivot = parseFloat(pivotText.replace(/[$,]/g, ''));
            const s1 = parseFloat(s1Text.replace(/[$,]/g, ''));
            expect(s1).to.be.lessThan(pivot);
          }
        });
      });
    });
  });

  // =====================================================
  // PATTERN DETECTION
  // =====================================================
  describe('Pattern Detection', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.intercept('GET', '**/api.binance.us/**').as('binanceApi');
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should have Detected Patterns section', () => {
      cy.get('.sidebar-section h3').should('contain', 'Detected Patterns');
    });

    it('should have patterns list container', () => {
      cy.get('#patterns-list').should('exist');
    });

    it('should show scanning state initially', () => {
      cy.get('#patterns-list').should('contain', 'Scanning');
    });

    it('should update patterns after data loads', () => {
      cy.wait('@binanceApi', { timeout: 10000 });
      // Should no longer show "Scanning..."
      cy.get('#patterns-list .pattern-item').should('exist');
    });

    it('should display pattern with icon and name', () => {
      cy.wait('@binanceApi', { timeout: 10000 });
      cy.get('.pattern-item .pattern-icon').should('exist');
      cy.get('.pattern-item .pattern-name').should('exist');
    });
  });

  // =====================================================
  // SIGNAL SUMMARY & CONFLUENCE SCORING
  // =====================================================
  describe('Signal Summary & Confluence', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.intercept('GET', '**/api.binance.us/**').as('binanceApi');
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should have Signal Summary section', () => {
      cy.get('.sidebar-section h3').should('contain', 'Signal Summary');
    });

    it('should display signal direction', () => {
      cy.get('#signal-direction').should('exist');
    });

    it('should display confluence score', () => {
      cy.get('#confluence-score').should('exist');
    });

    it('should have score bar', () => {
      cy.get('.score-bar').should('exist');
      cy.get('#score-fill').should('exist');
    });

    it('should display signal factors', () => {
      cy.get('#signal-factors').should('exist');
      cy.get('#signal-factors .factor').should('have.length', 5);
    });

    it('should show EMA Alignment factor', () => {
      cy.get('#signal-factors').should('contain', 'EMA Alignment');
    });

    it('should show RSI Position factor', () => {
      cy.get('#signal-factors').should('contain', 'RSI Position');
    });

    it('should show MACD Signal factor', () => {
      cy.get('#signal-factors').should('contain', 'MACD Signal');
    });

    it('should show Volume Trend factor', () => {
      cy.get('#signal-factors').should('contain', 'Volume Trend');
    });

    it('should show S/R Proximity factor', () => {
      cy.get('#signal-factors').should('contain', 'S/R Proximity');
    });

    it('should update signal after data loads', () => {
      cy.wait('@binanceApi', { timeout: 10000 });
      cy.get('#signal-direction').should('not.contain', 'Analyzing');
    });

    it('should show score as X/100 format', () => {
      cy.wait('@binanceApi', { timeout: 10000 });
      cy.get('#confluence-score').invoke('text').then((text) => {
        expect(text).to.match(/\d+\/100/);
      });
    });

    it('should have score between 0-100', () => {
      cy.wait('@binanceApi', { timeout: 10000 });
      cy.get('#confluence-score').invoke('text').then((text) => {
        const score = parseInt(text.split('/')[0]);
        expect(score).to.be.at.least(0);
        expect(score).to.be.at.most(100);
      });
    });

    it('should apply correct class based on score', () => {
      cy.wait('@binanceApi', { timeout: 10000 });
      cy.get('#signal-direction').should('satisfy', ($el) => {
        const classes = $el[0].className;
        return classes.includes('bullish') ||
               classes.includes('bearish') ||
               classes.includes('neutral');
      });
    });
  });

  // =====================================================
  // PRICE ALERTS
  // =====================================================
  describe('Price Alerts', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should have Price Alerts section', () => {
      cy.get('.sidebar-section h3').should('contain', 'Price Alerts');
    });

    it('should have alert price input', () => {
      cy.get('#alert-price').should('exist');
      cy.get('#alert-price').should('have.attr', 'type', 'number');
    });

    it('should have add alert button', () => {
      cy.get('#btn-add-alert').should('exist');
    });

    it('should have alerts list container', () => {
      cy.get('#alerts-list').should('exist');
    });

    it('should show no alerts message initially', () => {
      cy.get('#alerts-list').should('contain', 'No alerts set');
    });

    it('should add alert when price entered and button clicked', () => {
      cy.get('#alert-price').type('100000');
      cy.get('#btn-add-alert').click();
      cy.get('#alerts-list .alert-item').should('have.length', 1);
      cy.get('#alerts-list').should('contain', '$100,000');
    });

    it('should add multiple alerts', () => {
      cy.get('#alert-price').type('95000');
      cy.get('#btn-add-alert').click();
      cy.get('#alert-price').type('105000');
      cy.get('#btn-add-alert').click();
      cy.get('#alerts-list .alert-item').should('have.length', 2);
    });

    it('should have remove button on alerts', () => {
      cy.get('#alert-price').type('100000');
      cy.get('#btn-add-alert').click();
      cy.get('.btn-remove-alert').should('exist');
    });

    it('should remove alert when remove button clicked', () => {
      cy.get('#alert-price').type('100000');
      cy.get('#btn-add-alert').click();
      cy.get('.btn-remove-alert').click();
      cy.get('#alerts-list').should('contain', 'No alerts set');
    });

    it('should clear input after adding alert', () => {
      cy.get('#alert-price').type('100000');
      cy.get('#btn-add-alert').click();
      cy.get('#alert-price').should('have.value', '');
    });

    it('should not add alert with invalid price', () => {
      cy.get('#alert-price').type('-100');
      cy.get('#btn-add-alert').click();
      cy.get('#alerts-list').should('contain', 'No alerts set');
    });
  });

  // =====================================================
  // RSI CALCULATION ACCURACY
  // =====================================================
  describe('RSI Calculation Accuracy', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.intercept('GET', '**/api.binance.us/**').as('binanceApi');
      cy.visit('/smart-chart-pro/');
      cy.wait('@binanceApi', { timeout: 10000 });
    });

    it('should display RSI value between 0-100', () => {
      cy.get('#rsi-value').invoke('text').then((text) => {
        if (text !== '--') {
          const value = parseFloat(text);
          expect(value).to.be.at.least(0);
          expect(value).to.be.at.most(100);
        }
      });
    });

    it('should not display NaN for RSI', () => {
      cy.get('#rsi-value').invoke('text').should('not.contain', 'NaN');
    });
  });

  // =====================================================
  // ERROR HANDLING & EDGE CASES
  // =====================================================
  describe('Error Handling', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
    });

    it('should handle API failure gracefully', () => {
      cy.intercept('GET', '**/api.binance.us/**', { statusCode: 500 }).as('apiFail');
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
      cy.get('h1').should('contain', 'Smart Chart Pro');
    });

    it('should show loading placeholders on slow API', () => {
      cy.intercept('GET', '**/api.binance.us/**', { delay: 5000, statusCode: 200, body: [] }).as('slowApi');
      cy.visit('/smart-chart-pro/');
      cy.get('#rsi-value').should('contain', '--');
      cy.get('#confluence-score').should('contain', '--');
    });

    it('should not show NaN in price displays on error', () => {
      cy.intercept('GET', '**/api.binance.us/**', { statusCode: 500 }).as('apiFail');
      cy.visit('/smart-chart-pro/');
      cy.wait('@apiFail');
      cy.get('#header-price').invoke('text').should('not.contain', 'NaN');
      cy.get('#pivot-price').invoke('text').should('not.contain', 'NaN');
    });

    it('should not show undefined in displays on error', () => {
      cy.intercept('GET', '**/api.binance.us/**', { statusCode: 500 }).as('apiFail');
      cy.visit('/smart-chart-pro/');
      cy.wait('@apiFail');
      cy.get('#header-price').invoke('text').should('not.contain', 'undefined');
      cy.get('#confluence-score').invoke('text').should('not.contain', 'undefined');
    });
  });

  // =====================================================
  // KEYBOARD NAVIGATION
  // =====================================================
  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should allow keyboard input in alert price field', () => {
      cy.get('#alert-price').focus();
      cy.focused().type('99000');
      cy.get('#alert-price').should('have.value', '99000');
    });

    it('should submit alert with Enter key', () => {
      cy.get('#alert-price').type('99000');
      cy.get('#btn-add-alert').focus();
      cy.focused().type('{enter}');
      cy.get('#alerts-list .alert-item').should('have.length', 1);
    });

    it('should toggle checkboxes with Space', () => {
      cy.get('#tog-ema50').focus();
      cy.focused().type(' ');
      cy.get('#tog-ema50').should('be.checked');
    });

    it('should navigate timeframes with Tab', () => {
      cy.get('.tf-tab[data-tf="5"]').focus();
      cy.focused().should('have.attr', 'data-tf', '5');
    });

    it('should activate timeframe with Enter', () => {
      cy.get('.tf-tab[data-tf="15"]').focus();
      cy.focused().type('{enter}');
      cy.get('.tf-tab[data-tf="15"]').should('have.class', 'active');
    });

    it('should activate tool with Enter', () => {
      cy.get('.tool-btn[data-tool="trendline"]').focus();
      cy.focused().type('{enter}');
      cy.get('.tool-btn[data-tool="trendline"]').should('have.class', 'active');
    });
  });

  // =====================================================
  // ACCESSIBILITY
  // =====================================================
  describe('Accessibility', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
    });

    it('should have single h1 heading', () => {
      cy.get('h1').should('have.length', 1);
    });

    it('should have section headings (h3)', () => {
      cy.get('.sidebar-section h3').should('have.length.at.least', 6);
    });

    it('should have labels for checkbox inputs', () => {
      cy.get('input[type="checkbox"]').each(($input) => {
        const id = $input.attr('id');
        if (id) {
          cy.get(`label[for="${id}"], label:has(#${id})`).should('exist');
        }
      });
    });

    it('should have title attributes on tool buttons', () => {
      cy.get('.tool-btn').each(($btn) => {
        cy.wrap($btn).should('have.attr', 'title');
      });
    });

    it('should have visible focus indicators', () => {
      cy.get('button').first().focus();
      cy.focused().should('exist');
    });
  });

  // =====================================================
  // RESPONSIVE DESIGN
  // =====================================================
  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
    });

    it('should render on mobile without horizontal scroll', () => {
      cy.viewport(375, 667);
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 1);
      });
    });

    it('should render on tablet without horizontal scroll', () => {
      cy.viewport(768, 1024);
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 1);
      });
    });

    it('should render on desktop without horizontal scroll', () => {
      cy.viewport(1440, 900);
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible');
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 1);
      });
    });
  });

  // =====================================================
  // PERFORMANCE
  // =====================================================
  describe('Performance', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('smart-chart-pro-access', 'true');
      });
    });

    it('should load page within 5 seconds', () => {
      const start = Date.now();
      cy.visit('/smart-chart-pro/');
      cy.get('#premium-content').should('be.visible').then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(5000);
      });
    });

    it('should render chart within 10 seconds', () => {
      cy.intercept('GET', '**/api.binance.us/**').as('binanceApi');
      const start = Date.now();
      cy.visit('/smart-chart-pro/');
      cy.wait('@binanceApi', { timeout: 10000 });
      cy.get('#pro-chart canvas').should('exist').then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(10000);
      });
    });
  });

  // =====================================================
  // NAVIGATION IN HEADER
  // =====================================================
  describe('Navigation', () => {
    it('should be accessible from Pro Tools dropdown', () => {
      cy.visit('/');
      cy.get('.dropdown-toggle').contains('Pro Tools').click();
      cy.get('#pro-tools-menu a[href="/smart-chart-pro/"]').should('exist');
    });

    it('should be first item in Pro Tools menu', () => {
      cy.visit('/');
      cy.get('.dropdown-toggle').contains('Pro Tools').click();
      cy.get('#pro-tools-menu li').first().find('a').should('have.attr', 'href', '/smart-chart-pro/');
    });
  });
});
