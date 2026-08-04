// OAuth 2.1 token endpoint: authorization_code exchange and refresh_token
// rotation. Public clients only, so PKCE carries the security rather than a
// client secret.
import { consumeCode, issueTokens, rotateRefreshToken } from "@/lib/oauth";
import { isUserSubscribed } from "@/lib/subscription";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
  // Tokens must never be cached by an intermediary.
  "Cache-Control": "no-store",
};

function fail(error: string, description: string, status = 400) {
  return Response.json({ error, error_description: description }, { status, headers: CORS });
}

/** Accept form-encoded (per spec) and JSON (some clients send it anyway). */
async function readParams(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const json = (await req.json()) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(json).map(([k, v]) => [k, typeof v === "string" ? v : String(v ?? "")]),
      );
    } catch {
      return {};
    }
  }
  try {
    const form = await req.formData();
    const out: Record<string, string> = {};
    for (const [k, v] of form.entries()) out[k] = typeof v === "string" ? v : "";
    return out;
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const p = await readParams(req);

  // A public client may also send credentials via Basic auth; take the
  // client_id from there if the body omitted it.
  let clientId = p.client_id ?? "";
  if (!clientId) {
    const authz = req.headers.get("authorization");
    if (authz?.toLowerCase().startsWith("basic ")) {
      try {
        const decoded = Buffer.from(authz.slice(6), "base64").toString("utf8");
        clientId = decoded.split(":")[0] ?? "";
      } catch {
        /* ignore */
      }
    }
  }
  if (!clientId) return fail("invalid_request", "client_id is required.");

  const grantType = p.grant_type ?? "";

  if (grantType === "authorization_code") {
    const { code, redirect_uri: redirectUri, code_verifier: codeVerifier } = p;
    if (!code) return fail("invalid_request", "code is required.");
    if (!redirectUri) return fail("invalid_request", "redirect_uri is required.");
    if (!codeVerifier) return fail("invalid_request", "code_verifier is required (PKCE).");

    const result = await consumeCode({ code, clientId, redirectUri, codeVerifier });
    if (!result.ok) return fail(result.error, result.description);

    // Re-check entitlement at issuance: the code may have been minted before a
    // cancellation landed.
    if (!(await isUserSubscribed(result.userId))) {
      return fail("access_denied", "Subscription is not active.", 403);
    }

    const tokens = await issueTokens({
      clientId: result.clientId,
      userId: result.userId,
      scope: result.scope,
    });
    return Response.json(tokens, { headers: CORS });
  }

  if (grantType === "refresh_token") {
    const refreshToken = p.refresh_token;
    if (!refreshToken) return fail("invalid_request", "refresh_token is required.");

    const rotated = await rotateRefreshToken({ refreshToken, clientId });
    if ("error" in rotated) return fail(rotated.error, rotated.description);
    return Response.json(rotated, { headers: CORS });
  }

  return fail(
    "unsupported_grant_type",
    "Supported grant types are authorization_code and refresh_token.",
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
