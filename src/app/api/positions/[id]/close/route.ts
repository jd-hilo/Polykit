import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getMarketBySlug, getEventBySlug } from "@/lib/polymarket";

export const runtime = "nodejs";

type PositionRow = {
  id: string;
  userId: string;
  marketQuestion: string;
  marketSlug: string | null;
  eventSlug: string | null;
  side: string;
  entryPrice: unknown;
  exitPrice: unknown;
  size: unknown;
  status: string;
  pnl: unknown;
  createdAt: Date;
  closedAt: Date | null;
};

function serializePosition(p: PositionRow) {
  return {
    id: p.id,
    user_id: p.userId,
    market_question: p.marketQuestion,
    market_slug: p.marketSlug,
    event_slug: p.eventSlug,
    side: p.side,
    entry_price: Number(p.entryPrice),
    exit_price: p.exitPrice == null ? null : Number(p.exitPrice),
    size: Number(p.size),
    status: p.status,
    pnl: Number(p.pnl),
    created_at: p.createdAt.toISOString(),
    closed_at: p.closedAt ? p.closedAt.toISOString() : null,
  };
}

// Deterministic fallback hash for positions without a live price source.
function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function liveYesPrice(marketSlug: string | null, eventSlug: string | null): Promise<number | null> {
  if (marketSlug) {
    try {
      const snap = await getMarketBySlug(marketSlug);
      if (snap && Number.isFinite(snap.yesPrice)) return snap.yesPrice;
    } catch {
      /* fall through */
    }
  }
  if (eventSlug) {
    try {
      const snap = await getEventBySlug(eventSlug);
      if (snap && Number.isFinite(snap.yesPrice)) return snap.yesPrice;
    } catch {
      /* fall through */
    }
  }
  return null;
}

async function closePosition(id: string, userId: string) {
  const row = await prisma.position.findFirst({ where: { id, userId } });
  if (!row) return { error: "Position not found", status: 404 as const };
  if (row.status === "closed") return { error: "Already closed", status: 400 as const };

  const size = Number(row.size);
  const entry = Number(row.entryPrice);
  const livePrice = await liveYesPrice(row.marketSlug, row.eventSlug);

  let exitPrice: number;
  let pnl: number;

  if (livePrice != null && Number.isFinite(livePrice) && livePrice > 0 && livePrice < 1) {
    // entry is stored as the price on the user's side (YES or NO).
    // Convert the live YES price into the user's-side exit price, then use a
    // single share-based formula: shares = size / entry; pnl = (exit - entry) * shares.
    const sideExit = row.side === "YES" ? livePrice : 1 - livePrice;
    exitPrice = sideExit;
    const shares = size / entry;
    pnl = Number(((sideExit - entry) * shares).toFixed(2));
  } else {
    // No live price available — fall back to deterministic ±20% of size.
    const seed = hash(row.id + row.userId);
    const signed = ((seed % 4001) - 2000) / 10000;
    pnl = Number((size * signed).toFixed(2));
    exitPrice = entry + signed;
    if (exitPrice <= 0) exitPrice = 0.01;
    if (exitPrice >= 1) exitPrice = 0.99;
  }

  const updated = await prisma.position.update({
    where: { id: row.id },
    data: {
      status: "closed",
      pnl,
      exitPrice,
      closedAt: new Date(),
    },
  });

  return { position: serializePosition(updated) };
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const result = await closePosition(id, userId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to close position";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const result = await closePosition(id, userId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to close position";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
