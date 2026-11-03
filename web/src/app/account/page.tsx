import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { authConfigured } from "@/lib/auth/oidc";
import { getSessionUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/pay/access";
import { TIERS } from "@/lib/pay/tiers";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
      <Suspense fallback={<div className="card mt-8 h-40 animate-pulse" />}>
        <Body searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Body({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const [user, access] = await Promise.all([getSessionUser(), getAccess()]);
  return (
    <div className="mt-8 space-y-4">
      {error && <p className="card border-down/40 p-4 text-down">{error}</p>}
      <div className="card p-5">
        <h2 className="font-medium">Pro access</h2>
        {access ? (
          <p className="mt-2 text-muted">
            <span className="text-up">Active</span> · {TIERS[access.tier]?.label ?? access.tier} until {access.expiresAt.toUTCString().slice(0, 16)}
            {access.via === "pass" ? " · held by this browser" : " · on your account"}
          </p>
        ) : (
          <p className="mt-2 text-muted">No active pass. <Link href="/pricing" className="text-accent">Get one</Link> or <Link href="/recover" className="text-accent">restore with a code</Link>.</p>
        )}
      </div>
      <div className="card p-5">
        <h2 className="font-medium">Sign-in</h2>
        {user ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted">Signed in{user.email ? ` as ${user.email}` : ""} with a passkey.{user.isOwner && <span className="text-accent"> Owner.</span>}</p>
            <div className="flex gap-2">
              {user.isOwner && <Link href="/owner" className="rounded-lg border border-line-strong px-3 py-1.5 text-sm">Owner console</Link>}
              <form action="/api/auth/logout" method="post"><button className="rounded-lg border border-line-strong px-3 py-1.5 text-sm">Sign out</button></form>
            </div>
          </div>
        ) : authConfigured() ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted">Optional. Signing in ties passes to a passkey instead of a code.</p>
            <a href="/api/auth/login?next=/account" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-black">Sign in with passkey</a>
          </div>
        ) : (
          <p className="mt-2 text-muted">Passkey sign-in isn&apos;t configured on this deployment.</p>
        )}
      </div>
    </div>
  );
}
