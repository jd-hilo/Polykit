import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.io";

export const metadata: Metadata = {
  title: "About Polykit — AI Tools for Prediction Market Traders",
  description:
    "Polykit builds AI tools that give prediction-market traders an edge. We analyze news, on-chain flow, and historical odds to surface mispriced bets on Polymarket and Kalshi. We're not a broker — we never touch your money.",
  keywords: [
    "about Polykit",
    "Polykit company",
    "prediction market AI company",
    "Polymarket AI tools",
    "Kalshi AI tools",
  ],
  openGraph: {
    type: "website",
    url: `${SITE_URL}/about`,
    siteName: "Polykit",
    title: "About Polykit — AI Tools for Prediction Market Traders",
    description:
      "Polykit builds AI tools that give prediction-market traders an edge on Polymarket, Kalshi, and beyond.",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Polykit",
    description:
      "AI tools that give prediction-market traders an edge.",
  },
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function About() {
  return (
    <>
      <AnnouncementBar /><Nav />
      <main className="mx-auto max-w-2xl px-4 py-20">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">About Polykit</h1>
        <p className="mt-6 text-lg text-muted-foreground">We build AI tools that give prediction-market traders an edge. Our models analyze news, on-chain flow, and historical odds to surface bets with measurable upside.</p>
        <p className="mt-4 text-lg text-muted-foreground">Polykit is not a broker. We never touch your money. You trade on Polymarket, Kalshi or PredictIt — we just help you trade smarter.</p>
      </main>
      <Footer />
    </>
  );
}
