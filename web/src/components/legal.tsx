import Link from "next/link";
import { Prose } from "@/components/prose";
import { Page } from "@/components/ui";

/**
 * Date the legal text last changed. Update by hand when the text changes;
 * never derive it from the build time (the legacy site did, which was misleading).
 */
export const LEGAL_UPDATED = "November 3, 2026";
export const CONTACT_X = "https://x.com/BTCSignal_ai";

export const POLICIES = [
  ["/terms-of-use", "Terms of Use", "The agreement for using the site, passes and payments."],
  ["/privacy-policy", "Privacy Policy", "Exactly what we store, where, and for how long."],
  ["/accessibility-statement", "Accessibility Statement", "What we aim for, known gaps, and how to reach us."],
] as const;

export function LegalPage({ title, summary, children }: { title: string; summary?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Page narrow>
      <Link href="/terms" className="text-sm text-muted hover:text-fg">← Policies</Link>
      <p className="mt-6 text-xs uppercase tracking-wider text-accent">Policies</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-faint">Last updated {LEGAL_UPDATED}</p>
      {summary && <div className="mt-6 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm text-fg">{summary}</div>}
      <Prose className="mt-10">{children}</Prose>
    </Page>
  );
}
