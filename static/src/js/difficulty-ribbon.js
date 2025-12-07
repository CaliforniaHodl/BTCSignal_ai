/**
 * Difficulty Ribbon - Bitcoin Mining Indicator
 * Shows difficulty moving averages and miner capitulation signals
 */

(function() {
  'use strict';

  let difficultyChart = null;
  let hashrateChart = null;
  let currentRange = '1y';

  // MA periods for the ribbon
  const maPeriods = [9, 14, 25, 40, 60, 90, 128, 200];
  const maColors = ['#ffd43b', '#a9e34b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#9775fa', '#da77f2'];

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    setupEventListeners();
    await fetchMiningData();
  }

  function setupEventListeners() {
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentRange = this.dataset.range;
        fetchMiningData();
      });
    });
  }

  async function fetchMiningData() {
    try {
      // Fetch difficulty data from mempool.space
      const diffRes = await fetch('https://mempool.space/api/v1/mining/difficulty-adjustments');
      const diffData = await diffRes.json();

      // Fetch hashrate data
      const hashRes = await fetch('https://mempool.space/api/v1/mining/hashrate/1y');
      const hashData = await hashRes.json();

      updateMetrics(diffData, hashData);
      drawDifficultyChart(diffData);
      drawHashrateChart(hashData);
      analyzeRibbon(diffData);

    } catch (error) {
      console.error('Error fetching mining data:', error);
      displayFallbackData();
    }
  }

  function updateMetrics(diffData, hashData) {
    // Current difficulty
    if (diffData && diffData.length > 0) {
      const latest = diffData[0];
      const difficulty = latest.difficulty;
      const diffFormatted = formatDifficulty(difficulty);
      document.getElementById('current-difficulty').textContent = diffFormatted;

      // Last adjustment
      const change = latest.difficultyChange;
      const changeEl = document.getElementById('difficulty-change');
      changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
      changeEl.className = 'metric-value ' + (change >= 0 ? 'positive' : 'negative');

      // Next adjustment estimate (roughly 2016 blocks from last)
      const blocksUntilAdj = 2016 - (latest.height % 2016);
      const daysUntil = Math.round(blocksUntilAdj * 10 / 60 / 24);
      document.getElementById('next-adjustment').textContent = '~' + daysUntil + ' days';
    }

    // Hash rate
    if (hashData && hashData.hashrates && hashData.hashrates.length > 0) {
      const latestHash = hashData.hashrates[hashData.hashrates.length - 1];
      const hashrate = latestHash.avgHashrate / 1e18; // Convert to EH/s
      document.getElementById('hash-rate').textContent = hashrate.toFixed(1);
    }
  }

  function formatDifficulty(diff) {
    if (diff >= 1e12) return (diff / 1e12).toFixed(2) + 'T';
    if (diff >= 1e9) return (diff / 1e9).toFixed(2) + 'B';
    if (diff >= 1e6) return (diff / 1e6).toFixed(2) + 'M';
    return diff.toLocaleString();
  }

  function drawDifficultyChart(data) {
    const ctx = document.getElementById('difficulty-chart');
    if (!ctx) return;

    if (difficultyChart) {
      difficultyChart.destroy();
    }

    // Process data for ribbon
    const processedData = processRibbonData(data);

    // Filter by range
    const filtered = filterByRange(processedData, currentRange);

    const labels = filtered.map(d => {
      const date = new Date(d.timestamp * 1000);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    // Create datasets for each MA
    const datasets = maPeriods.map((period, i) => ({
      label: period + 'D MA',
      data: filtered.map(d => d.mas[period] || null),
      borderColor: maColors[i],
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3
    }));

    // Add raw difficulty line
    datasets.unshift({
      label: 'Difficulty',
      data: filtered.map(d => d.difficulty),
      borderColor: '#f7931a',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      borderDash: [5, 5]
    });

    difficultyChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + formatDifficulty(context.parsed.y);
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: '#9ca3af', maxTicksLimit: 12 }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: {
              color: '#9ca3af',
              callback: function(value) { return formatDifficulty(value); }
            }
          }
        },
        interaction: { mode: 'index', intersect: false }
      }
    });
  }

  function drawHashrateChart(data) {
    const ctx = document.getElementById('hashrate-chart');
    if (!ctx || !data.hashrates) return;

    if (hashrateChart) {
      hashrateChart.destroy();
    }

    const filtered = data.hashrates.slice(-365); // Last year

    const labels = filtered.map(d => {
      const date = new Date(d.timestamp * 1000);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const hashrates = filtered.map(d => d.avgHashrate / 1e18); // EH/s

    hashrateChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Hash Rate (EH/s)',
          data: hashrates,
          borderColor: '#f7931a',
          backgroundColor: 'rgba(247, 147, 26, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.parsed.y.toFixed(1) + ' EH/s';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: { color: '#9ca3af', maxTicksLimit: 10 }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.1)' },
            ticks: {
              color: '#9ca3af',
              callback: function(value) { return value.toFixed(0) + ' EH/s'; }
            }
          }
        }
      }
    });
  }

  function processRibbonData(data) {
    if (!data || data.length === 0) return [];

    // Sort by time ascending
    const sorted = [...data].sort((a, b) => a.time - b.time);

    // Calculate MAs for each data point
    return sorted.map((d, i) => {
      const mas = {};
      maPeriods.forEach(period => {
        if (i >= period - 1) {
          const slice = sorted.slice(i - period + 1, i + 1);
          const avg = slice.reduce((sum, x) => sum + x.difficulty, 0) / period;
          mas[period] = avg;
        }
      });

      return {
        timestamp: d.time,
        difficulty: d.difficulty,
        mas
      };
    });
  }

  function filterByRange(data, range) {
    const now = Date.now() / 1000;
    const ranges = {
      '6m': 180 * 24 * 60 * 60,
      '1y': 365 * 24 * 60 * 60,
      '2y': 730 * 24 * 60 * 60,
      'all': Infinity
    };

    const cutoff = now - (ranges[range] || ranges['1y']);
    return data.filter(d => d.timestamp >= cutoff);
  }

  function analyzeRibbon(data) {
    const banner = document.getElementById('signal-banner');
    const icon = document.getElementById('ribbon-signal-icon');
    const title = document.getElementById('ribbon-signal-title');
    const desc = document.getElementById('ribbon-signal-desc');

    if (!data || data.length < 2) {
      title.textContent = 'Insufficient Data';
      desc.textContent = 'Unable to analyze difficulty ribbon.';
      return;
    }

    // Check recent difficulty changes
    const recentChanges = data.slice(0, 5);
    const negativeCount = recentChanges.filter(d => d.difficultyChange < 0).length;
    const avgChange = recentChanges.reduce((sum, d) => sum + d.difficultyChange, 0) / recentChanges.length;

    // Determine signal
    if (negativeCount >= 3 || avgChange < -5) {
      // Miner capitulation
      banner.className = 'card signal-banner bullish';
      icon.textContent = '🟢';
      title.textContent = 'Potential Buy Signal';
      desc.textContent = 'Difficulty has seen multiple negative adjustments. Historically, this indicates miner capitulation - often a good accumulation zone.';
    } else if (negativeCount >= 2 || avgChange < -2) {
      // Stress
      banner.className = 'card signal-banner caution';
      icon.textContent = '🟡';
      title.textContent = 'Miner Stress Detected';
      desc.textContent = 'Some negative difficulty adjustments observed. Miners may be under pressure. Watch for further capitulation signals.';
    } else if (avgChange > 5) {
      // Strong growth
      banner.className = 'card signal-banner neutral';
      icon.textContent = '📈';
      title.textContent = 'Strong Mining Growth';
      desc.textContent = 'Difficulty is increasing significantly. Hash rate is expanding as miners remain profitable. No capitulation signal.';
    } else {
      // Normal
      banner.className = 'card signal-banner neutral';
      icon.textContent = '📊';
      title.textContent = 'Normal Mining Conditions';
      desc.textContent = 'Difficulty adjustments are within normal range. No significant miner stress or capitulation detected.';
    }
  }

  function displayFallbackData() {
    document.getElementById('current-difficulty').textContent = '~95T';
    document.getElementById('difficulty-change').textContent = '+2.5%';
    document.getElementById('next-adjustment').textContent = '~7 days';
    document.getElementById('hash-rate').textContent = '~650';

    const title = document.getElementById('ribbon-signal-title');
    const desc = document.getElementById('ribbon-signal-desc');
    title.textContent = 'Data Temporarily Unavailable';
    desc.textContent = 'Unable to fetch live mining data. Please refresh to try again.';
  }

})();
