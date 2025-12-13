// Exchange Flows Dashboard Widget
// Phase 2: Exchange Intelligence visualization

class ExchangeFlowsWidget {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = null;
    this.refreshInterval = 30 * 60 * 1000; // 30 minutes
  }

  async init() {
    if (!this.container) {
      console.warn('Exchange flows container not found');
      return;
    }

    await this.fetchData();
    this.render();

    // Auto-refresh
    setInterval(() => this.fetchData().then(() => this.render()), this.refreshInterval);
  }

  async fetchData() {
    try {
      // Try cached data first
      const cacheRes = await fetch('/data/exchange-flows.json');
      if (cacheRes.ok) {
        this.data = await cacheRes.json();
        return;
      }

      // Fallback to live function
      const liveRes = await fetch('/.netlify/functions/exchange-flows');
      if (liveRes.ok) {
        const result = await liveRes.json();
        if (result.success && result.data) {
          this.data = result.data;
        }
      }
    } catch (e) {
      console.error('Failed to fetch exchange flow data:', e);
    }
  }

  formatBTC(amount) {
    if (Math.abs(amount) >= 1000) {
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
      default: return '#eab308';
    }
  }

  getSignalEmoji(signal) {
    switch (signal) {
      case 'bullish': return '🟢';
      case 'bearish': return '🔴';
      default: return '🟡';
    }
  }

  render() {
    if (!this.container || !this.data) {
      if (this.container) {
        this.container.innerHTML = `
          <div class="exchange-flows-loading">
            <p>Loading exchange flow data...</p>
          </div>
        `;
      }
      return;
    }

    const { flows, reserves, fundFlowRatio, signals } = this.data;
    const lastUpdated = new Date(this.data.lastUpdated).toLocaleString();

    this.container.innerHTML = `
      <div class="exchange-flows-header">
        <h3>🏦 Exchange Flows</h3>
        <span class="last-updated">Updated: ${lastUpdated}</span>
      </div>

      <div class="exchange-flows-grid">
        <!-- Netflow Card -->
        <div class="flow-card netflow-card">
          <div class="flow-card-header">
            <span class="flow-card-title">24h Netflow</span>
            <span class="flow-signal" style="color: ${this.getSignalColor(flows.flowSignal)}">
              ${this.getSignalEmoji(flows.flowSignal)} ${flows.flowSignal.toUpperCase()}
            </span>
          </div>
          <div class="flow-card-value ${flows.netflow24h >= 0 ? 'negative' : 'positive'}">
            ${flows.netflow24h >= 0 ? '+' : ''}${this.formatBTC(flows.netflow24h)} BTC
          </div>
          <div class="flow-card-subtext">
            ${flows.netflow24h < 0 ? 'Net outflow (bullish)' : flows.netflow24h > 0 ? 'Net inflow (bearish)' : 'Balanced'}
          </div>
          <div class="flow-bar-container">
            <div class="flow-bar inflow" style="width: ${(flows.inflow24h / (flows.inflow24h + flows.outflow24h || 1)) * 100}%"></div>
            <div class="flow-bar outflow" style="width: ${(flows.outflow24h / (flows.inflow24h + flows.outflow24h || 1)) * 100}%"></div>
          </div>
          <div class="flow-bar-labels">
            <span class="inflow-label">📥 In: ${this.formatBTC(flows.inflow24h)}</span>
            <span class="outflow-label">📤 Out: ${this.formatBTC(flows.outflow24h)}</span>
          </div>
        </div>

        <!-- Whale Ratio Card -->
        <div class="flow-card whale-card">
          <div class="flow-card-header">
            <span class="flow-card-title">Whale Ratio</span>
            <span class="flow-card-icon">🐋</span>
          </div>
          <div class="flow-card-value">
            ${(flows.whaleRatio * 100).toFixed(0)}%
          </div>
          <div class="flow-card-subtext">
            Top 10 txs / Total volume
          </div>
          <div class="whale-meter">
            <div class="whale-meter-fill" style="width: ${flows.whaleRatio * 100}%"></div>
          </div>
          <div class="whale-interpretation">
            ${flows.whaleRatio > 0.8 ? '⚠️ High whale dominance' :
              flows.whaleRatio > 0.5 ? '📊 Moderate whale activity' :
              '✅ Diverse market activity'}
          </div>
        </div>

        <!-- Fund Flow Ratio Card -->
        <div class="flow-card ffr-card">
          <div class="flow-card-header">
            <span class="flow-card-title">Fund Flow Ratio</span>
            <span class="flow-card-icon">📊</span>
          </div>
          <div class="flow-card-value">
            ${(fundFlowRatio.ratio * 100).toFixed(1)}%
          </div>
          <div class="flow-card-subtext">
            Exchange vol / On-chain vol
          </div>
          <div class="ffr-interpretation">
            ${fundFlowRatio.interpretation}
          </div>
        </div>

        <!-- Signal Factors Card -->
        <div class="flow-card signals-card">
          <div class="flow-card-header">
            <span class="flow-card-title">Signal Factors</span>
            <span class="flow-signal" style="color: ${this.getSignalColor(signals.signal)}">
              ${signals.signal.toUpperCase()}
            </span>
          </div>
          <div class="signal-weight">
            Weight: ${(signals.weight * 100).toFixed(0)}%
          </div>
          <ul class="signal-factors-list">
            ${signals.factors.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
      </div>

      <!-- Per-Exchange Breakdown -->
      ${flows.exchanges.length > 0 ? `
        <div class="exchange-breakdown">
          <h4>Per-Exchange Activity</h4>
          <div class="exchange-table">
            <div class="exchange-row header">
              <span>Exchange</span>
              <span>Inflow</span>
              <span>Outflow</span>
              <span>Net</span>
              <span>Trend</span>
            </div>
            ${flows.exchanges.slice(0, 5).map(ex => `
              <div class="exchange-row">
                <span class="exchange-name">${ex.name}</span>
                <span class="exchange-inflow">${this.formatBTC(ex.inflow24h)}</span>
                <span class="exchange-outflow">${this.formatBTC(ex.outflow24h)}</span>
                <span class="exchange-net ${ex.netflow < 0 ? 'positive' : ex.netflow > 0 ? 'negative' : ''}">
                  ${ex.netflow >= 0 ? '+' : ''}${this.formatBTC(ex.netflow)}
                </span>
                <span class="exchange-trend trend-${ex.trend}">
                  ${ex.trend === 'accumulation' ? '🟢' : ex.trend === 'distribution' ? '🔴' : '🟡'}
                  ${ex.trend}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Exchange Reserves Estimates -->
      ${reserves && reserves.length > 0 ? `
        <div class="reserves-section">
          <h4>Estimated Reserves (Top Exchanges)</h4>
          <div class="reserves-grid">
            ${reserves.slice(0, 4).map(r => `
              <div class="reserve-item">
                <span class="reserve-name">${r.exchange}</span>
                <span class="reserve-btc">${(r.estimatedBTC / 1000).toFixed(0)}K BTC</span>
                <span class="reserve-change ${r.change24h < 0 ? 'positive' : r.change24h > 0 ? 'negative' : ''}">
                  ${this.formatPercent(r.change24h)}
                </span>
              </div>
            `).join('')}
          </div>
          <p class="reserves-disclaimer">* Estimates based on tracked whale transactions</p>
        </div>
      ` : ''}

      <div class="exchange-flows-footer">
        <span>📊 Data: Mempool.space whale tracking</span>
        <span class="signal-strength">Strength: ${flows.flowStrength}%</span>
      </div>
    `;
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const widget = new ExchangeFlowsWidget('exchange-flows-section');
  widget.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExchangeFlowsWidget };
}
