import type { Metadata } from "next";
import { Disclaimer, Page, PageHeader } from "@/components/ui";
import { ProGate } from "@/components/pro-gate";
import { Simulator } from "./simulator";

export const metadata: Metadata = {
  title: "Portfolio Simulator",
  description: "Compare buy & hold, DCA, a moving-average trend filter and BTC/cash rebalancing over real Bitcoin history, with Monte Carlo ranges.",
};

export default function PortfolioSimulatorPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Strategy · Pro"
        title="Portfolio Simulator"
        lede="Compare simple Bitcoin allocation strategies over real Coinbase daily history, with fees on every trade and Monte Carlo ranges from resampled history."
      />
      <div className="mt-8">
        <ProGate feature="Portfolio Simulator">
          <Simulator />
        </ProGate>
      </div>
      <Disclaimer>
        Past performance does not predict future results. Monte Carlo ranges reshuffle blocks of the same history; they can&apos;t show regimes Bitcoin hasn&apos;t had yet. Not financial advice.
      </Disclaimer>
    </Page>
  );
}
