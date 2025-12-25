// Check Signal Outcomes - Runs daily to verify signal accuracy
// Phase 6 Sprint 2: Signal Accuracy Tracking System
import type { Config, Context } from '@netlify/functions';

interface Signal {
  id: string;
  timestamp: number;
  priceAtSignal: number;
  direction: 'up' | 'down' | 'neutral';
  confidence: number;
  target?: number;
  priceAfter24h?: number;
  correct?: boolean;
  checked?: boolean;
}

interface SignalHistory {
  lastUpdated: string;
  signals: Signal[];
  stats: {
    total: number;
    correct: number;
    accuracy7d: number;
    accuracy30d: number;
    accuracyAll: number;
    avgConfidence: number;
    streakCurrent: number;
    streakBest: number;
  };
}

// Fetch with timeout helper
async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Get current BTC price
async function getBTCPrice(): Promise<number> {
  try {
    const res = await fetchWithTimeout('https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT');
    const data = await res.json();
    return parseFloat(data.price) || 0;
  } catch (e) {
    // Fallback to Coinbase
    try {
      const res = await fetchWithTimeout('https://api.coinbase.com/v2/prices/BTC-USD/spot');
      const data = await res.json();
      return parseFloat(data.data.amount) || 0;
    } catch (e2) {
      console.error('Failed to fetch BTC price');
      return 0;
    }
  }
}

// Load signal history from GitHub
async function loadSignalHistory(): Promise<SignalHistory | null> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return null;

  const url = `https://api.github.com/repos/${repo}/contents/data/signal-history.json`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const content = Buffer.from(data.content, 'base64').toString();
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('Failed to load signal history:', e);
  }

  return {
    lastUpdated: new Date().toISOString(),
    signals: [],
    stats: {
      total: 0,
      correct: 0,
      accuracy7d: 0,
      accuracy30d: 0,
      accuracyAll: 0,
      avgConfidence: 0,
      streakCurrent: 0,
      streakBest: 0,
    },
  };
}

// Save signal history to GitHub
async function saveSignalHistory(history: SignalHistory): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) return false;

  const path = 'data/signal-history.json';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    // Get current file SHA
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
    }

    const content = JSON.stringify(history, null, 2);

    const body: any = {
      message: `Update signal history: ${history.stats.total} signals, ${history.stats.accuracyAll.toFixed(1)}% accuracy`,
      content: Buffer.from(content).toString('base64'),
      branch: 'master',
    };

    if (sha) {
      body.sha = sha;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(body),
    });

    return res.ok;
  } catch (e) {
    console.error('Failed to save signal history:', e);
    return false;
  }
}

// Calculate rolling accuracy stats
function calculateStats(signals: Signal[]): SignalHistory['stats'] {
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

  // Filter checked signals
  const checkedSignals = signals.filter(s => s.checked);
  const signals7d = checkedSignals.filter(s => s.timestamp > sevenDaysAgo);
  const signals30d = checkedSignals.filter(s => s.timestamp > thirtyDaysAgo);

  const correctAll = checkedSignals.filter(s => s.correct).length;
  const correct7d = signals7d.filter(s => s.correct).length;
  const correct30d = signals30d.filter(s => s.correct).length;

  // Calculate streak
  let streakCurrent = 0;
  let streakBest = 0;
  let currentStreak = 0;

  // Sort by timestamp descending for streak calculation
  const sortedSignals = [...checkedSignals].sort((a, b) => b.timestamp - a.timestamp);

  for (let i = 0; i < sortedSignals.length; i++) {
    if (sortedSignals[i].correct) {
      currentStreak++;
      if (i === 0 || (i > 0 && sortedSignals[i - 1].correct)) {
        // Continue streak
      }
    } else {
      if (i === 0) streakCurrent = 0;
      currentStreak = 0;
    }
    streakBest = Math.max(streakBest, currentStreak);
    if (i === 0) streakCurrent = currentStreak;
  }

  // If first signal is correct, count the streak
  if (sortedSignals.length > 0 && sortedSignals[0].correct) {
    streakCurrent = 1;
    for (let i = 1; i < sortedSignals.length && sortedSignals[i].correct; i++) {
      streakCurrent++;
    }
  } else {
    streakCurrent = 0;
  }

  // Average confidence
  const avgConfidence = checkedSignals.length > 0
    ? checkedSignals.reduce((sum, s) => sum + s.confidence, 0) / checkedSignals.length
    : 0;

  return {
    total: checkedSignals.length,
    correct: correctAll,
    accuracy7d: signals7d.length > 0 ? (correct7d / signals7d.length) * 100 : 0,
    accuracy30d: signals30d.length > 0 ? (correct30d / signals30d.length) * 100 : 0,
    accuracyAll: checkedSignals.length > 0 ? (correctAll / checkedSignals.length) * 100 : 0,
    avgConfidence,
    streakCurrent,
    streakBest,
  };
}

