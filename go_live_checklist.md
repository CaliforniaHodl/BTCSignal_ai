# Go Live Checklist - BTC Signal AI

## Security: Remove Admin Bypass

### 1. Remove admin functions from `static/src/js/access-manager.js`

Delete these functions:
- `isAdmin()`
- `enableAdmin()`
- `disableAdmin()`

Also remove:
- `const ADMIN_KEY = 'btcsai_admin';`
- Any comments referencing admin mode or `satoshi2024`

### 2. Remove admin checks from premium feature files

**`static/src/js/trade-coach.js`**
- Remove: `if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.isAdmin()) { return true; }`
- Remove: `window.TradeCoachRefresh = updateUI;`

**`static/src/js/paywall.js`**
- Remove: `if (typeof BTCSAIAccess !== 'undefined' && BTCSAIAccess.isAdmin()) { ... }`

**Search for any other files:**
```bash
grep -r "isAdmin\|enableAdmin\|satoshi2024" static/src/js/
```

---

## Environment Variables (Netlify)

### Required for Production

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `GITHUB_TOKEN` | GitHub Personal Access Token for saving market data | GitHub Settings > Developer Settings > Personal Access Tokens |
| `GITHUB_REPO` | Repository name (e.g., `CaliforniaHodl/BTCSignal_ai`) | Your repo URL |
| `OPENAI_API_KEY` | For AI trade coach analysis | OpenAI Platform |
| `COINGECKO_API_KEY` | (Optional) For higher rate limits | CoinGecko Pro |

### Verify in Netlify Dashboard
1. Go to Site Settings > Environment Variables
2. Ensure all keys are set for Production environment
3. Redeploy after adding/changing variables

---

## Scheduled Functions

Verify these Netlify scheduled functions are working:

| Function | Schedule | Purpose |
|----------|----------|---------|
| `fetch-market-data` | Every 4 hours | Updates market snapshot, OHLC, hashrate |
| `whale-tracker` | Every 5 minutes | Monitors 500+ BTC transactions |

Check Netlify Functions logs after deploy to confirm they run.

---

## Pre-Launch Testing

- [ ] All paywalls block content without payment
- [ ] Lightning payments work (test with small amount)
- [ ] Market data displays correctly on dashboard
- [ ] Whale alerts populate on /whales/
- [ ] Trade coach form submits and returns analysis
- [ ] No console errors on any page
- [ ] Mobile responsive check

---

## DNS / Domain

- [ ] Custom domain configured in Netlify
- [ ] SSL certificate active
- [ ] Redirect from www to non-www (or vice versa)

---

## Final Steps

1. Remove this checklist from repo (or move to private notes)
2. Remove any test/debug code
3. Clear browser localStorage: `localStorage.clear()`
4. Test as a fresh user in incognito mode
