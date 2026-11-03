import type { Metadata } from "next";
import { Disclaimer, Page, PageHeader } from "@/components/ui";
import { ProGate } from "@/components/pro-gate";
import { RISK } from "@/lib/agent/risk";
import { Backtester } from "./backtester";

export const metadata: Metadata = {
  title: "Backtester Pro",
  description: "Describe a Bitcoin strategy in plain English, confirm the exact rules, and backtest them on real Coinbase candles with fees, slippage and Monte Carlo ranges.",
};

export default function BacktesterProPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Strategy · Pro"
        title="Backtester Pro"
        lede="Describe a strategy in plain English. Claude turns it into exact rules you can read and edit, then a deterministic engine tests them on real Coinbase candles with realistic fees, slippage and no look-ahead."
      />
      <div className="mt-8">
        <ProGate feature="Backtester Pro">
          <Backtester defaultFees={{ makerPct: RISK.makerFee * 100, takerPct: RISK.takerFee * 100, slippagePct: RISK.slippage * 100 }} />
        </ProGate>
      </div>
      <Disclaimer>
        Backtests describe the past, not the future. Results ignore funding for shorts, taxes and order-book depth; one position at a time, no leverage.
        A strategy you tuned by looking at this chart will look better here than it trades. Not financial advice.
      </Disclaimer>
    </Page>
  );
}
