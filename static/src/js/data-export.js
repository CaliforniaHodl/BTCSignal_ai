/**
 * Data Export Functionality
 * Phase 18: Export market data to CSV, JSON, Excel formats
 * Supports: metrics, alerts, signals, paper trading journal
 */

(function() {
  'use strict';

  // Export format types
  const FORMATS = {
    CSV: 'csv',
    JSON: 'json',
    EXCEL: 'xlsx'
  };

  // Data source URLs
  const DATA_URLS = {
    market: 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/master/data/market-snapshot.json',
    alerts: 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/master/data/triggered-alerts.json',
    signals: 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/master/data/signal-history.json',
    onchain: 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/master/data/onchain-history.json'
  };

  /**
   * Initialize export functionality
   */
  function init() {
    setupExportButtons();
    setupFormatSelectors();
    setupWidgetExportButtons();
  }

  /**
   * Setup export button event listeners
   */
  function setupExportButtons() {
    // Export current metrics to CSV
    const exportMetricsBtn = document.getElementById('btn-export-metrics-csv');
    if (exportMetricsBtn) {
      exportMetricsBtn.addEventListener('click', () => exportMetrics('csv'));
    }

    // Export metrics to JSON
    const exportMetricsJsonBtn = document.getElementById('btn-export-metrics-json');
    if (exportMetricsJsonBtn) {
      exportMetricsJsonBtn.addEventListener('click', () => exportMetrics('json'));
    }

    // Export metrics to Excel
    const exportMetricsExcelBtn = document.getElementById('btn-export-metrics-xlsx');
    if (exportMetricsExcelBtn) {
      exportMetricsExcelBtn.addEventListener('click', () => exportMetrics('xlsx'));
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

    // Export alerts
    const exportAlertsBtn = document.getElementById('btn-export-alerts-csv');
    if (exportAlertsBtn) {
      exportAlertsBtn.addEventListener('click', () => exportAlerts('csv'));
    }

    // Export signals
    const exportSignalsBtn = document.getElementById('btn-export-signals');
    if (exportSignalsBtn) {
      exportSignalsBtn.addEventListener('click', () => exportSignals('csv'));
    }

    // Export paper trading
    const exportPaperBtn = document.getElementById('btn-export-paper-trading');
    if (exportPaperBtn) {
      exportPaperBtn.addEventListener('click', () => exportPaperTrading('csv'));
    }

    // Bulk export all
    const bulkExportBtn = document.getElementById('btn-bulk-export');
    if (bulkExportBtn) {
      bulkExportBtn.addEventListener('click', bulkExportAll);
    }
  }

  /**
   * Setup format selector dropdowns
   */
  function setupFormatSelectors() {
    document.querySelectorAll('.export-format-select').forEach(select => {
      select.addEventListener('change', function() {
        const dataType = this.dataset.type;
        const format = this.value;
        triggerExport(dataType, format);
      });
    });
  }

  /**
   * Setup export buttons on dashboard widgets
   */
  function setupWidgetExportButtons() {
    document.querySelectorAll('[data-export-widget]').forEach(btn => {
      btn.addEventListener('click', function() {
        const widgetId = this.dataset.exportWidget;
        const format = this.dataset.format || 'csv';
        exportWidget(widgetId, format);
      });
    });
  }

  /**
   * Trigger export by data type
   */
  function triggerExport(dataType, format) {
    switch(dataType) {
      case 'metrics': exportMetrics(format); break;
      case 'alerts': exportAlerts(format); break;
      case 'signals': exportSignals(format); break;
      case 'paper': exportPaperTrading(format); break;
      default: console.warn('Unknown export type:', dataType);
    }
  }

  /**
   * Export current metrics (supports CSV, JSON, Excel)
   */
  async function exportMetrics(format = 'csv') {
    try {
      showExportProgress('Preparing metrics export...');

      // Fetch current market data
      const response = await fetch(DATA_URLS.market + '?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      const timestamp = new Date().toISOString();

      // Prepare structured data
      const metricsData = [
        { metric: 'BTC Price', value: data.btc?.price, formatted: formatCurrency(data.btc?.price), category: 'Price', timestamp },
        { metric: '24h Change', value: data.btc?.change24h, formatted: formatPercent(data.btc?.change24h), category: 'Price', timestamp },
        { metric: '7d Change', value: data.btc?.change7d, formatted: formatPercent(data.btc?.change7d), category: 'Price', timestamp },
        { metric: 'Volume 24h', value: data.btc?.volume24h, formatted: formatCurrency(data.btc?.volume24h), category: 'Volume', timestamp },
        { metric: 'Market Cap', value: data.btc?.marketCap, formatted: formatCurrency(data.btc?.marketCap), category: 'Market', timestamp },
        { metric: 'Dominance', value: data.btc?.dominance, formatted: formatPercent(data.btc?.dominance), category: 'Market', timestamp },
        { metric: 'Fear & Greed', value: data.sentiment?.fearGreed, formatted: data.sentiment?.fearGreed || 'N/A', category: 'Sentiment', timestamp },
        { metric: 'Funding Rate', value: data.derivatives?.fundingRate, formatted: formatPercent(data.derivatives?.fundingRate), category: 'Derivatives', timestamp },
        { metric: 'Open Interest', value: data.derivatives?.openInterest, formatted: formatCurrency(data.derivatives?.openInterest), category: 'Derivatives', timestamp },
        { metric: 'Long/Short Ratio', value: data.derivatives?.longShortRatio, formatted: data.derivatives?.longShortRatio?.toFixed(2) || 'N/A', category: 'Derivatives', timestamp },
        { metric: 'Liquidations 24h', value: data.derivatives?.liquidations24h, formatted: formatCurrency(data.derivatives?.liquidations24h), category: 'Derivatives', timestamp },
        { metric: 'RSI', value: data.technical?.rsi, formatted: data.technical?.rsi?.toFixed(2) || 'N/A', category: 'Technical', timestamp },
        { metric: 'MVRV', value: data.onchain?.mvrv, formatted: data.onchain?.mvrv?.toFixed(2) || 'N/A', category: 'On-Chain', timestamp },
        { metric: 'SOPR', value: data.profitability?.sopr, formatted: data.profitability?.sopr?.toFixed(3) || 'N/A', category: 'On-Chain', timestamp },
        { metric: 'NUPL', value: data.onchain?.nupl, formatted: formatPercent(data.onchain?.nupl), category: 'On-Chain', timestamp },
        { metric: 'NVT', value: data.onchain?.nvt, formatted: data.onchain?.nvt?.toFixed(1) || 'N/A', category: 'On-Chain', timestamp },
        { metric: 'Puell Multiple', value: data.onchain?.puellMultiple, formatted: data.onchain?.puellMultiple?.toFixed(2) || 'N/A', category: 'On-Chain', timestamp },
        { metric: 'Exchange Netflow', value: data.onchain?.exchangeNetflow24h, formatted: (data.onchain?.exchangeNetflow24h || 0).toLocaleString() + ' BTC', category: 'On-Chain', timestamp },
      ];

      const filename = `btc-metrics-${getDateString()}`;

      switch(format) {
        case 'json':
          downloadJSON({ exportedAt: timestamp, metrics: metricsData, source: 'BTCSignal.ai' }, filename);
          break;
        case 'xlsx':
          await downloadExcel(metricsData, filename, 'Metrics');
          break;
        default:
          const csv = arrayToCSV(metricsData, ['metric', 'formatted', 'category', 'timestamp']);
          downloadCSV(csv, filename + '.csv');
      }

      hideExportProgress();
      showToast(`Metrics exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Failed to export metrics:', error);
      hideExportProgress();
      showToast('Failed to export metrics', 'error');
    }
  }

  // Alias for backward compatibility
  const exportMetricsToCSV = () => exportMetrics('csv');

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
   * Export alerts (CSV, JSON, Excel)
   */
  async function exportAlerts(format = 'csv') {
    try {
      showExportProgress('Preparing alerts export...');

      const response = await fetch(DATA_URLS.alerts + '?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch alerts');

      const data = await response.json();

      if (!data.alerts || data.alerts.length === 0) {
        showToast('No alerts to export', 'info');
        hideExportProgress();
        return;
      }

      // Prepare structured data
      const alertsData = data.alerts.map(alert => ({
        timestamp: new Date(alert.timestamp).toISOString(),
        name: alert.name,
        category: alert.category,
        severity: alert.severity,
        message: alert.message,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
        acknowledged: alert.acknowledged ? 'Yes' : 'No'
      }));

      const filename = `btc-alerts-${getDateString()}`;

      switch(format) {
        case 'json':
          downloadJSON({ exportedAt: new Date().toISOString(), alerts: alertsData, stats: data.stats, source: 'BTCSignal.ai' }, filename);
          break;
        case 'xlsx':
          await downloadExcel(alertsData, filename, 'Alerts');
          break;
        default:
          const csv = arrayToCSV(alertsData);
          downloadCSV(csv, filename + '.csv');
      }

      hideExportProgress();
      showToast(`Alerts exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Failed to export alerts:', error);
      hideExportProgress();
      showToast('Failed to export alerts', 'error');
    }
  }

  // Alias for backward compatibility
  const exportAlertsToCSV = () => exportAlerts('csv');

  /**
   * Export signal history (CSV, JSON, Excel)
   */
  async function exportSignals(format = 'csv') {
    try {
      showExportProgress('Preparing signals export...');

      // Try to fetch signal history
      let signalsData = [];

      try {
        const response = await fetch(DATA_URLS.signals + '?t=' + Date.now());
        if (response.ok) {
          const data = await response.json();
          signalsData = data.signals || [];
        }
      } catch (e) {
        // Fall back to posts if no signal history file
        console.log('Signal history not found, using local storage');
      }

      // Also check localStorage for any cached signals
      const cachedSignals = localStorage.getItem('btcsignal_signal_history');
      if (cachedSignals) {
        try {
          const cached = JSON.parse(cachedSignals);
          signalsData = [...signalsData, ...cached];
        } catch (e) {}
      }

      if (signalsData.length === 0) {
        showToast('No signal history to export', 'info');
        hideExportProgress();
        return;
      }

      // Dedupe and sort
      const uniqueSignals = Array.from(new Map(signalsData.map(s => [s.timestamp || s.date, s])).values())
        .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

      const filename = `btc-signals-${getDateString()}`;

      switch(format) {
        case 'json':
          downloadJSON({ exportedAt: new Date().toISOString(), signals: uniqueSignals, source: 'BTCSignal.ai' }, filename);
          break;
        case 'xlsx':
          await downloadExcel(uniqueSignals, filename, 'Signals');
          break;
        default:
          const csv = arrayToCSV(uniqueSignals);
          downloadCSV(csv, filename + '.csv');
      }

      hideExportProgress();
      showToast(`Signals exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Failed to export signals:', error);
      hideExportProgress();
      showToast('Failed to export signals', 'error');
    }
  }

  /**
   * Export paper trading journal (CSV, JSON, Excel)
   */
  async function exportPaperTrading(format = 'csv') {
    try {
      showExportProgress('Preparing paper trading export...');

      // Load from localStorage
      const tradesData = localStorage.getItem('btcsignal_paper_trades');
      const statsData = localStorage.getItem('btcsignal_paper_stats');

      if (!tradesData) {
        showToast('No paper trades to export', 'info');
        hideExportProgress();
        return;
      }

      const trades = JSON.parse(tradesData);
      const stats = statsData ? JSON.parse(statsData) : {};

      if (trades.length === 0) {
        showToast('No paper trades to export', 'info');
        hideExportProgress();
        return;
      }

      // Prepare structured data
      const exportData = trades.map(trade => ({
        timestamp: new Date(trade.timestamp).toISOString(),
        type: trade.type,
        direction: trade.direction,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice || '',
        size: trade.size,
        leverage: trade.leverage || 1,
        stopLoss: trade.stopLoss || '',
        takeProfit: trade.takeProfit || '',
        pnl: trade.pnl || 0,
        pnlPercent: trade.pnlPercent || 0,
        status: trade.status,
        notes: trade.notes || ''
      }));

      const filename = `paper-trading-${getDateString()}`;

      switch(format) {
        case 'json':
          downloadJSON({
            exportedAt: new Date().toISOString(),
            trades: exportData,
            summary: stats,
            source: 'BTCSignal.ai Paper Trading'
          }, filename);
          break;
        case 'xlsx':
          await downloadExcel(exportData, filename, 'Trades');
          break;
        default:
          const csv = arrayToCSV(exportData);
          downloadCSV(csv, filename + '.csv');
      }

      hideExportProgress();
      showToast(`Paper trades exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Failed to export paper trades:', error);
      hideExportProgress();
      showToast('Failed to export paper trades', 'error');
    }
  }

  /**
   * Bulk export all data
   */
  async function bulkExportAll() {
    try {
      showExportProgress('Preparing bulk export...');

      // Export all data types sequentially
      await exportMetrics('json');
      await new Promise(r => setTimeout(r, 500));
      await exportAlerts('json');
      await new Promise(r => setTimeout(r, 500));
      await exportSignals('json');
      await new Promise(r => setTimeout(r, 500));
      await exportPaperTrading('json');

      hideExportProgress();
      showToast('All data exported successfully', 'success');
    } catch (error) {
      console.error('Bulk export failed:', error);
      hideExportProgress();
      showToast('Bulk export failed', 'error');
    }
  }

  /**
   * Export widget-specific data
   */
  function exportWidget(widgetId, format = 'csv') {
    const widget = document.getElementById(widgetId);
    if (!widget) {
      showToast('Widget not found', 'error');
      return;
    }

    // Extract data from widget data attributes or content
    const data = widget.dataset.exportData;
    if (data) {
      try {
        const parsed = JSON.parse(data);
        const filename = `widget-${widgetId}-${getDateString()}`;

        if (format === 'json') {
          downloadJSON(parsed, filename);
        } else {
          const csv = arrayToCSV(Array.isArray(parsed) ? parsed : [parsed]);
          downloadCSV(csv, filename + '.csv');
        }
        showToast('Widget data exported', 'success');
      } catch (e) {
        showToast('Failed to parse widget data', 'error');
      }
    } else {
      showToast('No exportable data in widget', 'info');
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
   * Convert array of objects to CSV string
   */
  function arrayToCSV(data, columns = null) {
    if (!data || data.length === 0) return '';

    const headers = columns || Object.keys(data[0]);
    const rows = [headers.join(',')];

    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        // Escape quotes and wrap in quotes if contains comma or quote
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * Download CSV file
   */
  function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : filename + '.csv');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Download JSON file
   */
  function downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.json') ? filename : filename + '.json');
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Download Excel file using SheetJS (xlsx)
   * Falls back to CSV if library not loaded
   */
  async function downloadExcel(data, filename, sheetName = 'Sheet1') {
    // Check if XLSX library is available
    if (typeof XLSX === 'undefined') {
      // Try to load it dynamically
      try {
        await loadScript('https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js');
      } catch (e) {
        console.warn('XLSX library not available, falling back to CSV');
        const csv = arrayToCSV(data);
        downloadCSV(csv, filename + '.csv');
        showToast('Excel not available, exported as CSV instead', 'info');
        return;
      }
    }

    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Auto-size columns
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length))
      }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Generate and download
      XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
    } catch (e) {
      console.error('Excel export failed:', e);
      // Fallback to CSV
      const csv = arrayToCSV(data);
      downloadCSV(csv, filename + '.csv');
      showToast('Excel export failed, exported as CSV instead', 'info');
    }
  }

  /**
   * Dynamically load a script
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
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
