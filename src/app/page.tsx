import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { ThreeStep } from "@/components/home/ThreeStep";
import { TrustCTA } from "@/components/home/TrustCTA";
import { FeatureCards } from "@/components/home/FeatureCards";
import { SocialProofGallery } from "@/components/home/SocialProofGallery";
import { PricingCard } from "@/components/home/PricingCard";
import { ProfitCalculator } from "@/components/home/ProfitCalculator";
import { FAQ } from "@/components/home/FAQ";
import { UrgencyBanner } from "@/components/home/UrgencyBanner";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.io";

export const metadata: Metadata = {
  title: "Polykit — AI Companion for Polymarket & Kalshi Prediction Markets",
  description:
    "Screenshot any Polymarket or Kalshi market and get an instant AI edge analysis. Paper trade risk-free, track sharp wallets, and surface mispriced bets in seconds.",
  keywords: [
    "Polymarket",
    "Kalshi",
    "prediction markets",
    "AI prediction market tool",
    "Polymarket AI analyzer",
    "Kalshi AI analyzer",
    "prediction market edge",
    "Polymarket wallet tracker",
    "paper trading prediction markets",
    "copy trading Polymarket",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Polykit",
    title: "Polykit — AI Companion for Polymarket & Kalshi",
    description:
      "Screenshot any Polymarket or Kalshi market and get an instant AI edge analysis, paper-trade it, and track sharp wallets.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polykit — AI for Polymarket & Kalshi",
    description:
      "Instant AI edge analysis on every Polymarket and Kalshi market. Paper trade, copy sharp wallets, find mispriced bets.",
  },
  alternates: { canonical: SITE_URL },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Polykit",
  applicationCategory: "FinanceApplication",
  description:
    "AI-powered prediction market analyzer for Polymarket and Kalshi",
  url: SITE_URL,
  offers: {
    "@type": "Offer",
    price: "39",
    priceCurrency: "USD",
  },
  operatingSystem: "Web",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <AnnouncementBar />
      <Nav transparent />
      <main className="-mt-16">
        <Hero />
        <ThreeStep />
        <TrustCTA />
        <FeatureCards />
        <SocialProofGallery />
        <TrustCTA />
        <div className="pt-4"><UrgencyBanner /></div>
        <PricingCard />
        <ProfitCalculator />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
