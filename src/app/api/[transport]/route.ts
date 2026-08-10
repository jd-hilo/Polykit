import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import {
  authenticateApiKey,
  logMcpToolCall,
} from "@/lib/api-keys";
import { ACCESS_TOKEN_PREFIX, authenticateAccessToken } from "@/lib/oauth";
import { isUserSubscribed } from "@/lib/subscription";
import { buildEvidencePacket } from "@/lib/evidence";
import {
  dataUrlFromBase64,
  resolveMarketSnapshot,
  summarizeAnalyzeInput,
} from "@/lib/analyze-pipeline";

export const runtime = "nodejs";
// Resolution is a couple of Polymarket calls now, not a model round-trip.
export const maxDuration = 30;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";

const mcpHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "analyze_market",
      {
        title: "Analyze Polymarket",
        description:
          "Get everything needed to analyze a Polymarket prediction market, then do the analysis yourself. Accepts a Polymarket URL, slug, or screenshot. Returns live prices, the full resolution rules, sibling markets, and a step-by-step method. It deliberately does not hand back a pre-made verdict: you decide which resolution paths are still open from already-published data, look up anything the rules depend on, and give the user a call with your own reasoning. Search the web for the published observations the rules name before concluding.",
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
            .describe("Optional context or question from the user"),
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

        const fail = async (message: string) => {
          await logMcpToolCall({
            userId,
            apiKeyId,
            tool: "analyze_market",
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

        let dataUrl: string | null = null;
        if (args.image_base64) {
          const built = dataUrlFromBase64(args.image_base64, args.mime_type ?? "image/png");
          if (built.error) return fail(built.error);
          dataUrl = built.dataUrl;
        }

        if (!args.url?.trim() && !args.slug?.trim() && !dataUrl) {
          return fail("Provide url, slug, or image_base64.");
        }

        let resolved;
        try {
          resolved = await resolveMarketSnapshot({
            url: args.url,
            slug: args.slug,
            dataUrl,
            context: args.context,
          });
        } catch {
          return fail("Could not reach Polymarket. Try again shortly.");
        }

        if (!resolved.ok) return fail(resolved.error);

        await logMcpToolCall({
          userId,
          apiKeyId,
          tool: "analyze_market",
          status: "ok",
          latencyMs: Date.now() - start,
          inputSummary,
        });

        return {
          content: [{ type: "text" as const, text: buildEvidencePacket(resolved.snapshot) }],
        };
      },
    );
  },
  {
    serverInfo: {
      name: "polykit",
      version: "2.0.0",
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
