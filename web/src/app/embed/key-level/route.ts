/**
 * GET /embed/key-level?tf=1h&theme=dark|light
 *
 * A self-contained iframe widget. Served as a route handler (not a page) so it
 * renders with no site chrome and no client JS while the root layout stays
 * untouched. Embeddable anywhere (frame-ancestors *).
 */
import { getKeyLevels, LEVEL_METHOD } from "@/lib/market/pro";
import { isTimeframe } from "@/lib/market/snapshot";
import { SITE_URL } from "@/lib/site/url";

const SITE = SITE_URL;

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const sp = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tfRaw = url.searchParams.get("tf") ?? "1h";
  const tf = isTimeframe(tfRaw) ? tfRaw : "1h";
  const light = url.searchParams.get("theme") === "light";
  const d = await getKeyLevels(tf);

  const ageMin = Math.max(0, Math.round((Date.now() - d.fetchedAt) / 60_000));
  const level = (label: string, cls: string, l: { price: number; distancePct: number; touches: number } | null) =>
    l
      ? `<div class="lvl"><div class="k">${label}</div><div class="v ${cls}">${money(l.price)}</div><div class="s">${sp(l.distancePct)} · ${l.touches} touches</div></div>`
      : `<div class="lvl"><div class="k">${label}</div><div class="v muted">None nearby</div><div class="s">&nbsp;</div></div>`;

  const body = d.ok
    ? `<div class="top"><span class="k">BTC · ${tf} key levels</span><span class="price">${money(d.value.price)}</span></div>
       <div class="grid">${level("Resistance", "down", d.value.resistance)}${level("Support", "up", d.value.support)}</div>`
    : `<div class="top"><span class="k">BTC · ${tf} key levels</span></div><div class="muted unavail">Unavailable — ${d.source} didn't respond</div>`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="120"><title>BTC key levels</title><meta name="robots" content="noindex">
<style>
:root{--bg:${light ? "#ffffff" : "#0d1117"};--fg:${light ? "#0b1220" : "#e6e9ef"};--muted:${light ? "#5b6476" : "#8b94a7"};--line:${light ? "#e3e7ee" : "#1b2230"};--up:${light ? "#15803d" : "#22c55e"};--down:${light ? "#b91c1c" : "#ef4444"};--accent:#f7931a}
*{box-sizing:border-box;margin:0}body{font:14px/1.35 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--fg);padding:14px;border:1px solid var(--line);border-radius:12px;min-height:100vh}
.top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.k{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.price,.v{font-variant-numeric:tabular-nums;font-weight:600}.price{font-size:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.lvl{border:1px solid var(--line);border-radius:10px;padding:10px}.v{font-size:20px;margin-top:4px}.s{font-size:11px;color:var(--muted);margin-top:2px}
.up{color:var(--up)}.down{color:var(--down)}.muted{color:var(--muted)}.unavail{margin-top:10px}
.foot{display:flex;justify-content:space-between;gap:8px;margin-top:10px;font-size:10.5px;color:var(--muted)}.foot a{color:var(--accent);text-decoration:none}
</style></head><body>${body}
<div class="foot"><span title="${LEVEL_METHOD}">Coinbase candles · ${ageMin < 1 ? "just now" : `${ageMin}m ago`}</span><a href="${SITE}/" target="_blank" rel="noopener">BTCSignal.ai</a></div>
</body></html>`;

  return new Response(html, {
    status: d.ok ? 200 : 502,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": `public, max-age=${d.ok ? 60 : 5}, s-maxage=${d.ok ? 60 : 5}, stale-while-revalidate=300`,
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors *; base-uri 'none'; form-action 'none'",
      "x-content-type-options": "nosniff",
    },
  });
}
