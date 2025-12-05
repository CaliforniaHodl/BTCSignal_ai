// AI Trade Coach - Trade Evaluation Tool
// Requires: shared.js
(function() {
  const FEATURE_KEY = 'trade-coach-access';
  const HISTORY_KEY = 'trade-coach-history';

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

  async function analyzeTrade() {
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
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
      const res = await fetch('/.netlify/functions/trade-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData)
      });
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
    document.getElementById('strengths-content').innerHTML = formatList(analysis.strengths);
    document.getElementById('improvements-content').innerHTML = formatList(analysis.improvements);
    document.getElementById('psychology-content').innerHTML = '<p>' + analysis.psychology + '</p>';
    document.getElementById('alternatives-content').innerHTML = '<p>' + analysis.alternatives + '</p>';
    document.getElementById('takeaways-content').innerHTML = formatList(analysis.takeaways);
  }

  function formatList(items) {
    if (!items || items.length === 0) return '<p>None identified</p>';
    return '<ul>' + items.map(function(item) { return '<li>' + item + '</li>'; }).join('') + '</ul>';
  }

  function generateFallbackAnalysis(trade) {
    var strengths = [];
    var improvements = [];
    var hasStopLoss = trade.stopLoss && trade.stopLoss > 0;
    var hasTakeProfit = trade.takeProfit && trade.takeProfit > 0;
    var hasReasoning = trade.reasoning && trade.reasoning.trim().length > 0;
    var hasPositionSize = trade.positionSize && trade.positionSize > 0;

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

    var alternatives = '';
    if (trade.direction === 'long') {
      var suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      alternatives = 'Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' for better R:R.';
    } else {
      var suggestedEntryShort = trade.entryPrice * (1 + tfVolatility.typical / 100);
      alternatives = 'Consider limit at $' + suggestedEntryShort.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' for better entry.';
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
      takeaways: takeaways
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
