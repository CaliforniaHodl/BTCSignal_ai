import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_X, LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "BTCSignal.ai terms of use: an information service, not financial advice. Lightning passes, acceptable use, and liability.",
  alternates: { canonical: "/terms-of-use" },
  openGraph: { title: "Terms of Use · BTCSignal.ai", description: "Terms of use for BTCSignal.ai.", url: "/terms-of-use", type: "article" },
};

// NOTE FOR THE OWNER: legal text. Review before launch. See the porting report for what changed vs the legacy site.
export default function TermsOfUsePage() {
  return (
    <LegalPage title="Terms of Use"
      summary={<><strong>The important part:</strong> BTCSignal.ai is an information service only. We don&apos;t give financial advice, we don&apos;t trade for you, and we don&apos;t guarantee any result. The trading agent shown on this site uses a paper (simulated) account. Trading Bitcoin is risky and you can lose money. You are responsible for your own decisions.</>}>
      <h2>1. Acceptance of terms</h2>
      <p>By accessing or using BTCSignal.ai (also operating as &quot;BTC Signals Pro&quot;; the &quot;Service&quot;), you agree to these Terms of Use. If you don&apos;t agree, don&apos;t use the Service. You must be at least 18 years old to use the Service.</p>

      <h2>2. What the Service provides</h2>
      <ul>
        <li>Bitcoin market, derivatives and on-chain data gathered from third-party public sources</li>
        <li>Signals produced by an automated, rules-based engine, and their recorded outcomes</li>
        <li>A publicly logged trading agent that trades a <strong>paper (simulated) account</strong>. No real funds are traded</li>
        <li>Analysis tools, some of which use AI models (including Anthropic&apos;s Claude) to generate text</li>
        <li>Educational guides and an archive of posts from a retired earlier version of the Service</li>
      </ul>

      <h2>3. What we are not</h2>
      <ul>
        <li><strong>Not financial advisers.</strong> Nothing on the Service is financial, investment, tax or trading advice, or a recommendation to buy, sell or hold any asset. Nothing is tailored to your circumstances.</li>
        <li><strong>Not a broker, exchange or custodian.</strong> We don&apos;t execute trades for you, hold your funds, or access your exchange accounts or wallets.</li>
        <li><strong>Not guaranteeing results.</strong> Backtests, paper-trading results and past signals don&apos;t predict future results. Our own published research shows the current strategy has not passed its out-of-sample test.</li>
      </ul>

      <h2>4. Risk disclosure</h2>
      <p>Trading cryptocurrency involves substantial risk of loss. Prices are highly volatile and markets run 24/7. Only trade money you can afford to lose entirely. By using the Service you acknowledge that you understand these risks, that you are solely responsible for your trading decisions, and that our signals are at most one input among many.</p>

      <h2>5. Data, automated output and AI-generated content</h2>
      <p>Market data comes from third parties and may be delayed, incomplete or wrong. When a source fails we show it as unavailable rather than estimate it, but we can&apos;t guarantee the accuracy, completeness or timeliness of any data. Signals are produced automatically, and AI-generated text (such as trade reviews or chart analysis) can be mistaken. Don&apos;t rely on any of it as the sole basis for a decision.</p>

      <h2>6. Passes and payment</h2>
      <ul>
        <li>Premium features are sold as <strong>time-limited passes</strong> paid over the Bitcoin Lightning Network. Current prices are on the <Link href="/pricing">pricing page</Link>.</li>
        <li>Passes are <strong>not subscriptions</strong>. They never renew automatically. Buying a pass while one is active extends it.</li>
        <li>After payment you receive a recovery code. <strong>You are responsible for keeping it safe.</strong> We store only a one-way hash of it, so we can&apos;t show it again or recover a pass without it, unless you bought it while signed in to an account.</li>
        <li>Anyone with your recovery code can move your pass to their browser. Restoring a pass with the code signs out other browsers using it.</li>
        <li><strong>Refunds:</strong> Lightning payments are final and access is delivered immediately, so passes are generally non-refundable. This doesn&apos;t limit any rights you have under laws that can&apos;t be waived. If a technical fault on our side prevented access, contact us and we&apos;ll put it right.</li>
        <li>We may change prices for future purchases. Changes don&apos;t affect passes you already hold.</li>
      </ul>

      <h2>7. Accounts</h2>
      <p>An account is optional. If you sign in (with a passkey through our sign-in provider), passes you buy while signed in are tied to that account. Keep your devices and passkeys secure; you are responsible for activity under your account.</p>

      <h2>8. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Resell, redistribute or share premium content or access, including sharing recovery codes</li>
        <li>Scrape or bulk-download the Service, or put unreasonable load on it</li>
        <li>Try to get around payment or access controls, or probe the Service for vulnerabilities without permission</li>
        <li>Use the Service for anything illegal, or to mislead others (for example, passing off our signals as your own audited track record)</li>
        <li>Interfere with the Service or other people&apos;s use of it</li>
      </ul>

      <h2>9. Intellectual property</h2>
      <p>The Service&apos;s text, analysis, graphics, logos and software belong to us or our licensors. You may share links and short quotes with attribution. Otherwise, don&apos;t reproduce, distribute or create derivative works without permission. Third-party names and marks belong to their owners.</p>

      <h2>10. Third-party sites and services</h2>
      <p>The Service links to and relies on third-party services (data providers, Lightning infrastructure, our sign-in provider, AI providers). We don&apos;t control them and aren&apos;t responsible for their content, availability or practices.</p>

      <h2>11. No warranties</h2>
      <p>The Service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, accuracy and non-infringement, to the maximum extent permitted by law. We don&apos;t promise the Service will be uninterrupted, error-free or available at any particular time.</p>

      <h2>12. Limitation of liability</h2>
      <p>To the maximum extent permitted by law:</p>
      <ul>
        <li>We aren&apos;t liable for any trading or investment losses, or for decisions made using the Service</li>
        <li>We aren&apos;t liable for indirect, incidental, special, consequential or punitive damages, or lost profits or data</li>
        <li>Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim</li>
      </ul>
      <p>Some jurisdictions don&apos;t allow some of these limits, so they may not all apply to you.</p>

      <h2>13. Indemnification</h2>
      <p>You agree to indemnify and hold harmless the operators of the Service from claims, damages and expenses arising from your use of the Service or your breach of these terms.</p>

      <h2>14. Changes and termination</h2>
      <p>We may change or discontinue any part of the Service, and update these terms. Material changes will be posted here with a new date. We may suspend or end access for anyone who breaches these terms.</p>

      <h2>15. Governing law</h2>
      <p>These terms are governed by the laws applicable where the Service&apos;s operator is established. We&apos;ll try to resolve any dispute informally and in good faith first.</p>

      <h2>16. Severability and entire agreement</h2>
      <p>If any part of these terms is unenforceable, the rest stays in effect. These terms, together with the <Link href="/privacy-policy">Privacy Policy</Link>, are the whole agreement between you and us about the Service.</p>

      <h2>17. Contact</h2>
      <p>Questions about these terms: <a href={CONTACT_X} rel="noopener noreferrer" target="_blank">@BTCSignal_ai on X</a>.</p>
    </LegalPage>
  );
}
