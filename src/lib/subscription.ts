import { currentUser } from "@clerk/nextjs/server";
import { checkWhopAccess } from "./whop";
import { prisma } from "./prisma";

/**
 * Returns true when the user has active access — meaning a subscription row
 * in our DB exists with status=active|trialing AND expires_at is in the
 * future (or null, indicating no expiry).
 *
 * Flow:
 *   1. Dev bypass (only when DEV_UNLOCK_SUBSCRIPTION ≠ "0" in non-prod).
 *   2. Look up subscriptions row keyed by Clerk userId — fast path (~5ms).
 *      Webhook keeps this row in sync, so this should be authoritative.
 *   3. If no row exists yet — possible on first purchase before webhook fires
 *      — fall back to a live Whop API check by email. If that returns true,
 *      lazily upsert a row so subsequent reads are fast.
 */
export async function isUserSubscribed(
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;

  // Dev bypass — only outside production, and only if explicitly enabled.
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_UNLOCK_SUBSCRIPTION !== "0"
  ) {
    return true;
  }

  // Path 1 — DB cache.
  try {
    const row = await prisma.subscription.findUnique({
      where: { userId },
      select: { status: true, expiresAt: true },
    });
    if (row && isActiveRow(row.status, row.expiresAt)) {
      return true;
    }
  } catch (e) {
    console.error("[isUserSubscribed] DB read failed, falling back to API", e);
  }

  // Path 2 — fall back to live Whop API by email. Handles:
  //   • First purchase before webhook fires
  //   • Webhook failures
  //   • Users created in Whop manually
  let email: string | null = null;
  try {
    const user = await currentUser();
    email = user?.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    return false;
  }
  if (!email) return false;

  const hasWhop = await checkWhopAccess(email);
  if (hasWhop) {
    // Lazily backfill the DB so future checks are fast. Best-effort.
    try {
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          email: email.toLowerCase(),
          status: "active",
        },
        update: {
          email: email.toLowerCase(),
          status: "active",
        },
      });
    } catch {
      /* non-fatal */
    }
    return true;
  }

  return false;
}

function isActiveRow(
  status: string | null | undefined,
  expiresAt: Date | null | undefined,
): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  const okStatus = s === "active" || s === "trialing";
  if (!okStatus) return false;
  if (!expiresAt) return true; // null expiry → permanent access
  return expiresAt.getTime() > Date.now();
}
