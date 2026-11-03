"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import clsx from "clsx";

type Inv = { paymentHash: string; bolt11: string; sats: number; expiresAt: string; mock?: boolean };
type Phase =
  | { k: "idle" }
  | { k: "creating" }
  | { k: "invoice"; inv: Inv; qr: string }
  | { k: "paid"; code?: string; expiresAt?: string }
  | { k: "expired" }
  | { k: "error"; msg: string };

export function LightningCheckout({ tier, label, sats, featured }: { tier: string; label: string; sats: number; featured?: boolean }) {
  const [phase, setPhase] = useState<Phase>({ k: "idle" });
  const [copied, setCopied] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  async function start() {
    setPhase({ k: "creating" });
    try {
      const r = await fetch("/api/pay/invoice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier }) });
      const j = await r.json();
      if (!r.ok) return setPhase({ k: "error", msg: j.error ?? "Couldn't create an invoice." });
      const inv = j as Inv;
      const qr = await QRCode.toDataURL(`lightning:${inv.bolt11}`, { margin: 1, width: 260, color: { dark: "#000000", light: "#ffffff" } });
      setPhase({ k: "invoice", inv, qr });
      const deadline = new Date(inv.expiresAt).getTime() + 60_000;
      poll.current = setInterval(async () => {
        if (Date.now() > deadline) { clearInterval(poll.current!); return setPhase({ k: "expired" }); }
        try {
          const s = await (await fetch(`/api/pay/status?hash=${inv.paymentHash}`, { cache: "no-store" })).json();
          if (s.status === "paid" && !s.awaitingClaim) { clearInterval(poll.current!); setPhase({ k: "paid", code: s.recoveryCode, expiresAt: s.expiresAt }); }
          else if (s.status === "expired") { clearInterval(poll.current!); setPhase({ k: "expired" }); }
        } catch { /* transient; keep polling */ }
      }, 2500);
    } catch {
      setPhase({ k: "error", msg: "Network error. Try again." });
    }
  }

  const close = () => { if (poll.current) clearInterval(poll.current); setPhase({ k: "idle" }); setCopied(false); };
  const copy = async (t: string) => { await navigator.clipboard.writeText(t); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <>
      <button
        onClick={start}
        disabled={phase.k === "creating"}
        className={clsx("w-full rounded-lg px-4 py-2.5 font-medium transition disabled:opacity-60", featured ? "bg-accent text-black hover:brightness-110" : "border border-line-strong hover:bg-bg")}
      >
        {phase.k === "creating" ? "Creating invoice…" : `Pay ${sats.toLocaleString()} sats`}
      </button>
      {phase.k !== "idle" && phase.k !== "creating" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`${label} checkout`}>
          <div className="card w-full max-w-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{label}</h3>
              <button onClick={close} className="text-sm text-muted hover:text-fg">Close</button>
            </div>

            {phase.k === "invoice" && (
              <div className="mt-4 space-y-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={phase.qr} alt="Lightning invoice QR code" className="mx-auto rounded-lg" width={260} height={260} />
                <div className="num text-lg">{phase.inv.sats.toLocaleString()} sats</div>
                <div className="flex gap-2">
                  <a href={`lightning:${phase.inv.bolt11}`} className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-black">Open wallet</a>
                  <button onClick={() => copy(phase.inv.bolt11)} className="flex-1 rounded-lg border border-line-strong px-3 py-2 text-sm">{copied ? "Copied" : "Copy invoice"}</button>
                </div>
                <p className="flex items-center justify-center gap-2 text-xs text-muted">
                  <span className="live-dot size-1.5 rounded-full bg-warn" /> Waiting for payment…
                  {phase.inv.mock && <span className="text-warn">(dev mock: auto-pays in ~8s)</span>}
                </p>
              </div>
            )}

            {phase.k === "paid" && (
              <div className="mt-4 space-y-4">
                <p className="text-up">Paid. Pro is unlocked in this browser.</p>
                {phase.code ? (
                  <>
                    <p className="text-sm text-muted">Save this recovery code. It&apos;s the only way to restore your pass on another device or after clearing cookies. We can&apos;t show it again.</p>
                    <div className="num rounded-lg border border-accent/40 bg-accent-soft p-3 text-center text-accent">{phase.code}</div>
                    <button onClick={() => copy(phase.code!)} className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm">{copied ? "Copied" : "Copy code"}</button>
                  </>
                ) : (
                  <p className="text-sm text-muted">This pass is attached to your account.</p>
                )}
                <a href="/dashboard" className="block w-full rounded-lg bg-accent px-3 py-2 text-center font-medium text-black">Go to the Pro dashboard</a>
              </div>
            )}

            {phase.k === "expired" && <p className="mt-4 text-muted">The invoice expired before payment arrived. No sats were taken. <button onClick={start} className="text-accent">Try again</button>.</p>}
            {phase.k === "error" && <p className="mt-4 text-down">{phase.msg}</p>}
          </div>
        </div>
      )}
    </>
  );
}
