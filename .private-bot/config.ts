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

    // NEW: Skip trades when temporal analysis says SPECULATION (confidence < 50%)
    skipSpeculation: process.env.SKIP_SPECULATION !== 'false', // Default: true

    // NEW: Require pattern confirmation for trades
    requirePatternConfirmation: process.env.REQUIRE_PATTERN === 'true', // Default: false

    // NEW: Minimum pattern confidence to act on (0.5 to 1.0)
    minPatternConfidence: parseFloat(process.env.MIN_PATTERN_CONFIDENCE || '0.60'),
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

    // NEW: Reduce position size when temporal signals conflict
    reduceOnConflict: process.env.REDUCE_ON_CONFLICT !== 'false', // Default: true

    // NEW: Position size multiplier when signals conflict (0.25 to 1.0)
    conflictPositionMultiplier: parseFloat(process.env.CONFLICT_POSITION_MULT || '0.5'),
  },

  // Telegram notifications (optional)
  telegram: {
    enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },

  // NEW: Intelligence stack settings
  intelligence: {
    // Use cached hourly trend data (requires fetch-market-data running)
    useHourlyTrends: process.env.USE_HOURLY_TRENDS !== 'false', // Default: true

    // Track signal outcomes for historical learning
    enableHistoricalLearning: process.env.ENABLE_LEARNING !== 'false', // Default: true

    // Maximum age of hourly trend data to use (minutes)
    maxTrendDataAge: parseInt(process.env.MAX_TREND_AGE || '120', 10), // 2 hours

    // Log signals to Netlify Blob for learning
    logToBlob: process.env.LOG_TO_BLOB !== 'false', // Default: true
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
