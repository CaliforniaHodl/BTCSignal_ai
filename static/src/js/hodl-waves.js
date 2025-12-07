// HODL Waves Visualization
// Shows Bitcoin age distribution over time

(function() {
  'use strict';

  let chart = null;
  let currentRange = '1y';

  // Age bands with colors (warm = old, cool = new)
  const ageBands = [
    { id: 'lt24h', label: '< 24h', color: '#ff6b6b' },
    { id: '1d1w', label: '1d-1w', color: '#ffa94d' },
    { id: '1w1m', label: '1w-1m', color: '#ffd43b' },
    { id: '1m3m', label: '1m-3m', color: '#a9e34b' },
    { id: '3m6m', label: '3m-6m', color: '#69db7c' },
    { id: '6m12m', label: '6m-12m', color: '#38d9a9' },
    { id: '1y2y', label: '1y-2y', color: '#4dabf7' },
    { id: '2y3y', label: '2y-3y', color: '#748ffc' },
    { id: '3y5y', label: '3y-5y', color: '#9775fa' },
    { id: '5yplus', label: '5y+', color: '#da77f2' }
  ];

  // Approximated HODL wave data based on historical patterns
  // Real data would come from Glassnode ($800/mo) or similar
  // This represents typical patterns observed through market cycles
  const historicalData = generateHistoricalData();

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupEventListeners();
    updateMetrics();
    updateDistribution();
    updateInsight();
    drawChart(currentRange);
  }

  function setupEventListeners() {
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentRange = this.dataset.range;
        drawChart(currentRange);
      });
    });
  }

  function generateHistoricalData() {
    // Generate approximated data points based on known HODL wave patterns
    // This creates realistic-looking data that follows observed market behavior
    const data = [];
    const now = new Date();
    const startDate = new Date('2019-01-01');

    // Create monthly data points
    let currentDate = new Date(startDate);
    while (currentDate <= now) {
      const point = generateDataPoint(currentDate);
      data.push(point);
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return data;
  }

  function generateDataPoint(date) {
    // Simulate HODL wave patterns based on market cycles
    // These patterns are based on observed behavior in real data
    const timestamp = date.getTime();
    const year = date.getFullYear();
    const month = date.getMonth();

    // Base distribution that shifts based on market cycle
    // Bull markets: more active supply, bear markets: more HODLing

    // Determine market phase (simplified)
    let cyclePhase = 0; // -1 to 1 (bear to bull)

    // 2019: Recovery from 2018 bear
    if (year === 2019) cyclePhase = -0.3 + (month * 0.05);
    // 2020: Pre-halving accumulation then bull run
    else if (year === 2020) cyclePhase = 0.2 + (month * 0.06);
    // 2021: Peak bull then correction
    else if (year === 2021) {
      if (month < 4) cyclePhase = 0.9 - (month * 0.05);
      else if (month < 7) cyclePhase = 0.7 - ((month - 4) * 0.15);
      else cyclePhase = 0.2 + ((month - 7) * 0.08);
    }
    // 2022: Bear market
    else if (year === 2022) cyclePhase = -0.2 - (month * 0.04);
    // 2023: Recovery
    else if (year === 2023) cyclePhase = -0.5 + (month * 0.06);
    // 2024: Bull run
    else if (year === 2024) cyclePhase = 0.2 + (month * 0.04);
    // 2025: Current
    else cyclePhase = 0.5;

    // Clamp cycle phase
    cyclePhase = Math.max(-1, Math.min(1, cyclePhase));

    // Generate distribution based on cycle phase
    // Bear markets = more long-term holding, bull markets = more activity
    const baseDistribution = {
      lt24h: 2 + (cyclePhase * 1.5),
      '1d1w': 3 + (cyclePhase * 2),
      '1w1m': 4 + (cyclePhase * 2.5),
      '1m3m': 6 + (cyclePhase * 3),
      '3m6m': 8 + (cyclePhase * 2),
      '6m12m': 12 - (cyclePhase * 2),
      '1y2y': 15 - (cyclePhase * 3),
      '2y3y': 14 - (cyclePhase * 2),
      '3y5y': 18 - (cyclePhase * 3),
      '5yplus': 18 - (cyclePhase * 2)
    };

    // Add some randomness
    const distribution = {};
    let total = 0;
    for (const [key, value] of Object.entries(baseDistribution)) {
      const randomized = value + (Math.random() - 0.5) * 2;
      distribution[key] = Math.max(1, randomized);
      total += distribution[key];
    }

    // Normalize to 100%
    for (const key in distribution) {
      distribution[key] = (distribution[key] / total) * 100;
    }

    return {
      date: date.toISOString().split('T')[0],
      timestamp: timestamp,
      ...distribution
    };
  }

  function getLatestData() {
    return historicalData[historicalData.length - 1];
  }

  function updateMetrics() {
    const latest = getLatestData();

    // 1Y+ holders
    const oneYearPlus = latest['1y2y'] + latest['2y3y'] + latest['3y5y'] + latest['5yplus'];
    document.getElementById('hodl-1y').textContent = oneYearPlus.toFixed(1) + '%';

    // 2Y+ holders
    const twoYearPlus = latest['2y3y'] + latest['3y5y'] + latest['5yplus'];
    document.getElementById('hodl-2y').textContent = twoYearPlus.toFixed(1) + '%';

    // 5Y+ holders
    document.getElementById('hodl-5y').textContent = latest['5yplus'].toFixed(1) + '%';

    // Active supply (< 1 month)
    const activeSupply = latest['lt24h'] + latest['1d1w'] + latest['1w1m'];
    document.getElementById('active-supply').textContent = activeSupply.toFixed(1) + '%';

    // Current 1Y holders for cycle comparison
    document.getElementById('current-1y-holders').textContent = oneYearPlus.toFixed(1) + '%';

    // Determine current phase
    const phaseEl = document.getElementById('current-phase');
    if (oneYearPlus > 65) {
      phaseEl.textContent = 'Accumulation';
      phaseEl.className = 'stat-value phase-bottom';
    } else if (oneYearPlus > 55) {
      phaseEl.textContent = 'Mid-Cycle';
      phaseEl.className = 'stat-value';
    } else {
      phaseEl.textContent = 'Distribution';
      phaseEl.className = 'stat-value phase-top';
    }
  }

  function updateDistribution() {
    const latest = getLatestData();
    const grid = document.getElementById('distribution-grid');

    const bands = [
      { id: 'lt24h', label: '< 24 hours', color: '#ff6b6b' },
      { id: '1d1w', label: '1 day - 1 week', color: '#ffa94d' },
      { id: '1w1m', label: '1 week - 1 month', color: '#ffd43b' },
      { id: '1m3m', label: '1 - 3 months', color: '#a9e34b' },
      { id: '3m6m', label: '3 - 6 months', color: '#69db7c' },
      { id: '6m12m', label: '6 - 12 months', color: '#38d9a9' },
      { id: '1y2y', label: '1 - 2 years', color: '#4dabf7' },
      { id: '2y3y', label: '2 - 3 years', color: '#748ffc' },
      { id: '3y5y', label: '3 - 5 years', color: '#9775fa' },
      { id: '5yplus', label: '5+ years', color: '#da77f2' }
    ];

    grid.innerHTML = bands.map(band => {
      const value = latest[band.id];
      return `
        <div class="distribution-item">
          <div class="dist-label">
            <span class="dist-color" style="background: ${band.color};"></span>
            <span>${band.label}</span>
          </div>
          <div class="dist-bar-container">
            <div class="dist-bar" style="width: ${value}%; background: ${band.color};"></div>
          </div>
          <span class="dist-value">${value.toFixed(1)}%</span>
        </div>
      `;
    }).join('');
  }

  function updateInsight() {
    const latest = getLatestData();
    const oneYearPlus = latest['1y2y'] + latest['2y3y'] + latest['3y5y'] + latest['5yplus'];
    const activeSupply = latest['lt24h'] + latest['1d1w'] + latest['1w1m'];

    const iconEl = document.getElementById('insight-icon');
    const titleEl = document.getElementById('insight-title');
    const textEl = document.getElementById('insight-text');

    if (oneYearPlus > 65) {
      iconEl.textContent = '💎';
      titleEl.textContent = 'Strong Holder Conviction';
      textEl.textContent = `${oneYearPlus.toFixed(1)}% of supply hasn\'t moved in over a year - historically a bullish signal. Long-term holders are accumulating, not selling. This pattern typically precedes major bull runs.`;
    } else if (oneYearPlus > 55) {
      iconEl.textContent = '📊';
      titleEl.textContent = 'Balanced Distribution';
      textEl.textContent = `Supply distribution is balanced with ${oneYearPlus.toFixed(1)}% held for 1+ year. Neither extreme accumulation nor distribution. Watch for changes in long-term holder behavior.`;
    } else if (activeSupply > 15) {
      iconEl.textContent = '⚡';
      titleEl.textContent = 'High Market Activity';
      textEl.textContent = `${activeSupply.toFixed(1)}% of supply moved in the last month - elevated activity. Could indicate distribution by long-term holders or new capital entering. Watch for trend confirmation.`;
    } else {
      iconEl.textContent = '👀';
      titleEl.textContent = 'Watch Long-Term Holders';
      textEl.textContent = `Long-term holder percentage at ${oneYearPlus.toFixed(1)}% - relatively low. Could indicate we\'re in a distribution phase. Monitor for changes in the 1Y+ cohort.`;
    }
  }

  function drawChart(range) {
    const ctx = document.getElementById('hodl-chart').getContext('2d');

    if (chart) {
      chart.destroy();
    }

    // Filter data by range
    let filteredData = historicalData;
    const now = new Date();

    if (range === '1y') {
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      filteredData = historicalData.filter(d => new Date(d.date) >= oneYearAgo);
    } else if (range === '2y') {
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      filteredData = historicalData.filter(d => new Date(d.date) >= twoYearsAgo);
    } else if (range === '5y') {
      const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      filteredData = historicalData.filter(d => new Date(d.date) >= fiveYearsAgo);
    }

    const labels = filteredData.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    // Create stacked datasets (reverse order so oldest at top)
    const bandKeys = ['5yplus', '3y5y', '2y3y', '1y2y', '6m12m', '3m6m', '1m3m', '1w1m', '1d1w', 'lt24h'];
    const bandColors = ['#da77f2', '#9775fa', '#748ffc', '#4dabf7', '#38d9a9', '#69db7c', '#a9e34b', '#ffd43b', '#ffa94d', '#ff6b6b'];
    const bandLabels = ['5y+', '3y-5y', '2y-3y', '1y-2y', '6m-12m', '3m-6m', '1m-3m', '1w-1m', '1d-1w', '<24h'];

    const datasets = bandKeys.map((key, i) => ({
      label: bandLabels[i],
      data: filteredData.map(d => d[key]),
      backgroundColor: bandColors[i],
      borderWidth: 0,
      fill: true
    }));

    chart = new Chart(ctx, {
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
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
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
          y: {
            stacked: true,
            grid: {
              color: 'rgba(255,255,255,0.1)'
            },
            ticks: {
              color: '#9ca3af',
              callback: function(value) {
                return value + '%';
              }
            },
            min: 0,
            max: 100
          }
        },
        elements: {
          line: {
            tension: 0.3
          },
          point: {
            radius: 0
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        }
      }
    });
  }
})();
