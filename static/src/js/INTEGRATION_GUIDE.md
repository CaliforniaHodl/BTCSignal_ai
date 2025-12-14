# Data Exporter Integration Guide

This guide shows how to integrate the ExportManager module into existing BTCSignal.ai pages.

## Basic Integration

### Step 1: Include the Script

Add to your HTML `<head>` or before `</body>`:

```html
<!-- Optional: PDF dependencies -->
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>

<!-- Export Manager -->
<script src="/static/src/js/data-exporter.js"></script>
```

The module auto-initializes on page load.

### Step 2: Add Export Buttons

```html
<!-- Simple button to open modal -->
<button class="btn btn-primary" onclick="ExportManager.showExportModal()">
  <i class="bi bi-download"></i> Export Data
</button>

<!-- Export specific data type -->
<button class="btn btn-secondary" onclick="ExportManager.showExportModal('trade_journal')">
  Export Trades
</button>
```

## Page-Specific Integration

### Dashboard Integration

Add export functionality to the dashboard:

```html
<!-- In your dashboard header -->
<div class="dashboard-actions">
  <button class="btn btn-sm btn-outline" onclick="exportDashboardData()">
    <i class="bi bi-download"></i> Export
  </button>
</div>

<script>
async function exportDashboardData() {
  // Show modal with pre-selected type
  ExportManager.showExportModal('alert_history');
}
</script>
```

### Trade Journal Integration

```html
<!-- In trade journal page -->
<div class="trade-journal-header">
  <h2>Trade Journal</h2>
  <div class="actions">
    <button onclick="exportTrades('csv')">Export CSV</button>
    <button onclick="exportTrades('json')">Export JSON</button>
    <button onclick="exportTrades('pdf')">Export PDF</button>
  </div>
</div>

<script>
async function exportTrades(format) {
  await ExportManager.exportTradeJournal({ format });
}
</script>
```

### Chart Integration

```html
<!-- In chart component -->
<div class="chart-controls">
  <button onclick="exportCurrentChart()">
    <i class="bi bi-camera"></i> Export Chart
  </button>
</div>

<script>
async function exportCurrentChart() {
  // Get chart data from your chart instance
  const chartData = tradingChart.getData(); // Your chart API

  // Set data for export
  ExportManager.setChartData(chartData);

  // Show modal
  ExportManager.showExportModal('chart_data');
}
</script>
```

### Alert Dashboard Integration

```html
<!-- In alert dashboard -->
<div class="alert-dashboard">
  <div class="header">
    <h3>Alerts</h3>
    <button class="btn-icon" onclick="exportAlerts()">
      <i class="bi bi-download"></i>
    </button>
  </div>
  <!-- Alert list -->
</div>

<script>
async function exportAlerts() {
  await ExportManager.exportAlertHistory({ format: 'csv' });
}
</script>
```

## Advanced Integration Patterns

### Date Range Picker Integration

```html
<div class="export-controls">
  <input type="date" id="start-date" value="2025-01-01">
  <input type="date" id="end-date" value="2025-12-31">
  <button onclick="exportWithDateRange()">Export Range</button>
</div>

<script>
async function exportWithDateRange() {
  const startDate = new Date(document.getElementById('start-date').value);
  const endDate = new Date(document.getElementById('end-date').value);

  await ExportManager.exportTradeJournal({
    format: 'csv',
    dateRange: { start: startDate, end: endDate }
  });
}
</script>
```

### Dropdown Menu Integration

```html
<div class="dropdown">
  <button class="btn-dropdown">Export <i class="bi bi-chevron-down"></i></button>
  <div class="dropdown-menu">
    <a onclick="ExportManager.exportTradeJournal({ format: 'csv' })">Trade Journal (CSV)</a>
    <a onclick="ExportManager.exportTradeJournal({ format: 'json' })">Trade Journal (JSON)</a>
    <a onclick="ExportManager.exportTradeJournal({ format: 'pdf' })">Trade Journal (PDF)</a>
    <hr>
    <a onclick="ExportManager.exportAlertHistory({ format: 'csv' })">Alert History (CSV)</a>
    <a onclick="ExportManager.exportSignalHistory({ format: 'csv' })">Signal History (CSV)</a>
  </div>
</div>
```

### Table Export Integration

```html
<div class="data-table-container">
  <table id="performance-table">
    <!-- Table content -->
  </table>
  <button onclick="exportTable()">Export Table</button>
</div>

<script>
function exportTable() {
  // Extract data from table
  const table = document.getElementById('performance-table');
  const data = [];

  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    data.push({
      date: cells[0].textContent,
      metric: cells[1].textContent,
      value: cells[2].textContent
    });
  });

  ExportManager.exportCSV(data, 'performance-data');
}
</script>
```

### Bulk Export Integration

```html
<button onclick="exportAllData()">Export All Data</button>

<script>
async function exportAllData() {
  // Show progress
  const toast = showToast('Exporting all data...', 'info');

  try {
    await ExportManager.exportTradeJournal({ format: 'csv' });
    await ExportManager.exportAlertHistory({ format: 'csv' });
    await ExportManager.exportSignalHistory({ format: 'csv' });

    showToast('All data exported successfully!', 'success');
  } catch (error) {
    showToast('Export failed: ' + error.message, 'error');
  }
}
</script>
```

## TradingView Chart Integration

If you're using TradingView charts:

