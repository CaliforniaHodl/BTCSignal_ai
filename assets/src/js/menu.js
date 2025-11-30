// Bitcoin Ticker - Fetch live price from CoinGecko
$(document).ready(function() {
  function updateBTCPrice() {
    $.ajax({
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
      method: 'GET',
      success: function(data) {
        var price = parseFloat(data.bitcoin.usd).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        var change = parseFloat(data.bitcoin.usd_24h_change).toFixed(2);
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

  // Update immediately and then every 30 seconds (CoinGecko rate limit friendly)
  if ($('#btc-ticker').length) {
    updateBTCPrice();
    setInterval(updateBTCPrice, 30000);
  }
});
