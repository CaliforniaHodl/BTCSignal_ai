import type { Metadata } from "next";
import { ChartWorkbench } from "@/components/chart/workbench";
import { ProGate } from "@/components/pro-gate";
import { Disclaimer, Page, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Smart Chart Pro",
  description: "Bitcoin chart workbench: 19 indicators across stacked panes, horizontal and trendline drawing, PNG export.",
};

export default function SmartChartProPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Charts · Pro"
        title="Smart Chart Pro"
        lede="Everything in Smart Chart plus Keltner, Donchian, ATR, Stochastic, OBV, ADX, CCI, MFI and Williams %R in stacked panes, drawing tools that persist in this browser, and PNG export."
      />
      <div className="mt-8">
        <ProGate feature="Smart Chart Pro">
          <ChartWorkbench pro />
          <p className="mt-4 text-xs text-faint">
            Drawings are stored per timeframe in this browser&apos;s local storage; they are not uploaded and won&apos;t follow you to another device.
            Exported PNGs include every visible pane.
          </p>
        </ProGate>
      </div>
      <Disclaimer />
    </Page>
  );
}
