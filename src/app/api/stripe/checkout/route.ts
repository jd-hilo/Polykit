import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_WHOP_CHECKOUT_URL;
  if (!baseUrl) {
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
        // Use a transaction-style swap: delete the old row, upsert new key.
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

  // Pre-fill the Whop checkout email and pass clerk_user_id as metadata so
  // the webhook can map the membership back to this Polykit user.
  let url = baseUrl;
  if (email) {
    try {
      const u = new URL(baseUrl);
      u.searchParams.set("email", email);
      u.searchParams.set("metadata[clerk_user_id]", userId);
      url = u.toString();
    } catch {
      /* base URL malformed — fall through */
    }
  }

  return NextResponse.json({ url });
}
