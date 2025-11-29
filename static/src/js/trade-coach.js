// AI Trade Coach - Trade Evaluation Tool
(function() {
  const FEATURE_KEY = 'trade-coach-access';
  const HISTORY_KEY = 'trade-coach-history';

  function checkAccess() {
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

  // Unlock button
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

  // Check access link
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

  // Trade form submission
  const tradeForm = document.getElementById('trade-form');
  if (tradeForm) {
    tradeForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      await analyzeTrade();
    });
  }

  // New trade button
  const newTradeBtn = document.getElementById('btn-new-trade');
  if (newTradeBtn) {
    newTradeBtn.addEventListener('click', function() {
      document.getElementById('analysis-results').style.display = 'none';
      document.querySelector('.trade-input-section').style.display = 'block';
      tradeForm.reset();
    });
  }

  // Analyze trade
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
      // Fallback analysis
      const analysis = generateFallbackAnalysis(tradeData);
      displayAnalysis(analysis, tradeData);
      saveToHistory(tradeData, analysis);
    }

    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }

  // Display analysis results
  function displayAnalysis(analysis, tradeData) {
    document.querySelector('.trade-input-section').style.display = 'none';
    document.getElementById('analysis-results').style.display = 'block';

    // Overall score
    const score = analysis.overallScore;
    document.getElementById('trade-score').textContent = score;

    // Animate score circle
    const scoreCircle = document.getElementById('score-circle');
    const circumference = 2 * Math.PI * 45;
    scoreCircle.style.strokeDasharray = circumference;
    scoreCircle.style.strokeDashoffset = circumference - (score / 100 * circumference);
    scoreCircle.style.stroke = score >= 70 ? '#3fb950' : score >= 50 ? '#f7931a' : '#f85149';

    // Breakdown scores
    document.getElementById('entry-score').style.width = analysis.entryScore + '%';
    document.getElementById('risk-score').style.width = analysis.riskScore + '%';
    document.getElementById('logic-score').style.width = analysis.logicScore + '%';
    document.getElementById('sizing-score').style.width = analysis.sizingScore + '%';

    // Feedback content
    document.getElementById('strengths-content').innerHTML = formatList(analysis.strengths);
    document.getElementById('improvements-content').innerHTML = formatList(analysis.improvements);
    document.getElementById('psychology-content').innerHTML = '<p>' + analysis.psychology + '</p>';
    document.getElementById('alternatives-content').innerHTML = '<p>' + analysis.alternatives + '</p>';
    document.getElementById('takeaways-content').innerHTML = formatList(analysis.takeaways);
  }

  // Format list items
  function formatList(items) {
    if (!items || items.length === 0) return '<p>None identified</p>';
    return '<ul>' + items.map(item => '<li>' + item + '</li>').join('') + '</ul>';
  }

  // Generate fallback analysis
  function generateFallbackAnalysis(trade) {
    const hasStopLoss = trade.stopLoss && trade.stopLoss > 0;
    const hasTakeProfit = trade.takeProfit && trade.takeProfit > 0;
    const hasReasoning = trade.reasoning && trade.reasoning.length > 20;
    const goodSizing = trade.positionSize && trade.positionSize <= 5;

    let riskReward = 0;
    if (hasStopLoss && hasTakeProfit) {
      if (trade.direction === 'long') {
        riskReward = (trade.takeProfit - trade.entryPrice) / (trade.entryPrice - trade.stopLoss);
      } else {
        riskReward = (trade.entryPrice - trade.takeProfit) / (trade.stopLoss - trade.entryPrice);
      }
    }

    const entryScore = hasReasoning ? 70 : 50;
    const riskScore = hasStopLoss ? (riskReward >= 2 ? 85 : riskReward >= 1.5 ? 70 : 55) : 30;
    const logicScore = hasReasoning ? (trade.reasoning.length > 100 ? 80 : 65) : 40;
    const sizingScore = goodSizing ? 85 : (trade.positionSize ? (trade.positionSize <= 10 ? 65 : 40) : 50);

    const overallScore = Math.round((entryScore + riskScore + logicScore + sizingScore) / 4);

    const strengths = [];
    const improvements = [];

    if (hasStopLoss) {
      strengths.push('Good risk management with defined stop loss');
    } else {
      improvements.push('Always define a stop loss before entering a trade');
    }

    if (hasTakeProfit) {
      strengths.push('Clear profit target defined');
    } else {
      improvements.push('Set a take profit level to lock in gains');
    }

    if (riskReward >= 2) {
      strengths.push('Excellent risk-to-reward ratio of ' + riskReward.toFixed(1) + ':1');
    } else if (riskReward > 0 && riskReward < 1.5) {
      improvements.push('Consider trades with at least 2:1 risk-reward ratio');
    }

    if (hasReasoning) {
      strengths.push('Trade thesis documented - this helps with review and learning');
    } else {
      improvements.push('Document your reasoning for each trade to identify patterns in your decision-making');
    }

    if (goodSizing) {
      strengths.push('Conservative position sizing protects capital');
    } else if (trade.positionSize > 10) {
      improvements.push('Consider reducing position size to 1-5% to manage risk better');
    }

    let psychology = '';
    if (trade.direction === 'long' && trade.timeframe === '1m') {
      psychology = 'Scalping longs can lead to FOMO-driven entries. Ensure you had a clear setup and werent chasing green candles. Consider if a higher timeframe would give you more conviction.';
    } else if (trade.direction === 'short' && !hasStopLoss) {
      psychology = 'Shorting without a stop loss is extremely risky - unlimited loss potential. This suggests possible overconfidence or revenge trading. Always define your invalidation.';
    } else if (!hasReasoning) {
      psychology = 'Trading without a documented thesis often indicates impulsive or emotional trading. Before your next trade, write down 3 reasons why youre taking it.';
    } else {
      psychology = 'Your trade appears methodical with documented reasoning. Continue this disciplined approach. Remember: consistency in process matters more than individual outcomes.';
    }

    let alternatives = '';
    if (trade.direction === 'long') {
      alternatives = 'Consider waiting for a pullback to a key support level for better entry. Look for confluence with EMAs or order blocks. A limit order at support gives better risk-reward than market orders at current price.';
    } else {
      alternatives = 'For shorts, consider entering on a failed breakout or rejection from resistance. Wait for a lower high to form on your timeframe for confirmation of bearish structure.';
    }

    const takeaways = [
      hasStopLoss ? 'Your risk management is on track' : 'Priority: Always set a stop loss',
      riskReward >= 1.5 ? 'Good R:R thinking' : 'Aim for minimum 2:1 reward-to-risk',
      'Review this trade in 24h to see how your thesis played out'
    ];

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

  // Save to history
  function saveToHistory(trade, analysis) {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    history.unshift({
      trade,
      analysis,
      timestamp: new Date().toISOString()
    });
    history = history.slice(0, 10); // Keep last 10
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    loadHistory();
  }

  // Load history
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

  // Initialize
  updateUI();
})();
