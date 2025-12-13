/**
 * Advanced Derivatives Dashboard Widget
 * Displays multi-exchange aggregated derivatives metrics
 */

(function () {
  'use strict';

  const FUNCTION_URL = '/.netlify/functions/derivatives-advanced';
  const CACHE_URL = 'https://raw.githubusercontent.com/jbarnes850/BTCSignal_ai/main/data/derivatives-advanced.json';
  const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour

  let derivativesData = null;

  /**
   * Initialize the derivatives advanced widget
   */
  async function init() {
    console.log('Initializing advanced derivatives widget...');
    await loadData();
    renderWidget();
    setInterval(loadData, REFRESH_INTERVAL);
  }

  /**
   * Load derivatives data (try function first, fallback to cache)
   */
  async function loadData() {
    try {
      // Try Netlify function first
      const response = await fetch(FUNCTION_URL);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          derivativesData = result.data;
          console.log('Loaded derivatives data from function');
          renderWidget();
          return;
        }
      }
    } catch (error) {
      console.log('Failed to load from function, trying cache...', error.message);
    }

    // Fallback to GitHub cache
    try {
      const response = await fetch(CACHE_URL + '?t=' + Date.now());
      if (response.ok) {
        derivativesData = await response.json();
        console.log('Loaded derivatives data from cache');
        renderWidget();
      }
    } catch (error) {
      console.error('Failed to load derivatives data:', error);
    }
  }

  /**
   * Render the complete widget
   */
  function renderWidget() {
    if (!derivativesData) return;

    renderFundingRateGauge();
    renderLongShortRatio();
    renderLiquidations();
    renderOIDelta();
    renderMaxPain();
    renderImpliedVolatility();
    renderOverallSentiment();
  }

  /**
   * Render funding rate gauge with trend arrow
   */
  function renderFundingRateGauge() {
    const container = document.getElementById('deriv-funding-gauge');
    if (!container) return;

    const fr = derivativesData.fundingRate;
    const frAnalysis = derivativesData.fundingRateAnalysis;
    const ratePercent = (fr.weightedAverage * 100).toFixed(4);
    const annualized = (fr.weightedAverage * 3 * 365 * 100).toFixed(2);

    const trendArrow = fr.trend === 'rising' ? '↑' : fr.trend === 'falling' ? '↓' : '→';
    const signalColor = frAnalysis.signal === 'bullish' ? '#10b981' : frAnalysis.signal === 'bearish' ? '#ef4444' : '#6b7280';

    container.innerHTML = `
      <div class="deriv-adv-card">
        <div class="deriv-adv-header">
          <h4>Funding Rate <span class="trend-arrow">${trendArrow}</span></h4>
          <span class="signal-badge" style="background: ${signalColor}">${frAnalysis.signal.toUpperCase()}</span>
        </div>
        <div class="deriv-adv-value">${ratePercent}%</div>
        <div class="deriv-adv-sublabel">Annualized: ${annualized}%</div>
        <div class="deriv-adv-gauge">
          <div class="gauge-fill" style="width: ${Math.min(100, Math.abs(fr.weightedAverage) * 5000)}%; background: ${signalColor}"></div>
        </div>
        <div class="deriv-adv-description">${frAnalysis.reasoning}</div>
        <div class="deriv-adv-exchanges">
          ${fr.exchanges.map(e => `
            <div class="exchange-item">
              <span class="exchange-name">${e.exchange}</span>
              <span class="exchange-value">${(e.rate * 100).toFixed(4)}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render long/short ratio bar
   */
  function renderLongShortRatio() {
    const container = document.getElementById('deriv-ls-ratio');
    if (!container) return;

    const ls = derivativesData.longShortRatio;
    const signalColor = ls.signal === 'bullish' ? '#10b981' : ls.signal === 'bearish' ? '#ef4444' : '#6b7280';

    container.innerHTML = `
      <div class="deriv-adv-card">
        <div class="deriv-adv-header">
          <h4>Long/Short Ratio</h4>
          <span class="signal-badge" style="background: ${signalColor}">${ls.signal.toUpperCase()}</span>
        </div>
        <div class="deriv-adv-value">${ls.weightedRatio.toFixed(2)}</div>
        <div class="deriv-adv-sublabel">Aggregate from ${ls.exchanges.length} exchanges</div>
        <div class="ls-ratio-bar">
          <div class="ls-bar-long" style="width: ${ls.averageLongPercent}%">
            <span class="bar-label">${ls.averageLongPercent.toFixed(1)}% Long</span>
          </div>
          <div class="ls-bar-short" style="width: ${ls.averageShortPercent}%">
            <span class="bar-label">${ls.averageShortPercent.toFixed(1)}% Short</span>
          </div>
        </div>
        <div class="deriv-adv-exchanges">
          ${ls.exchanges.map(e => `
            <div class="exchange-item">
              <span class="exchange-name">${e.exchange}</span>
              <span class="exchange-value">${e.ratio.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render 24h liquidations breakdown
   */
  function renderLiquidations() {
    const container = document.getElementById('deriv-liquidations');
    if (!container) return;

    const liq = derivativesData.liquidations;
    const totalLiq = liq.totalLongLiquidations + liq.totalShortLiquidations;
    const longPct = totalLiq > 0 ? (liq.totalLongLiquidations / totalLiq) * 100 : 50;
    const shortPct = totalLiq > 0 ? (liq.totalShortLiquidations / totalLiq) * 100 : 50;

    const signalColor = liq.signal === 'bullish' ? '#10b981' : liq.signal === 'bearish' ? '#ef4444' : '#6b7280';

    container.innerHTML = `
      <div class="deriv-adv-card">
        <div class="deriv-adv-header">
          <h4>24h Liquidations</h4>
          <span class="signal-badge" style="background: ${signalColor}">${liq.signal.toUpperCase()}</span>
        </div>
        <div class="deriv-adv-value">$${(totalLiq / 1e6).toFixed(2)}M</div>
        <div class="deriv-adv-sublabel">Net: $${(liq.netLiquidations / 1e6).toFixed(2)}M</div>
        <div class="liq-breakdown">
          <div class="liq-bar">
            <div class="liq-bar-long" style="width: ${longPct}%">
              <span class="bar-label">Long ${longPct.toFixed(1)}%</span>
            </div>
            <div class="liq-bar-short" style="width: ${shortPct}%">
              <span class="bar-label">Short ${shortPct.toFixed(1)}%</span>
            </div>
          </div>
          <div class="liq-values">
            <div class="liq-value-item">
              <span class="liq-label">Long Liq:</span>
              <span class="liq-amount red">$${(liq.totalLongLiquidations / 1e6).toFixed(2)}M</span>
            </div>
            <div class="liq-value-item">
              <span class="liq-label">Short Liq:</span>
              <span class="liq-amount green">$${(liq.totalShortLiquidations / 1e6).toFixed(2)}M</span>
            </div>
          </div>
        </div>
        ${liq.largeLiquidations.length > 0 ? `
          <div class="large-liqs">
            <div class="large-liqs-header">Large Liquidations (>$1M)</div>
            ${liq.largeLiquidations.slice(0, 3).map(l => `
              <div class="large-liq-item">
                <span class="liq-side ${l.side}">${l.side.toUpperCase()}</span>
                <span class="liq-price">$${l.price.toLocaleString()}</span>
                <span class="liq-value">$${(l.value / 1e6).toFixed(2)}M</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render OI delta indicator
   */
  function renderOIDelta() {
    const container = document.getElementById('deriv-oi-delta');
    if (!container) return;

    const oi = derivativesData.openInterest;
    const oiAnalysis = derivativesData.oiDeltaAnalysis;
    const signalColor = oiAnalysis.signal === 'bullish' ? '#10b981' : oiAnalysis.signal === 'bearish' ? '#ef4444' : '#6b7280';

    const patternEmoji = {
      'bullish_trend': '📈',
      'bearish_trend': '📉',
      'bull_trap': '⚠️',
      'bear_trap': '⚠️',
      'neutral': '➡️'
    };

    container.innerHTML = `
      <div class="deriv-adv-card">
        <div class="deriv-adv-header">
          <h4>Open Interest Delta</h4>
          <span class="signal-badge" style="background: ${signalColor}">${oiAnalysis.signal.toUpperCase()}</span>
        </div>
        <div class="deriv-adv-value">$${(oi.totalUSD / 1e9).toFixed(2)}B</div>
        <div class="deriv-adv-sublabel">
          ${oiAnalysis.deltaPercent > 0 ? '+' : ''}${oiAnalysis.deltaPercent.toFixed(2)}% (24h)
        </div>
        <div class="oi-pattern">
          <span class="pattern-emoji">${patternEmoji[oiAnalysis.pattern]}</span>
          <span class="pattern-name">${oiAnalysis.pattern.replace(/_/g, ' ').toUpperCase()}</span>
        </div>
        <div class="deriv-adv-description">${oiAnalysis.reasoning}</div>
        <div class="oi-details">
          <div class="oi-detail-item">
            <span class="detail-label">Total BTC:</span>
            <span class="detail-value">${oi.totalBTC.toLocaleString()} BTC</span>
          </div>
          <div class="oi-detail-item">
            <span class="detail-label">24h Change:</span>
            <span class="detail-value ${oiAnalysis.delta > 0 ? 'green' : 'red'}">
              ${oiAnalysis.delta > 0 ? '+' : ''}$${(oiAnalysis.delta / 1e6).toFixed(2)}M
            </span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render max pain calculation
   */
  function renderMaxPain() {
    const container = document.getElementById('deriv-max-pain');
    if (!container) return;

    const maxPain = derivativesData.maxPain;
    if (!maxPain) {
      container.innerHTML = `
        <div class="deriv-adv-card">
          <div class="deriv-adv-header">
            <h4>Max Pain</h4>
          </div>
          <div class="deriv-adv-empty">No options data available</div>
        </div>
      `;
      return;
    }

    const signalColor = maxPain.signal === 'bullish' ? '#10b981' : maxPain.signal === 'bearish' ? '#ef4444' : '#6b7280';

    container.innerHTML = `
      <div class="deriv-adv-card">
        <div class="deriv-adv-header">
          <h4>Max Pain</h4>
          <span class="signal-badge" style="background: ${signalColor}">${maxPain.signal.toUpperCase()}</span>
        </div>
        <div class="deriv-adv-value">$${maxPain.maxPainPrice.toLocaleString()}</div>
        <div class="deriv-adv-sublabel">Current: $${maxPain.currentPrice.toLocaleString()}</div>
        <div class="max-pain-deviation">
          <span class="deviation-label">Deviation:</span>
          <span class="deviation-value ${maxPain.deviation > 0 ? 'green' : 'red'}">
            ${maxPain.deviation > 0 ? '+' : ''}${maxPain.deviationPercent.toFixed(2)}%
          </span>
        </div>
        <div class="max-pain-oi">
          <div class="oi-item">
            <span class="oi-label">Call OI:</span>
            <span class="oi-value">${maxPain.callOI.toLocaleString()} BTC</span>
          </div>
          <div class="oi-item">
            <span class="oi-label">Put OI:</span>
            <span class="oi-value">${maxPain.putOI.toLocaleString()} BTC</span>
          </div>
          <div class="oi-item">
            <span class="oi-label">P/C Ratio:</span>
            <span class="oi-value">${(maxPain.putOI / maxPain.callOI).toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render implied volatility gauge
   */
  function renderImpliedVolatility() {
    const container = document.getElementById('deriv-iv');
    if (!container) return;

    const iv = derivativesData.impliedVolatility;
    if (!iv) {
      container.innerHTML = `
        <div class="deriv-adv-card">
          <div class="deriv-adv-header">
            <h4>Implied Volatility</h4>
          </div>
          <div class="deriv-adv-empty">No IV data available</div>
        </div>
      `;
      return;
    }

    const levelColors = {
      'very_low': '#10b981',
      'low': '#22c55e',
      'normal': '#6b7280',
      'high': '#f59e0b',
      'very_high': '#ef4444'
    };

    const signalText = {
      'expect_calm': 'Expect Calm Market',
      'expect_movement': 'Expect Big Move',
      'neutral': 'Neutral'
    };

    container.innerHTML = `
      <div class="deriv-adv-card">
        <div class="deriv-adv-header">
          <h4>Implied Volatility</h4>
          <span class="signal-badge" style="background: ${levelColors[iv.level]}">${iv.level.replace(/_/g, ' ').toUpperCase()}</span>
        </div>
        <div class="deriv-adv-value">${iv.ivIndex.toFixed(1)}%</div>
        <div class="deriv-adv-sublabel">${signalText[iv.signal]}</div>
        <div class="iv-gauge">
          <div class="gauge-track">
            <div class="gauge-fill" style="width: ${Math.min(100, iv.ivIndex)}%; background: ${levelColors[iv.level]}"></div>
          </div>
          <div class="gauge-labels">
            <span>Low</span>
            <span>Normal</span>
            <span>High</span>
          </div>
        </div>
        <div class="iv-details">
          <div class="iv-detail-item">
            <span class="detail-label">ATM IV:</span>
            <span class="detail-value">${iv.atmIV.toFixed(1)}%</span>
          </div>
          <div class="iv-detail-item">
            <span class="detail-label">IV Rank:</span>
            <span class="detail-value">${iv.ivRank.toFixed(0)}/100</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render overall derivatives sentiment
   */
  function renderOverallSentiment() {
    const container = document.getElementById('deriv-overall-sentiment');
    if (!container) return;

    const sentiment = derivativesData.overallSentiment;
    const confidence = (derivativesData.confidenceScore * 100).toFixed(0);

    const sentimentColors = {
      'bullish': '#10b981',
      'bearish': '#ef4444',
      'neutral': '#6b7280'
    };

    const sentimentEmojis = {
      'bullish': '🚀',
      'bearish': '🐻',
      'neutral': '😐'
    };

    container.innerHTML = `
      <div class="deriv-adv-card deriv-sentiment-card">
        <div class="deriv-adv-header">
          <h4>Overall Derivatives Sentiment</h4>
        </div>
        <div class="sentiment-main">
          <span class="sentiment-emoji">${sentimentEmojis[sentiment]}</span>
          <div class="sentiment-info">
            <div class="sentiment-value" style="color: ${sentimentColors[sentiment]}">
              ${sentiment.toUpperCase()}
            </div>
            <div class="sentiment-confidence">Confidence: ${confidence}%</div>
          </div>
        </div>
        <div class="sentiment-breakdown">
          <div class="sentiment-factor">
            <span class="factor-icon">💰</span>
            <span class="factor-label">Funding:</span>
            <span class="factor-signal ${derivativesData.fundingRateAnalysis.signal}">
              ${derivativesData.fundingRateAnalysis.signal}
            </span>
          </div>
          <div class="sentiment-factor">
            <span class="factor-icon">📊</span>
            <span class="factor-label">OI Delta:</span>
            <span class="factor-signal ${derivativesData.oiDeltaAnalysis.signal}">
              ${derivativesData.oiDeltaAnalysis.signal}
            </span>
          </div>
          <div class="sentiment-factor">
            <span class="factor-icon">⚖️</span>
            <span class="factor-label">L/S Ratio:</span>
            <span class="factor-signal ${derivativesData.longShortRatio.signal}">
              ${derivativesData.longShortRatio.signal}
            </span>
          </div>
          <div class="sentiment-factor">
            <span class="factor-icon">🔥</span>
            <span class="factor-label">Liquidations:</span>
            <span class="factor-signal ${derivativesData.liquidations.signal}">
              ${derivativesData.liquidations.signal}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
