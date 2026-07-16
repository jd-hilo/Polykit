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
  title: "Polykit — Turn Claude into a Polymarket Trading Expert",
  description:
    "Connect Polykit as a custom MCP. Claude and ChatGPT analyze any Polymarket market for fair value, edge, and BUY/SELL/PASS recommendations.",
  applicationName: "Polykit",
  keywords: [
    "Polymarket MCP",
    "Claude MCP",
    "ChatGPT MCP",
    "prediction market AI",
    "Polykit",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Polykit",
    title: "Polykit — Turn Claude into a Polymarket Trading Expert",
    description: "Headless MCP for Polymarket analysis inside Claude and ChatGPT.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Polykit — Polymarket MCP",
    description: "Turn Claude into a Polymarket trading expert with Polykit MCP.",
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
