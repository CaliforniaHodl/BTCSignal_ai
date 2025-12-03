// Fetch block height from mempool.space
(function() {
  fetch('https://mempool.space/api/blocks/tip/height')
    .then(res => res.text())
    .then(height => {
      const el = document.getElementById('block-height');
      if (el) el.textContent = parseInt(height).toLocaleString();
    })
    .catch(() => {
      const el = document.getElementById('block-height');
      if (el) el.textContent = '—';
    });
})();
