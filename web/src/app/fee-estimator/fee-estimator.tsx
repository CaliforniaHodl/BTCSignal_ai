"use client";

import { useEffect, useState } from "react";
import { Card, SourceLine, Unavailable } from "@/components/ui";
import { Field, inputCls } from "@/components/form";
import { feeCost, SCRIPT_TYPES, txVbytes, type ScriptType } from "@/lib/calc/tx-size";
import { usd } from "@/lib/format";
import type { Datum, Fees, SpotStats } from "@/lib/market/types";
import type { MempoolState } from "@/lib/onchain/mempool";

type Feed = { fees: Datum<Fees>; spot: Datum<SpotStats>; mempool: Datum<MempoolState> };

const REFRESH_MS = 30_000;
const TIERS: { key: keyof Fees; label: string; eta: string }[] = [
  { key: "fastest", label: "Next block", eta: "~10 min" },
  { key: "halfHour", label: "Half hour", eta: "~3 blocks" },
  { key: "hour", label: "One hour", eta: "~6 blocks" },
  { key: "economy", label: "Economy", eta: "no rush" },
];

/** sat/vB — sub-1 rates are common now, so keep decimals when small. */
const rate = (r: number) => (r < 10 ? r.toFixed(2).replace(/\.?0+$/, "") || "0" : r.toFixed(0));
const usdSmall = (n: number) => (n < 1 ? usd(n, 3) : usd(n, 2));

