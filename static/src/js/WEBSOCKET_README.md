# WebSocket Manager Documentation

## Overview

The WebSocket Manager (`websocket-manager.js`) provides real-time BTC/USDT price updates from Binance with automatic reconnection, heartbeat monitoring, and REST API fallback.

## Features

- **Real-time Updates**: Connects to Binance WebSocket for live BTC/USDT 24hr ticker data
- **Auto-Reconnect**: Exponential backoff with jitter (1s to 30s max delay)
- **Heartbeat Monitoring**: Detects stale connections and auto-reconnects
- **REST Fallback**: Automatically switches to REST polling if WebSocket fails
- **Event Emitter Pattern**: Subscribe/unsubscribe to price updates
- **Connection State Management**: Track connection status (disconnected, connecting, connected, reconnecting, failed)
- **Zero Configuration**: Auto-connects on page load (except admin/embed pages)

## Architecture

### IIFE Module Pattern

```javascript
(function(global) {
  'use strict';

  const WSManager = (function() {
    // Private state and methods
    // ...

    return {
      // Public API
    };
  })();

  global.WSManager = WSManager;
})(typeof window !== 'undefined' ? window : this);
```

### Connection States

```javascript
ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  FAILED: 'failed'
}
```

## Public API

### Methods

#### `connect()`
Initiates WebSocket connection to Binance.

```javascript
WSManager.connect();
// Returns: boolean (success status)
```

#### `disconnect()`
Disconnects WebSocket and stops all polling.

```javascript
WSManager.disconnect();
```

#### `subscribe(callback)`
Subscribe to price updates. Callback receives normalized price data.

```javascript
const id = WSManager.subscribe((data) => {
  if (data.type === 'state') {
    console.log('State changed:', data.newState);
  } else {
    console.log('Price:', data.price);
    console.log('24h Change:', data.priceChangePercent);
  }
});
// Returns: number (subscriber ID)
```

#### `unsubscribe(subscriberId)`
Unsubscribe from price updates.

```javascript
WSManager.unsubscribe(id);
// Returns: boolean (success status)
```

#### `getConnectionState()`
Get current connection state.

```javascript
const state = WSManager.getConnectionState();
// Returns: string ('disconnected', 'connecting', 'connected', 'reconnecting', 'failed')
```

#### `isConnected()`
Check if currently connected via WebSocket.

```javascript
const connected = WSManager.isConnected();
// Returns: boolean
```

#### `getLastPrice()`
Get last received price data.

```javascript
const data = WSManager.getLastPrice();
// Returns: Object|null
```

#### `getSubscriberCount()`
Get number of active subscribers.

```javascript
const count = WSManager.getSubscriberCount();
// Returns: number
```

#### `forceReconnect()`
Force immediate reconnection attempt.

```javascript
WSManager.forceReconnect();
```

## Data Format

### Price Update Object

```javascript
{
  symbol: 'BTCUSDT',
  price: 95234.50,                    // Current price
  priceChange: 1234.50,               // 24h price change (absolute)
  priceChangePercent: 1.31,           // 24h price change (%)
  high24h: 96000.00,                  // 24h high
  low24h: 93500.00,                   // 24h low
  volume24h: 12345.67,                // 24h volume (BTC)
  quoteVolume24h: 1234567890.12,      // 24h volume (USDT)
  openPrice: 94000.00,                // Open price
  numberOfTrades: 123456,             // Number of trades
  timestamp: 1702512345678,           // Update timestamp
  source: 'websocket'                 // 'websocket' or 'rest'
}
```

### State Change Object

```javascript
{
  type: 'state',
  oldState: 'connecting',
  newState: 'connected',
  timestamp: 1702512345678
}
```

## Configuration

Internal configuration (not exposed):

```javascript
const config = {
  wsUrl: 'wss://stream.binance.com:9443/ws/btcusdt@ticker',
  maxReconnectAttempts: 10,
  baseReconnectDelay: 1000,      // 1 second
  maxReconnectDelay: 30000,      // 30 seconds
  heartbeatInterval: 30000,      // 30 seconds
  restFallbackInterval: 5000,    // 5 seconds
  restApiUrl: 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'
};
```

## Reconnection Logic

### Exponential Backoff

```
Attempt 1: ~1 second
Attempt 2: ~2 seconds
Attempt 3: ~4 seconds
Attempt 4: ~8 seconds
Attempt 5: ~16 seconds
Attempt 6+: ~30 seconds (capped)
```

Jitter (0-1000ms) is added to prevent thundering herd.

### Failure Handling

After 10 failed reconnection attempts:
1. State changes to `FAILED`
2. WebSocket connection is abandoned
3. REST API polling starts (every 5 seconds)
4. Users continue receiving price updates via REST

## Usage Examples

### Basic Usage

```javascript
// Subscribe to price updates
const subscriberId = WSManager.subscribe((data) => {
  // Skip state change events
  if (data.type === 'state') return;

  // Update UI
  document.getElementById('price').textContent =
    '$' + data.price.toLocaleString();
});

// Later, unsubscribe
WSManager.unsubscribe(subscriberId);
```

### Handling State Changes

