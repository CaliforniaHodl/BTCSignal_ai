import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <div className="num text-sm text-accent">404 · rebuilding</div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">This page isn&apos;t on the new site yet</h1>
      <p className="mt-3 text-muted">
        We&apos;re rebuilding BTCSignal.ai page by page. If this existed on the old site, it&apos;s on the list.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className="rounded-lg bg-accent px-4 py-2.5 font-medium text-black">Markets</Link>
        <Link href="/tools" className="rounded-lg border border-line-strong px-4 py-2.5 font-medium">All tools</Link>
      </div>
    </div>
  );
}