export function FeeEstimator({ initial }: { initial: Feed }) {
  const [feed, setFeed] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [inputs, setInputs] = useState("1");
  const [outputs, setOutputs] = useState("2");
  const [inType, setInType] = useState<ScriptType>("p2wpkh");
  const [outType, setOutType] = useState<ScriptType>("p2wpkh");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/v1/mempool", { cache: "no-store" });
        if (r.ok && alive) setFeed((await r.json()) as Feed);
      } catch {
        /* keep last good feed; its age line shows staleness */
      }
    };
    const poll = setInterval(load, REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  const nIn = Math.trunc(Number(inputs));
  const nOut = Math.trunc(Number(outputs));
  const valid = nIn >= 1 && nIn <= 5000 && nOut >= 1 && nOut <= 5000;
  const vbytes = valid ? txVbytes({ inputs: nIn, inputType: inType, outputs: nOut, outputType: outType }) : null;
  const price = feed.spot.ok ? feed.spot.value.price : null;
  const { fees, mempool } = feed;

  return (
    <div className="mt-10 space-y-6">
      <Card title="Recommended fee rates">
        {fees.ok ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {TIERS.map((t) => {
              const r = fees.value[t.key];
              const c = vbytes != null ? feeCost(vbytes, r, price) : null;
              return (
                <div key={t.key} className="rounded-lg border border-line bg-sunken p-4">
                  <div className="text-xs uppercase tracking-wider text-faint">{t.label}</div>
                  <div className="num mt-2 text-2xl font-semibold">
                    {rate(r)} <span className="text-sm font-normal text-muted">sat/vB</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{t.eta}</div>
                  {c && (
                    <div className="num mt-3 text-sm">
                      {c.sats.toLocaleString()} sats
                      {c.usd != null && <span className="text-muted"> · {usdSmall(c.usd)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Unavailable source={fees.source} error={fees.error} />
        )}
        <SourceLine source={fees.source} fetchedAt={fees.fetchedAt} now={now} extra={price != null ? `USD at Coinbase spot ${usd(price)}` : "USD price unavailable"} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Transaction size" className="lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Inputs" htmlFor="fe-in" hint="Coins (UTXOs) you're spending">
              <input id="fe-in" type="number" min={1} max={5000} inputMode="numeric" value={inputs} onChange={(e) => setInputs(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Input type" htmlFor="fe-in-type">
              <select id="fe-in-type" value={inType} onChange={(e) => setInType(e.target.value as ScriptType)} className={inputCls}>
                {SCRIPT_TYPES.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.hint}</option>)}
              </select>
            </Field>
            <Field label="Outputs" htmlFor="fe-out" hint="Recipients + change">
              <input id="fe-out" type="number" min={1} max={5000} inputMode="numeric" value={outputs} onChange={(e) => setOutputs(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Output type" htmlFor="fe-out-type">
              <select id="fe-out-type" value={outType} onChange={(e) => setOutType(e.target.value as ScriptType)} className={inputCls}>
                {SCRIPT_TYPES.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.hint}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-5 rounded-lg border border-line bg-sunken p-4">
            {vbytes != null ? (
              <>
                <div className="text-xs uppercase tracking-wider text-faint">Estimated size</div>
                <div className="num mt-1 text-2xl font-semibold">{vbytes.toLocaleString()} vB</div>
                {fees.ok && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="num w-full text-sm">
                      <tbody>
                        {TIERS.map((t) => {
                          const c = feeCost(vbytes, fees.value[t.key], price);
                          return (
                            <tr key={t.key} className="border-t border-line">
                              <td className="py-1.5 pr-3 font-sans text-muted">{t.label}</td>
                              <td className="py-1.5 pr-3 text-right">{c.sats.toLocaleString()} sats</td>
                              <td className="py-1.5 text-right text-muted">{c.usd != null ? usdSmall(c.usd) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-down">Enter 1–5,000 inputs and outputs.</p>
            )}
          </div>
          <p className="mt-3 text-xs text-faint">
            Computed in weight units (vsize = ⌈weight ÷ 4⌉) assuming 72-byte ECDSA / 64-byte Schnorr signatures, so it errs a byte or two high per input.
          </p>
        </Card>

        <Card title="Mempool backlog" className="lg:col-span-2">
          {mempool.ok ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Unconfirmed txs" value={mempool.value.count.toLocaleString()} />
                <MiniStat label="Size" value={`${(mempool.value.vsize / 1e6).toFixed(1)} vMB`} />
                <MiniStat label="≈ Blocks to clear" value={(mempool.value.vsize / 1e6).toFixed(1)} sub="at 1 MvB per block" />
                <MiniStat label="Fees waiting" value={`${(mempool.value.totalFeeSats / 1e8).toFixed(3)} BTC`} sub={price != null ? usd((mempool.value.totalFeeSats / 1e8) * price) : undefined} />
              </div>
              <h3 className="mt-5 text-xs uppercase tracking-wider text-faint">Projected next blocks</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="num w-full text-sm">
                  <thead className="text-left text-xs text-faint">
                    <tr>
                      <th className="py-1 pr-2 font-normal">Block</th>
                      <th className="py-1 pr-2 text-right font-normal">Median</th>
                      <th className="py-1 pr-2 text-right font-normal">Range</th>
                      <th className="py-1 text-right font-normal">Txs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mempool.value.projected.slice(0, 8).map((b, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="py-1.5 pr-2 text-muted">{b.vsize > 1_000_000 ? `+${i + 1}…` : `+${i + 1}`}</td>
                        <td className="py-1.5 pr-2 text-right">{rate(b.medianFee)}</td>
                        <td className="py-1.5 pr-2 text-right text-muted">{rate(b.minFee)}–{rate(b.maxFee)}</td>
                        <td className="py-1.5 text-right text-muted">{b.nTx.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-faint">sat/vB. How mempool.space would fill the next blocks from today&apos;s mempool; a row marked … is everything after it, lumped together.</p>
            </>
          ) : (
            <Unavailable source={mempool.source} error={mempool.error} />
          )}
          <SourceLine source={mempool.source} fetchedAt={mempool.fetchedAt} now={now} extra="refreshes every 30s" />
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-sunken p-3">
      <div className="text-[11px] uppercase tracking-wider text-faint">{label}</div>
      <div className="num mt-1 font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
