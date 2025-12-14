# Data Exporter Module - Sprint 11

Comprehensive export functionality for BTCSignal.ai that allows users to export their data in multiple formats.

## Features

### Export Formats
- **CSV**: RFC 4180 compliant with proper escaping for special characters
- **JSON**: Structured export with metadata wrapper
- **PDF**: HTML-to-canvas conversion with watermarking

### Export Types
1. **Trade Journal Entries** - Export paper trading history with statistics
2. **Alert History** - Export triggered and custom alerts
3. **Chart Data** - Export candlestick/OHLCV data
4. **Signal History** - Export trading signals and analysis
5. **Custom Date Ranges** - Filter exports by date range

### Key Capabilities
- Proper CSV escaping (handles commas, quotes, newlines)
- JSON with metadata (timestamp, version, record count)
- PDF generation with watermarks
- Date range filtering
- Local and remote data sources
- Modal UI for easy user interaction
- Graceful fallbacks

## Installation

Include the script in your HTML:

```html
<script src="/static/src/js/data-exporter.js"></script>
```

The module auto-initializes and exposes `window.ExportManager`.

## Usage

### 1. Interactive Modal

Open the export modal for user-friendly exports:

```javascript
// Open modal with default options
ExportManager.showExportModal();

// Pre-select export type
ExportManager.showExportModal('trade_journal');
ExportManager.showExportModal('alert_history');
ExportManager.showExportModal('signal_history');
```

### 2. Programmatic Exports

#### CSV Export

```javascript
const data = [
  { date: '2025-12-01', price: 100000, volume: 1000000 },
  { date: '2025-12-02', price: 101000, volume: 1200000 }
];

// Basic export
ExportManager.exportCSV(data, 'bitcoin-prices');

// With options
ExportManager.exportCSV(data, 'bitcoin-prices', {
  columns: ['date', 'price'],  // Specific columns
  includeHeaders: true,         // Include header row
  delimiter: ',',               // Field delimiter
  dateFormat: 'iso'            // Date format (iso or local)
});
```

#### JSON Export

```javascript
const signals = [
  { timestamp: Date.now(), type: 'bullish', signal: 'MACD cross' }
];

// Basic export
ExportManager.exportJSON(signals, 'signals');

// With metadata
ExportManager.exportJSON(signals, 'signals', {
  includeMetadata: true,
  pretty: true,
  metadata: {
    source: 'BTCSignal.ai',
    type: 'Trading Signals',
    customField: 'value'
  }
});
```

Output structure with metadata:
```json
{
  "metadata": {
    "exportedAt": "2025-12-13T...",
    "exportedBy": "BTCSignal.ai Export Manager",
    "version": "1.0",
    "recordCount": 1,
    "source": "BTCSignal.ai",
    "type": "Trading Signals"
  },
  "data": [...]
}
```

#### PDF Export

```javascript
// Export an HTML element
await ExportManager.exportPDF('report-container', 'market-report', {
  title: 'BTC Market Report',
  orientation: 'portrait',  // or 'landscape'
  format: 'a4',
  addWatermark: true,
  scale: 2
});

// Export DOM element reference
const element = document.getElementById('my-chart');
await ExportManager.exportPDF(element, 'chart-analysis');
```

### 3. Type-Specific Exports

#### Trade Journal

```javascript
// Export all trades
await ExportManager.exportTradeJournal({ format: 'csv' });

// Export with date range
await ExportManager.exportTradeJournal({
  format: 'json',
  dateRange: {
    start: new Date('2025-01-01'),
    end: new Date('2025-12-31')
  }
});

// Export as PDF with statistics
await ExportManager.exportTradeJournal({ format: 'pdf' });
```

The trade journal export includes:
- Trade statistics (total trades, win rate, total PnL)
- Detailed trade history
- Entry/exit prices, size, leverage
- PnL calculations
- Trade notes and tags

#### Alert History

```javascript
// Export all alerts
await ExportManager.exportAlertHistory({ format: 'csv' });

// Export recent alerts only
await ExportManager.exportAlertHistory({
  format: 'json',
  dateRange: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    end: new Date()
  }
});
```

#### Chart Data

```javascript
// Set chart data first
const chartData = [
  { time: 1733000000, open: 95000, high: 96000, low: 94500, close: 95500, volume: 1000 },
  // ... more data
];
ExportManager.setChartData(chartData);

// Export
ExportManager.exportChartData(chartData, { format: 'csv' });

// Export with date filter
ExportManager.exportChartData(chartData, {
  format: 'json',
  dateRange: {
    start: new Date('2025-12-01'),
    end: new Date('2025-12-13')
  }
});
```

#### Signal History

```javascript
// Export all signals
await ExportManager.exportSignalHistory({ format: 'csv' });

// Export as JSON with metadata
await ExportManager.exportSignalHistory({
  format: 'json',
  dateRange: null  // All time
});
```

