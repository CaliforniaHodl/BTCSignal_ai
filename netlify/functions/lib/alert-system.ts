/**
 * Alert System Library
 * Monitors market conditions and generates alerts based on configured thresholds
 */

export interface AlertCondition {
  id: string;
  name: string;
  category: 'price' | 'onchain' | 'derivatives' | 'technical' | 'pattern';
  condition: 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  description: string;
}

export interface TriggeredAlert {
  id: string;
  alertId: string;
  name: string;
  category: string;
  severity: string;
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: number;
  acknowledged: boolean;
}

export interface MarketData {
  price: number;
  priceChange24h: number;
  mvrv?: number;
  sopr?: number;
  fundingRate?: number;
  rsi?: number;
  exchangeNetflow?: number;
  longShortRatio?: number;
  liquidations24h?: number;
  openInterest?: number;
  volatility?: number;
  nupl?: number;
  nvt?: number;
}

export class AlertSystem {
  private previousValues: Map<string, number> = new Map();

  /**
   * Check all alert conditions against current market data
   */
  checkAlerts(alerts: AlertCondition[], marketData: MarketData, previousMarketData?: MarketData): TriggeredAlert[] {
    const triggered: TriggeredAlert[] = [];

    for (const alert of alerts) {
      if (!alert.enabled) continue;

      const result = this.evaluateAlert(alert, marketData, previousMarketData);
      if (result) {
        triggered.push(result);
      }
    }

    return triggered;
  }

  /**
   * Evaluate a single alert condition
   */
  private evaluateAlert(
    alert: AlertCondition,
    marketData: MarketData,
    previousMarketData?: MarketData
  ): TriggeredAlert | null {
    const currentValue = this.getMetricValue(alert.id, marketData);

    if (currentValue === null) {
      return null;
    }

    let isTriggered = false;
    let message = '';

    switch (alert.condition) {
      case 'above':
        if (currentValue > alert.threshold) {
          isTriggered = true;
          message = `${alert.name} is ${currentValue.toFixed(4)} (above threshold of ${alert.threshold})`;
        }
        break;

      case 'below':
        if (currentValue < alert.threshold) {
          isTriggered = true;
          message = `${alert.name} is ${currentValue.toFixed(4)} (below threshold of ${alert.threshold})`;
        }
        break;

      case 'crosses_above':
        const prevValue = previousMarketData ? this.getMetricValue(alert.id, previousMarketData) : null;
        if (prevValue !== null && prevValue <= alert.threshold && currentValue > alert.threshold) {
          isTriggered = true;
          message = `${alert.name} crossed above ${alert.threshold} (now ${currentValue.toFixed(4)})`;
        }
        break;

      case 'crosses_below':
        const prevValueBelow = previousMarketData ? this.getMetricValue(alert.id, previousMarketData) : null;
        if (prevValueBelow !== null && prevValueBelow >= alert.threshold && currentValue < alert.threshold) {
          isTriggered = true;
          message = `${alert.name} crossed below ${alert.threshold} (now ${currentValue.toFixed(4)})`;
        }
        break;

      case 'equals':
        // For percentage changes, allow small variance
        const variance = Math.abs(alert.threshold) * 0.01; // 1% variance
        if (Math.abs(currentValue - alert.threshold) <= variance) {
          isTriggered = true;
          message = `${alert.name} is approximately ${alert.threshold} (current: ${currentValue.toFixed(4)})`;
        }
        break;
    }

    if (isTriggered) {
      return {
        id: `${alert.id}-${Date.now()}`,
        alertId: alert.id,
        name: alert.name,
        category: alert.category,
        severity: alert.severity,
        message,
        currentValue,
        threshold: alert.threshold,
        timestamp: Date.now(),
        acknowledged: false,
      };
    }

    return null;
  }

  /**
   * Extract specific metric value from market data based on alert ID
   */
  private getMetricValue(alertId: string, marketData: MarketData): number | null {
    const metricMap: { [key: string]: number | undefined } = {
      'price': marketData.price,
      'price_change_24h': marketData.priceChange24h,
      'mvrv': marketData.mvrv,
      'sopr': marketData.sopr,
      'funding_rate': marketData.fundingRate,
      'rsi': marketData.rsi,
      'exchange_netflow': marketData.exchangeNetflow,
      'long_short_ratio': marketData.longShortRatio,
      'liquidations_24h': marketData.liquidations24h,
      'open_interest': marketData.openInterest,
      'volatility': marketData.volatility,
      'nupl': marketData.nupl,
      'nvt': marketData.nvt,
    };

    const value = metricMap[alertId];
    return value !== undefined ? value : null;
  }

  /**
   * Filter alerts by severity
   */
  filterBySeverity(alerts: TriggeredAlert[], severity: 'info' | 'warning' | 'critical'): TriggeredAlert[] {
    return alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Filter alerts by category
   */
  filterByCategory(
    alerts: TriggeredAlert[],
    category: 'price' | 'onchain' | 'derivatives' | 'technical' | 'pattern'
  ): TriggeredAlert[] {
    return alerts.filter(alert => alert.category === category);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledged(alerts: TriggeredAlert[]): TriggeredAlert[] {
    return alerts.filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alerts: TriggeredAlert[], alertId: string): TriggeredAlert[] {
    return alerts.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    );
  }

  /**
   * Remove old alerts (older than 24 hours)
   */
  pruneOldAlerts(alerts: TriggeredAlert[], hoursToKeep: number = 24): TriggeredAlert[] {
    const cutoffTime = Date.now() - (hoursToKeep * 60 * 60 * 1000);
    return alerts.filter(alert => alert.timestamp > cutoffTime);
  }

  /**
   * Get alert statistics
   */
  getAlertStats(alerts: TriggeredAlert[]): {
    total: number;
    byCategory: { [key: string]: number };
    bySeverity: { [key: string]: number };
    unacknowledged: number;
  } {
    const stats = {
      total: alerts.length,
      byCategory: {} as { [key: string]: number },
      bySeverity: {} as { [key: string]: number },
      unacknowledged: 0,
    };

    for (const alert of alerts) {
      // Count by category
      stats.byCategory[alert.category] = (stats.byCategory[alert.category] || 0) + 1;

      // Count by severity
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;

      // Count unacknowledged
      if (!alert.acknowledged) {
        stats.unacknowledged++;
      }
    }

    return stats;
  }

  /**
   * Format alert for display
   */
  formatAlertMessage(alert: TriggeredAlert): string {
    const time = new Date(alert.timestamp).toLocaleTimeString();
    const emoji = this.getSeverityEmoji(alert.severity);
    return `${emoji} [${time}] ${alert.message}`;
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📌';
    }
  }

  /**
   * Generate alert summary for notifications
   */
  generateAlertSummary(alerts: TriggeredAlert[]): string {
    const stats = this.getAlertStats(alerts);
    const lines: string[] = [];

    lines.push(`🚨 Alert Summary`);
    lines.push(`Total: ${stats.total} alerts`);

    if (stats.bySeverity.critical) {
      lines.push(`🔴 Critical: ${stats.bySeverity.critical}`);
    }
    if (stats.bySeverity.warning) {
      lines.push(`⚠️ Warning: ${stats.bySeverity.warning}`);
    }
    if (stats.bySeverity.info) {
      lines.push(`ℹ️ Info: ${stats.bySeverity.info}`);
    }

    if (stats.unacknowledged > 0) {
      lines.push(`\n${stats.unacknowledged} unacknowledged alerts`);
    }

    return lines.join('\n');
  }
}
