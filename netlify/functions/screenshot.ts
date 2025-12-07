import type { Context } from '@netlify/functions';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// Rate limiting (in-memory, resets on cold start)
const rateLimits: Map<string, { count: number; resetAt: number }> = new Map();
const RATE_LIMIT = 10; // Max screenshots per user per day
const RATE_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (userLimit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT - userLimit.count };
}

// Validate TradingView URL
function isValidTradingViewUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'tradingview.com' ||
      parsed.hostname === 'www.tradingview.com'
    ) && (
      parsed.pathname.startsWith('/chart/') ||
      parsed.pathname.startsWith('/x/')
    );
  } catch {
    return false;
  }
}

export default async (req: Request, context: Context) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let browser = null;

  try {
    const { url, userId } = await req.json();

    // Validate URL
    if (!url || !isValidTradingViewUrl(url)) {
      return new Response(JSON.stringify({
        error: 'Invalid URL. Only TradingView chart URLs are supported.',
        example: 'https://www.tradingview.com/chart/abc123/'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check rate limit
    const rateCheck = checkRateLimit(userId || 'anonymous');
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded. Try again tomorrow or upload a screenshot.',
        remaining: 0,
        limit: RATE_LIMIT
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Taking screenshot of: ${url}`);

    // Launch browser
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: {
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1
      },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Block unnecessary resources for speed
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      // Block ads, tracking, fonts (keep images, scripts, stylesheets for chart)
      if (['font', 'media'].includes(resourceType)) {
        req.abort();
      } else if (req.url().includes('google') || req.url().includes('analytics') || req.url().includes('facebook')) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate to URL
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for chart to render (TradingView loads dynamically)
    await page.waitForSelector('.chart-container, .tv-chart-container, [class*="chart"]', {
      timeout: 10000
    }).catch(() => {
      console.log('Chart selector not found, continuing anyway...');
    });

    // Extra wait for animations/data to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Hide cookie banners and popups
    await page.evaluate(() => {
      const selectors = [
        '[class*="cookie"]',
        '[class*="consent"]',
        '[class*="popup"]',
        '[class*="modal"]',
        '[class*="banner"]',
        '[id*="cookie"]',
        '[id*="consent"]'
      ];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });
      });
    });

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      encoding: 'base64'
    });

    await browser.close();
    browser = null;

    console.log(`Screenshot captured successfully, ${rateCheck.remaining} remaining for user`);

    return new Response(JSON.stringify({
      success: true,
      image: screenshot,
      mimeType: 'image/png',
      remaining: rateCheck.remaining,
      limit: RATE_LIMIT
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error: any) {
    console.error('Screenshot error:', error);

    if (browser) {
      await browser.close();
    }

    return new Response(JSON.stringify({
      error: 'Failed to capture screenshot',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Configure for longer timeout (screenshots take time)
export const config = {
  maxDuration: 60 // 60 seconds max
};
