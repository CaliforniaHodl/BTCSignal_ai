// Bitcoin DCA Calculator
// Calculates dollar cost averaging returns with real historical data

(function() {
  'use strict';

  let chart = null;
  let currentBTCPrice = 0;
  let historicalPrices = {};

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    setDefaultDates();
    await fetchCurrentPrice();
    setupEventListeners();
  }

  function setDefaultDates() {
    const endDate = document.getElementById('end-date');
    const startDate = document.getElementById('start-date');

    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    endDate.value = formatDateForInput(today);
    startDate.value = formatDateForInput(oneYearAgo);

    // Set min/max dates
    startDate.min = '2013-04-28'; // CoinGecko BTC data starts around here
    startDate.max = formatDateForInput(today);
    endDate.min = '2013-04-28';
    endDate.max = formatDateForInput(today);
  }

  function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
  }

  async function fetchCurrentPrice() {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      const data = await res.json();
      currentBTCPrice = data.bitcoin.usd;
    } catch (e) {
      console.error('Failed to fetch current price:', e);
      currentBTCPrice = 100000; // Fallback
    }
  }

  function setupEventListeners() {
    document.getElementById('calculate-btn').addEventListener('click', calculateDCA);

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        applyPreset(this.dataset.preset);
      });
    });

    // Enter key on inputs
    document.querySelectorAll('.input-panel input').forEach(input => {
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') calculateDCA();
      });
    });
  }

  function applyPreset(preset) {
    const endDate = document.getElementById('end-date');
    const startDate = document.getElementById('start-date');
    const today = new Date();

    endDate.value = formatDateForInput(today);

    switch(preset) {
      case '1y':
        const oneYear = new Date();
        oneYear.setFullYear(today.getFullYear() - 1);
        startDate.value = formatDateForInput(oneYear);
        break;
      case '4y':
        const fourYears = new Date();
        fourYears.setFullYear(today.getFullYear() - 4);
        startDate.value = formatDateForInput(fourYears);
        break;
      case '2020':
        startDate.value = '2020-01-01';
        break;
    }

    calculateDCA();
  }

  async function calculateDCA() {
    const startDateStr = document.getElementById('start-date').value;
    const endDateStr = document.getElementById('end-date').value;
    const frequency = document.getElementById('frequency').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (!startDateStr || !endDateStr || !amount || amount <= 0) {
      if (typeof Toast !== 'undefined') {
        Toast.error('Please fill in all fields with valid values');
      }
      return;
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (startDate >= endDate) {
      if (typeof Toast !== 'undefined') {
        Toast.error('Start date must be before end date');
      }
      return;
    }

    // Show loading
    document.getElementById('calculate-btn').textContent = 'Calculating...';
    document.getElementById('calculate-btn').disabled = true;

    try {
      // Fetch historical prices
      const prices = await fetchHistoricalPrices(startDate, endDate);

      if (!prices || prices.length === 0) {
        throw new Error('No price data available');
      }

      // Calculate DCA
      const results = performDCACalculation(prices, startDate, endDate, frequency, amount);

      // Display results
      displayResults(results);

      // Draw chart
      drawChart(results);

    } catch (e) {
      console.error('DCA calculation error:', e);
      if (typeof Toast !== 'undefined') {
        Toast.error('Error calculating DCA. Please try again.');
      }
    } finally {
      document.getElementById('calculate-btn').textContent = 'Calculate Returns';
      document.getElementById('calculate-btn').disabled = false;
    }
  }

  async function fetchHistoricalPrices(startDate, endDate) {
    // CoinGecko market_chart/range endpoint
    const fromTs = Math.floor(startDate.getTime() / 1000);
    const toTs = Math.floor(endDate.getTime() / 1000);

    const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${fromTs}&to=${toTs}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to fetch price data');
    }

    const data = await res.json();
    return data.prices; // [[timestamp, price], ...]
  }

  function performDCACalculation(prices, startDate, endDate, frequency, amount) {
    // Build price lookup by date
    const priceByDate = {};
    prices.forEach(([ts, price]) => {
      const date = new Date(ts).toISOString().split('T')[0];
      priceByDate[date] = price;
    });

    // Generate purchase dates based on frequency
    const purchaseDates = generatePurchaseDates(startDate, endDate, frequency);

    let totalInvested = 0;
    let totalBTC = 0;
    const purchases = [];
    const portfolioHistory = [];

    purchaseDates.forEach(date => {
      const dateStr = formatDateForInput(date);
      // Find closest price
      const price = findClosestPrice(priceByDate, date);

      if (price > 0) {
        const btcBought = amount / price;
        totalInvested += amount;
        totalBTC += btcBought;

        purchases.push({
          date: dateStr,
          price: price,
          amount: amount,
          btcBought: btcBought,
          totalBTC: totalBTC,
          totalInvested: totalInvested,
          portfolioValue: totalBTC * price
        });

        portfolioHistory.push({
          date: dateStr,
          price: price,
          portfolioValue: totalBTC * price,
          totalInvested: totalInvested
        });
      }
    });

    // Calculate final values
    const currentValue = totalBTC * currentBTCPrice;
    const avgCost = totalInvested / totalBTC;
    const roi = ((currentValue - totalInvested) / totalInvested) * 100;

    // Lump sum comparison
    const firstPrice = purchases.length > 0 ? purchases[0].price : 0;
    const lumpSumBTC = totalInvested / firstPrice;
    const lumpSumValue = lumpSumBTC * currentBTCPrice;
    const dcaAdvantage = currentValue - lumpSumValue;

    return {
      totalInvested,
      totalBTC,
      currentValue,
      avgCost,
      roi,
      purchases,
      portfolioHistory,
      lumpSumValue,
      dcaAdvantage,
      priceHistory: prices
    };
  }

  function generatePurchaseDates(startDate, endDate, frequency) {
    const dates = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));

      switch(frequency) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'biweekly':
          current.setDate(current.getDate() + 14);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return dates;
  }

  function findClosestPrice(priceByDate, targetDate) {
    const dateStr = formatDateForInput(targetDate);
    if (priceByDate[dateStr]) {
      return priceByDate[dateStr];
    }

    // Look for closest date within 7 days
    for (let i = 1; i <= 7; i++) {
      const before = new Date(targetDate);
      before.setDate(before.getDate() - i);
      const after = new Date(targetDate);
      after.setDate(after.getDate() + i);

      if (priceByDate[formatDateForInput(before)]) {
        return priceByDate[formatDateForInput(before)];
      }
      if (priceByDate[formatDateForInput(after)]) {
        return priceByDate[formatDateForInput(after)];
      }
    }

    return 0;
  }

  function displayResults(results) {
    document.getElementById('total-invested').textContent = formatCurrency(results.totalInvested);
    document.getElementById('current-value').textContent = formatCurrency(results.currentValue);
    document.getElementById('total-btc').textContent = formatBTC(results.totalBTC);
    document.getElementById('avg-cost').textContent = formatCurrency(results.avgCost);
    document.getElementById('purchases').textContent = results.purchases.length;

    const roiEl = document.getElementById('roi');
    roiEl.textContent = results.roi.toFixed(2) + '%';
    roiEl.classList.remove('positive', 'negative');
    roiEl.classList.add(results.roi >= 0 ? 'positive' : 'negative');

    // Comparison section
    const compSection = document.getElementById('comparison-section');
    compSection.style.display = 'block';
    document.getElementById('lump-sum-value').textContent = formatCurrency(results.lumpSumValue);

    const advEl = document.getElementById('dca-advantage');
    advEl.textContent = (results.dcaAdvantage >= 0 ? '+' : '') + formatCurrency(results.dcaAdvantage);
    advEl.classList.remove('positive', 'negative');
    advEl.classList.add(results.dcaAdvantage >= 0 ? 'positive' : 'negative');
  }

  function drawChart(results) {
    const ctx = document.getElementById('dca-chart').getContext('2d');

    // Prepare data
    const labels = [];
    const btcPrices = [];
    const portfolioValues = [];
    const totalInvested = [];

    // Sample price history for BTC price line
    const sampleInterval = Math.max(1, Math.floor(results.priceHistory.length / 100));
    results.priceHistory.forEach(([ts, price], i) => {
      if (i % sampleInterval === 0) {
        const date = new Date(ts);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
        btcPrices.push(price);

        // Find corresponding portfolio value
        const dateStr = formatDateForInput(date);
        const purchase = results.purchases.find(p => p.date <= dateStr);
        if (purchase) {
          const portfolioAtDate = results.purchases
            .filter(p => p.date <= dateStr)
            .reduce((acc, p) => acc + p.btcBought, 0) * price;
          const investedAtDate = results.purchases
            .filter(p => p.date <= dateStr)
            .reduce((acc, p) => acc + p.amount, 0);
          portfolioValues.push(portfolioAtDate);
          totalInvested.push(investedAtDate);
        } else {
          portfolioValues.push(0);
          totalInvested.push(0);
        }
      }
    });

    // Destroy existing chart
    if (chart) {
      chart.destroy();
    }

    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'BTC Price',
            data: btcPrices,
            borderColor: '#f7931a',
            backgroundColor: 'rgba(247, 147, 26, 0.1)',
            fill: false,
            tension: 0.1,
            yAxisID: 'y-price',
            pointRadius: 0
          },
          {
            label: 'Portfolio Value',
            data: portfolioValues,
            borderColor: '#4ade80',
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            fill: true,
            tension: 0.1,
            yAxisID: 'y-value',
            pointRadius: 0
          },
          {
            label: 'Total Invested',
            data: totalInvested,
            borderColor: '#6b7280',
            backgroundColor: 'rgba(107, 114, 128, 0.1)',
            fill: false,
            tension: 0.1,
            yAxisID: 'y-value',
            pointRadius: 0,
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
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
              maxTicksLimit: 12
            }
          },
          'y-price': {
            type: 'linear',
            position: 'left',
            grid: {
              color: 'rgba(255,255,255,0.1)'
            },
            ticks: {
              color: '#f7931a',
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            },
            title: {
              display: true,
              text: 'BTC Price',
              color: '#f7931a'
            }
          },
          'y-value': {
            type: 'linear',
            position: 'right',
            grid: {
              drawOnChartArea: false
            },
            ticks: {
              color: '#4ade80',
              callback: function(value) {
                return '$' + value.toLocaleString();
              }
            },
            title: {
              display: true,
              text: 'Portfolio Value',
              color: '#4ade80'
            }
          }
        }
      }
    });
  }

  function formatCurrency(value) {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatBTC(value) {
    return value.toFixed(8) + ' BTC';
  }
})();
