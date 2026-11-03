import Link from "next/link";
import { NAV } from "@/lib/site/registry";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span className="grid size-7 place-items-center rounded-lg bg-accent text-[15px] font-bold text-black">₿</span>
      <span>
        BTCSignal<span className="text-accent">.ai</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-muted transition hover:bg-raised hover:text-fg">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/pricing" className="hidden rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black transition hover:brightness-110 sm:block">
            Go Pro
          </Link>
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded-md border border-line px-3 py-1.5 text-sm text-muted">Menu</summary>
            <nav className="card absolute right-0 mt-2 flex w-48 flex-col p-2 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-muted hover:bg-bg hover:text-fg">
                  {n.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Logo />
          <p className="max-w-md text-muted">
            Bitcoin market data, signals, and a paper-trading agent that shows its work. Every number on this site
            names its source and age. If a source is down, we say so.
          </p>
        </div>
        <div className="space-y-2">
          <div className="text-faint">Product</div>
          {["agent", "tools", "posts", "pricing"].map((s) => (
            <Link key={s} href={`/${s}`} className="block capitalize text-muted hover:text-fg">{s === "posts" ? "Signals" : s}</Link>
          ))}
        </div>
        <div className="space-y-2">
          <div className="text-faint">Company</div>
          {[["about", "About"], ["how-it-works", "How it works"], ["faq", "FAQ"], ["terms", "Terms"], ["privacy-policy", "Privacy"]].map(([s, l]) => (
            <Link key={s} href={`/${s}`} className="block text-muted hover:text-fg">{l}</Link>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-faint sm:px-6">
          Not financial advice. Signals and agent trades are for information and education; the agent trades a paper
          account. Past performance does not predict future results.
        </p>
      </div>
    </footer>
  );
}
