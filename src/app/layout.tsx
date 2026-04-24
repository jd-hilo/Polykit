import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/components/auth/AuthProvider";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.io";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Polykit — The #1 AI Tool To Beat Prediction Markets",
  description: "Your all in one tool for making money on Polymarket, Kalshi & other prediction markets with the power of AI.",
  applicationName: "Polykit",
  keywords: [
    "Polymarket",
    "Kalshi",
    "prediction markets",
    "AI prediction market tool",
    "Polymarket AI",
    "Kalshi AI",
    "prediction market analyzer",
    "paper trading prediction markets",
    "Polymarket wallet tracker",
    "prediction market coach",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Polykit",
    title: "Polykit — AI for Polymarket & Kalshi",
    description: "Screenshot any Polymarket or Kalshi market and get an instant AI edge analysis, paper-trade it, and track sharp wallets.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polykit — AI for Polymarket & Kalshi",
    description: "Screenshot any Polymarket or Kalshi market and get an instant AI edge analysis.",
  },
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <AuthProvider>{children}</AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
