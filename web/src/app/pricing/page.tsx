import type { Metadata } from "next";
import Link from "next/link";
import { LightningCheckout } from "@/components/lightning-checkout";
import { TIERS, type TierId } from "@/lib/pay/tiers";
import { TOOLS } from "@/lib/site/registry";

export const metadata: Metadata = { title: "Pricing", description: "Pay with Lightning. No account, no card, no subscription." };

export default function PricingPage() {
  const pro = TOOLS.filter((t) => t.tier === "premium");
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Pay with Lightning. That&apos;s it.</h1>
        <p className="mt-4 text-lg text-muted">
          No account, no card, no auto-renew. Buy a pass, get a recovery code, use Pro until it expires. Sign in with a
          passkey if you&apos;d like your pass tied to an account instead.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.entries(TIERS) as [TierId, (typeof TIERS)[TierId]][]).map(([id, t]) => {
          const featured = id === "month";
          return (
            <div key={id} className={`card flex flex-col p-5 ${featured ? "border-accent/50" : ""}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{t.label}</h2>
                {featured && <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">Best value</span>}
              </div>
              <div className="num mt-4 text-3xl font-semibold">{t.sats.toLocaleString()}</div>
              <div className="text-sm text-faint">sats</div>
              <p className="mt-3 flex-1 text-sm text-muted">{t.blurb}</p>
              <div className="mt-5"><LightningCheckout tier={id} label={t.label} sats={t.sats} featured={featured} /></div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-medium">What Pro includes</h2>
          <ul className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-muted sm:grid-cols-2">
            {pro.map((t) => <li key={t.slug}>· {t.name}</li>)}
            <li>· Full signal history and analysis</li>
          </ul>
        </div>
        <div className="space-y-3 text-sm text-muted">
          <h2 className="font-medium text-fg">Good to know</h2>
          <p>Free forever: live market data, the trading agent and its full log, Smart Chart, calculators, and the learn guides.</p>
          <p>Lost your pass? <Link href="/recover" className="text-accent">Restore it with your recovery code</Link>.</p>
          <p>Buying again before a pass ends adds the time on top. You never lose days by renewing early.</p>
        </div>
      </div>
    </div>
  );
}
