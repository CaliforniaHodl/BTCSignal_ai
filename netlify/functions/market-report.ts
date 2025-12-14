/**
 * Market Report Scheduled Function
 * Generates comprehensive daily market report
 * Runs at 00:00 UTC daily
 */

import { Handler } from '@netlify/functions';
import { Octokit } from '@octokit/rest';
import {
  MarketReportGenerator,
  MarketMetrics,
  OnChainMetrics,
  DerivativesMetrics,
  SentimentMetrics,
  MarketReport,
} from './lib/market-report';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'CaliforniaHodl';
const GITHUB_REPO = process.env.GITHUB_REPO || 'BTCSignal_ai';
const REPORT_CACHE_PATH = 'data/market-report.json';
const REPORT_HISTORY_PATH = 'data/market-report-history.json';
const MARKET_DATA_CACHE_PATH = 'data/market-snapshot.json';

interface ReportHistory {
  reports: {
    date: string;
    grade: string;
    score: number;
    signal: string;
  }[];
}

/**
 * Load market data from GitHub cache
 */
async function loadMarketData(octokit: Octokit): Promise<any> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: MARKET_DATA_CACHE_PATH,
    });

    if ('content' in data) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to load market data:', error);
  }

  return null;
}

/**
 * Load report history
 */
async function loadReportHistory(octokit: Octokit): Promise<ReportHistory> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: REPORT_HISTORY_PATH,
    });

    if ('content' in data) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return JSON.parse(content);
    }
  } catch (error: any) {
    if (error.status === 404) {
      return { reports: [] };
    }
    console.error('Failed to load report history:', error);
  }

  return { reports: [] };
}

/**
 * Save report to GitHub
 */
async function saveReportToGitHub(
  octokit: Octokit,
  report: MarketReport,
  sha?: string
): Promise<void> {
  try {
    const content = Buffer.from(JSON.stringify(report, null, 2)).toString('base64');

    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: REPORT_CACHE_PATH,
      message: `Daily market report - ${report.date}`,
      content,
      sha,
    });

    console.log('Market report saved successfully');
  } catch (error) {
    console.error('Failed to save market report:', error);
    throw error;
  }
}

/**
 * Save report history
 */
async function saveReportHistory(
  octokit: Octokit,
  history: ReportHistory,
  sha?: string
): Promise<void> {
  try {
    const content = Buffer.from(JSON.stringify(history, null, 2)).toString('base64');

    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: REPORT_HISTORY_PATH,
      message: `Update market report history`,
      content,
      sha,
    });

    console.log('Report history saved successfully');
  } catch (error) {
    console.error('Failed to save report history:', error);
  }
}

/**
 * Main handler function
 */
const handler: Handler = async (event, context) => {
  console.log('Generating daily market report...');

  if (!GITHUB_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GITHUB_TOKEN not configured' }),
    };
  }

  try {
    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    // Load market data
    const marketSnapshot = await loadMarketData(octokit);
    if (!marketSnapshot) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to load market data' }),
      };
    }

    // Extract metrics from snapshot
    const marketMetrics: MarketMetrics = {
      price: marketSnapshot.btc?.price || 0,
      priceChange24h: marketSnapshot.btc?.change24h || 0,
      priceChange7d: marketSnapshot.btc?.change7d || 0,
      priceChange30d: marketSnapshot.btc?.change30d || 0,
      volume24h: marketSnapshot.btc?.volume24h || 0,
      marketCap: marketSnapshot.btc?.marketCap || 0,
      dominance: marketSnapshot.btc?.dominance || 0,
      volatility: marketSnapshot.btc?.volatility24h || 0,
    };

    const onchainMetrics: OnChainMetrics = {
      mvrv: marketSnapshot.onchain?.mvrv || 1.5,
      sopr: marketSnapshot.profitability?.sopr || 1.0,
      nupl: marketSnapshot.onchain?.nupl || 0.5,
      nvt: marketSnapshot.onchain?.nvt || 50,
      exchangeNetflow: marketSnapshot.onchain?.exchangeNetflow24h || 0,
      activeAddresses: marketSnapshot.onchain?.activeAddresses || 0,
      transactionVolume: marketSnapshot.onchain?.transactionVolume || 0,
    };

    const derivativesMetrics: DerivativesMetrics = {
      fundingRate: marketSnapshot.derivatives?.fundingRate || 0,
      openInterest: marketSnapshot.derivatives?.openInterest || 0,
      longShortRatio: marketSnapshot.derivatives?.longShortRatio || 1.0,
      liquidations24h: {
        longs: marketSnapshot.derivatives?.liquidations?.longs || 0,
        shorts: marketSnapshot.derivatives?.liquidations?.shorts || 0,
      },
      impliedVolatility: marketSnapshot.derivatives?.impliedVolatility,
    };

    const sentimentMetrics: SentimentMetrics = {
      fearGreed: marketSnapshot.sentiment?.fearGreed || 50,
      socialVolume: marketSnapshot.sentiment?.socialVolume,
      whaleActivity: marketSnapshot.onchain?.whaleActivity || 'neutral',
    };

    // Load report history for comparison
    const history = await loadReportHistory(octokit);
    const historicalGrades = {
      yesterday: history.reports[0]?.score,
      week: history.reports[6]?.score,
      month: history.reports[29]?.score,
    };

    // Generate report
    const generator = new MarketReportGenerator();
    const report = generator.generate(
      marketMetrics,
      onchainMetrics,
      derivativesMetrics,
      sentimentMetrics,
      historicalGrades
    );

    // Get SHA for existing report
    let reportSha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: REPORT_CACHE_PATH,
      });
      if ('sha' in data) {
        reportSha = data.sha;
      }
    } catch (error: any) {
      if (error.status !== 404) throw error;
    }

    // Save report
    await saveReportToGitHub(octokit, report, reportSha);

    // Update history (keep last 30 days)
    history.reports.unshift({
      date: report.date,
      grade: report.grade.grade,
      score: report.grade.score,
      signal: report.signal.overall,
    });
    history.reports = history.reports.slice(0, 30);

    // Get SHA for history file
    let historySha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: REPORT_HISTORY_PATH,
      });
      if ('sha' in data) {
        historySha = data.sha;
      }
    } catch (error: any) {
      if (error.status !== 404) throw error;
    }

    await saveReportHistory(octokit, history, historySha);

    console.log(`Market report generated successfully. Grade: ${report.grade.grade}, Signal: ${report.signal.overall}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        report: {
          date: report.date,
          grade: report.grade,
          signal: report.signal.overall,
          confidence: report.signal.confidence,
        },
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error: any) {
    console.error('Error generating market report:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to generate market report',
        message: error.message,
      }),
    };
  }
};

// Schedule to run daily at 00:00 UTC
export { handler };
export const config = {
  schedule: '0 0 * * *', // Daily at midnight UTC
};
