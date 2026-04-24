import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isUserSubscribed } from "@/lib/subscription";
import {
  getPolymarketLeaderboard,
  type LeaderboardMetric,
  type LeaderboardWindow,
} from "@/lib/polymarket";

export const runtime = "nodejs";

function parseMetric(v: string | null): LeaderboardMetric {
  return v === "volume" ? "volume" : "profit";
}

function parseWindow(v: string | null): LeaderboardWindow {
  if (v === "1d" || v === "7d" || v === "30d" || v === "all") return v;
  // Back-compat aliases for older clients.
  if (v === "day") return "1d";
  if (v === "week") return "7d";
  if (v === "month") return "30d";
  return "30d";
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const metric = parseMetric(url.searchParams.get("metric"));
    const window = parseWindow(url.searchParams.get("window"));
    const limitRaw = Number(url.searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(50, Math.round(limitRaw)))
      : 50;

    // Fetch in parallel but isolate failures so one dead dependency
    // (Prisma / Polymarket) doesn't blank the whole response.
    const [rowsResult, unlockedResult] = await Promise.allSettled([
      getPolymarketLeaderboard({ metric, window, limit }),
      isUserSubscribed(userId),
    ]);

    if (rowsResult.status === "rejected") {
      const msg =
        rowsResult.reason instanceof Error
          ? rowsResult.reason.message
          : "Polymarket leaderboard unavailable";
      console.error("[leaderboard] polymarket fetch failed:", msg);
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const unlocked =
      unlockedResult.status === "fulfilled" ? unlockedResult.value : false;

    return NextResponse.json({
      rows: rowsResult.value.slice(0, 50),
      metric,
      window,
      unlocked,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load leaderboard";
    console.error("[leaderboard] unexpected error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
