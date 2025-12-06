// Key Level of the Day Widget
// Fetches and displays the nearest support/resistance level

async function loadKeyLevel() {
  let data = null;

  // Try Netlify function first
  try {
    const res = await fetch('/.netlify/functions/key-level');
    if (res.ok) {
      data = await res.json();
    }
  } catch (e) {
    console.log('Key level function unavailable, using fallback');
  }

  // Fallback: calculate key level from recent price data
  if (!data) {
    try {
      data = await calculateKeyLevelFallback();
    } catch (e) {
      console.error('Key level fallback error:', e);
    }
  }

  if (!data) {
    const heroLevelDesc = document.getElementById('hero-level-desc');
    if (heroLevelDesc) heroLevelDesc.textContent = 'Unable to load';
    return;
  }

  updateKeyLevelUI(data);
}

async function calculateKeyLevelFallback() {
  // Fetch recent candles to find support/resistance
  const res = await fetch('https://api.binance.us/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=50');
  const candles = await res.json();

  const currentPrice = parseFloat(candles[candles.length - 1][4]);
  const highs = candles.map(c => parseFloat(c[2]));
  const lows = candles.map(c => parseFloat(c[3]));

  // Find nearest resistance (recent high above current price)
  const resistance = Math.min(...highs.filter(h => h > currentPrice * 1.005));
  // Find nearest support (recent low below current price)
  const support = Math.max(...lows.filter(l => l < currentPrice * 0.995));

  const distToResist = ((resistance - currentPrice) / currentPrice) * 100;
  const distToSupport = ((currentPrice - support) / currentPrice) * 100;

  // Choose whichever is closer
  if (distToResist < distToSupport && isFinite(resistance)) {
    return {
      type: 'resistance',
      level: Math.round(resistance),
      currentPrice: Math.round(currentPrice),
      distancePercent: distToResist.toFixed(1),
      description: 'Recent swing high - potential rejection zone'
    };
  } else if (isFinite(support)) {
    return {
      type: 'support',
      level: Math.round(support),
      currentPrice: Math.round(currentPrice),
      distancePercent: distToSupport.toFixed(1),
      description: 'Recent swing low - potential bounce zone'
    };
  }

  return null;
}

function updateKeyLevelUI(data) {
  const levelTypeEl = document.getElementById('level-type');
  const levelPriceEl = document.getElementById('key-level-price');
  const levelDescEl = document.getElementById('key-level-desc');
  const levelDistanceEl = document.getElementById('key-level-distance');
  const widgetEl = document.getElementById('key-level-widget');

  // Hero card elements
  const heroKeyLevel = document.getElementById('hero-key-level');
  const heroLevelType = document.getElementById('hero-level-type');
  const heroLevelDesc = document.getElementById('hero-level-desc');

  if (levelTypeEl) {
    levelTypeEl.textContent = data.type.toUpperCase();
    levelTypeEl.className = 'key-level-type ' + data.type;
  }

  if (levelPriceEl) {
    levelPriceEl.textContent = '$' + data.level.toLocaleString();
    levelPriceEl.className = 'key-level-price ' + data.type;
  }

  if (levelDescEl) {
    levelDescEl.textContent = data.description;
  }

  if (levelDistanceEl) {
    levelDistanceEl.textContent = 'Current: $' + data.currentPrice.toLocaleString() + ' (' + data.distancePercent + '% away)';
  }

  if (widgetEl) {
    widgetEl.classList.add('loaded');
  }

  // Update hero card elements
  if (heroKeyLevel) {
    heroKeyLevel.textContent = '$' + data.level.toLocaleString();
  }

  if (heroLevelType) {
    heroLevelType.textContent = data.type.toUpperCase();
    heroLevelType.className = 'key-level-badge ' + data.type;
  }

  if (heroLevelDesc) {
    heroLevelDesc.textContent = data.distancePercent + '% from current price';
  }
}

// Load on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadKeyLevel);
} else {
  loadKeyLevel();
}

// Refresh every 5 minutes
setInterval(loadKeyLevel, 300000);
