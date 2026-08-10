// RFC 7591 dynamic client registration.
//
// Claude.ai's connector form leaves "OAuth Client ID" optional; when it is
// blank the client registers itself here and uses the id we return. We accept
// any well-formed registration but only ever issue public clients (no secret),
// and we pin the redirect_uris so the authorize endpoint can reject anything
// that was not registered.
import { registerClient } from "@/lib/oauth";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
};

function bad(description: string, status = 400) {
  return Response.json(
    { error: "invalid_client_metadata", error_description: description },
    { status, headers: CORS },
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Body must be JSON.");
  }

  const input = (body ?? {}) as {
    client_name?: unknown;
    redirect_uris?: unknown;
    grant_types?: unknown;
    token_endpoint_auth_method?: unknown;
  };

  const uris = Array.isArray(input.redirect_uris) ? input.redirect_uris : [];
  const redirectUris = uris.filter((u): u is string => typeof u === "string" && u.length > 0);
  if (redirectUris.length === 0) {
    return bad("redirect_uris must contain at least one URI.");
  }

  // Every redirect target must be https, or localhost for local development.
  for (const uri of redirectUris) {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      return bad(`redirect_uri is not a valid URL: ${uri}`);
    }
    const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !isLocal) {
      return bad(`redirect_uri must use https: ${uri}`);
    }
  }

  const clientName =
    typeof input.client_name === "string" && input.client_name.trim()
      ? input.client_name.trim().slice(0, 120)
      : null;

  const { clientId } = await registerClient({
    clientName: clientName ?? undefined,
    redirectUris,
  });

  return Response.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      // Public client: PKCE is the protection, there is no secret to leak.
      token_endpoint_auth_method: "none",
    },
    { status: 201, headers: CORS },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
