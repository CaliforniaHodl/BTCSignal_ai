import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getAccess } from "@/lib/pay/access";

/**
 * Server-side Pro gate. Premium content is only rendered (and only sent to the
 * browser) when the request has a valid pass. Wrap premium page bodies in this.
 */
export function ProGate({ children, feature }: { children: React.ReactNode; feature: string }) {
  return (
    <Suspense fallback={<div className="card h-64 animate-pulse" />}>
      <Gate feature={feature}>{children}</Gate>
    </Suspense>
  );
}

async function Gate({ children, feature }: { children: React.ReactNode; feature: string }) {
  await connection();
  const access = await getAccess().catch(() => null);
  if (access) return <>{children}</>;
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto grid size-10 place-items-center rounded-full bg-accent-soft text-accent">⚡</div>
      <h2 className="mt-4 text-xl font-semibold">{feature} is a Pro tool</h2>
      <p className="mt-2 text-muted">Unlock every Pro tool with a Lightning pass, from 10,000 sats for a day. No account needed.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/pricing" className="rounded-lg bg-accent px-4 py-2.5 font-medium text-black">See passes</Link>
        <Link href="/recover" className="rounded-lg border border-line-strong px-4 py-2.5 font-medium">I have a code</Link>
      </div>
    </div>
  );
}
