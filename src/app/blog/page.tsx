import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { POSTS } from "@/lib/blog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.io";

export const metadata: Metadata = {
  title: "The Polykit Blog — Prediction Market Guides & AI Edge Breakdowns",
  description:
    "Guides, breakdowns, and deep dives to sharpen your edge in prediction markets. Polymarket, Kalshi, copy trading, paper trading, and AI market analysis.",
  keywords: [
    "Polymarket blog",
    "Kalshi blog",
    "prediction market guides",
    "prediction market strategy",
    "Polymarket tutorials",
    "AI prediction market",
    "copy trading prediction markets",
    "paper trading prediction markets",
  ],
  openGraph: {
    type: "website",
    url: `${SITE_URL}/blog`,
    siteName: "Polykit",
    title: "The Polykit Blog — Prediction Market Guides & AI Edge Breakdowns",
    description:
      "Guides, breakdowns, and deep dives to sharpen your edge on Polymarket and Kalshi.",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Polykit Blog",
    description:
      "Guides, breakdowns, and deep dives to sharpen your edge in prediction markets.",
  },
  alternates: { canonical: `${SITE_URL}/blog` },
};

export default function Blog() {
  return (
    <>
      <AnnouncementBar /><Nav />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">The Polykit Blog</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Guides, breakdowns, and deep dives to sharpen your edge in prediction markets.</p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {POSTS.map(p => (
            <Link key={p.slug} href={`/blog/${p.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition hover:shadow-lg">
              <div className="h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
              <div className="flex flex-1 flex-col p-5">
                <div className="font-bold leading-tight group-hover:text-primary">{p.title}</div>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Read article <ArrowRight size={14} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
