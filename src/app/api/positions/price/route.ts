import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getMarketBySlug, getEventBySlug } from "@/lib/polymarket";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").trim();
  const eventSlug = (url.searchParams.get("event") || "").trim();
  if (!slug && !eventSlug) {
    return NextResponse.json({ error: "slug or event is required" }, { status: 400 });
  }

  if (slug) {
    try {
      const snap = await getMarketBySlug(slug);
      if (snap && Number.isFinite(snap.yesPrice)) {
        return NextResponse.json({ yesPrice: snap.yesPrice });
      }
    } catch {
      /* fall through to event lookup */
    }
  }
  if (eventSlug) {
    try {
      const snap = await getEventBySlug(eventSlug);
      if (snap && Number.isFinite(snap.yesPrice)) {
        return NextResponse.json({ yesPrice: snap.yesPrice });
      }
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ yesPrice: null });
}
