import type { Metadata } from "next";
import { Disclaimer, Page, PageHeader } from "@/components/ui";
import { ProGate } from "@/components/pro-gate";
import { AI_DISCLAIMER } from "@/components/tool-form";
import { AnalyzeForm } from "./analyze-form";

export const metadata: Metadata = {
  title: "Chart Analysis",
  description: "Upload any chart screenshot for an AI read of trend, levels, patterns and indicator readings.",
};

export default function AnalyzePage() {
  return (
    <Page>
      <PageHeader
        eyebrow="AI · Pro"
        title="Chart Analysis"
        lede="Upload a chart screenshot and get a structured read: trend, visible support and resistance, patterns, indicator readings, and what would confirm the bullish or bearish case."
      />
      <div className="mt-8">
        <ProGate feature="Chart Analysis">
          <AnalyzeForm />
        </ProGate>
      </div>
      <Disclaimer>{AI_DISCLAIMER} Prices are read from the image and are approximate. Images are sent to Anthropic for analysis and are not stored by us.</Disclaimer>
    </Page>
  );
}
