-- Run this once in the Supabase SQL Editor to enable event email delivery logs.
-- Access is restricted to the server-side Supabase secret/service role key.

create table if not exists public.event_email_dispatches (
  event_id text primary key,
  status text not null check (status in ('sending', 'sent', 'failed')),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_email_deliveries (
  event_id text not null references public.event_email_dispatches(event_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('sending', 'sent', 'failed')),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_email_dispatches enable row level security;
alter table public.event_email_deliveries enable row level security;

revoke all on table public.event_email_dispatches from anon, authenticated;
revoke all on table public.event_email_deliveries from anon, authenticated;
grant all on table public.event_email_dispatches to service_role;
grant all on table public.event_email_deliveries to service_role;
