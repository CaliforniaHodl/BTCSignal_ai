// AI Trade Coach - Trade Evaluation Tool
// Requires: shared.js
(function() {
  const FEATURE_KEY = 'trade-coach-access';
  const HISTORY_KEY = 'trade-coach-history';

  // Market context cache
  let marketContext = null;

  // Use shared access check
  function checkAccess() {
    return BTCSAIShared.checkAccess(FEATURE_KEY);
  }

  function updateUI() {
    BTCSAIShared.updatePremiumUI('premium-gate', 'premium-content', checkAccess(), loadHistory);
  }

  // Expose for manual refresh after enabling admin
  window.TradeCoachRefresh = updateUI;

  const unlockBtn = document.getElementById('btn-unlock');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', function() {
      Toast.confirm('This will cost 50 sats via Lightning. Continue?', function() {
        unlockFeature();
      });
    });
  }

  const checkAccessLink = document.getElementById('check-access');
  if (checkAccessLink) {
    checkAccessLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (checkAccess()) {
        updateUI();
      } else {
        Toast.warning('No active access found. Please unlock to continue.');
      }
    });
  }

  const tradeForm = document.getElementById('trade-form');
  if (tradeForm) {
    tradeForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      await analyzeTrade();
    });
  }

  const newTradeBtn = document.getElementById('btn-new-trade');
  if (newTradeBtn) {
    newTradeBtn.addEventListener('click', function() {
      document.getElementById('analysis-results').style.display = 'none';
      document.querySelector('.trade-input-section').style.display = 'block';
      tradeForm.reset();
    });
  }

  // Fetch current market context
  async function fetchMarketContext() {
    try {
      // Try to get from shared market snapshot first
      const snapshot = BTCSAIShared.getMarketSnapshot ? BTCSAIShared.getMarketSnapshot() : null;

      if (snapshot) {
        marketContext = {
          price: snapshot.price?.current || null,
          change24h: snapshot.price?.change24h || null,
          high24h: snapshot.price?.high24h || null,
          low24h: snapshot.price?.low24h || null,
          volatility: calculateVolatilityFromRange(snapshot.price?.high24h, snapshot.price?.low24h, snapshot.price?.current),
          trend: determineTrend(snapshot),
          fearGreed: snapshot.fearGreed?.value || null,
          fearGreedLabel: snapshot.fearGreed?.label || null,
          fundingRate: snapshot.funding?.ratePercent || null
        };
        return marketContext;
      }

      // Fallback: fetch directly from APIs
      const [priceRes, fgRes] = await Promise.all([
        fetch('https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT'),
        fetch('https://api.alternative.me/fng/?limit=1').catch(() => null)
      ]);

      const priceData = await priceRes.json();
      const fgData = fgRes ? await fgRes.json() : null;

      const price = parseFloat(priceData.lastPrice);
      const high = parseFloat(priceData.highPrice);
      const low = parseFloat(priceData.lowPrice);
      const change = parseFloat(priceData.priceChangePercent);

      marketContext = {
        price: price,
        change24h: change,
        high24h: high,
        low24h: low,
        volatility: calculateVolatilityFromRange(high, low, price),
        trend: change > 2 ? 'bullish' : change < -2 ? 'bearish' : 'neutral',
        fearGreed: fgData?.data?.[0]?.value ? parseInt(fgData.data[0].value) : null,
        fearGreedLabel: fgData?.data?.[0]?.value_classification || null,
        fundingRate: null
      };

      return marketContext;
    } catch (error) {
      console.error('Failed to fetch market context:', error);
      return null;
    }
  }

  function calculateVolatilityFromRange(high, low, current) {
    if (!high || !low || !current) return 'unknown';
    const range = ((high - low) / current) * 100;
    if (range > 5) return 'high';
    if (range > 2) return 'moderate';
    return 'low';
  }

  function determineTrend(snapshot) {
    if (!snapshot?.price?.change24h) return 'unknown';
    const change = snapshot.price.change24h;
    if (change > 3) return 'strong_bullish';
    if (change > 1) return 'bullish';
    if (change < -3) return 'strong_bearish';
    if (change < -1) return 'bearish';
    return 'neutral';
  }

  // Get user's trading patterns from history
  function getUserTradingStats() {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (history.length < 2) return null;

    const stats = {
      totalTrades: history.length,
      avgScore: 0,
      winningTrades: 0,
      losingTrades: 0,
      longBias: 0,
      shortBias: 0,
      commonTimeframes: {},
      avgRiskScore: 0,
      improvementAreas: []
    };

    let totalScore = 0;
    let totalRiskScore = 0;

    history.forEach(item => {
      totalScore += item.analysis.overallScore;
      totalRiskScore += item.analysis.riskScore;

      if (item.trade.outcome === 'win') stats.winningTrades++;
      if (item.trade.outcome === 'loss') stats.losingTrades++;
      if (item.trade.direction === 'long') stats.longBias++;
      if (item.trade.direction === 'short') stats.shortBias++;

      stats.commonTimeframes[item.trade.timeframe] = (stats.commonTimeframes[item.trade.timeframe] || 0) + 1;
    });

    stats.avgScore = Math.round(totalScore / history.length);
    stats.avgRiskScore = Math.round(totalRiskScore / history.length);

    // Identify weak areas
    const avgScores = {
      entry: 0,
      risk: 0,
      logic: 0,
      sizing: 0
    };

    history.forEach(item => {
      avgScores.entry += item.analysis.entryScore;
      avgScores.risk += item.analysis.riskScore;
      avgScores.logic += item.analysis.logicScore;
      avgScores.sizing += item.analysis.sizingScore;
    });

    Object.keys(avgScores).forEach(key => {
      avgScores[key] = Math.round(avgScores[key] / history.length);
    });

    const weakest = Object.entries(avgScores).sort((a, b) => a[1] - b[1]);
    if (weakest[0][1] < 60) {
      stats.improvementAreas.push(weakest[0][0]);
    }
    if (weakest[1][1] < 60) {
      stats.improvementAreas.push(weakest[1][0]);
    }

    return stats;
  }

  // Find similar historical setups
  function findSimilarSetups(trade) {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (history.length < 3) return null;

    // Find trades with same direction and similar timeframe
    const similar = history.filter(item =>
      item.trade.direction === trade.direction &&
      item.trade.timeframe === trade.timeframe
    );

    if (similar.length < 2) return null;

    const avgScore = Math.round(similar.reduce((sum, item) => sum + item.analysis.overallScore, 0) / similar.length);
    const wins = similar.filter(item => item.trade.outcome === 'win').length;
    const losses = similar.filter(item => item.trade.outcome === 'loss').length;

    return {
      count: similar.length,
      avgScore: avgScore,
      wins: wins,
      losses: losses,
      winRate: similar.length > 0 ? Math.round((wins / (wins + losses || 1)) * 100) : null
    };
  }

  async function analyzeTrade() {
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';

    // Fetch market context
    await fetchMarketContext();

    const tradeData = {
      direction: document.getElementById('trade-direction').value,
      timeframe: document.getElementById('trade-timeframe').value,
      entryPrice: parseFloat(document.getElementById('entry-price').value),
      stopLoss: parseFloat(document.getElementById('stop-loss').value) || null,
      takeProfit: parseFloat(document.getElementById('take-profit').value) || null,
      positionSize: parseFloat(document.getElementById('position-size').value) || null,
      outcome: document.getElementById('trade-outcome').value,
      reasoning: document.getElementById('trade-reasoning').value,
      notes: document.getElementById('trade-notes').value
    };
    try {
      // Include auth headers for server-side validation
      const authHeaders = {};
      if (typeof BTCSAIAccess !== 'undefined') {
        const recoveryCode = BTCSAIAccess.getRecoveryCode();
        const sessionToken = BTCSAIAccess.getSessionToken();
        if (recoveryCode) authHeaders['X-Recovery-Code'] = recoveryCode;
        if (sessionToken) authHeaders['X-Session-Token'] = sessionToken;
      }

      const res = await fetch('/.netlify/functions/trade-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(tradeData)
      });

      if (res.status === 401) {
        Toast.error('Authentication required. Please purchase access.');
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        return;
      }

      const analysis = await res.json();
      displayAnalysis(analysis, tradeData);
      saveToHistory(tradeData, analysis);
    } catch (error) {
      const analysis = generateFallbackAnalysis(tradeData);
      displayAnalysis(analysis, tradeData);
      saveToHistory(tradeData, analysis);
    }
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }

  function displayAnalysis(analysis, tradeData) {
    document.querySelector('.trade-input-section').style.display = 'none';
    document.getElementById('analysis-results').style.display = 'block';

    // Display market context
    if (marketContext) {
      document.getElementById('ctx-price').textContent = marketContext.price ? '$' + marketContext.price.toLocaleString() : '--';

      var changeEl = document.getElementById('ctx-change');
      if (marketContext.change24h !== null) {
        changeEl.textContent = (marketContext.change24h >= 0 ? '+' : '') + marketContext.change24h.toFixed(2) + '%';
        changeEl.className = 'context-value ' + (marketContext.change24h >= 0 ? 'positive' : 'negative');
      }

      var volEl = document.getElementById('ctx-volatility');
      volEl.textContent = marketContext.volatility ? marketContext.volatility.toUpperCase() : '--';
      volEl.className = 'context-value ' + (marketContext.volatility === 'high' ? 'warning' : '');

      var fgEl = document.getElementById('ctx-fear-greed');
      if (marketContext.fearGreed) {
        fgEl.textContent = marketContext.fearGreed + ' (' + marketContext.fearGreedLabel + ')';
        fgEl.className = 'context-value ' + (marketContext.fearGreed <= 25 ? 'negative' : marketContext.fearGreed >= 75 ? 'warning' : '');
      }
    }

    const score = analysis.overallScore;
    document.getElementById('trade-score').textContent = score;
    const scoreCircle = document.getElementById('score-circle');
    const circumference = 2 * Math.PI * 45;
    scoreCircle.style.strokeDasharray = circumference;
    scoreCircle.style.strokeDashoffset = circumference - (score / 100 * circumference);
    scoreCircle.style.stroke = score >= 70 ? '#3fb950' : score >= 50 ? '#f7931a' : '#f85149';
    document.getElementById('entry-score').style.width = analysis.entryScore + '%';
    document.getElementById('risk-score').style.width = analysis.riskScore + '%';
    document.getElementById('logic-score').style.width = analysis.logicScore + '%';
    document.getElementById('sizing-score').style.width = analysis.sizingScore + '%';
    // Escape text content from API responses to prevent XSS
    var escape = typeof SecurityUtils !== 'undefined' ? SecurityUtils.escapeHtml : function(s) { return s; };
    document.getElementById('strengths-content').innerHTML = formatList(analysis.strengths);
    document.getElementById('improvements-content').innerHTML = formatList(analysis.improvements);
    document.getElementById('psychology-content').innerHTML = '<p>' + escape(analysis.psychology) + '</p>';
    document.getElementById('alternatives-content').innerHTML = '<p>' + escape(analysis.alternatives) + '</p>';
    document.getElementById('takeaways-content').innerHTML = formatList(analysis.takeaways);

    // Display user stats
    displayUserStats();
  }

  function displayUserStats() {
    var stats = getUserTradingStats();
    var container = document.getElementById('user-stats-grid');
    if (!container) return;

    if (!stats || stats.totalTrades < 2) {
      container.innerHTML = '<p class="no-stats">Complete a few analyses to see your stats</p>';
      return;
    }

    var winRate = stats.winningTrades + stats.losingTrades > 0
      ? Math.round((stats.winningTrades / (stats.winningTrades + stats.losingTrades)) * 100)
      : null;

    var mostUsedTf = Object.entries(stats.commonTimeframes).sort((a, b) => b[1] - a[1])[0];
    var directionBias = stats.longBias > stats.shortBias ? 'Long' : stats.shortBias > stats.longBias ? 'Short' : 'Balanced';
    var biasPercent = Math.round((Math.max(stats.longBias, stats.shortBias) / stats.totalTrades) * 100);

    container.innerHTML = '' +
      '<div class="stat-card">' +
        '<span class="stat-value">' + stats.totalTrades + '</span>' +
        '<span class="stat-label">Total Trades</span>' +
      '</div>' +
      '<div class="stat-card">' +
        '<span class="stat-value">' + stats.avgScore + '</span>' +
        '<span class="stat-label">Avg Score</span>' +
      '</div>' +
      (winRate !== null ? '<div class="stat-card">' +
        '<span class="stat-value">' + winRate + '%</span>' +
        '<span class="stat-label">Win Rate</span>' +
      '</div>' : '') +
      '<div class="stat-card">' +
        '<span class="stat-value">' + directionBias + '</span>' +
        '<span class="stat-label">Direction Bias (' + biasPercent + '%)</span>' +
      '</div>' +
      (mostUsedTf ? '<div class="stat-card">' +
        '<span class="stat-value">' + mostUsedTf[0] + '</span>' +
        '<span class="stat-label">Favorite TF</span>' +
      '</div>' : '') +
      (stats.improvementAreas.length > 0 ? '<div class="stat-card warning">' +
        '<span class="stat-value">' + stats.improvementAreas[0] + '</span>' +
        '<span class="stat-label">Focus Area</span>' +
      '</div>' : '');
  }

  function formatList(items) {
    if (!items || items.length === 0) return '<p>None identified</p>';
    // Escape each item to prevent XSS from API responses
    var escape = typeof SecurityUtils !== 'undefined' ? SecurityUtils.escapeHtml : function(s) { return s; };
    return '<ul>' + items.map(function(item) { return '<li>' + escape(item) + '</li>'; }).join('') + '</ul>';
  }

  function generateFallbackAnalysis(trade) {
    var strengths = [];
    var improvements = [];
    var hasStopLoss = trade.stopLoss && trade.stopLoss > 0;
    var hasTakeProfit = trade.takeProfit && trade.takeProfit > 0;
    var hasReasoning = trade.reasoning && trade.reasoning.trim().length > 0;
    var hasPositionSize = trade.positionSize && trade.positionSize > 0;

    // Get user stats and similar setups
    var userStats = getUserTradingStats();
    var similarSetups = findSimilarSetups(trade);

    var stopDistancePercent = 0;
    if (hasStopLoss) {
      if (trade.direction === 'long') {
        stopDistancePercent = ((trade.entryPrice - trade.stopLoss) / trade.entryPrice) * 100;
      } else {
        stopDistancePercent = ((trade.stopLoss - trade.entryPrice) / trade.entryPrice) * 100;
      }
    }

    var tpDistancePercent = 0;
    if (hasTakeProfit) {
      if (trade.direction === 'long') {
        tpDistancePercent = ((trade.takeProfit - trade.entryPrice) / trade.entryPrice) * 100;
      } else {
        tpDistancePercent = ((trade.entryPrice - trade.takeProfit) / trade.entryPrice) * 100;
      }
    }

    var riskReward = 0;
    if (stopDistancePercent > 0 && tpDistancePercent > 0) {
      riskReward = tpDistancePercent / stopDistancePercent;
    }

    var stopLossValid = false;
    if (hasStopLoss) {
      if (trade.direction === 'long' && trade.stopLoss < trade.entryPrice) {
        stopLossValid = true;
      } else if (trade.direction === 'short' && trade.stopLoss > trade.entryPrice) {
        stopLossValid = true;
      }
    }

    var takeProfitValid = false;
    if (hasTakeProfit) {
      if (trade.direction === 'long' && trade.takeProfit > trade.entryPrice) {
        takeProfitValid = true;
      } else if (trade.direction === 'short' && trade.takeProfit < trade.entryPrice) {
        takeProfitValid = true;
      }
    }

    var volatilityByTimeframe = {
      '1m': { typical: 0.1, wide: 0.3, tight: 0.05 },
      '5m': { typical: 0.25, wide: 0.5, tight: 0.1 },
      '15m': { typical: 0.4, wide: 0.8, tight: 0.2 },
      '1h': { typical: 0.8, wide: 1.5, tight: 0.4 },
      '4h': { typical: 1.5, wide: 3, tight: 0.7 },
      '1d': { typical: 3, wide: 6, tight: 1.5 }
    };
    var tfVolatility = volatilityByTimeframe[trade.timeframe] || volatilityByTimeframe['1h'];

    var dollarRisk = 0;
    if (hasPositionSize && stopDistancePercent > 0) {
      dollarRisk = trade.positionSize * (stopDistancePercent / 100);
    }

    var entryScore = 50;
    var riskScore = 30;
    var logicScore = 40;
    var sizingScore = 50;

    if (hasReasoning) {
      var reasoningLength = trade.reasoning.trim().length;
      if (reasoningLength > 200) entryScore = 80;
      else if (reasoningLength > 100) entryScore = 70;
      else if (reasoningLength > 50) entryScore = 60;
      else entryScore = 55;
    }

    if (hasStopLoss && stopLossValid) {
      if (stopDistancePercent >= tfVolatility.tight && stopDistancePercent <= tfVolatility.wide) {
        riskScore = 85;
      } else if (stopDistancePercent < tfVolatility.tight) {
        riskScore = 55;
      } else if (stopDistancePercent > tfVolatility.wide) {
        riskScore = 60;
      } else {
        riskScore = 70;
      }
      if (riskReward >= 3) riskScore = Math.min(95, riskScore + 10);
      else if (riskReward >= 2) riskScore = Math.min(90, riskScore + 5);
    } else if (hasStopLoss && !stopLossValid) {
      riskScore = 20;
    }

    if (hasReasoning) {
      var reasoning = trade.reasoning.toLowerCase();
      var redFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'everyone', 'twitter', 'cant lose', 'guaranteed', 'yolo', 'moon', 'ape'];
      var greenFlags = ['support', 'resistance', 'trend', 'structure', 'volume', 'liquidity', 'invalidat', 'confluence', 'ema', 'sma', 'rsi', 'macd', 'vwap', 'fib', 'level', 'breakout', 'retest'];

      var redCount = 0;
      var greenCount = 0;
      redFlags.forEach(function(flag) { if (reasoning.includes(flag)) redCount++; });
      greenFlags.forEach(function(flag) { if (reasoning.includes(flag)) greenCount++; });

      if (greenCount >= 3 && redCount === 0) logicScore = 90;
      else if (greenCount >= 2 && redCount === 0) logicScore = 80;
      else if (greenCount >= 1 && redCount === 0) logicScore = 70;
      else if (redCount >= 2) logicScore = 35;
      else if (redCount === 1) logicScore = 50;
      else logicScore = 60;
    }

    if (hasPositionSize && dollarRisk > 0) {
      if (dollarRisk <= 100) sizingScore = 90;
      else if (dollarRisk <= 500) sizingScore = 80;
      else if (dollarRisk <= 1000) sizingScore = 70;
      else if (dollarRisk <= 2500) sizingScore = 60;
      else sizingScore = 40;
    } else if (hasPositionSize) {
      sizingScore = 70;
    }

    var overallScore = Math.round((entryScore + riskScore + logicScore + sizingScore) / 4);

    if (!hasStopLoss) {
      improvements.push('No stop loss defined. This is the #1 account killer - always know your exit before entry.');
    } else if (!stopLossValid) {
      improvements.push('Stop loss is on the WRONG side of entry. For a ' + trade.direction + ', your stop should be ' + (trade.direction === 'long' ? 'BELOW' : 'ABOVE') + ' $' + trade.entryPrice.toLocaleString() + '.');
    } else {
      if (stopDistancePercent < tfVolatility.tight) {
        improvements.push('Stop is very tight for ' + trade.timeframe + ' timeframe. Consider widening to ' + tfVolatility.typical.toFixed(1) + '-' + tfVolatility.wide.toFixed(1) + '%.');
      } else if (stopDistancePercent > tfVolatility.wide) {
        improvements.push('Stop is quite wide for ' + trade.timeframe + '. Typical range: ' + tfVolatility.typical.toFixed(1) + '-' + tfVolatility.wide.toFixed(1) + '%.');
      } else {
        strengths.push('Stop placement is appropriate for ' + trade.timeframe + ' timeframe volatility.');
      }
    }

    if (!hasTakeProfit) {
      improvements.push('No take profit set. Without a target, greed often turns winners into losers.');
    } else if (!takeProfitValid) {
      improvements.push('Take profit is on the WRONG side. For a ' + trade.direction + ', TP should be ' + (trade.direction === 'long' ? 'ABOVE' : 'BELOW') + ' entry.');
    } else if (riskReward > 0) {
      var breakEvenWinRate = (100 / (riskReward + 1)).toFixed(0);
      if (riskReward >= 3) {
        strengths.push('Excellent ' + riskReward.toFixed(1) + ':1 R:R. You only need ' + breakEvenWinRate + '% win rate to be profitable.');
      } else if (riskReward >= 2) {
        strengths.push('Solid ' + riskReward.toFixed(1) + ':1 R:R. Break-even win rate: ' + breakEvenWinRate + '%.');
      } else if (riskReward >= 1.5) {
        strengths.push('R:R of ' + riskReward.toFixed(1) + ':1 is acceptable, but aim for 2:1+ when possible.');
      } else {
        improvements.push('R:R of ' + riskReward.toFixed(1) + ':1 requires ' + breakEvenWinRate + '% win rate. Look for better setups.');
      }
    }

    if (hasPositionSize && dollarRisk > 2500) {
      improvements.push('Risking $' + dollarRisk.toFixed(0) + ' is aggressive. Consider if this aligns with your risk tolerance.');
    } else if (hasPositionSize && dollarRisk > 1000) {
      improvements.push('Dollar risk of $' + dollarRisk.toFixed(0) + ' is significant. Ensure this is within your 1-2% account risk.');
    }

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY you are taking this trade.');
    } else {
      var reasoningLower = trade.reasoning.toLowerCase();
      var hasRedFlags = ['feeling', 'gut', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(function(flag) { return reasoningLower.includes(flag); });
      var hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(function(flag) { return reasoningLower.includes(flag); });

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language suggesting this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - good foundation.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief. More detail helps you review what worked/failed later.');
      }
    }

    var psychology = '';
    var reasoningText = (trade.reasoning || '').toLowerCase();

    if (reasoningText.includes('revenge') || reasoningText.includes('make back')) {
      psychology = 'WARNING: Language suggests revenge trading. Step away and reset emotionally.';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping requires intense focus. Ensure you are not overtrading.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry.';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Stick to this process.';
    } else {
      psychology = 'The goal is not to be right, but to manage risk so being wrong does not hurt you.';
    }

    // Add market context to psychology
    if (marketContext) {
      if (marketContext.fearGreed && marketContext.fearGreed <= 25 && trade.direction === 'short') {
        psychology += ' Note: Market is in Extreme Fear (' + marketContext.fearGreed + ') - shorting fear often reverses.';
      } else if (marketContext.fearGreed && marketContext.fearGreed >= 75 && trade.direction === 'long') {
        psychology += ' Note: Market is in Extreme Greed (' + marketContext.fearGreed + ') - be cautious with longs here.';
      }
      if (marketContext.volatility === 'high') {
        psychology += ' Current volatility is HIGH - consider reducing size or widening stops.';
      }
    }

    // Add user pattern insights
    if (userStats && userStats.improvementAreas.length > 0) {
      var weakArea = userStats.improvementAreas[0];
      psychology += ' Based on your history, focus on improving your ' + weakArea + ' decisions.';
    }

    var alternatives = '';
    if (trade.direction === 'long') {
      var suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      alternatives = 'Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' for better R:R.';
    } else {
      var suggestedEntryShort = trade.entryPrice * (1 + tfVolatility.typical / 100);
      alternatives = 'Consider limit at $' + suggestedEntryShort.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' for better entry.';
    }

    // Add similar setups insight
    if (similarSetups && similarSetups.count >= 2) {
      alternatives += ' Similar setups (' + trade.direction + ' on ' + trade.timeframe + '): You\'ve done ' + similarSetups.count + ' similar trades with avg score ' + similarSetups.avgScore + '.';
      if (similarSetups.winRate !== null && similarSetups.wins + similarSetups.losses >= 2) {
        alternatives += ' Win rate: ' + similarSetups.winRate + '%.';
      }
    }

    // Add market context to alternatives
    if (marketContext && marketContext.price) {
      var priceDiff = ((trade.entryPrice - marketContext.price) / marketContext.price * 100).toFixed(2);
      if (Math.abs(priceDiff) > 1) {
        alternatives += ' Current BTC price: $' + marketContext.price.toLocaleString() + ' (' + (priceDiff > 0 ? '+' : '') + priceDiff + '% from your entry).';
      }
    }

    var takeaways = [];
    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }
    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R');
    } else if (riskReward >= 2) {
      takeaways.push('Your R:R is solid - maintain this standard');
    }
    if (dollarRisk > 2500) {
      takeaways.push('Consider reducing position size');
    }

    // Market context takeaways
    if (marketContext) {
      if (marketContext.trend === 'strong_bearish' && trade.direction === 'long') {
        takeaways.push('Counter-trend trade: market is strongly bearish (-' + Math.abs(marketContext.change24h).toFixed(1) + '% 24h)');
      } else if (marketContext.trend === 'strong_bullish' && trade.direction === 'short') {
        takeaways.push('Counter-trend trade: market is strongly bullish (+' + marketContext.change24h.toFixed(1) + '% 24h)');
      }
      if (marketContext.volatility === 'high') {
        takeaways.push('High volatility environment - size down or widen stops');
      }
    }

    // User pattern takeaways
    if (userStats && userStats.avgScore < 50 && userStats.totalTrades >= 3) {
      takeaways.push('Your avg trade score is ' + userStats.avgScore + ' - review your process');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }
    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore: overallScore,
      entryScore: entryScore,
      riskScore: riskScore,
      logicScore: logicScore,
      sizingScore: sizingScore,
      strengths: strengths,
      improvements: improvements,
      psychology: psychology,
      alternatives: alternatives,
      takeaways: takeaways,
      marketContext: marketContext,
      userStats: userStats,
      similarSetups: similarSetups
    };
  }

  function saveToHistory(trade, analysis) {
    var history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade: trade,
      analysis: analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    var container = document.getElementById('analyses-list');
    if (!container) return;
    var history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map(function(item) {
      var date = new Date(item.timestamp).toLocaleDateString();
      var score = item.analysis.overallScore;
      var scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return '<div class="history-item">' +
        '<div class="history-info">' +
        '<span class="history-direction ' + item.trade.direction + '">' + item.trade.direction.toUpperCase() + '</span>' +
        '<span class="history-entry">$' + item.trade.entryPrice.toLocaleString() + '</span>' +
        '<span class="history-date">' + date + '</span>' +
        '</div>' +
        '<div class="history-score ' + scoreClass + '">' + score + '</div>' +
        '</div>';
    }).join('');
  }

  updateUI();
})();
