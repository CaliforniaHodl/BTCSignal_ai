// Alpha Radar - AI Market Intelligence Dashboard
(function() {
  const FEATURE_KEY = 'alpha-radar-access';

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
      await Promise.all([
        loadMarketOverview(),
        loadWhaleActivity(),
        loadLiquidityZones(),
        loadAnomalies(),
        loadAISummary()
      ]);

      document.getElementById('last-scan').textContent = new Date().toLocaleTimeString();
    } catch (error) {
      console.error('Error loading radar data:', error);
    }
  }

  // Load market overview data
  async function loadMarketOverview() {
    try {
      // BTC Dominance from CoinGecko
      const globalRes = await fetch('https://api.coingecko.com/api/v3/global');
      const globalData = await globalRes.json();
      const btcDom = globalData.data.market_cap_percentage.btc.toFixed(1);

      document.getElementById('btc-dom').textContent = btcDom + '%';
      document.getElementById('btc-dom-change').textContent = btcDom > 55 ? 'BTC Season' : 'Alt Season brewing';
      document.getElementById('btc-dom-signal').innerHTML = btcDom > 55
        ? '<span class="signal bullish">Bullish for BTC</span>'
        : '<span class="signal neutral">Watch alts</span>';

      // Stablecoin supply (simplified)
      const stableSupply = (globalData.data.total_market_cap.usd / 1e12 * 0.08).toFixed(1);
      document.getElementById('stable-supply').textContent = '$' + stableSupply + 'T';
      document.getElementById('stable-change').textContent = 'Dry powder available';
      document.getElementById('stable-signal').innerHTML = '<span class="signal neutral">Watching inflows</span>';

      // Fear & Greed
      const fgRes = await fetch('https://api.alternative.me/fng/');
      const fgData = await fgRes.json();
      const fgValue = parseInt(fgData.data[0].value);
      const fgLabel = fgData.data[0].value_classification;

      document.getElementById('fear-greed').textContent = fgValue;
      document.getElementById('fear-greed-label').textContent = fgLabel;
      document.getElementById('fear-greed-fill').style.width = fgValue + '%';
      document.getElementById('fear-greed-fill').className = 'fear-greed-fill ' +
        (fgValue < 25 ? 'extreme-fear' : fgValue < 45 ? 'fear' : fgValue < 55 ? 'neutral' : fgValue < 75 ? 'greed' : 'extreme-greed');

      // Funding Rate from CoinGecko
      const fundingRes = await fetch('https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&limit=1');
      const fundingData = await fundingRes.json();
      const fundingRate = (parseFloat(fundingData[0].fundingRate) * 100).toFixed(4);

      document.getElementById('funding-rate').textContent = fundingRate + '%';
      document.getElementById('funding-bias').textContent = fundingRate > 0.01 ? 'Longs paying shorts' : fundingRate < -0.01 ? 'Shorts paying longs' : 'Neutral';
      document.getElementById('funding-signal').innerHTML = fundingRate > 0.05
        ? '<span class="signal bearish">Overheated longs</span>'
        : fundingRate < -0.01
          ? '<span class="signal bullish">Shorts squeezable</span>'
          : '<span class="signal neutral">Balanced</span>';

    } catch (error) {
      console.error('Market overview error:', error);
    }
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

  // Load liquidity zones
  async function loadLiquidityZones() {
    const container = document.getElementById('liquidity-zones');

    try {
      const priceRes = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
      const priceData = await priceRes.json();
      const currentPrice = parseFloat(priceData.data.amount);

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

    } catch (error) {
      container.innerHTML = '<p class="error">Failed to load liquidity zones</p>';
    }
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
