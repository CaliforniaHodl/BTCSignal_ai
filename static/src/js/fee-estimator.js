// Fee Estimator - Real-time Bitcoin transaction fee recommendations
(function() {
  'use strict';

  var MEMPOOL_API = 'https://mempool.space/api';
  var btcPrice = 0;
  var currentFees = null;

  // Fetch recommended fees from mempool.space
  function fetchFees() {
    return fetch(MEMPOOL_API + '/v1/fees/recommended')
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to fetch fees');
        return response.json();
      })
      .catch(function(error) {
        console.error('Error fetching fees:', error);
        return null;
      });
  }

  // Fetch mempool stats
  function fetchMempoolStats() {
    return fetch(MEMPOOL_API + '/mempool')
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to fetch mempool stats');
        return response.json();
      })
      .catch(function(error) {
        console.error('Error fetching mempool:', error);
        return null;
      });
  }

  // Fetch BTC price for USD conversion
  function fetchBtcPrice() {
    return fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to fetch price');
        return response.json();
      })
      .then(function(data) {
        return data.bitcoin.usd;
      })
      .catch(function(error) {
        console.error('Error fetching BTC price:', error);
        return 100000; // Fallback price
      });
  }

  // Convert sats to USD
  function satsToUsd(sats) {
    var btcAmount = sats / 100000000;
    return btcAmount * btcPrice;
  }

  // Format USD
  function formatUsd(value) {
    return '$' + value.toFixed(2);
  }

  // Calculate fee for transaction
  function calculateFee(feeRate, txSize) {
    var feeSats = feeRate * txSize;
    var feeUsd = satsToUsd(feeSats);
    return { sats: feeSats, usd: feeUsd };
  }

  // Update fee display
  function updateFeeDisplay(fees) {
    if (!fees) return;

    document.getElementById('fee-fastest').textContent = fees.fastestFee;
    document.getElementById('fee-medium').textContent = fees.halfHourFee;
    document.getElementById('fee-slow').textContent = fees.hourFee;

    // Calculate costs for typical transaction
    var txSize = parseInt(document.getElementById('tx-size').value) || 250;
    
    var fastCost = calculateFee(fees.fastestFee, txSize);
    var mediumCost = calculateFee(fees.halfHourFee, txSize);
    var slowCost = calculateFee(fees.hourFee, txSize);

    document.getElementById('cost-fastest').textContent = 
      fastCost.sats.toLocaleString() + ' sats (' + formatUsd(fastCost.usd) + ')';
    document.getElementById('cost-medium').textContent = 
      mediumCost.sats.toLocaleString() + ' sats (' + formatUsd(mediumCost.usd) + ')';
    document.getElementById('cost-slow').textContent = 
      slowCost.sats.toLocaleString() + ' sats (' + formatUsd(slowCost.usd) + ')';

    // Update calculator result
    updateCalculator(fees);
  }

  // Update mempool stats display
  function updateMempoolDisplay(stats) {
    if (!stats) return;

    var sizeInMB = (stats.vsize / 1000000).toFixed(2);
    document.getElementById('mempool-size').textContent = sizeInMB + ' MB';
    document.getElementById('pending-txs').textContent = stats.count.toLocaleString();
  }

  // Update last block info
  function updateLastBlock() {
    fetch(MEMPOOL_API + '/blocks/tip/height')
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to fetch block height');
        return response.text();
      })
      .then(function(height) {
        document.getElementById('last-block').textContent = '#' + parseInt(height).toLocaleString();
      })
      .catch(function(error) {
        console.error('Error fetching block height:', error);
      });
  }

  // Update recommendation
  function updateRecommendation(fees, mempoolStats) {
    var recTitle = document.getElementById('rec-title');
    var recText = document.getElementById('rec-text');
    
    if (!fees || !mempoolStats) {
      recTitle.textContent = 'Unable to fetch data';
      recText.textContent = 'Please refresh the page to try again';
      return;
    }

    var mempoolSizeMB = mempoolStats.vsize / 1000000;
    
    if (mempoolSizeMB < 5) {
      recTitle.textContent = 'Great time to transact!';
      recText.textContent = 'Mempool is nearly empty (' + mempoolSizeMB.toFixed(1) + ' MB). Even economy fees should confirm quickly.';
    } else if (mempoolSizeMB < 20) {
      recTitle.textContent = 'Normal conditions';
      recText.textContent = 'Mempool is moderately full (' + mempoolSizeMB.toFixed(1) + ' MB). Use medium priority for reliable confirmation within 30 minutes.';
    } else if (mempoolSizeMB < 50) {
      recTitle.textContent = 'Elevated fees';
      recText.textContent = 'Mempool is congested (' + mempoolSizeMB.toFixed(1) + ' MB). Consider waiting if your transaction is not urgent.';
    } else {
      recTitle.textContent = 'High congestion - consider waiting';
      recText.textContent = 'Mempool is very full (' + mempoolSizeMB.toFixed(1) + ' MB). Fees are elevated. Wait for lower activity if possible.';
    }
  }

  // Update calculator based on input
  function updateCalculator(fees) {
    if (!fees) return;
    
    var txSize = parseInt(document.getElementById('tx-size').value) || 250;
    var fastCost = calculateFee(fees.fastestFee, txSize);
    var mediumCost = calculateFee(fees.halfHourFee, txSize);
    var slowCost = calculateFee(fees.hourFee, txSize);

    document.getElementById('calc-result').innerHTML = 
      'Fast: ' + fastCost.sats.toLocaleString() + ' sats (' + formatUsd(fastCost.usd) + ') | ' +
      'Medium: ' + mediumCost.sats.toLocaleString() + ' sats (' + formatUsd(mediumCost.usd) + ') | ' +
      'Economy: ' + slowCost.sats.toLocaleString() + ' sats (' + formatUsd(slowCost.usd) + ')';
  }

  // Main update function
  function updateAll() {
    Promise.all([fetchFees(), fetchMempoolStats()])
      .then(function(results) {
        var fees = results[0];
        var mempoolStats = results[1];
        
        currentFees = fees;
        updateFeeDisplay(fees);
        updateMempoolDisplay(mempoolStats);
        updateLastBlock();
        updateRecommendation(fees, mempoolStats);
      });
  }

  // Initialize
  function init() {
    // Fetch BTC price first
    fetchBtcPrice().then(function(price) {
      btcPrice = price;
      
      // Initial update
      updateAll();

      // Set up calculator input listener
      document.getElementById('tx-size').addEventListener('input', function() {
        if (currentFees) {
          updateCalculator(currentFees);
          updateFeeDisplay(currentFees);
        }
      });

      // Refresh every 30 seconds
      setInterval(updateAll, 30000);
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
