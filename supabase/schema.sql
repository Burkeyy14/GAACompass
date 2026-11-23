-- GAA Compass database schema (Supabase / Postgres)
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste all of this → Run.
-- Safe to re-run: it only creates what is missing and refreshes the security policies.

-- ─────────────────────────────────────────────────────────────
-- 1. records: every piece of a player's data
--    (profile, check-ins, sessions, week plans, goals, frees, benchmarks)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.records (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('profile','checkins','weekPlans','sessions','frees','goals','benchmarks')),
  id         text        not null check (char_length(id) <= 100),
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);
create index if not exists records_user_kind on public.records (user_id, kind);

alter table public.records enable row level security;
drop policy if exists "read own records"   on public.records;
drop policy if exists "insert own records" on public.records;
drop policy if exists "update own records" on public.records;
drop policy if exists "delete own records" on public.records;
create policy "read own records"   on public.records for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own records" on public.records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own records" on public.records for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own records" on public.records for delete to authenticated using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────
-- 2. entitlements: who has Pro.
--    Players can READ their own row but never write it. Only the server
--    (Stripe webhook / beta-code endpoint, using the service-role key) can.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.entitlements (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  plan                   text not null default 'free' check (plan in ('free','pro')),
  source                 text check (source in ('stripe','beta','manual')),
  status                 text,
  stripe_customer_id     text unique,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);
alter table public.entitlements enable row level security;
drop policy if exists "read own entitlement" on public.entitlements;
create policy "read own entitlement" on public.entitlements for select to authenticated using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. feedback: messages sent from the in-app "Send feedback" button.
--    Players can send but not read. You read them in Table Editor → feedback.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  user_id     uuid default auth.uid() references auth.users (id) on delete set null,
  email       text,
  rating      int check (rating between 1 and 5),
  message     text not null check (char_length(message) between 1 and 4000),
  screen      text,
  app_version text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "send feedback" on public.feedback;
create policy "send feedback" on public.feedback for insert to authenticated with check ((select auth.uid()) = user_id);

-- Handy view for you (only visible with the dashboard / service role)
create or replace view public.feedback_inbox with (security_invoker = true) as
  select created_at, rating, screen, message, email, app_version from public.feedback order by created_at desc;
revoke all on public.feedback_inbox from anon, authenticated;
