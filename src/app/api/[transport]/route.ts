import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import {
  authenticateApiKey,
  logMcpToolCall,
} from "@/lib/api-keys";
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
  },
  {
    serverInfo: {
      name: "polykit",
      version: "1.0.0",
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
    const auth = await authenticateApiKey(header);
    if (!auth) return undefined;
    return {
      token: bearerToken ?? header?.replace(/^Bearer\s+/i, "") ?? "",
      clientId: auth.userId,
      scopes: ["analyze"],
      extra: {
        userId: auth.userId,
        apiKeyId: auth.apiKeyId,
      },
    };
  },
  { required: true, resourceUrl: `${SITE_URL}/api/mcp` },
);

export { handler as GET, handler as POST };
