import type { Metadata } from "next";
import { CONTACT_X, LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description: "BTCSignal.ai's accessibility goals, known limitations, and how to report a barrier.",
  alternates: { canonical: "/accessibility-statement" },
  openGraph: { title: "Accessibility Statement · BTCSignal.ai", description: "Accessibility goals and known gaps.", url: "/accessibility-statement", type: "article" },
};

// NOTE FOR THE OWNER: the legacy statement claimed WCAG 2.0 AA conformance and that the site "exceeds" ADA
// requirements, with no audit behind it. Those claims were removed. See the porting report.
export default function AccessibilityStatementPage() {
  return (
    <LegalPage title="Accessibility Statement"
      summary={<>Having trouble using something on this site? Tell us on <a href={CONTACT_X} rel="noopener noreferrer" target="_blank" className="text-accent underline">X (@BTCSignal_ai)</a> and we&apos;ll help, and fix it if we can.</>}>
      <h2>Our commitment</h2>
      <p>We want everyone, including people with disabilities, to be able to use BTCSignal.ai and its data.</p>

      <h2>What we aim for</h2>
      <p>We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. We haven&apos;t had an independent audit yet, so we don&apos;t claim full conformance.</p>

      <h2>What we do</h2>
      <ul>
        <li>Semantic HTML: real headings, lists, tables and buttons, so assistive technology can navigate</li>
        <li>Text-based data: every key number is shown as text, not only in a chart</li>
        <li>Layouts that work from 375px wide upward and with browser zoom</li>
        <li>No auto-playing media or pop-ups; animation is reduced when your system asks for reduced motion</li>
        <li>Visible keyboard focus and descriptive link text</li>
      </ul>

      <h2>Known limitations</h2>
      <ul>
        <li>Interactive price and equity charts are hard to use with a screen reader. The same data is available in nearby tables and figures.</li>
        <li>Some wide data tables scroll sideways on small screens.</li>
        <li>Archived posts from the retired v1 engine are reproduced as originally written and may contain emoji and dense tables.</li>
      </ul>

      <h2>Feedback</h2>
      <p>If you hit a barrier, or have ideas for improvement, contact us on <a href={CONTACT_X} rel="noopener noreferrer" target="_blank">X at @BTCSignal_ai</a>. Please tell us the page and what went wrong.</p>

      <h2>Resources</h2>
      <ul>
        <li><a href="https://www.w3.org/WAI/standards-guidelines/wcag/" rel="noopener noreferrer" target="_blank">W3C: WCAG overview</a></li>
        <li><a href="https://www.ada.gov/" rel="noopener noreferrer" target="_blank">ADA.gov</a></li>
        <li><a href="https://www.section508.gov/" rel="noopener noreferrer" target="_blank">Section508.gov</a></li>
      </ul>
    </LegalPage>
  );
}
