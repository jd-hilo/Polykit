-- Superseded by prisma/schema.prisma. Run `npx prisma db push` instead.
-- Polykit initial schema.
-- All tables use user_id text so they match Clerk userId (not a uuid).
-- RLS is intentionally disabled because every access goes through server
-- routes authenticated by Clerk using the Supabase service-role key.

create extension if not exists "pgcrypto";

-- ─── subscriptions ──────────────────────────────────────────────
create table if not exists subscriptions (
  user_id text primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

-- ─── positions (paper trading) ──────────────────────────────────
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  market_question text not null,
  side text check (side in ('YES','NO')),
  entry_price numeric,
  size numeric,
  status text default 'open' check (status in ('open','closed')),
  pnl numeric default 0,
  created_at timestamptz default now(),
  closed_at timestamptz
);
create index if not exists positions_user_status_idx on positions (user_id, status);

-- ─── tracked_wallets ────────────────────────────────────────────
create table if not exists tracked_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  address text not null,
  label text,
  created_at timestamptz default now(),
  unique (user_id, address)
);

-- ─── picks (global, not per-user) ───────────────────────────────
create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  market_question text not null,
  side text,
  price numeric,
  confidence int,
  rationale text,
  image_url text,
  created_at timestamptz default now()
);

-- ─── coach_messages ─────────────────────────────────────────────
create table if not exists coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  role text check (role in ('user','assistant')),
  content text,
  created_at timestamptz default now()
);
create index if not exists coach_messages_user_created_idx
  on coach_messages (user_id, created_at);
