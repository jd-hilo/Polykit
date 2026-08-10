import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Polykit — Polymarket MCP for ChatGPT & Claude",
    template: "%s | Polykit",
  },
  description:
    "Connect Polykit as a custom MCP. ChatGPT and Claude analyze any Polymarket market for fair value, edge, and BUY/SELL/PASS recommendations.",
  applicationName: "Polykit",
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
      "Headless MCP for Polymarket analysis inside ChatGPT and Claude. Fair value, edge, and clear recommendations.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polykit — Polymarket MCP for ChatGPT & Claude",
    description: "Analyze any Polymarket market inside ChatGPT or Claude with Polykit MCP.",
  },
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={instrument.variable}>
        <body>
          <PostHogProvider>
            <AuthProvider>{children}</AuthProvider>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
