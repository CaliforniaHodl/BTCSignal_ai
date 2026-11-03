import type { Metadata } from "next";
import { Disclaimer, Page, PageHeader } from "@/components/ui";
import { ProGate } from "@/components/pro-gate";
import { AI_DISCLAIMER } from "@/components/tool-form";
import { GraderForm } from "./grader-form";

export const metadata: Metadata = {
  title: "Setup Grader",
  description: "Upload a Bitcoin chart screenshot and get the setup graded on trend, levels, pattern, reward:risk and timing.",
};

export default function SetupGraderPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="AI · Pro"
        title="Setup Grader"
        lede="Upload a chart screenshot of a setup you're considering. Claude scores trend clarity, key levels, pattern quality, reward:risk and entry timing out of 20 each and tells you whether to enter, wait or skip."
      />
      <div className="mt-8">
        <ProGate feature="Setup Grader">
          <GraderForm />
        </ProGate>
      </div>
      <Disclaimer>{AI_DISCLAIMER} Levels are read from pixels and are approximate. Images are sent to Anthropic for analysis and are not stored by us.</Disclaimer>
    </Page>
  );
}