```javascript
// After chart initialization
const tvWidget = new TradingView.widget({
  // ... your config
});

// Add export button
function exportTradingViewChart() {
  // Get visible data range
  const visibleRange = tvWidget.activeChart().getVisibleRange();

  // Get chart data (you'll need to implement this based on your data source)
  const chartData = getChartDataForRange(visibleRange);

  // Export
  ExportManager.setChartData(chartData);
  ExportManager.showExportModal('chart_data');
}
```

## Custom Data Export

For exporting custom computed data:

```javascript
function exportCustomAnalysis() {
  // Compute your analysis
  const analysis = {
    indicators: calculateIndicators(),
    signals: generateSignals(),
    statistics: computeStatistics()
  };

  // Export as JSON with metadata
  ExportManager.exportJSON(analysis, 'custom-analysis', {
    metadata: {
      type: 'Custom Analysis',
      generated: new Date().toISOString(),
      parameters: getAnalysisParameters()
    }
  });
}
```

## Styled Export Buttons

```html
<style>
  .export-btn-group {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .export-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #f7931a 0%, #e8860f 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: transform 0.2s;
  }

  .export-btn:hover {
    transform: translateY(-2px);
  }

  .export-btn i {
    font-size: 16px;
  }
</style>

<div class="export-btn-group">
  <button class="export-btn" onclick="ExportManager.showExportModal()">
    <i class="bi bi-download"></i>
    Export Data
  </button>
</div>
```

## Error Handling

```javascript
async function safeExport(type, format) {
  try {
    let success = false;

    switch(type) {
      case 'trades':
        success = await ExportManager.exportTradeJournal({ format });
        break;
      case 'alerts':
        success = await ExportManager.exportAlertHistory({ format });
        break;
      // ... more cases
    }

    if (!success) {
      console.error('Export returned false');
      showToast('Export failed. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Export error:', error);
    showToast('Export error: ' + error.message, 'error');
  }
}
```

## Loading States

```javascript
async function exportWithLoading() {
  const button = event.target;
  const originalText = button.textContent;

  // Show loading state
  button.disabled = true;
  button.innerHTML = '<i class="spinner"></i> Exporting...';

  try {
    await ExportManager.exportTradeJournal({ format: 'pdf' });
  } finally {
    // Restore button
    button.disabled = false;
    button.textContent = originalText;
  }
}
```

## Notification Integration

If you have a custom toast/notification system:

```javascript
// Listen for export events
window.addEventListener('exportSuccess', (e) => {
  YourNotificationSystem.show({
    title: 'Export Complete',
    message: e.detail.message,
    type: 'success'
  });
});

window.addEventListener('exportError', (e) => {
  YourNotificationSystem.show({
    title: 'Export Failed',
    message: e.detail.error,
    type: 'error'
  });
});
```

## React Integration

If using React components:

```jsx
import React from 'react';

function ExportButton({ type, format, children }) {
  const handleExport = async () => {
    switch(type) {
      case 'trades':
        await window.ExportManager.exportTradeJournal({ format });
        break;
      case 'alerts':
        await window.ExportManager.exportAlertHistory({ format });
        break;
      default:
        window.ExportManager.showExportModal(type);
    }
  };

  return (
    <button onClick={handleExport} className="export-btn">
      {children}
    </button>
  );
}

// Usage
<ExportButton type="trades" format="csv">
  Export Trades
</ExportButton>
```

## Analytics Integration

Track export usage:

```javascript
async function exportWithAnalytics(type, format) {
  // Track event
  if (typeof gtag !== 'undefined') {
    gtag('event', 'export', {
      export_type: type,
      export_format: format
    });
  }

  // Perform export
  await ExportManager[`export${capitalize(type)}`]({ format });
}
```

## Best Practices

1. **Always provide feedback**: Show loading states and success/error messages
2. **Handle errors gracefully**: Wrap exports in try-catch blocks
3. **Validate data**: Check if data exists before exporting
4. **Respect user preferences**: Remember last used format/settings
5. **Optimize large exports**: Warn users about large data sets
6. **Test all formats**: Ensure CSV, JSON, and PDF all work as expected

## Common Patterns Summary

```javascript
// Simple export
ExportManager.exportCSV(data, 'filename');

// Export with options
ExportManager.exportJSON(data, 'filename', { metadata: {...} });

// Type-specific export
await ExportManager.exportTradeJournal({ format: 'pdf' });

// Modal for user selection
ExportManager.showExportModal('trade_journal');

// With date range
await ExportManager.exportAlertHistory({
  format: 'csv',
  dateRange: { start: new Date(), end: new Date() }
});

// Set chart data then export
ExportManager.setChartData(chartData);
ExportManager.exportChartData(chartData, { format: 'json' });
```

## Testing Your Integration

1. Load your page
2. Open browser console
3. Check that ExportManager is available:
   ```javascript
   console.log(window.ExportManager);
   ```
4. Test a simple export:
   ```javascript
   ExportManager.exportCSV([{a:1,b:2}], 'test');
   ```
5. Test the modal:
   ```javascript
   ExportManager.showExportModal();
   ```

## Troubleshooting

**Modal not appearing:**
- Check console for JavaScript errors
- Verify data-exporter.js is loaded
- Ensure no CSS conflicts

**Exports not working:**
- Check if data exists in localStorage
- Verify network requests for remote data
- Check browser console for errors

**PDF export failing:**
- Verify html2canvas is loaded
- Check target element exists
- Try PNG fallback first

## Support Files

- Main module: `/static/src/js/data-exporter.js`
- Demo: `/static/src/js/data-exporter-demo.html`
- Full docs: `/static/src/js/DATA_EXPORTER_README.md`
- Quick reference: `/static/src/js/EXPORT_QUICK_REFERENCE.md`
