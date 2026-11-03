import type { Metadata } from "next";
import { Disclaimer, Page, PageHeader } from "@/components/ui";
import { ProGate } from "@/components/pro-gate";
import { AI_DISCLAIMER } from "@/components/tool-form";
import { RISK } from "@/lib/agent/risk";
import { CoachForm } from "./coach-form";

export const metadata: Metadata = {
  title: "Trade Coach",
  description: "Get a planned Bitcoin trade checked before you take it: computed R:R, ATR stop distance, levels, fees, then an AI critique.",
};

export default function TradeCoachPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="AI · Pro"
        title="Trade Coach"
        lede="Describe the trade you're planning. We compute the hard numbers first (reward:risk, stop distance in ATR, nearby levels, Coinbase fees, funding and sentiment), then Claude critiques the plan."
      />
      <div className="mt-8">
        <ProGate feature="Trade Coach">
          <CoachForm takerPct={RISK.takerFee * 100} makerPct={RISK.makerFee * 100} />
        </ProGate>
      </div>
      <Disclaimer>{AI_DISCLAIMER} Fees use Coinbase Advanced&apos;s entry tier ({(RISK.makerFee * 100).toFixed(2)}% maker / {(RISK.takerFee * 100).toFixed(2)}% taker) plus {(RISK.slippage * 100).toFixed(2)}% slippage on market fills; check your own tier.</Disclaimer>
    </Page>
  );
}
