/**
 * Market Report Dashboard Widget
 * Displays daily market report with grade, highlights, and historical chart
 */

(function() {
  'use strict';

  const REPORT_CACHE_URL = 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/main/data/market-report.json';
  const HISTORY_CACHE_URL = 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/main/data/market-report-history.json';

  let reportData = null;
  let historyData = null;
  let gradeChart = null;

  /**
   * Initialize market report widget
   */
  function init() {
    loadMarketReport();
    loadReportHistory();
  }

  /**
   * Load current market report
   */
  async function loadMarketReport() {
    try {
      const response = await fetch(REPORT_CACHE_URL + '?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch report');

      reportData = await response.json();
      renderReport();
    } catch (error) {
      console.error('Failed to load market report:', error);
      showReportError();
    }
  }

  /**
   * Load report history
   */
  async function loadReportHistory() {
    try {
      const response = await fetch(HISTORY_CACHE_URL + '?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch history');

      historyData = await response.json();
      renderHistoricalChart();
    } catch (error) {
      console.error('Failed to load report history:', error);
    }
  }

  /**
   * Render market report
   */
  function renderReport() {
    if (!reportData) return;

    renderGrade();
    renderSummary();
    renderHighlights();
    renderWarnings();
    renderBreakdown();
    renderRecommendation();
  }

  /**
   * Render market grade
   */
  function renderGrade() {
    const gradeEl = document.getElementById('market-grade-value');
    const labelEl = document.getElementById('market-grade-label');
    const scoreEl = document.getElementById('market-grade-score');
    const dateEl = document.getElementById('market-report-date');

    if (gradeEl) {
      gradeEl.textContent = reportData.grade.grade;
      gradeEl.className = 'market-grade-value grade-' + getGradeClass(reportData.grade.grade);
    }

    if (labelEl) {
      labelEl.textContent = reportData.grade.label;
    }

    if (scoreEl) {
      scoreEl.textContent = reportData.grade.score.toFixed(0) + '/100';
    }

    if (dateEl) {
      dateEl.textContent = formatDate(reportData.date);
    }
  }

  /**
   * Render summary
   */
  function renderSummary() {
    const summaryEl = document.getElementById('market-summary-text');
    if (summaryEl) {
      summaryEl.textContent = reportData.summary;
    }

    // Signal badge
    const signalEl = document.getElementById('market-signal-badge');
    if (signalEl) {
      signalEl.textContent = reportData.signal.overall;
      signalEl.className = 'signal-badge signal-' + reportData.signal.overall.toLowerCase();
    }

    // Confidence
    const confidenceEl = document.getElementById('market-confidence');
    if (confidenceEl) {
      confidenceEl.textContent = reportData.signal.confidence + '%';
    }
  }

  /**
   * Render highlights
   */
  function renderHighlights() {
    const container = document.getElementById('market-highlights');
    if (!container) return;

    const bullishHighlights = reportData.highlights.filter(h => h.type === 'bullish');
    const bearishHighlights = reportData.highlights.filter(h => h.type === 'bearish');

    container.innerHTML = `
      <div class="highlights-section">
        <h4 class="highlights-title">
          <span class="highlights-icon bullish">📈</span>
          Bullish Factors
        </h4>
        <div class="highlights-list">
          ${bullishHighlights.length > 0 ? bullishHighlights.map(h => `
            <div class="highlight-item highlight-bullish impact-${h.impact}">
              <div class="highlight-header">
                <strong>${h.title}</strong>
                <span class="impact-badge impact-${h.impact}">${h.impact}</span>
              </div>
              <p>${h.description}</p>
            </div>
          `).join('') : '<p class="highlights-empty">No significant bullish factors</p>'}
        </div>
      </div>

      <div class="highlights-section">
        <h4 class="highlights-title">
          <span class="highlights-icon bearish">📉</span>
          Bearish Factors
        </h4>
        <div class="highlights-list">
          ${bearishHighlights.length > 0 ? bearishHighlights.map(h => `
            <div class="highlight-item highlight-bearish impact-${h.impact}">
              <div class="highlight-header">
                <strong>${h.title}</strong>
                <span class="impact-badge impact-${h.impact}">${h.impact}</span>
              </div>
              <p>${h.description}</p>
            </div>
          `).join('') : '<p class="highlights-empty">No significant bearish factors</p>'}
        </div>
      </div>
    `;
  }

  /**
   * Render warnings
   */
  function renderWarnings() {
    const container = document.getElementById('market-warnings');
    if (!container) return;

    if (reportData.warnings.length === 0) {
      container.innerHTML = `
        <div class="warnings-empty">
          <span class="warnings-empty-icon">✅</span>
          <p>No active warnings</p>
        </div>
      `;
      return;
    }

    container.innerHTML = reportData.warnings.map(w => `
      <div class="warning-item impact-${w.impact}">
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">
          <strong>${w.title}</strong>
          <p>${w.description}</p>
        </div>
        <span class="warning-impact-badge">${w.impact.toUpperCase()}</span>
      </div>
    `).join('');
  }

  /**
   * Render category breakdown
   */
  function renderBreakdown() {
    const container = document.getElementById('signal-breakdown');
    if (!container) return;

    const breakdown = reportData.signal.breakdown;
    const categories = [
      { key: 'technical', name: 'Technical Analysis', icon: '📊' },
      { key: 'onchain', name: 'On-Chain Metrics', icon: '⛓️' },
      { key: 'derivatives', name: 'Derivatives', icon: '📈' },
      { key: 'priceModels', name: 'Price Models', icon: '💹' },
      { key: 'sentiment', name: 'Sentiment', icon: '🎭' }
    ];

    container.innerHTML = categories.map(cat => {
      const data = breakdown[cat.key];
      return `
        <div class="breakdown-item">
          <div class="breakdown-header">
            <span class="breakdown-icon">${cat.icon}</span>
            <span class="breakdown-name">${cat.name}</span>
            <span class="breakdown-weight">${data.weight}%</span>
          </div>
          <div class="breakdown-signal signal-${data.signal.toLowerCase()}">${data.signal}</div>
          <div class="breakdown-bar">
            <div class="breakdown-fill" style="width: ${Math.abs(data.score)}%; background: ${getSignalColor(data.signal)}"></div>
          </div>
          <div class="breakdown-score">${data.score > 0 ? '+' : ''}${data.score.toFixed(1)}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render recommendation
   */
  function renderRecommendation() {
    const container = document.getElementById('market-recommendation');
    if (container) {
      container.innerHTML = `
        <div class="recommendation-content">
          <div class="recommendation-icon">💡</div>
          <p>${reportData.recommendation}</p>
        </div>
      `;
    }
  }

  /**
   * Render historical grade chart
   */
  function renderHistoricalChart() {
    if (!historyData || !historyData.reports || historyData.reports.length === 0) return;

    const canvas = document.getElementById('grade-history-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Prepare data (reverse to show oldest first)
    const reports = [...historyData.reports].reverse();
    const dates = reports.map(r => formatShortDate(r.date));
    const scores = reports.map(r => r.score);

    // Destroy existing chart
    if (gradeChart) {
      gradeChart.destroy();
    }

    // Create chart
    gradeChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Market Grade',
          data: scores,
          borderColor: '#f7931a',
          backgroundColor: 'rgba(247, 147, 26, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
          tension: 0.3
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
                const report = reports[context.dataIndex];
                return [
                  `Grade: ${report.grade}`,
                  `Score: ${report.score.toFixed(0)}/100`,
                  `Signal: ${report.signal}`
                ];
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: value => value + '/100'
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          }
        }
      }
    });
  }

  /**
   * Export report to PDF
   */
  function exportToPDF() {
    if (!reportData) return;

    alert('PDF export coming soon! This feature will generate a professional PDF report using jsPDF and html2canvas.');
  }

  /**
   * Get grade CSS class
   */
  function getGradeClass(grade) {
    const letter = grade.charAt(0);
    return letter.toLowerCase();
  }

  /**
   * Get signal color
   */
  function getSignalColor(signal) {
    const colors = {
      'Bullish': '#10b981',
      'Bearish': '#ef4444',
      'Neutral': '#6b7280'
    };
    return colors[signal] || colors.Neutral;
  }

  /**
   * Format date
   */
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format short date for chart
   */
  function formatShortDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Show error message
   */
  function showReportError() {
    const container = document.getElementById('market-report-container');
    if (container) {
      container.innerHTML = `
        <div class="report-error">
          <span class="report-error-icon">⚠️</span>
          <p>Failed to load market report</p>
          <button class="btn-retry" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export PDF button handler
  const exportBtn = document.getElementById('btn-export-report-pdf');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToPDF);
  }

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      formatDate,
      formatShortDate,
      getGradeClass,
      getSignalColor
    };
  }
})();
