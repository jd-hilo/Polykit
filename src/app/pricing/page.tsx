import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { PricingCard } from "@/components/home/PricingCard";
import { UrgencyBanner } from "@/components/home/UrgencyBanner";
import { FAQ } from "@/components/home/FAQ";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.io";

export const metadata: Metadata = {
  title: "Pricing — Polykit | Start for $1 — AI for Polymarket & Kalshi",
  description:
    "Simple pricing. One plan. All-access. Start for $1 your first month — unlimited AI analysis, daily picks, copy trading, paper trading, and wallet tracking for Polymarket and Kalshi.",
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
    title: "Polykit Pricing — Start for $1",
    description:
      "One plan, all features. Start for $1 your first month, then $39/month.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polykit Pricing — Start for $1",
    description:
      "Start for $1 your first month. Unlimited AI market analysis for Polymarket and Kalshi.",
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
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Start for $1 your first month, then $39/month. Unlimited AI analysis, daily picks, copy trading and more.</p>
        </div>
        <div className="mt-8"><UrgencyBanner /></div>
        <PricingCard />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
