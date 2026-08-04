import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import {
  authenticateApiKey,
  logMcpToolCall,
} from "@/lib/api-keys";
import { ACCESS_TOKEN_PREFIX, authenticateAccessToken } from "@/lib/oauth";
import { isUserSubscribed } from "@/lib/subscription";
import { buildEvidencePacket } from "@/lib/evidence";
import { resolvePolymarket, slugFromUrl } from "@/lib/polymarket";
import {
  dataUrlFromBase64,
  parseEffort,
  runAnalyze,
  summarizeAnalyzeInput,
} from "@/lib/analyze-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "analyze_market",
      {
        title: "Analyze Polymarket",
        description:
          "Analyze a Polymarket prediction market. Provide a Polymarket URL or slug, and optionally a base64-encoded screenshot. Returns fair value, edge, confidence, BUY/SELL/PASS recommendation, reasons, and risks.",
        inputSchema: {
          url: z
            .string()
            .optional()
            .describe("Full Polymarket event or market URL"),
          slug: z
            .string()
            .optional()
            .describe("Polymarket market slug (alternative to url)"),
          image_base64: z
            .string()
            .optional()
            .describe("Base64-encoded screenshot of the market (PNG/JPG/WEBP)"),
          mime_type: z
            .string()
            .optional()
            .describe("MIME type for image_base64, e.g. image/png"),
          context: z
            .string()
            .optional()
            .describe("Optional context or question for the analyst"),
          reasoning_effort: z
            .enum(["low", "medium", "high"])
            .optional()
            .describe("OpenAI reasoning effort (default: medium)"),
        },
      },
      async (args, extra) => {
        const userId = (extra?.authInfo?.extra as { userId?: string } | undefined)?.userId;
        const apiKeyId = (extra?.authInfo?.extra as { apiKeyId?: string } | undefined)?.apiKeyId;

        if (!userId) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Unauthorized. Get a connection key at ${SITE_URL}/dashboard`,
              },
            ],
            isError: true,
          };
        }

        const start = Date.now();
        const inputSummary = summarizeAnalyzeInput({
          url: args.url,
          slug: args.slug,
          dataUrl: args.image_base64 ? "[screenshot]" : undefined,
        });

        let dataUrl: string | null = null;
        if (args.image_base64) {
          const mime = args.mime_type ?? "image/png";
          const built = dataUrlFromBase64(args.image_base64, mime);
          if (built.error) {
            await logMcpToolCall({
              userId,
              apiKeyId,
              tool: "analyze_market",
              status: "error",
              latencyMs: Date.now() - start,
              inputSummary,
              errorMessage: built.error,
            });
            return {
              content: [{ type: "text" as const, text: built.error }],
              isError: true,
            };
          }
          dataUrl = built.dataUrl;
        }

        if (!args.url?.trim() && !args.slug?.trim() && !dataUrl) {
          const err = "Provide url, slug, or image_base64.";
          await logMcpToolCall({
            userId,
            apiKeyId,
            tool: "analyze_market",
            status: "error",
            latencyMs: Date.now() - start,
            inputSummary,
            errorMessage: err,
          });
          return {
            content: [{ type: "text" as const, text: err }],
            isError: true,
          };
        }

        const result = await runAnalyze({
          url: args.url,
          slug: args.slug,
          dataUrl,
          context: args.context,
          reasoning_effort: parseEffort(args.reasoning_effort),
        });

        const latencyMs = Date.now() - start;

        if (!result.ok) {
          await logMcpToolCall({
            userId,
            apiKeyId,
            tool: "analyze_market",
            status: "error",
            latencyMs,
            inputSummary,
            errorMessage: result.error,
          });
          return {
            content: [{ type: "text" as const, text: result.error }],
            isError: true,
          };
        }

        await logMcpToolCall({
          userId,
          apiKeyId,
          tool: "analyze_market",
          status: "ok",
          latencyMs,
          inputSummary,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.result, null, 2),
            },
          ],
        };
      },
    );

    server.registerTool(
      "get_market_evidence",
      {
        title: "Get Polymarket evidence",
        description:
          "Fetch verified Polymarket data for a market and reason about it yourself. Returns live prices, the full resolution rules, sibling markets, and a step-by-step method. Prefer this over analyze_market when you can search the web: you enumerate which resolution paths are still open from already-published data, which is where a pre-baked verdict most often goes wrong. Fast, and it never guesses at outside figures.",
        inputSchema: {
          url: z
            .string()
            .optional()
            .describe("Full Polymarket event or market URL"),
          slug: z
            .string()
            .optional()
            .describe("Polymarket market or event slug (alternative to url)"),
        },
      },
      async (args, extra) => {
        const userId = (extra?.authInfo?.extra as { userId?: string } | undefined)?.userId;
        const apiKeyId = (extra?.authInfo?.extra as { apiKeyId?: string } | undefined)?.apiKeyId;

        if (!userId) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Unauthorized. Get a connection key at ${SITE_URL}/dashboard`,
              },
            ],
            isError: true,
          };
        }

        const start = Date.now();
        const rawInput = args.url?.trim() || args.slug?.trim() || "";
        const inputSummary = rawInput.slice(0, 200);

        const fail = async (message: string) => {
          await logMcpToolCall({
            userId,
            apiKeyId,
            tool: "get_market_evidence",
            status: "error",
            latencyMs: Date.now() - start,
            inputSummary,
            errorMessage: message,
          });
          return {
            content: [{ type: "text" as const, text: message }],
            isError: true,
          };
        };

        if (!rawInput) return fail("Provide a Polymarket url or slug.");

        const slug = slugFromUrl(rawInput) ?? rawInput;
        let snapshot = null;
        try {
          snapshot = await resolvePolymarket(slug);
        } catch {
          return fail("Could not reach Polymarket. Try again shortly.");
        }
        if (!snapshot) {
          return fail(
            `No live Polymarket market found for "${slug}". Check the URL — closed and renamed markets 404. Paste the address straight from the market page.`,
          );
        }

        await logMcpToolCall({
          userId,
          apiKeyId,
          tool: "get_market_evidence",
          status: "ok",
          latencyMs: Date.now() - start,
          inputSummary,
        });

        return {
          content: [{ type: "text" as const, text: buildEvidencePacket(snapshot) }],
        };
      },
    );
  },
  {
    serverInfo: {
      name: "polykit",
      version: "1.1.0",
    },
  },
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV !== "production",
  },
);

