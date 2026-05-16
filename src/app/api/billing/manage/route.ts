import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Returns the URL the current user should visit to manage / cancel their
 * Whop subscription. Webhooks stamp a specific `mber_<id>` URL on each row;
 * if we don't have one yet (rare — only for legacy rows), fall back to the
 * generic Whop billing portal which lists all of their memberships.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.subscription.findUnique({
    where: { userId },
    select: { whopManageUrl: true },
  });

  const url = row?.whopManageUrl ?? "https://whop.com/@me/settings/orders/";
  return NextResponse.json({ url });
}
