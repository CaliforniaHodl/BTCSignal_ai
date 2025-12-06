// BTC Narrative Tracker - Bitcoin fundamentals
// Uses pre-fetched static snapshot for market data
(function() {
  // Market snapshot data
  let marketData = null;

  // Load static market snapshot
  async function loadMarketSnapshot() {
    try {
      const res = await fetch('/data/market-snapshot.json');
      if (res.ok) {
        marketData = await res.json();
        console.log('Narrative: Market snapshot loaded:', marketData.timestamp);
      }
    } catch (e) {
      console.error('Narrative: Failed to load market snapshot:', e);
    }
  }

  // Next halving estimated block and date
  // Halving occurs every 210,000 blocks
  // Last halving: Block 840,000 (April 2024)
  // Next halving: Block 1,050,000 (estimated April 2028)
  const NEXT_HALVING_BLOCK = 1050000;
  const HALVING_ESTIMATE = new Date('2028-04-15T00:00:00Z');

  // Initialize all trackers
  async function init() {
    await loadMarketSnapshot();

    updateHalvingCountdown();
    loadHashRate();
    loadMarketData();

    // Update countdown every minute (local calculation, no API)
    setInterval(updateHalvingCountdown, 60000);
  }

  // Halving countdown
  function updateHalvingCountdown() {
    const now = new Date();
    const diff = HALVING_ESTIMATE - now;

    if (diff <= 0) {
      document.getElementById('halving-days').textContent = '0';
      document.getElementById('halving-hours').textContent = '0';
      document.getElementById('halving-mins').textContent = '0';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const daysEl = document.getElementById('halving-days');
    const hoursEl = document.getElementById('halving-hours');
    const minsEl = document.getElementById('halving-mins');

    if (daysEl) daysEl.textContent = days.toLocaleString();
    if (hoursEl) hoursEl.textContent = hours;
    if (minsEl) minsEl.textContent = mins;
  }

  // Display hash rate from static snapshot
  function loadHashRate() {
    const hashEl = document.getElementById('hash-rate');
    const changeEl = document.getElementById('hash-change');

    if (!marketData || !marketData.hashrate) {
      if (hashEl) hashEl.textContent = '--';
      if (changeEl) changeEl.textContent = 'Loading...';
      return;
    }

    // Hash rate is already in EH/s in snapshot
    const hashRateEH = marketData.hashrate.current.toFixed(0);

    if (hashEl) hashEl.textContent = hashRateEH;
    if (changeEl) changeEl.textContent = 'Network secured by miners worldwide';
  }

  // Display market data - with live fallback
  async function loadMarketData() {
    const mcapEl = document.getElementById('market-cap');
    const domEl = document.getElementById('btc-dominance');

    let btcMcap = marketData?.btc?.marketCap;
    let btcDom = marketData?.dominance?.btc;

    // Fallback: fetch live data if snapshot is empty
    if (!btcMcap || btcMcap === 0) {
      try {
        const [coinRes, globalRes] = await Promise.all([
          fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false'),
          fetch('https://api.coingecko.com/api/v3/global')
        ]);
        const coinData = await coinRes.json();
        const globalData = await globalRes.json();

        btcMcap = coinData.market_data?.market_cap?.usd;
        btcDom = globalData.data?.market_cap_percentage?.btc;
      } catch (e) {
        console.error('Market data fetch error:', e);
      }
    }

    // Bitcoin market cap in trillions
    if (btcMcap) {
      const btcMcapTrillion = (btcMcap / 1e12).toFixed(2);
      if (mcapEl) mcapEl.textContent = '$' + btcMcapTrillion;
    } else {
      if (mcapEl) mcapEl.textContent = '--';
    }

    // BTC Dominance
    if (btcDom) {
      if (domEl) domEl.textContent = btcDom.toFixed(1);
    } else {
      if (domEl) domEl.textContent = '--';
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
