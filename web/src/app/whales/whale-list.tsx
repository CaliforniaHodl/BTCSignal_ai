"use client";

import { useMemo, useState } from "react";
import { Badge, Card, SourceLine, Stat } from "@/components/ui";
import { Segmented } from "@/components/form";
import { LocalTime } from "@/components/local-time";
import { compactUsd, usd } from "@/lib/format";
import { WHALE_THRESHOLDS_BTC, type WhaleTx } from "@/lib/onchain/whales-parse";

const btc = (sats: number) => (sats / 1e8).toLocaleString("en-US", { maximumFractionDigits: 2 });

export function WhaleList({ txs, price, fetchedAt, priceFetchedAt, scope, missing }: {
  txs: WhaleTx[];
  price: number | null;
  fetchedAt: number;
  priceFetchedAt: number;
  scope: string;
  missing: number[];
}) {
  const [min, setMin] = useState<string>("100");
  const shown = useMemo(() => txs.filter((t) => t.valueSats >= Number(min) * 1e8), [txs, min]);
  const total = shown.reduce((s, t) => s + t.valueSats, 0);
  const largest = shown.reduce<WhaleTx | null>((a, t) => (!a || t.valueSats > a.valueSats ? t : a), null);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={`Txs ≥ ${min} BTC`} value={shown.length.toLocaleString()} sub={scope} />
        <Stat label="Total output" value={`${btc(total)} BTC`} sub={price != null ? compactUsd((total / 1e8) * price) : "USD unavailable"} />
        <Stat label="Largest" value={largest ? `${btc(largest.valueSats)} BTC` : "—"} sub={largest && price != null ? usd((largest.valueSats / 1e8) * price) : undefined} />
      </div>

      <Card
        title="Large transactions"
        action={<Segmented label="Minimum size" value={min} onChange={setMin} options={WHALE_THRESHOLDS_BTC.map((b) => ({ id: String(b), label: `≥ ${b.toLocaleString()}` }))} />}
      >
        {missing.length > 0 && (
          <p className="mb-3 text-xs text-warn">Couldn&apos;t load block {missing.join(", ")} — its transactions are missing from this list.</p>
        )}
        {shown.length === 0 ? (
          <p className="text-sm text-muted">No transactions of {min}+ BTC in this window. Try a lower threshold.</p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((t) => (
              <li key={t.txid} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                <div className="min-w-0">
                  <div className="num font-semibold">
                    {btc(t.valueSats)} BTC
                    {price != null && <span className="ml-2 font-normal text-muted">{usd((t.valueSats / 1e8) * price)}</span>}
                  </div>
                  <a
                    href={`https://mempool.space/tx/${t.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="num block truncate text-xs text-faint hover:text-accent"
                    title={t.txid}
                  >
                    {t.txid.slice(0, 12)}…{t.txid.slice(-8)} ↗
                  </a>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="num">fee {t.feeSats.toLocaleString()} sats</span>
                  {t.blockHeight != null ? (
                    <span className="num">#{t.blockHeight.toLocaleString()} · <LocalTime iso={new Date(t.time * 1000).toISOString()} /></span>
                  ) : (
                    <Badge tone="accent">Unconfirmed</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <SourceLine source="mempool.space" fetchedAt={fetchedAt} extra="value = total outputs incl. change" />
        <SourceLine source="USD at Coinbase spot" fetchedAt={priceFetchedAt} />
      </Card>
    </div>
  );
}
