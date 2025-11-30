// AI Trade Coach - Trade Evaluation Tool
(function() {
  const FEATURE_KEY = 'trade-coach-access';
  const HISTORY_KEY = 'trade-coach-history';

  function checkAccess() {
    if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.isAdmin()) {
      console.log('%c ADMIN: Trade Coach access bypassed', 'color: #f7931a;');
      return true;
    }
    if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.hasAllAccess()) {
      console.log('All-access subscription active, unlocking Trade Coach');
      return true;
    }
    return localStorage.getItem(FEATURE_KEY) === 'unlocked';
  }

  function updateUI() {
    const gate = document.getElementById('premium-gate');
    const content = document.getElementById('premium-content');
    if (checkAccess()) {
      if (gate) gate.style.display = 'none';
      if (content) {
        content.style.display = 'block';
        loadHistory();
      }
    } else {
      if (gate) gate.style.display = 'flex';
      if (content) content.style.display = 'none';
    }
  }

  const unlockBtn = document.getElementById('btn-unlock');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', function() {
      const confirmed = confirm('This will cost 50 sats via Lightning. Continue?');
      if (confirmed) {
        localStorage.setItem(FEATURE_KEY, 'unlocked');
        updateUI();
      }
    });
  }

  const checkAccessLink = document.getElementById('check-access');
  if (checkAccessLink) {
    checkAccessLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (checkAccess()) {
        updateUI();
      } else {
        alert('No active access found. Please unlock to continue.');
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
    return '<ul>' + items.map(item => '<li>' + item + '</li>').join('') + '</ul>';
  }


  function generateFallbackAnalysis(trade) {
    const strengths = [];
    const improvements = [];
    const hasStopLoss = trade.stopLoss && trade.stopLoss > 0;
    const hasTakeProfit = trade.takeProfit && trade.takeProfit > 0;
    const hasReasoning = trade.reasoning && trade.reasoning.trim().length > 0;
    const hasPositionSize = trade.positionSize && trade.positionSize > 0;

    let stopDistancePercent = 0;
    if (hasStopLoss) {
      if (trade.direction === 'long') {
        stopDistancePercent = ((trade.entryPrice - trade.stopLoss) / trade.entryPrice) * 100;
      } else {
        stopDistancePercent = ((trade.stopLoss - trade.entryPrice) / trade.entryPrice) * 100;
      }
    }

    let tpDistancePercent = 0;
    if (hasTakeProfit) {
      if (trade.direction === 'long') {
        tpDistancePercent = ((trade.takeProfit - trade.entryPrice) / trade.entryPrice) * 100;
      } else {
        tpDistancePercent = ((trade.entryPrice - trade.takeProfit) / trade.entryPrice) * 100;
      }
    }

    let riskReward = 0;
    if (stopDistancePercent > 0 && tpDistancePercent > 0) {
      riskReward = tpDistancePercent / stopDistancePercent;
    }

    let stopLossValid = false;
    if (hasStopLoss) {
      if (trade.direction === 'long' && trade.stopLoss < trade.entryPrice) {
        stopLossValid = true;
      } else if (trade.direction === 'short' && trade.stopLoss > trade.entryPrice) {
        stopLossValid = true;
      }
    }

    let takeProfitValid = false;
    if (hasTakeProfit) {
      if (trade.direction === 'long' && trade.takeProfit > trade.entryPrice) {
        takeProfitValid = true;
      } else if (trade.direction === 'short' && trade.takeProfit < trade.entryPrice) {
        takeProfitValid = true;
      }
    }

    const volatilityByTimeframe = {
      '1m': { typical: 0.1, wide: 0.3, tight: 0.05 },
      '5m': { typical: 0.25, wide: 0.5, tight: 0.1 },
      '15m': { typical: 0.4, wide: 0.8, tight: 0.2 },
      '1h': { typical: 0.8, wide: 1.5, tight: 0.4 },
      '4h': { typical: 1.5, wide: 3, tight: 0.7 },
      '1d': { typical: 3, wide: 6, tight: 1.5 }
    };
    const tfVolatility = volatilityByTimeframe[trade.timeframe] || volatilityByTimeframe['1h'];

    let dollarRisk = 0;
    if (hasPositionSize && stopDistancePercent > 0) {
      dollarRisk = trade.positionSize * (stopDistancePercent / 100);
    }

    let entryScore = 50;
    let riskScore = 30;
    let logicScore = 40;
    let sizingScore = 50;

    if (hasReasoning) {
      const reasoningLength = trade.reasoning.trim().length;
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
      const reasoning = trade.reasoning.toLowerCase();
      const redFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'everyone', 'twitter', 'cant lose', 'guaranteed', 'yolo', 'moon', 'ape'];
      const greenFlags = ['support', 'resistance', 'trend', 'structure', 'volume', 'liquidity', 'invalidat', 'confluence', 'ema', 'sma', 'rsi', 'macd', 'vwap', 'fib', 'level', 'breakout', 'retest'];

      let redCount = 0;
      let greenCount = 0;
      redFlags.forEach(flag => { if (reasoning.includes(flag)) redCount++; });
      greenFlags.forEach(flag => { if (reasoning.includes(flag)) greenCount++; });

      if (greenCount >= 3 && redCount === 0) logicScore = 90;
      else if (greenCount >= 2 && redCount === 0) logicScore = 80;
      else if (greenCount >= 1 && redCount === 0) logicScore = 70;
      else if (redCount >= 2) logicScore = 35;
      else if (redCount === 1) logicScore = 50;
      else logicScore = 60;
    }

    // Sizing score based on dollar risk
    if (hasPositionSize && dollarRisk > 0) {
      if (dollarRisk <= 100) sizingScore = 90;
      else if (dollarRisk <= 500) sizingScore = 80;
      else if (dollarRisk <= 1000) sizingScore = 70;
      else if (dollarRisk <= 2500) sizingScore = 60;
      else sizingScore = 40;
    } else if (hasPositionSize) {
      sizingScore = 70;
    }

    const overallScore = Math.round((entryScore + riskScore + logicScore + sizingScore) / 4);


    if (!hasStopLoss) {
      improvements.push('No stop loss defined. This is the #1 account killer - always know your exit before entry.');
    } else if (!stopLossValid) {
      improvements.push('Stop loss is on the WRONG side of entry. For a ' + trade.direction + ', your stop should be ' + (trade.direction === 'long' ? 'BELOW' : 'ABOVE') + ' $' + trade.entryPrice.toLocaleString() + '.');
    } else {
      if (stopDistancePercent < tfVolatility.tight) {
        improvements.push('Stop at $' + trade.stopLoss.toLocaleString() + ' is only ' + stopDistancePercent.toFixed(2) + '% from entry. For ' + trade.timeframe + ' timeframe, this is very tight - normal volatility could stop you out. Consider ' + tfVolatility.typical.toFixed(1) + '-' + tfVolatility.wide.toFixed(1) + '% for this timeframe.');
      } else if (stopDistancePercent > tfVolatility.wide) {
        improvements.push('Stop at $' + trade.stopLoss.toLocaleString() + ' is ' + stopDistancePercent.toFixed(2) + '% away - quite wide for ' + trade.timeframe + '. You might be risking more than necessary. Typical range: ' + tfVolatility.typical.toFixed(1) + '-' + tfVolatility.wide.toFixed(1) + '%.');
      } else {
        strengths.push('Stop at $' + trade.stopLoss.toLocaleString() + ' (' + stopDistancePercent.toFixed(2) + '% risk) is appropriate for ' + trade.timeframe + ' timeframe volatility.');
      }
    }

    if (!hasTakeProfit) {
      improvements.push('No take profit set. Without a target, greed often turns winners into losers.');
    } else if (!takeProfitValid) {
      improvements.push('Take profit is on the WRONG side. For a ' + trade.direction + ', TP should be ' + (trade.direction === 'long' ? 'ABOVE' : 'BELOW') + ' entry.');
    } else if (riskReward > 0) {
      const breakEvenWinRate = (100 / (riskReward + 1)).toFixed(0);
      if (riskReward >= 3) {
        strengths.push('Excellent ' + riskReward.toFixed(1) + ':1 R:R. You only need to win ' + breakEvenWinRate + '% of trades like this to be profitable.');
      } else if (riskReward >= 2) {
        strengths.push('Solid ' + riskReward.toFixed(1) + ':1 R:R. Break-even win rate: ' + breakEvenWinRate + '%. This is sustainable.');
      } else if (riskReward >= 1.5) {
        strengths.push('R:R of ' + riskReward.toFixed(1) + ':1 is acceptable (break-even: ' + breakEvenWinRate + '%), but aim for 2:1+ when possible.');
      } else {
        improvements.push('R:R of only ' + riskReward.toFixed(1) + ':1 means you need ' + breakEvenWinRate + '% win rate just to break even. Look for setups with better reward.');
      }
    }

    // Position sizing feedback (dollar-based)
    if (hasPositionSize && dollarRisk > 0) {
      if (dollarRisk > 2500) {
        improvements.push('Risking 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (dollarRisk > 2500) {
      takeaways.push('Consider reducing position size - 

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + dollarRisk.toFixed(0) + ' on this trade is aggressive. Consider if this aligns with your risk tolerance.');
      } else if (dollarRisk > 1000) {
        improvements.push('Dollar risk of 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + dollarRisk.toFixed(0) + ' is moderate. Make sure this fits within your overall risk management plan.');
      } else if (dollarRisk > 500) {
        strengths.push('Reasonable risk of 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + dollarRisk.toFixed(0) + ' on a 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + trade.positionSize.toLocaleString() + ' position.');
      } else {
        strengths.push('Conservative risk of 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + dollarRisk.toFixed(0) + ' on a 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + trade.positionSize.toLocaleString() + ' position - good capital preservation.');
      }
    } else if (hasPositionSize && !hasStopLoss) {
      improvements.push('Position size of 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + trade.positionSize.toLocaleString() + ' entered, but without a stop loss your risk is undefined.');
    } else if (!hasPositionSize) {
      improvements.push('No position size specified. Always know your dollar risk before entering.');
    }

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + dollarRisk.toFixed(0) + ' at risk is significant');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + dollarRisk.toFixed(0) + ' on this trade is aggressive. Consider if this aligns with your risk tolerance.');
      } else if (dollarRisk > 1000) {
        improvements.push('Dollar risk of 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + dollarRisk.toFixed(0) + ' is moderate. Make sure this fits within your overall risk management plan.');
      } else if (dollarRisk > 500) {
        strengths.push('Reasonable risk of 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + dollarRisk.toFixed(0) + ' on a 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + trade.positionSize.toLocaleString() + ' position.');
      } else {
        strengths.push('Conservative risk of 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + dollarRisk.toFixed(0) + ' on a 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + trade.positionSize.toLocaleString() + ' position - good capital preservation.');
      }
    } else if (hasPositionSize && !hasStopLoss) {
      improvements.push('Position size of 

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

 + trade.positionSize.toLocaleString() + ' entered, but without a stop loss your risk is undefined.');
    } else if (!hasPositionSize) {
      improvements.push('No position size specified. Always know your dollar risk before entering.');
    }

    if (!hasReasoning) {
      improvements.push('No trade reasoning provided. Document WHY youre taking this trade - its the only way to learn from outcomes.');
    } else {
      const reasoning = trade.reasoning.toLowerCase();
      const hasRedFlags = ['feeling', 'gut', 'should go', 'has to', 'revenge', 'make back', 'cant lose', 'yolo', 'moon', 'ape'].some(flag => reasoning.includes(flag));
      const hasTechnical = ['support', 'resistance', 'trend', 'structure', 'volume', 'ema', 'breakout', 'level'].some(flag => reasoning.includes(flag));

      if (hasRedFlags) {
        improvements.push('Your reasoning contains emotional language. Words like "feeling", "has to", "cant lose" suggest this may not be a purely technical decision.');
      }
      if (hasTechnical) {
        strengths.push('Reasoning includes technical analysis concepts - this is the foundation of consistent trading.');
      }
      if (trade.reasoning.trim().length < 50) {
        improvements.push('Reasoning is brief (' + trade.reasoning.trim().length + ' chars). More detail helps you review what worked/failed later.');
      }
    }


    let psychology = '';
    const reasoning = (trade.reasoning || '').toLowerCase();

    if (reasoning.includes('revenge') || reasoning.includes('make back') || reasoning.includes('recover')) {
      psychology = 'WARNING: Language suggests revenge trading. Taking trades to "make back" losses leads to larger losses. Step away, reset emotionally, then return with a fresh setup.';
    } else if (reasoning.includes('everyone') || reasoning.includes('twitter') || reasoning.includes('they said')) {
      psychology = 'Following crowd sentiment is dangerous. By the time "everyone" sees a trade, smart money is often exiting. What does YOUR analysis say?';
    } else if (!hasStopLoss && trade.direction === 'short') {
      psychology = 'Shorting without a stop is extremely dangerous - losses are theoretically unlimited. This setup suggests overconfidence. No trade idea is certain.';
    } else if (trade.timeframe === '1m' || trade.timeframe === '5m') {
      psychology = 'Scalping on ' + trade.timeframe + ' requires intense focus and quick decisions. Ensure youre not overtrading - quality setups on higher timeframes often have better win rates and less stress.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a written thesis typically indicates impulsive entry. Before your next trade, write down: 1) Why now? 2) What invalidates this? 3) Where do I take profit?';
    } else if (logicScore >= 80) {
      psychology = 'Your documented approach shows discipline. Win or lose, stick to this process. Consistency in methodology beats inconsistent brilliance.';
    } else {
      psychology = 'Remember: the goal isnt to be right, its to manage risk well enough that being wrong doesnt hurt you. This trade ' + (riskScore >= 70 ? 'has solid risk parameters.' : 'could use tighter risk management.');
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      const suggestedEntry = trade.entryPrice * (1 - tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 - tfVolatility.typical / 100);
      alternatives = 'For better R:R on longs: Consider a limit order at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (pullback to ~' + tfVolatility.typical.toFixed(1) + '% below current) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Look for confluence with EMAs, previous support, or volume profile POC.';
    } else {
      const suggestedEntry = trade.entryPrice * (1 + tfVolatility.typical / 100);
      const suggestedStop = suggestedEntry * (1 + tfVolatility.typical / 100);
      alternatives = 'For shorts: Better entries often come from failed breakouts. Consider limit at $' + suggestedEntry.toLocaleString(undefined, {maximumFractionDigits: 0}) + ' (rejection from ~' + tfVolatility.typical.toFixed(1) + '% above) with stop at $' + suggestedStop.toLocaleString(undefined, {maximumFractionDigits: 0}) + '. Wait for lower highs to confirm bearish structure.';
    }

    const takeaways = [];

    if (!stopLossValid && hasStopLoss) {
      takeaways.push('CRITICAL: Fix your stop loss direction before trading');
    } else if (!hasStopLoss) {
      takeaways.push('Priority #1: Never enter without a stop loss');
    }

    if (riskReward < 1.5 && riskReward > 0) {
      takeaways.push('Seek setups with 2:1+ R:R - your current ' + riskReward.toFixed(1) + ':1 requires high win rate');
    } else if (riskReward >= 2) {
      takeaways.push('Your ' + riskReward.toFixed(1) + ':1 R:R is solid - maintain this standard');
    }

    if (trade.positionSize > 5) {
      takeaways.push('Reduce position size to 2-5% to survive losing streaks');
    }

    if (takeaways.length === 0) {
      takeaways.push('Trade setup is reasonable - focus on execution discipline');
    }

    takeaways.push('Review this trade in 24-48 hours regardless of outcome');

    return {
      overallScore,
      entryScore,
      riskScore,
      logicScore,
      sizingScore,
      strengths,
      improvements,
      psychology,
      alternatives,
      takeaways
    };
  }


  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  function loadHistory() {
    const container = document.getElementById('analyses-list');
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');

    if (history.length === 0) {
      container.innerHTML = '<p class="no-analyses">No analyses yet. Submit a trade above to get started!</p>';
      return;
    }

    container.innerHTML = history.map((item, index) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      const score = item.analysis.overallScore;
      const scoreClass = score >= 70 ? 'good' : score >= 50 ? 'okay' : 'poor';

      return `
        <div class="history-item">
          <div class="history-info">
            <span class="history-direction ${item.trade.direction}">${item.trade.direction.toUpperCase()}</span>
            <span class="history-entry">$${item.trade.entryPrice.toLocaleString()}</span>
            <span class="history-date">${date}</span>
          </div>
          <div class="history-score ${scoreClass}">${score}</div>
        </div>
      `;
    }).join('');
  }

  updateUI();
})();

