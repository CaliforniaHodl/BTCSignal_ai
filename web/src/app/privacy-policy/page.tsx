import type { Metadata } from "next";
import { CONTACT_X, LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Exactly what BTCSignal.ai stores: hashed session and pass tokens, Lightning invoices, optional account details, and on-device preferences. No ads, no third-party trackers.",
  alternates: { canonical: "/privacy-policy" },
  openGraph: { title: "Privacy Policy · BTCSignal.ai", description: "What we store, and what we don't.", url: "/privacy-policy", type: "article" },
};

// NOTE FOR THE OWNER: legal text describing actual data handling. Re-check it whenever storage changes
// (src/db/schema*.ts, cookies, localStorage keys). See the porting report.
export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy"
      summary={<><strong>The short version:</strong> you can use the whole site without an account. We don&apos;t run ads, analytics or third-party trackers, and we don&apos;t sell data. To make passes and sign-in work we store a few records, and wherever we can we store a one-way hash instead of the secret itself. Everything is listed below.</>}>
      <h2>1. Using the site without paying or signing in</h2>
      <p>Free pages set no cookies. Market data is fetched by our servers, so your browser doesn&apos;t contact the data providers. Like any website, our hosting provider processes standard request data (IP address, user agent, requested URL, time) to serve pages and protect against abuse. We don&apos;t use these logs to build profiles.</p>

      <h2>2. Buying a pass (no account)</h2>
      <p>When you request a Lightning invoice we store:</p>
      <ul>
        <li><strong>The invoice:</strong> its payment hash, the Lightning payment request, the pass type and amount in sats, its status (pending, paid or expired) and timestamps.</li>
        <li><strong>A claim token hash:</strong> your browser gets a random token in a cookie, and we store only its SHA-256 hash. This makes sure only the browser that asked for an invoice can claim the pass.</li>
      </ul>
      <p>When the invoice is paid we create the <strong>pass</strong>: its type, start and expiry time, the payment hash, and SHA-256 hashes of your <strong>recovery code</strong> and of a random <strong>access token</strong> kept in a cookie in your browser. We never store the recovery code or access token themselves, which is why we can&apos;t show your code again.</p>
      <p>Lightning payments are confirmed by checking our own Lightning node. We don&apos;t receive your wallet&apos;s identity, balance or node details; the payment hash is not linked to your name.</p>

      <h2>3. Signing in (optional)</h2>
      <p>Sign-in uses a <strong>passkey</strong> through our sign-in provider. We never see or store your passkey, biometrics or a password; none is created. When you sign in we store:</p>
      <ul>
        <li><strong>Your account:</strong> the provider&apos;s anonymous account identifier, your email address if the provider shares one, and when the account was created and last used.</li>
        <li><strong>Sessions:</strong> the SHA-256 hash of a random session token (the token itself is in a cookie in your browser) and its expiry, 30 days after sign-in. Signing out deletes the session.</li>
        <li>Passes bought while signed in, or linked to your account later, record your account ID.</li>
      </ul>

      <h2>4. Cookies</h2>
      <p>We only use cookies needed for the features above. All of them are first-party, HTTP-only (scripts can&apos;t read them) and sent only over HTTPS in production.</p>
      <table>
        <thead><tr><th>Cookie</th><th>Purpose</th><th>Lifetime</th></tr></thead>
        <tbody>
          <tr><td><code>btcs_access</code></td><td>Your pass&apos;s access token</td><td>Until the pass expires</td></tr>
          <tr><td><code>btcs_claim</code></td><td>Lets this browser claim passes for invoices it requested</td><td>1 year</td></tr>
          <tr><td><code>btcs_session</code></td><td>Keeps you signed in</td><td>30 days, or until sign-out</td></tr>
          <tr><td><code>btcs_oidc</code></td><td>Protects the sign-in redirect (state, nonce, PKCE verifier)</td><td>10 minutes</td></tr>
        </tbody>
      </table>
      <p>We don&apos;t use advertising, analytics or social-media cookies.</p>

      <h2>5. Stored only on your device</h2>
      <p>Some tools keep data in your browser&apos;s local storage so it never reaches our servers: for example, watchlists, your trade journal, alert drafts and display preferences. Clearing your browser&apos;s site data deletes it, and we can&apos;t recover it.</p>

      <h2>6. Alerts</h2>
      <p>If you set up price or on-chain alerts, we store the alert rule and the delivery destination you give us (for example, a Discord webhook URL or Telegram chat ID), so our servers can send the alert. We use it only to deliver your alerts. Deleting the alert deletes the record.</p>

      <h2>7. AI features</h2>
      <p>The trading agent sends market data, never personal data, to Anthropic&apos;s Claude for trade review. If you use an AI tool (such as trade coaching or chart analysis), the text or image you submit is sent to Anthropic to generate the response. Don&apos;t submit personal information in these tools.</p>

      <h2>8. Who processes data for us</h2>
      <ul>
        <li>Our hosting and database providers, to run the site and store the records above</li>
        <li>Our passkey sign-in provider, only if you sign in</li>
        <li>Our Lightning node software, to issue and check invoices</li>
        <li>Anthropic, only for the AI features described above</li>
      </ul>
      <p>Market data providers (Coinbase, Kraken, OKX, Deribit, Hyperliquid, alternative.me, mempool.space, CoinGecko) are contacted by our servers and receive none of your data. We don&apos;t sell or rent personal data.</p>

      <h2>9. Retention</h2>
      <p>Sessions are deleted when you sign out and become invalid when they expire. Invoices and passes are kept as a record of purchase so passes can be restored and disputes resolved. Unpaid invoices expire. Account records are kept until you ask us to delete them.</p>

      <h2>10. Security</h2>
      <p>All connections use HTTPS. Secrets (session tokens, pass access tokens, claim tokens, recovery codes) are stored only as SHA-256 hashes. Access to premium features is checked on our servers, not in your browser.</p>

      <h2>11. Your choices and rights</h2>
      <ul>
        <li>Use the site without an account, and pay without giving any personal details</li>
        <li>Clear cookies and local storage at any time (you&apos;ll need your recovery code to restore a pass)</li>
        <li>Ask us what we hold about you, or to delete your account and its sessions</li>
      </ul>
      <p>Depending on where you live you may have further rights (such as access, correction, deletion and objection). Contact us to use them.</p>

      <h2>12. Children</h2>
      <p>The Service is not intended for anyone under 18, and we don&apos;t knowingly collect information from children.</p>

      <h2>13. Changes</h2>
      <p>If what we store changes, we&apos;ll update this page and its date.</p>

      <h2>14. Contact</h2>
      <p>Privacy questions or requests: <a href={CONTACT_X} rel="noopener noreferrer" target="_blank">@BTCSignal_ai on X</a>.</p>
    </LegalPage>
  );
}
