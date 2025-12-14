/**
 * Alert Configuration
 * Defines default alert types and thresholds for the alert system
 */

import { AlertCondition } from './alert-system';

/**
 * Default alert configurations
 * These represent common market conditions that traders should monitor
 * Target: 20+ alerts to match CryptoQuant Professional tier
 */
export const DEFAULT_ALERTS: AlertCondition[] = [
  // ============ PRICE ALERTS ============
  {
    id: 'price_drop_5pct',
    name: 'Price Drop -5% (24h)',
    category: 'price',
    condition: 'below',
    threshold: -5,
    severity: 'warning',
    enabled: true,
    description: 'Notable price decline - may signal further downside',
  },
  {
    id: 'price_drop_10pct',
    name: 'Price Drop -10% (24h)',
    category: 'price',
    condition: 'below',
    threshold: -10,
    severity: 'critical',
    enabled: true,
    description: 'Flash crash warning - price has dropped more than 10% in 24 hours',
  },
  {
    id: 'price_pump_5pct',
    name: 'Price Pump +5% (24h)',
    category: 'price',
    condition: 'above',
    threshold: 5,
    severity: 'info',
    enabled: true,
    description: 'Notable price increase - momentum building',
  },
  {
    id: 'price_pump_10pct',
    name: 'Price Pump +10% (24h)',
    category: 'price',
    condition: 'above',
    threshold: 10,
    severity: 'warning',
    enabled: true,
    description: 'Significant price increase - possible FOMO or short squeeze',
  },
  {
    id: 'price_ath_proximity',
    name: 'Price within 5% of ATH',
    category: 'price',
    condition: 'above',
    threshold: 95, // % of ATH
    severity: 'info',
    enabled: false,
    description: 'Price approaching all-time high territory',
  },

  // ============ ON-CHAIN ALERTS ============
  {
    id: 'mvrv_extreme_high',
    name: 'MVRV > 3.5 (Cycle Top Warning)',
    category: 'onchain',
    condition: 'above',
    threshold: 3.5,
    severity: 'critical',
    enabled: true,
    description: 'Market approaching cycle top territory - extreme overvaluation',
  },
  {
    id: 'mvrv_high',
    name: 'MVRV > 2.5 (Overvalued)',
    category: 'onchain',
    condition: 'above',
    threshold: 2.5,
    severity: 'warning',
    enabled: true,
    description: 'Market entering overvalued territory - caution advised',
  },
  {
    id: 'mvrv_extreme_low',
    name: 'MVRV < 1.0 (Extreme Undervaluation)',
    category: 'onchain',
    condition: 'below',
    threshold: 1.0,
    severity: 'critical',
    enabled: true,
    description: 'Market trading below realized value - potential accumulation zone',
  },
  {
    id: 'sopr_capitulation',
    name: 'SOPR < 0.95 (Capitulation)',
    category: 'onchain',
    condition: 'below',
    threshold: 0.95,
    severity: 'warning',
    enabled: true,
    description: 'Heavy losses being realized - possible capitulation event',
  },
  {
    id: 'sopr_crosses_one',
    name: 'SOPR Crosses 1.0',
    category: 'onchain',
    condition: 'crosses_above',
    threshold: 1.0,
    severity: 'info',
    enabled: true,
    description: 'Market transitioning from losses to profits - potential trend change',
  },
  {
    id: 'exchange_inflow_large',
    name: 'Exchange Netflow > 10K BTC',
    category: 'onchain',
    condition: 'above',
    threshold: 10000,
    severity: 'warning',
    enabled: true,
    description: 'Large BTC moving to exchanges - potential sell pressure',
  },
  {
    id: 'exchange_outflow_large',
    name: 'Exchange Netflow < -10K BTC',
    category: 'onchain',
    condition: 'below',
    threshold: -10000,
    severity: 'info',
    enabled: true,
    description: 'Large BTC moving off exchanges - accumulation signal',
  },
  {
    id: 'nupl_euphoria',
    name: 'NUPL > 0.75 (Euphoria)',
    category: 'onchain',
    condition: 'above',
    threshold: 0.75,
    severity: 'warning',
    enabled: true,
    description: 'Market in euphoria phase - high unrealized profits',
  },
  {
    id: 'nupl_capitulation',
    name: 'NUPL < 0 (Capitulation)',
    category: 'onchain',
    condition: 'below',
    threshold: 0,
    severity: 'warning',
    enabled: true,
    description: 'Market in capitulation - network in unrealized loss',
  },
  {
    id: 'whale_transaction_500btc',
    name: 'Whale Transaction > 500 BTC',
    category: 'onchain',
    condition: 'above',
    threshold: 500,
    severity: 'info',
    enabled: true,
    description: 'Large whale transaction detected - watch for market impact',
  },
  {
    id: 'whale_transaction_1000btc',
    name: 'Whale Transaction > 1000 BTC',
    category: 'onchain',
    condition: 'above',
    threshold: 1000,
    severity: 'warning',
    enabled: true,
    description: 'Very large whale transaction - significant market mover',
  },
  {
    id: 'whale_transaction_5000btc',
    name: 'Whale Transaction > 5000 BTC',
    category: 'onchain',
    condition: 'above',
    threshold: 5000,
    severity: 'critical',
    enabled: true,
    description: 'Massive whale movement - potential major market event',
  },
  {
    id: 'miner_outflow_spike',
    name: 'Miner Outflow Spike',
    category: 'onchain',
    condition: 'above',
    threshold: 1000, // BTC
    severity: 'warning',
    enabled: true,
    description: 'Miners selling - potential supply pressure',
  },

  // ============ DERIVATIVES ALERTS ============
  {
    id: 'funding_rate_extreme_positive',
    name: 'Funding Rate > 0.1%',
    category: 'derivatives',
    condition: 'above',
    threshold: 0.1,
    severity: 'warning',
    enabled: true,
    description: 'Overleveraged longs - high probability of long squeeze',
  },
  {
    id: 'funding_rate_extreme_negative',
    name: 'Funding Rate < -0.05%',
    category: 'derivatives',
    condition: 'below',
    threshold: -0.05,
    severity: 'warning',
    enabled: true,
    description: 'Overleveraged shorts - high probability of short squeeze',
  },
  {
    id: 'liquidations_spike',
    name: 'Liquidations > $500M (24h)',
    category: 'derivatives',
    condition: 'above',
    threshold: 500000000,
    severity: 'critical',
    enabled: true,
    description: 'Massive liquidation cascade detected',
  },
  {
    id: 'oi_spike',
    name: 'Open Interest +20% (24h)',
    category: 'derivatives',
    condition: 'above',
    threshold: 20,
    severity: 'info',
    enabled: true,
    description: 'Significant increase in leveraged positions',
  },
  {
    id: 'oi_drop',
    name: 'Open Interest -15% (24h)',
    category: 'derivatives',
    condition: 'below',
    threshold: -15,
    severity: 'warning',
    enabled: true,
    description: 'Significant deleveraging - positions being closed',
  },
  {
    id: 'long_short_extreme_long',
    name: 'L/S Ratio > 2.0 (Extreme Longs)',
    category: 'derivatives',
    condition: 'above',
    threshold: 2.0,
    severity: 'warning',
    enabled: true,
    description: 'Market heavily long - potential long squeeze risk',
  },
  {
    id: 'long_short_extreme_short',
    name: 'L/S Ratio < 0.5 (Extreme Shorts)',
    category: 'derivatives',
    condition: 'below',
    threshold: 0.5,
    severity: 'warning',
    enabled: true,
    description: 'Market heavily short - potential short squeeze setup',
  },

  // ============ TECHNICAL ALERTS ============
  {
    id: 'rsi_overbought',
    name: 'RSI > 80 (Overbought)',
    category: 'technical',
    condition: 'above',
    threshold: 80,
    severity: 'warning',
    enabled: true,
    description: 'Extreme overbought conditions - potential pullback',
  },
  {
    id: 'rsi_oversold',
    name: 'RSI < 20 (Oversold)',
    category: 'technical',
    condition: 'below',
    threshold: 20,
    severity: 'warning',
    enabled: true,
    description: 'Extreme oversold conditions - potential bounce',
  },
  {
    id: 'volatility_extreme',
    name: 'Volatility > 15%',
    category: 'technical',
    condition: 'above',
    threshold: 15,
    severity: 'info',
    enabled: true,
    description: 'High market volatility - increased risk for leveraged positions',
  },
  {
    id: 'nvt_overvalued',
    name: 'NVT > 100 (Overvalued)',
    category: 'technical',
    condition: 'above',
    threshold: 100,
    severity: 'warning',
    enabled: true,
    description: 'Network value significantly exceeds transaction volume',
  },
];

