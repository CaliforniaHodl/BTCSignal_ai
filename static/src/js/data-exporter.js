/**
 * Data Exporter Module - Sprint 11
 * Comprehensive export functionality for BTCSignal.ai
 * Supports CSV, JSON, and PDF exports for all data types
 *
 * Export Types:
 * - Trade journal entries
 * - Alert history
 * - Chart data
 * - Signal history
 * - Custom date ranges
 *
 * Features:
 * - CSV with proper escaping
 * - JSON with metadata
 * - PDF generation using HTML-to-canvas
 * - Modal UI for export options
 */

const ExportManager = (function() {
  'use strict';

  // Constants
  const EXPORT_FORMATS = {
    CSV: 'csv',
    JSON: 'json',
    PDF: 'pdf'
  };

  const EXPORT_TYPES = {
    TRADE_JOURNAL: 'trade_journal',
    ALERT_HISTORY: 'alert_history',
    CHART_DATA: 'chart_data',
    SIGNAL_HISTORY: 'signal_history',
    CUSTOM: 'custom'
  };

  const DATA_SOURCES = {
    market: 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/master/data/market-snapshot.json',
    alerts: 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/master/data/triggered-alerts.json',
    signals: 'https://raw.githubusercontent.com/CaliforniaHodl/BTCSignal_ai/master/data/signal-history.json'
  };

  const PDF_CONFIG = {
    watermark: {
      text: 'BTCSignal.ai',
      font: '14px Inter, sans-serif',
      color: 'rgba(247, 147, 26, 0.5)'
    },
    pageSize: 'a4',
    margin: 20,
    backgroundColor: '#ffffff'
  };

  // State
  let exportModal = null;
  let currentExportData = null;

  /**
   * Initialize the export manager
   */
  function init() {
    createExportModal();
    setupEventListeners();
    console.log('[ExportManager] Initialized');
  }

  // ==================== CSV EXPORT ====================

  /**
   * Export data as CSV with proper escaping
   * @param {Array} data - Array of objects to export
   * @param {string} filename - Output filename
   * @param {Object} options - Export options
   */
  function exportCSV(data, filename = 'export', options = {}) {
    try {
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No data to export');
      }

      const {
        columns = null,
        includeHeaders = true,
        delimiter = ',',
        dateFormat = 'iso'
      } = options;

      const csv = arrayToCSV(data, { columns, includeHeaders, delimiter, dateFormat });
      downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');

      showNotification(`Exported ${data.length} rows to CSV`, 'success');
      return true;
    } catch (error) {
      console.error('[ExportManager] CSV export failed:', error);
      showNotification('Failed to export CSV: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * Convert array of objects to CSV string with proper escaping
   * @param {Array} data - Array of objects
   * @param {Object} options - Conversion options
   * @returns {string} CSV string
   */
  function arrayToCSV(data, options = {}) {
    const {
      columns = null,
      includeHeaders = true,
      delimiter = ',',
      dateFormat = 'iso'
    } = options;

    if (!data || data.length === 0) return '';

    // Determine columns to include
    const headers = columns || Object.keys(data[0]);
    const rows = [];

    // Add headers
    if (includeHeaders) {
      rows.push(headers.map(h => escapeCSVValue(h, delimiter)).join(delimiter));
    }

    // Add data rows
    data.forEach(item => {
      const row = headers.map(header => {
        let value = item[header];

        // Format dates
        if (value instanceof Date) {
          value = dateFormat === 'iso' ? value.toISOString() : value.toLocaleString();
        } else if (typeof value === 'number' && header.toLowerCase().includes('timestamp')) {
          const date = new Date(value);
          value = dateFormat === 'iso' ? date.toISOString() : date.toLocaleString();
        }

        return escapeCSVValue(value, delimiter);
      });
      rows.push(row.join(delimiter));
    });

    return rows.join('\n');
  }

  /**
   * Escape CSV value according to RFC 4180
   * @param {*} value - Value to escape
   * @param {string} delimiter - Field delimiter
   * @returns {string} Escaped value
   */
  function escapeCSVValue(value, delimiter = ',') {
    if (value === null || value === undefined) return '';

    const stringValue = String(value);

    // Check if value needs to be quoted
    const needsQuotes = stringValue.includes(delimiter) ||
                       stringValue.includes('"') ||
                       stringValue.includes('\n') ||
                       stringValue.includes('\r');

    if (needsQuotes) {
      // Escape quotes by doubling them
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  // ==================== JSON EXPORT ====================

  /**
   * Export data as JSON with metadata
   * @param {*} data - Data to export (object or array)
   * @param {string} filename - Output filename
   * @param {Object} options - Export options
   */
  function exportJSON(data, filename = 'export', options = {}) {
    try {
      if (!data) {
        throw new Error('No data to export');
      }

      const {
        includeMetadata = true,
        pretty = true,
        metadata = {}
      } = options;

      let exportData = data;

      // Add metadata wrapper
      if (includeMetadata) {
        exportData = {
          metadata: {
            exportedAt: new Date().toISOString(),
            exportedBy: 'BTCSignal.ai Export Manager',
            version: '1.0',
            recordCount: Array.isArray(data) ? data.length : 1,
            ...metadata
          },
          data: data
        };
      }

      const json = pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
      downloadFile(json, `${filename}.json`, 'application/json;charset=utf-8;');

      const count = Array.isArray(data) ? data.length : 1;
      showNotification(`Exported ${count} record(s) to JSON`, 'success');
      return true;
    } catch (error) {
      console.error('[ExportManager] JSON export failed:', error);
      showNotification('Failed to export JSON: ' + error.message, 'error');
      return false;
    }
  }

  // ==================== PDF EXPORT ====================

  /**
   * Export data as PDF using HTML-to-canvas approach
   * @param {HTMLElement|string} element - Element or element ID to export
   * @param {string} filename - Output filename
   * @param {Object} options - Export options
   */
  async function exportPDF(element, filename = 'export', options = {}) {
    try {
      const targetElement = typeof element === 'string'
        ? document.getElementById(element)
        : element;

      if (!targetElement) {
        throw new Error('Target element not found');
      }

      const {
        title = 'BTCSignal.ai Export',
        orientation = 'portrait',
        format = 'a4',
        addWatermark = true,
        scale = 2
      } = options;

      showNotification('Generating PDF...', 'info');

      // Check if html2canvas is available
      if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas library is required for PDF export');
      }

      // Create a container for rendering
      const container = createPDFContainer(targetElement, title);
      document.body.appendChild(container);

      // Capture as canvas
      const canvas = await html2canvas(container, {
        backgroundColor: PDF_CONFIG.backgroundColor,
        scale: scale,
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight
      });

      // Add watermark if requested
      if (addWatermark) {
        addWatermarkToCanvas(canvas);
      }

      // Convert to PDF
      await canvasToPDF(canvas, filename, { orientation, format, title });

      // Cleanup
      document.body.removeChild(container);

      showNotification('PDF exported successfully', 'success');
      return true;
    } catch (error) {
      console.error('[ExportManager] PDF export failed:', error);
      showNotification('Failed to export PDF: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * Create a container for PDF rendering
   * @param {HTMLElement} element - Source element
   * @param {string} title - Document title
   * @returns {HTMLElement} Container element
   */
  function createPDFContainer(element, title) {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      background: #ffffff;
      padding: 40px;
      width: 800px;
      font-family: Inter, -apple-system, sans-serif;
      color: #000000;
    `;

    // Add title
    const titleEl = document.createElement('h1');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 24px;
      color: #f7931a;
    `;
    container.appendChild(titleEl);

    // Add timestamp
    const timestamp = document.createElement('p');
    timestamp.textContent = `Generated: ${new Date().toLocaleString()}`;
    timestamp.style.cssText = `
      margin: 0 0 20px 0;
      font-size: 12px;
      color: #666666;
    `;
    container.appendChild(timestamp);

    // Clone and append content
    const content = element.cloneNode(true);
    content.style.display = 'block';
    container.appendChild(content);

    // Add footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 10px;
      color: #666666;
      text-align: center;
    `;
    footer.textContent = 'Generated by BTCSignal.ai - Not financial advice. Always do your own research.';
    container.appendChild(footer);

    return container;
  }

  /**
   * Add watermark to canvas
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  function addWatermarkToCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.font = PDF_CONFIG.watermark.font;
    ctx.fillStyle = PDF_CONFIG.watermark.color;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    const padding = 15;
    ctx.fillText(
      PDF_CONFIG.watermark.text,
      canvas.width - padding,
      canvas.height - padding
    );
  }

  /**
   * Convert canvas to PDF and download
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {string} filename - Output filename
   * @param {Object} options - PDF options
   */
  async function canvasToPDF(canvas, filename, options = {}) {
    const { orientation = 'portrait', format = 'a4', title = 'Export' } = options;

    // Simple approach: convert canvas to image and create PDF link
    // For full PDF support, jsPDF library would be needed
    const imgData = canvas.toDataURL('image/png');

    // If jsPDF is available, use it
    if (typeof window.jspdf !== 'undefined') {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - PDF_CONFIG.margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(
        imgData,
        'PNG',
        PDF_CONFIG.margin,
        PDF_CONFIG.margin,
        imgWidth,
        Math.min(imgHeight, pageHeight - PDF_CONFIG.margin * 2)
      );

      pdf.save(`${filename}.pdf`);
    } else {
      // Fallback: download as PNG
      console.warn('[ExportManager] jsPDF not available, exporting as PNG instead');
      downloadFile(imgData, `${filename}.png`, 'image/png', true);
      showNotification('PDF library not loaded, exported as PNG', 'warning');
    }
  }

  // ==================== EXPORT TYPE HANDLERS ====================

  /**
   * Export trade journal entries
   * @param {Object} options - Export options
   */
  async function exportTradeJournal(options = {}) {
    try {
      const { format = EXPORT_FORMATS.CSV, dateRange = null } = options;

      // Load trade journal from localStorage
      const trades = localStorage.getItem('btcsignal_paper_trades');
      if (!trades) {
        throw new Error('No trade journal data found');
      }

      let data = JSON.parse(trades);

      // Filter by date range if specified
      if (dateRange && dateRange.start && dateRange.end) {
        data = filterByDateRange(data, dateRange.start, dateRange.end, 'timestamp');
      }

      // Prepare export data
      const exportData = data.map(trade => ({
        timestamp: new Date(trade.timestamp).toISOString(),
        date: new Date(trade.timestamp).toLocaleDateString(),
        type: trade.type || 'spot',
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
        notes: trade.notes || '',
        tags: Array.isArray(trade.tags) ? trade.tags.join(';') : ''
      }));

      const filename = `trade-journal-${getDateString()}`;

      switch (format) {
        case EXPORT_FORMATS.CSV:
          return exportCSV(exportData, filename);
        case EXPORT_FORMATS.JSON:
          return exportJSON(exportData, filename, {
            metadata: {
              type: 'Trade Journal',
              totalTrades: exportData.length,
              dateRange: dateRange || 'All'
            }
          });
        case EXPORT_FORMATS.PDF:
          return exportTradeJournalPDF(exportData, filename);
        default:
          throw new Error('Unsupported format: ' + format);
      }
    } catch (error) {
      console.error('[ExportManager] Trade journal export failed:', error);
      showNotification('Failed to export trade journal: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * Export alert history
   * @param {Object} options - Export options
   */
  async function exportAlertHistory(options = {}) {
    try {
      const { format = EXPORT_FORMATS.CSV, dateRange = null } = options;

      // Fetch from remote or localStorage
      let alertData = [];

      try {
        const response = await fetch(DATA_SOURCES.alerts + '?t=' + Date.now());
        if (response.ok) {
          const data = await response.json();
          alertData = data.alerts || [];
        }
      } catch (e) {
        console.warn('[ExportManager] Could not fetch remote alerts');
      }

      // Also check localStorage
      const localAlerts = localStorage.getItem('btcsignal_custom_alerts');
      if (localAlerts) {
        try {
          const parsed = JSON.parse(localAlerts);
          alertData = [...alertData, ...parsed];
        } catch (e) {
          console.warn('[ExportManager] Could not parse local alerts');
        }
      }

      if (alertData.length === 0) {
        throw new Error('No alert history found');
      }

      // Filter by date range if specified
      if (dateRange && dateRange.start && dateRange.end) {
        alertData = filterByDateRange(alertData, dateRange.start, dateRange.end, 'timestamp');
      }

      // Prepare export data
      const exportData = alertData.map(alert => ({
        timestamp: new Date(alert.timestamp || alert.createdAt).toISOString(),
        date: new Date(alert.timestamp || alert.createdAt).toLocaleDateString(),
        name: alert.name,
        category: alert.category,
        severity: alert.severity,
        metric: alert.metric || '',
        condition: alert.condition || '',
        threshold: alert.threshold || '',
        currentValue: alert.currentValue || '',
        message: alert.message || '',
        triggered: alert.lastTriggered ? 'Yes' : 'No',
        triggerCount: alert.triggerCount || 0,
        acknowledged: alert.acknowledged ? 'Yes' : 'No'
      }));

      const filename = `alert-history-${getDateString()}`;

      switch (format) {
        case EXPORT_FORMATS.CSV:
          return exportCSV(exportData, filename);
        case EXPORT_FORMATS.JSON:
          return exportJSON(exportData, filename, {
            metadata: {
              type: 'Alert History',
              totalAlerts: exportData.length,
              dateRange: dateRange || 'All'
            }
          });
        case EXPORT_FORMATS.PDF:
          return exportAlertHistoryPDF(exportData, filename);
        default:
          throw new Error('Unsupported format: ' + format);
      }
    } catch (error) {
      console.error('[ExportManager] Alert history export failed:', error);
      showNotification('Failed to export alert history: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * Export chart data
   * @param {Array} chartData - Chart data points
   * @param {Object} options - Export options
   */
  function exportChartData(chartData, options = {}) {
    try {
      const { format = EXPORT_FORMATS.CSV, dateRange = null } = options;

      if (!chartData || chartData.length === 0) {
        throw new Error('No chart data to export');
      }

      let data = chartData;

      // Filter by date range if specified
      if (dateRange && dateRange.start && dateRange.end) {
        data = filterByDateRange(data, dateRange.start, dateRange.end, 'time');
      }

      // Prepare export data
      const exportData = data.map(point => ({
        timestamp: point.time ? new Date(point.time * 1000).toISOString() : '',
        date: point.time ? new Date(point.time * 1000).toLocaleDateString() : '',
        open: point.open || point.value,
        high: point.high || point.value,
        low: point.low || point.value,
        close: point.close || point.value,
        volume: point.volume || 0
      }));

      const filename = `chart-data-${getDateString()}`;

      switch (format) {
        case EXPORT_FORMATS.CSV:
          return exportCSV(exportData, filename);
        case EXPORT_FORMATS.JSON:
          return exportJSON(exportData, filename, {
            metadata: {
              type: 'Chart Data',
              dataPoints: exportData.length,
              dateRange: dateRange || 'All'
            }
          });
        default:
          throw new Error('Unsupported format for chart data: ' + format);
      }
    } catch (error) {
      console.error('[ExportManager] Chart data export failed:', error);
      showNotification('Failed to export chart data: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * Export signal history
   * @param {Object} options - Export options
   */
  async function exportSignalHistory(options = {}) {
    try {
      const { format = EXPORT_FORMATS.CSV, dateRange = null } = options;

      // Fetch from remote or localStorage
      let signalData = [];

      try {
        const response = await fetch(DATA_SOURCES.signals + '?t=' + Date.now());
        if (response.ok) {
          const data = await response.json();
          signalData = data.signals || [];
        }
      } catch (e) {
        console.warn('[ExportManager] Could not fetch remote signals');
      }

      // Also check localStorage
      const localSignals = localStorage.getItem('btcsignal_signal_history');
      if (localSignals) {
        try {
          const parsed = JSON.parse(localSignals);
          signalData = [...signalData, ...parsed];
        } catch (e) {
          console.warn('[ExportManager] Could not parse local signals');
        }
      }

      if (signalData.length === 0) {
        throw new Error('No signal history found');
      }

      // Filter by date range if specified
      if (dateRange && dateRange.start && dateRange.end) {
        signalData = filterByDateRange(signalData, dateRange.start, dateRange.end, 'timestamp');
      }

      // Deduplicate
      const uniqueSignals = Array.from(
        new Map(signalData.map(s => [s.timestamp || s.date, s])).values()
      ).sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

      const filename = `signal-history-${getDateString()}`;

      switch (format) {
        case EXPORT_FORMATS.CSV:
          return exportCSV(uniqueSignals, filename);
        case EXPORT_FORMATS.JSON:
          return exportJSON(uniqueSignals, filename, {
            metadata: {
              type: 'Signal History',
              totalSignals: uniqueSignals.length,
              dateRange: dateRange || 'All'
            }
          });
        case EXPORT_FORMATS.PDF:
          return exportSignalHistoryPDF(uniqueSignals, filename);
        default:
          throw new Error('Unsupported format: ' + format);
      }
    } catch (error) {
      console.error('[ExportManager] Signal history export failed:', error);
      showNotification('Failed to export signal history: ' + error.message, 'error');
      return false;
    }
  }

  // ==================== PDF HELPERS ====================

  /**
   * Export trade journal as formatted PDF
   */
  function exportTradeJournalPDF(data, filename) {
    const html = generateTradeJournalHTML(data);
    return exportHTMLAsPDF(html, filename, 'Trade Journal Report');
  }

  /**
   * Export alert history as formatted PDF
   */
  function exportAlertHistoryPDF(data, filename) {
    const html = generateAlertHistoryHTML(data);
    return exportHTMLAsPDF(html, filename, 'Alert History Report');
  }

  /**
   * Export signal history as formatted PDF
   */
  function exportSignalHistoryPDF(data, filename) {
    const html = generateSignalHistoryHTML(data);
    return exportHTMLAsPDF(html, filename, 'Signal History Report');
  }

  /**
   * Generate HTML for trade journal
   */
  function generateTradeJournalHTML(trades) {
    const stats = calculateTradeStats(trades);

    return `
      <div style="font-family: Inter, sans-serif;">
        <h2 style="color: #f7931a; margin-bottom: 20px;">Trade Statistics</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
            <div style="font-size: 12px; color: #666;">Total Trades</div>
            <div style="font-size: 24px; font-weight: bold;">${stats.totalTrades}</div>
          </div>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
            <div style="font-size: 12px; color: #666;">Win Rate</div>
            <div style="font-size: 24px; font-weight: bold; color: ${stats.winRate >= 50 ? '#22c55e' : '#ef4444'};">
              ${stats.winRate.toFixed(1)}%
            </div>
          </div>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
            <div style="font-size: 12px; color: #666;">Total PnL</div>
            <div style="font-size: 24px; font-weight: bold; color: ${stats.totalPnL >= 0 ? '#22c55e' : '#ef4444'};">
              ${stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}%
            </div>
          </div>
        </div>

        <h2 style="color: #f7931a; margin-bottom: 15px;">Trade History</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 8px; text-align: left;">Date</th>
              <th style="padding: 8px; text-align: left;">Type</th>
              <th style="padding: 8px; text-align: right;">Entry</th>
              <th style="padding: 8px; text-align: right;">Exit</th>
              <th style="padding: 8px; text-align: right;">Size</th>
              <th style="padding: 8px; text-align: right;">PnL %</th>
              <th style="padding: 8px; text-align: left;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${trades.map(trade => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px;">${trade.date}</td>
                <td style="padding: 8px;">${trade.direction.toUpperCase()}</td>
                <td style="padding: 8px; text-align: right;">$${Number(trade.entryPrice).toLocaleString()}</td>
                <td style="padding: 8px; text-align: right;">${trade.exitPrice ? '$' + Number(trade.exitPrice).toLocaleString() : '-'}</td>
                <td style="padding: 8px; text-align: right;">${trade.size}</td>
                <td style="padding: 8px; text-align: right; color: ${trade.pnlPercent >= 0 ? '#22c55e' : '#ef4444'};">
                  ${trade.pnlPercent >= 0 ? '+' : ''}${Number(trade.pnlPercent).toFixed(2)}%
                </td>
                <td style="padding: 8px;">${trade.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Generate HTML for alert history
   */
  function generateAlertHistoryHTML(alerts) {
    return `
      <div style="font-family: Inter, sans-serif;">
        <h2 style="color: #f7931a; margin-bottom: 15px;">Alert History (${alerts.length} alerts)</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 8px; text-align: left;">Date</th>
              <th style="padding: 8px; text-align: left;">Alert</th>
              <th style="padding: 8px; text-align: left;">Category</th>
              <th style="padding: 8px; text-align: left;">Severity</th>
              <th style="padding: 8px; text-align: right;">Triggers</th>
            </tr>
          </thead>
          <tbody>
            ${alerts.map(alert => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px;">${alert.date}</td>
                <td style="padding: 8px;">${alert.name}</td>
                <td style="padding: 8px;">${alert.category}</td>
                <td style="padding: 8px;">
                  <span style="padding: 2px 8px; border-radius: 4px; background: ${getSeverityColor(alert.severity)}; font-size: 10px;">
                    ${alert.severity}
                  </span>
                </td>
                <td style="padding: 8px; text-align: right;">${alert.triggerCount || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Generate HTML for signal history
   */
  function generateSignalHistoryHTML(signals) {
    return `
      <div style="font-family: Inter, sans-serif;">
        <h2 style="color: #f7931a; margin-bottom: 15px;">Signal History (${signals.length} signals)</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
              <th style="padding: 8px; text-align: left;">Date</th>
              <th style="padding: 8px; text-align: left;">Signal</th>
              <th style="padding: 8px; text-align: left;">Type</th>
              <th style="padding: 8px; text-align: left;">Description</th>
            </tr>
          </thead>
          <tbody>
            ${signals.slice(0, 50).map(signal => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 8px;">${new Date(signal.timestamp || signal.date).toLocaleDateString()}</td>
                <td style="padding: 8px;">${signal.name || signal.signal || 'Signal'}</td>
                <td style="padding: 8px;">${signal.type || signal.category || 'N/A'}</td>
                <td style="padding: 8px; font-size: 10px;">${signal.description || signal.message || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Export HTML content as PDF
   */
  async function exportHTMLAsPDF(html, filename, title) {
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.cssText = 'position: absolute; left: -9999px; width: 800px; background: white; padding: 40px;';

    document.body.appendChild(container);

    try {
      await exportPDF(container, filename, { title });
      return true;
    } finally {
      document.body.removeChild(container);
    }
  }

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Download file to user's computer
   * @param {string|Blob} content - File content
   * @param {string} filename - Filename with extension
   * @param {string} mimeType - MIME type
   * @param {boolean} isDataUrl - Whether content is a data URL
   */
  function downloadFile(content, filename, mimeType, isDataUrl = false) {
    const link = document.createElement('a');

    if (isDataUrl) {
      link.href = content;
    } else {
      const blob = new Blob([content], { type: mimeType });
      link.href = URL.createObjectURL(blob);
    }

    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (!isDataUrl && link.href.startsWith('blob:')) {
      URL.revokeObjectURL(link.href);
    }
  }

  /**
   * Filter data by date range
   * @param {Array} data - Data array
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @param {string} dateField - Field name containing date
   * @returns {Array} Filtered data
   */
  function filterByDateRange(data, startDate, endDate, dateField = 'timestamp') {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return data.filter(item => {
      const itemDate = new Date(item[dateField]).getTime();
      return itemDate >= start && itemDate <= end;
    });
  }

  /**
   * Get current date string for filenames
   * @returns {string} Date string in YYYY-MM-DD format
   */
  function getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Calculate trade statistics
   */
  function calculateTradeStats(trades) {
    const closedTrades = trades.filter(t => t.status === 'closed');
    const winningTrades = closedTrades.filter(t => t.pnlPercent > 0);
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnlPercent || 0), 0);

    return {
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: closedTrades.length - winningTrades.length,
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
      totalPnL: totalPnL
    };
  }

  /**
   * Get severity color for styling
   */
  function getSeverityColor(severity) {
    const colors = {
      critical: 'rgba(239, 68, 68, 0.2)',
      warning: 'rgba(251, 191, 36, 0.2)',
      info: 'rgba(59, 130, 246, 0.2)'
    };
    return colors[severity] || colors.info;
  }

  /**
   * Show notification to user
   */
  function showNotification(message, type = 'info') {
    console.log(`[ExportManager] ${type.toUpperCase()}: ${message}`);

    // Use existing toast system if available
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else if (window.BTCSAIChartExport && window.BTCSAIChartExport.showToast) {
      window.BTCSAIChartExport.showToast(message, type);
    } else {
      // Fallback to console
      console.log(`[${type}] ${message}`);
    }
  }

  // ==================== MODAL UI ====================

  /**
   * Create export modal UI
   */
  function createExportModal() {
    if (exportModal) return exportModal;

    const modal = document.createElement('div');
    modal.id = 'export-modal';
    modal.className = 'export-modal';
    modal.innerHTML = `
      <div class="export-modal-overlay"></div>
      <div class="export-modal-content">
        <div class="export-modal-header">
          <h3>Export Data</h3>
          <button class="export-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="export-modal-body">
          <div class="export-form">
            <div class="form-group">
              <label>Export Type</label>
              <select id="export-type-select" class="form-control">
                <option value="trade_journal">Trade Journal</option>
                <option value="alert_history">Alert History</option>
                <option value="signal_history">Signal History</option>
                <option value="chart_data">Chart Data</option>
              </select>
            </div>

            <div class="form-group">
              <label>Format</label>
              <div class="format-options">
                <label class="format-option">
                  <input type="radio" name="export-format" value="csv" checked>
                  <span>CSV</span>
                </label>
                <label class="format-option">
                  <input type="radio" name="export-format" value="json">
                  <span>JSON</span>
                </label>
                <label class="format-option">
                  <input type="radio" name="export-format" value="pdf">
                  <span>PDF</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>
                <input type="checkbox" id="export-date-range-toggle">
                Custom Date Range
              </label>
            </div>

            <div id="export-date-range-inputs" style="display: none;">
              <div class="form-row">
                <div class="form-group">
                  <label>Start Date</label>
                  <input type="date" id="export-start-date" class="form-control">
                </div>
                <div class="form-group">
                  <label>End Date</label>
                  <input type="date" id="export-end-date" class="form-control">
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="export-modal-footer">
          <button class="btn btn-secondary" id="export-cancel-btn">Cancel</button>
          <button class="btn btn-primary" id="export-confirm-btn">Export</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    addModalStyles();
    setupModalEventListeners(modal);

    exportModal = modal;
    return modal;
  }

  /**
   * Setup modal event listeners
   */
  function setupModalEventListeners(modal) {
    const overlay = modal.querySelector('.export-modal-overlay');
    const closeBtn = modal.querySelector('.export-modal-close');
    const cancelBtn = modal.querySelector('#export-cancel-btn');
    const confirmBtn = modal.querySelector('#export-confirm-btn');
    const dateRangeToggle = modal.querySelector('#export-date-range-toggle');
    const dateRangeInputs = modal.querySelector('#export-date-range-inputs');

    const closeModal = () => {
      modal.style.display = 'none';
    };

    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    dateRangeToggle.addEventListener('change', (e) => {
      dateRangeInputs.style.display = e.target.checked ? 'block' : 'none';
    });

    confirmBtn.addEventListener('click', async () => {
      const exportType = modal.querySelector('#export-type-select').value;
      const format = modal.querySelector('input[name="export-format"]:checked').value;
      const useDateRange = dateRangeToggle.checked;

      let dateRange = null;
      if (useDateRange) {
        const startDate = modal.querySelector('#export-start-date').value;
        const endDate = modal.querySelector('#export-end-date').value;

        if (startDate && endDate) {
          dateRange = { start: new Date(startDate), end: new Date(endDate) };
        }
      }

      closeModal();
      await performExport(exportType, format, { dateRange });
    });
  }

  /**
   * Add modal styles
   */
  function addModalStyles() {
    if (document.getElementById('export-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'export-modal-styles';
    styles.textContent = `
      .export-modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000; }
      .export-modal.show { display: block; }
      .export-modal-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); }
      .export-modal-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1a1a2e; border-radius: 8px; min-width: 500px; max-width: 600px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
      .export-modal-header { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; }
      .export-modal-header h3 { margin: 0; color: #f7931a; font-size: 20px; }
      .export-modal-close { background: none; border: none; color: #d1d5db; font-size: 28px; cursor: pointer; padding: 0; width: 30px; height: 30px; line-height: 1; }
      .export-modal-close:hover { color: #ffffff; }
      .export-modal-body { padding: 20px; }
      .export-modal-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 10px; justify-content: flex-end; }
      .form-group { margin-bottom: 15px; }
      .form-group label { display: block; margin-bottom: 5px; color: #d1d5db; font-size: 14px; }
      .form-control { width: 100%; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: #ffffff; font-size: 14px; }
      .form-control:focus { outline: none; border-color: #f7931a; }
      .format-options { display: flex; gap: 15px; }
      .format-option { display: flex; align-items: center; gap: 6px; color: #d1d5db; cursor: pointer; }
      .format-option input[type="radio"] { cursor: pointer; }
      .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
      .btn { padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
      .btn-primary { background: #f7931a; color: #ffffff; }
      .btn-primary:hover { background: #e8860f; }
      .btn-secondary { background: rgba(255,255,255,0.1); color: #d1d5db; }
      .btn-secondary:hover { background: rgba(255,255,255,0.15); }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Show export modal
   * @param {string} exportType - Optional pre-selected export type
   */
  function showExportModal(exportType = null) {
    if (!exportModal) {
      createExportModal();
    }

    if (exportType) {
      const typeSelect = exportModal.querySelector('#export-type-select');
      if (typeSelect) {
        typeSelect.value = exportType;
      }
    }

    exportModal.classList.add('show');
    exportModal.style.display = 'block';
  }

  /**
   * Perform export based on type and format
   */
  async function performExport(exportType, format, options = {}) {
    switch (exportType) {
      case EXPORT_TYPES.TRADE_JOURNAL:
        return await exportTradeJournal({ format, ...options });
      case EXPORT_TYPES.ALERT_HISTORY:
        return await exportAlertHistory({ format, ...options });
      case EXPORT_TYPES.SIGNAL_HISTORY:
        return await exportSignalHistory({ format, ...options });
      case EXPORT_TYPES.CHART_DATA:
        if (currentExportData) {
          return exportChartData(currentExportData, { format, ...options });
        } else {
          showNotification('No chart data available for export', 'error');
          return false;
        }
      default:
        showNotification('Unknown export type: ' + exportType, 'error');
        return false;
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Listen for export button clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-export-type]')) {
        const exportType = e.target.dataset.exportType;
        showExportModal(exportType);
      }
    });
  }

  /**
   * Set chart data for export
   * @param {Array} data - Chart data
   */
  function setChartData(data) {
    currentExportData = data;
  }

  // ==================== PUBLIC API ====================

  return {
    // Initialize
    init,

    // Core export functions
    exportCSV,
    exportJSON,
    exportPDF,

    // Type-specific exports
    exportTradeJournal,
    exportAlertHistory,
    exportChartData,
    exportSignalHistory,

    // UI
    showExportModal,

    // Utilities
    setChartData,
    filterByDateRange,

    // Constants
    EXPORT_FORMATS,
    EXPORT_TYPES
  };
})();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ExportManager.init());
} else {
  ExportManager.init();
}

// Expose to window
if (typeof window !== 'undefined') {
  window.ExportManager = ExportManager;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportManager;
}
