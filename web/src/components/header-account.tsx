import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/pay/access";

export async function HeaderAccount() {
  await connection();
  const [user, access] = await Promise.all([getSessionUser().catch(() => null), getAccess().catch(() => null)]);
  return (
    <div className="hidden items-center gap-2 sm:flex">
      {access ? (
        <span className="rounded-md bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">PRO</span>
      ) : (
        <Link href="/pricing" className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black transition hover:brightness-110">Go Pro</Link>
      )}
      <Link href="/account" className="rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-raised hover:text-fg">{user ? "Account" : "Sign in"}</Link>
    </div>
  );
}
