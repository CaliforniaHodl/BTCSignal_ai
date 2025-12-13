// Risk Manager - Enforces trading rules before you trade real money
// Based on BEFORE_TRADING_REAL_MONEY.md recommendations

(function() {
  'use strict';

  const RULES_KEY = 'btcsai_risk_rules';
  const ALERTS_KEY = 'btcsai_risk_alerts';

  // Default risk rules from the trading prep guide
  const DEFAULT_RULES = {
    // Position sizing
    maxRiskPerTrade: 0.02,      // Never risk more than 2% per trade
    maxPositionSize: 0.50,      // Max 50% of account in single position

    // Loss limits
    maxDailyLoss: 0.05,         // Stop trading after 5% daily loss
    maxConsecutiveLosses: 3,    // Stop after 3 consecutive losses
    maxDrawdown: 0.20,          // Re-evaluate after 20% drawdown

    // Trade requirements
    requireStopLoss: true,      // Must set stop loss BEFORE entry
    requireTarget: false,       // Target recommended but not required
    minRiskReward: 1.0,         // Minimum 1:1 risk/reward

    // Cooldown
    cooldownAfterLoss: 0,       // Minutes to wait after loss (0 = disabled)
    maxTradesPerDay: 10,        // Max trades per day

    // Account
    startingCapital: 100,       // $100 experiment
  };

  // Get current rules
  function getRules() {
    try {
      const stored = localStorage.getItem(RULES_KEY);
      return stored ? { ...DEFAULT_RULES, ...JSON.parse(stored) } : DEFAULT_RULES;
    } catch (e) {
      return DEFAULT_RULES;
    }
  }

  // Save rules
  function saveRules(rules) {
    try {
      localStorage.setItem(RULES_KEY, JSON.stringify(rules));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Get alerts history
  function getAlerts() {
    try {
      const stored = localStorage.getItem(ALERTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  // Add alert
  function addAlert(type, message, severity) {
    const alerts = getAlerts();
    alerts.push({
      id: `alert_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      severity, // 'info', 'warning', 'error', 'critical'
      acknowledged: false,
    });

    // Keep last 100 alerts
    if (alerts.length > 100) alerts.shift();

    try {
      localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
    } catch (e) {
      console.error('Failed to save alert:', e);
    }

    // Log to console for visibility
    const prefix = severity === 'critical' ? '🚨' : severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} RISK ALERT: ${message}`);

    return alerts[alerts.length - 1];
  }

  // Calculate position size based on risk
  function calculatePositionSize(entryPrice, stopLoss, accountBalance, riskPercent) {
    const rules = getRules();
    const maxRisk = Math.min(riskPercent || rules.maxRiskPerTrade, rules.maxRiskPerTrade);

    const riskPerShare = Math.abs(entryPrice - stopLoss);
    const dollarRisk = accountBalance * maxRisk;
    const shares = dollarRisk / riskPerShare;
    const positionValue = shares * entryPrice;

    // Check against max position size
    const maxPosition = accountBalance * rules.maxPositionSize;
    const finalPositionValue = Math.min(positionValue, maxPosition);
    const finalShares = finalPositionValue / entryPrice;

    return {
      shares: finalShares,
      positionValue: finalPositionValue,
      dollarRisk: finalShares * riskPerShare,
      riskPercent: (finalShares * riskPerShare) / accountBalance,
      cappedByPosition: positionValue > maxPosition,
    };
  }

  // Validate trade before entry
  function validateTradeEntry(trade, accountState) {
    const rules = getRules();
    const errors = [];
    const warnings = [];

    // 1. Stop loss required
    if (rules.requireStopLoss && !trade.stopLoss) {
      errors.push('STOP LOSS REQUIRED: Set your stop loss BEFORE entering the trade');
      addAlert('no_stop_loss', 'Trade attempted without stop loss', 'error');
    }

    // 2. Check risk per trade
    if (trade.entryPrice && trade.stopLoss && trade.positionSize) {
      const riskPerShare = Math.abs(trade.entryPrice - trade.stopLoss);
      const dollarRisk = trade.positionSize * riskPerShare / trade.entryPrice;
      const riskPercent = dollarRisk / accountState.balance;

      if (riskPercent > rules.maxRiskPerTrade) {
        errors.push(`RISK TOO HIGH: ${(riskPercent * 100).toFixed(1)}% exceeds ${rules.maxRiskPerTrade * 100}% limit`);
        addAlert('excess_risk', `Trade risk ${(riskPercent * 100).toFixed(1)}% exceeds limit`, 'error');
      }
    }

    // 3. Check position size
    if (trade.positionSize && accountState.balance) {
      const positionPercent = trade.positionSize / accountState.balance;
      if (positionPercent > rules.maxPositionSize) {
        errors.push(`POSITION TOO LARGE: ${(positionPercent * 100).toFixed(0)}% exceeds ${rules.maxPositionSize * 100}% limit`);
        addAlert('excess_position', `Position size ${(positionPercent * 100).toFixed(0)}% exceeds limit`, 'error');
      }
    }

    // 4. Check risk/reward ratio
    if (trade.entryPrice && trade.stopLoss && trade.targetPrice && rules.minRiskReward > 0) {
      const risk = Math.abs(trade.entryPrice - trade.stopLoss);
      const reward = Math.abs(trade.targetPrice - trade.entryPrice);
      const rr = reward / risk;

      if (rr < rules.minRiskReward) {
        warnings.push(`LOW R:R: ${rr.toFixed(2)} is below recommended ${rules.minRiskReward}`);
        addAlert('low_rr', `Risk/Reward ratio ${rr.toFixed(2)} below minimum`, 'warning');
      }
    }

    // 5. Check consecutive losses
    if (accountState.consecutiveLosses >= rules.maxConsecutiveLosses) {
      errors.push(`LOSS STREAK: ${accountState.consecutiveLosses} consecutive losses - take a break`);
      addAlert('loss_streak', `${accountState.consecutiveLosses} consecutive losses`, 'critical');
    }

    // 6. Check daily loss
    if (accountState.dailyLossPercent >= rules.maxDailyLoss) {
      errors.push(`DAILY LIMIT: ${(accountState.dailyLossPercent * 100).toFixed(1)}% daily loss - no more trades today`);
      addAlert('daily_limit', 'Daily loss limit reached', 'critical');
    }

    // 7. Check drawdown
    if (accountState.drawdown >= rules.maxDrawdown) {
      errors.push(`MAX DRAWDOWN: ${(accountState.drawdown * 100).toFixed(1)}% - re-evaluate your strategy`);
      addAlert('max_drawdown', `Drawdown ${(accountState.drawdown * 100).toFixed(1)}% reached`, 'critical');
    }

    // 8. Check max trades per day
    if (accountState.tradesToday >= rules.maxTradesPerDay) {
      warnings.push(`TRADE LIMIT: ${accountState.tradesToday} trades today - consider slowing down`);
      addAlert('trade_limit', 'Daily trade limit reached', 'warning');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canTrade: errors.length === 0,
    };
  }

  // Get risk status dashboard
  function getRiskStatus(accountState) {
    const rules = getRules();

    return {
      rules,
      status: {
        dailyLoss: {
          current: accountState.dailyLossPercent || 0,
          limit: rules.maxDailyLoss,
          remaining: rules.maxDailyLoss - (accountState.dailyLossPercent || 0),
          status: (accountState.dailyLossPercent || 0) >= rules.maxDailyLoss ? 'critical' :
                  (accountState.dailyLossPercent || 0) >= rules.maxDailyLoss * 0.7 ? 'warning' : 'ok',
        },
        drawdown: {
          current: accountState.drawdown || 0,
          limit: rules.maxDrawdown,
          remaining: rules.maxDrawdown - (accountState.drawdown || 0),
          status: (accountState.drawdown || 0) >= rules.maxDrawdown ? 'critical' :
                  (accountState.drawdown || 0) >= rules.maxDrawdown * 0.7 ? 'warning' : 'ok',
        },
        consecutiveLosses: {
          current: accountState.consecutiveLosses || 0,
          limit: rules.maxConsecutiveLosses,
          remaining: rules.maxConsecutiveLosses - (accountState.consecutiveLosses || 0),
          status: (accountState.consecutiveLosses || 0) >= rules.maxConsecutiveLosses ? 'critical' :
                  (accountState.consecutiveLosses || 0) >= rules.maxConsecutiveLosses - 1 ? 'warning' : 'ok',
        },
        tradesToday: {
          current: accountState.tradesToday || 0,
          limit: rules.maxTradesPerDay,
          remaining: rules.maxTradesPerDay - (accountState.tradesToday || 0),
          status: (accountState.tradesToday || 0) >= rules.maxTradesPerDay ? 'warning' : 'ok',
        },
      },
      canTrade: (accountState.dailyLossPercent || 0) < rules.maxDailyLoss &&
                (accountState.drawdown || 0) < rules.maxDrawdown &&
                (accountState.consecutiveLosses || 0) < rules.maxConsecutiveLosses,
    };
  }

  // Pre-trade checklist
  function getPreTradeChecklist(trade) {
    const rules = getRules();
    const checklist = [];

    checklist.push({
      item: 'Stop loss set BEFORE entry',
      required: rules.requireStopLoss,
      checked: !!trade.stopLoss,
    });

    checklist.push({
      item: 'Position size calculated',
      required: true,
      checked: !!trade.positionSize,
    });

    checklist.push({
      item: 'Risk per trade < 2%',
      required: true,
      checked: trade.riskPercent ? trade.riskPercent <= rules.maxRiskPerTrade : false,
    });

    checklist.push({
      item: 'Target price identified',
      required: rules.requireTarget,
      checked: !!trade.targetPrice,
    });

    checklist.push({
      item: 'Clear entry reason',
      required: true,
      checked: !!trade.reason || !!trade.strategy,
    });

    checklist.push({
      item: 'Not revenge trading',
      required: true,
      checked: true, // User must self-verify
      note: 'Self-check: Am I entering because of a valid signal or to recover losses?',
    });

    const allRequired = checklist.filter(c => c.required);
    const allChecked = allRequired.every(c => c.checked);

    return {
      checklist,
      complete: allChecked,
      requiredCount: allRequired.length,
      checkedCount: allRequired.filter(c => c.checked).length,
    };
  }

  // Public API
  window.BTCSAIRiskManager = {
    getRules,
    saveRules,
    getAlerts,
    calculatePositionSize,
    validateTradeEntry,
    getRiskStatus,
    getPreTradeChecklist,
    DEFAULT_RULES,
  };

  console.log('Risk Manager loaded. Use BTCSAIRiskManager.validateTradeEntry() before trading.');
})();
