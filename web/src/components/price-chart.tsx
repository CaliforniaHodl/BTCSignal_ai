"use client";

/** Homepage chart: a fixed preset of the chart workbench (EMA 20/50 + auto S/R). */
import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { keyLevels, last, rsi } from "@/lib/indicators";
import { indicatorSpec } from "@/lib/chart/indicator-overlays";
import { usd } from "@/lib/format";
import type { Candle, Datum, Timeframe } from "@/lib/market/types";
import { LwChart } from "./chart/lw-chart";
import { ChartFrame, TimeframeTabs } from "./chart/controls";
import { useJson } from "./chart/use-json";

export function PriceChart() {
  const [tf, setTf] = useState<Timeframe>("1h");
  const load = useJson<Datum<Candle[]>>(`/api/v1/candles?tf=${tf}`, 60_000, (d) => d.ok && d.value.length > 0);
  const candles = useMemo(() => (load.state === "ok" && load.data.ok ? load.data.value : []), [load]);
  const spec = useMemo(() => indicatorSpec(candles, ["ema20", "ema50"]), [candles]);
  const levels = useMemo(() => keyLevels(candles, { lookback: 4, max: 4 }), [candles]);
  const fullSpec = useMemo(
    () => ({
      ...spec,
      levels: levels.map((l) => ({ price: l.price, color: l.kind === "support" ? "#22c55e" : "#ef4444", title: `${l.kind === "support" ? "S" : "R"} ×${l.touches}` })),
    }),
    [spec, levels]
  );
  const rsiNow = useMemo(() => last(rsi(candles.map((c) => c.close), 14)), [candles]);
  const state = load.state === "ok" ? "ok" : load.state === "loading" ? "loading" : "error";

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">BTC / USD</h2>
          <p className="text-xs text-faint">
            Coinbase candles · <span className="text-accent">EMA 20</span> · <span className="text-[#60a5fa]">EMA 50</span> · auto S/R ·{" "}
            <Link href="/smart-chart" className="hover:text-fg">open Smart Chart →</Link>
          </p>
        </div>
        <TimeframeTabs value={tf} onChange={setTf} />
      </div>
      <ChartFrame state={state} height="h-[380px] sm:h-[460px]">
        <LwChart candles={candles} spec={fullSpec} fitKey={tf} />
      </ChartFrame>
      {state === "ok" && (
        <div className="num mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
          <span>
            RSI 14: <span className={clsx(rsiNow != null && (rsiNow > 70 ? "text-down" : rsiNow < 30 ? "text-up" : "text-fg"))}>{rsiNow?.toFixed(1) ?? "—"}</span>
          </span>
          {levels.map((l) => (
            <span key={l.price}>
              {l.kind === "support" ? "Support" : "Resistance"} <span className={l.kind === "support" ? "text-up" : "text-down"}>{usd(l.price)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
