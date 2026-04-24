import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PRICE_ID is not configured" },
      { status: 500 }
    );
  }

  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;

    // Reuse existing stripe customer if we already have one on file.
    let stripeCustomerId: string | undefined;
    try {
      const existing = await prisma.subscription.findUnique({
        where: { userId },
        select: { stripeCustomerId: true },
      });
      stripeCustomerId = existing?.stripeCustomerId ?? undefined;
    } catch {
      // DB may not be configured yet — that's fine for a fresh checkout.
    }

    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    // Read optional cancelPath from JSON body — falls back to /dashboard.
    let cancelPath = "/dashboard";
    try {
      const body = (await req.json()) as { cancelPath?: string } | null;
      if (body?.cancelPath && typeof body.cancelPath === "string" && body.cancelPath.startsWith("/")) {
        cancelPath = body.cancelPath;
      }
    } catch {
      // empty body is fine
    }

    const sep = cancelPath.includes("?") ? "&" : "?";
    const cancelUrl = `${origin}${cancelPath}${sep}canceled=1`;

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      customer: stripeCustomerId,
      customer_email: stripeCustomerId ? undefined : email,
      success_url: `${origin}/dashboard?upgraded=1`,
      cancel_url: cancelUrl,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
