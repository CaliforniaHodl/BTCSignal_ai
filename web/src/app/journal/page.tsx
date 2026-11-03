import type { Metadata } from "next";
import { Disclaimer, Page, PageHeader } from "@/components/ui";
import { JournalApp } from "./journal-app";

export const metadata: Metadata = {
  title: "Trade Journal",
  description: "Log your Bitcoin trades and review your edge: P&L, R-multiples, win rate, expectancy and tags. Stored in your browser; CSV import and export.",
};

export default function JournalPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Tracking · Free"
        title="Trade Journal"
        lede="Log your trades and see your real edge: net P&L after fees, R-multiples against your planned stop, win rate, expectancy, and which tags make or lose you money."
      />
      <div className="mt-8">
        <JournalApp />
      </div>
      <Disclaimer>Your journal lives in this browser&apos;s local storage. Clearing site data deletes it, so export a CSV regularly.</Disclaimer>
    </Page>
  );
}
