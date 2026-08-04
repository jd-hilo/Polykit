import type { Metadata } from "next";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { PricingCard } from "@/components/home/PricingCard";
import { FAQ } from "@/components/home/FAQ";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";

export const metadata: Metadata = {
  title: "Pricing — Polymarket MCP for ChatGPT & Claude",
  description:
    "One plan for full Polykit MCP access in ChatGPT and Claude. $14/month, cancel anytime. First month $1.",
  keywords: [
    "Polymarket MCP pricing",
    "ChatGPT Polymarket",
    "Claude Polymarket",
    "Polykit",
  ],
  openGraph: {
    title: "Polykit Pricing — $14/month",
    description: "Full Polymarket MCP access for ChatGPT and Claude. $14/month, cancel anytime. First month $1.",
    url: `${SITE_URL}/pricing`,
  },
  alternates: { canonical: `${SITE_URL}/pricing` },
};

export default function Pricing() {
  return (
    <>
      <Nav />
      <main className="pt-14">
        <PricingCard />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
