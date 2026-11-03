import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUser } from "@/lib/auth/session";
import { lightning } from "@/lib/pay/lightning";
import { OwnerControls } from "./owner-controls";

export const metadata: Metadata = { title: "Owner", robots: { index: false } };

export default function OwnerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Owner console</h1>
      <Suspense fallback={<div className="card mt-8 h-40 animate-pulse" />}><Body /></Suspense>
    </div>
  );
}

async function Body() {
  await connection();
  const user = await getSessionUser();
  if (!user) return <p className="card mt-8 p-6 text-muted">Sign in to continue. <a href="/api/auth/login?next=/owner" className="text-accent">Sign in with passkey</a></p>;
  if (!user.isOwner) return <p className="card mt-8 p-6 text-muted">This account isn&apos;t an owner.</p>;
  const d = await db();
  const [acct] = await d.select().from(schema.agentAccount).where(eq(schema.agentAccount.id, 1));
  const ln = lightning();
  const checks: [string, boolean, string][] = [
    ["Claude review", Boolean(process.env.ANTHROPIC_API_KEY) && process.env.AGENT_REVIEW !== "rules", process.env.ANTHROPIC_API_KEY ? "ANTHROPIC_API_KEY set" : "set ANTHROPIC_API_KEY"],
    ["Lightning", ln != null && ln.name !== "mock", ln ? (ln.name === "mock" ? "DEV MOCK node" : "LNbits configured") : "set LNBITS_URL + LNBITS_INVOICE_KEY"],
    ["Cron secret", Boolean(process.env.CRON_SECRET), process.env.CRON_SECRET ? "CRON_SECRET set" : "set CRON_SECRET (required in production)"],
    ["Database", Boolean(process.env.DATABASE_URL), process.env.DATABASE_URL ? "Postgres" : "embedded PGlite (dev)"],
    ["Live trading", false, "not built — paper only until the gate passes"],
  ];
  return (
    <div className="mt-8 space-y-4">
      <div className="card p-5">
        <h2 className="font-medium">Agent</h2>
        <p className="mt-2 text-sm text-muted">
          {acct ? (acct.enabled ? "Enabled: opening new paper trades." : `Halted: ${acct.haltedReason ?? "kill switch on"}. Exits still managed.`) : "Not initialised yet."}
        </p>
        <OwnerControls enabled={acct?.enabled ?? true} />
      </div>
      <div className="card p-5">
        <h2 className="font-medium">Configuration</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {checks.map(([k, ok, note]) => (
            <li key={k} className="flex justify-between gap-4"><span>{k}</span><span className={ok ? "text-up" : "text-muted"}>{ok ? "✓ " : "· "}{note}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
