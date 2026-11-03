"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { LwChart } from "@/components/chart/lw-chart";
import { ChartFrame, ClientSourceLine, TimeframeTabs } from "@/components/chart/controls";
import { useJson } from "@/components/chart/use-json";
import { liquiditySpec } from "@/lib/chart/structure-spec";
import { ZONE_LABELS, type Zone } from "@/lib/patterns/liquidity";
import { usd } from "@/lib/format";
import type { Timeframe } from "@/lib/market/types";
import type { LiquidityResponse } from "@/app/api/v1/liquidity/route";

const BAR_HOURS: Record<Timeframe, number> = { "15m": 0.25, "1h": 1, "4h": 4, "1d": 24 };

export function LiquidityView() {
  const [tf, setTf] = useState<Timeframe>("1h");
  const load = useJson<LiquidityResponse>(`/api/v1/liquidity?tf=${tf}`, 60_000, (d) => d.candles.ok);
  const data = load.state === "ok" ? load.data : null;
  const candles = useMemo(() => (data?.candles.ok ? data.candles.value : []), [data]);
  const map = data?.map ?? null;
  const spec = useMemo(() => (map ? liquiditySpec(candles, map.zones, map.sweeps.slice(0, 10)) : { overlays: [], levels: [], markers: [] }), [candles, map]);
  const state = load.state === "ok" ? "ok" : load.state === "loading" ? "loading" : "error";
  const errMsg = load.state === "error" ? (load.status === 402 ? "Pro pass required." : "Candles unavailable — Coinbase didn't respond.") : undefined;
  const above = map?.zones.filter((z) => z.side === "above").sort((a, b) => a.price - b.price) ?? [];
  const below = map?.zones.filter((z) => z.side === "below").sort((a, b) => b.price - a.price) ?? [];

  return (
    <div className="space-y-6">
      <div className="card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">BTC / USD — resting liquidity</h2>
            <p className="text-xs text-faint">
              <span className="text-down">above price</span> · <span className="text-up">below price</span> · <span className="text-warn">prior day/week</span> · thick = equal highs/lows · dashed = single swing
            </p>
          </div>
          <TimeframeTabs value={tf} onChange={setTf} />
        </div>
        <ChartFrame state={state} message={errMsg}>
          <LwChart candles={candles} spec={spec} fitKey={tf} />
        </ChartFrame>
        {data && (
          <ClientSourceLine
            source={data.candles.source}
            fetchedAt={data.candles.fetchedAt}
            extra={data.daily.ok ? "prior day/week from Coinbase daily candles (UTC)" : "prior day/week unavailable (daily candles failed)"}
          />
        )}
      </div>

      {map && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <ZoneTable title="Above price — buy-stop liquidity" zones={above} tone="down" />
            <ZoneTable title="Below price — sell-stop liquidity" zones={below} tone="up" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="card p-5">
              <h2 className="font-medium">Recent sweeps of equal highs/lows</h2>
              {map.sweeps.length === 0 ? (
                <p className="mt-3 text-sm text-muted">None in this window.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line text-sm">
                  {map.sweeps.slice(0, 8).map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                      <div>
                        <span className={s.kind === "equal_highs" ? "text-down" : "text-up"}>{ZONE_LABELS[s.kind]}</span>{" "}
                        <span className="text-xs text-faint">×{s.touches}</span>
                        <div className="text-xs text-faint">{new Date(s.sweptTime * 1000).toISOString().slice(5, 16).replace("T", " ")} UTC</div>
                      </div>
                      <div className="text-right">
                        <div className="num">{usd(s.price)}</div>
                        <div className="text-xs text-muted">{s.reclaimed ? "wicked through, closed back" : "closed through"}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="card p-5">
              <h2 className="font-medium">Observed base rate in this window</h2>
              <p className="mt-1 text-xs text-muted">
                Of the equal-high/low pools that formed in these {candles.length} {tf} bars and had at least {data!.horizonBars} bars of follow-up,
                how many were taken out within {data!.horizonBars} bars (≈{Math.round(data!.horizonBars * BAR_HOURS[tf])}h). Counted, not predicted.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {map.stats.map((s) => (
                  <div key={s.kind} className="rounded-lg border border-line p-3">
                    <div className="text-xs text-faint">{ZONE_LABELS[s.kind]}</div>
                    <div className="num mt-1 text-lg font-semibold">
                      {s.formed === 0 ? "—" : `${s.sweptWithin} / ${s.formed}`}
                    </div>
                    <div className="text-xs text-muted">
                      {s.formed === 0 ? "no completed samples" : s.formed < 10 ? "small sample — anecdotal" : `${Math.round((s.sweptWithin / s.formed) * 100)}% swept`}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function ZoneTable({ title, zones, tone }: { title: string; zones: Zone[]; tone: "up" | "down" }) {
  return (
    <section className="card p-5">
      <h2 className="font-medium">{title}</h2>
      {zones.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No unswept pools on this side in the window.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="num w-full text-sm">
            <thead className="text-left text-xs text-faint">
              <tr><th className="py-1 font-normal">Level</th><th className="font-normal">Price</th><th className="text-right font-normal">Distance</th><th className="text-right font-normal">Touches</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {zones.map((z) => (
                <tr key={z.id} className={clsx(z.swept && "text-faint")}>
                  <td className="py-1.5 font-sans">
                    {z.label}
                    {z.swept && <span className="ml-1 text-xs">(already taken)</span>}
                  </td>
                  <td className={clsx(!z.swept && (tone === "up" ? "text-up" : "text-down"))}>{usd(z.price)}</td>
                  <td className="text-right">
                    {z.distancePct > 0 ? "+" : ""}{z.distancePct.toFixed(2)}%
                    {z.distanceAtr != null && <span className="block text-[11px] text-faint">{Math.abs(z.distanceAtr).toFixed(1)} ATR</span>}
                  </td>
                  <td className="text-right">{z.touches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
