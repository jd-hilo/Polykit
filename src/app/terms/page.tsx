import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.io";
const EFFECTIVE_DATE = "April 22, 2026";

export const metadata: Metadata = {
  title: "Terms of Service — Polykit",
  description:
    "The Terms of Service governing your use of Polykit, operated by Hilo LLC.",
  alternates: { canonical: `${SITE_URL}/terms` },
  robots: { index: true, follow: true },
};

export default function Terms() {
  return (
    <>
      <AnnouncementBar />
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: {EFFECTIVE_DATE}
        </p>

        <div className="prose prose-slate mt-10 max-w-none text-foreground/90">
          <p className="text-lg leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
            and use of Polykit (the &ldquo;Service&rdquo;), operated by Hilo
            LLC, an Ohio limited liability company (&ldquo;we,&rdquo;
            &ldquo;us,&rdquo; or &ldquo;Hilo&rdquo;). By creating an account or
            using the Service, you agree to be bound by these Terms. If you do
            not agree, do not use the Service.
          </p>

          <h2 className="mt-10 text-2xl font-bold">1. Who We Are</h2>
          <p>
            Polykit is an AI-assisted research and analytics tool for publicly
            available prediction markets, including Polymarket and Kalshi. The
            Service is operated by Hilo LLC, registered in the State of Ohio,
            USA. Polykit is not affiliated with, endorsed by, or sponsored by
            Polymarket, Kalshi, or any other prediction-market platform.
          </p>

          <h2 className="mt-10 text-2xl font-bold">2. Not Financial Advice</h2>
          <p>
            Polykit is an information tool. Nothing produced by the Service —
            including AI analysis, coach responses, edge estimates, sub-market
            recommendations, wallet-tracking outputs, or paper-trading results
            — constitutes financial, investment, legal, or tax advice. All
            content is for informational and educational purposes only. You are
            solely responsible for your own trading decisions.
          </p>
          <p>
            Prediction-market trading involves substantial risk of loss. Past
            performance does not guarantee future results. You may lose all of
            the capital you commit to any market.
          </p>

          <h2 className="mt-10 text-2xl font-bold">3. Not a Broker</h2>
          <p>
            We are not a broker, dealer, exchange, clearing firm, or custodian.
            We do not hold, transmit, or route customer funds. You trade
            directly on third-party platforms such as Polymarket and Kalshi
            under their own terms. Paper-trading features within Polykit use
            simulated balances and do not represent real money.
          </p>

          <h2 className="mt-10 text-2xl font-bold">4. Eligibility</h2>
          <p>
            You must be at least 18 years old (or the age of majority in your
            jurisdiction, whichever is higher) and legally permitted to use
            prediction-market tools where you reside. You are responsible for
            determining whether access to and use of Polymarket, Kalshi, or
            similar platforms is legal where you are located. Nothing in
            Polykit authorizes you to access a platform in any jurisdiction
            where that access is prohibited.
          </p>

          <h2 className="mt-10 text-2xl font-bold">5. Accounts</h2>
          <p>
            To use most features, you must create an account via our
            authentication provider. You are responsible for maintaining the
            confidentiality of your credentials and for all activity under your
            account. Notify us promptly at growth@hilo-media.com of any
            unauthorized use.
          </p>

          <h2 className="mt-10 text-2xl font-bold">6. Subscriptions, Billing, and Refunds</h2>
          <p>
            Paid features are offered on a recurring subscription basis (for
            example, $39 per month). Fees are billed in advance for the
            applicable period and are non-refundable except where required by
            law. You may cancel at any time; cancellation takes effect at the
            end of the current billing period. Introductory promotions, trials,
            and discounts are subject to the specific terms disclosed at the
            point of purchase.
          </p>

          <h2 className="mt-10 text-2xl font-bold">7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6">
            <li>Use the Service for anything illegal, fraudulent, or harmful;</li>
            <li>Circumvent rate limits, scrape outputs at scale, or reverse engineer the Service;</li>
            <li>Use the Service to manipulate or attempt to manipulate any prediction market;</li>
            <li>Submit content that violates the intellectual-property or privacy rights of others;</li>
            <li>Share your account credentials with anyone else;</li>
            <li>Use outputs to build a competing product.</li>
          </ul>

          <h2 className="mt-10 text-2xl font-bold">8. AI-Generated Content</h2>
          <p>
            The Service uses large language models, computer-vision models, and
            third-party search providers to generate analysis. AI output can be
            inaccurate, incomplete, or out of date. You must independently
            verify any claim, market slug, resolution date, or price before
            acting on it. We are not liable for losses arising from reliance on
            AI output.
          </p>

          <h2 className="mt-10 text-2xl font-bold">9. Third-Party Services and Data</h2>
          <p>
            The Service integrates with third-party providers including
            authentication (Clerk), AI providers (OpenAI, Perplexity), hosting
            and analytics providers, payment processors, and prediction-market
            public APIs (Polymarket Gamma and Data APIs). Your use of those
            services is subject to their terms. We are not responsible for the
            availability, accuracy, or conduct of any third party.
          </p>

          <h2 className="mt-10 text-2xl font-bold">10. Intellectual Property</h2>
          <p>
            The Service, including all software, designs, text, graphics, and
            trademarks, is owned by Hilo LLC or its licensors and is protected
            by U.S. and international intellectual-property laws. We grant you
            a limited, non-exclusive, non-transferable, revocable license to
            use the Service for your personal, non-commercial use. You retain
            ownership of content you submit (for example, screenshots),
            subject to the license you grant us in Section 11.
          </p>

          <h2 className="mt-10 text-2xl font-bold">11. Your Content</h2>
          <p>
            When you submit content to the Service (screenshots, chat messages,
            wallet addresses, feedback), you grant Hilo LLC a worldwide,
            non-exclusive, royalty-free license to host, process, transmit to
            subprocessors, and use that content to provide, improve, and
            secure the Service. We will not sell your content to third parties.
          </p>

          <h2 className="mt-10 text-2xl font-bold">12. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
            AVAILABLE.&rdquo; HILO LLC DISCLAIMS ALL WARRANTIES, EXPRESS OR
            IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
            PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE
            WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR ACCURATE.
          </p>

          <h2 className="mt-10 text-2xl font-bold">13. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, HILO LLC AND ITS OWNERS,
            OFFICERS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
            OR FOR ANY LOST PROFITS OR LOST TRADING GAINS, ARISING OUT OF OR
            RELATING TO YOUR USE OF THE SERVICE. OUR TOTAL AGGREGATE LIABILITY
            WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO HILO LLC
            FOR THE SERVICE IN THE TWELVE MONTHS PRECEDING THE CLAIM OR (B)
            ONE HUNDRED U.S. DOLLARS ($100).
          </p>

          <h2 className="mt-10 text-2xl font-bold">14. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Hilo LLC from any claim,
            loss, liability, or expense (including reasonable attorneys&rsquo;
            fees) arising out of your use of the Service, your violation of
            these Terms, your violation of applicable law, or your violation of
            the rights of any third party.
          </p>

          <h2 className="mt-10 text-2xl font-bold">15. Termination</h2>
          <p>
            We may suspend or terminate your access to the Service at any time,
            with or without notice, for any reason, including violation of
            these Terms. Upon termination, your license to use the Service
            ends, but Sections 2, 3, 10, 12, 13, 14, 16, and 17 will survive.
          </p>

          <h2 className="mt-10 text-2xl font-bold">16. Governing Law and Venue</h2>
          <p>
            These Terms are governed by the laws of the State of Ohio, USA,
            without regard to conflict-of-laws principles. You and Hilo LLC
            agree to the exclusive jurisdiction and venue of the state and
            federal courts located in Franklin County, Ohio for any dispute
            not subject to arbitration.
          </p>

          <h2 className="mt-10 text-2xl font-bold">17. Dispute Resolution</h2>
          <p>
            Any dispute arising out of or relating to these Terms or the
            Service will first be resolved through good-faith negotiation. If
            negotiation fails, the dispute will be resolved by binding
            individual arbitration administered by the American Arbitration
            Association under its Consumer Arbitration Rules, seated in Ohio.
            YOU AND HILO LLC WAIVE ANY RIGHT TO A JURY TRIAL AND TO
            PARTICIPATE IN A CLASS ACTION.
          </p>

          <h2 className="mt-10 text-2xl font-bold">18. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. When we do, we will
            post the updated version with a new &ldquo;Last updated&rdquo;
            date. Material changes will be communicated by email or in-product
            notice. Your continued use of the Service after the effective date
            constitutes acceptance of the updated Terms.
          </p>

          <h2 className="mt-10 text-2xl font-bold">19. Contact</h2>
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
