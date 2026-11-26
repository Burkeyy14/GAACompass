-- Migration 002: add nutrition and weights record kinds.
-- Run in Supabase: Dashboard → SQL Editor → New query → paste all of this → Run.
-- Safe to re-run: DROP CONSTRAINT IF EXISTS before re-adding it.

alter table public.records
  drop constraint if exists records_kind_check;

alter table public.records
  add constraint records_kind_check
  check (kind in (
    'profile','checkins','weekPlans','sessions','frees','goals','benchmarks',
    'nutrition','weights'
  ));
