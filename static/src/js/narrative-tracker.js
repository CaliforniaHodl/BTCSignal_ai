// BTC Narrative Tracker - Real-time Bitcoin fundamentals
(function() {
  // Next halving estimated block and date
  // Halving occurs every 210,000 blocks
  // Last halving: Block 840,000 (April 2024)
  // Next halving: Block 1,050,000 (estimated April 2028)
  const NEXT_HALVING_BLOCK = 1050000;
  const HALVING_ESTIMATE = new Date('2028-04-15T00:00:00Z');

  // Initialize all trackers
  function init() {
    updateHalvingCountdown();
    loadHashRate();
    loadMarketData();

    // Update countdown every minute
    setInterval(updateHalvingCountdown, 60000);
    // Update other data every 5 minutes
    setInterval(loadHashRate, 300000);
    setInterval(loadMarketData, 300000);
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

  // Load hash rate from blockchain.info API
  async function loadHashRate() {
    try {
      // Using blockchain.info API for hash rate
      const res = await fetch('https://api.blockchain.info/stats');
      const data = await res.json();

      // Hash rate is in TH/s, convert to EH/s
      const hashRateEH = (data.hash_rate / 1000000).toFixed(0);

      const hashEl = document.getElementById('hash-rate');
      const changeEl = document.getElementById('hash-change');

      if (hashEl) hashEl.textContent = hashRateEH;
      if (changeEl) changeEl.textContent = 'Network secured by miners worldwide';
    } catch (e) {
      console.error('Hash rate error:', e);
      // Fallback to estimated value
      const hashEl = document.getElementById('hash-rate');
      const changeEl = document.getElementById('hash-change');
      if (hashEl) hashEl.textContent = '750';
      if (changeEl) changeEl.textContent = 'Estimated hash rate';
    }
  }

  // Load market data from CoinGecko (free, no API key)
  async function loadMarketData() {
    try {
      // Fetch both Bitcoin-specific data and global data
      const [btcRes, globalRes] = await Promise.all([
        fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false'),
        fetch('https://api.coingecko.com/api/v3/global')
      ]);
      const btcData = await btcRes.json();
      const globalData = await globalRes.json();

      // Bitcoin market cap in trillions (not total crypto market cap)
      const btcMcapTrillion = (btcData.market_data.market_cap.usd / 1e12).toFixed(2);
      const btcDominance = globalData.data.market_cap_percentage.btc.toFixed(1);

      const mcapEl = document.getElementById('market-cap');
      const domEl = document.getElementById('btc-dominance');

      if (mcapEl) mcapEl.textContent = '$' + btcMcapTrillion;
      if (domEl) domEl.textContent = btcDominance;
    } catch (e) {
      console.error('Market data error:', e);
      const mcapEl = document.getElementById('market-cap');
      const domEl = document.getElementById('btc-dominance');
      if (mcapEl) mcapEl.textContent = '$1.9';
      if (domEl) domEl.textContent = '55';
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
