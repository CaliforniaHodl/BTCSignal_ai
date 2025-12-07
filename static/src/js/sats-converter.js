// Sats Converter - Bitcoin unit converter and stack tracker
(function() {
  'use strict';

  var btcPrice = 0;
  var stack = [];
  var STORAGE_KEY = 'btcsignal_stack';

  // DOM Elements
  var usdInput = document.getElementById('usd-input');
  var btcInput = document.getElementById('btc-input');
  var satsInput = document.getElementById('sats-input');
  var livePriceEl = document.getElementById('live-price');
  var stackList = document.getElementById('stack-list');
  var stackSummary = document.getElementById('stack-summary');
  var exportBtn = document.getElementById('export-stack-btn');

  // Fetch BTC price
  function fetchPrice() {
    return fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to fetch price');
        return response.json();
      })
      .then(function(data) {
        btcPrice = data.bitcoin.usd;
        livePriceEl.textContent = '$' + btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        updateFunStats();
        updateStackSummary();
        return btcPrice;
      })
      .catch(function(error) {
        console.error('Error fetching price:', error);
        livePriceEl.textContent = 'Error loading price';
        return 100000;
      });
  }

  // Conversion functions
  function usdToBtc(usd) {
    return usd / btcPrice;
  }

  function btcToUsd(btc) {
    return btc * btcPrice;
  }

  function btcToSats(btc) {
    return Math.round(btc * 100000000);
  }

  function satsToBtc(sats) {
    return sats / 100000000;
  }

  function usdToSats(usd) {
    return btcToSats(usdToBtc(usd));
  }

  function satsToUsd(sats) {
    return btcToUsd(satsToBtc(sats));
  }

  // Handle USD input
  function handleUsdInput() {
    var usd = parseFloat(usdInput.value) || 0;
    var btc = usdToBtc(usd);
    var sats = btcToSats(btc);
    
    btcInput.value = btc.toFixed(8);
    satsInput.value = sats;
    updateFunStats();
  }

  // Handle BTC input
  function handleBtcInput() {
    var btc = parseFloat(btcInput.value) || 0;
    var usd = btcToUsd(btc);
    var sats = btcToSats(btc);
    
    usdInput.value = usd.toFixed(2);
    satsInput.value = sats;
    updateFunStats();
  }

  // Handle Sats input
  function handleSatsInput() {
    var sats = parseInt(satsInput.value) || 0;
    var btc = satsToBtc(sats);
    var usd = btcToUsd(btc);
    
    btcInput.value = btc.toFixed(8);
    usdInput.value = usd.toFixed(2);
    updateFunStats();
  }

  // Update fun stats
  function updateFunStats() {
    var sats = parseInt(satsInput.value) || 0;
    var totalStackSats = getTotalStackSats();
    var displaySats = Math.max(sats, totalStackSats);
    
    if (displaySats === 0) return;
    
    // Percent of 1 BTC
    var btcPercent = (displaySats / 100000000) * 100;
    document.getElementById('btc-percent').textContent = btcPercent.toFixed(4) + '%';
    
    // World ranking (approximation based on distribution)
    // ~100M people own any BTC, owning 0.01 BTC puts you in top 10%
    var btcAmount = satsToBtc(displaySats);
    var worldPercent;
    if (btcAmount >= 1) {
      worldPercent = 'Top 1%';
    } else if (btcAmount >= 0.1) {
      worldPercent = 'Top 5%';
    } else if (btcAmount >= 0.01) {
      worldPercent = 'Top 10%';
    } else if (btcAmount >= 0.001) {
      worldPercent = 'Top 25%';
    } else {
      worldPercent = 'Top 50%';
    }
    document.getElementById('world-percent').textContent = worldPercent;
    
    // Coffees worth (assuming $5 per coffee)
    var coffeeValue = satsToUsd(displaySats);
    var coffees = Math.floor(coffeeValue / 5);
    document.getElementById('coffee-count').textContent = coffees.toLocaleString();
  }

  // Stack tracker functions
  function loadStack() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        stack = JSON.parse(saved);
        renderStack();
      }
    } catch (e) {
      console.error('Error loading stack:', e);
      stack = [];
    }
  }

  function saveStack() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
    } catch (e) {
      console.error('Error saving stack:', e);
    }
  }

  function getTotalStackSats() {
    return stack.reduce(function(sum, item) {
      return sum + item.sats;
    }, 0);
  }

  function addStackItem() {
    var date = document.getElementById('stack-date').value;
    var sats = parseInt(document.getElementById('stack-sats').value);
    var price = parseFloat(document.getElementById('stack-price').value);
    
    if (!date || !sats || sats <= 0) {
      if (typeof Toast !== 'undefined') {
        Toast.error('Please enter a date and amount');
      }
      return;
    }
    
    stack.push({
      id: Date.now(),
      date: date,
      sats: sats,
      price: price || btcPrice
    });
    
    saveStack();
    renderStack();
    
    // Clear inputs
    document.getElementById('stack-date').value = '';
    document.getElementById('stack-sats').value = '';
    document.getElementById('stack-price').value = '';
  }

  function deleteStackItem(id) {
    stack = stack.filter(function(item) {
      return item.id !== id;
    });
    saveStack();
    renderStack();
  }

  function renderStack() {
    if (stack.length === 0) {
      stackList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1rem;">No purchases tracked yet</p>';
      stackSummary.style.display = 'none';
      exportBtn.style.display = 'none';
      return;
    }
    
    var html = '';
    stack.forEach(function(item) {
      var formattedDate = new Date(item.date).toLocaleDateString();
      var formattedSats = item.sats.toLocaleString();
      var formattedPrice = '$' + item.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      
      html += '<div class="stack-item" data-id="' + item.id + '">' +
        '<span class="stack-date">' + formattedDate + '</span>' +
        '<span class="stack-amount">' + formattedSats + ' sats</span>' +
        '<span class="stack-price">@ ' + formattedPrice + '</span>' +
        '<button type="button" class="delete-btn" aria-label="Delete entry">✕</button>' +
        '</div>';
    });
    
    stackList.innerHTML = html;
    stackSummary.style.display = 'grid';
    exportBtn.style.display = 'block';
    
    // Add delete handlers
    stackList.querySelectorAll('.delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = parseInt(btn.closest('.stack-item').dataset.id);
        deleteStackItem(id);
      });
    });
    
    updateStackSummary();
    updateFunStats();
  }

  function updateStackSummary() {
    if (stack.length === 0) return;
    
    var totalSats = getTotalStackSats();
    var totalSpent = stack.reduce(function(sum, item) {
      var btcAtTime = satsToBtc(item.sats);
      return sum + (btcAtTime * item.price);
    }, 0);
    var currentValue = satsToUsd(totalSats);
    var profitLoss = currentValue - totalSpent;
    
    document.getElementById('total-sats').textContent = totalSats.toLocaleString();
    document.getElementById('total-spent').textContent = '$' + totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('current-value').textContent = '$' + currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    var plEl = document.getElementById('profit-loss');
    var sign = profitLoss >= 0 ? '+' : '';
    plEl.textContent = sign + '$' + profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    plEl.className = 'sum-value ' + (profitLoss >= 0 ? 'positive' : 'negative');
  }

  function exportStack() {
    if (stack.length === 0) return;
    
    var csv = 'Date,Sats,BTC Price,USD Value\n';
    stack.forEach(function(item) {
      var btcValue = satsToBtc(item.sats);
      var usdValue = btcValue * item.price;
      csv += item.date + ',' + item.sats + ',' + item.price + ',' + usdValue.toFixed(2) + '\n';
    });
    
    var blob = new Blob([csv], { type: 'text/csv' });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'btc-stack-' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Initialize
  function init() {
    // Set default date to today
    document.getElementById('stack-date').value = new Date().toISOString().split('T')[0];
    
    // Fetch initial price
    fetchPrice();
    
    // Load saved stack
    loadStack();
    
    // Set up input listeners
    usdInput.addEventListener('input', handleUsdInput);
    btcInput.addEventListener('input', handleBtcInput);
    satsInput.addEventListener('input', handleSatsInput);
    
    // Stack tracker buttons
    document.getElementById('add-stack-btn').addEventListener('click', addStackItem);
    exportBtn.addEventListener('click', exportStack);
    
    // Refresh price every 60 seconds
    setInterval(fetchPrice, 60000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
