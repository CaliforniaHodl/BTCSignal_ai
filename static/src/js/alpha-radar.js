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
        loadWhaleActivity(),
        loadWhaleAlerts(),
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

  // Load whale activity data from Blockchain.com API (free)
  async function loadWhaleActivity() {
    let inflow = 0, outflow = 0, largeTxns = 0;
    let dataSource = 'estimated';

    try {
      // Fetch recent unconfirmed transactions from mempool
      const res = await fetch('https://blockchain.info/unconfirmed-transactions?format=json&cors=true');
      
      if (res.ok) {
        const data = await res.json();
        dataSource = 'live';

        // Process transactions - look for large ones (> 1 BTC = 100M satoshis)
        const WHALE_THRESHOLD = 100000000; // 1 BTC in satoshis
        const LARGE_THRESHOLD = 1000000000; // 10 BTC in satoshis

        if (data.txs && data.txs.length > 0) {
          // Known exchange addresses (partial list - major exchanges)
          const exchangePatterns = ['1NDyJ', 'bc1qg', '3Kzh9', '1Kr6Q', 'bc1qa', '3LYJf'];

          data.txs.forEach(tx => {
            const totalOutput = tx.out.reduce((sum, o) => sum + (o.value || 0), 0);

            if (totalOutput >= WHALE_THRESHOLD) {
              largeTxns++;

              // Check if likely exchange transaction (heuristic)
              const hasExchangeAddr = tx.out.some(o => 
                o.addr && exchangePatterns.some(p => o.addr.startsWith(p))
              );
              const hasMultipleOutputs = tx.out.length > 5;

              // Exchange deposits typically have few outputs, withdrawals have many
              if (hasExchangeAddr || hasMultipleOutputs) {
                if (tx.out.length <= 3) {
                  inflow += totalOutput / 100000000; // Convert to BTC
                } else {
                  outflow += totalOutput / 100000000;
                }
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Blockchain.info API error:', error);
    }

    // Fallback/supplement with CoinGecko estimation
    if (inflow === 0 && outflow === 0) {
      dataSource = 'estimated';
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false');
        const data = await res.json();
        const volume24h = data.market_data.total_volume.usd;
        const priceChange = data.market_data.price_change_percentage_24h;
        const currentPrice = data.market_data.current_price.usd;

        // Estimate whale activity based on volume and price action
        const volumeBTC = volume24h / currentPrice;
        const baseFlow = Math.round(volumeBTC / 10000); // ~0.01% of daily volume

        if (priceChange < -2) {
          inflow = baseFlow + Math.round(Math.abs(priceChange) * 20);
          outflow = Math.round(baseFlow * 0.7);
        } else if (priceChange > 2) {
          inflow = Math.round(baseFlow * 0.7);
          outflow = baseFlow + Math.round(priceChange * 20);
        } else {
          inflow = baseFlow + Math.round(Math.random() * 200);
          outflow = baseFlow + Math.round(Math.random() * 200);
        }

        largeTxns = Math.round(15 + (volumeBTC / 100000) + Math.random() * 10);
      } catch (e) {
        inflow = 1500 + Math.round(Math.random() * 500);
        outflow = 1500 + Math.round(Math.random() * 500);
        largeTxns = 20 + Math.round(Math.random() * 15);
      }
    }

    const netFlow = inflow - outflow;

    // Update UI
    document.getElementById('exchange-inflow').textContent = Math.round(inflow).toLocaleString();
    document.getElementById('inflow-signal').textContent = inflow > 3000 ? 'Above average - watch for sells' : 'Normal range';

    document.getElementById('exchange-outflow').textContent = Math.round(outflow).toLocaleString();
    document.getElementById('outflow-signal').textContent = outflow > 3000 ? 'Accumulation signal' : 'Normal range';

    document.getElementById('net-flow').textContent = (netFlow > 0 ? '+' : '') + Math.round(netFlow).toLocaleString();
    document.getElementById('net-flow').className = 'metric-value ' + (netFlow > 0 ? 'negative' : 'positive');
    document.getElementById('netflow-signal').textContent = netFlow > 1000 ? 'Sell pressure building' : netFlow < -1000 ? 'Accumulation mode' : 'Neutral flow';

    document.getElementById('large-txns').textContent = largeTxns;
    document.getElementById('txn-signal').textContent = largeTxns > 30 ? 'High whale activity' : 'Normal activity';

    // Show data source indicator
    const whaleSection = document.querySelector('.whale-activity-section');
    if (whaleSection) {
      let badge = whaleSection.querySelector('.data-source-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'data-source-badge';
        const header = whaleSection.querySelector('h3') || whaleSection.querySelector('.section-title');
        if (header) header.appendChild(badge);
      }
      badge.textContent = dataSource === 'live' ? ' 🟢 LIVE' : ' 🔵 EST';
      badge.title = dataSource === 'live'
        ? 'Live mempool data from Blockchain.info'
        : 'Estimated from CoinGecko market data';
    }
  }

  // Load whale alerts from static JSON or fetch live from mempool
  async function loadWhaleAlerts() {
    const container = document.getElementById('whale-alerts-list');
    if (!container) return;

    try {
      // Try to load from static file first
      const res = await fetch('/data/whale-alerts.json');
      let data = null;

      if (res.ok) {
        data = await res.json();
      }

      const alerts = data?.alerts || [];

      // If no alerts from static file, fetch live from mempool as fallback
      if (alerts.length === 0) {
        const liveAlerts = await fetchLiveWhaleData();
        if (liveAlerts.length > 0) {
          renderWhaleAlerts(liveAlerts, container, true);
          return;
        }
        container.innerHTML = '<p class="no-alerts">Scanning mempool for whale movements... Data will accumulate as the tracker runs every 5 minutes.</p>';
        return;
      }

      renderWhaleAlerts(alerts, container, false);

    } catch (error) {
      console.error('Error loading whale alerts:', error);
      // Try live fallback on error
      try {
        const liveAlerts = await fetchLiveWhaleData();
        if (liveAlerts.length > 0) {
          renderWhaleAlerts(liveAlerts, container, true);
          return;
        }
      } catch (e) {
        console.error('Live fallback also failed:', e);
      }
      container.innerHTML = '<p class="error">Failed to load whale alerts. Will retry on next refresh.</p>';
    }
  }

  // Fetch live whale data directly from mempool.space
  async function fetchLiveWhaleData() {
    const alerts = [];

    try {
      // Get BTC price first
      const priceRes = await fetch('https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT');
      const priceData = await priceRes.json();
      const btcPrice = parseFloat(priceData.price) || 95000;

      // Get recent mempool transactions
      const mempoolRes = await fetch('https://mempool.space/api/mempool/recent');
      if (!mempoolRes.ok) return alerts;

      const recentTxs = await mempoolRes.json();

      // Filter for large transactions (500+ BTC for live display)
      const largeTxs = recentTxs.filter(tx => tx.value > 50000000000); // 500 BTC in sats

      // Get details for top 5 large txs
      for (const tx of largeTxs.slice(0, 5)) {
        try {
          const txRes = await fetch(`https://mempool.space/api/tx/${tx.txid}`);
          if (!txRes.ok) continue;

          const txData = await txRes.json();
          const totalValue = txData.vout?.reduce((sum, out) => sum + (out.value || 0), 0) || 0;
          const amountBTC = totalValue / 100000000;

          if (amountBTC >= 500) {
            alerts.push({
              id: `live_${tx.txid.substring(0, 12)}`,
              timestamp: new Date().toISOString(),
              txid: tx.txid,
              type: 'whale_transfer',
              amount_btc: Math.round(amountBTC * 100) / 100,
              amount_usd: Math.round(amountBTC * btcPrice),
              confidence: amountBTC >= 1000 ? 'high' : amountBTC >= 500 ? 'medium' : 'low',
              from_type: 'Unknown',
              to_type: 'Unknown',
              analysis: `${amountBTC.toFixed(2)} BTC movement detected in mempool. Live data - full analysis available after cron processing.`
            });
          }
        } catch (e) {
          console.error('Failed to fetch tx details:', e);
        }
      }

      // Also check recent blocks if mempool is quiet
      if (alerts.length < 3) {
        const blocksRes = await fetch('https://mempool.space/api/blocks');
        if (blocksRes.ok) {
          const blocks = await blocksRes.json();
          if (blocks.length > 0) {
            const blockTxsRes = await fetch(`https://mempool.space/api/block/${blocks[0].id}/txs/0`);
            if (blockTxsRes.ok) {
              const blockTxs = await blockTxsRes.json();
              for (const txData of blockTxs.slice(1, 20)) { // Skip coinbase
                const totalValue = txData.vout?.reduce((sum, out) => sum + (out.value || 0), 0) || 0;
                const amountBTC = totalValue / 100000000;

                if (amountBTC >= 100 && alerts.length < 5) {
                  alerts.push({
                    id: `block_${txData.txid.substring(0, 12)}`,
                    timestamp: new Date(blocks[0].timestamp * 1000).toISOString(),
                    txid: txData.txid,
                    type: 'whale_transfer',
                    amount_btc: Math.round(amountBTC * 100) / 100,
                    amount_usd: Math.round(amountBTC * btcPrice),
                    confidence: amountBTC >= 1000 ? 'high' : amountBTC >= 500 ? 'medium' : 'low',
                    from_type: 'Unknown',
                    to_type: 'Unknown',
                    analysis: `${amountBTC.toFixed(2)} BTC confirmed in block ${blocks[0].height}. Live data from recent block.`
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching live whale data:', error);
    }

    return alerts.sort((a, b) => b.amount_btc - a.amount_btc);
  }

  // Render whale alerts to container
  function renderWhaleAlerts(alerts, container, isLive) {
    if (!alerts || alerts.length === 0) {
      container.innerHTML = '<p class="no-alerts">No whale movements detected.</p>';
      return;
    }

    // Update stats in whale activity section
    const largeTxnsEl = document.getElementById('large-txns');
    const txnSignalEl = document.getElementById('txn-signal');
    if (largeTxnsEl) largeTxnsEl.textContent = alerts.length;
    if (txnSignalEl) {
      txnSignalEl.textContent = alerts.length > 5
        ? 'High whale activity!'
        : alerts.length > 0
          ? 'Normal whale activity'
          : 'Low activity';
    }

    // Add live indicator if showing live data
    const liveIndicator = isLive ? '<span class="live-badge">LIVE</span>' : '';

    // Render alerts
    container.innerHTML = liveIndicator + alerts.slice(0, 10).map(alert => {
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

  // Load anomalies
  async function loadAnomalies() {
    const container = document.getElementById('anomaly-list');

    // Simulated anomalies
    const anomalies = [
      { severity: 'medium', title: 'Funding Rate Spike', desc: 'Funding rate increased 3x in last 4 hours', time: '2h ago' },
      { severity: 'low', title: 'Volume Divergence', desc: 'Price up but volume declining on 4H', time: '4h ago' },
      { severity: 'high', title: 'Whale Wallet Active', desc: 'Dormant whale moved 500 BTC to exchange', time: '1h ago' }
    ];

    if (anomalies.length === 0) {
      container.innerHTML = '<p class="no-anomalies">No significant anomalies detected</p>';
    } else {
      container.innerHTML = anomalies.map(a => `
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
