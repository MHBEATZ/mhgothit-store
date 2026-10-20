-- ============================================================
--  MH BEATS — database setup (run this ONCE in Supabase)
--  Supabase dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1) >>> CHANGE THIS to the exact email you will log into the admin with <<<
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = lower('YOUR_ADMIN_EMAIL_HERE')
$$;

-- 2) Beats table
create table if not exists public.beats (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  bpm             int,
  musical_key     text,
  tags            text,
  art_url         text,
  art_path        text,
  audio_url       text,
  audio_path      text,
  price_mp3       numeric not null default 30,
  price_wav       numeric not null default 60,
  price_exclusive numeric not null default 200,
  exclusive_sold  boolean not null default false,
  published       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);
alter table public.beats enable row level security;
drop policy if exists "beats read"  on public.beats;
drop policy if exists "beats admin" on public.beats;
create policy "beats read"  on public.beats for select using (published = true or public.is_admin());
create policy "beats admin" on public.beats for all    using (public.is_admin()) with check (public.is_admin());

-- 3) Site settings (single row)
create table if not exists public.settings (
  id                int primary key default 1 check (id = 1),
  paypal_email      text,
  contact_email     text,
  hero_tagline      text,
  default_mp3       numeric default 30,
  default_wav       numeric default 60,
  default_exclusive numeric default 200
);
alter table public.settings enable row level security;
drop policy if exists "settings read"  on public.settings;
drop policy if exists "settings admin" on public.settings;
create policy "settings read"  on public.settings for select using (true);
create policy "settings admin" on public.settings for all    using (public.is_admin()) with check (public.is_admin());

-- 4) File storage bucket for artwork + audio (public to read, admin-only to write)
insert into storage.buckets (id, name, public, file_size_limit)
values ('beats', 'beats', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "beats files read"   on storage.objects;
drop policy if exists "beats files insert" on storage.objects;
drop policy if exists "beats files update" on storage.objects;
drop policy if exists "beats files delete" on storage.objects;
create policy "beats files read"   on storage.objects for select using (bucket_id = 'beats');
create policy "beats files insert" on storage.objects for insert with check (bucket_id = 'beats' and public.is_admin());
create policy "beats files update" on storage.objects for update using (bucket_id = 'beats' and public.is_admin());
create policy "beats files delete" on storage.objects for delete using (bucket_id = 'beats' and public.is_admin());
