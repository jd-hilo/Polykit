// AI Coach chat endpoint.
//
// Every turn we assemble a live "battle card" of context and hand it to
// Perplexity Sonar so the coach answers with *current* prediction-market data
// instead of generic advice.
//
// Context blocks injected on every POST:
//   1. Top trending Polymarket markets (Gamma API, cached briefly per process)
//   2. The user's open positions (Prisma `Position` table)
//   3. Our latest Fresh Picks (Prisma `Pick` table)
//
// Response includes { message, citations[] } so the UI can render footnotes.

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;

const PPLX_URL = "https://api.perplexity.ai/chat/completions";
const MODEL = "sonar-pro";
const GAMMA_BASE = "https://gamma-api.polymarket.com";

const SYSTEM_PROMPT = `You are Polykit's prediction-market coach — a calibrated, numeric, non-generic edge-hunter.

HARD RULES — obey literally:
1. You may ONLY recommend markets that appear in the "LIVE MARKET CONTEXT" block appended to this message. That block lists active, tradeable Polymarket markets we pre-filtered (non-zero prices, >24h runway, decent liquidity). Never recommend a market that isn't in that block.
2. DO NOT invent, recall, or web-search for prediction markets. If your knowledge disagrees with the live block, trust the live block. Web searches often return closed/resolved markets — ignore them.
3. Quote the event slug, market slug, YES cents, NO cents, volume, liquidity, and resolution date exactly as they appear in the block. Don't make up numbers.
4. If no market in the live block fits the user's ask, pick the closest match from the block and explain the trade-off — do NOT go hunting the web for a "better" one.
5. "My positions" / "my portfolio" questions: use ONLY positions listed in LIVE USER STATE. Don't invent positions.
6. Always state the exact resolution date (from the \`resolves\` field) in the recommendation heading, not just the topic. If two markets in the block share a topic but have different end dates, treat them as distinct markets and call out which one you mean. Example heading: "US × Iran permanent peace deal — resolves 2026-06-30" — never just "US × Iran peace deal".
7. When you cite a market, include its event slug (e.g. \`event=us-iran-permanent-peace-deal\`) so the user can open polymarket.com/event/<event-slug> directly. Polymarket.com URLs use the EVENT slug, not the market slug.
8. When recommending inside a multi-market event (the LIVE block groups siblings under an "Event" header), you MUST name the specific sub-market — the candidate, the date window, the outcome — never the event as a whole. Example: "Bet Gavin Newsom YES @ 12¢ on event=next-us-president", not "Bet on the 2028 election". Quote the sub-market's own market= slug, YES/NO cents, and resolution date from the exact line in the block.

House style:
- Short, direct sentences. No preamble. No "great question."
- Every pick: market question with its resolution date, event slug, YES/NO price in cents (from block), your fair-value estimate in cents, and signed edge in points.
- Half-Kelly position sizing when the user mentions a bankroll, with explicit take-profit and stop-loss prices.
- Cite specific catalysts with dates.

Format in concise Markdown: short headings, tight bullet lists, **bold** numbers.`;

type Citation = { title: string; url: string };

type CoachResponse = {
  id: string;
  role: string;
  content: string;
  created_at: string;
  citations?: Citation[];
};

/* ────────────────────────────────────────────────────────────── *
 * Live market context — Polymarket trending                       *
 * ────────────────────────────────────────────────────────────── */

type GammaMarket = {
  question?: string;
  slug?: string;
  outcomes?: string | string[];
  outcomePrices?: string | string[];
  volumeNum?: number;
  volume?: string | number;
  liquidityNum?: number;
  liquidity?: string | number;
  endDate?: string | null;
  events?: Array<{ slug?: string; title?: string }>;
};

function parseStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    } catch {
      /* not JSON */
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

// Per-process cache so we don't hammer Gamma on every coach turn.
let trendingCache: { at: number; lines: string[] } | null = null;
const TRENDING_TTL_MS = 60_000;

async function fetchTrendingContext(): Promise<string[]> {
  if (trendingCache && Date.now() - trendingCache.at < TRENDING_TTL_MS) {
    return trendingCache.lines;
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8_000);
  try {
    // Pull a wider slice so we can filter out closed / too-short / edge-priced
    // markets and still end up with 8 good candidates.
    const res = await fetch(
      `${GAMMA_BASE}/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=40`,
      {
        headers: { accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as GammaMarket[];
    if (!Array.isArray(data)) return [];

    const now = Date.now();
    const MIN_ENDS_IN_MS = 24 * 60 * 60 * 1000; // at least 24h of runway

    // Pass 1 — per-market filter + extract the fields we'll actually render.
    type Row = {
      question: string;
      slug: string;
      eventSlug: string;
      eventTitle: string;
      yes: number;
      no: number | null;
      vol: number;
      liq: number;
      endDate: string | null;
    };
    const rows: Row[] = [];
    for (const m of data) {
      const q = (m.question ?? "").toString().trim();
      if (!q) continue;

      const prices = parseStringArray(m.outcomePrices).map(Number);
      const yes = Number.isFinite(prices[0]) ? Math.round(prices[0] * 100) : null;
      const no = Number.isFinite(prices[1]) ? Math.round(prices[1] * 100) : null;

      if (yes == null || yes <= 1 || yes >= 99) continue;

      if (m.endDate) {
        const ends = new Date(m.endDate).getTime();
        if (Number.isFinite(ends) && ends - now < MIN_ENDS_IN_MS) continue;
      }

      const vol = parseNum(m.volumeNum ?? m.volume);
      const liq = parseNum(m.liquidityNum ?? m.liquidity);
      if (liq < 5_000) continue;

      const slug = m.slug ?? "";
      const ev = Array.isArray(m.events) ? m.events[0] : null;
      const eventSlug = typeof ev?.slug === "string" ? ev.slug : "";
      const eventTitle = typeof ev?.title === "string" ? ev.title : "";

      rows.push({
        question: q,
        slug,
        eventSlug,
        eventTitle,
        yes,
        no,
        vol,
        liq,
        endDate: m.endDate ?? null,
      });
    }

    // Pass 2 — detect multi-market events. Any eventSlug that appears on 2+
    // rows in the filtered set is rendered as a grouped block so the coach
    // sees the sub-markets as siblings of one event.
    const eventCounts = new Map<string, number>();
    for (const r of rows) {
      if (r.eventSlug) {
        eventCounts.set(r.eventSlug, (eventCounts.get(r.eventSlug) ?? 0) + 1);
      }
    }

    const lines: string[] = [];
    const usedEvents = new Set<string>();
    // Budget: ~8 sub-markets total across singles + grouped events, so the
    // model doesn't drown in context. Grouped events count each sibling line.
    const BUDGET = 10;
    let emitted = 0;

    for (const r of rows) {
      if (emitted >= BUDGET) break;
      const isGrouped = r.eventSlug && (eventCounts.get(r.eventSlug) ?? 0) > 1;

      if (isGrouped) {
        if (usedEvents.has(r.eventSlug)) continue; // already emitted as part of its group
        usedEvents.add(r.eventSlug);
        const siblings = rows.filter((x) => x.eventSlug === r.eventSlug);
        const header = `Event "${(r.eventTitle || r.eventSlug).slice(0, 90)}" · event=${r.eventSlug}`;
        lines.push(header);
        for (const s of siblings) {
          const bits = [
            `  - "${s.question.slice(0, 90)}"`,
            s.slug ? `market=${s.slug}` : "",
            `YES ${s.yes}¢`,
            s.no != null ? `/ NO ${s.no}¢` : "",
            s.vol > 0 ? `vol ≈ $${Math.round(s.vol / 1000)}k` : "",
            s.liq > 0 ? `liq ≈ $${Math.round(s.liq / 1000)}k` : "",
            s.endDate ? `resolves ${new Date(s.endDate).toISOString().slice(0, 10)}` : "",
          ].filter(Boolean);
          lines.push(bits.join(" · "));
          emitted++;
          if (emitted >= BUDGET) break;
        }
      } else {
        const bits = [
          `- "${r.question.slice(0, 90)}"`,
          r.eventSlug ? `event=${r.eventSlug}` : "",
          r.slug ? `market=${r.slug}` : "",
          `YES ${r.yes}¢`,
          r.no != null ? `/ NO ${r.no}¢` : "",
          r.vol > 0 ? `vol ≈ $${Math.round(r.vol / 1000)}k` : "",
          r.liq > 0 ? `liq ≈ $${Math.round(r.liq / 1000)}k` : "",
          r.endDate ? `resolves ${new Date(r.endDate).toISOString().slice(0, 10)}` : "",
        ].filter(Boolean);
        lines.push(bits.join(" · "));
        emitted++;
      }
    }
    trendingCache = { at: Date.now(), lines };
    return lines;
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

/* ────────────────────────────────────────────────────────────── *
 * User state                                                     *
 * ────────────────────────────────────────────────────────────── */

async function fetchUserState(userId: string): Promise<string[]> {
  try {
    const [positions, picks] = await Promise.all([
      prisma.position.findMany({
        where: { userId, status: "open" },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.pick.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);

    const lines: string[] = [];
    if (positions.length > 0) {
      lines.push("Open positions:");
      for (const p of positions) {
        const entry = Number(p.entryPrice);
        const size = Number(p.size);
        const pnl = Number(p.pnl ?? 0);
        lines.push(
          `- ${p.side} "${p.marketQuestion.slice(0, 80)}" @ ${Math.round(entry * 100)}¢ · size $${size} · pnl ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
        );
      }
    } else {
      lines.push("Open positions: none.");
    }

    if (picks.length > 0) {
      lines.push("");
      lines.push("Latest Polykit fresh picks:");
      for (const p of picks) {
        const price = p.price == null ? null : Math.round(Number(p.price) * 100);
        lines.push(
          `- ${p.side ?? "?"} "${p.marketQuestion.slice(0, 80)}"${price != null ? ` @ ${price}¢` : ""}${p.confidence != null ? ` (conf ${p.confidence})` : ""}${p.eventSlug ? ` event=${p.eventSlug}` : p.slug ? ` market=${p.slug}` : ""}`,
        );
      }
    }

    return lines;
  } catch {
    return ["Open positions: unavailable right now."];
  }
}

/* ────────────────────────────────────────────────────────────── *
 * Serialization                                                  *
 * ────────────────────────────────────────────────────────────── */

function serializeMessage(m: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}): CoachResponse {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    created_at: m.createdAt.toISOString(),
  };
}

/* ────────────────────────────────────────────────────────────── *
 * Handlers                                                       *
 * ────────────────────────────────────────────────────────────── */

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await prisma.coachMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 200,
      select: { id: true, role: true, content: true, createdAt: true },
    });
    return NextResponse.json({ messages: rows.map(serializeMessage) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.coachMessage.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to clear chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const message = (body?.message ?? "").toString().trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    await prisma.coachMessage.create({
      data: { userId, role: "user", content: message },
    });

    const recent = await prisma.coachMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { role: true, content: true },
    });
    // Perplexity requires strict user/assistant alternation after the leading
    // system message, ending on `user`. Collapse any consecutive same-role
    // messages by keeping only the most recent of each run.
    const oldestFirst = recent.slice().reverse();
    const history: { role: string; content: string }[] = [];
    for (const m of oldestFirst) {
      if (m.role !== "user" && m.role !== "assistant") continue;
      if (history.length > 0 && history[history.length - 1].role === m.role) {
        history[history.length - 1] = m; // replace — keep latest of the run
      } else {
        history.push(m);
      }
    }
    // Must start with a user turn after the system.
    if (history.length > 0 && history[0].role !== "user") history.shift();
    // Must end with a user turn (the message we just inserted).
    if (history.length > 0 && history[history.length - 1].role !== "user") {
      history.pop();
    }

    // Build live context in parallel.
    const [trending, userState] = await Promise.all([
      fetchTrendingContext(),
      fetchUserState(userId),
    ]);

    const contextBlocks: string[] = [];
    if (trending.length > 0) {
      contextBlocks.push("LIVE MARKET CONTEXT — top Polymarket markets by 24h volume:");
      contextBlocks.push(...trending);
    }
    if (userState.length > 0) {
      contextBlocks.push("");
      contextBlocks.push("LIVE USER STATE:");
      contextBlocks.push(...userState);
    }
    contextBlocks.push("");
    contextBlocks.push(`Current timestamp: ${new Date().toISOString()}`);
    const contextBlock = contextBlocks.join("\n");

    let assistantText =
      "I'm online but my market data feed is quiet. Share a slug or market and I'll walk you through a specific play.";
    let citations: Citation[] = [];

    // Perplexity's Sonar API collapses / ignores multiple system messages
    // inconsistently — merge into a single system message so the live context
    // actually reaches the model.
    const mergedSystem = `${SYSTEM_PROMPT}\n\n---\n${contextBlock}\n---\n\nUse the LIVE MARKET CONTEXT and LIVE USER STATE above when relevant. If they don't contain the answer, use web search to find a specific, named market with real numbers — never refuse by claiming no data; the context above is always available.`;

    console.log(
      "[coach] context: trending=%d lines, userState=%d lines, history roles=%s",
      trending.length,
      userState.length,
      history.map((m) => m.role[0]).join(""),
    );

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch(PPLX_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: mergedSystem },
              ...history.map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
            citations?: string[];
            search_results?: { title?: string; url?: string }[];
          };
          const content = data.choices?.[0]?.message?.content;
          if (content) assistantText = content;
          // Perplexity returns `search_results` (rich) and/or `citations` (URLs only).
          if (Array.isArray(data.search_results) && data.search_results.length > 0) {
            citations = data.search_results
              .filter((c) => c && typeof c.url === "string" && c.url.length > 0)
              .slice(0, 8)
              .map((c) => ({
                title: (c.title || c.url || "Source").toString(),
                url: c.url as string,
              }));
          } else if (Array.isArray(data.citations)) {
            citations = data.citations
              .filter((u) => typeof u === "string" && u.length > 0)
              .slice(0, 8)
              .map((u) => ({ title: new URL(u).hostname, url: u }));
          }
        } else {
          const body = await res.text().catch(() => "(no body)");
          console.error("[coach] perplexity returned", res.status, body.slice(0, 400));
        }
      } catch (e) {
        console.error("[coach] perplexity fetch failed:", e);
      }
    }

    const saved = await prisma.coachMessage.create({
      data: { userId, role: "assistant", content: assistantText },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    const serialized = serializeMessage(saved);
    if (citations.length > 0) serialized.citations = citations;
    return NextResponse.json({ message: serialized });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : "Failed to send message";
    console.error("[coach] unexpected:", err);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
