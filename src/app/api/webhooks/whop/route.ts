import { NextResponse } from "next/server";
import crypto from "crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ─────────────────────────────────────────────────────────────
 * Whop webhook endpoint.
 *
 * Whop signs each webhook with HMAC-SHA256 using your webhook secret.
 * Set the secret in Vercel env vars as WHOP_WEBHOOK_SECRET.
 * Whop dashboard → your product → Webhooks → endpoint URL =
 *   https://www.polykit.co/api/webhooks/whop
 *
 * Whop event shape (v2):
 *   {
 *     action: "membership.went_valid" | "membership.went_invalid" | "payment.succeeded" | ...,
 *     data: {
 *       id: "mem_xxx",
 *       user_id: "user_xxx",
 *       plan_id: "plan_xxx",
 *       user: { email: "..." },
 *       status: "active" | "canceled" | "expired" | "past_due" | "trialing",
 *       valid: true,
 *       expires_at: 1748736000,        // unix seconds, optional
 *       renewal_period_end: 1748736000,
 *       metadata: { clerk_user_id?: string }
 *     }
 *   }
 *
 * NOTE: Whop's exact payload shape can drift between API versions. This
 * handler reads defensively (optional chains + several fallback fields).
 * ───────────────────────────────────────────────────────────── */

type WhopEvent = {
  action?: string;
  type?: string;
  data?: WhopMembership;
};

type WhopMembership = {
  id?: string;
  user_id?: string;
  plan_id?: string;
  product_id?: string;
  plan?: { id?: string };
  product?: { id?: string };
  status?: string;
  valid?: boolean;
  expires_at?: number | string | null;
  renewal_period_end?: number | string | null;
  cancel_at_period_end?: boolean;
  user?: { id?: string; email?: string };
  email?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function hmac(secret: string, payload: string, encoding: "hex" | "base64"): string {
  return crypto.createHmac("sha256", secret).update(payload).digest(encoding);
}

/**
 * Decode the Whop webhook secret into raw key bytes.
 *
 * Whop uses Svix under the hood. Svix's official secret format is
 * `whsec_<base64>`. Whop wraps it as `ws_<hex>` — strip the prefix and
 * hex-decode to get the actual HMAC key. We also try the raw string as
 * a fallback in case the format changes.
 */
function secretCandidates(secret: string): Buffer[] {
  const out: Buffer[] = [];
  // Strategy 1: ws_<hex> → hex bytes
  if (secret.startsWith("ws_")) {
    const hex = secret.slice(3);
    if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0) {
      out.push(Buffer.from(hex, "hex"));
    }
  }
  // Strategy 2: whsec_<base64> (standard Svix)
  if (secret.startsWith("whsec_")) {
    try {
      out.push(Buffer.from(secret.slice(6), "base64"));
    } catch {
      /* ignore */
    }
  }
  // Strategy 3: raw secret string as bytes
  out.push(Buffer.from(secret, "utf8"));
  return out;
}

function svixSign(keyBytes: Buffer, payload: string): string {
  return crypto.createHmac("sha256", keyBytes).update(payload).digest("base64");
}

function verifySvix(
  rawBody: string,
  webhookId: string | null,
  webhookTimestamp: string | null,
  webhookSignature: string | null,
  secret: string,
): boolean {
  if (!webhookId || !webhookTimestamp || !webhookSignature) return false;

  const signedPayload = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  // Header may contain multiple space-separated "v1,<sig>" entries (key rotation).
  const provided = webhookSignature
    .split(" ")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      // "v1,<base64>" — comma separates version from sig.
      const i = entry.indexOf(",");
      return i >= 0 ? { version: entry.slice(0, i), sig: entry.slice(i + 1) } : null;
    })
    .filter((x): x is { version: string; sig: string } => x !== null && x.version === "v1");

  if (provided.length === 0) return false;

  for (const keyBytes of secretCandidates(secret)) {
    const expected = svixSign(keyBytes, signedPayload);
    for (const p of provided) {
      if (safeEq(p.sig, expected)) {
        console.log("[whop-webhook] sig OK (svix, keyLen=%d)", keyBytes.length);
        return true;
      }
    }
  }
  console.warn(
    "[whop-webhook] sig FAIL (svix). providedCount=%d firstSigLen=%d signedPayloadLen=%d",
    provided.length,
    provided[0]?.sig.length ?? 0,
    signedPayload.length,
  );
  return false;
}

