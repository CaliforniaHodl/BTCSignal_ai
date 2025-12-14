/**
 * BTC Signal AI - Chart Export/Screenshot Utility
 * Export charts as PNG, PDF, or share to social media
 */

const BTCSAIChartExport = (function() {
  'use strict';

  // Configuration
  const CONFIG = {
    watermark: {
      text: 'btcsignal.ai',
      font: '14px Inter, sans-serif',
      color: 'rgba(247, 147, 26, 0.5)'
    },
    formats: ['png', 'jpeg', 'svg'],
    defaultFormat: 'png',
    defaultQuality: 0.95,
    socialSizes: {
      twitter: { width: 1200, height: 675 },
      instagram: { width: 1080, height: 1080 },
      facebook: { width: 1200, height: 630 }
    }
  };

  // ==================== SCREENSHOT ====================

  /**
   * Capture screenshot of an element
   * @param {string|Element} target - Element ID or DOM element
   * @param {Object} options - { format, quality, addWatermark, scale }
   * @returns {Promise<string>} - Data URL
   */
  async function capture(target, options = {}) {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) {
      throw new Error('Target element not found');
    }

    const {
      format = CONFIG.defaultFormat,
      quality = CONFIG.defaultQuality,
      addWatermark = true,
      scale = 2,
      backgroundColor = '#0d1117'
    } = options;

    // Check if html2canvas is available
    if (typeof html2canvas === 'undefined') {
      throw new Error('html2canvas library is required for screenshots');
    }

    // Capture the element
    const canvas = await html2canvas(element, {
      backgroundColor,
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false
    });

    // Add watermark if requested
    if (addWatermark) {
      addWatermarkToCanvas(canvas);
    }

    // Convert to data URL
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return canvas.toDataURL(mimeType, quality);
  }

  /**
   * Add watermark to canvas
   * @param {HTMLCanvasElement} canvas
   */
  function addWatermarkToCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.font = CONFIG.watermark.font;
    ctx.fillStyle = CONFIG.watermark.color;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    // Position in bottom right corner
    const padding = 15;
    ctx.fillText(CONFIG.watermark.text, canvas.width - padding, canvas.height - padding);
  }

  /**
   * Capture and download screenshot
   * @param {string|Element} target
   * @param {string} filename
   * @param {Object} options
   */
  async function captureAndDownload(target, filename = 'btc-chart', options = {}) {
    try {
      const dataUrl = await capture(target, options);
      const format = options.format || CONFIG.defaultFormat;

      // Create download link
      const link = document.createElement('a');
      link.download = `${filename}.${format}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return true;
    } catch (error) {
      console.error('[ChartExport] Screenshot error:', error);
      throw error;
    }
  }

  // ==================== EXPORT FORMATS ====================

  /**
   * Export chart data as CSV
   * @param {Array} data - Chart data array
   * @param {string} filename
   */
  function exportCSV(data, filename = 'chart-data') {
    if (!data || !data.length) {
      throw new Error('No data to export');
    }

    // Determine columns from first row
    const columns = Object.keys(data[0]);
    let csv = columns.join(',') + '\n';

    data.forEach(row => {
      const values = columns.map(col => {
        let val = row[col];
        // Handle dates
        if (col === 'time' || col === 'date') {
          val = new Date(val * 1000 || val).toISOString();
        }
        // Escape commas and quotes
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csv += values.join(',') + '\n';
    });

    downloadText(csv, `${filename}.csv`, 'text/csv');
  }

  /**
   * Export chart data as JSON
   * @param {Array|Object} data
   * @param {string} filename
   */
  function exportJSON(data, filename = 'chart-data') {
    const json = JSON.stringify(data, null, 2);
    downloadText(json, `${filename}.json`, 'application/json');
  }

  /**
   * Download text content as file
   * @param {string} content
   * @param {string} filename
   * @param {string} mimeType
   */
  function downloadText(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  // ==================== SOCIAL SHARING ====================

  /**
   * Capture screenshot optimized for social media
   * @param {string|Element} target
   * @param {string} platform - 'twitter', 'instagram', 'facebook'
   * @returns {Promise<string>}
   */
  async function captureForSocial(target, platform = 'twitter') {
    const size = CONFIG.socialSizes[platform] || CONFIG.socialSizes.twitter;

    // Capture at higher scale for quality
    const dataUrl = await capture(target, {
      scale: 3,
      addWatermark: true
    });

    // Resize to social media dimensions
    return resizeDataUrl(dataUrl, size.width, size.height);
  }

  /**
   * Resize data URL to specific dimensions
   * @param {string} dataUrl
   * @param {number} width
   * @param {number} height
   * @returns {Promise<string>}
   */
  function resizeDataUrl(dataUrl, width, height) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, width, height);

        // Calculate scaling to fit while maintaining aspect ratio
        const scale = Math.min(width / img.width, height / img.height);
        const x = (width - img.width * scale) / 2;
        const y = (height - img.height * scale) / 2;

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  }

  /**
   * Share to Twitter (opens in new window)
   * @param {string} text - Tweet text
   * @param {string} url - URL to include
   */
  function shareToTwitter(text, url = 'https://btcsignal.ai') {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, '_blank', 'width=600,height=400');
  }

  /**
   * Copy image to clipboard
   * @param {string|Element} target
   */
  async function copyToClipboard(target) {
    try {
      const dataUrl = await capture(target);

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);

      return true;
    } catch (error) {
      console.error('[ChartExport] Copy to clipboard failed:', error);
      throw error;
    }
  }

  // ==================== REPORT GENERATION ====================

  /**
   * Generate analysis report with chart
   * @param {Object} options
   * @returns {Promise<string>} - HTML report
   */
  async function generateReport(options = {}) {
    const {
      chartElement,
      title = 'BTC Analysis Report',
      indicators = {},
      signals = [],
      notes = ''
    } = options;

    // Capture chart if element provided
    let chartImage = '';
    if (chartElement) {
      chartImage = await capture(chartElement);
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #0d1117;
      color: #d1d5db;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #f7931a;
      margin: 0;
    }
    .header .date {
      color: #9ca3af;
      font-size: 14px;
    }
    .chart-container {
      margin: 20px 0;
      border-radius: 8px;
      overflow: hidden;
    }
    .chart-container img {
      width: 100%;
      display: block;
    }
    .section {
      background: rgba(255,255,255,0.05);
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .section h2 {
      color: #fff;
      margin-top: 0;
      font-size: 18px;
    }
    .indicator-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .indicator {
      background: rgba(255,255,255,0.05);
      padding: 10px;
      border-radius: 4px;
    }
    .indicator .label {
      color: #9ca3af;
      font-size: 12px;
    }
    .indicator .value {
      color: #fff;
      font-size: 18px;
      font-weight: 600;
    }
    .signal {
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
    }
    .signal.bullish { background: rgba(34, 197, 94, 0.2); border-left: 3px solid #22c55e; }
    .signal.bearish { background: rgba(239, 68, 68, 0.2); border-left: 3px solid #ef4444; }
    .signal.neutral { background: rgba(251, 191, 36, 0.2); border-left: 3px solid #fbbf24; }
    .notes {
      white-space: pre-wrap;
      line-height: 1.6;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
      color: #9ca3af;
      font-size: 12px;
    }
    .footer a { color: #f7931a; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p class="date">Generated on ${dateStr}</p>
  </div>

  ${chartImage ? `
  <div class="chart-container">
    <img src="${chartImage}" alt="Chart">
  </div>
  ` : ''}

  ${Object.keys(indicators).length > 0 ? `
  <div class="section">
    <h2>Key Indicators</h2>
    <div class="indicator-grid">
      ${Object.entries(indicators).map(([name, value]) => `
        <div class="indicator">
          <div class="label">${name}</div>
          <div class="value">${value}</div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${signals.length > 0 ? `
  <div class="section">
    <h2>Signals</h2>
    ${signals.map(s => `
      <div class="signal ${s.type || 'neutral'}">
        <strong>${s.name}</strong>: ${s.description}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${notes ? `
  <div class="section">
    <h2>Notes</h2>
    <div class="notes">${notes}</div>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated by <a href="https://btcsignal.ai">BTC Signal AI</a></p>
    <p>This is not financial advice. Always do your own research.</p>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Download report as HTML
   * @param {Object} options
   */
  async function downloadReport(options = {}) {
    const html = await generateReport(options);
    downloadText(html, 'btc-analysis-report.html', 'text/html');
  }

  // ==================== UI COMPONENT ====================

  /**
   * Create export dropdown UI
   * @param {string} containerId
   * @param {string|Element} chartTarget
   */
  function createExportUI(containerId, chartTarget) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="export-dropdown">
        <button class="export-btn" title="Export Chart">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
        <div class="export-menu">
          <button data-action="download-png">Download PNG</button>
          <button data-action="download-jpeg">Download JPEG</button>
          <button data-action="copy-clipboard">Copy to Clipboard</button>
          <hr>
          <button data-action="share-twitter">Share to Twitter</button>
          <hr>
          <button data-action="export-csv">Export Data (CSV)</button>
          <button data-action="export-json">Export Data (JSON)</button>
        </div>
      </div>
    `;

    // Add styles
    addExportStyles();

    // Event listeners
    const dropdown = container.querySelector('.export-dropdown');
    const btn = dropdown.querySelector('.export-btn');
    const menu = dropdown.querySelector('.export-menu');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      menu.classList.remove('show');
    });

    menu.querySelectorAll('button[data-action]').forEach(button => {
      button.addEventListener('click', async () => {
        const action = button.dataset.action;
        try {
          switch (action) {
            case 'download-png':
              await captureAndDownload(chartTarget, 'btc-chart', { format: 'png' });
              break;
            case 'download-jpeg':
              await captureAndDownload(chartTarget, 'btc-chart', { format: 'jpeg' });
              break;
            case 'copy-clipboard':
              await copyToClipboard(chartTarget);
              showToast('Copied to clipboard!');
              break;
            case 'share-twitter':
              const price = document.getElementById('header-price')?.textContent || 'BTC';
              shareToTwitter(`${price} Bitcoin Analysis from @BTCSignalAI`);
              break;
            case 'export-csv':
              // Would need chart data passed in
              showToast('Data export coming soon');
              break;
            case 'export-json':
              showToast('Data export coming soon');
              break;
          }
        } catch (error) {
          showToast('Export failed: ' + error.message, 'error');
        }
        menu.classList.remove('show');
      });
    });
  }

  /**
   * Add export UI styles
   */
  function addExportStyles() {
    if (document.getElementById('export-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'export-styles';
    styles.textContent = `
      .export-dropdown {
        position: relative;
        display: inline-block;
      }
      .export-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: #d1d5db;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: all 0.2s;
      }
      .export-btn:hover {
        background: rgba(255,255,255,0.15);
      }
      .export-menu {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 5px;
        background: #1a1a2e;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        padding: 5px;
        min-width: 180px;
        display: none;
        z-index: 100;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
      }
      .export-menu.show {
        display: block;
      }
      .export-menu button {
        display: block;
        width: 100%;
        padding: 8px 12px;
        background: none;
        border: none;
        color: #d1d5db;
        text-align: left;
        cursor: pointer;
        border-radius: 4px;
        font-size: 13px;
      }
      .export-menu button:hover {
        background: rgba(255,255,255,0.1);
      }
      .export-menu hr {
        border: none;
        border-top: 1px solid rgba(255,255,255,0.1);
        margin: 5px 0;
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Show toast notification
   * @param {string} message
   * @param {string} type
   */
  function showToast(message, type = 'success') {
    // Use existing Toast if available
    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show(message, type);
      return;
    }

    // Simple fallback toast
    const toast = document.createElement('div');
    toast.className = `export-toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#ef4444' : '#22c55e'};
      color: white;
      border-radius: 6px;
      font-size: 14px;
      z-index: 10000;
      animation: fadeInOut 3s forwards;
    `;

    if (!document.getElementById('toast-animation')) {
      const style = document.createElement('style');
      style.id = 'toast-animation';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(20px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ==================== PUBLIC API ====================

  return {
    capture,
    captureAndDownload,
    captureForSocial,
    copyToClipboard,
    exportCSV,
    exportJSON,
    shareToTwitter,
    generateReport,
    downloadReport,
    createExportUI,
    CONFIG
  };
})();

// Export
if (typeof window !== 'undefined') {
  window.BTCSAIChartExport = BTCSAIChartExport;
}
