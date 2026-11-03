/**
 * Every route from the legacy Hugo site, so the port is tracked in one place.
 * `status: "live"` routes are implemented in the new app; others render as
 * "rebuilding" in the tools directory until their phase lands.
 */
export type Tier = "free" | "premium";
export type Status = "live" | "rebuilding";
export type Category = "Markets" | "Charts" | "On-chain" | "Derivatives" | "AI" | "Calculators" | "Tracking";

export type Tool = {
  slug: string;
  name: string;
  blurb: string;
  category: Category;
  tier: Tier;
  status: Status;
  phase: 2 | 3 | 4;
};

export const TOOLS: Tool[] = [
  // Markets
  { slug: "dashboard", name: "Pro Dashboard", blurb: "Every metric that moves BTC, on one customizable screen.", category: "Markets", tier: "premium", status: "rebuilding", phase: 4 },
  { slug: "alpha-radar", name: "Alpha Radar", blurb: "Whale moves and market-structure shifts, summarized.", category: "Markets", tier: "premium", status: "rebuilding", phase: 4 },
  { slug: "whales", name: "Whale Watch", blurb: "Large on-chain transfers as they hit the mempool.", category: "On-chain", tier: "free", status: "rebuilding", phase: 4 },
  { slug: "alerts", name: "Alerts", blurb: "Price and on-chain alerts to Discord or Telegram.", category: "Markets", tier: "free", status: "rebuilding", phase: 4 },
  // Charts
  { slug: "smart-chart", name: "Smart Chart", blurb: "Candles with auto support/resistance and core indicators.", category: "Charts", tier: "free", status: "rebuilding", phase: 4 },
  { slug: "smart-chart-pro", name: "Smart Chart Pro", blurb: "12+ indicators, drawing tools, multi-pane, export.", category: "Charts", tier: "premium", status: "rebuilding", phase: 4 },
  { slug: "pattern-detector", name: "Pattern Detector", blurb: "Triangles, wedges, channels, double tops/bottoms.", category: "Charts", tier: "premium", status: "rebuilding", phase: 4 },
  { slug: "liquidation-map", name: "Liquidation Map", blurb: "Where leveraged positions get forced out.", category: "Derivatives", tier: "premium", status: "rebuilding", phase: 4 },
  { slug: "liquidity-hunter", name: "Liquidity Hunter", blurb: "Likely sweep zones above and below price.", category: "Derivatives", tier: "premium", status: "rebuilding", phase: 4 },
  // On-chain
  { slug: "hodl-waves", name: "HODL Waves", blurb: "Supply by coin age — who's holding, who's selling.", category: "On-chain", tier: "free", status: "rebuilding", phase: 4 },
  { slug: "difficulty-ribbon", name: "Difficulty Ribbon", blurb: "Miner capitulation and recovery signals.", category: "On-chain", tier: "free", status: "rebuilding", phase: 4 },
  { slug: "fee-estimator", name: "Fee Estimator", blurb: "What to pay to confirm in the next block, hour, or day.", category: "On-chain", tier: "free", status: "rebuilding", phase: 4 },
  // AI
  { slug: "trade-coach", name: "Trade Coach", blurb: "AI critique of a planned trade before you take it.", category: "AI", tier: "premium", status: "rebuilding", phase: 4 },
  { slug: "setup-grader", name: "Setup Grader", blurb: "Upload a chart, get a graded setup.", category: "AI", tier: "premium", status: "rebuilding", phase: 4 },
  { slug: "analyze", name: "Chart Analysis", blurb: "AI read of any chart screenshot.", category: "AI", tier: "premium", status: "rebuilding", phase: 4 },
  // Calculators
  { slug: "dca-calculator", name: "DCA Calculator", blurb: "What steady stacking would have returned.", category: "Calculators", tier: "free", status: "rebuilding", phase: 4 },
  { slug: "sats-converter", name: "Sats Converter", blurb: "BTC ⇄ sats ⇄ USD, plus a stack tracker.", category: "Calculators", tier: "free", status: "rebuilding", phase: 4 },
  { slug: "portfolio-simulator", name: "Portfolio Simulator", blurb: "Backtest a strategy with Monte Carlo ranges.", category: "Calculators", tier: "premium", status: "rebuilding", phase: 4 },
  { slug: "backtester-pro", name: "Backtester Pro", blurb: "Describe a strategy in plain English, backtest it.", category: "Calculators", tier: "premium", status: "rebuilding", phase: 4 },
  // Tracking
  { slug: "agent", name: "Trading Agent", blurb: "Our paper-trading agent: every trade, every reason, public.", category: "Tracking", tier: "free", status: "rebuilding", phase: 2 },
  { slug: "prediction-tracker", name: "Prediction Tracker", blurb: "Every call we made vs. what price actually did.", category: "Tracking", tier: "free", status: "rebuilding", phase: 2 },
  { slug: "trading-history", name: "Signal P&L", blurb: "Hypothetical P&L of following every signal.", category: "Tracking", tier: "free", status: "rebuilding", phase: 2 },
  { slug: "journal", name: "Trade Journal", blurb: "Log your own trades and review your edge.", category: "Tracking", tier: "free", status: "rebuilding", phase: 4 },
];

/** Non-tool routes from the legacy site, ported in phase 3/4. */
export const PAGES = [
  "posts", "learn", "signal-history", "pricing", "recover", "pro-tools", "how-it-works", "about", "faq",
  "api-docs", "api-explorer", "newsletter", "embed/key-level", "chart-demo", "alerts/history", "owner-trading",
  "terms", "privacy-policy", "terms-of-use", "accessibility-statement",
] as const;

export const NAV = [
  { href: "/", label: "Markets" },
  { href: "/agent", label: "Agent" },
  { href: "/tools", label: "Tools" },
  { href: "/posts", label: "Signals" },
  { href: "/learn", label: "Learn" },
  { href: "/pricing", label: "Pricing" },
];
