import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { StartCta } from "@/components/auth/StartCta";
import { McpSetupGuide } from "@/components/mcp/McpSetupGuide";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";
const MCP_URL = `${SITE_URL}/api/mcp`;
const PAGE_URL = `${SITE_URL}/mcp`;

export const metadata: Metadata = {
  title: "Polymarket MCP for ChatGPT & Claude — Setup Guide | Polykit",
  description:
    "Connect Polykit’s Polymarket MCP to ChatGPT or Claude in about two minutes. Get fair value, edge, and BUY/SELL/PASS on any Polymarket link.",
  keywords: [
    "Polymarket MCP",
    "ChatGPT Polymarket",
    "Claude Polymarket",
    "ChatGPT MCP connector",
    "Claude MCP",
    "prediction market AI",
    "Polymarket analysis",
    "analyze_market",
    "Polykit",
  ],
  openGraph: {
    type: "website",
    url: PAGE_URL,
    siteName: "Polykit",
    title: "Polymarket MCP for ChatGPT & Claude — Setup Guide",
    description:
      "Add Polykit as a custom MCP. Paste a Polymarket link in ChatGPT or Claude and get calibrated edge analysis.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polymarket MCP for ChatGPT & Claude",
    description: "Setup guide for Polykit’s analyze_market MCP.",
  },
  alternates: { canonical: PAGE_URL },
};

const FAQS = [
  {
    q: "What is a Polymarket MCP?",
    a: "An MCP (Model Context Protocol) server lets ChatGPT, Claude, and other AI apps call tools. Polykit’s MCP analyzes Polymarket markets for fair value, edge, and a clear BUY, SELL, or PASS recommendation.",
  },
  {
    q: "Does Polykit work with ChatGPT?",
    a: "Yes. Add Polykit as a custom connector in ChatGPT Settings → Connectors, using the MCP URL and your connection key as a Bearer token.",
  },
  {
    q: "Does Polykit work with Claude?",
    a: "Yes. Use Claude Desktop config, Claude.ai connectors, or Claude Code. Same MCP URL and Bearer connection key.",
  },
  {
    q: "How long does setup take?",
    a: "About two minutes: subscribe, create a connection key in the dashboard, paste the connector into ChatGPT or Claude, then ask it to analyze a Polymarket link.",
  },
  {
    q: "What does analyze_market return?",
    a: "Fair value vs live price, edge, confidence, BUY/SELL/PASS, short reasons, and key risks. On multi-outcome events it can highlight the sub-market with the largest edge.",
  },
  {
    q: "Is Polykit free?",
    a: "Polykit is $14/month, cancel anytime. Your first month is $1 so you can try the full product. Full MCP access from day one.",
  },
];

export default function McpDocsPage() {
  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Polykit",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "Headless MCP server for Polymarket analysis inside ChatGPT and Claude. Fair value, edge, and BUY/SELL/PASS recommendations.",
    offers: {
      "@type": "Offer",
      price: "14.00",
      priceCurrency: "USD",
      description: "$14/month, cancel anytime. First month $1.",
      url: `${SITE_URL}/pricing`,
    },
    featureList: [
      "Remote MCP at /api/mcp",
      "analyze_market tool",
      "ChatGPT custom connectors",
      "Claude Desktop and Claude.ai",
      "Custom MCP clients (Cursor, etc.)",
    ],
  };

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to connect Polykit Polymarket MCP to ChatGPT or Claude",
    description:
      "Subscribe, create a connection key, add the MCP connector, then analyze any Polymarket link.",
    totalTime: "PT2M",
    step: [
      {
        "@type": "HowToStep",
        name: "Subscribe",
        text: "Subscribe at https://polykit.co ($14/month, first month $1)",
        url: SITE_URL,
      },
      {
        "@type": "HowToStep",
        name: "Create a connection key",
        text: "Open the dashboard and create a connection key. Copy it once.",
        url: `${SITE_URL}/dashboard`,
      },
      {
        "@type": "HowToStep",
        name: "Add the MCP connector",
        text: `In ChatGPT or Claude, add a custom MCP/connector with URL ${MCP_URL} and header Authorization: Bearer YOUR_CONNECTION_KEY`,
        url: PAGE_URL,
      },
      {
        "@type": "HowToStep",
        name: "Analyze a market",
        text: "Ask your AI to analyze a Polymarket URL and enable the Polykit tool if prompted.",
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Nav />
      <main className="bg-white pt-28 md:pt-32">
        <div className="mx-auto max-w-3xl px-6 pb-8 md:px-10">
          <p className="text-[13px] font-medium uppercase tracking-wide text-[#006fff]">
            Setup guide
          </p>
          <h1 className="mt-2 font-display text-[clamp(1.9rem,4.5vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-[#0d0d0d]">
            Polymarket MCP for ChatGPT and Claude
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[#525252]">
            Polykit plugs into ChatGPT and Claude so you can paste any Polymarket link and get
            fair value, edge, and a clear BUY, SELL, or PASS — in about two minutes of setup.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <StartCta location="mcp-docs" className="btn-primary btn-primary-md" />
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full border border-[#e3e3e3] bg-white px-5 py-2.5 text-sm font-medium text-[#525252] transition hover:border-[#78d2ff] hover:text-[#0d0d0d]"
            >
              Open dashboard
            </Link>
          </div>
        </div>

        <section className="border-y border-[#e3e3e3] bg-[#f7f7f7] py-10">
          <div className="mx-auto max-w-3xl px-6 md:px-10">
            <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-[#0d0d0d]">
              Four steps
            </h2>
            <ol className="mt-5 space-y-3">
              {[
                "Subscribe ($14/month — first month $1).",
                "Create a connection key in your dashboard.",
                "Add Polykit in ChatGPT, Claude, or a custom MCP client.",
                "Paste a Polymarket link and ask for the edge.",
              ].map((step, i) => (
                <li
                  key={step}
                  className="flex gap-3 rounded-xl border border-[#e3e3e3] bg-white px-4 py-3 text-sm text-[#525252]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0080ff] to-[#5f61ed] text-[12px] font-semibold text-white">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-3xl px-6 md:px-10">
            <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-[#0d0d0d]">
              Connect your AI
            </h2>
            <p className="mt-2 text-sm text-[#737373]">
              MCP URL:{" "}
              <code className="rounded bg-[#f7f7f7] px-1.5 py-0.5 text-[13px] text-[#0d0d0d]">
                {MCP_URL}
              </code>
            </p>
            <div className="mt-6">
              <McpSetupGuide mcpUrl={MCP_URL} />
            </div>
          </div>
        </section>

        <section className="border-t border-[#e3e3e3] bg-[#f7f7f7] py-12 md:py-16">
          <div className="mx-auto max-w-3xl px-6 md:px-10">
            <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-[#0d0d0d]">
              Questions people ask AI search
            </h2>
            <dl className="mt-6 space-y-4">
              {FAQS.map((item) => (
                <div
                  key={item.q}
                  className="rounded-xl border border-[#e3e3e3] bg-white px-5 py-4"
                >
                  <dt className="text-[15px] font-semibold text-[#0d0d0d]">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-[#525252]">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="py-14 text-center">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#0d0d0d]">
            Ready to analyze Polymarket in ChatGPT or Claude?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#737373]">
            $14/month, cancel anytime. Full MCP access from day one.
          </p>
          <div className="mt-6 flex justify-center">
            <StartCta location="mcp-docs-bottom" className="btn-primary btn-primary-md" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
