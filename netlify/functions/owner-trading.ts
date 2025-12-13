// Owner Trading API - Protected endpoint for personal trading operations
// This endpoint is protected by owner-only authentication
// DO NOT expose this to regular users

import type { Config, Context } from '@netlify/functions';
import {
  validateOwnerAuth,
  ownerUnauthorizedResponse,
  checkTradingRateLimit,
  logTradingAction,
} from './utils/owner-auth';

interface TradeRequest {
  action: 'get_status' | 'paper_trade' | 'get_signals' | 'get_risk_status';
  trade?: {
    direction: 'long' | 'short';
    entryPrice: number;
    stopLoss: number;
    targetPrice?: number;
    positionSize: number;
    strategy?: string;
    notes?: string;
  };
}

export default async (req: Request, context: Context) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Owner-Secret',
      },
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const clientIP = req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                   req.headers.get('CF-Connecting-IP') ||
                   'unknown';

  // Validate owner authentication
  const authResult = validateOwnerAuth(req);
  if (!authResult.valid) {
    await logTradingAction({
      type: 'auth_failed',
      details: { reason: authResult.error },
      success: false,
      error: authResult.error,
      ip: clientIP,
    });
    return ownerUnauthorizedResponse(authResult.error);
  }

  // Check rate limiting
  const rateLimit = checkTradingRateLimit(clientIP);
  if (!rateLimit.allowed) {
    await logTradingAction({
      type: 'rate_limited',
      details: { ip: clientIP },
      success: false,
      error: 'Rate limit exceeded',
      ip: clientIP,
    });
    return new Response(JSON.stringify({
      error: 'Trading rate limit exceeded. Try again later.',
      rateLimited: true,
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: TradeRequest = await req.json();

    switch (body.action) {
      case 'get_status':
        return await getStatus();

      case 'paper_trade':
        return await recordPaperTrade(body.trade, clientIP);

      case 'get_signals':
        return await getCurrentSignals();

      case 'get_risk_status':
        return await getRiskStatus();

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error: any) {
    console.error('Trading API error:', error);
    await logTradingAction({
      type: 'api_error',
      details: { message: error.message },
      success: false,
      error: error.message,
      ip: clientIP,
    });
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

async function getStatus() {
  // Get current market status and paper trading stats
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  let paperTrades: any[] = [];
  let signalHistory: any = null;

  if (token && repo) {
    // Fetch paper trades
    try {
      const tradesUrl = `https://api.github.com/repos/${repo}/contents/data/paper-trades.json`;
      const tradesRes = await fetch(tradesUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (tradesRes.ok) {
        const data = await tradesRes.json();
        paperTrades = JSON.parse(Buffer.from(data.content, 'base64').toString());
      }
    } catch (e) {}

    // Fetch signal history
    try {
      const signalUrl = `https://api.github.com/repos/${repo}/contents/data/signal-history.json`;
      const signalRes = await fetch(signalUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (signalRes.ok) {
        const data = await signalRes.json();
        signalHistory = JSON.parse(Buffer.from(data.content, 'base64').toString());
      }
    } catch (e) {}
  }

  // Calculate paper trading stats
  const closedTrades = paperTrades.filter((t: any) => t.result !== 'open');
  const wins = closedTrades.filter((t: any) => t.result === 'win');
  const totalPnL = closedTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);

  return new Response(JSON.stringify({
    success: true,
    status: 'operational',
    timestamp: new Date().toISOString(),
    paperTrading: {
      totalTrades: paperTrades.length,
      openTrades: paperTrades.filter((t: any) => t.result === 'open').length,
      closedTrades: closedTrades.length,
      wins: wins.length,
      losses: closedTrades.length - wins.length,
      winRate: closedTrades.length > 0 ? (wins.length / closedTrades.length * 100).toFixed(1) : 0,
      totalPnL: totalPnL.toFixed(2),
    },
    signalAccuracy: signalHistory?.stats || null,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function recordPaperTrade(trade: any, ip: string) {
  if (!trade) {
    return new Response(JSON.stringify({ error: 'Trade data required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate required fields
  if (!trade.direction || !trade.entryPrice || !trade.stopLoss || !trade.positionSize) {
    return new Response(JSON.stringify({
      error: 'Missing required fields: direction, entryPrice, stopLoss, positionSize',
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return new Response(JSON.stringify({ error: 'Storage not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const path = 'data/paper-trades.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    // Get existing trades
    let trades: any[] = [];
    let sha: string | undefined;

    const getRes = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
      trades = JSON.parse(Buffer.from(data.content, 'base64').toString());
    }

    // Create new trade entry
    const newTrade = {
      id: `paper_${Date.now()}`,
      entryTime: new Date().toISOString(),
      ...trade,
      result: 'open',
      pnl: null,
      pnlPercent: null,
    };

    trades.push(newTrade);

    // Save
    const body: any = {
      message: `Paper trade: ${trade.direction} @ ${trade.entryPrice}`,
      content: Buffer.from(JSON.stringify(trades, null, 2)).toString('base64'),
      branch: 'master',
    };

    if (sha) body.sha = sha;

    const saveRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(body),
    });

    if (!saveRes.ok) {
      throw new Error('Failed to save trade');
    }

    await logTradingAction({
      type: 'paper_trade_opened',
      details: newTrade,
      success: true,
      ip,
    });

    return new Response(JSON.stringify({
      success: true,
      trade: newTrade,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    await logTradingAction({
      type: 'paper_trade_failed',
      details: { trade, error: error.message },
      success: false,
      error: error.message,
      ip,
    });

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function getCurrentSignals() {
  // Fetch latest signal from signal history
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return new Response(JSON.stringify({ error: 'Not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = `https://api.github.com/repos/${repo}/contents/data/signal-history.json`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ signals: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const history = JSON.parse(Buffer.from(data.content, 'base64').toString());

    // Get last 10 signals
    const recentSignals = (history.signals || []).slice(-10).reverse();

    return new Response(JSON.stringify({
      success: true,
      signals: recentSignals,
      stats: history.stats,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function getRiskStatus() {
  // Get paper trades and calculate risk metrics
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  const defaultRules = {
    maxRiskPerTrade: 0.02,
    maxDailyLoss: 0.05,
    maxDrawdown: 0.20,
    maxConsecutiveLosses: 3,
    startingCapital: 100,
  };

  if (!token || !repo) {
    return new Response(JSON.stringify({
      success: true,
      rules: defaultRules,
      status: {
        canTrade: true,
        warnings: [],
        errors: [],
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = `https://api.github.com/repos/${repo}/contents/data/paper-trades.json`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    let trades: any[] = [];
    if (res.ok) {
      const data = await res.json();
      trades = JSON.parse(Buffer.from(data.content, 'base64').toString());
    }

    // Calculate metrics
    const closedTrades = trades.filter(t => t.result !== 'open');
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const currentCapital = defaultRules.startingCapital + totalPnL;

    // Calculate drawdown
    let peak = defaultRules.startingCapital;
    let maxDrawdown = 0;
    let runningCapital = defaultRules.startingCapital;

    closedTrades.forEach(t => {
      runningCapital += t.pnl || 0;
      if (runningCapital > peak) peak = runningCapital;
      const dd = (peak - runningCapital) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    // Check consecutive losses
    let consecutiveLosses = 0;
    for (let i = closedTrades.length - 1; i >= 0; i--) {
      if (closedTrades[i].result === 'loss') {
        consecutiveLosses++;
      } else {
        break;
      }
    }

    // Today's trades
    const today = new Date().toDateString();
    const todayTrades = closedTrades.filter(t =>
      new Date(t.exitTime || t.entryTime).toDateString() === today
    );
    const todayPnL = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const dailyLossPercent = -todayPnL / defaultRules.startingCapital;

    // Build status
    const warnings: string[] = [];
    const errors: string[] = [];

    if (dailyLossPercent >= defaultRules.maxDailyLoss) {
      errors.push(`Daily loss limit reached (${(dailyLossPercent * 100).toFixed(1)}%)`);
    } else if (dailyLossPercent >= defaultRules.maxDailyLoss * 0.7) {
      warnings.push(`Approaching daily loss limit (${(dailyLossPercent * 100).toFixed(1)}%)`);
    }

    if (maxDrawdown >= defaultRules.maxDrawdown) {
      errors.push(`Max drawdown reached (${(maxDrawdown * 100).toFixed(1)}%)`);
    } else if (maxDrawdown >= defaultRules.maxDrawdown * 0.7) {
      warnings.push(`Approaching max drawdown (${(maxDrawdown * 100).toFixed(1)}%)`);
    }

    if (consecutiveLosses >= defaultRules.maxConsecutiveLosses) {
      errors.push(`${consecutiveLosses} consecutive losses - take a break`);
    } else if (consecutiveLosses >= defaultRules.maxConsecutiveLosses - 1) {
      warnings.push(`${consecutiveLosses} consecutive losses`);
    }

    return new Response(JSON.stringify({
      success: true,
      rules: defaultRules,
      metrics: {
        currentCapital,
        totalPnL,
        maxDrawdown: maxDrawdown * 100,
        consecutiveLosses,
        dailyLossPercent: dailyLossPercent * 100,
        todayTrades: todayTrades.length,
      },
      status: {
        canTrade: errors.length === 0,
        warnings,
        errors,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// No schedule - this is an on-demand API only
