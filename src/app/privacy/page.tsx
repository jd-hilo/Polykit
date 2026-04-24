import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.io";
const EFFECTIVE_DATE = "April 22, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy — Polykit",
  description:
    "How Polykit (operated by Hilo LLC) collects, uses, and protects your information.",
  alternates: { canonical: `${SITE_URL}/privacy` },
  robots: { index: true, follow: true },
};

export default function Privacy() {
  return (
    <>
      <AnnouncementBar />
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: {EFFECTIVE_DATE}
        </p>

        <div className="prose prose-slate mt-10 max-w-none text-foreground/90">
          <p className="text-lg leading-relaxed">
            This Privacy Policy describes how Hilo LLC (&ldquo;we,&rdquo;
            &ldquo;us,&rdquo; or &ldquo;Hilo&rdquo;), an Ohio limited
            liability company, collects, uses, and shares information in
            connection with Polykit (the &ldquo;Service&rdquo;). By using the
            Service, you agree to the practices described here.
          </p>

          <h2 className="mt-10 text-2xl font-bold">1. Information We Collect</h2>
          <p>We collect the following categories of information:</p>
          <ul className="list-disc pl-6">
            <li>
              <strong>Account information.</strong> Email address, account
              identifier, and authentication metadata provided via our
              authentication provider (Clerk).
            </li>
            <li>
              <strong>Usage content.</strong> Screenshots you upload for AI
              analysis, messages you send to the AI Coach, wallet addresses
              you enter into the Wallet Tracker, paper-trading positions you
              create, and waitlist submissions.
            </li>
            <li>
              <strong>Payment information.</strong> We use a third-party
              payment processor to handle subscription billing. We do not
              store full card numbers on our servers.
            </li>
            <li>
              <strong>Device and log data.</strong> IP address, user-agent,
              timestamps, referring URL, and error logs — used to secure and
              operate the Service.
            </li>
            <li>
              <strong>Cookies and similar technologies.</strong> Session
              cookies from Clerk to keep you logged in, and basic analytics
              cookies to measure product usage.
            </li>
          </ul>
          <p>
            We do not collect your passwords, seed phrases, or private keys
            for Polymarket, Kalshi, or any wallet. Wallet addresses you enter
            into the Wallet Tracker are treated as public blockchain data.
          </p>

          <h2 className="mt-10 text-2xl font-bold">2. How We Use Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6">
            <li>Provide, maintain, and improve the Service;</li>
            <li>
              Generate AI analysis, coach responses, and market
              recommendations on your behalf;
            </li>
            <li>Process subscriptions and billing;</li>
            <li>Communicate with you about your account, updates, and security;</li>
            <li>Detect, prevent, and respond to abuse, fraud, or security incidents;</li>
            <li>Comply with legal obligations.</li>
          </ul>

          <h2 className="mt-10 text-2xl font-bold">3. How We Share Information</h2>
          <p>
            We share limited information with subprocessors who help us run
            the Service, bound by confidentiality and data-processing terms:
          </p>
          <ul className="list-disc pl-6">
            <li>
              <strong>Clerk</strong> — authentication, session management.
            </li>
            <li>
              <strong>OpenAI</strong> — image and text analysis (screenshots
              and analyzer prompts are transmitted for inference).
            </li>
            <li>
              <strong>Perplexity</strong> — live news and citation retrieval
              for the AI Coach and Analyzer.
            </li>
            <li>
              <strong>Polymarket Gamma and Data APIs</strong> — public market
              and wallet data lookups. These APIs return public data only.
            </li>
            <li>
              <strong>Hosting and database providers</strong> — to host the
              Service and store account and position data (for example,
              Vercel and Prisma Postgres).
            </li>
            <li>
              <strong>Payment processor</strong> — to handle subscription
              transactions.
            </li>
            <li>
              <strong>Analytics providers</strong> — aggregated product
              usage measurement.
            </li>
          </ul>
          <p>
            We do not sell your personal information. We may disclose
            information when required by law, to respond to lawful requests,
            or to protect the rights, property, or safety of Hilo LLC, our
            users, or the public. If we are involved in a merger,
            acquisition, or asset sale, your information may be transferred
            as part of that transaction, subject to this Policy.
          </p>

          <h2 className="mt-10 text-2xl font-bold">4. Data Retention</h2>
          <p>
            We retain account information for as long as your account is
            active. Screenshots, chat messages, and paper-trading positions
            are retained until you delete them or your account is closed. Log
            data is retained for a limited period for security and
            diagnostics, typically up to 90 days.
          </p>

          <h2 className="mt-10 text-2xl font-bold">5. Your Choices and Rights</h2>
          <p>
            Depending on where you live (including under the California
            Consumer Privacy Act and the EU/UK General Data Protection
            Regulation), you may have the right to:
          </p>
          <ul className="list-disc pl-6">
            <li>Access the personal information we hold about you;</li>
            <li>Request correction of inaccurate information;</li>
            <li>Request deletion of your information;</li>
            <li>Request a copy of your information in a portable format;</li>
            <li>Opt out of certain processing (for example, marketing emails);</li>
            <li>Withdraw consent where processing is based on consent.</li>
          </ul>
          <p>
            To exercise any of these rights, email{" "}
            <a href="mailto:growth@hilo-media.com" className="underline">
              growth@hilo-media.com
            </a>{" "}
            from the email associated with your account. We will respond
            within a reasonable time frame required by applicable law.
          </p>

          <h2 className="mt-10 text-2xl font-bold">6. Security</h2>
          <p>
            We use reasonable administrative, technical, and physical
            safeguards to protect your information, including encryption in
            transit (TLS) and access controls. No method of transmission or
            storage is perfectly secure, and we cannot guarantee absolute
            security.
          </p>

          <h2 className="mt-10 text-2xl font-bold">7. Children</h2>
          <p>
            The Service is not directed to children under 18. We do not
            knowingly collect personal information from anyone under 18. If
            you believe a minor has provided us with personal information,
            contact us and we will take appropriate steps to delete it.
          </p>

          <h2 className="mt-10 text-2xl font-bold">8. International Transfers</h2>
          <p>
            Hilo LLC is based in the United States. If you access the Service
            from outside the U.S., your information will be transferred to,
            stored, and processed in the U.S. and in other jurisdictions
            where our subprocessors operate. By using the Service, you
            consent to such transfers.
          </p>

          <h2 className="mt-10 text-2xl font-bold">9. Third-Party Links</h2>
          <p>
            The Service contains links to third-party websites, including
            Polymarket, Kalshi, and news sources cited by the AI Coach. This
            Policy does not apply to third-party sites. Review the privacy
            policies of any site you visit.
          </p>

          <h2 className="mt-10 text-2xl font-bold">10. Changes to This Policy</h2>
          <p>
            We may update this Policy from time to time. When we do, we will
            post the updated version with a new &ldquo;Last updated&rdquo;
            date. Material changes will be communicated by email or
            in-product notice.
          </p>

          <h2 className="mt-10 text-2xl font-bold">11. Contact</h2>
          <p>
            Hilo LLC
            <br />
            State of Ohio, USA
            <br />
            Email:{" "}
            <a href="mailto:growth@hilo-media.com" className="underline">
              growth@hilo-media.com
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
