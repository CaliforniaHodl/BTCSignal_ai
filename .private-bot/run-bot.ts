#!/usr/bin/env npx tsx
/**
 * BTC Signal Personal Trading Bot
 *
 * IMPORTANT: This bot trades real money!
 * - Start with DRY_RUN=true to test
 * - Only use money you can afford to lose
 * - Past performance does not guarantee future results
 *
 * Usage:
 *   npm run dry-run    # Test without trading
 *   npm run start      # Run live (if DRY_RUN=false in .env)
 *   npm run check      # Just check signals without trading
 */

import { config, validateConfig } from './config.js';
import { TradingBot } from './trading-bot.js';

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           BTC SIGNAL - PERSONAL TRADING BOT              ║
║                                                          ║
║  WARNING: This bot trades real money!                    ║
║  Only use funds you can afford to lose.                  ║
╚══════════════════════════════════════════════════════════╝
`);

  // Validate configuration
  const errors = validateConfig();
  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    console.error('\nPlease check your .env file');
    process.exit(1);
  }

  console.log(`Mode: ${config.safety.dryRun ? 'DRY RUN (no real trades)' : 'LIVE TRADING'}`);
  console.log(`Max Position: $${config.trading.maxPositionUsd}`);
  console.log(`Min Confidence: ${(config.trading.minConfidence * 100).toFixed(0)}%`);
  console.log('');

  const bot = new TradingBot();

  // Check for command line args
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    await bot.getStatus();
    return;
  }

  if (args.includes('--loop')) {
    // Continuous mode - run every 4 hours
    console.log('Starting continuous mode (runs every 4 hours)...');
    console.log('Press Ctrl+C to stop\n');

    while (true) {
      await bot.run();

      const nextRun = new Date(Date.now() + 4 * 60 * 60 * 1000);
      console.log(`\nNext run: ${nextRun.toLocaleString()}`);
      console.log('Waiting...\n');

      // Wait 4 hours
      await new Promise(resolve => setTimeout(resolve, 4 * 60 * 60 * 1000));
    }
  } else {
    // Single run
    await bot.run();
    await bot.getStatus();
  }
}

main().catch(console.error);