const handler = withMcpAuth(
  mcpHandler,
  async (req, bearerToken) => {
    const header = bearerToken
      ? `Bearer ${bearerToken}`
      : req.headers.get("authorization");
    const raw = bearerToken ?? header?.replace(/^Bearer\s+/i, "").trim() ?? "";

    // Two credential shapes reach this endpoint. Connection keys (pk_live_…)
    // are pasted into clients that support custom headers; OAuth access tokens
    // (pkoa_…) come from clients like claude.ai that can only do OAuth.
    if (raw.startsWith(ACCESS_TOKEN_PREFIX)) {
      const oauth = await authenticateAccessToken(raw);
      if (!oauth) return undefined;
      // Entitlement is re-checked per call, so a cancellation takes effect
      // without waiting for the access token to expire.
      if (!(await isUserSubscribed(oauth.userId))) return undefined;
      return {
        token: raw,
        clientId: oauth.clientId,
        scopes: [oauth.scope],
        extra: { userId: oauth.userId },
      };
    }

    const auth = await authenticateApiKey(header);
    if (!auth) return undefined;
    return {
      token: raw,
      clientId: auth.userId,
      scopes: ["analyze"],
      extra: {
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
      },
    };
  },
  {
    required: true,
    resourceUrl: `${SITE_URL}/api/mcp`,
    // Point the 401 at metadata we actually serve; this pointer previously
    // resolved to a 404 and dead-ended the claude.ai connect flow.
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
  },
);

export { handler as GET, handler as POST };
