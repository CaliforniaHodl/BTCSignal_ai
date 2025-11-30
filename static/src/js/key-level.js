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

  } catch (e) {
    console.error('Key level error:', e);
    const levelDescEl = document.getElementById('key-level-desc');
    if (levelDescEl) {
      levelDescEl.textContent = 'Unable to load key level';
    }
    const heroLevelDesc = document.getElementById('hero-level-desc');
    if (heroLevelDesc) {
      heroLevelDesc.textContent = 'Unable to load';
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
