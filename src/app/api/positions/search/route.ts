import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const GAMMA_BASE = "https://gamma-api.polymarket.com";

type GammaMarket = {
  question?: string;
  slug?: string;
  outcomePrices?: string | string[];
  outcomes?: string | string[];
  liquidity?: string | number;
  liquidityNum?: number;
};

type GammaEvent = {
  slug?: string;
  title?: string;
  markets?: GammaMarket[];
};

// Simple in-memory cache (60s) so repeated searches are cheap.
let cache: { value: GammaEvent[]; expires: number } | null = null;

async function cachedEventsBulk(): Promise<GammaEvent[]> {
  if (cache && cache.expires > Date.now()) return cache.value;
  try {
    const res = await fetch(
      `${GAMMA_BASE}/events?active=true&closed=false&limit=200&order=volume24hr&ascending=false`,
      { headers: { accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    const arr = Array.isArray(data) ? (data as GammaEvent[]) : [];
    cache = { value: arr, expires: Date.now() + 60_000 };
    return arr;
  } catch {
    return [];
  }
}

function parseStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    } catch {
      /* ignore */
    }
  }
  return [];
}

function parseNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function yesPriceOf(m: GammaMarket): number {
  const prices = parseStringArray(m.outcomePrices).map((x) => Number(x));
  const outcomes = parseStringArray(m.outcomes);
  if (prices.length >= 2) {
    const yesIdx = outcomes.findIndex((o) => /^yes$/i.test(o));
    const p = prices[yesIdx >= 0 ? yesIdx : 0];
    return Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
  }
  if (prices.length === 1) {
    const p = prices[0];
    return Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
  }
  return 0;
}

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  if (!q) return NextResponse.json({ results: [] });

  const words = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (words.length === 0) return NextResponse.json({ results: [] });

  const events = await cachedEventsBulk();

  type Scored = {
    question: string;
    eventSlug: string;
    marketSlug: string;
    yesPrice: number;
    liquidity: number;
    score: number;
  };

  const out: Scored[] = [];
  for (const e of events) {
    const eventSlug = e.slug ?? "";
    const markets = Array.isArray(e.markets) ? e.markets : [];
    for (const m of markets) {
      const question = (m.question ?? "").toString();
      const marketSlug = (m.slug ?? "").toString();
      if (!question || !marketSlug || !eventSlug) continue;
      const hay = (question + " " + (e.title ?? "")).toLowerCase();
      let score = 0;
      for (const w of words) if (hay.includes(w)) score += 1;
      if (score === 0) continue;
      out.push({
        question,
        eventSlug,
        marketSlug,
        yesPrice: yesPriceOf(m),
        liquidity: parseNum(m.liquidityNum ?? m.liquidity),
        score,
      });
    }
  }

  out.sort((a, b) => b.score - a.score || b.liquidity - a.liquidity);
  const results = out.slice(0, 8).map((r) => ({
    question: r.question,
    eventSlug: r.eventSlug,
    marketSlug: r.marketSlug,
    yesPrice: r.yesPrice,
    liquidity: r.liquidity,
  }));

  return NextResponse.json({ results });
}
