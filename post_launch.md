# Post-Launch Operations - BTC Signal AI

## Daily Operations

### Check Netlify Function Logs
1. Go to Netlify Dashboard > Functions
2. Review logs for:
   - `fetch-market-data` - Should run every 4 hours (6x/day)
   - `whale-tracker` - Should run every 5 minutes (288x/day)
   - `trade-coach` - On-demand when users submit trades

**Red flags to watch for:**
- Rate limit errors (CoinGecko, OKX)
- GitHub API failures (token expired?)
- Timeout errors (increase timeout if needed)

### Monitor Site Speed
- Use [PageSpeed Insights](https://pagespeed.web.dev/) monthly
- Target scores: Mobile 80+, Desktop 90+
- If scores drop, check for:
  - Large images not optimized
  - Too many API calls on page load
  - Unused JavaScript

---

## Netlify Plan Upgrades

### Current: Free Tier (Starter)
| Limit | Free Tier |
|-------|-----------|
| Bandwidth | 100 GB/month |
| Build minutes | 300/month |
| Serverless functions | 125K requests/month |
| Scheduled functions | Included |

### When to Upgrade to Pro ($19/month)

**Upgrade when ANY of these happen:**

| Trigger | Why |
|---------|-----|
| Bandwidth > 80 GB/month | Avoid overage charges |
| Function invocations > 100K/month | Buffer before hitting limit |
| Monthly revenue > $100 | Pro pays for itself |
| Need team collaboration | Pro includes 1 team member |

### Revenue Threshold for Pro
```
Break-even: $19/month in sales
Comfortable: $50+/month in sales (Pro is ~38% of revenue)
No-brainer: $100+/month (Pro is <20% of revenue)
```

### How to Upgrade
1. Netlify Dashboard > Team Settings > Billing
2. Select "Pro" plan
3. Enter payment info
4. Immediate upgrade, prorated billing

---

## API Upgrades

### CoinGecko

**Current: Free Tier**
- 10-30 calls/minute
- Occasional rate limits
- No API key required

**Demo Plan - $129/month**
- 500 calls/minute
- Priority support
- Historical data access

**When to upgrade:**
| Trigger | Action |
|---------|--------|
| Frequent rate limit errors in logs | Consider upgrade |
| Adding real-time price updates | Need higher limits |
| Monthly revenue > $500 | Can afford it |
| Monthly revenue > $1,000 | Definitely upgrade |

**Alternative:** We already have CoinCap fallback, which is free and reliable.

---

### OpenAI (for Trade Coach)

**Current: Pay-as-you-go**
- GPT-4o: ~$5 per 1M input tokens, ~$15 per 1M output tokens
- GPT-3.5-turbo: ~$0.50 per 1M input tokens

**Estimated cost per trade analysis:**
- ~500 input tokens + ~1000 output tokens
- GPT-4o: ~$0.02 per analysis
- GPT-3.5: ~$0.002 per analysis

**Monthly cost projection:**
| Analyses/month | GPT-4o Cost | GPT-3.5 Cost |
|----------------|-------------|--------------|
| 100 | $2 | $0.20 |
| 500 | $10 | $1 |
| 1,000 | $20 | $2 |
| 5,000 | $100 | $10 |

**When to worry:**
- If OpenAI costs exceed 30% of revenue, consider:
  - Switching to GPT-3.5 for basic analysis
  - Caching common trade patterns
  - Adding rate limits per user

---

### Mempool.space (Whale Tracking)

**Current: Free public API**
- No rate limits documented
- Very reliable

**Upgrade: Mempool Enterprise**
- Only needed if you're hammering their API
- Contact them directly for pricing
- Probably not needed unless you have 10K+ daily users

---

## Revenue Milestones & Actions

### $0 - $50/month
- Stay on all free tiers
- Monitor logs weekly
- Focus on user acquisition

### $50 - $200/month
- Upgrade Netlify to Pro ($19)
- Keep APIs on free tiers
- Start tracking costs in spreadsheet

### $200 - $500/month
- Consider CoinGecko paid if having issues
- Set aside 20% for infrastructure
- Monthly revenue review

### $500 - $1,000/month
- Upgrade CoinGecko to Demo ($129)
- Consider dedicated error monitoring (Sentry free tier)
- Weekly log reviews

### $1,000+/month
- All paid tiers as needed
- Consider CDN upgrade
- Hire help for support if needed
- Quarterly infrastructure review

---

## Cost Management Tips

1. **Set billing alerts** in Netlify and OpenAI dashboards
2. **Cache aggressively** - Market data only needs updates every 4 hours
3. **Use fallbacks** - CoinCap for CoinGecko, local analysis for OpenAI failures
4. **Monitor before upgrading** - Don't pay for capacity you don't need

---

## Quarterly Review Checklist

- [ ] Review Netlify bandwidth usage
- [ ] Check function invocation counts
- [ ] Review OpenAI spending
- [ ] Test all scheduled functions manually
- [ ] Run PageSpeed test
- [ ] Check for any deprecated API endpoints
- [ ] Review user feedback/complaints
- [ ] Update dependencies if needed
