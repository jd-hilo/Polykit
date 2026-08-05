import { createHash, randomBytes } from "crypto";
import { prisma, withDbRetry } from "./prisma";
import { isUserSubscribed } from "./subscription";

const KEY_PREFIX = "pk_live_";

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("base64url");
  const raw = `${KEY_PREFIX}${secret}`;
  const prefix = `${raw.slice(0, 16)}…`;
  return { raw, prefix, hash: hashApiKey(raw) };
}

export type ApiKeyAuth = {
  userId: string;
  apiKeyId: string;
};

/** Validate Bearer token and return user + key id if active. */
export async function authenticateApiKey(
  authorization: string | null,
): Promise<ApiKeyAuth | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const raw = authorization.slice(7).trim();
  if (!raw.startsWith(KEY_PREFIX)) return null;

  const hash = hashApiKey(raw);
  // Runs on every MCP call — a momentary blip must not look like a bad key.
  const row = await withDbRetry(() =>
    prisma.apiKey.findUnique({
      where: { keyHash: hash },
      select: { id: true, userId: true, revokedAt: true },
    }),
  );
  if (!row || row.revokedAt) return null;

  const subscribed = await isUserSubscribed(row.userId);
  if (!subscribed) return null;

  // Touch lastUsedAt async — don't block the request.
  prisma.apiKey
    .update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return { userId: row.userId, apiKeyId: row.id };
}

export async function createApiKeyForUser(
  userId: string,
  name = "Default",
): Promise<{ id: string; raw: string; prefix: string; name: string } | null> {
  const subscribed = await isUserSubscribed(userId);
  if (!subscribed) return null;

  const { raw, prefix, hash } = generateApiKey();
  const row = await prisma.apiKey.create({
    data: {
      userId,
      name,
      keyPrefix: prefix,
      keyHash: hash,
    },
  });
  return { id: row.id, raw, prefix, name: row.name };
}

export async function listApiKeysForUser(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}

export async function revokeApiKeyForUser(userId: string, keyId: string): Promise<boolean> {
  const row = await prisma.apiKey.findFirst({
    where: { id: keyId, userId, revokedAt: null },
  });
  if (!row) return false;
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });
  return true;
}

export async function logMcpToolCall(args: {
  userId: string;
  apiKeyId?: string;
  tool: string;
  status: "ok" | "error";
  latencyMs?: number;
  inputSummary?: string;
  errorMessage?: string;
}) {
  try {
    await prisma.mcpToolCall.create({
      data: {
        userId: args.userId,
        apiKeyId: args.apiKeyId ?? null,
        tool: args.tool,
        status: args.status,
        latencyMs: args.latencyMs ?? null,
        inputSummary: args.inputSummary ?? null,
        errorMessage: args.errorMessage ?? null,
      },
    });
  } catch (e) {
    console.error("[logMcpToolCall] failed", e);
  }
}

export async function listUsageForUser(userId: string, limit = 50) {
  return prisma.mcpToolCall.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      tool: true,
      status: true,
      latencyMs: true,
      inputSummary: true,
      errorMessage: true,
      createdAt: true,
    },
  });
}
