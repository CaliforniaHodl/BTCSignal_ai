// Dashboard BART Analysis Widget
// Provides detailed BART pattern analysis for the Pro Tools dashboard

(function() {
  'use strict';

  // Wait for BartDetector to be available
  function waitForBartDetector(callback, maxAttempts = 50) {
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      if (window.BartDetector) {
        clearInterval(check);
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(check);
        console.error('BartDetector not available');
      }
    }, 100);
  }

  const elements = {
    score: document.getElementById('dash-bart-score'),
    level: document.getElementById('dash-bart-level'),
    gauge: document.getElementById('dash-bart-gauge'),
    status: document.getElementById('dash-bart-status'),
    factors: document.getElementById('dash-bart-factors'),
    events: document.getElementById('dash-bart-events'),
    avgRisk: document.getElementById('dash-bart-avg'),
    peakRisk: document.getElementById('dash-bart-peak'),
    highTime: document.getElementById('dash-bart-high-time'),
    totalEvents: document.getElementById('dash-bart-total'),
    upEvents: document.getElementById('dash-bart-up'),
    downEvents: document.getElementById('dash-bart-down'),
    avgMagnitude: document.getElementById('dash-bart-magnitude'),
    clearBtn: document.getElementById('btn-clear-bart-history')
  };

  // Exit if not on dashboard page
  if (!elements.score) return;

  let riskChart = null;

  // =====================================================
  // GAUGE & DISPLAY UPDATES
  // =====================================================

  function updateRiskGauge(score) {
    elements.score.textContent = score;

    // Calculate gauge fill (SVG circle)
    const circumference = 2 * Math.PI * 45; // r=45
    const offset = circumference - (score / 100) * circumference;

    if (elements.gauge) {
      elements.gauge.style.strokeDasharray = circumference;
      elements.gauge.style.strokeDashoffset = offset;

      // Color based on risk level
      let color;
      if (score >= 70) color = '#dc3545'; // extreme - red
      else if (score >= 50) color = '#fd7e14'; // high - orange
      else if (score >= 30) color = '#ffc107'; // moderate - yellow
      else color = '#28a745'; // low - green

      elements.gauge.style.stroke = color;
    }

    // Update level text
    let level, levelClass;
    if (score >= 70) {
      level = 'EXTREME RISK';
      levelClass = 'extreme';
    } else if (score >= 50) {
      level = 'HIGH RISK';
      levelClass = 'high';
    } else if (score >= 30) {
      level = 'MODERATE RISK';
      levelClass = 'moderate';
    } else {
      level = 'LOW RISK';
      levelClass = 'low';
    }

    elements.level.textContent = level;
    elements.level.className = 'bart-gauge-label ' + levelClass;
    elements.score.className = 'bart-gauge-value ' + levelClass;

    // Status message
    let statusMsg;
    if (score >= 70) {
      statusMsg = 'High manipulation risk - exercise extreme caution with leveraged positions';
    } else if (score >= 50) {
      statusMsg = 'Elevated risk conditions - watch for sudden price reversals';
    } else if (score >= 30) {
      statusMsg = 'Moderate conditions - stay alert for developing patterns';
    } else {
      statusMsg = 'Normal market conditions - standard risk management applies';
    }
    elements.status.textContent = statusMsg;
  }

  function updateFactorsDisplay() {
    const data = window.BartDetector.getCurrentData();
    const riskHistory = window.BartDetector.getRiskHistory();

    // Get latest factors from history
    if (riskHistory.length === 0) {
      elements.factors.innerHTML = '<div class="loading">Loading factor data...</div>';
      return;
    }

    const latest = riskHistory[riskHistory.length - 1];
    const factors = latest.factors;

    const factorConfig = [
      { key: 'time', name: 'Market Hours', icon: '🕐', max: 20, desc: 'Weekend/off-peak liquidity risk' },
      { key: 'funding', name: 'Funding Rate', icon: '💰', max: 25, desc: 'Over-leveraged position risk' },
      { key: 'volatility', name: 'Volatility', icon: '📊', max: 20, desc: 'Volatility compression level' },
      { key: 'oiVolume', name: 'OI/Volume', icon: '📈', max: 20, desc: 'Open interest vs volume ratio' },
      { key: 'stagnation', name: 'Price Range', icon: '🎯', max: 15, desc: 'Price consolidation tightness' }
    ];

    let html = '';
    factorConfig.forEach(f => {
      const score = factors[f.key] || 0;
      const percentage = (score / f.max) * 100;
      const isWarning = percentage >= 60;

      html += `
        <div class="bart-factor-row ${isWarning ? 'warning' : ''}">
          <div class="factor-header">
            <span class="factor-icon">${f.icon}</span>
            <span class="factor-name">${f.name}</span>
            <span class="factor-score">${score}/${f.max}</span>
          </div>
          <div class="factor-bar-wrapper">
            <div class="factor-bar">
              <div class="factor-bar-fill ${isWarning ? 'warning' : ''}" style="width: ${percentage}%"></div>
            </div>
          </div>
          <div class="factor-desc">${f.desc}</div>
        </div>
      `;
    });

    elements.factors.innerHTML = html;
  }

  // =====================================================
  // RISK HISTORY CHART
  // =====================================================

  function updateRiskChart() {
    const riskHistory = window.BartDetector.getRiskHistory();

    if (riskHistory.length === 0) {
      elements.avgRisk.textContent = '--';
      elements.peakRisk.textContent = '--';
      elements.highTime.textContent = '--';
      return;
    }

    // Calculate stats
    const scores = riskHistory.map(h => h.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const peakScore = Math.max(...scores);
    const highRiskCount = scores.filter(s => s >= 50).length;
    const highRiskMinutes = Math.round((highRiskCount * 30) / 60); // 30s intervals

    elements.avgRisk.textContent = avgScore + '%';
    elements.peakRisk.textContent = peakScore + '%';
    elements.highTime.textContent = highRiskMinutes + ' min';

    // Prepare chart data (sample to max 100 points)
    const maxPoints = 100;
    const step = Math.max(1, Math.floor(riskHistory.length / maxPoints));
    const sampledData = [];
    const labels = [];

    for (let i = 0; i < riskHistory.length; i += step) {
      const h = riskHistory[i];
      sampledData.push(h.score);
      const date = new Date(h.timestamp);
      labels.push(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }

    const ctx = document.getElementById('bartRiskChart');
    if (!ctx) return;

    if (riskChart) {
      riskChart.data.labels = labels;
      riskChart.data.datasets[0].data = sampledData;
      riskChart.update('none');
    } else {
      riskChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'BART Risk %',
            data: sampledData,
            borderColor: '#f7931a',
            backgroundColor: 'rgba(247, 147, 26, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            subtitle: {
              display: true,
              text: '24-Hour Timeframe • 30-Second Intervals',
              color: '#6e7681',
              font: { size: 9, style: 'italic' },
              padding: { bottom: 5 }
            },
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  return 'Risk: ' + ctx.raw + '%';
                }
              }
            }
          },
          scales: {
            x: {
              display: true,
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: { color: '#888', maxTicksLimit: 8, font: { size: 8 } }
            },
            y: {
              display: true,
              min: 0,
              max: 100,
              grid: { color: 'rgba(255,255,255,0.1)' },
              ticks: {
                color: '#888',
                callback: function(val) { return val + '%'; }
              }
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      });
    }
  }

  // =====================================================
  // BART EVENTS HISTORY
  // =====================================================

  function updateEventsDisplay() {
    const events = window.BartDetector.getBartHistory();

    if (events.length === 0) {
      elements.events.innerHTML = '<div class="bart-event-empty">No BART events detected yet. Events are logged when price moves 2%+ and returns to origin.</div>';
      elements.totalEvents.textContent = '0';
      elements.upEvents.textContent = '0';
      elements.downEvents.textContent = '0';
      elements.avgMagnitude.textContent = '--%';
      return;
    }

    // Calculate stats
    const upEvents = events.filter(e => e.type === 'up').length;
    const downEvents = events.filter(e => e.type === 'down').length;
    const avgMagnitude = events.reduce((sum, e) => sum + e.magnitude, 0) / events.length;

    elements.totalEvents.textContent = events.length;
    elements.upEvents.textContent = upEvents;
    elements.downEvents.textContent = downEvents;
    elements.avgMagnitude.textContent = avgMagnitude.toFixed(1) + '%';

    // Build events list (show last 10)
    const recentEvents = events.slice(0, 10);
    let html = '';

    recentEvents.forEach(e => {
      const date = new Date(e.timestamp);
      const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const durationMin = Math.round(e.duration / 60000);
      const typeIcon = e.type === 'up' ? '📈' : '📉';
      const typeClass = e.type === 'up' ? 'up' : 'down';

      html += `
        <div class="bart-event-item ${typeClass}">
          <div class="event-header">
            <span class="event-type">${typeIcon} ${e.type.toUpperCase()} BART</span>
            <span class="event-time">${timeStr}</span>
          </div>
          <div class="event-details">
            <div class="event-detail">
              <span class="detail-label">Start</span>
              <span class="detail-value">$${e.startPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </div>
            <div class="event-detail">
              <span class="detail-label">Peak</span>
              <span class="detail-value ${typeClass}">$${e.peakPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </div>
            <div class="event-detail">
              <span class="detail-label">Magnitude</span>
              <span class="detail-value">${e.magnitude.toFixed(1)}%</span>
            </div>
            <div class="event-detail">
              <span class="detail-label">Duration</span>
              <span class="detail-value">${durationMin} min</span>
            </div>
            <div class="event-detail">
              <span class="detail-label">Risk at Time</span>
              <span class="detail-value">${e.riskScoreAtTime}%</span>
            </div>
          </div>
        </div>
      `;
    });

    if (events.length > 10) {
      html += `<div class="bart-events-more">+ ${events.length - 10} more events in history</div>`;
    }

    elements.events.innerHTML = html;
  }

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  function setupEventHandlers() {
    // Clear history button
    if (elements.clearBtn) {
      elements.clearBtn.addEventListener('click', () => {
        if (confirm('Clear all BART history data? This cannot be undone.')) {
          window.BartDetector.clearHistory();
          updateAll();
        }
      });
    }

    // Listen for new BART events
    window.addEventListener('bartDetected', (e) => {
      console.log('Dashboard: BART event detected', e.detail);
      updateEventsDisplay();

      // Flash notification
      const notification = document.createElement('div');
      notification.className = 'bart-notification';
      notification.innerHTML = `
        <span class="notif-icon">${e.detail.type === 'up' ? '📈' : '📉'}</span>
        <span class="notif-text">BART DETECTED: ${e.detail.magnitude.toFixed(1)}% ${e.detail.type} pattern</span>
      `;
      document.body.appendChild(notification);

      setTimeout(() => notification.classList.add('show'), 10);
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }, 5000);
    });
  }

  // =====================================================
  // UPDATE ALL
  // =====================================================

  function updateAll() {
    const currentRisk = window.BartDetector.getCurrentRisk();
    updateRiskGauge(currentRisk);
    updateFactorsDisplay();
    updateRiskChart();
    updateEventsDisplay();
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  function init() {
    waitForBartDetector(() => {
      updateAll();
      setupEventHandlers();

      // Update every 30 seconds
      setInterval(updateAll, 30000);
    });
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
