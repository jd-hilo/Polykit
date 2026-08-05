import { PrismaClient, Prisma } from "@prisma/client";

/**
 * Serverless-safe Prisma client.
 *
 * Two things were causing intermittent "Can't reach database server at
 * db.prisma.io:5432" in production:
 *
 * 1. The client was only cached on globalThis outside production, so every
 *    cold start built a fresh PrismaClient with its own connections. On
 *    Vercel that multiplies by concurrent lambdas until the database refuses
 *    new ones. The cache has to apply in production too — warm invocations
 *    then reuse one instance, and each lambda evaluates this module
 *    separately anyway, so nothing leaks between requests.
 *
 * 2. We connect over direct TCP rather than through a pooler, so each
 *    instance must hold a small bounded pool instead of Prisma's default of
 *    (num_cpus * 2 + 1), which is far too many once there are dozens of
 *    instances.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Bound the per-instance pool and fail fast rather than hanging a request.
 * Anything already set explicitly in DATABASE_URL wins.
 */
function connectionUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    // One connection per instance: instances are numerous and each serves a
    // single request at a time.
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }
    // Don't queue forever on a saturated pool.
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "10");
    }
    // Surface an unreachable server quickly so withDbRetry can act on it.
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "10");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function createClient(): PrismaClient {
  const url = connectionUrl();
  return new PrismaClient({
    log: ["error", "warn"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

// Cache in every environment, production included — see note above.
globalForPrisma.prisma = prisma;

/* ──────────────────────────────────────────────────────────── *
 * Transient failure handling                                    *
 * ──────────────────────────────────────────────────────────── */

/**
 * True for errors meaning "the database was momentarily unreachable", not
 * "your query was wrong". Retrying the former is safe; retrying a constraint
 * violation is not.
 */
function isTransient(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientRustPanicError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P1001 unreachable · P1002 timed out · P1008 operation timeout
    // P1017 server closed the connection · P2024 pool timeout
    return ["P1001", "P1002", "P1008", "P1017", "P2024"].includes(err.code);
  }
  const message = err instanceof Error ? err.message : String(err);
  return /Can't reach database server|Connection (reset|closed|terminated)|ECONNRESET|ETIMEDOUT/i.test(
    message,
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry a read through a brief database blip.
 *
 * Auth runs on every MCP call, so a one-second outage would otherwise 401 a
 * paying customer mid-conversation. Use for reads; non-idempotent writes
 * should not go through here.
 */
export async function withDbRetry<T>(
  op: () => Promise<T>,
  { attempts = 3, baseDelayMs = 120 }: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await op();
    } catch (err) {
      lastError = err;
      if (!isTransient(err) || i === attempts - 1) throw err;
      // 120ms then 240ms — short enough to stay inside a request budget.
      await sleep(baseDelayMs * 2 ** i);
    }
  }
  throw lastError;
}
