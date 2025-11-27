// Bitcoin Ticker - Fetch live price from Binance
$(document).ready(function() {
  function updateBTCPrice() {
    $.ajax({
      url: 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
      method: 'GET',
      success: function(data) {
        var price = parseFloat(data.lastPrice).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        var change = parseFloat(data.priceChangePercent).toFixed(2);
        var changeClass = change >= 0 ? 'positive' : 'negative';
        var changeSign = change >= 0 ? '+' : '';

        $('#btc-price').text('$' + price);
        $('#btc-change')
          .text(changeSign + change + '%')
          .removeClass('positive negative')
          .addClass(changeClass);
      },
      error: function() {
        $('#btc-price').text('--');
      }
    });
  }

  // Update immediately and then every 10 seconds
  if ($('#btc-ticker').length) {
    updateBTCPrice();
    setInterval(updateBTCPrice, 10000);
  }
});
