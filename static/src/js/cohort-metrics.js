// Cohort Metrics Dashboard Widget
// Phase 4: Cohort Analysis visualization

class CohortMetricsWidget {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = null;
    this.refreshInterval = 6 * 60 * 60 * 1000; // 6 hours
  }

  async init() {
    if (!this.container) {
      console.warn('Cohort metrics container not found');
      return;
    }

    await this.fetchData();
    this.render();

    // Auto-refresh every 6 hours
    setInterval(() => this.fetchData().then(() => this.render()), this.refreshInterval);
  }

  async fetchData() {
    try {
      // Try cached data first
      const cacheRes = await fetch('/data/cohort-metrics.json');
      if (cacheRes.ok) {
        this.data = await cacheRes.json();
        return;
      }

      // Fallback to live function
      const liveRes = await fetch('/.netlify/functions/cohort-metrics');
      if (liveRes.ok) {
        const result = await liveRes.json();
        if (result.success && result.data) {
          this.data = result.data;
        }
      }
    } catch (e) {
      console.error('Failed to fetch cohort metrics:', e);
    }
  }

  formatBTC(amount) {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(2) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toFixed(0);
  }

  formatPercent(pct) {
    const sign = pct >= 0 ? '+' : '';
    return sign + pct.toFixed(1) + '%';
  }

  getSignalColor(signal) {
    switch (signal) {
      case 'bullish': return '#22c55e';
      case 'bearish': return '#ef4444';
      case 'accumulating': return '#22c55e';
      case 'distributing': return '#ef4444';
      default: return '#eab308';
    }
  }

  getSignalEmoji(signal) {
    switch (signal) {
      case 'bullish': return '🟢';
      case 'bearish': return '🔴';
      case 'accumulating': return '🟢';
      case 'distributing': return '🔴';
      default: return '🟡';
    }
  }

  getTrendEmoji(trend) {
    switch (trend) {
      case 'accumulating': return '📈';
      case 'distributing': return '📉';
      default: return '➡️';
    }
  }

  render() {
    if (!this.container || !this.data) {
      if (this.container) {
        this.container.innerHTML = `
          <div class="cohort-metrics-loading">
            <p>Loading cohort metrics...</p>
          </div>
        `;
      }
      return;
    }

    const { holderCohorts, whaleCohorts, supplyLiquidity } = this.data;
    const lastUpdated = new Date(this.data.lastUpdated).toLocaleString();

    this.container.innerHTML = `
      <div class="cohort-metrics-header">
        <h3>👥 Holder Cohort Analysis</h3>
        <span class="last-updated">Updated: ${lastUpdated}</span>
      </div>

      <!-- LTH/STH Section -->
      <div class="cohort-section">
        <h4>📊 Long-term vs Short-term Holders</h4>
        <div class="cohort-grid">
          <!-- LTH Card -->
          <div class="cohort-card lth-card">
            <div class="cohort-card-header">
              <span class="cohort-card-title">Long-term Holders (>155d)</span>
              <span class="cohort-trend" style="color: ${this.getSignalColor(holderCohorts.lthSupply.trend)}">
                ${this.getTrendEmoji(holderCohorts.lthSupply.trend)} ${holderCohorts.lthSupply.trend}
              </span>
            </div>
            <div class="cohort-card-value">
              ${this.formatBTC(holderCohorts.lthSupply.btc)} BTC
            </div>
            <div class="cohort-card-percentage">
              ${holderCohorts.lthSupply.percentage.toFixed(1)}% of supply
            </div>
            <div class="cohort-card-change ${holderCohorts.lthSupply.change30d >= 0 ? 'positive' : 'negative'}">
              30d: ${this.formatPercent(holderCohorts.lthSupply.change30d)}
            </div>
            <div class="cohort-card-description">
              ${holderCohorts.lthSupply.description}
            </div>
          </div>

          <!-- STH Card -->
          <div class="cohort-card sth-card">
            <div class="cohort-card-header">
              <span class="cohort-card-title">Short-term Holders (<155d)</span>
              <span class="cohort-trend" style="color: ${this.getSignalColor(holderCohorts.sthSupply.trend)}">
                ${this.getTrendEmoji(holderCohorts.sthSupply.trend)} ${holderCohorts.sthSupply.trend}
              </span>
            </div>
            <div class="cohort-card-value">
              ${this.formatBTC(holderCohorts.sthSupply.btc)} BTC
            </div>
            <div class="cohort-card-percentage">
              ${holderCohorts.sthSupply.percentage.toFixed(1)}% of supply
            </div>
            <div class="cohort-card-change ${holderCohorts.sthSupply.change30d >= 0 ? 'positive' : 'negative'}">
              30d: ${this.formatPercent(holderCohorts.sthSupply.change30d)}
            </div>
            <div class="cohort-card-description">
              ${holderCohorts.sthSupply.description}
            </div>
          </div>

          <!-- LTH/STH Ratio Card -->
          <div class="cohort-card ratio-card">
            <div class="cohort-card-header">
              <span class="cohort-card-title">LTH/STH Ratio</span>
              <span class="cohort-signal" style="color: ${this.getSignalColor(holderCohorts.lthSthRatio.signal)}">
                ${this.getSignalEmoji(holderCohorts.lthSthRatio.signal)} ${holderCohorts.lthSthRatio.signal.toUpperCase()}
              </span>
            </div>
            <div class="cohort-card-value">
              ${holderCohorts.lthSthRatio.ratio.toFixed(2)}
            </div>
            <div class="cohort-card-description">
              ${holderCohorts.lthSthRatio.description}
            </div>
            <div class="ratio-bar">
              <div class="ratio-bar-lth" style="width: ${(holderCohorts.lthSupply.percentage)}%"></div>
              <div class="ratio-bar-sth" style="width: ${(holderCohorts.sthSupply.percentage)}%"></div>
            </div>
            <div class="ratio-labels">
              <span class="lth-label">LTH: ${holderCohorts.lthSupply.percentage.toFixed(1)}%</span>
              <span class="sth-label">STH: ${holderCohorts.sthSupply.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Supply Liquidity Section -->
      <div class="cohort-section">
        <h4>💧 Supply Liquidity</h4>
        <div class="cohort-grid">
          <!-- Illiquid Supply Card -->
          <div class="cohort-card liquidity-card">
            <div class="cohort-card-header">
              <span class="cohort-card-title">Illiquid Supply</span>
              <span class="cohort-signal" style="color: ${this.getSignalColor(supplyLiquidity.signal)}">
                ${this.getSignalEmoji(supplyLiquidity.signal)}
              </span>
            </div>
            <div class="cohort-card-value">
              ${this.formatBTC(supplyLiquidity.illiquidSupply.btc)} BTC
            </div>
            <div class="cohort-card-percentage">
              ${supplyLiquidity.illiquidSupply.percentage.toFixed(1)}% of supply
            </div>
            <div class="cohort-card-description small">
              ${supplyLiquidity.illiquidSupply.description}
            </div>
          </div>

          <!-- Liquid Supply Card -->
          <div class="cohort-card liquidity-card">
            <div class="cohort-card-header">
              <span class="cohort-card-title">Liquid Supply</span>
            </div>
            <div class="cohort-card-value">
              ${this.formatBTC(supplyLiquidity.liquidSupply.btc)} BTC
            </div>
            <div class="cohort-card-percentage">
              ${supplyLiquidity.liquidSupply.percentage.toFixed(1)}% of supply
            </div>
            <div class="cohort-card-description small">
              ${supplyLiquidity.liquidSupply.description}
            </div>
          </div>

          <!-- Highly Liquid Supply Card -->
          <div class="cohort-card liquidity-card">
            <div class="cohort-card-header">
              <span class="cohort-card-title">Highly Liquid</span>
            </div>
            <div class="cohort-card-value">
              ${this.formatBTC(supplyLiquidity.highlyLiquidSupply.btc)} BTC
            </div>
            <div class="cohort-card-percentage">
              ${supplyLiquidity.highlyLiquidSupply.percentage.toFixed(1)}% of supply
            </div>
            <div class="cohort-card-description small">
              ${supplyLiquidity.highlyLiquidSupply.description}
            </div>
          </div>
        </div>

        <!-- Liquidity Chart -->
        <div class="liquidity-chart">
          <div class="liquidity-bar">
            <div class="liquidity-segment illiquid" style="width: ${supplyLiquidity.illiquidSupply.percentage}%"
                 title="Illiquid: ${supplyLiquidity.illiquidSupply.percentage.toFixed(1)}%">
            </div>
            <div class="liquidity-segment liquid" style="width: ${supplyLiquidity.liquidSupply.percentage}%"
                 title="Liquid: ${supplyLiquidity.liquidSupply.percentage.toFixed(1)}%">
            </div>
            <div class="liquidity-segment highly-liquid" style="width: ${supplyLiquidity.highlyLiquidSupply.percentage}%"
                 title="Highly Liquid: ${supplyLiquidity.highlyLiquidSupply.percentage.toFixed(1)}%">
            </div>
          </div>
          <div class="liquidity-score">
            Liquidity Score: ${supplyLiquidity.liquidityScore}/100
          </div>
          <div class="liquidity-analysis">
            ${supplyLiquidity.analysis}
          </div>
        </div>
      </div>

      <!-- Whale Cohorts Section -->
      <div class="cohort-section">
        <h4>🐋 Whale Tier Distribution</h4>
        <div class="whale-table">
          <div class="whale-row header">
            <span>Tier</span>
            <span>Range</span>
            <span>Addresses</span>
            <span>BTC Held</span>
            <span>% of Supply</span>
            <span>Trend</span>
          </div>

          ${this.renderWhaleTier(whaleCohorts.humpback)}
          ${this.renderWhaleTier(whaleCohorts.whale)}
          ${this.renderWhaleTier(whaleCohorts.shark)}
          ${this.renderWhaleTier(whaleCohorts.fish)}
          ${this.renderWhaleTier(whaleCohorts.crab)}
          ${this.renderWhaleTier(whaleCohorts.shrimp)}
        </div>
        <div class="whale-summary">
          ${whaleCohorts.summary}
        </div>

        <!-- Whale Distribution Chart -->
        <div class="whale-distribution-chart">
          <div class="whale-dist-bar">
            ${this.renderWhaleSegment(whaleCohorts.humpback, '#9333ea')}
            ${this.renderWhaleSegment(whaleCohorts.whale, '#3b82f6')}
            ${this.renderWhaleSegment(whaleCohorts.shark, '#06b6d4')}
            ${this.renderWhaleSegment(whaleCohorts.fish, '#10b981')}
            ${this.renderWhaleSegment(whaleCohorts.crab, '#f59e0b')}
            ${this.renderWhaleSegment(whaleCohorts.shrimp, '#ef4444')}
          </div>
        </div>
      </div>
    `;
  }

  renderWhaleTier(tier) {
    const trendEmoji = this.getTrendEmoji(tier.trend);
    const trendColor = this.getSignalColor(tier.trend);

    return `
      <div class="whale-row">
        <span class="whale-name">${tier.name}</span>
        <span class="whale-range">${tier.range}</span>
        <span class="whale-addresses">${this.formatNumber(tier.addresses)}</span>
        <span class="whale-btc">${this.formatBTC(tier.btcHeld)} BTC</span>
        <span class="whale-percent">${tier.percentageOfSupply.toFixed(1)}%</span>
        <span class="whale-trend" style="color: ${trendColor}">
          ${trendEmoji} ${tier.trend}
        </span>
      </div>
    `;
  }

  renderWhaleSegment(tier, color) {
    return `
      <div class="whale-segment"
           style="width: ${tier.percentageOfSupply}%; background-color: ${color}"
           title="${tier.name}: ${tier.percentageOfSupply.toFixed(1)}%">
        <span class="segment-label">${tier.name}</span>
      </div>
    `;
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return num.toLocaleString();
  }
}

// Initialize widget on page load
document.addEventListener('DOMContentLoaded', () => {
  const cohortWidget = new CohortMetricsWidget('cohort-metrics-container');
  cohortWidget.init();
});
