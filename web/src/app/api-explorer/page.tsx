import type { Metadata } from "next";
import Link from "next/link";
import { Page, PageHeader } from "@/components/ui";
import { ENDPOINTS } from "@/lib/api/catalog";
import { Explorer } from "./explorer";

export const metadata: Metadata = { title: "API explorer", description: "Call the BTCSignal.ai public API from your browser and inspect the live JSON." };

export default function ApiExplorerPage() {
  return (
    <Page>
      <PageHeader eyebrow="Developers" title="API explorer" lede="Pick an endpoint, set parameters, and send a real request. What you see is exactly what your code will get.">
        <p className="mt-3 text-sm"><Link href="/api-docs" className="text-accent hover:underline">← Read the docs</Link></p>
      </PageHeader>
      <div className="mt-8">
        <Explorer endpoints={ENDPOINTS} />
      </div>
    </Page>
  );
}
