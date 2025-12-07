// Bitcoin Fee Estimator
// Real-time mempool analysis using mempool.space API

(function() {
  'use strict';

  let chart = null;
  let btcPrice = 0;

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    await Promise.all([
      fetchBTCPrice(),
      fetchFeeData(),
      fetchMempoolStats()
    ]);

    setupEventListeners();

    // Refresh every 30 seconds
    setInterval(async () => {
      await fetchFeeData();
      await fetchMempoolStats();
    }, 30000);
  }

  async function fetchBTCPrice() {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      const data = await res.json();
      btcPrice = data.bitcoin.usd;
    } catch (e) {
      console.error('Failed to fetch BTC price:', e);
      btcPrice = 100000; // Fallback
    }
  }

  async function fetchFeeData() {
    try {
      const res = await fetch('https://mempool.space/api/v1/fees/recommended');
      const data = await res.json();

      updateFeeDisplay(data);
      updateCalculator(data);
      updateRecommendation(data);
      updateLastUpdated();

      // Fetch fee history for chart
      await fetchFeeHistory();

    } catch (e) {
      console.error('Failed to fetch fee data:', e);
      displayError();
    }
  }

  async function fetchMempoolStats() {
    try {
      const res = await fetch('https://mempool.space/api/mempool');
      const data = await res.json();

      // Convert vsize to MB
      const sizeInMB = (data.vsize / 1000000).toFixed(2);
      document.getElementById('mempool-size').textContent = sizeInMB + ' MB';
      document.getElementById('pending-txs').textContent = data.count.toLocaleString();

      // Total fees in BTC
      const feesInBTC = (data.total_fee / 100000000).toFixed(4);
      document.getElementById('total-fees').textContent = feesInBTC + ' BTC';

    } catch (e) {
      console.error('Failed to fetch mempool stats:', e);
    }
  }

  async function fetchFeeHistory() {
    try {
      // Fetch blocks for fee history
      const res = await fetch('https://mempool.space/api/v1/blocks');
      const blocks = await res.json();

      // Extract fee data from recent blocks
      const labels = [];
      const feeData = [];

      blocks.slice(0, 24).reverse().forEach(block => {
        const time = new Date(block.timestamp * 1000);
        labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));

        // Calculate median fee from block
        const medianFee = block.extras ? block.extras.medianFee : block.medianFee || 10;
        feeData.push(medianFee);
      });

      drawChart(labels, feeData);

    } catch (e) {
      console.error('Failed to fetch fee history:', e);
    }
  }

  function updateFeeDisplay(data) {
    // Update fee values
    document.getElementById('fee-fastest').textContent = data.fastestFee;
    document.getElementById('fee-medium').textContent = data.halfHourFee;
    document.getElementById('fee-slow').textContent = data.hourFee;

    // Calculate costs for typical 250 vB transaction
    const typicalSize = 250;
    const costFastest = calculateCost(data.fastestFee, typicalSize);
    const costMedium = calculateCost(data.halfHourFee, typicalSize);
    const costSlow = calculateCost(data.hourFee, typicalSize);

    document.getElementById('cost-fastest').textContent = costFastest;
    document.getElementById('cost-medium').textContent = costMedium;
    document.getElementById('cost-slow').textContent = costSlow;
  }

  function calculateCost(feeRate, txSize) {
    const sats = feeRate * txSize;
    const usd = (sats / 100000000) * btcPrice;

    if (usd < 0.01) {
      return `${sats.toLocaleString()} sats (<$0.01)`;
    }
    return `${sats.toLocaleString()} sats (~$${usd.toFixed(2)})`;
  }

  function updateCalculator(data) {
    const txSize = parseInt(document.getElementById('tx-size').value) || 250;
    const typicalSize = 250;

    // Typical TX cost (fastest fee)
    const typicalCost = calculateCost(data.fastestFee, typicalSize);
    document.getElementById('calc-typical').textContent = typicalCost;

    // Custom TX cost
    const customCost = calculateCost(data.fastestFee, txSize);
    document.getElementById('calc-custom').textContent = customCost;
  }

  function updateRecommendation(data) {
    const recTitle = document.getElementById('rec-title');
    const recDesc = document.getElementById('rec-desc');
    const recIcon = document.querySelector('.rec-icon');

    const avgFee = (data.fastestFee + data.halfHourFee + data.hourFee) / 3;

    if (avgFee < 5) {
      recIcon.textContent = '🎉';
      recTitle.textContent = 'Great time to transact!';
      recDesc.textContent = 'Fees are very low. This is an excellent time to consolidate UTXOs or make non-urgent transactions.';
    } else if (avgFee < 15) {
      recIcon.textContent = '✅';
      recTitle.textContent = 'Good conditions';
      recDesc.textContent = 'Fees are reasonable. Standard transactions will confirm quickly at medium priority.';
    } else if (avgFee < 50) {
      recIcon.textContent = '⚠️';
      recTitle.textContent = 'Elevated fees';
      recDesc.textContent = 'Network is busy. Consider waiting for lower fees if your transaction is not urgent.';
    } else {
      recIcon.textContent = '🔥';
      recTitle.textContent = 'High fee environment';
      recDesc.textContent = 'Network is congested. Only urgent transactions recommended. Wait for fees to drop if possible.';
    }
  }

  function updateLastUpdated() {
    const now = new Date();
    document.getElementById('last-updated').textContent = now.toLocaleTimeString();
  }

  function displayError() {
    document.getElementById('fee-fastest').textContent = '--';
    document.getElementById('fee-medium').textContent = '--';
    document.getElementById('fee-slow').textContent = '--';
  }

  function setupEventListeners() {
    const txSizeInput = document.getElementById('tx-size');

    txSizeInput.addEventListener('input', async function() {
      try {
        const res = await fetch('https://mempool.space/api/v1/fees/recommended');
        const data = await res.json();
        updateCalculator(data);
      } catch (e) {
        console.error('Error updating calculator:', e);
      }
    });
  }

  function drawChart(labels, feeData) {
    const ctx = document.getElementById('fee-chart').getContext('2d');

    if (chart) {
      chart.destroy();
    }

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Median Fee (sat/vB)',
          data: feeData,
          borderColor: '#f7931a',
          backgroundColor: 'rgba(247, 147, 26, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointBackgroundColor: '#f7931a'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.parsed.y + ' sat/vB';
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255,255,255,0.1)'
            },
            ticks: {
              color: '#9ca3af',
              maxTicksLimit: 8
            }
          },
          y: {
            grid: {
              color: 'rgba(255,255,255,0.1)'
            },
            ticks: {
              color: '#9ca3af',
              callback: function(value) {
                return value + ' sat/vB';
              }
            },
            beginAtZero: true
          }
        }
      }
    });
  }
})();
