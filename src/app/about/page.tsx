import type { Metadata } from "next";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";

export const metadata: Metadata = {
  title: "About Polykit",
  description:
    "Polykit is a headless MCP server for Polymarket analysis in ChatGPT and Claude. Independent third-party tool — not affiliated with Polymarket.",
  alternates: { canonical: `${SITE_URL}/about` },
};

export default function About() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-2xl px-6 py-24 md:px-10">
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">About Polykit</h1>
        <p className="mt-6 text-lg leading-relaxed text-[#525252]">
          Polykit is a headless MCP server that gives Claude and ChatGPT calibrated Polymarket analysis — fair value, edge, and clear recommendations.
        </p>
        <p className="mt-4 text-lg leading-relaxed text-[#525252]">
          We are not a broker and not affiliated with Polymarket. We never touch your money or execute trades.
        </p>
      </main>
      <Footer />
    </>
  );
}
