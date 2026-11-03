import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, Page, PageHeader } from "@/components/ui";
import { DATUM_SHAPE, ENDPOINTS } from "@/lib/api/catalog";

export const metadata: Metadata = {
  title: "API docs",
  description: "A small, free, stable JSON API for live Bitcoin market data: price, funding, Fear & Greed, key levels, candles and a full snapshot.",
};

const pre = "num mt-2 overflow-x-auto rounded-lg border border-line bg-sunken p-3 text-xs leading-relaxed text-muted";

export default function ApiDocsPage() {
  return (
    <Page narrow>
      <PageHeader eyebrow="Developers" title="Public API" lede="Six read-only JSON endpoints. Free, no key, CORS-enabled, cached at the edge. Every value says where it came from and when.">
        <p className="mt-4 text-sm"><Link href="/api-explorer" className="text-accent hover:underline">Try them live in the API explorer →</Link></p>
      </PageHeader>

      <div className="mt-10 space-y-6">
        <Card title="Conventions">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            <li>Base URL: this site. All endpoints are <code>GET</code>, send <code>Access-Control-Allow-Origin: *</code>, and answer <code>OPTIONS</code> preflights.</li>
            <li>Responses carry <code>Cache-Control: public, max-age=N</code>; polling faster than N seconds returns the same data. Please cache on your side too.</li>
            <li>Times are milliseconds since epoch, except candle <code>time</code> (unix seconds). Funding is a fraction per 8 hours.</li>
            <li>Stability: fields may be added, never renamed or removed, under <code>/api/v1</code>.</li>
            <li>No fabricated values: when a source fails you get <code>ok: false</code> and HTTP 502, never a zero or a guess.</li>
          </ul>
          <pre className={pre}>{DATUM_SHAPE}</pre>
        </Card>

        {ENDPOINTS.map((e) => (
          <Card key={e.path} title={<span className="num">{e.path}</span>} action={<Badge>cache {e.cacheSeconds}s</Badge>}>
            <h3 className="font-medium">{e.title}</h3>
            <p className="mt-1 text-sm text-muted">{e.description}</p>
            <p className="mt-2 text-xs text-faint">Source: {e.source}</p>
            {e.params.length > 0 && (
              <table className="mt-4 w-full text-sm">
                <thead className="text-left text-xs text-faint"><tr><th className="pb-1 font-normal">Param</th><th className="pb-1 font-normal">Default</th><th className="pb-1 font-normal">Description</th></tr></thead>
                <tbody>{e.params.map((p) => <tr key={p.name} className="border-t border-line"><td className="num py-1.5">{p.name}</td><td className="num py-1.5 text-muted">{p.default}</td><td className="py-1.5 text-muted">{p.description}</td></tr>)}</tbody>
              </table>
            )}
            <pre className={pre}>{`curl ${e.path}${e.params.length ? "?" + e.params.map((p) => `${p.name}=${p.default}`).join("&") : ""}`}</pre>
            <pre className={pre}>{e.example}</pre>
          </Card>
        ))}

        <p className="text-xs text-faint">Pro tools use separate, authenticated routes that are not part of this public API. Data from third parties remains subject to their terms; on-chain metrics on the Pro dashboard come from Coin Metrics Community (CC BY-NC 4.0) and are not redistributed here.</p>
      </div>
    </Page>
  );
}
