// OAuth 2.1 authorization-server helpers.
//
// Why this exists: Claude.ai's custom-connector UI only accepts a URL plus an
// optional OAuth client id/secret — there is no field for a static Bearer
// header. So a connection key alone can never connect from claude.ai. This
// module implements the minimum spec surface those clients need:
//
//   RFC 8414  authorization server metadata
//   RFC 9728  protected resource metadata
//   RFC 7591  dynamic client registration (Claude.ai registers itself)
//   RFC 7636  PKCE, S256 only
//
// Clerk still performs the actual sign-in; we only mint codes and tokens for a
// user Clerk has already authenticated and whose subscription is active.

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";

export const OAUTH_SCOPE = "analyze";
/** Authorization codes are single-use and short-lived. */
const CODE_TTL_MS = 5 * 60 * 1000;
/** Access tokens expire; clients refresh with the refresh token. */
const ACCESS_TTL_MS = 60 * 60 * 1000;

export const ACCESS_TOKEN_PREFIX = "pkoa_";
const REFRESH_TOKEN_PREFIX = "pkor_";

export function sha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function randomToken(prefix: string): string {
  return `${prefix}${randomBytes(32).toString("base64url")}`;
}

/** Constant-time string compare that tolerates length differences. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(sha256(a), "hex");
  const bb = Buffer.from(sha256(b), "hex");
  return timingSafeEqual(ab, bb);
}

/* ──────────────────────────────────────────────────────────── *
 * Metadata documents                                            *
 * ──────────────────────────────────────────────────────────── */

