import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const DATA_API = "https://data-api.polymarket.com";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = new URL(req.url).searchParams.get("user");
  if (!user || !/^0x[0-9a-fA-F]{40}$/.test(user)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(
      `${DATA_API}/positions?user=${encodeURIComponent(user)}&sizeThreshold=.1&limit=100`,
      {
        headers: { accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Polymarket returned ${res.status}` },
        { status: 502 },
      );
    }

    const raw = await res.json();
    const positions = Array.isArray(raw) ? raw : [];

    return NextResponse.json({ positions });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to fetch positions";
    return NextResponse.json({ error: msg }, { status: 502 });
  } finally {
    clearTimeout(t);
  }
}