### 4. HTML Integration

Add export buttons to your UI:

```html
<!-- Using data attribute to trigger modal -->
<button data-export-type="trade_journal">Export Trades</button>
<button data-export-type="alert_history">Export Alerts</button>

<!-- Direct function calls -->
<button onclick="ExportManager.showExportModal('trade_journal')">
  Export Trade Journal
</button>

<button onclick="ExportManager.exportTradeJournal({ format: 'csv' })">
  Download CSV
</button>
```

## API Reference

### Core Methods

#### `exportCSV(data, filename, options)`
Export array of objects to CSV file.

**Parameters:**
- `data` (Array): Array of objects to export
- `filename` (string): Output filename (without extension)
- `options` (Object): Optional configuration
  - `columns` (Array): Specific columns to export
  - `includeHeaders` (boolean): Include header row (default: true)
  - `delimiter` (string): Field delimiter (default: ',')
  - `dateFormat` (string): Date format - 'iso' or 'local' (default: 'iso')

**Returns:** `boolean` - Success status

#### `exportJSON(data, filename, options)`
Export data to JSON file.

**Parameters:**
- `data` (any): Data to export
- `filename` (string): Output filename (without extension)
- `options` (Object): Optional configuration
  - `includeMetadata` (boolean): Wrap in metadata object (default: true)
  - `pretty` (boolean): Pretty print JSON (default: true)
  - `metadata` (Object): Additional metadata fields

**Returns:** `boolean` - Success status

#### `exportPDF(element, filename, options)`
Export HTML element to PDF.

**Parameters:**
- `element` (HTMLElement|string): Element or element ID
- `filename` (string): Output filename (without extension)
- `options` (Object): Optional configuration
  - `title` (string): Document title (default: 'BTCSignal.ai Export')
  - `orientation` (string): 'portrait' or 'landscape' (default: 'portrait')
  - `format` (string): Page format (default: 'a4')
  - `addWatermark` (boolean): Add watermark (default: true)
  - `scale` (number): Canvas scale factor (default: 2)

**Returns:** `Promise<boolean>` - Success status

### Type-Specific Methods

#### `exportTradeJournal(options)`
Export trade journal with statistics.

**Parameters:**
- `options` (Object):
  - `format` (string): 'csv', 'json', or 'pdf'
  - `dateRange` (Object): { start: Date, end: Date }

**Returns:** `Promise<boolean>`

#### `exportAlertHistory(options)`
Export alert history.

**Parameters:**
- `options` (Object):
  - `format` (string): 'csv', 'json', or 'pdf'
  - `dateRange` (Object): { start: Date, end: Date }

**Returns:** `Promise<boolean>`

#### `exportChartData(chartData, options)`
Export chart data points.

**Parameters:**
- `chartData` (Array): Array of OHLCV data
- `options` (Object):
  - `format` (string): 'csv' or 'json'
  - `dateRange` (Object): { start: Date, end: Date }

**Returns:** `boolean`

#### `exportSignalHistory(options)`
Export trading signals.

**Parameters:**
- `options` (Object):
  - `format` (string): 'csv', 'json', or 'pdf'
  - `dateRange` (Object): { start: Date, end: Date }

**Returns:** `Promise<boolean>`

### UI Methods

#### `showExportModal(exportType)`
Display export modal.

**Parameters:**
- `exportType` (string): Optional pre-selected type ('trade_journal', 'alert_history', etc.)

### Utility Methods

#### `setChartData(data)`
Set chart data for export.

**Parameters:**
- `data` (Array): Chart data array

#### `filterByDateRange(data, startDate, endDate, dateField)`
Filter data by date range.

**Parameters:**
- `data` (Array): Data to filter
- `startDate` (Date|string): Start date
- `endDate` (Date|string): End date
- `dateField` (string): Field name containing date (default: 'timestamp')

**Returns:** `Array` - Filtered data

### Constants

```javascript
ExportManager.EXPORT_FORMATS = {
  CSV: 'csv',
  JSON: 'json',
  PDF: 'pdf'
};

ExportManager.EXPORT_TYPES = {
  TRADE_JOURNAL: 'trade_journal',
  ALERT_HISTORY: 'alert_history',
  CHART_DATA: 'chart_data',
  SIGNAL_HISTORY: 'signal_history',
  CUSTOM: 'custom'
};
```

## Data Sources

The module supports multiple data sources:

1. **LocalStorage**:
   - `btcsignal_paper_trades` - Trade journal
   - `btcsignal_custom_alerts` - Custom alerts
   - `btcsignal_signal_history` - Signal history

2. **Remote API** (GitHub):
   - Market snapshot
   - Triggered alerts
   - Signal history

