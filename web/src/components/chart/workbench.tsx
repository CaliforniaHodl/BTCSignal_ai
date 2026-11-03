"use client";

/**
 * Smart Chart workbench. Free mode: core indicators, auto S/R, our signal markers.
 * Pro mode adds extra indicators, drawing tools (per-browser) and PNG export.
 * Candles are free data from our own /api/v1/candles route.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { INDICATORS, indicatorSpec, type IndicatorId } from "@/lib/chart/indicator-overlays";
import { technicalRead, type Read } from "@/lib/chart/read";
import { drawingsKey, drawingsSpec, parseDrawings, type Drawings } from "@/lib/chart/drawings";
import { signalChartMarkers, type SignalMarker } from "@/lib/chart/signal-markers";
import { mergeSpecs, type ChartSpec } from "@/lib/chart/spec";
import { isTimeframeClient } from "@/lib/chart/timeframes";
import { usd } from "@/lib/format";
import type { Candle, Datum, Timeframe } from "@/lib/market/types";
import { LwChart, type ChartClick, type ChartHandle } from "./lw-chart";
import { ChartFrame, Chip, ClientSourceLine, TimeframeTabs } from "./controls";
import { useJson } from "./use-json";
import { useStored } from "./use-stored";

const DEFAULT_ON: IndicatorId[] = ["ema20", "ema50", "levels", "rsi"];
type Mode = "none" | "hline" | "trend";

export function ChartWorkbench({ pro = false }: { pro?: boolean }) {
  const scope = pro ? "pro" : "free";
  const [tfRaw, setTfRaw] = useStored(`btcs:chart:tf:${scope}`);
  const tf: Timeframe = isTimeframeClient(tfRaw) ? tfRaw : "1h";
  const [indRaw, setIndRaw] = useStored(`btcs:chart:ind:${scope}`);
  const [sigRaw, setSigRaw] = useStored(`btcs:chart:signals:${scope}`);
  const showSignals = sigRaw !== "0";
  const available = useMemo(() => INDICATORS.filter((d) => pro || !d.pro), [pro]);
  const enabled = useMemo(() => {
    if (indRaw == null) return new Set(DEFAULT_ON);
    try {
      const ids = JSON.parse(indRaw) as string[];
      return new Set(available.filter((d) => ids.includes(d.id)).map((d) => d.id));
    } catch {
      return new Set(DEFAULT_ON);
    }
  }, [indRaw, available]);
  const toggle = (id: IndicatorId) => {
    const next = new Set(enabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setIndRaw(JSON.stringify([...next]));
  };

  const load = useJson<Datum<Candle[]>>(`/api/v1/candles?tf=${tf}`, 60_000, (d) => d.ok && d.value.length > 0);
  const datum = load.state === "ok" ? load.data : null;
  const candles = useMemo(() => (datum?.ok ? datum.value : []), [datum]);

  const since = candles.length ? Math.floor(candles[0].time / 86_400) * 86_400 : null;
  const sigLoad = useJson<{ ok: boolean; markers: SignalMarker[] }>(showSignals && since ? `/api/v1/signals/markers?since=${since}` : null, 300_000, (d) => d.ok);
  const signals = sigLoad.state === "ok" ? sigLoad.data.markers : null;

  // Drawings (Pro), per timeframe, persisted in this browser.
  const [drawRaw, setDrawRaw] = useStored(drawingsKey(tf));
  const drawings = useMemo(() => parseDrawings(drawRaw), [drawRaw]);
  const saveDrawings = useCallback((d: Drawings) => setDrawRaw(JSON.stringify(d)), [setDrawRaw]);
  const [mode, setMode] = useState<Mode>("none");
  const [pending, setPending] = useState<{ time: number; price: number } | null>(null);

  const spec: ChartSpec = useMemo(() => {
    const parts = [indicatorSpec(candles, enabled)];
    if (showSignals && signals) parts.push({ overlays: [], levels: [], markers: signalChartMarkers(candles, signals) });
    if (pro) parts.push(drawingsSpec(drawings));
    return mergeSpecs(...parts);
  }, [candles, enabled, showSignals, signals, pro, drawings]);

  const read = useMemo(() => technicalRead(candles), [candles]);
  const paneCount = new Set(spec.overlays.map((o) => o.pane).filter((p) => p && p !== "main")).size;

  const handle = useRef<ChartHandle | null>(null);
  const onClick = useCallback(
    (p: ChartClick) => {
      if (!pro || mode === "none" || p.price == null) return;
      const id = crypto.randomUUID();
      if (mode === "hline") {
        saveDrawings({ ...drawings, hlines: [...drawings.hlines, { id, price: p.price }] });
        setMode("none");
        return;
      }
      if (p.time == null) return; // trendline anchors must sit on a bar
      if (!pending) setPending({ time: p.time, price: p.price });
      else if (pending.time !== p.time) {
        saveDrawings({ ...drawings, trends: [...drawings.trends, { id, a: pending, b: { time: p.time, price: p.price } }] });
        setPending(null);
        setMode("none");
      }
    },
    [pro, mode, pending, drawings, saveDrawings]
  );

  const exportPng = () => {
    const h = handle.current;
    if (!h) return;
    h.screenshot().toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `btc-usd-${tf}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };

  const state = load.state === "ok" ? "ok" : load.state === "loading" ? "loading" : "error";
  const errSource = load.state === "error" && load.data && !load.data.ok ? load.data : null;
  const heightPx = 420 + paneCount * 110;

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">BTC / USD {pro && <span className="ml-1 text-xs text-accent">Pro</span>}</h2>
            <p className="text-xs text-faint">Coinbase spot candles · 300 bars · refreshes every minute</p>
          </div>
          <TimeframeTabs value={tf} onChange={(t) => { setTfRaw(t); setPending(null); }} />
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {available.map((d) => (
            <Chip key={d.id} on={enabled.has(d.id)} onClick={() => toggle(d.id)} color={d.color} title={d.hint}>
              {d.label}
            </Chip>
          ))}
          <Chip on={showSignals} onClick={() => setSigRaw(showSignals ? "0" : "1")} color="#22c55e" title="Our engine's published long/short signals (confidence = factor agreement, not win probability)">
            Our signals
          </Chip>
          {!pro && (
            <Link href="/smart-chart-pro" className="rounded-md px-2 py-1 text-xs text-accent hover:underline">
              + ATR, Stoch, OBV, ADX, drawing, export →
            </Link>
          )}
        </div>

        {pro && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-faint">Draw:</span>
            <Chip on={mode === "hline"} onClick={() => { setMode(mode === "hline" ? "none" : "hline"); setPending(null); }}>Horizontal line</Chip>
            <Chip on={mode === "trend"} onClick={() => { setMode(mode === "trend" ? "none" : "trend"); setPending(null); }}>Trendline</Chip>
            <Chip on={false} disabled={!drawings.hlines.length && !drawings.trends.length} onClick={() => saveDrawings({ hlines: [], trends: [] })}>Clear {tf} drawings</Chip>
            <span className="mx-1 h-4 w-px bg-line" />
            <Chip on={false} disabled={state !== "ok"} onClick={exportPng}>Export PNG</Chip>
            {mode !== "none" && (
              <span className="text-accent" role="status">
                {mode === "hline" ? "Click the chart to place a line." : pending ? "Click a second bar to finish the trendline." : "Click the first bar of the trendline."}
              </span>
            )}
          </div>
        )}

        <ChartFrame state={state} height="" message={errSource ? `Candles unavailable — ${errSource.source} didn't respond.` : undefined}>
          <div style={{ height: heightPx }} className={clsx("relative", mode !== "none" && "cursor-crosshair")}>
            <LwChart candles={candles} spec={spec} fitKey={tf} onClick={onClick} onReady={(h) => (handle.current = h)} />
          </div>
        </ChartFrame>

        {pro && (drawings.hlines.length > 0 || drawings.trends.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {drawings.hlines.map((h) => (
              <button key={h.id} onClick={() => saveDrawings({ ...drawings, hlines: drawings.hlines.filter((x) => x.id !== h.id) })} className="num rounded-md border border-line px-2 py-0.5 text-muted hover:text-fg" title="Remove">
                — {usd(h.price)} ×
              </button>
            ))}
            {drawings.trends.map((t) => (
              <button key={t.id} onClick={() => saveDrawings({ ...drawings, trends: drawings.trends.filter((x) => x.id !== t.id) })} className="num rounded-md border border-line px-2 py-0.5 text-muted hover:text-fg" title="Remove">
                ╱ {usd(t.a.price)} → {usd(t.b.price)} ×
              </button>
            ))}
            <span className="self-center text-faint">Saved in this browser only.</span>
          </div>
        )}

        <ClientSourceLine
          source={datum?.ok ? datum.source : "Coinbase"}
          fetchedAt={datum?.fetchedAt}
          extra={showSignals ? (sigLoad.state === "error" ? "signal history unavailable" : signals ? `${signals.length} of our signals in range` : undefined) : undefined}
        />
      </div>

      {read && <TechnicalRead r={read} tf={tf} />}
    </div>
  );
}

function TechnicalRead({ r, tf }: { r: Read; tf: Timeframe }) {
  const items: { label: string; value: string; tone?: "up" | "down"; sub: string }[] = [
    {
      label: "RSI 14",
      value: r.rsi?.toFixed(1) ?? "—",
      tone: r.rsiZone === "overbought" ? "down" : r.rsiZone === "oversold" ? "up" : undefined,
      sub: r.rsiZone ?? "warming up",
    },
    {
      label: "EMA 20 / 50",
      value: r.emaTrend === "up" ? "Stacked up" : r.emaTrend === "down" ? "Stacked down" : r.emaTrend === "mixed" ? "Mixed" : "—",
      tone: r.emaTrend === "up" ? "up" : r.emaTrend === "down" ? "down" : undefined,
      sub: r.vsEma200 ? `price ${r.vsEma200} EMA 200` : "EMA 200 needs 200 bars",
    },
    {
      label: "MACD hist",
      value: r.macdHist == null ? "—" : r.macdHist >= 0 ? "Positive" : "Negative",
      tone: r.macdHist == null ? undefined : r.macdHist >= 0 ? "up" : "down",
      sub: r.macdCross ? `crossed ${r.macdCross.dir} ${r.macdCross.barsAgo} bar${r.macdCross.barsAgo === 1 ? "" : "s"} ago` : "no recent cross",
    },
    {
      label: "Bollinger %B",
      value: r.percentB == null ? "—" : r.percentB.toFixed(2),
      sub: r.percentB == null ? "" : r.percentB > 1 ? "above upper band" : r.percentB < 0 ? "below lower band" : "inside bands",
    },
    { label: "Nearest support", value: r.support ? usd(r.support) : "—", tone: "up", sub: r.support ? `${(((r.support - r.close) / r.close) * 100).toFixed(2)}%` : "none with 2+ touches" },
    { label: "Nearest resistance", value: r.resistance ? usd(r.resistance) : "—", tone: "down", sub: r.resistance ? `+${(((r.resistance - r.close) / r.close) * 100).toFixed(2)}%` : "none with 2+ touches" },
  ];
  return (
    <section aria-label="Technical read">
      <h2 className="mb-2 text-sm font-medium text-muted">Where the indicators sit now <span className="text-faint">({tf}, descriptive — not a signal)</span></h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {items.map((i) => (
          <div key={i.label} className="card p-3">
            <div className="text-[11px] uppercase tracking-wider text-faint">{i.label}</div>
            <div className={clsx("num mt-1 font-semibold", i.tone === "up" && "text-up", i.tone === "down" && "text-down")}>{i.value}</div>
            <div className="text-xs text-muted">{i.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
