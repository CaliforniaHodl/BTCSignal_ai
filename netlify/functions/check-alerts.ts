/**
 * Check Alerts Scheduled Function
 * Runs every 15 minutes to check alert conditions
 * Saves triggered alerts to GitHub cache
 */

import { Handler } from '@netlify/functions';
import { Octokit } from '@octokit/rest';
import { AlertSystem, MarketData, TriggeredAlert } from './lib/alert-system';
import { getEnabledAlerts } from './lib/alert-config';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'CaliforniaHodl';
const GITHUB_REPO = process.env.GITHUB_REPO || 'BTCSignal_ai';
const ALERTS_CACHE_PATH = 'data/triggered-alerts.json';
const MARKET_DATA_CACHE_PATH = 'data/market-snapshot.json';

interface AlertsCache {
  alerts: TriggeredAlert[];
  lastChecked: number;
  stats: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    unacknowledged: number;
  };
}

/**
 * Load market data from GitHub cache
 */
async function loadMarketData(octokit: Octokit): Promise<MarketData | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: MARKET_DATA_CACHE_PATH,
    });

    if ('content' in data) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      const marketSnapshot = JSON.parse(content);

      // Extract relevant data
      const marketData: MarketData = {
        price: marketSnapshot.btc?.price || 0,
        priceChange24h: marketSnapshot.btc?.change24h || 0,
        mvrv: marketSnapshot.onchain?.mvrv || undefined,
        sopr: marketSnapshot.profitability?.sopr || undefined,
        fundingRate: marketSnapshot.derivatives?.fundingRate || undefined,
        rsi: marketSnapshot.technical?.rsi || undefined,
        exchangeNetflow: marketSnapshot.onchain?.exchangeNetflow24h || undefined,
        longShortRatio: marketSnapshot.derivatives?.longShortRatio || undefined,
        liquidations24h: marketSnapshot.derivatives?.liquidations24h || undefined,
        openInterest: marketSnapshot.derivatives?.openInterest || undefined,
        volatility: marketSnapshot.btc?.volatility24h || undefined,
        nupl: marketSnapshot.onchain?.nupl || undefined,
        nvt: marketSnapshot.onchain?.nvt || undefined,
      };

      return marketData;
    }
  } catch (error) {
    console.error('Failed to load market data:', error);
  }

  return null;
}

/**
 * Load previous alerts from GitHub cache
 */
async function loadPreviousAlerts(octokit: Octokit): Promise<AlertsCache | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: ALERTS_CACHE_PATH,
    });

    if ('content' in data) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return JSON.parse(content);
    }
  } catch (error: any) {
    if (error.status === 404) {
      // File doesn't exist yet, return empty cache
      return {
        alerts: [],
        lastChecked: 0,
        stats: {
          total: 0,
          critical: 0,
          warning: 0,
          info: 0,
          unacknowledged: 0,
        },
      };
    }
    console.error('Failed to load previous alerts:', error);
  }

  return null;
}

/**
 * Save alerts to GitHub cache
 */
async function saveAlertsToGitHub(
  octokit: Octokit,
  alertsCache: AlertsCache,
  sha?: string
): Promise<void> {
  try {
    const content = Buffer.from(JSON.stringify(alertsCache, null, 2)).toString('base64');

    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: ALERTS_CACHE_PATH,
      message: `Update triggered alerts - ${new Date().toISOString()}`,
      content,
      sha,
    });

    console.log('Alerts saved to GitHub successfully');
  } catch (error) {
    console.error('Failed to save alerts to GitHub:', error);
    throw error;
  }
}

/**
 * Main handler function
 */
const handler: Handler = async (event, context) => {
  console.log('Starting alert check...');

  if (!GITHUB_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GITHUB_TOKEN not configured' }),
    };
  }

  try {
    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    const alertSystem = new AlertSystem();

    // Load current market data
    const marketData = await loadMarketData(octokit);
    if (!marketData) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to load market data' }),
      };
    }

    // Load previous alerts cache
    const previousCache = await loadPreviousAlerts(octokit);
    if (!previousCache) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to load previous alerts' }),
      };
    }

    // Get enabled alert configurations
    const alertConfigs = getEnabledAlerts();

    // Check all alerts
    const newlyTriggered = alertSystem.checkAlerts(alertConfigs, marketData);

    // Merge with existing alerts and prune old ones
    let allAlerts = [...previousCache.alerts, ...newlyTriggered];
    allAlerts = alertSystem.pruneOldAlerts(allAlerts, 24); // Keep last 24 hours

    // Calculate stats
    const stats = alertSystem.getAlertStats(allAlerts);

    // Create new cache
    const newCache: AlertsCache = {
      alerts: allAlerts,
      lastChecked: Date.now(),
      stats: {
        total: stats.total,
        critical: stats.bySeverity.critical || 0,
        warning: stats.bySeverity.warning || 0,
        info: stats.bySeverity.info || 0,
        unacknowledged: stats.unacknowledged,
      },
    };

    // Get SHA if file exists
    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: ALERTS_CACHE_PATH,
      });
      if ('sha' in data) {
        sha = data.sha;
      }
    } catch (error: any) {
      // File doesn't exist, that's okay
      if (error.status !== 404) {
        throw error;
      }
    }

    // Save to GitHub
    await saveAlertsToGitHub(octokit, newCache, sha);

    console.log(`Alert check complete. New alerts: ${newlyTriggered.length}, Total active: ${allAlerts.length}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        newAlerts: newlyTriggered.length,
        totalAlerts: allAlerts.length,
        stats: newCache.stats,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error: any) {
    console.error('Error in alert check:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to check alerts',
        message: error.message,
      }),
    };
  }
};

// Schedule to run every 15 minutes
export { handler };
export const config = {
  schedule: '*/15 * * * *', // Every 15 minutes
};