3. **In-Memory**:
   - Chart data set via `setChartData()`

## CSV Escaping

The module implements RFC 4180 compliant CSV escaping:

- Fields containing commas, quotes, or newlines are wrapped in quotes
- Quotes inside fields are escaped by doubling them
- Null/undefined values are exported as empty strings

Example:
```javascript
const data = [
  { name: 'Test, Inc.', note: 'Say "hello"', value: 100 }
];
// Exports as: name,note,value
//            "Test, Inc.","Say ""hello""",100
```

## Dependencies

### Optional Dependencies
- **html2canvas**: Required for PDF export functionality
  - If not loaded, PDF export falls back to PNG download
  - Load via: `<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>`

- **jsPDF**: Enhanced PDF generation
  - If not loaded, uses PNG fallback
  - Load via: `<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>`

### Graceful Degradation
The module works without dependencies but with reduced functionality:
- CSV and JSON exports always work
- PDF export requires html2canvas (falls back to PNG)
- Enhanced PDF features require jsPDF (falls back to basic canvas export)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Required features:
- ES6 syntax
- Blob and URL APIs
- Canvas API (for PDF)
- LocalStorage

## Examples

### Complete Export Flow

```javascript
// 1. Initialize (done automatically)
ExportManager.init();

// 2. Set chart data if exporting charts
const chartData = getChartData(); // Your chart data
ExportManager.setChartData(chartData);

// 3. Export via modal (user-friendly)
ExportManager.showExportModal('trade_journal');

// 4. Or export directly
await ExportManager.exportTradeJournal({
  format: 'csv',
  dateRange: {
    start: new Date('2025-01-01'),
    end: new Date('2025-12-31')
  }
});
```

### Custom Data Export

```javascript
// Export any custom data
const customData = [
  { indicator: 'RSI', value: 65, signal: 'neutral' },
  { indicator: 'MACD', value: 120, signal: 'bullish' },
  { indicator: 'Volume', value: 1500000000, signal: 'high' }
];

ExportManager.exportCSV(customData, 'indicators-analysis');
```

### Batch Export

```javascript
async function exportAllData() {
  await ExportManager.exportTradeJournal({ format: 'csv' });
  await ExportManager.exportAlertHistory({ format: 'csv' });
  await ExportManager.exportSignalHistory({ format: 'csv' });
  console.log('All data exported!');
}
```

## Styling

The modal uses inline styles and is fully self-contained. To customize:

```javascript
// Modify the modal after initialization
const modal = document.getElementById('export-modal');
modal.querySelector('.export-modal-content').style.background = '#your-color';
```

Or add custom CSS:
```css
#export-modal .export-modal-content {
  background: #custom-background !important;
}
```

## Error Handling

All export methods include try-catch blocks and return boolean success status:

```javascript
const success = await ExportManager.exportTradeJournal({ format: 'csv' });
if (success) {
  console.log('Export successful');
} else {
  console.log('Export failed');
}
```

Errors are:
1. Logged to console with `[ExportManager]` prefix
2. Shown to user via notification system
3. Return `false` for boolean methods

## Performance

- CSV/JSON exports are synchronous and fast (< 100ms for typical datasets)
- PDF exports are asynchronous (1-5s depending on content complexity)
- Large datasets (>10k rows) may take longer for PDF
- Chart data with thousands of points exports efficiently

## Security

- No external API calls for core functionality
- Data stays local (exported to user's downloads)
- No sensitive data is logged
- CSV escaping prevents injection attacks

## Testing

Open the demo file in a browser:
```
/static/src/js/data-exporter-demo.html
```

Or test programmatically:
```javascript
// Test CSV
ExportManager.exportCSV([{a:1,b:2}], 'test');

// Test JSON
ExportManager.exportJSON({test: 'data'}, 'test');

// Test modal
ExportManager.showExportModal();
```

## Troubleshooting

**PDF export not working:**
- Check if html2canvas is loaded: `typeof html2canvas !== 'undefined'`
- Load the library: `<script src="...html2canvas..."></script>`

**No data to export:**
- Verify data exists in localStorage
- Check browser console for errors
- Ensure data is in expected format

**CSV formatting issues:**
- Check delimiter setting matches your region
- Verify special characters are properly escaped
- Use UTF-8 encoding for international characters

## Version History

### v1.0.0 (Sprint 11)
- Initial release
- CSV, JSON, PDF export support
- Trade journal, alerts, signals, chart data
- Date range filtering
- Modal UI
- Proper CSV escaping
- JSON metadata wrapper
- PDF with watermarking

## License

Part of BTCSignal.ai platform. All rights reserved.

## Author

BTCSignal.ai Development Team
Sprint 11: Export Functionality

## Support

For issues or questions:
- Check browser console for errors
- Verify dependencies are loaded
- Review this documentation
- Test with demo file
