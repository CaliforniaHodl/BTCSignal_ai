import 'dotenv/config';

export const config = {
  // Coinbase API
  coinbase: {
    apiKey: process.env.COINBASE_API_KEY || '',
    apiSecret: process.env.COINBASE_API_SECRET || '',
    baseUrl: 'https://api.coinbase.com',
  },

  // Trading parameters
  trading: {
    // Maximum USD to risk (your $100)
    maxPositionUsd: parseFloat(process.env.MAX_POSITION_USD || '100'),

    // Risk per trade as % of position (for stop loss calculation)
    riskPerTradePercent: parseFloat(process.env.RISK_PER_TRADE_PERCENT || '2'),

    // Minimum signal confidence to trade (0.5 to 1.0)
    minConfidence: parseFloat(process.env.MIN_CONFIDENCE || '0.65'),

    // Only trade when direction is clear (up or down, not mixed/sideways)
    requireClearDirection: true,

    // Product to trade
    productId: 'BTC-USD',

    // Cooldown between trades (prevent overtrading)
    tradeCooldownMs: 4 * 60 * 60 * 1000, // 4 hours
  },

  // Safety settings
  safety: {
    // Dry run mode - simulates trades without executing
    dryRun: process.env.DRY_RUN === 'true',

    // Max trades per day
    maxTradesPerDay: 3,

    // Stop trading if daily loss exceeds this %
    maxDailyLossPercent: 5,

    // Require manual confirmation for trades over this USD
    manualConfirmAboveUsd: 50,
  },

  // Telegram notifications (optional)
  telegram: {
    enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
};

// Validate config
export function validateConfig(): string[] {
  const errors: string[] = [];

  if (!config.coinbase.apiKey) {
    errors.push('COINBASE_API_KEY is required');
  }
  if (!config.coinbase.apiSecret) {
    errors.push('COINBASE_API_SECRET is required');
  }
  if (config.trading.maxPositionUsd <= 0) {
    errors.push('MAX_POSITION_USD must be positive');
  }
  if (config.trading.minConfidence < 0.5 || config.trading.minConfidence > 1) {
    errors.push('MIN_CONFIDENCE must be between 0.5 and 1.0');
  }

  return errors;
}