export default async (req: Request, context: Context) => {
  console.log('Checking signal outcomes...');

  const currentPrice = await getBTCPrice();
  if (currentPrice === 0) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Could not fetch BTC price',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  console.log(`Current BTC price: $${currentPrice.toLocaleString()}`);

  // Load existing signal history
  const history = await loadSignalHistory();
  if (!history) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Could not load signal history',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const now = Date.now();
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
  const twentyFiveHoursAgo = now - (25 * 60 * 60 * 1000);

  let checkedCount = 0;
  let correctCount = 0;

  // Check signals that are ~24 hours old and haven't been checked yet
  history.signals.forEach(signal => {
    if (!signal.checked && signal.timestamp < twentyFourHoursAgo && signal.timestamp > twentyFiveHoursAgo) {
      // Mark as checked
      signal.checked = true;
      signal.priceAfter24h = currentPrice;

      // Determine if prediction was correct
      const priceChange = currentPrice - signal.priceAtSignal;
      const priceChangePercent = (priceChange / signal.priceAtSignal) * 100;

      if (signal.direction === 'up') {
        signal.correct = priceChange > 0;
      } else if (signal.direction === 'down') {
        signal.correct = priceChange < 0;
      } else {
        // Neutral - correct if price didn't move more than 1%
        signal.correct = Math.abs(priceChangePercent) < 1;
      }

      checkedCount++;
      if (signal.correct) correctCount++;

      console.log(`Signal ${signal.id}: ${signal.direction} @ $${signal.priceAtSignal} -> $${currentPrice} (${signal.correct ? 'CORRECT' : 'INCORRECT'})`);
    }
  });

  // Also check any older unchecked signals (catch-up)
  history.signals.forEach(signal => {
    if (!signal.checked && signal.timestamp < twentyFiveHoursAgo) {
      signal.checked = true;
      signal.priceAfter24h = currentPrice; // Use current price as approximation

      const priceChange = currentPrice - signal.priceAtSignal;

      if (signal.direction === 'up') {
        signal.correct = priceChange > 0;
      } else if (signal.direction === 'down') {
        signal.correct = priceChange < 0;
      } else {
        signal.correct = Math.abs((priceChange / signal.priceAtSignal) * 100) < 1;
      }

      checkedCount++;
      if (signal.correct) correctCount++;
    }
  });

  // Keep only last 90 days of signals
  const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);
  history.signals = history.signals.filter(s => s.timestamp > ninetyDaysAgo);

  // Calculate stats
  history.stats = calculateStats(history.signals);
  history.lastUpdated = new Date().toISOString();

  // Save updated history
  const saved = await saveSignalHistory(history);

  return new Response(JSON.stringify({
    success: true,
    saved,
    checkedSignals: checkedCount,
    correctSignals: correctCount,
    stats: history.stats,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Note: Schedule removed - run on-demand only
