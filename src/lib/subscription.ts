import { currentUser } from "@clerk/nextjs/server";
import { checkWhopAccess } from "./whop";
import { prisma } from "./prisma";

// How long we trust a DB-cached "active"/"trialing" row before re-verifying
// against Whop's live API. Whop only fires `membership.deactivated` webhooks
// for user-initiated cancellations — admin terminations from the Whop
// dashboard are silent, so without staleness re-checks a terminated user
// would keep access indefinitely.
const STALE_CACHE_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Returns true when the user has active access — meaning a subscription row
 * in our DB exists with status=active|trialing AND expires_at is in the
 * future (or null, indicating no expiry).
 *
 * Flow:
 *   1. Dev bypass (only when DEV_UNLOCK_SUBSCRIPTION ≠ "0" in non-prod).
 *   2. Look up subscriptions row keyed by Clerk userId — fast path (~5ms).
 *      Webhook keeps this row in sync, so this should be authoritative.
 *   2a. If that row is more than 24h old, re-verify with Whop's live API
 *       once (and refresh the row). Catches admin terminations and other
 *       webhook misses.
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
  let cached: {
    status: string | null;
    expiresAt: Date | null;
    updatedAt: Date;
    email: string | null;
  } | null = null;
  try {
    cached = await prisma.subscription.findUnique({
      where: { userId },
      select: { status: true, expiresAt: true, updatedAt: true, email: true },
    });
  } catch (e) {
    console.error("[isUserSubscribed] DB read failed, falling back to API", e);
  }

  if (cached && isActiveRow(cached.status, cached.expiresAt)) {
    const ageMs = Date.now() - cached.updatedAt.getTime();
    const isStale = ageMs > STALE_CACHE_MS;

    // Fresh cache hit — trust it.
    if (!isStale) return true;

    // Stale: re-verify with Whop. Without an email we can't query Whop,
    // so trust the cache rather than locking the user out incorrectly.
    if (!cached.email) return true;

    const stillValid = await checkWhopAccess(cached.email);
    if (stillValid) {
      // Refresh updatedAt so we don't re-check for another 24h. Setting
      // status to the same value still triggers @updatedAt on the row.
      try {
        await prisma.subscription.update({
          where: { userId },
          data: { status: cached.status ?? "active" },
        });
      } catch {
        /* non-fatal */
      }
      return true;
    }

    // Whop says no — the user lost their membership (admin termination,
    // refund handled outside webhooks, etc.). Mark the row expired so
    // we don't keep re-checking, and revoke access.
    console.log("[isUserSubscribed] stale-cache revoke userId=%s email=%s", userId, cached.email);
    try {
      await prisma.subscription.update({
        where: { userId },
        data: { status: "expired" },
      });
    } catch {
      /* non-fatal */
    }
    return false;
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

  // "active" / "trialing" — full access while expiresAt is in the future
  // (or forever if expiresAt is null).
  if (s === "active" || s === "trialing") {
    if (!expiresAt) return true;
    return expiresAt.getTime() > Date.now();
  }

  // "canceled" — the user opted out of renewal, but they paid for the
  // current period. Grant access until expiresAt passes. After that, the
  // row falls through to expired below.
  if (s === "canceled" || s === "cancelled") {
    return !!expiresAt && expiresAt.getTime() > Date.now();
  }

  // Everything else (expired, past_due, unpaid, refunded, unknown) → no access.
  return false;
}