```javascript
WSManager.subscribe((data) => {
  if (data.type === 'state') {
    switch(data.newState) {
      case 'connected':
        console.log('WebSocket connected!');
        break;
      case 'reconnecting':
        console.log('Connection lost, reconnecting...');
        break;
      case 'failed':
        console.log('WebSocket failed, using REST fallback');
        break;
    }
  } else {
    // Handle price update
    updatePriceDisplay(data);
  }
});
```

### Multiple Subscribers

```javascript
// Price ticker
const tickerId = WSManager.subscribe((data) => {
  if (data.type === 'state') return;
  updateTicker(data);
});

// Chart updates
const chartId = WSManager.subscribe((data) => {
  if (data.type === 'state') return;
  updateChart(data);
});

// Stats panel
const statsId = WSManager.subscribe((data) => {
  if (data.type === 'state') return;
  updateStats(data);
});
```

### Connection Status Indicator

```javascript
WSManager.subscribe((data) => {
  if (data.type !== 'state') return;

  const indicator = document.getElementById('status');
  const state = data.newState;

  indicator.className = 'status-' + state;
  indicator.textContent = {
    'disconnected': 'Offline',
    'connecting': 'Connecting...',
    'connected': 'Live',
    'reconnecting': 'Reconnecting...',
    'failed': 'Using Fallback'
  }[state];
});
```

## Integration with Existing Code

### price-ticker.js

Updated to use WSManager instead of REST polling:

```javascript
(function() {
  'use strict';

  let subscriberId = null;

  function handlePriceUpdate(data) {
    if (data.type === 'state') {
      updateConnectionStatus(data.newState);
      return;
    }

    if (data.price) {
      updatePriceDisplay(data.price);
    }
  }

  function init() {
    if (typeof window.WSManager === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    subscriberId = WSManager.subscribe(handlePriceUpdate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

## Auto-Connection Behavior

WSManager automatically connects on page load, except:
- Admin pages (`/admin/*`)
- Embed pages (`/embed/*`)

To disable auto-connection, modify the IIFE initialization:

```javascript
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Add conditions here
    if (!shouldAutoConnect()) return;

    WSManager.connect();
  });
}
```

## Performance Considerations

### Memory
- Lightweight: <15KB minified
- Minimal memory footprint
- Automatic cleanup on page unload

### Network
- Single WebSocket connection shared by all subscribers
- Efficient: ~1KB per update
- Fallback REST polling: ~2KB per request (every 5s)

### CPU
- Event-driven architecture (no polling loops)
- Minimal processing per update
- Throttling via Binance 24hr ticker (1-2 updates/second max)

## Browser Compatibility

- Modern browsers with WebSocket support
- Graceful degradation to REST API
- Tested on:
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+

## Error Handling

All errors are logged to console with `[WSManager]` prefix:

```
[WSManager] WebSocket connected
[WSManager] State: connecting -> connected
[WSManager] No data received in 60s, reconnecting...
[WSManager] WebSocket closed: code=1006, reason=none
[WSManager] Reconnecting in 2134ms (attempt 2/10)
[WSManager] Max reconnect attempts (10) reached
[WSManager] Starting REST API fallback polling
```

## Testing

### Demo Page

Visit `/websocket-demo.html` for interactive testing:
- Live price display with flash animation
- Connection state monitoring
- Event log
- Manual connect/disconnect controls
- Subscriber count
- Update statistics

### Console Testing

```javascript
// Check connection state
WSManager.getConnectionState();

// Subscribe to updates
const id = WSManager.subscribe(console.log);

// Force disconnect to test reconnection
WSManager.disconnect();

// Reconnect
WSManager.connect();

// Check subscriber count
WSManager.getSubscriberCount();

// Get last price
WSManager.getLastPrice();

// Unsubscribe
WSManager.unsubscribe(id);
```

## Best Practices

1. **Subscribe Once**: Share one subscription across components
2. **Handle State Changes**: Update UI based on connection state
3. **Clean Up**: Always unsubscribe when component unmounts
4. **Error Handling**: Wrap callbacks in try-catch
5. **Debounce Updates**: For expensive operations (e.g., chart redraws)

## Troubleshooting

### WebSocket not connecting

1. Check console for `[WSManager]` errors
2. Verify Binance WebSocket URL is accessible
3. Check firewall/proxy settings
4. Confirm browser WebSocket support

### Frequent reconnections

1. Check network stability
2. Review heartbeat interval (may be too aggressive)
3. Increase maxReconnectAttempts if needed
4. Monitor Binance API status

### High CPU usage

1. Reduce number of subscribers
2. Debounce expensive callbacks
3. Check for memory leaks in callbacks
4. Use browser DevTools Performance tab

## Security Considerations

- Read-only connection (no authentication)
- No sensitive data transmitted
- HTTPS enforcement on production
- XSS protection via content normalization

## Future Enhancements

Potential improvements:
- [ ] Support multiple trading pairs
- [ ] Configurable update frequency
- [ ] Offline data buffering
- [ ] WebSocket compression
- [ ] Custom reconnection strategies
- [ ] Performance metrics API
- [ ] TypeScript definitions

## License

Part of BTC Signals Pro platform.

## Support

For issues or questions:
1. Check console logs
2. Visit `/websocket-demo.html` for testing
3. Review this documentation
4. Contact development team
