// HODL Waves - Bitcoin age distribution visualization
(function() {
  'use strict';

  var hodlChart = null;

  // Approximated HODL waves data based on historical patterns
  // Real data would require Glassnode API (~$800/month)
  var hodlData = {
    ageBands: [
      { label: '< 24h', color: '#ef4444', percent: 2.1 },
      { label: '1d - 1w', color: '#f97316', percent: 3.2 },
      { label: '1w - 1m', color: '#eab308', percent: 4.5 },
      { label: '1m - 3m', color: '#84cc16', percent: 6.8 },
      { label: '3m - 6m', color: '#22c55e', percent: 8.2 },
      { label: '6m - 1y', color: '#14b8a6', percent: 9.4 },
      { label: '1y - 2y', color: '#0ea5e9', percent: 14.3 },
      { label: '2y - 3y', color: '#6366f1', percent: 12.8 },
      { label: '3y - 5y', color: '#8b5cf6', percent: 18.7 },
      { label: '5y+', color: '#a855f7', percent: 20.0 }
    ],
    lthPercent: 65.8,
    whalePercent: 38.7,
    trend: 'Accumulating',
    cyclePhase: 'Mid-Cycle'
  };

  // Generate historical data for chart (approximation)
  function generateHistoricalData(months) {
    var data = [];
    var now = new Date();
    var baseDistribution = hodlData.ageBands.map(function(b) { return b.percent; });
    
    for (var i = months; i >= 0; i--) {
      var date = new Date(now);
      date.setMonth(date.getMonth() - i);
      
      // Add some variation to simulate historical changes
      var variation = Math.sin(i / 6) * 3;
      var distribution = baseDistribution.map(function(val, idx) {
        if (idx < 5) {
          return Math.max(0.5, val + variation * (5 - idx) / 5);
        } else {
          return Math.max(0.5, val - variation * (idx - 4) / 6);
        }
      });
      
      // Normalize to 100%
      var total = distribution.reduce(function(a, b) { return a + b; }, 0);
      distribution = distribution.map(function(v) { return (v / total) * 100; });
      
      data.push({
        date: date.toISOString().split('T')[0],
        distribution: distribution
      });
    }
    
    return data;
  }

  // Update metrics display
  function updateMetrics() {
    document.getElementById('ltH-percent').textContent = hodlData.lthPercent.toFixed(1) + '%';
    document.getElementById('whale-percent').textContent = hodlData.whalePercent.toFixed(1) + '%';
    document.getElementById('trend').textContent = hodlData.trend;
    document.getElementById('cycle-phase').textContent = hodlData.cyclePhase;
    document.getElementById('current-lth').textContent = hodlData.lthPercent.toFixed(1) + '%';
    document.getElementById('current-phase').textContent = hodlData.cyclePhase;
  }

  // Render distribution grid
  function renderDistribution() {
    var grid = document.getElementById('distribution-grid');
    var html = '';
    
    hodlData.ageBands.forEach(function(band) {
      html += '<div class="distribution-item">' +
        '<span class="dist-label">' +
          '<span class="dist-color" style="background: ' + band.color + ';"></span>' +
          band.label +
        '</span>' +
        '<div class="dist-bar-container">' +
          '<div class="dist-bar" style="width: ' + band.percent + '%; background: ' + band.color + ';"></div>' +
        '</div>' +
        '<span class="dist-value">' + band.percent.toFixed(1) + '%</span>' +
      '</div>';
    });
    
    grid.innerHTML = html;
  }

  // Update insight text
  function updateInsight() {
    var insight = document.getElementById('insight-text');
    
    if (hodlData.lthPercent > 65) {
      insight.textContent = 'Long-term holder supply is at historically high levels (' + hodlData.lthPercent.toFixed(1) + '%). ' +
        'This typically indicates strong conviction and often precedes bull market phases. ' +
        'Diamond hands are not selling.';
    } else if (hodlData.lthPercent > 55) {
      insight.textContent = 'Long-term holder supply is healthy at ' + hodlData.lthPercent.toFixed(1) + '%. ' +
        'Market is in a balanced state with moderate accumulation from long-term investors.';
    } else {
      insight.textContent = 'Long-term holder supply at ' + hodlData.lthPercent.toFixed(1) + '% suggests distribution phase. ' +
        'Older coins are moving, which historically occurs near cycle tops.';
    }
  }

  // Create HODL waves chart
  function createChart(months) {
    var ctx = document.getElementById('hodl-chart').getContext('2d');
    var historicalData = generateHistoricalData(months);
    
    var labels = historicalData.map(function(d) { return d.date; });
    var datasets = hodlData.ageBands.map(function(band, idx) {
      return {
        label: band.label,
        data: historicalData.map(function(d) { return d.distribution[idx]; }),
        backgroundColor: band.color,
        borderColor: band.color,
        fill: true,
        tension: 0.4,
        pointRadius: 0
      };
    });
    
    if (hodlChart) {
      hodlChart.destroy();
    }
    
    hodlChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
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
            backgroundColor: 'rgba(22, 27, 34, 0.95)',
            titleColor: '#e6edf3',
            bodyColor: '#8d96a0',
            borderColor: '#30363d',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
              }
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
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
            stacked: true,
            min: 0,
            max: 100,
            grid: {
              color: 'rgba(48, 54, 61, 0.5)'
            },
            ticks: {
              color: '#8d96a0',
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }

  // Handle time range buttons
  function setupTimeButtons() {
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
          case 'all': months = 96; break;
          default: months = 12;
        }
        
        createChart(months);
      });
    });
  }

  // Initialize
  function init() {
    updateMetrics();
    renderDistribution();
    updateInsight();
    createChart(12);
    setupTimeButtons();
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
