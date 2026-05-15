import { NextResponse } from "next/server";
import crypto from "crypto";
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

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;

  // Format A — Stripe-style: "t=<unix>,v1=<hex>" (Whop v2+ uses this)
  //   Signed payload = "<unix>.<rawBody>"
  if (signature.includes("t=") && signature.includes("v1=")) {
    const parts = Object.fromEntries(
      signature.split(",").map((kv) => {
        const i = kv.indexOf("=");
        return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
      }),
    );
    const t = parts.t;
    const v1 = parts.v1;
    if (!t || !v1) return false;
    const expected = hmac(secret, `${t}.${rawBody}`, "hex");
    if (safeEq(v1, expected)) {
      console.log("[whop-webhook] sig OK (v1 timestamp format)");
      return true;
    }
    console.warn("[whop-webhook] sig FAIL (v1 timestamp format). v1.len=%d expected.len=%d",
      v1.length, expected.length);
    return false;
  }

  // Format B — Plain hex or base64, optionally with "sha256=" prefix.
  const cleaned = signature.replace(/^sha256=/i, "").trim();
  const expectedHex = hmac(secret, rawBody, "hex");
  const expectedB64 = hmac(secret, rawBody, "base64");
  if (safeEq(cleaned, expectedHex)) {
    console.log("[whop-webhook] sig OK (hex format)");
    return true;
  }
  if (safeEq(cleaned, expectedB64)) {
    console.log("[whop-webhook] sig OK (base64 format)");
    return true;
  }
  console.warn(
    "[whop-webhook] sig FAIL (plain). got.len=%d hex.len=%d b64.len=%d sample=%s",
    cleaned.length,
    expectedHex.length,
    expectedB64.length,
    cleaned.slice(0, 12),
  );
  return false;
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
  if (m.status && typeof m.status === "string") return m.status.toLowerCase();

  // Otherwise derive from the action.
  const a = (action ?? "").toLowerCase();
  if (a.includes("went_valid") || a.includes("payment.succeeded")) return "active";
  if (a.includes("went_invalid") || a.includes("expired")) return "expired";
  if (a.includes("canceled") || a.includes("cancelled")) return "canceled";
  if (a.includes("payment.failed") || a.includes("past_due")) return "past_due";
  return "unknown";
}

export async function POST(req: Request) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[whop-webhook] WHOP_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rawBody = await req.text();

  // Whop sends the signature in a header — name varies. Check a few.
  const sig =
    req.headers.get("x-whop-signature") ??
    req.headers.get("whop-signature") ??
    req.headers.get("x-signature");

  if (!verifySignature(rawBody, sig, secret)) {
    // Log every signature-related header so we can see what Whop is sending.
    const sigHeaders: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      if (k.toLowerCase().includes("sig") || k.toLowerCase().includes("whop")) {
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
  if (!userId && email) {
    const existing = await prisma.subscription.findFirst({
      where: { email },
      select: { userId: true },
    });
    userId = existing?.userId ?? null;
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
    whopPlanId: m.plan_id ?? m.product_id ?? null,
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
