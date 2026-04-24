import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.userId;
      if (userId) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;

        let status: string | null = null;
        let periodEnd: Date | null = null;
        if (subId) {
          const sub = await stripe().subscriptions.retrieve(subId);
          status = sub.status;
          const firstItem = sub.items?.data?.[0];
          const cpe = firstItem?.current_period_end;
          if (cpe) periodEnd = new Date(cpe * 1000);
        }

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: customerId ?? null,
            stripeSubscriptionId: subId ?? null,
            status: status ?? "active",
            currentPeriodEnd: periodEnd,
          },
          update: {
            stripeCustomerId: customerId ?? null,
            stripeSubscriptionId: subId ?? null,
            status: status ?? "active",
            currentPeriodEnd: periodEnd,
          },
        });
      }
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (userId) {
        const firstItem = sub.items?.data?.[0];
        const cpe = firstItem?.current_period_end;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const periodEnd = cpe ? new Date(cpe * 1000) : null;

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            status: sub.status,
            currentPeriodEnd: periodEnd,
          },
          update: {
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            status: sub.status,
            currentPeriodEnd: periodEnd,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
