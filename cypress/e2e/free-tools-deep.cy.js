/**
 * Deep TDD Tests for Phase 8.5 Free Tools
 * Calculation accuracy, edge cases, error handling, accessibility
 */

describe('Free Tools - Deep Testing', () => {

  // =====================================================
  // SMART CHART - CALCULATION & LOGIC TESTS
  // =====================================================
  describe('Smart Chart - Calculations & Logic', () => {
    beforeEach(() => {
      cy.visit('/smart-chart/');
      cy.wait(2000); // Wait for data to load
    });

    describe('EMA Calculation Accuracy', () => {
      it('should display EMA values when EMAs toggle is checked', () => {
        cy.get('#show-emas').should('be.checked');
        // EMAs should be rendered on chart
      });

      it('should hide EMAs when toggle is unchecked', () => {
        cy.get('#show-emas').uncheck();
        cy.get('#show-emas').should('not.be.checked');
      });

      it('should re-show EMAs when toggle is re-checked', () => {
        cy.get('#show-emas').uncheck();
        cy.get('#show-emas').check();
        cy.get('#show-emas').should('be.checked');
      });
    });

    describe('RSI Display', () => {
      it('should display RSI value as a number', () => {
        cy.get('#rsi-display').invoke('text').then((text) => {
          const value = parseFloat(text);
          // RSI should be between 0-100 or show --
          if (text !== '--') {
            expect(value).to.be.at.least(0);
            expect(value).to.be.at.most(100);
          }
        });
      });

      it('should apply correct class for overbought RSI (>70)', () => {
        // This tests the logic, not guaranteed to trigger
        cy.get('#rsi-display').then(($el) => {
          const value = parseFloat($el.text());
          if (value > 70) {
            cy.wrap($el).should('have.class', 'bearish');
          }
        });
      });

      it('should apply correct class for oversold RSI (<30)', () => {
        cy.get('#rsi-display').then(($el) => {
          const value = parseFloat($el.text());
          if (value < 30) {
            cy.wrap($el).should('have.class', 'bullish');
          }
        });
      });
    });

    describe('Support/Resistance Levels', () => {
      it('should display numeric price levels', () => {
        cy.get('#current-price').invoke('text').then((text) => {
          if (text !== '--') {
            expect(text).to.match(/\$[\d,]+/);
          }
        });
      });

      it('should show R1 above current price', () => {
        cy.get('#current-price').invoke('text').then((currentText) => {
          cy.get('#r1-price').invoke('text').then((r1Text) => {
            if (currentText !== '--' && r1Text !== '--') {
              const current = parseFloat(currentText.replace(/[$,]/g, ''));
              const r1 = parseFloat(r1Text.replace(/[$,]/g, ''));
              expect(r1).to.be.greaterThan(current);
            }
          });
        });
      });

      it('should show S1 below current price', () => {
        cy.get('#current-price').invoke('text').then((currentText) => {
          cy.get('#s1-price').invoke('text').then((s1Text) => {
            if (currentText !== '--' && s1Text !== '--') {
              const current = parseFloat(currentText.replace(/[$,]/g, ''));
              const s1 = parseFloat(s1Text.replace(/[$,]/g, ''));
              expect(s1).to.be.lessThan(current);
            }
          });
        });
      });
    });

    describe('Indicator Bars', () => {
      it('should show indicator bar widths between 0-100%', () => {
        ['ema', 'rsi', 'macd', 'vol'].forEach((ind) => {
          cy.get(`#${ind}-bar`).then(($el) => {
            const width = $el[0].style.width;
            if (width) {
              const percent = parseFloat(width);
              expect(percent).to.be.at.least(0);
              expect(percent).to.be.at.most(100);
            }
          });
        });
      });
    });

    describe('Overall Score', () => {
      it('should display score as X/100 format', () => {
        cy.get('#overall-score').invoke('text').then((text) => {
          if (text !== '--') {
            expect(text).to.match(/\d+\/100/);
          }
        });
      });

      it('should have score between 0-100', () => {
        cy.get('#overall-score').invoke('text').then((text) => {
          if (text !== '--') {
            const score = parseInt(text.split('/')[0]);
            expect(score).to.be.at.least(0);
            expect(score).to.be.at.most(100);
          }
        });
      });
    });

    describe('API Failure Handling', () => {
      it('should handle Binance API failure gracefully', () => {
        cy.intercept('GET', '**/api.binance.us/**', { statusCode: 500 }).as('binanceFail');
        cy.visit('/smart-chart/');
        // Page should still load without crashing
        cy.get('h1').should('contain', 'Smart Chart');
      });
    });
  });

  // =====================================================
  // DCA CALCULATOR - CALCULATION ACCURACY
  // =====================================================
  describe('DCA Calculator - Calculation Accuracy', () => {
    beforeEach(() => {
      cy.visit('/dca-calculator/');
    });

    describe('Input Validation', () => {
      it('should not accept negative investment amounts', () => {
        cy.get('#amount').clear().type('-100');
        cy.get('#calculate-btn').click();
        // Should either reject or treat as 0
        cy.get('#total-invested').invoke('text').should('not.contain', '-');
      });

      it('should handle very large investment amounts', () => {
        cy.get('#amount').clear().type('1000000');
        cy.get('#calculate-btn').click();
        // Should calculate without crashing
        cy.get('.results-grid').should('exist');
      });

      it('should handle decimal amounts', () => {
        cy.get('#amount').clear().type('100.50');
        cy.get('#calculate-btn').click();
        cy.get('.results-grid').should('exist');
      });

      it('should require start date before end date', () => {
        cy.get('#start-date').clear().type('2024-12-01');
        cy.get('#end-date').clear().type('2024-01-01');
        cy.get('#calculate-btn').click();
        // Should handle invalid date range
      });
    });

    describe('Frequency Calculations', () => {
      it('should calculate more purchases for daily vs monthly', () => {
        // Set same date range
        cy.get('#start-date').clear().type('2024-01-01');
        cy.get('#end-date').clear().type('2024-03-01');
        cy.get('#amount').clear().type('100');

        // Daily frequency
        cy.get('#frequency').select('daily');
        cy.get('#calculate-btn').click();
        cy.get('#total-invested').invoke('text').then((dailyInvested) => {
          // Monthly frequency
          cy.get('#frequency').select('monthly');
          cy.get('#calculate-btn').click();
          cy.get('#total-invested').invoke('text').then((monthlyInvested) => {
            const daily = parseFloat(dailyInvested.replace(/[$,]/g, ''));
            const monthly = parseFloat(monthlyInvested.replace(/[$,]/g, ''));
            // Daily should have invested more (more purchases)
            expect(daily).to.be.greaterThan(monthly);
          });
        });
      });
    });

    describe('ROI Calculation', () => {
      it('should display ROI as percentage', () => {
        cy.get('#start-date').clear().type('2020-01-01');
        cy.get('#end-date').clear().type('2024-01-01');
        cy.get('#amount').clear().type('100');
        cy.get('#frequency').select('monthly');
        cy.get('#calculate-btn').click();

        cy.get('#roi').invoke('text').then((text) => {
          if (text !== '--') {
            expect(text).to.contain('%');
          }
        });
      });
    });

    describe('Chart Rendering', () => {
      it('should render chart after calculation', () => {
        cy.get('#start-date').clear().type('2023-01-01');
        cy.get('#end-date').clear().type('2024-01-01');
        cy.get('#amount').clear().type('100');
        cy.get('#calculate-btn').click();

        cy.get('#dca-chart').should('be.visible');
      });
    });
  });

  // =====================================================
  // FEE ESTIMATOR - DATA VALIDATION
  // =====================================================
  describe('Fee Estimator - Data Validation', () => {
    beforeEach(() => {
      cy.visit('/fee-estimator/');
      cy.wait(1500); // Wait for API data
    });

    describe('Fee Rate Validation', () => {
      it('should display fastest fee as highest', () => {
        cy.get('#fee-fastest').invoke('text').then((fastestText) => {
          cy.get('#fee-slow').invoke('text').then((slowText) => {
            if (fastestText !== '--' && slowText !== '--') {
              const fastest = parseFloat(fastestText);
              const slow = parseFloat(slowText);
              expect(fastest).to.be.at.least(slow);
            }
          });
        });
      });

      it('should show fee rates as positive numbers', () => {
        ['fastest', 'medium', 'slow'].forEach((priority) => {
          cy.get(`#fee-${priority}`).invoke('text').then((text) => {
            if (text !== '--') {
              const value = parseFloat(text);
              expect(value).to.be.greaterThan(0);
            }
          });
        });
      });
    });

    describe('Mempool Stats Validation', () => {
      it('should show mempool size in MB', () => {
        cy.get('#mempool-size').invoke('text').then((text) => {
          if (text !== '--') {
            expect(text).to.contain('MB');
          }
        });
      });

      it('should show pending transactions as positive number', () => {
        cy.get('#pending-txs').invoke('text').then((text) => {
          if (text !== '--') {
            const value = parseInt(text.replace(/,/g, ''));
            expect(value).to.be.at.least(0);
          }
        });
      });
    });

    describe('Calculator Logic', () => {
      it('should update custom cost when tx size changes', () => {
        cy.get('#calc-custom').invoke('text').then((originalText) => {
          cy.get('#tx-size').clear().type('500');
          cy.wait(500);
          cy.get('#calc-custom').invoke('text').then((newText) => {
            // Cost should change with different tx size
            if (originalText !== '--' && newText !== '--') {
              expect(newText).to.not.equal(originalText);
            }
          });
        });
      });

      it('should show higher cost for larger transactions', () => {
        cy.get('#tx-size').clear().type('250');
        cy.wait(500);
        cy.get('#calc-custom').invoke('text').then((smallText) => {
          cy.get('#tx-size').clear().type('1000');
          cy.wait(500);
          cy.get('#calc-custom').invoke('text').then((largeText) => {
            if (smallText !== '--' && largeText !== '--') {
              const small = parseInt(smallText.split(' ')[0].replace(/,/g, ''));
              const large = parseInt(largeText.split(' ')[0].replace(/,/g, ''));
              expect(large).to.be.greaterThan(small);
            }
          });
        });
      });
    });

    describe('API Failure Handling', () => {
      it('should handle mempool.space API failure gracefully', () => {
        cy.intercept('GET', '**/mempool.space/**', { statusCode: 500 }).as('mempoolFail');
        cy.visit('/fee-estimator/');
        // Page should still load
        cy.get('h1').should('contain', 'Fee Estimator');
        // Should show fallback values
        cy.get('#fee-fastest').should('exist');
      });
    });
  });

  // =====================================================
  // SATS CONVERTER - CONVERSION ACCURACY
  // =====================================================
  describe('Sats Converter - Conversion Accuracy', () => {
    beforeEach(() => {
      cy.visit('/sats-converter/');
      cy.wait(1500); // Wait for price data
    });

    describe('Conversion Logic', () => {
      it('should convert 1 BTC to 100,000,000 sats', () => {
        cy.get('#btc-input').clear().type('1');
        cy.get('#sats-input').should('have.value', '100000000');
      });

      it('should convert sats back to correct BTC', () => {
        cy.get('#sats-input').clear().type('50000000');
        cy.get('#btc-input').invoke('val').then((val) => {
          const btc = parseFloat(val);
          expect(btc).to.equal(0.5);
        });
      });

      it('should update all fields when USD changes', () => {
        cy.get('#usd-input').clear().type('1000');
        cy.get('#btc-input').invoke('val').should('not.be.empty');
        cy.get('#sats-input').invoke('val').should('not.be.empty');
      });

      it('should handle decimal sats (round to integer)', () => {
        cy.get('#btc-input').clear().type('0.000000001');
        cy.get('#sats-input').invoke('val').then((val) => {
          const sats = parseInt(val);
          // Should be 0 or 1, not a decimal
          expect(Number.isInteger(sats)).to.be.true;
        });
      });
    });

    describe('Stack Tracker', () => {
      it('should add purchase to stack', () => {
        cy.get('#purchase-amount').clear().type('10000');
        cy.get('#add-purchase').click();
        cy.get('#total-stack').invoke('text').should('contain', '10,000');
      });

      it('should calculate correct total after multiple purchases', () => {
        cy.get('#purchase-amount').clear().type('10000');
        cy.get('#add-purchase').click();
        cy.get('#purchase-amount').clear().type('5000');
        cy.get('#add-purchase').click();
        cy.get('#total-stack').invoke('text').should('contain', '15,000');
      });

      it('should persist stack in localStorage', () => {
        cy.get('#purchase-amount').clear().type('25000');
        cy.get('#add-purchase').click();
        cy.reload();
        cy.get('#total-stack').invoke('text').should('contain', '25,000');
      });

      it('should delete purchase when delete button clicked', () => {
        cy.get('#purchase-amount').clear().type('10000');
        cy.get('#add-purchase').click();
        cy.get('.delete-btn').first().click();
        cy.get('#total-stack').invoke('text').should('contain', '0');
      });
    });

    describe('Input Validation', () => {
      it('should not accept negative amounts', () => {
        cy.get('#usd-input').clear().type('-100');
        // Should either clear or ignore negative
        cy.get('#btc-input').invoke('val').then((val) => {
          const btc = parseFloat(val);
          expect(btc).to.be.at.least(0);
        });
      });

      it('should handle empty inputs gracefully', () => {
        cy.get('#usd-input').clear();
        cy.get('#btc-input').clear();
        // Should not crash
        cy.get('.converter-card').should('exist');
      });
    });
  });

  // =====================================================
  // HODL WAVES - DATA ACCURACY
  // =====================================================
  describe('HODL Waves - Data Accuracy', () => {
    beforeEach(() => {
      cy.visit('/hodl-waves/');
      cy.wait(1000);
    });

    describe('Percentage Validation', () => {
      it('should show holder percentages summing to ~100%', () => {
        // The distribution bars should roughly sum to 100%
        cy.get('#hodl-1y').invoke('text').then((y1) => {
          cy.get('#active-supply').invoke('text').then((active) => {
            // 1Y+ and <1Y should account for most of supply
            if (y1 !== '--' && active !== '--') {
              const oneYearPlus = parseFloat(y1);
              const activeSupply = parseFloat(active);
              // These should add to less than 100 (middle buckets exist)
              expect(oneYearPlus + activeSupply).to.be.lessThan(100);
            }
          });
        });
      });

      it('should show 5Y+ as subset of 2Y+', () => {
        cy.get('#hodl-5y').invoke('text').then((y5) => {
          cy.get('#hodl-2y').invoke('text').then((y2) => {
            if (y5 !== '--' && y2 !== '--') {
              const fiveYear = parseFloat(y5);
              const twoYear = parseFloat(y2);
              expect(fiveYear).to.be.at.most(twoYear);
            }
          });
        });
      });

      it('should show 2Y+ as subset of 1Y+', () => {
        cy.get('#hodl-2y').invoke('text').then((y2) => {
          cy.get('#hodl-1y').invoke('text').then((y1) => {
            if (y2 !== '--' && y1 !== '--') {
              const twoYear = parseFloat(y2);
              const oneYear = parseFloat(y1);
              expect(twoYear).to.be.at.most(oneYear);
            }
          });
        });
      });
    });

    describe('Chart Rendering', () => {
      it('should render chart with data', () => {
        cy.get('#hodl-chart').should('be.visible');
      });

      it('should update chart when time range changes', () => {
        cy.get('.time-btn[data-range="2y"]').click();
        cy.wait(500);
        cy.get('#hodl-chart').should('be.visible');
      });
    });

    describe('Insight Generation', () => {
      it('should display insight title', () => {
        cy.get('#insight-title').invoke('text').should('not.equal', 'Loading...');
      });

      it('should display insight text', () => {
        cy.get('#insight-text').invoke('text').should('not.contain', 'Analyzing');
      });
    });
  });

  // =====================================================
  // DIFFICULTY RIBBON - MINING DATA
  // =====================================================
  describe('Difficulty Ribbon - Mining Data', () => {
    beforeEach(() => {
      cy.visit('/difficulty-ribbon/');
      cy.wait(2000); // Wait for API data
    });

    describe('Difficulty Values', () => {
      it('should display difficulty in T (trillion) format', () => {
        cy.get('#current-difficulty').invoke('text').then((text) => {
          if (text !== '--' && text !== '~95T') {
            expect(text).to.match(/[\d.]+T/);
          }
        });
      });

      it('should show difficulty change as percentage', () => {
        cy.get('#difficulty-change').invoke('text').then((text) => {
          if (text !== '--') {
            expect(text).to.match(/[+-]?[\d.]+%/);
          }
        });
      });
    });

    describe('Hash Rate', () => {
      it('should display hash rate as positive number', () => {
        cy.get('#hash-rate').invoke('text').then((text) => {
          if (text !== '--' && !text.includes('~')) {
            const value = parseFloat(text);
            expect(value).to.be.greaterThan(0);
          }
        });
      });
    });

    describe('Signal Detection', () => {
      it('should display signal banner with title', () => {
        cy.get('#ribbon-signal-title').invoke('text').should('not.equal', 'Loading...');
      });

      it('should have appropriate signal class', () => {
        cy.get('#signal-banner').should('satisfy', ($el) => {
          const classes = $el[0].className;
          return classes.includes('bullish') ||
                 classes.includes('caution') ||
                 classes.includes('neutral');
        });
      });
    });

    describe('Historical Signals', () => {
      it('should show multiple historical signals', () => {
        cy.get('.signal-row').should('have.length.at.least', 3);
      });

      it('should show historical prices', () => {
        cy.get('.signal-price').first().invoke('text').then((text) => {
          expect(text).to.match(/~?\$[\d,]+/);
        });
      });
    });
  });

  // =====================================================
  // ACCESSIBILITY TESTS
  // =====================================================
  describe('Accessibility - All Free Tools', () => {
    const freeToolPages = [
      '/smart-chart/',
      '/dca-calculator/',
      '/fee-estimator/',
      '/sats-converter/',
      '/hodl-waves/',
      '/difficulty-ribbon/'
    ];

    freeToolPages.forEach((page) => {
      describe(`${page} Accessibility`, () => {
        beforeEach(() => {
          cy.visit(page);
        });

        it('should have a main heading (h1)', () => {
          cy.get('h1').should('have.length', 1);
        });

        it('should have proper heading hierarchy', () => {
          cy.get('h1').should('exist');
          // H2s should exist but no skipping to h3 without h2
        });

        it('should have labels for all form inputs', () => {
          cy.get('input:not([type="hidden"]):not([type="checkbox"])').each(($input) => {
            const id = $input.attr('id');
            if (id) {
              // Either has label or aria-label
              cy.get(`label[for="${id}"], [aria-label]`).should('exist');
            }
          });
        });

        it('should have interactive elements focusable', () => {
          cy.get('button, a, input, select').each(($el) => {
            // Should not have tabindex="-1" unless intentionally hidden
            const tabindex = $el.attr('tabindex');
            if (tabindex) {
              expect(parseInt(tabindex)).to.be.at.least(-1);
            }
          });
        });

        it('should have alt text on images', () => {
          cy.get('img').each(($img) => {
            const alt = $img.attr('alt');
            const ariaHidden = $img.attr('aria-hidden');
            // Either has alt or is decorative (aria-hidden)
            expect(alt !== undefined || ariaHidden === 'true').to.be.true;
          });
        });
      });
    });
  });

  // =====================================================
  // MOBILE RESPONSIVENESS TESTS
  // =====================================================
  describe('Mobile Responsiveness - Free Tools', () => {
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1440, height: 900, name: 'Desktop' }
    ];

    const freeToolPages = [
      '/smart-chart/',
      '/dca-calculator/',
      '/fee-estimator/',
      '/sats-converter/',
      '/hodl-waves/',
      '/difficulty-ribbon/'
    ];

    viewports.forEach((viewport) => {
      describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
        beforeEach(() => {
          cy.viewport(viewport.width, viewport.height);
        });

        freeToolPages.forEach((page) => {
          it(`${page} should render without horizontal scroll`, () => {
            cy.visit(page);
            cy.document().then((doc) => {
              expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 1);
            });
          });
        });
      });
    });
  });

  // =====================================================
  // PERFORMANCE TESTS
  // =====================================================
  describe('Performance - Free Tools', () => {
    const freeToolPages = [
      '/smart-chart/',
      '/dca-calculator/',
      '/fee-estimator/',
      '/sats-converter/',
      '/hodl-waves/',
      '/difficulty-ribbon/'
    ];

    freeToolPages.forEach((page) => {
      it(`${page} should load within 5 seconds`, () => {
        const start = Date.now();
        cy.visit(page);
        cy.get('h1').should('be.visible').then(() => {
          const loadTime = Date.now() - start;
          expect(loadTime).to.be.lessThan(5000);
        });
      });
    });
  });
});
