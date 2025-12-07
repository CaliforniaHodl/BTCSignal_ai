// Sats Converter
// Convert between BTC, Sats, and USD with stack tracking

(function() {
  'use strict';

  let btcPrice = 0;
  let stack = [];

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    await fetchBTCPrice();
    loadStack();
    setupEventListeners();
    updateFunStats();

    // Refresh price every 30 seconds
    setInterval(fetchBTCPrice, 30000);
  }

  async function fetchBTCPrice() {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      const data = await res.json();
      btcPrice = data.bitcoin.usd;
      document.getElementById('live-price').textContent = '$' + btcPrice.toLocaleString();
      updateStackSummary();
      updateFunStats();
    } catch (e) {
      console.error('Failed to fetch BTC price:', e);
    }
  }

  function setupEventListeners() {
    // Converter inputs
    document.getElementById('usd-input').addEventListener('input', function() {
      convertFromUSD(parseFloat(this.value) || 0);
    });

    document.getElementById('btc-input').addEventListener('input', function() {
      convertFromBTC(parseFloat(this.value) || 0);
    });

    document.getElementById('sats-input').addEventListener('input', function() {
      convertFromSats(parseInt(this.value) || 0);
    });

    // Stack tracker
    document.getElementById('add-purchase').addEventListener('click', addPurchase);

    // Set default purchase date to today
    document.getElementById('purchase-date').value = new Date().toISOString().split('T')[0];
  }

  function convertFromUSD(usd) {
    if (btcPrice <= 0) return;

    const btc = usd / btcPrice;
    const sats = Math.round(btc * 100000000);

    document.getElementById('btc-input').value = btc.toFixed(8);
    document.getElementById('sats-input').value = sats;
  }

  function convertFromBTC(btc) {
    if (btcPrice <= 0) return;

    const usd = btc * btcPrice;
    const sats = Math.round(btc * 100000000);

    document.getElementById('usd-input').value = usd.toFixed(2);
    document.getElementById('sats-input').value = sats;
  }

  function convertFromSats(sats) {
    if (btcPrice <= 0) return;

    const btc = sats / 100000000;
    const usd = btc * btcPrice;

    document.getElementById('usd-input').value = usd.toFixed(2);
    document.getElementById('btc-input').value = btc.toFixed(8);
  }

  // Stack Tracker Functions
  function loadStack() {
    const saved = localStorage.getItem('btcStack');
    if (saved) {
      stack = JSON.parse(saved);
      renderStack();
      updateStackSummary();
    }
  }

  function saveStack() {
    localStorage.setItem('btcStack', JSON.stringify(stack));
  }

  function addPurchase() {
    const date = document.getElementById('purchase-date').value;
    const sats = parseInt(document.getElementById('purchase-amount').value);
    const price = parseFloat(document.getElementById('purchase-price').value);

    if (!date || !sats || sats <= 0) {
      alert('Please enter a valid date and amount');
      return;
    }

    stack.push({
      id: Date.now(),
      date: date,
      sats: sats,
      price: price || btcPrice // Use current price if not specified
    });

    saveStack();
    renderStack();
    updateStackSummary();
    updateFunStats();

    // Clear inputs
    document.getElementById('purchase-amount').value = '';
    document.getElementById('purchase-price').value = '';
  }

  function deletePurchase(id) {
    stack = stack.filter(p => p.id !== id);
    saveStack();
    renderStack();
    updateStackSummary();
    updateFunStats();
  }

  function renderStack() {
    const list = document.getElementById('stack-list');

    if (stack.length === 0) {
      list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">No purchases yet. Start stacking!</p>';
      return;
    }

    // Sort by date descending
    const sorted = [...stack].sort((a, b) => new Date(b.date) - new Date(a.date));

    list.innerHTML = sorted.map(p => `
      <div class="stack-item">
        <span class="stack-date">${formatDate(p.date)}</span>
        <span class="stack-amount">${p.sats.toLocaleString()} sats</span>
        <span class="stack-price">@ $${p.price.toLocaleString()}</span>
        <button class="delete-btn" onclick="window.deletePurchase(${p.id})">✕</button>
      </div>
    `).join('');
  }

  // Expose delete function globally
  window.deletePurchase = deletePurchase;

  function updateStackSummary() {
    const totalSats = stack.reduce((sum, p) => sum + p.sats, 0);
    const totalInvested = stack.reduce((sum, p) => {
      const btcAtPurchase = p.sats / 100000000;
      return sum + (btcAtPurchase * p.price);
    }, 0);
    const currentValue = (totalSats / 100000000) * btcPrice;
    const pnl = currentValue - totalInvested;

    document.getElementById('total-stack').textContent = totalSats.toLocaleString() + ' sats';
    document.getElementById('total-invested').textContent = '$' + totalInvested.toFixed(2);
    document.getElementById('current-value').textContent = '$' + currentValue.toFixed(2);

    const pnlEl = document.getElementById('pnl');
    pnlEl.textContent = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
    pnlEl.classList.remove('positive', 'negative');
    pnlEl.classList.add(pnl >= 0 ? 'positive' : 'negative');
  }

  function updateFunStats() {
    const totalSats = stack.reduce((sum, p) => sum + p.sats, 0);
    const totalBTC = totalSats / 100000000;

    // Percent of 1 BTC
    const btcPercent = (totalBTC * 100).toFixed(4);
    document.getElementById('btc-percent').textContent = btcPercent + '%';

    // World rank (rough estimate based on BTC distribution)
    // ~1% of world owns any BTC, if you own >0.01 BTC you're in top 1%
    let worldRank = '--';
    if (totalBTC >= 1) {
      worldRank = 'Top 0.01';
    } else if (totalBTC >= 0.1) {
      worldRank = 'Top 0.1';
    } else if (totalBTC >= 0.01) {
      worldRank = 'Top 1';
    } else if (totalBTC >= 0.001) {
      worldRank = 'Top 5';
    } else if (totalBTC > 0) {
      worldRank = 'Top 10';
    }
    document.getElementById('world-rank').textContent = worldRank;

    // Days to 1 BTC
    if (stack.length > 0) {
      const oldestDate = new Date(Math.min(...stack.map(p => new Date(p.date))));
      const daysSoFar = Math.max(1, (Date.now() - oldestDate) / (1000 * 60 * 60 * 24));
      const satsPerDay = totalSats / daysSoFar;

      if (satsPerDay > 0) {
        const satsNeeded = 100000000 - totalSats;
        const daysToGo = Math.ceil(satsNeeded / satsPerDay);
        document.getElementById('days-to-coin').textContent = daysToGo > 0 ? daysToGo.toLocaleString() + ' days' : '🎉 Done!';
      } else {
        document.getElementById('days-to-coin').textContent = '∞ days';
      }
    } else {
      document.getElementById('days-to-coin').textContent = 'Start stacking!';
    }
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
})();
