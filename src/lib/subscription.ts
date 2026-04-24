import { prisma } from "@/lib/prisma";

/**
 * Returns true when the user has an active (or trialing) subscription row.
 * Safe to call without the DB configured — returns false in that case.
 */
export async function isUserSubscribed(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  // Dev bypass: treat everyone as subscribed until Stripe is wired up.
  // Remove this block (or set DEV_UNLOCK_SUBSCRIPTION=0) once Stripe is live.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_UNLOCK_SUBSCRIPTION !== "0"
  ) {
    return true;
  }
  try {
    const row = await prisma.subscription.findUnique({
      where: { userId },
      select: { status: true },
    });
    const status = row?.status;
    return status === "active" || status === "trialing";
  } catch {
    return false;
  }
}