/**
 * Alert severity level definitions
 */
export const ALERT_SEVERITY_LEVELS = {
  info: {
    label: 'Info',
    color: '#3b82f6',
    priority: 1,
    description: 'Informational alerts for market awareness',
  },
  warning: {
    label: 'Warning',
    color: '#f59e0b',
    priority: 2,
    description: 'Important market conditions requiring attention',
  },
  critical: {
    label: 'Critical',
    color: '#ef4444',
    priority: 3,
    description: 'Critical market conditions requiring immediate attention',
  },
};

/**
 * Alert category definitions
 */
export const ALERT_CATEGORIES = {
  price: {
    label: 'Price Action',
    icon: '💰',
    description: 'Price movements and volatility alerts',
  },
  onchain: {
    label: 'On-Chain',
    icon: '⛓️',
    description: 'Blockchain metrics and holder behavior',
  },
  derivatives: {
    label: 'Derivatives',
    icon: '📊',
    description: 'Funding rates, liquidations, and leverage',
  },
  technical: {
    label: 'Technical',
    icon: '📈',
    description: 'Technical indicators and chart patterns',
  },
  pattern: {
    label: 'Patterns',
    icon: '🎯',
    description: 'Chart patterns and formations',
  },
};

/**
 * Get alert configuration by ID
 */
