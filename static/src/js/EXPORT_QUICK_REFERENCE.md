# Export Manager - Quick Reference

## One-Liner Examples

```javascript
// Open modal
ExportManager.showExportModal();

// Export CSV
ExportManager.exportCSV(data, 'filename');

// Export JSON
ExportManager.exportJSON(data, 'filename');

// Export PDF
await ExportManager.exportPDF('element-id', 'filename');

// Export trades
await ExportManager.exportTradeJournal({ format: 'csv' });

// Export alerts
await ExportManager.exportAlertHistory({ format: 'json' });

// Export signals
await ExportManager.exportSignalHistory({ format: 'csv' });

// Export chart data
ExportManager.exportChartData(chartData, { format: 'csv' });
```

## Common Patterns

### CSV with Custom Columns
```javascript
ExportManager.exportCSV(data, 'export', {
  columns: ['date', 'price', 'volume']
});
```

### JSON with Metadata
```javascript
ExportManager.exportJSON(data, 'export', {
  metadata: { type: 'Analysis', version: '1.0' }
});
```

### Date Range Filter
```javascript
await ExportManager.exportTradeJournal({
  format: 'csv',
  dateRange: {
    start: new Date('2025-01-01'),
    end: new Date('2025-12-31')
  }
});
```

### PDF with Options
```javascript
await ExportManager.exportPDF('chart-container', 'report', {
  title: 'Market Report',
  orientation: 'landscape',
  addWatermark: true
});
```

## HTML Integration

```html
<!-- Button to open modal -->
<button onclick="ExportManager.showExportModal()">Export</button>

<!-- Data attribute trigger -->
<button data-export-type="trade_journal">Export Trades</button>

<!-- Direct export -->
<button onclick="ExportManager.exportTradeJournal({ format: 'csv' })">
  Download CSV
</button>
```

## Constants

```javascript
ExportManager.EXPORT_FORMATS
// { CSV: 'csv', JSON: 'json', PDF: 'pdf' }

ExportManager.EXPORT_TYPES
// { TRADE_JOURNAL: 'trade_journal', ALERT_HISTORY: 'alert_history', ... }
```

## Dependencies (Optional)

```html
<!-- For PDF support -->
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
```

## File Locations

- **Module**: `/static/src/js/data-exporter.js`
- **Demo**: `/static/src/js/data-exporter-demo.html`
- **Docs**: `/static/src/js/DATA_EXPORTER_README.md`

## Public Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `exportCSV()` | data, filename, options | boolean | Export to CSV |
| `exportJSON()` | data, filename, options | boolean | Export to JSON |
| `exportPDF()` | element, filename, options | Promise<boolean> | Export to PDF |
| `exportTradeJournal()` | options | Promise<boolean> | Export trades |
| `exportAlertHistory()` | options | Promise<boolean> | Export alerts |
| `exportChartData()` | data, options | boolean | Export chart |
| `exportSignalHistory()` | options | Promise<boolean> | Export signals |
| `showExportModal()` | exportType | void | Show modal |
| `setChartData()` | data | void | Set chart data |

## Common Options

```javascript
{
  format: 'csv'|'json'|'pdf',
  dateRange: { start: Date, end: Date },
  columns: ['col1', 'col2'],        // CSV only
  includeHeaders: true,              // CSV only
  delimiter: ',',                    // CSV only
  includeMetadata: true,             // JSON only
  pretty: true,                      // JSON only
  title: 'Document Title',           // PDF only
  orientation: 'portrait',           // PDF only
  addWatermark: true                 // PDF only
}
```

## Data Format Examples

### Trade Journal
```javascript
{
  timestamp: 1733000000000,
  type: 'spot',
  direction: 'long',
  entryPrice: 95000,
  exitPrice: 98500,
  size: 0.1,
  pnl: 350,
  status: 'closed'
}
```

### Alert
```javascript
{
  timestamp: 1733000000000,
  name: 'MVRV Top Signal',
  category: 'onchain',
  severity: 'critical',
  metric: 'mvrv',
  threshold: 3.5
}
```

### Chart Data
```javascript
{
  time: 1733000000,  // Unix timestamp
  open: 95000,
  high: 96000,
  low: 94500,
  close: 95500,
  volume: 1000
}
```

## Error Handling

```javascript
try {
  const success = await ExportManager.exportTradeJournal({ format: 'csv' });
  if (success) {
    console.log('Success!');
  }
} catch (error) {
  console.error('Export failed:', error);
}
```

## LocalStorage Keys

- `btcsignal_paper_trades` - Trade journal
- `btcsignal_custom_alerts` - Custom alerts
- `btcsignal_signal_history` - Signal history
