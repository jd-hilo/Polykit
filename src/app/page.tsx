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
  title: "Polykit — Turn Claude into a Polymarket Trading Expert",
  description:
    "Connect Polykit as a custom MCP. Claude and ChatGPT analyze any Polymarket market for fair value, edge, and BUY/SELL/PASS recommendations.",
  keywords: [
    "Polymarket MCP",
    "Claude MCP",
    "ChatGPT MCP",
    "prediction market AI",
    "Polymarket analysis",
    "Polykit",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Polykit",
    title: "Polykit — Turn Claude into a Polymarket Trading Expert",
    description:
      "Headless MCP for Polymarket analysis. Fair value, edge, and clear recommendations inside Claude and ChatGPT.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polykit — Polymarket MCP for Claude & ChatGPT",
    description: "Connect Polykit as a custom MCP and analyze any Polymarket market.",
  },
  alternates: { canonical: SITE_URL },
};

export default function Home() {
  return (
    <div className={`${instrument.variable} font-sans`}>
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
