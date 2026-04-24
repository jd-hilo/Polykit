import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const existing = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    });

    const customerId = existing?.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json({ error: "No billing account found" }, { status: 404 });
    }

    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Portal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
