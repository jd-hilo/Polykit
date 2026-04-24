import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const STARTING_BALANCE = 100_000;

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

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await prisma.position.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const positions = rows.map(serializePosition);
    const openSizes = positions
      .filter((p) => p.status === "open")
      .reduce((sum, p) => sum + Number(p.size ?? 0), 0);
    const totalPnl = positions.reduce((sum, p) => sum + Number(p.pnl ?? 0), 0);
    const balance = STARTING_BALANCE + totalPnl - openSizes;

    return NextResponse.json({
      positions,
      balance,
      pnl: totalPnl,
      openSizes,
      startingBalance: STARTING_BALANCE,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load positions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Accept both legacy snake_case and new camelCase keys.
  const b = body as Record<string, unknown>;
  const market_question = (b.market_question ?? b.marketQuestion) as string | undefined;
  const market_slug = (b.market_slug ?? b.marketSlug) as string | undefined;
  const event_slug = (b.event_slug ?? b.eventSlug) as string | undefined;
  const side = b.side as string | undefined;
  const entry_price = (b.entry_price ?? b.entryPrice) as number | undefined;
  const size = b.size as number | undefined;

  if (!market_question || typeof market_question !== "string" || market_question.length < 3) {
    return NextResponse.json({ error: "market_question is required" }, { status: 400 });
  }
  if (side !== "YES" && side !== "NO") {
    return NextResponse.json({ error: "side must be YES or NO" }, { status: 400 });
  }
  const price = Number(entry_price);
  if (!Number.isFinite(price) || price <= 0 || price >= 1) {
    return NextResponse.json({ error: "entry_price must be between 0 and 1" }, { status: 400 });
  }
  const sz = Number(size);
  if (!Number.isFinite(sz) || sz <= 0) {
    return NextResponse.json({ error: "size must be positive" }, { status: 400 });
  }

  try {
    const existing = await prisma.position.findMany({
      where: { userId },
      select: { status: true, size: true, pnl: true },
    });
    const openSizes = existing
      .filter((p) => p.status === "open")
      .reduce((s, p) => s + Number(p.size ?? 0), 0);
    const totalPnl = existing.reduce((s, p) => s + Number(p.pnl ?? 0), 0);
    const balance = STARTING_BALANCE + totalPnl - openSizes;
    if (sz > balance) {
      return NextResponse.json(
        { error: `Insufficient virtual balance (available $${balance.toFixed(2)})` },
        { status: 400 }
      );
    }

    const created = await prisma.position.create({
      data: {
        userId,
        marketQuestion: market_question,
        marketSlug: market_slug ?? null,
        eventSlug: event_slug ?? null,
        side,
        entryPrice: price,
        size: sz,
        status: "open",
        pnl: 0,
      },
    });

    return NextResponse.json({ position: serializePosition(created) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create position";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