export function authorizationServerMetadata() {
  return {
    issuer: SITE_URL,
    authorization_endpoint: `${SITE_URL}/oauth/authorize`,
    token_endpoint: `${SITE_URL}/api/oauth/token`,
    registration_endpoint: `${SITE_URL}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    // Public clients only: Claude.ai registers dynamically and holds no secret.
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: [OAUTH_SCOPE],
    service_documentation: `${SITE_URL}/mcp`,
  };
}

export function protectedResourceMetadata() {
  return {
    resource: `${SITE_URL}/api/mcp`,
    authorization_servers: [SITE_URL],
    scopes_supported: [OAUTH_SCOPE],
    bearer_methods_supported: ["header"],
    resource_documentation: `${SITE_URL}/mcp`,
  };
}

/* ──────────────────────────────────────────────────────────── *
 * Dynamic client registration                                   *
 * ──────────────────────────────────────────────────────────── */

export async function registerClient(input: {
  clientName?: string;
  redirectUris: string[];
}) {
  const clientId = `pkoc_${randomBytes(16).toString("base64url")}`;
  await prisma.oAuthClient.create({
    data: {
      clientId,
      clientName: input.clientName ?? null,
      redirectUris: input.redirectUris,
    },
  });
  return { clientId, redirectUris: input.redirectUris };
}

export async function getClient(clientId: string) {
  if (!clientId) return null;
  return prisma.oAuthClient.findUnique({ where: { clientId } });
}

/**
 * A redirect_uri must match one the client registered. Exact match only —
 * prefix matching is how open redirectors happen.
 */
export function redirectUriAllowed(registered: string[], candidate: string): boolean {
  return registered.includes(candidate);
}

/* ──────────────────────────────────────────────────────────── *
 * Authorization codes                                           *
 * ──────────────────────────────────────────────────────────── */

export async function issueCode(input: {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope?: string;
  resource?: string | null;
}): Promise<string> {
  const code = randomToken("pkac_");
  await prisma.oAuthCode.create({
    data: {
      codeHash: sha256(code),
      clientId: input.clientId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      codeChallenge: input.codeChallenge,
      codeChallengeMethod: "S256",
      scope: input.scope ?? OAUTH_SCOPE,
      resource: input.resource ?? null,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

export type CodeExchangeResult =
  | { ok: true; userId: string; clientId: string; scope: string }
  | { ok: false; error: string; description: string };

/**
 * Validate and consume an authorization code. Enforces single use, expiry,
 * client + redirect_uri match, and the PKCE verifier.
 */
export async function consumeCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<CodeExchangeResult> {
  const row = await prisma.oAuthCode.findUnique({
    where: { codeHash: sha256(input.code) },
  });
  if (!row) {
    return { ok: false, error: "invalid_grant", description: "Unknown authorization code." };
  }
  if (row.consumedAt) {
    return { ok: false, error: "invalid_grant", description: "Authorization code already used." };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "invalid_grant", description: "Authorization code expired." };
  }
  if (row.clientId !== input.clientId) {
    return { ok: false, error: "invalid_grant", description: "Code was issued to another client." };
  }
  if (row.redirectUri !== input.redirectUri) {
    return { ok: false, error: "invalid_grant", description: "redirect_uri does not match." };
  }

  // PKCE S256: BASE64URL(SHA256(verifier)) must equal the stored challenge.
  const derived = createHash("sha256").update(input.codeVerifier).digest("base64url");
  if (!input.codeVerifier || !safeEqual(derived, row.codeChallenge)) {
    return { ok: false, error: "invalid_grant", description: "PKCE verification failed." };
  }

  // Mark consumed before issuing tokens so a race cannot double-spend it.
  const consumed = await prisma.oAuthCode.updateMany({
    where: { codeHash: row.codeHash, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count !== 1) {
    return { ok: false, error: "invalid_grant", description: "Authorization code already used." };
  }

  return { ok: true, userId: row.userId, clientId: row.clientId, scope: row.scope };
}

/* ──────────────────────────────────────────────────────────── *
 * Tokens                                                        *
 * ──────────────────────────────────────────────────────────── */

export type IssuedTokens = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};

export async function issueTokens(input: {
  clientId: string;
  userId: string;
  scope: string;
}): Promise<IssuedTokens> {
  const access = randomToken(ACCESS_TOKEN_PREFIX);
  const refresh = randomToken(REFRESH_TOKEN_PREFIX);
  const expiresAt = new Date(Date.now() + ACCESS_TTL_MS);

  await prisma.oAuthToken.createMany({
    data: [
      {
        tokenHash: sha256(access),
        tokenType: "access",
        clientId: input.clientId,
        userId: input.userId,
        scope: input.scope,
        expiresAt,
      },
      {
        // Refresh tokens do not expire on their own; revoke to kill them.
        tokenHash: sha256(refresh),
        tokenType: "refresh",
        clientId: input.clientId,
        userId: input.userId,
        scope: input.scope,
        expiresAt: null,
      },
    ],
  });

  return {
    access_token: access,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TTL_MS / 1000),
    refresh_token: refresh,
    scope: input.scope,
  };
}

/** Rotate a refresh token: validate it, revoke it, issue a fresh pair. */
export async function rotateRefreshToken(input: {
  refreshToken: string;
  clientId: string;
}): Promise<IssuedTokens | { error: string; description: string }> {
  const row = await prisma.oAuthToken.findUnique({
    where: { tokenHash: sha256(input.refreshToken) },
  });
  if (!row || row.tokenType !== "refresh" || row.revokedAt) {
    return { error: "invalid_grant", description: "Unknown or revoked refresh token." };
  }
  if (row.clientId !== input.clientId) {
    return { error: "invalid_grant", description: "Refresh token belongs to another client." };
  }

  const revoked = await prisma.oAuthToken.updateMany({
    where: { id: row.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (revoked.count !== 1) {
    return { error: "invalid_grant", description: "Refresh token already used." };
  }

  return issueTokens({ clientId: row.clientId, userId: row.userId, scope: row.scope });
}

export type AccessTokenAuth = { userId: string; clientId: string; scope: string };

/**
 * Resolve an OAuth access token to its user. Returns null for anything
 * unknown, expired, revoked, or not an access token.
 */
export async function authenticateAccessToken(raw: string): Promise<AccessTokenAuth | null> {
  if (!raw?.startsWith(ACCESS_TOKEN_PREFIX)) return null;

  const row = await prisma.oAuthToken.findUnique({
    where: { tokenHash: sha256(raw) },
    select: {
      id: true,
      userId: true,
      clientId: true,
      scope: true,
      tokenType: true,
      revokedAt: true,
      expiresAt: true,
    },
  });
  if (!row || row.tokenType !== "access" || row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  // Touch lastUsedAt without blocking the request.
  prisma.oAuthToken
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { userId: row.userId, clientId: row.clientId, scope: row.scope };
}