function verifyLegacy(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  // Stripe-style "t=...,v1=..."
  if (signature.includes("t=") && signature.includes("v1=")) {
    const parts = Object.fromEntries(
      signature.split(",").map((kv) => {
        const i = kv.indexOf("=");
        return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
      }),
    );
    if (!parts.t || !parts.v1) return false;
    const expected = hmac(secret, `${parts.t}.${rawBody}`, "hex");
    return safeEq(parts.v1, expected);
  }
  // Plain hex or base64
  const cleaned = signature.replace(/^sha256=/i, "").trim();
  return (
    safeEq(cleaned, hmac(secret, rawBody, "hex")) ||
    safeEq(cleaned, hmac(secret, rawBody, "base64"))
  );
}

function parseTimestamp(v: number | string | null | undefined): Date | null {
  if (v == null) return null;
  if (typeof v === "number") {
    // Heuristic: Whop sends seconds. Anything < 10^12 is seconds, else ms.
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

function normalizeStatus(action: string | undefined, m: WhopMembership): string {
  // Trust the membership's status string first when present.
  if (m.status && typeof m.status === "string") {
    const s = m.status.toLowerCase();
    // "paid" comes from payment events — map to active (those are filtered
    // out upstream now, but defend anyway).
    if (s === "paid" || s === "successful") return "active";
    return s;
  }

  // Otherwise derive from the action.
  const a = (action ?? "").toLowerCase();
  if (a.includes("activated") || a.includes("went_valid")) return "active";
  if (a.includes("went_invalid") || a.includes("deactivated") || a.includes("expired"))
    return "expired";
  if (a.includes("canceled") || a.includes("cancelled")) return "canceled";
  if (a.includes("past_due")) return "past_due";
  return "unknown";
}

export async function POST(req: Request) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[whop-webhook] WHOP_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rawBody = await req.text();

  // Svix-style headers (current Whop format).
  const svixId = req.headers.get("webhook-id") ?? req.headers.get("svix-id");
  const svixTimestamp =
    req.headers.get("webhook-timestamp") ?? req.headers.get("svix-timestamp");
  const svixSignature =
    req.headers.get("webhook-signature") ?? req.headers.get("svix-signature");

  // Legacy headers (older Whop / custom HMAC).
  const legacySig =
    req.headers.get("x-whop-signature") ??
    req.headers.get("whop-signature") ??
    req.headers.get("x-signature");

  const ok =
    verifySvix(rawBody, svixId, svixTimestamp, svixSignature, secret) ||
    verifyLegacy(rawBody, legacySig, secret);

  if (!ok) {
    const sigHeaders: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      const lk = k.toLowerCase();
      if (lk.includes("sig") || lk.includes("whop") || lk.includes("webhook") || lk.includes("svix")) {
        sigHeaders[k] = v;
      }
    });
    console.warn(
      "[whop-webhook] signature verification failed. headers=%s bodyPrefix=%s",
      JSON.stringify(sigHeaders),
      rawBody.slice(0, 80),
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: WhopEvent;
  try {
    event = JSON.parse(rawBody) as WhopEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = event.action ?? event.type ?? "";
  const m = event.data ?? {};

  // Skip payment.* events — Whop fires them alongside membership.* events
  // for the same purchase, but they contain a *payment* object (status: "paid",
  // id: pay_xxx) rather than a membership. Trusting their status overwrites
  // the good "trialing"/"active" row from the membership event. Membership
  // events carry everything we need.
  if (action.toLowerCase().startsWith("payment.")) {
    console.log("[whop-webhook] ignored payment.* event (action=%s)", action);
    return NextResponse.json({ ok: true, skipped: "payment event" });
  }

  // Resolve the Clerk userId for this membership. Prefer metadata (set when
  // we redirect to checkout), fall back to looking up by email.
  const clerkUserIdFromMeta =
    typeof m.metadata?.clerk_user_id === "string" ? (m.metadata.clerk_user_id as string) : null;
  const email = (m.user?.email ?? m.email ?? "").toLowerCase().trim() || null;

  if (!clerkUserIdFromMeta && !email) {
    console.warn("[whop-webhook] event missing clerk_user_id and email, action=%s", action);
    return NextResponse.json({ ok: true, skipped: "no user identifier" });
  }

  const status = normalizeStatus(action, m);
  const expiresAt =
    parseTimestamp(m.expires_at) ?? parseTimestamp(m.renewal_period_end) ?? null;

  // Find or determine the userId for the upsert key.
  let userId = clerkUserIdFromMeta;

  // Fallback 1 — DB lookup by email (matches if we previously stored a row).
  if (!userId && email) {
    const existing = await prisma.subscription.findFirst({
      where: { email },
      select: { userId: true },
    });
    userId = existing?.userId ?? null;
  }

  // Fallback 2 — ask Clerk directly. If a Clerk user exists with this email,
  // use their userId. This handles the common case where the user signed up
  // for Polykit but the metadata didn't get forwarded through Whop.
  if (!userId && email) {
    try {
      const client = await clerkClient();
      const list = await client.users.getUserList({ emailAddress: [email] });
      // Prefer a user whose PRIMARY email matches (Clerk allows multiple).
      const match =
        list.data.find((u) => {
          const primaryId = u.primaryEmailAddressId;
          const primary = u.emailAddresses.find((e) => e.id === primaryId);
          return primary?.emailAddress?.toLowerCase() === email;
        }) ?? list.data[0];
      if (match) {
        userId = match.id;
        console.log("[whop-webhook] resolved Clerk userId via email lookup: %s", userId);
      }
    } catch (e) {
      console.error("[whop-webhook] Clerk email lookup failed", e);
    }
  }

  if (!userId) {
    // No Clerk user we can map to — record the membership keyed by email so
    // the next checkout call from this user can claim it. Use a special prefix.
    console.log(
      "[whop-webhook] no Clerk userId yet; storing keyed by email=%s action=%s",
      email,
      action,
    );
    // We need a userId as primary key. Use email-prefixed placeholder.
    userId = `whop:${email}`;
  }

  const data = {
    userId,
    whopMembershipId: m.id ?? null,
    whopUserId: m.user?.id ?? m.user_id ?? null,
    whopPlanId: m.plan?.id ?? m.plan_id ?? m.product?.id ?? m.product_id ?? null,
    email,
    status,
    expiresAt,
  };

  try {
    await prisma.subscription.upsert({
      where: { userId },
      create: data,
      update: {
        whopMembershipId: data.whopMembershipId,
        whopUserId: data.whopUserId,
        whopPlanId: data.whopPlanId,
        email: data.email,
        status: data.status,
        expiresAt: data.expiresAt,
      },
    });
  } catch (e) {
    console.error("[whop-webhook] upsert failed", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  console.log(
    "[whop-webhook] %s — userId=%s email=%s status=%s expiresAt=%s",
    action,
    userId,
    email,
    status,
    expiresAt?.toISOString() ?? "null",
  );

  return NextResponse.json({ ok: true });
}

// Whop sometimes pings GET to validate the endpoint exists.
export async function GET() {
  return NextResponse.json({ ok: true, service: "whop-webhook" });
}
