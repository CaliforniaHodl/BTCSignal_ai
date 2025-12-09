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

  // Fun stats pool - each returns {icon, value, label}
  var funStatsPool = [
    // BTC Percent
    function(sats) {
      var btcPercent = (sats / 100000000) * 100;
      return { icon: '🥧', value: btcPercent.toFixed(4) + '%', label: 'of 1 BTC' };
    },
    // World ranking
    function(sats) {
      var btcAmount = satsToBtc(sats);
      var worldPercent;
      if (btcAmount >= 1) worldPercent = 'Top 1%';
      else if (btcAmount >= 0.1) worldPercent = 'Top 5%';
      else if (btcAmount >= 0.01) worldPercent = 'Top 10%';
      else if (btcAmount >= 0.001) worldPercent = 'Top 25%';
      else worldPercent = 'Top 50%';
      return { icon: '🌍', value: worldPercent, label: 'of BTC holders' };
    },
    // Coffees
    function(sats) {
      var coffees = Math.floor(satsToUsd(sats) / 5);
      return { icon: '☕', value: coffees.toLocaleString(), label: 'coffees worth' };
    },
    // Pizzas (tribute to 10,000 BTC pizza)
    function(sats) {
      var pizzas = Math.floor(satsToUsd(sats) / 20);
      return { icon: '🍕', value: pizzas.toLocaleString(), label: 'pizzas worth' };
    },
    // Big Macs
    function(sats) {
      var bigmacs = Math.floor(satsToUsd(sats) / 5.50);
      return { icon: '🍔', value: bigmacs.toLocaleString(), label: 'Big Macs' };
    },
    // Netflix months
    function(sats) {
      var months = Math.floor(satsToUsd(sats) / 15.99);
      return { icon: '📺', value: months.toLocaleString(), label: 'months of Netflix' };
    },
    // Gold grams
    function(sats) {
      var goldPricePerGram = 75; // approximate
      var grams = (satsToUsd(sats) / goldPricePerGram).toFixed(2);
      return { icon: '🪙', value: grams + 'g', label: 'of gold equivalent' };
    },
    // Gallons of gas
    function(sats) {
      var gallons = Math.floor(satsToUsd(sats) / 3.50);
      return { icon: '⛽', value: gallons.toLocaleString(), label: 'gallons of gas' };
    },
    // Whole coins progress
    function(sats) {
      var wholeCoins = Math.floor(sats / 100000000);
      var remaining = 100000000 - (sats % 100000000);
      if (wholeCoins >= 1) {
        return { icon: '₿', value: wholeCoins.toLocaleString(), label: 'whole bitcoin(s)' };
      }
      return { icon: '₿', value: (remaining / 100000000).toFixed(4), label: 'BTC to next whole coin' };
    }
  ];

  var activeStats = [];
  var funStatsEl = document.getElementById('fun-stats');

  // Shuffle and select 3 stats
  function shuffleStats() {
    var shuffled = funStatsPool.slice().sort(function() { return 0.5 - Math.random(); });
    activeStats = shuffled.slice(0, 3);
    updateFunStats();
  }

  // Update fun stats
  function updateFunStats() {
    var sats = parseInt(satsInput.value) || 0;
    var totalStackSats = getTotalStackSats();
    var displaySats = Math.max(sats, totalStackSats);

    if (displaySats === 0) {
      funStatsEl.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 1rem; grid-column: 1/-1;">Enter an amount to see fun stats</p>';
      return;
    }

    var html = '';
    activeStats.forEach(function(statFn) {
      var stat = statFn(displaySats);
      html += '<div class="fun-stat">' +
        '<span class="fun-icon" aria-hidden="true">' + stat.icon + '</span>' +
        '<span class="fun-value">' + stat.value + '</span>' +
        '<span class="fun-label">' + stat.label + '</span>' +
        '</div>';
    });
    funStatsEl.innerHTML = html;
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

    // Initialize random stats
    shuffleStats();

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

    // Shuffle stats button
    document.getElementById('shuffle-stats').addEventListener('click', shuffleStats);

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
