/**
 * Data Export Functionality
 * Export market data and reports to various formats (CSV, PDF, clipboard)
 */

(function() {
  'use strict';

  /**
   * Initialize export functionality
   */
  function init() {
    setupExportButtons();
  }

  /**
   * Setup export button event listeners
   */
  function setupExportButtons() {
    // Export current metrics to CSV
    const exportMetricsBtn = document.getElementById('btn-export-metrics-csv');
    if (exportMetricsBtn) {
      exportMetricsBtn.addEventListener('click', exportMetricsToCSV);
    }

    // Export historical data to CSV
    const exportHistoricalBtn = document.getElementById('btn-export-historical-csv');
    if (exportHistoricalBtn) {
      exportHistoricalBtn.addEventListener('click', exportHistoricalToCSV);
    }

    // Export report to PDF
    const exportReportBtn = document.getElementById('btn-export-report-pdf');
    if (exportReportBtn) {
      exportReportBtn.addEventListener('click', exportReportToPDF);
    }

    // Copy to clipboard
    const copyBtn = document.getElementById('btn-copy-metrics');
    if (copyBtn) {
      copyBtn.addEventListener('click', copyMetricsToClipboard);
    }

    // Export alerts to CSV
    const exportAlertsBtn = document.getElementById('btn-export-alerts-csv');
    if (exportAlertsBtn) {
      exportAlertsBtn.addEventListener('click', exportAlertsToCSV);
    }
  }

  /**
   * Export current metrics to CSV
   */
  async function exportMetricsToCSV() {
    try {
      showExportProgress('Preparing metrics export...');

      // Fetch current market data
      const response = await fetch('https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/main/data/market-snapshot.json?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();

      // Prepare CSV data
      const rows = [
        ['Metric', 'Value', 'Category', 'Timestamp'],
        ['BTC Price', formatCurrency(data.btc?.price), 'Price', new Date().toISOString()],
        ['24h Change', formatPercent(data.btc?.change24h), 'Price', new Date().toISOString()],
        ['7d Change', formatPercent(data.btc?.change7d), 'Price', new Date().toISOString()],
        ['Volume 24h', formatCurrency(data.btc?.volume24h), 'Volume', new Date().toISOString()],
        ['Market Cap', formatCurrency(data.btc?.marketCap), 'Market', new Date().toISOString()],
        ['Dominance', formatPercent(data.btc?.dominance), 'Market', new Date().toISOString()],
        ['Fear & Greed', data.sentiment?.fearGreed || 'N/A', 'Sentiment', new Date().toISOString()],
        ['Funding Rate', formatPercent(data.derivatives?.fundingRate), 'Derivatives', new Date().toISOString()],
        ['Open Interest', formatCurrency(data.derivatives?.openInterest), 'Derivatives', new Date().toISOString()],
        ['Long/Short Ratio', data.derivatives?.longShortRatio?.toFixed(2) || 'N/A', 'Derivatives', new Date().toISOString()],
        ['RSI', data.technical?.rsi?.toFixed(2) || 'N/A', 'Technical', new Date().toISOString()],
        ['MVRV', data.onchain?.mvrv?.toFixed(2) || 'N/A', 'On-Chain', new Date().toISOString()],
        ['SOPR', data.profitability?.sopr?.toFixed(3) || 'N/A', 'On-Chain', new Date().toISOString()],
        ['NUPL', formatPercent(data.onchain?.nupl), 'On-Chain', new Date().toISOString()],
        ['NVT', data.onchain?.nvt?.toFixed(1) || 'N/A', 'On-Chain', new Date().toISOString()],
      ];

      const csv = rows.map(row => row.join(',')).join('\n');
      downloadCSV(csv, `btc-metrics-${getDateString()}.csv`);

      hideExportProgress();
      showToast('Metrics exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export metrics:', error);
      hideExportProgress();
      showToast('Failed to export metrics', 'error');
    }
  }

  /**
   * Export historical data to CSV
   */
  async function exportHistoricalToCSV() {
    try {
      showExportProgress('Preparing historical export...');

      // This would fetch historical data
      // For now, show coming soon message
      hideExportProgress();
      showToast('Historical export coming soon!', 'info');
    } catch (error) {
      console.error('Failed to export historical data:', error);
      hideExportProgress();
      showToast('Failed to export historical data', 'error');
    }
  }

  /**
   * Export alerts to CSV
   */
  async function exportAlertsToCSV() {
    try {
      showExportProgress('Preparing alerts export...');

      const response = await fetch('https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/main/data/triggered-alerts.json?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();

      if (!data.alerts || data.alerts.length === 0) {
        showToast('No alerts to export', 'info');
        hideExportProgress();
        return;
      }

      // Prepare CSV data
      const rows = [
        ['Timestamp', 'Name', 'Category', 'Severity', 'Message', 'Current Value', 'Threshold', 'Acknowledged']
      ];

      data.alerts.forEach(alert => {
        rows.push([
          new Date(alert.timestamp).toISOString(),
          alert.name,
          alert.category,
          alert.severity,
          alert.message,
          alert.currentValue,
          alert.threshold,
          alert.acknowledged ? 'Yes' : 'No'
        ]);
      });

      const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      downloadCSV(csv, `btc-alerts-${getDateString()}.csv`);

      hideExportProgress();
      showToast('Alerts exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export alerts:', error);
      hideExportProgress();
      showToast('Failed to export alerts', 'error');
    }
  }

  /**
   * Export report to PDF
   */
  async function exportReportToPDF() {
    try {
      showExportProgress('Generating PDF...');

      // Check if html2canvas and jsPDF are available
      if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        hideExportProgress();
        showToast('PDF libraries not loaded. Please refresh the page.', 'error');
        return;
      }

      const reportContainer = document.getElementById('market-report-container');
      if (!reportContainer) {
        throw new Error('Report container not found');
      }

      // Capture report as canvas
      const canvas = await html2canvas(reportContainer, {
        scale: 2,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Convert to PDF
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`btc-market-report-${getDateString()}.pdf`);

      hideExportProgress();
      showToast('Report exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      hideExportProgress();
      showToast('Failed to export PDF', 'error');
    }
  }

  /**
   * Copy metrics to clipboard
   */
  async function copyMetricsToClipboard() {
    try {
      const response = await fetch('https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/main/data/market-snapshot.json?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();

      // Format as text
      const text = `
Bitcoin Market Metrics
Generated: ${new Date().toLocaleString()}

Price Data:
- Price: ${formatCurrency(data.btc?.price)}
- 24h Change: ${formatPercent(data.btc?.change24h)}
- 7d Change: ${formatPercent(data.btc?.change7d)}
- Volume 24h: ${formatCurrency(data.btc?.volume24h)}
- Market Cap: ${formatCurrency(data.btc?.marketCap)}
- Dominance: ${formatPercent(data.btc?.dominance)}

Sentiment:
- Fear & Greed Index: ${data.sentiment?.fearGreed || 'N/A'}

Derivatives:
- Funding Rate: ${formatPercent(data.derivatives?.fundingRate)}
- Open Interest: ${formatCurrency(data.derivatives?.openInterest)}
- Long/Short Ratio: ${data.derivatives?.longShortRatio?.toFixed(2) || 'N/A'}

On-Chain:
- MVRV: ${data.onchain?.mvrv?.toFixed(2) || 'N/A'}
- SOPR: ${data.profitability?.sopr?.toFixed(3) || 'N/A'}
- NUPL: ${formatPercent(data.onchain?.nupl)}
- NVT: ${data.onchain?.nvt?.toFixed(1) || 'N/A'}

Technical:
- RSI: ${data.technical?.rsi?.toFixed(2) || 'N/A'}
      `.trim();

      await navigator.clipboard.writeText(text);
      showToast('Metrics copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast('Failed to copy to clipboard', 'error');
    }
  }

  /**
   * Download CSV file
   */
  function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Format currency
   */
  function formatCurrency(value) {
    if (typeof value !== 'number') return 'N/A';
    return '$' + value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  /**
   * Format percentage
   */
  function formatPercent(value) {
    if (typeof value !== 'number') return 'N/A';
    return (value > 0 ? '+' : '') + value.toFixed(2) + '%';
  }

  /**
   * Get date string for filename
   */
  function getDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Show export progress
   */
  function showExportProgress(message) {
    const progressEl = document.getElementById('export-progress');
    if (progressEl) {
      progressEl.textContent = message;
      progressEl.style.display = 'block';
    }
  }

  /**
   * Hide export progress
   */
  function hideExportProgress() {
    const progressEl = document.getElementById('export-progress');
    if (progressEl) {
      progressEl.style.display = 'none';
    }
  }

  /**
   * Show toast notification
   */
  function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for testing
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      formatCurrency,
      formatPercent,
      getDateString
    };
  }
})();
