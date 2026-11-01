-- Persistent site content for serverless hosting (Vercel).
create table if not exists public.site_content_records (
  id text primary key check (length(id) between 1 and 128),
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  is_deleted boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_categories (
  type text not null check (type in ('course', 'ai-tool', 'resource', 'opportunity', 'event')),
  name text not null check (length(name) between 1 and 80),
  primary key (type, name)
);

create table if not exists public.community_links (
  id text primary key check (length(id) between 1 and 80),
  platform text not null check (platform in ('whatsapp', 'telegram', 'other')),
  title text not null check (length(title) between 1 and 80),
  title_en text not null default '' check (length(title_en) <= 80),
  url text not null check (url ~ '^https?://'),
  position integer not null default 0 check (position >= 0)
);

create table if not exists public.media_assets (
  id uuid primary key,
  name text not null check (length(name) between 1 and 150),
  type text not null check (type in ('image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/avif')),
  size bigint not null check (size > 0 and size <= 8388608),
  object_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.site_content_records enable row level security;
alter table public.site_categories enable row level security;
alter table public.community_links enable row level security;
alter table public.media_assets enable row level security;

revoke all on public.site_content_records, public.site_categories, public.community_links, public.media_assets from public, anon, authenticated;
grant all on public.site_content_records, public.site_categories, public.community_links, public.media_assets to service_role;

-- The server uses the service-role key only in server-only modules after checking the admin session.
create or replace function public.replace_community_links(links jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(links) <> 'array' or jsonb_array_length(links) > 50 then
    raise exception 'Invalid community links payload';
  end if;

  delete from public.community_links;
  insert into public.community_links (id, platform, title, title_en, url, position)
  select
    item->>'id', item->>'platform', item->>'title', coalesce(item->>'title_en', ''), item->>'url', (item->>'position')::integer
  from jsonb_array_elements(links) as entries(item);
end;
$$;

revoke all on function public.replace_community_links(jsonb) from public, anon, authenticated;
grant execute on function public.replace_community_links(jsonb) to service_role;

-- Private bucket: media is served by the application API; only the server service key reads/writes it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ict-media', 'ict-media', false, 8388608,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/avif'])
on conflict (id) do update set public = false, file_size_limit = 8388608,
  allowed_mime_types = excluded.allowed_mime_types;
