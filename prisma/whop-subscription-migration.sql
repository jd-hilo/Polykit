-- Whop subscription fields migration
-- Run this on Supabase (SQL Editor) to add Whop columns to the existing
-- subscriptions table. Safe to run multiple times (idempotent).

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS whop_membership_id TEXT,
  ADD COLUMN IF NOT EXISTS whop_user_id TEXT,
  ADD COLUMN IF NOT EXISTS whop_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Unique constraint on whop_membership_id (allows NULL — only constrains when set).
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_whop_membership_id_key
  ON subscriptions (whop_membership_id)
  WHERE whop_membership_id IS NOT NULL;

-- Index by email so webhook lookups by email are fast.
CREATE INDEX IF NOT EXISTS subscriptions_email_idx
  ON subscriptions (email);
