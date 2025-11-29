// Key Level of the Day Widget
// Fetches and displays the nearest support/resistance level

async function loadKeyLevel() {
  try {
    const res = await fetch('/.netlify/functions/key-level');
    const data = await res.json();

    const levelTypeEl = document.getElementById('level-type');
    const levelPriceEl = document.getElementById('key-level-price');
    const levelDescEl = document.getElementById('key-level-desc');
    const levelDistanceEl = document.getElementById('key-level-distance');
    const widgetEl = document.getElementById('key-level-widget');

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

  } catch (e) {
    console.error('Key level error:', e);
    const levelDescEl = document.getElementById('key-level-desc');
    if (levelDescEl) {
      levelDescEl.textContent = 'Unable to load key level';
    }
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
