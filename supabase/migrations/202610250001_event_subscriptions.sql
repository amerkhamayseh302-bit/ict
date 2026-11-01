create table if not exists public.event_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  events_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.event_subscriptions enable row level security;
revoke all on table public.event_subscriptions from anon, authenticated;
grant select, insert, update, delete on table public.event_subscriptions to authenticated;

create policy "Members read their own event subscription"
  on public.event_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Members create their own event subscription"
  on public.event_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Members update their own event subscription"
  on public.event_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Members delete their own event subscription"
  on public.event_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);
