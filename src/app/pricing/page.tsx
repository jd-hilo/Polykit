import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { PricingCard } from "@/components/home/PricingCard";
import { UrgencyBanner } from "@/components/home/UrgencyBanner";
import { FAQ } from "@/components/home/FAQ";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.io";

export const metadata: Metadata = {
  title: "Pricing — Polykit | $39/mo AI for Polymarket & Kalshi",
  description:
    "Simple pricing. One plan. All-access. $39/month with 30% off — unlimited AI analysis, daily picks, copy trading, paper trading, and wallet tracking for Polymarket and Kalshi.",
  keywords: [
    "Polykit pricing",
    "Polymarket AI price",
    "Kalshi AI price",
    "prediction market tool pricing",
    "AI analyzer subscription",
    "Polykit cost",
  ],
  openGraph: {
    type: "website",
    url: `${SITE_URL}/pricing`,
    siteName: "Polykit",
    title: "Polykit Pricing — $39/mo All-Access",
    description:
      "One plan, all features. Unlimited AI market analysis for Polymarket and Kalshi at $39/month.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polykit Pricing — $39/mo All-Access",
    description:
      "Unlimited AI market analysis for Polymarket and Kalshi at $39/month.",
  },
  alternates: { canonical: `${SITE_URL}/pricing` },
};

export default function Pricing() {
  return (
    <>
      <AnnouncementBar />
      <Nav />
      <main className="pb-8 pt-12">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">Simple pricing. One plan. All-access.</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">$39/month with 30% off. Includes unlimited AI analysis, daily picks, copy trading and more.</p>
        </div>
        <div className="mt-8"><UrgencyBanner /></div>
        <PricingCard />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
