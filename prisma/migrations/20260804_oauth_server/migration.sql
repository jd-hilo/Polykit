-- OAuth 2.1 authorization server for MCP clients that only speak OAuth.

CREATE TABLE IF NOT EXISTS "oauth_clients" (
    "client_id" TEXT NOT NULL,
    "client_name" TEXT,
    "redirect_uris" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("client_id")
);

CREATE TABLE IF NOT EXISTS "oauth_codes" (
    "code_hash" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "code_challenge" TEXT NOT NULL,
    "code_challenge_method" TEXT NOT NULL DEFAULT 'S256',
    "scope" TEXT NOT NULL DEFAULT 'analyze',
    "resource" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "oauth_codes_pkey" PRIMARY KEY ("code_hash")
);
CREATE INDEX IF NOT EXISTS "oauth_codes_user_id_idx" ON "oauth_codes"("user_id");

CREATE TABLE IF NOT EXISTS "oauth_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" TEXT NOT NULL,
    "token_type" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'analyze',
    "expires_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "oauth_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_tokens_token_hash_key" ON "oauth_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "oauth_tokens_user_id_idx" ON "oauth_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "oauth_tokens_token_type_expires_at_idx" ON "oauth_tokens"("token_type", "expires_at");