export function getAlertById(alertId: string): AlertCondition | undefined {
  return DEFAULT_ALERTS.find(alert => alert.id === alertId);
}

/**
 * Get alerts by category
 */
export function getAlertsByCategory(category: string): AlertCondition[] {
  return DEFAULT_ALERTS.filter(alert => alert.category === category);
}

/**
 * Get alerts by severity
 */
export function getAlertsBySeverity(severity: string): AlertCondition[] {
  return DEFAULT_ALERTS.filter(alert => alert.severity === severity);
}

/**
 * Get enabled alerts only
 */
export function getEnabledAlerts(): AlertCondition[] {
  return DEFAULT_ALERTS.filter(alert => alert.enabled);
}

/**
 * Create custom alert
 */
export function createCustomAlert(
  id: string,
  name: string,
  category: 'price' | 'onchain' | 'derivatives' | 'technical' | 'pattern',
  condition: 'above' | 'below' | 'crosses_above' | 'crosses_below' | 'equals',
  threshold: number,
  severity: 'info' | 'warning' | 'critical',
  description: string
): AlertCondition {
  return {
    id,
    name,
    category,
    condition,
    threshold,
    severity,
    enabled: true,
    description,
  };
}

/**
 * Validate alert configuration
 */
export function validateAlert(alert: AlertCondition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!alert.id || alert.id.trim().length === 0) {
    errors.push('Alert ID is required');
  }

  if (!alert.name || alert.name.trim().length === 0) {
    errors.push('Alert name is required');
  }

  if (!['price', 'onchain', 'derivatives', 'technical', 'pattern'].includes(alert.category)) {
    errors.push('Invalid alert category');
  }

  if (!['above', 'below', 'crosses_above', 'crosses_below', 'equals'].includes(alert.condition)) {
    errors.push('Invalid alert condition');
  }

  if (typeof alert.threshold !== 'number' || isNaN(alert.threshold)) {
    errors.push('Threshold must be a valid number');
  }

  if (!['info', 'warning', 'critical'].includes(alert.severity)) {
    errors.push('Invalid alert severity');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Merge custom alerts with default alerts
 */
export function mergeAlerts(customAlerts: AlertCondition[]): AlertCondition[] {
  const alertMap = new Map<string, AlertCondition>();

  // Add default alerts
  for (const alert of DEFAULT_ALERTS) {
    alertMap.set(alert.id, alert);
  }

  // Override with custom alerts
  for (const alert of customAlerts) {
    alertMap.set(alert.id, alert);
  }

  return Array.from(alertMap.values());
}
