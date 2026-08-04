// RFC 9728 protected resource metadata — tells the client which authorization
// server guards /api/mcp. This is the document the 401's `resource_metadata`
// pointer resolves to; before it existed, clients followed that pointer to a
// 404 and the connect flow dead-ended.
import { protectedResourceMetadata } from "@/lib/oauth";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
  "Cache-Control": "public, max-age=3600",
};

export async function GET() {
  return Response.json(protectedResourceMetadata(), { headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
