import { permanentRedirect } from "next/navigation";

/** Legacy demo page; the Smart Chart replaces it. 308 → /smart-chart. */
export default function ChartDemo() {
  permanentRedirect("/smart-chart");
}
