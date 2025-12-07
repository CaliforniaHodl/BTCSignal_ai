// Difficulty Ribbon - Bitcoin mining difficulty analysis
(function() {
  'use strict';

  var MEMPOOL_API = 'https://mempool.space/api/v1';
  var ribbonChart = null;
  var hashrateChart = null;

  // Format large numbers
  function formatDifficulty(diff) {
    if (diff >= 1e12) {
      return (diff / 1e12).toFixed(2) + 'T';
    } else if (diff >= 1e9) {
      return (diff / 1e9).toFixed(2) + 'B';
    }
    return diff.toLocaleString();
  }

  function formatHashrate(hash) {
    if (hash >= 1e18) {
      return (hash / 1e18).toFixed(2) + ' EH/s';
    } else if (hash >= 1e15) {
      return (hash / 1e15).toFixed(2) + ' PH/s';
    }
    return hash.toLocaleString() + ' H/s';
  }

  // Fetch difficulty adjustments from mempool.space
  function fetchDifficultyAdjustments() {
    return fetch(MEMPOOL_API + '/difficulty-adjustments')
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to fetch difficulty');
        return response.json();
      })
      .catch(function(error) {
        console.error('Error fetching difficulty:', error);
        return null;
      });
  }

  // Fetch hashrate history
  function fetchHashrateHistory() {
    return fetch(MEMPOOL_API + '/mining/hashrate/1y')
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to fetch hashrate');
        return response.json();
      })
      .catch(function(error) {
        console.error('Error fetching hashrate:', error);
        return null;
      });
  }

  // Calculate moving average
  function calculateMA(data, period) {
    var result = [];
    for (var i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        var sum = 0;
        for (var j = 0; j < period; j++) {
          sum += data[i - j];
        }
        result.push(sum / period);
      }
    }
    return result;
  }

  // Determine ribbon signal
  function getRibbonSignal(difficulty, ma128, ma200) {
    if (!ma128 || !ma200) {
      return { status: 'Neutral', class: 'neutral' };
    }
    
    if (ma128 < ma200 * 0.98) {
      return { status: 'Buy Signal', class: 'bullish' };
    } else if (ma128 > ma200 * 1.02) {
      return { status: 'No Signal', class: 'neutral' };
    } else {
      return { status: 'Watch', class: 'warning' };
    }
  }

  // Update metrics display
  function updateMetrics(adjustments) {
    if (!adjustments || adjustments.length === 0) return;
    
    var latest = adjustments[0];
    var previous = adjustments[1];
    
    // Current difficulty
    document.getElementById('current-difficulty').textContent = formatDifficulty(latest.difficulty);
    
    // Last adjustment
    var changePercent = ((latest.difficulty - previous.difficulty) / previous.difficulty) * 100;
    var changeEl = document.getElementById('difficulty-change');
    changeEl.textContent = (changePercent >= 0 ? '+' : '') + changePercent.toFixed(2) + '%';
    changeEl.className = 'metric-value ' + (changePercent >= 0 ? 'positive' : 'negative');
    
    // Next adjustment (approximately 2016 blocks from latest)
    var blocksRemaining = 2016 - (latest.height % 2016);
    var minutesRemaining = blocksRemaining * 10;
    var daysRemaining = Math.floor(minutesRemaining / 1440);
    document.getElementById('next-adjustment').textContent = '~' + daysRemaining + ' days';
    
    // Calculate ribbon signal
    var difficulties = adjustments.slice(0, 30).map(function(a) { return a.difficulty; }).reverse();
    var ma128 = calculateMA(difficulties, 9); // Approximation for 128-day
    var ma200 = calculateMA(difficulties, 14); // Approximation for 200-day
    
    var signal = getRibbonSignal(
      difficulties[difficulties.length - 1],
      ma128[ma128.length - 1],
      ma200[ma200.length - 1]
    );
    
    document.getElementById('ribbon-signal').textContent = signal.status;
    document.getElementById('ribbon-signal').className = 'metric-value ' + signal.class;
    
    // Update signal card
    document.getElementById('signal-status').textContent = signal.status;
    document.getElementById('signal-status').className = signal.class;
    
    if (signal.status === 'Buy Signal') {
      document.getElementById('signal-explanation').textContent = 
        'The difficulty ribbon is showing a potential buy signal. Short-term difficulty MA has crossed below long-term MA, ' +
        'historically indicating miner capitulation and often preceding major price rallies.';
    } else if (signal.status === 'Watch') {
      document.getElementById('signal-explanation').textContent = 
        'Difficulty MAs are converging. Watch for potential crossover which could signal miner stress ' +
        'and a potential buying opportunity.';
    } else {
      document.getElementById('signal-explanation').textContent = 
        'No capitulation signal currently. Difficulty is trending normally with healthy miner participation. ' +
        'The network remains strong with consistent hash rate.';
    }
  }

  // Create difficulty ribbon chart
  function createRibbonChart(adjustments, months) {
    var ctx = document.getElementById('ribbon-chart').getContext('2d');
    
    // Filter to time range
    var cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    
    var filtered = adjustments.filter(function(a) {
      return new Date(a.time * 1000) >= cutoff;
    }).reverse();
    
    var labels = filtered.map(function(a) {
      return new Date(a.time * 1000).toLocaleDateString();
    });
    var difficulties = filtered.map(function(a) { return a.difficulty; });
    
    // Calculate MAs
    var ma128 = calculateMA(difficulties, Math.min(9, Math.floor(filtered.length / 3)));
    var ma200 = calculateMA(difficulties, Math.min(14, Math.floor(filtered.length / 2)));
    
    if (ribbonChart) {
      ribbonChart.destroy();
    }
    
    ribbonChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Difficulty',
            data: difficulties,
            borderColor: '#f7931a',
            backgroundColor: 'rgba(247, 147, 26, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2
          },
          {
            label: '128-day MA',
            data: ma128,
            borderColor: '#3fb950',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            borderDash: [5, 5]
          },
          {
            label: '200-day MA',
            data: ma200,
            borderColor: '#f85149',
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(22, 27, 34, 0.95)',
            titleColor: '#e6edf3',
            bodyColor: '#8d96a0',
            borderColor: '#30363d',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + formatDifficulty(context.parsed.y);
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(48, 54, 61, 0.5)'
            },
            ticks: {
              color: '#8d96a0',
              maxTicksLimit: 6
            }
          },
          y: {
            grid: {
              color: 'rgba(48, 54, 61, 0.5)'
            },
            ticks: {
              color: '#8d96a0',
              callback: function(value) {
                return formatDifficulty(value);
              }
            }
          }
        }
      }
    });
  }

  // Create hashrate chart
  function createHashrateChart(data) {
    if (!data || !data.hashrates) return;
    
    var ctx = document.getElementById('hashrate-chart').getContext('2d');
    
    var labels = data.hashrates.map(function(h) {
      return new Date(h.timestamp * 1000).toLocaleDateString();
    });
    var hashrates = data.hashrates.map(function(h) { return h.avgHashrate; });
    
    if (hashrateChart) {
      hashrateChart.destroy();
    }
    
    hashrateChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Hash Rate',
          data: hashrates,
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2
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
            backgroundColor: 'rgba(22, 27, 34, 0.95)',
            titleColor: '#e6edf3',
            bodyColor: '#8d96a0',
            callbacks: {
              label: function(context) {
                return formatHashrate(context.parsed.y);
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(48, 54, 61, 0.5)'
            },
            ticks: {
              color: '#8d96a0',
              maxTicksLimit: 6
            }
          },
          y: {
            grid: {
              color: 'rgba(48, 54, 61, 0.5)'
            },
            ticks: {
              color: '#8d96a0',
              callback: function(value) {
                return formatHashrate(value);
              }
            }
          }
        }
      }
    });
  }

  // Handle time range buttons
  function setupTimeButtons(adjustments) {
    var buttons = document.querySelectorAll('.time-btn');
    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        buttons.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        
        var range = btn.dataset.range;
        var months;
        switch(range) {
          case '1y': months = 12; break;
          case '2y': months = 24; break;
          case '4y': months = 48; break;
          default: months = 24;
        }
        
        createRibbonChart(adjustments, months);
      });
    });
  }

  // Initialize
  function init() {
    Promise.all([
      fetchDifficultyAdjustments(),
      fetchHashrateHistory()
    ]).then(function(results) {
      var adjustments = results[0];
      var hashrate = results[1];
      
      if (adjustments) {
        updateMetrics(adjustments);
        createRibbonChart(adjustments, 24);
        setupTimeButtons(adjustments);
      }
      
      if (hashrate) {
        createHashrateChart(hashrate);
      }
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
