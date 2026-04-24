import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { email, feature } = body as { email?: string; feature?: string };
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!feature || typeof feature !== "string" || feature.length < 1) {
    return NextResponse.json({ error: "feature required" }, { status: 400 });
  }

  try {
    await prisma.waitlistEntry.create({
      data: { userId, email: email.trim().toLowerCase(), feature },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save entry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
