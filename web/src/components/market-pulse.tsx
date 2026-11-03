"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ago, compactUsd, fundingPct, pct, tone, usd } from "@/lib/format";
import type { Datum, MarketSnapshot } from "@/lib/market/types";

const REFRESH_MS = 20_000;

export function MarketPulse({ initial }: { initial: MarketSnapshot }) {
  const [snap, setSnap] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/v1/snapshot", { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const next = (await r.json()) as MarketSnapshot;
        if (alive) {
          setSnap(next);
          setStale(false);
        }
      } catch {
        if (alive) setStale(true);
      }
    };
    const poll = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  const { spot, spotCrossCheck, derivatives, fearGreed, fees, network, global } = snap;
  const spread =
    spot.ok && spotCrossCheck.ok ? ((spotCrossCheck.value.price - spot.value.price) / spot.value.price) * 100 : null;

  return (
    <div className="space-y-4">
      {/* Hero price */}
      <div className="card relative overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <span className={clsx("live-dot size-2 rounded-full", stale ? "bg-warn" : "bg-up")} />
              BTC / USD {stale && <span className="text-warn">· reconnecting</span>}
            </div>
            {spot.ok ? (
              <>
                <div className="num mt-2 text-5xl font-semibold sm:text-6xl">{usd(spot.value.price)}</div>
                <div className={clsx("num mt-2 text-lg", tone(spot.value.change24hPct))}>
                  {pct(spot.value.change24hPct)} <span className="text-sm text-faint">24h</span>
                </div>
              </>
            ) : (
              <Unavailable d={spot} className="mt-3 text-2xl" />
            )}
          </div>
          {spot.ok && (
            <dl className="num grid grid-cols-3 gap-6 text-sm">
              <Mini label="24h high" value={usd(spot.value.high24h)} />
              <Mini label="24h low" value={usd(spot.value.low24h)} />
              <Mini label="24h vol" value={`${Math.round(spot.value.volume24hBtc).toLocaleString()} BTC`} />
            </dl>
          )}
        </div>
        <Source d={spot} now={now} extra={spread != null ? `Kraken ${pct(spread, 3)} vs Coinbase` : undefined} />
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile title="Fear & Greed" d={fearGreed} now={now}>
          {(v) => (
            <>
              <Big className={v.value >= 55 ? "text-up" : v.value <= 45 ? "text-down" : ""}>{v.value}</Big>
              <Sub>{v.label}</Sub>
              <Gauge value={v.value} />
            </>
          )}
        </Tile>
        <Tile title="Funding (8h, OI-weighted)" d={derivatives} now={now}>
          {(v) => (
            <>
              <Big className={tone(v.avgRate8h)}>{fundingPct(v.avgRate8h)}</Big>
              <Sub>{v.avgRate8h > 0.0003 ? "Longs crowded" : v.avgRate8h < 0 ? "Shorts paying" : "Neutral"}</Sub>
              <ul className="num mt-3 space-y-1 text-xs text-muted">
                {v.venues.map((x) => (
                  <li key={x.venue} className="flex justify-between">
                    <span>{x.venue}</span>
                    <span className={tone(x.rate8h)}>{fundingPct(x.rate8h)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Tile>
        <Tile title="Open interest" d={derivatives} now={now}>
          {(v) => (
            <>
              <Big>{compactUsd(v.totalOpenInterestUsd)}</Big>
              <Sub>{v.venues.length} venues</Sub>
              <ul className="num mt-3 space-y-1 text-xs text-muted">
                {v.venues.map((x) => (
                  <li key={x.venue} className="flex justify-between">
                    <span>{x.venue}</span>
                    <span>{x.openInterestUsd != null ? compactUsd(x.openInterestUsd) : "—"}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Tile>
        <Tile title="BTC dominance" d={global} now={now}>
          {(v) => (
            <>
              <Big>{v.btcDominancePct.toFixed(1)}%</Big>
              <Sub>Total crypto {compactUsd(v.totalMarketCapUsd)}</Sub>
              <Bar value={v.btcDominancePct} />
            </>
          )}
        </Tile>
        <Tile title="Next-block fee" d={fees} now={now}>
          {(v) => (
            <>
              <Big>
                {v.fastest} <span className="text-base text-muted">sat/vB</span>
              </Big>
              <Sub>
                30m {v.halfHour} · 1h {v.hour} · econ {v.economy}
              </Sub>
            </>
          )}
        </Tile>
        <Tile title="Hashrate" d={network} now={now}>
          {(v) => (
            <>
              <Big>
                {v.hashrateEhs.toFixed(0)} <span className="text-base text-muted">EH/s</span>
              </Big>
              <Sub>Block {v.blockHeight.toLocaleString()}</Sub>
            </>
          )}
        </Tile>
        <Tile title="Difficulty adjustment" d={network} now={now}>
          {(v) => (
            <>
              <Big className={tone(v.difficultyChangePct)}>{pct(v.difficultyChangePct)}</Big>
              <Sub>{v.blocksUntilRetarget.toLocaleString()} blocks to retarget</Sub>
              <Bar value={v.retargetProgressPct} />
            </>
          )}
        </Tile>
        <Tile title="Exchange spread" d={spotCrossCheck} now={now}>
          {(v) => (
            <>
              <Big>{usd(v.price)}</Big>
              <Sub>{spread != null ? `Kraken ${pct(spread, 3)} vs Coinbase` : "Kraken last"}</Sub>
            </>
          )}
        </Tile>
      </div>
    </div>
  );
}

function Tile<T>({ title, d, now, children }: { title: string; d: Datum<T>; now: number; children: (v: T) => React.ReactNode }) {
  return (
    <div className="card flex flex-col p-4">
      <div className="text-xs uppercase tracking-wider text-faint">{title}</div>
      <div className="mt-2 flex-1">{d.ok ? children(d.value) : <Unavailable d={d} />}</div>
      <Source d={d} now={now} />
    </div>
  );
}

function Unavailable({ d, className }: { d: Datum<unknown>; className?: string }) {
  return (
    <div className={clsx("text-muted", className)} title={!d.ok ? d.error : undefined}>
      Unavailable
      <div className="mt-1 text-xs text-faint">{d.source} didn&apos;t respond</div>
    </div>
  );
}

function Source({ d, now, extra }: { d: Datum<unknown>; now: number; extra?: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-2 text-[11px] text-faint">
      <span>{d.source}</span>
      <span>·</span>
      <span suppressHydrationWarning>{ago(d.fetchedAt, now)}</span>
      {extra && (
        <>
          <span>·</span>
          <span>{extra}</span>
        </>
      )}
    </div>
  );
}

const Big = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={clsx("num text-2xl font-semibold", className)}>{children}</div>
);
const Sub = ({ children }: { children: React.ReactNode }) => <div className="mt-0.5 text-sm text-muted">{children}</div>;
const Mini = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs text-faint">{label}</dt>
    <dd className="mt-0.5">{value}</dd>
  </div>
);

function Bar({ value }: { value: number }) {
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  return (
    <div className="relative mt-3 h-1.5 rounded-full bg-gradient-to-r from-down via-warn to-up">
      <div
        className="absolute -top-1 size-3.5 -translate-x-1/2 rounded-full border-2 border-bg bg-fg"
        style={{ left: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
