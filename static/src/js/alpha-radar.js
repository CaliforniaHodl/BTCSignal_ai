// Alpha Radar - AI Market Intelligence Dashboard
// Uses pre-fetched static snapshot for market data
(function() {
  const FEATURE_KEY = 'alpha-radar-access';

  // Market snapshot data
  let marketData = null;

  // Load static market snapshot
  async function loadMarketSnapshot() {
    try {
      const res = await fetch('/data/market-snapshot.json');
      if (res.ok) {
        marketData = await res.json();
        console.log('Alpha Radar: Market snapshot loaded:', marketData.timestamp);
      }
    } catch (e) {
      console.error('Alpha Radar: Failed to load market snapshot:', e);
    }
  }

  // Check if user has access
  function checkAccess() {
    // Check admin mode first (bypasses all paywalls)
    if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.isAdmin()) {
      return true;
    }
    // Check all-access subscription
    if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.hasAllAccess()) {
      return true;
    }
    // Legacy localStorage check
    const access = localStorage.getItem(FEATURE_KEY);
    return access === 'unlocked';
  }

  // Show/hide content based on access
  function updateUI() {
    const gate = document.getElementById('premium-gate');
    const content = document.getElementById('premium-content');

    if (checkAccess()) {
      if (gate) gate.style.display = 'none';
      if (content) {
        content.style.display = 'block';
        loadRadarData();
      }
    } else {
      if (gate) gate.style.display = 'flex';
      if (content) content.style.display = 'none';
    }
  }

  // Unlock button handler
  const unlockBtn = document.getElementById('btn-unlock');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', async function() {
      // For now, simulate payment - integrate with LNbits
      // Payment confirmation handled by Toast.confirm
      Toast.confirm('This will cost 50 sats via Lightning. Continue?', function() {
        // Simulated payment success
        unlockFeature();
      });
      return; // Exit early, callback handles the rest
      const confirmed = true; // Placeholder for callback flow
      if (confirmed) {
        // TODO: Integrate actual Lightning payment
        localStorage.setItem(FEATURE_KEY, 'unlocked');
        updateUI();
      }
    });
  }

  // Check access link
  const checkAccessLink = document.getElementById('check-access');
  if (checkAccessLink) {
    checkAccessLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (checkAccess()) {
        updateUI();
      } else {
        Toast.warning('No active access found. Please unlock to continue.');
      }
    });
  }

  // Refresh button
  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadRadarData);
  }

  // Load all radar data
  async function loadRadarData() {
    document.getElementById('last-scan').textContent = 'Scanning...';

    try {
      // Load static snapshot first
      await loadMarketSnapshot();

      await Promise.all([
        loadMarketOverview(),
        loadWhaleData(),
        loadLiquidityZones(),
        loadAnomalies(),
        loadAISummary()
      ]);

      document.getElementById('last-scan').textContent = new Date().toLocaleTimeString();
    } catch (error) {
      console.error('Error loading radar data:', error);
    }
  }

  // Load market overview data from static snapshot
  function loadMarketOverview() {
    // BTC Dominance
    const btcDom = marketData && marketData.dominance ? marketData.dominance.btc.toFixed(1) : '--';
    const btcDomEl = document.getElementById('btc-dom');
    const btcDomChangeEl = document.getElementById('btc-dom-change');
    const btcDomSignalEl = document.getElementById('btc-dom-signal');

    if (btcDomEl) btcDomEl.textContent = btcDom + '%';
    if (btcDomChangeEl) btcDomChangeEl.textContent = btcDom > 55 ? 'BTC Season' : 'Alt Season brewing';
    if (btcDomSignalEl) btcDomSignalEl.innerHTML = btcDom > 55
      ? '<span class="signal bullish">Bullish for BTC</span>'
      : '<span class="signal neutral">Watch alts</span>';

    // Stablecoin supply (estimated from global market cap)
    const totalMcap = marketData && marketData.global ? marketData.global.totalMarketCap : 0;
    const stableSupply = (totalMcap / 1e12 * 0.08).toFixed(1);
    const stableSupplyEl = document.getElementById('stable-supply');
    const stableChangeEl = document.getElementById('stable-change');
    const stableSignalEl = document.getElementById('stable-signal');

    if (stableSupplyEl) stableSupplyEl.textContent = '$' + stableSupply + 'T';
    if (stableChangeEl) stableChangeEl.textContent = 'Dry powder available';
    if (stableSignalEl) stableSignalEl.innerHTML = '<span class="signal neutral">Watching inflows</span>';

    // Fear & Greed from snapshot
    const fgValue = marketData && marketData.fearGreed ? marketData.fearGreed.value : 50;
    const fgLabel = marketData && marketData.fearGreed ? marketData.fearGreed.label : 'Neutral';
    const fearGreedEl = document.getElementById('fear-greed');
    const fearGreedLabelEl = document.getElementById('fear-greed-label');
    const fearGreedFillEl = document.getElementById('fear-greed-fill');

    if (fearGreedEl) fearGreedEl.textContent = fgValue;
    if (fearGreedLabelEl) fearGreedLabelEl.textContent = fgLabel;
    if (fearGreedFillEl) {
      fearGreedFillEl.style.width = fgValue + '%';
      fearGreedFillEl.className = 'fear-greed-fill ' +
        (fgValue < 25 ? 'extreme-fear' : fgValue < 45 ? 'fear' : fgValue < 55 ? 'neutral' : fgValue < 75 ? 'greed' : 'extreme-greed');
    }

    // Funding Rate from snapshot
    const fundingRate = marketData && marketData.funding ? marketData.funding.ratePercent.toFixed(4) : '0.0000';
    const fundingRateEl = document.getElementById('funding-rate');
    const fundingBiasEl = document.getElementById('funding-bias');
    const fundingSignalEl = document.getElementById('funding-signal');

    if (fundingRateEl) fundingRateEl.textContent = fundingRate + '%';
    if (fundingBiasEl) fundingBiasEl.textContent = fundingRate > 0.01 ? 'Longs paying shorts' : fundingRate < -0.01 ? 'Shorts paying longs' : 'Neutral';
    if (fundingSignalEl) fundingSignalEl.innerHTML = fundingRate > 0.05
      ? '<span class="signal bearish">Overheated longs</span>'
      : fundingRate < -0.01
        ? '<span class="signal bullish">Shorts squeezable</span>'
        : '<span class="signal neutral">Balanced</span>';
  }

  // Load whale data from whale-alerts.json
  async function loadWhaleData() {
    const container = document.getElementById('whale-alerts-list');
    const dataSourceEl = document.getElementById('whale-data-source');

    try {
      // Load from our whale-alerts.json data
      const res = await fetch('/data/whale-alerts.json');
      let data = null;
      let isLive = false;

      if (res.ok) {
        data = await res.json();
      }

      const alerts = data?.alerts || [];
      const stats = data?.stats || null;

      // Update data source indicator
      if (dataSourceEl) {
        if (alerts.length > 0) {
          const lastUpdated = data?.lastUpdated ? new Date(data.lastUpdated) : null;
          const isRecent = lastUpdated && (Date.now() - lastUpdated.getTime() < 30 * 60 * 1000);
          dataSourceEl.textContent = isRecent ? '🟢 LIVE' : '🔵 TRACKED';
          dataSourceEl.title = lastUpdated ? `Last updated: ${lastUpdated.toLocaleString()}` : 'Whale tracker data';
        } else {
          dataSourceEl.textContent = '';
        }
      }

      // Update stats cards
      updateWhaleStats(stats, alerts);

      // If no alerts from static file, fetch live from mempool as fallback
      if (alerts.length === 0 && container) {
        const liveAlerts = await fetchLiveWhaleData();
        if (liveAlerts.length > 0) {
          isLive = true;
          if (dataSourceEl) {
            dataSourceEl.textContent = '🟢 LIVE';
            dataSourceEl.title = 'Live data from mempool.space';
          }
          updateWhaleStats(null, liveAlerts);
          renderWhaleAlerts(liveAlerts, container, true);
          return;
        }
        container.innerHTML = '<p class="no-alerts">Scanning for whale movements... Data accumulates as the tracker runs.</p>';
        return;
      }

      if (container) {
        renderWhaleAlerts(alerts, container, isLive);
      }

    } catch (error) {
      console.error('Error loading whale data:', error);
      if (container) {
        container.innerHTML = '<p class="error">Failed to load whale data. Will retry on refresh.</p>';
      }
    }
  }

  // Update whale stats from data
  function updateWhaleStats(stats, alerts) {
    const alertCountEl = document.getElementById('whale-alert-count');
    const alertCountSignalEl = document.getElementById('alert-count-signal');
    const inflowEl = document.getElementById('exchange-inflow');
    const inflowSignalEl = document.getElementById('inflow-signal');
    const outflowEl = document.getElementById('exchange-outflow');
    const outflowSignalEl = document.getElementById('outflow-signal');
    const largestTxEl = document.getElementById('largest-tx');
    const largestTxSignalEl = document.getElementById('largest-tx-signal');

    // Alert count
    const alertCount = alerts.length;
    if (alertCountEl) alertCountEl.textContent = alertCount;
    if (alertCountSignalEl) {
      alertCountSignalEl.textContent = alertCount > 10
        ? 'High whale activity!'
        : alertCount > 5
          ? 'Moderate activity'
          : alertCount > 0
            ? 'Normal activity'
            : 'Quiet period';
    }

    // Use stats from JSON if available, otherwise calculate from alerts
    if (stats) {
      if (inflowEl) inflowEl.textContent = stats.exchangeInflow24h.toLocaleString();
      if (inflowSignalEl) {
        inflowSignalEl.textContent = stats.exchangeInflow24h > 1000
          ? 'Sell pressure detected'
          : stats.exchangeInflow24h > 0
            ? 'Normal inflows'
            : 'No inflows tracked';
      }

      if (outflowEl) outflowEl.textContent = stats.exchangeOutflow24h.toLocaleString();
      if (outflowSignalEl) {
        outflowSignalEl.textContent = stats.exchangeOutflow24h > 1000
          ? 'Accumulation signal'
          : stats.exchangeOutflow24h > 0
            ? 'Normal outflows'
            : 'No outflows tracked';
      }

      if (largestTxEl) largestTxEl.textContent = stats.largestTx24h.toLocaleString();
      if (largestTxSignalEl) {
        largestTxSignalEl.textContent = stats.largestTx24h > 5000
          ? 'Major whale movement!'
          : stats.largestTx24h > 1000
            ? 'Significant transfer'
            : 'Standard activity';
      }
    } else {
      // Calculate from alerts
      const deposits = alerts.filter(a => a.type === 'exchange_deposit').reduce((s, a) => s + a.amount_btc, 0);
      const withdrawals = alerts.filter(a => a.type === 'exchange_withdrawal').reduce((s, a) => s + a.amount_btc, 0);
      const largest = alerts.length > 0 ? Math.max(...alerts.map(a => a.amount_btc)) : 0;

      if (inflowEl) inflowEl.textContent = Math.round(deposits).toLocaleString();
      if (inflowSignalEl) inflowSignalEl.textContent = deposits > 1000 ? 'Sell pressure' : deposits > 0 ? 'Normal' : '--';

      if (outflowEl) outflowEl.textContent = Math.round(withdrawals).toLocaleString();
      if (outflowSignalEl) outflowSignalEl.textContent = withdrawals > 1000 ? 'Accumulation' : withdrawals > 0 ? 'Normal' : '--';

      if (largestTxEl) largestTxEl.textContent = Math.round(largest).toLocaleString();
      if (largestTxSignalEl) largestTxSignalEl.textContent = largest > 1000 ? 'Major movement' : largest > 0 ? 'Standard' : '--';
    }
  }

  // Fetch live whale data directly from mempool.space as fallback
  async function fetchLiveWhaleData() {
    const alerts = [];

    try {
      // Get BTC price first
      const priceRes = await fetch('https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT');
      const priceData = await priceRes.json();
      const btcPrice = parseFloat(priceData.price) || 95000;

      // Check recent blocks for large txs
      const blocksRes = await fetch('https://mempool.space/api/blocks');
      if (blocksRes.ok) {
        const blocks = await blocksRes.json();
        for (const block of blocks.slice(0, 2)) {
          const blockTxsRes = await fetch(`https://mempool.space/api/block/${block.id}/txs/0`);
          if (blockTxsRes.ok) {
            const blockTxs = await blockTxsRes.json();
            for (const txData of blockTxs.slice(1, 20)) {
              const totalValue = txData.vout?.reduce((sum, out) => sum + (out.value || 0), 0) || 0;
              const amountBTC = totalValue / 100000000;

              if (amountBTC >= 500 && alerts.length < 10) {
                alerts.push({
                  id: `block_${txData.txid.substring(0, 12)}`,
                  timestamp: new Date(block.timestamp * 1000).toISOString(),
                  txid: txData.txid,
                  type: 'whale_transfer',
                  amount_btc: Math.round(amountBTC * 100) / 100,
                  amount_usd: Math.round(amountBTC * btcPrice),
                  confidence: amountBTC >= 1000 ? 'high' : 'medium',
                  from_type: 'Unknown',
                  to_type: 'Unknown',
                  analysis: `${amountBTC.toFixed(2)} BTC confirmed in block ${block.height}.`
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Live fetch error:', e);
    }
    return alerts.sort((a, b) => b.amount_btc - a.amount_btc);
  }

  // Render whale alerts to container
  function renderWhaleAlerts(alerts, container, isLive) {
    if (!alerts || alerts.length === 0) {
      container.innerHTML = '<p class="no-alerts">No whale movements detected.</p>';
      return;
    }

    // Add live indicator if showing live data
    const liveIndicator = isLive ? '<span class="live-badge">LIVE</span>' : '';

    // Render alerts (show top 5 on alpha radar, link to full page)
    container.innerHTML = liveIndicator + alerts.slice(0, 5).map(alert => {
      const timeAgo = getTimeAgo(new Date(alert.timestamp));
      const typeIcon = {
        'exchange_deposit': '📥',
        'exchange_withdrawal': '📤',
        'whale_transfer': '🔄',
        'dormant_wallet': '💤'
      }[alert.type] || '🐋';

      const typeLabel = {
        'exchange_deposit': 'Exchange Deposit',
        'exchange_withdrawal': 'Exchange Withdrawal',
        'whale_transfer': 'Whale Transfer',
        'dormant_wallet': 'Dormant Wallet'
      }[alert.type] || 'Unknown';

      const confidenceClass = {
        'high': 'confidence-high',
        'medium': 'confidence-medium',
        'low': 'confidence-low'
      }[alert.confidence] || '';

      return `
        <div class="whale-alert-item ${alert.type}">
          <div class="alert-header">
            <span class="alert-type">${typeIcon} ${typeLabel}</span>
            <span class="alert-confidence ${confidenceClass}">${alert.confidence.toUpperCase()}</span>
          </div>
          <div class="alert-amount">
            <span class="btc-amount">${alert.amount_btc.toLocaleString()} BTC</span>
            <span class="usd-amount">$${(alert.amount_usd / 1000000).toFixed(1)}M</span>
          </div>
          <div class="alert-flow">
            <span class="from">${alert.from_type}</span>
            <span class="arrow">→</span>
            <span class="to">${alert.to_type}</span>
          </div>
          <div class="alert-analysis">${alert.analysis}</div>
          <div class="alert-footer">
            <span class="alert-time">${timeAgo}</span>
            <a href="https://mempool.space/tx/${alert.txid}" target="_blank" class="tx-link">View TX →</a>
          </div>
        </div>
      `;
    }).join('');
  }

  // Helper: get time ago string
  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // Load liquidity zones from static snapshot
  function loadLiquidityZones() {
    const container = document.getElementById('liquidity-zones');
    if (!container) return;

    const currentPrice = marketData && marketData.btc ? marketData.btc.price : 0;

    if (!currentPrice) {
      container.innerHTML = '<p class="error">Price data unavailable</p>';
      return;
    }

    // Calculate key levels
    const zones = [
      { price: Math.round(currentPrice * 1.05 / 1000) * 1000, type: 'resistance', strength: 'Strong', note: 'Previous swing high area' },
      { price: Math.round(currentPrice * 1.02 / 500) * 500, type: 'resistance', strength: 'Moderate', note: 'Short-term liquidity' },
      { price: Math.round(currentPrice * 0.98 / 500) * 500, type: 'support', strength: 'Moderate', note: 'Short-term liquidity' },
      { price: Math.round(currentPrice * 0.95 / 1000) * 1000, type: 'support', strength: 'Strong', note: 'Previous swing low area' }
    ];

    container.innerHTML = zones.map(zone => `
      <div class="zone-card ${zone.type}">
        <div class="zone-header">
          <span class="zone-type">${zone.type === 'resistance' ? '🔴 Resistance' : '🟢 Support'}</span>
          <span class="zone-strength">${zone.strength}</span>
        </div>
        <div class="zone-price">$${zone.price.toLocaleString()}</div>
        <div class="zone-distance">${((zone.price - currentPrice) / currentPrice * 100).toFixed(1)}% from current</div>
        <div class="zone-note">${zone.note}</div>
      </div>
    `).join('');
  }

  // Load anomalies - derived from whale data and market snapshot
  async function loadAnomalies() {
    const container = document.getElementById('anomaly-list');
    if (!container) return;

    const anomalies = [];

    try {
      // Load whale alerts data
      const whaleRes = await fetch('/data/whale-alerts.json');
      let whaleData = null;
      if (whaleRes.ok) {
        whaleData = await whaleRes.json();
      }

      const alerts = whaleData?.alerts || [];
      const stats = whaleData?.stats || {};

      // Check for dormant wallet activity (high severity)
      const dormantAlerts = alerts.filter(a => a.type === 'dormant_wallet');
      if (dormantAlerts.length > 0) {
        const largest = dormantAlerts.reduce((max, a) => a.amount_btc > max.amount_btc ? a : max, dormantAlerts[0]);
        anomalies.push({
          severity: 'high',
          title: 'Dormant Wallet Active',
          desc: `${largest.amount_btc.toLocaleString()} BTC moved from dormant wallet`,
          time: getTimeAgo(new Date(largest.timestamp))
        });
      }

      // Check for large exchange deposits (potential sell pressure)
      const deposits = alerts.filter(a => a.type === 'exchange_deposit');
      const totalDeposits = deposits.reduce((sum, a) => sum + a.amount_btc, 0);
      if (totalDeposits > 1000) {
        anomalies.push({
          severity: totalDeposits > 5000 ? 'high' : 'medium',
          title: 'Exchange Inflow Spike',
          desc: `${Math.round(totalDeposits).toLocaleString()} BTC deposited to exchanges`,
          time: deposits.length > 0 ? getTimeAgo(new Date(deposits[0].timestamp)) : 'Recent'
        });
      }

      // Check for large exchange withdrawals (accumulation signal)
      const withdrawals = alerts.filter(a => a.type === 'exchange_withdrawal');
      const totalWithdrawals = withdrawals.reduce((sum, a) => sum + a.amount_btc, 0);
      if (totalWithdrawals > 1000) {
        anomalies.push({
          severity: 'low',
          title: 'Accumulation Signal',
          desc: `${Math.round(totalWithdrawals).toLocaleString()} BTC withdrawn from exchanges`,
          time: withdrawals.length > 0 ? getTimeAgo(new Date(withdrawals[0].timestamp)) : 'Recent'
        });
      }

      // Check for very large single transactions
      const megaWhales = alerts.filter(a => a.amount_btc >= 5000);
      if (megaWhales.length > 0) {
        const largest = megaWhales.reduce((max, a) => a.amount_btc > max.amount_btc ? a : max, megaWhales[0]);
        anomalies.push({
          severity: 'high',
          title: 'Mega Whale Movement',
          desc: `${largest.amount_btc.toLocaleString()} BTC ($${(largest.amount_usd / 1000000).toFixed(0)}M) transferred`,
          time: getTimeAgo(new Date(largest.timestamp))
        });
      }

      // Check funding rate from market snapshot
      if (marketData && marketData.funding) {
        const rate = marketData.funding.ratePercent;
        if (rate > 0.05) {
          anomalies.push({
            severity: 'medium',
            title: 'High Funding Rate',
            desc: `Funding at ${rate.toFixed(4)}% - longs paying premium`,
            time: 'Current'
          });
        } else if (rate < -0.02) {
          anomalies.push({
            severity: 'medium',
            title: 'Negative Funding',
            desc: `Funding at ${rate.toFixed(4)}% - shorts paying longs`,
            time: 'Current'
          });
        }
      }

      // Check fear & greed extremes
      if (marketData && marketData.fearGreed) {
        const fg = marketData.fearGreed.value;
        if (fg <= 20) {
          anomalies.push({
            severity: 'medium',
            title: 'Extreme Fear',
            desc: `Fear & Greed at ${fg} - historically a buying opportunity`,
            time: 'Current'
          });
        } else if (fg >= 80) {
          anomalies.push({
            severity: 'medium',
            title: 'Extreme Greed',
            desc: `Fear & Greed at ${fg} - caution advised`,
            time: 'Current'
          });
        }
      }

    } catch (error) {
      console.error('Error loading anomalies:', error);
    }

    // Render anomalies
    if (anomalies.length === 0) {
      container.innerHTML = '<p class="no-anomalies">No significant anomalies detected</p>';
    } else {
      // Sort by severity (high first)
      const severityOrder = { high: 0, medium: 1, low: 2 };
      anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      container.innerHTML = anomalies.slice(0, 5).map(a => `
        <div class="anomaly-item ${a.severity}">
          <div class="anomaly-severity">${a.severity === 'high' ? '🔴' : a.severity === 'medium' ? '🟡' : '🟢'}</div>
          <div class="anomaly-content">
            <div class="anomaly-title">${a.title}</div>
            <div class="anomaly-desc">${a.desc}</div>
          </div>
          <div class="anomaly-time">${a.time}</div>
        </div>
      `).join('');
    }
  }

  // Load AI summary
  async function loadAISummary() {
    const container = document.getElementById('ai-summary');
    const timeEl = document.getElementById('summary-time');

    try {
      const res = await fetch('/.netlify/functions/alpha-radar-summary');
      const data = await res.json();

      container.innerHTML = `<p>${data.summary}</p>`;
      timeEl.textContent = 'Generated: ' + new Date().toLocaleTimeString();

      // Check for alerts
      if (data.alert) {
        const alertBanner = document.getElementById('alert-banner');
        const alertText = document.getElementById('alert-text');
        alertBanner.style.display = 'flex';
        alertText.textContent = data.alert;
      }
    } catch (error) {
      container.innerHTML = '<p>Market sentiment is currently neutral. BTC dominance remains stable, suggesting the market is in a consolidation phase. Watch for breakout signals above key resistance or breakdown below support levels.</p>';
      timeEl.textContent = 'Generated: ' + new Date().toLocaleTimeString();
    }
  }

  // Initialize
  updateUI();
})();
