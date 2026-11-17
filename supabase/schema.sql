-- Run once in Supabase → SQL Editor.
create table if not exists public.leads (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists leads_updated_at_idx on public.leads (updated_at desc);

-- The app talks to this table only from the server with the service-role key.
-- Turning on RLS with no policies blocks anonymous browser access.
alter table public.leads enable row level security;
