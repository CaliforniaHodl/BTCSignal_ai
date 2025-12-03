// Live BTC price ticker
async function updatePrice() {
  try {
    const res = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
    const data = await res.json();
    const price = parseFloat(data.data.amount);
    document.getElementById('btc-price').textContent = '$' + price.toLocaleString(undefined, {maximumFractionDigits: 0});
  } catch (e) {
    document.getElementById('btc-price').textContent = 'Error';
  }
}
updatePrice();
setInterval(updatePrice, 30000);
