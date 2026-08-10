import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { McpFeatures } from "@/components/home/McpFeatures";
import { HowItWorks } from "@/components/home/HowItWorks";
import { PricingCard } from "@/components/home/PricingCard";
import { FAQ } from "@/components/home/FAQ";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";

export const metadata: Metadata = {
  title: "Polykit — Polymarket MCP for ChatGPT & Claude",
  description:
    "Connect Polykit as a custom MCP. ChatGPT and Claude analyze any Polymarket market for fair value, edge, and BUY/SELL/PASS recommendations.",
  keywords: [
    "Polymarket MCP",
    "ChatGPT Polymarket",
    "Claude Polymarket",
    "ChatGPT MCP",
    "Claude MCP",
    "prediction market AI",
    "Polymarket analysis",
    "Polykit",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Polykit",
    title: "Polykit — Polymarket MCP for ChatGPT & Claude",
    description:
      "Headless MCP for Polymarket analysis. Fair value, edge, and clear recommendations inside ChatGPT and Claude.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polykit — Polymarket MCP for ChatGPT & Claude",
    description: "Connect Polykit as a custom MCP and analyze any Polymarket market.",
  },
  alternates: { canonical: SITE_URL },
};

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Polykit",
        url: SITE_URL,
        description:
          "Headless MCP server for Polymarket analysis inside ChatGPT and Claude.",
      },
      {
        "@type": "SoftwareApplication",
        name: "Polykit",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description:
          "Polymarket MCP for ChatGPT and Claude. Fair value, edge, and BUY/SELL/PASS recommendations.",
        offers: {
          "@type": "Offer",
          price: "14.00",
          priceCurrency: "USD",
          description: "$14/month, cancel anytime. First month $1.",
          url: `${SITE_URL}/pricing`,
        },
      },
    ],
  };

  return (
    <div className={`${instrument.variable} font-sans`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main>
        <Hero />
        <McpFeatures />
        <HowItWorks />
        <PricingCard />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
