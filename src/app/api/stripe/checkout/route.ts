import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Derive the public origin of the request from the incoming headers.
 * We use this (rather than NEXT_PUBLIC_APP_URL or VERCEL_URL) so the
 * post-checkout redirect lands on the SAME host the user signed in
 * on — Clerk's session cookies are scoped to that exact host. If we
 * always sent users to `www.polykit.co` but they originally signed
 * in on `polykit.co` (or vice versa), they'd be bounced to sign-in
 * after paying because the cookie doesn't follow them across hosts.
 */
function originFromRequest(req: NextRequest): string {
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "www.polykit.co";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Create a Whop checkout session for the signed-in user and return the
 * hosted-checkout URL the client should redirect to.
 *
 * Canonical Whop flow (per https://docs.whop.com/api-reference/v2/checkout-sessions/create-a-checkout-session):
 *   POST https://api.whop.com/api/v2/checkout_sessions
 *   body: { plan_id, redirect_url, metadata }
 *   response: { id, purchase_url, ... }
 *
 * `metadata.clerk_user_id` propagates through to the membership and into
 * every webhook event for this purchase, so the webhook handler can map
 * the Whop membership back to the right Clerk userId without guessing.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.WHOP_API_KEY;
  const planId = process.env.WHOP_PLAN_ID;
  if (!apiKey || !planId) {
    return NextResponse.json({ error: "Checkout not configured" }, { status: 500 });
  }

  let email: string | null = null;
  try {
    const user = await currentUser();
    email = user?.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    /* ignore */
  }

  // If a webhook previously recorded a Whop membership keyed by this email
  // (because the user purchased before being signed in to Polykit), claim
  // that row by re-keying it to the Clerk userId.
  if (email) {
    const lower = email.toLowerCase();
    try {
      const orphan = await prisma.subscription.findFirst({
        where: { userId: `whop:${lower}`, email: lower },
        select: { userId: true },
      });
      if (orphan) {
        await prisma.$transaction(async (tx) => {
          const data = await tx.subscription.findUnique({ where: { userId: orphan.userId } });
          if (!data) return;
          await tx.subscription.delete({ where: { userId: orphan.userId } });
          await tx.subscription.upsert({
            where: { userId },
            create: { ...data, userId },
            update: {
              whopMembershipId: data.whopMembershipId,
              whopUserId: data.whopUserId,
              whopPlanId: data.whopPlanId,
              whopManageUrl: data.whopManageUrl,
              email: data.email,
              status: data.status,
              expiresAt: data.expiresAt,
            },
          });
        });
      }
    } catch (e) {
      console.error("[checkout] failed to claim orphan whop row", e);
    }
  }

  // AuthProvider listens for `?upgraded=1` to short-circuit the paywall and
  // show a success toast. Use that flag so the post-checkout return reliably
  // suppresses the "you don't have access" modals even before the webhook
  // has finished writing the subscription row.
  const redirectUrl = `${originFromRequest(req)}/dashboard?upgraded=1`;

  // Create the session via Whop's API.
  let resp: Response;
  try {
    resp = await fetch("https://api.whop.com/api/v2/checkout_sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        redirect_url: redirectUrl,
        metadata: { clerk_user_id: userId },
      }),
      cache: "no-store",
    });
  } catch (e) {
    console.error("[checkout] network error talking to Whop", e);
    return NextResponse.json({ error: "Whop unreachable" }, { status: 502 });
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("[checkout] Whop session create failed status=%d body=%s", resp.status, text);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 502 });
  }

  const session = (await resp.json()) as {
    id?: string;
    purchase_url?: string;
  };

  if (!session.purchase_url) {
    console.error("[checkout] Whop response missing purchase_url: %j", session);
    return NextResponse.json({ error: "Invalid checkout response" }, { status: 502 });
  }

  return NextResponse.json({ url: session.purchase_url });
}
