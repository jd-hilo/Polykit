import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LAUNCH_FEATURE = "mcp";

// Best-effort per-IP throttle. Serverless caveat: memory is per-instance and
// resets on cold start, so this is a speed bump rather than a hard limit.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { email, company } = body as { email?: string; company?: string };

  // Honeypot: real users never see this field. Fake success for bots.
  if (company) return NextResponse.json({ ok: true });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (throttled(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(normalized) || normalized.length > 254) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  try {
    await prisma.waitlistEntry.create({
      data: { email: normalized, feature: LAUNCH_FEATURE },
    });
  } catch (err) {
    const isDupe =
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
    // Duplicate email → treat as success (idempotent, no enumeration signal).
    if (!isDupe) {
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
