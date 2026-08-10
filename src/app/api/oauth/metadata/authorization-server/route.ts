// RFC 8414 authorization server metadata.
// Served at /.well-known/oauth-authorization-server via a rewrite in
// next.config.js — the app router ignores dot-prefixed directories.
import { authorizationServerMetadata } from "@/lib/oauth";

export const runtime = "nodejs";

const CORS = {
  // Discovery is fetched by MCP clients from other origins.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
  "Cache-Control": "public, max-age=3600",
};

export async function GET() {
  return Response.json(authorizationServerMetadata(), { headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
