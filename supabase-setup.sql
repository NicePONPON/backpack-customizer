-- Run this in your Supabase project: Dashboard → SQL Editor → New query

-- ── Seasons ───────────────────────────────────────────────────────────────
create table public.seasons (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  is_active  boolean     not null default false,
  ended_at   timestamptz,
  created_at timestamptz not null default now()
);

-- Enforce at most one active season at a time
create unique index seasons_one_active
  on public.seasons (is_active)
  where is_active = true;

-- ── Design submissions ────────────────────────────────────────────────────
create table public.design_submissions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  season_id    uuid        not null references public.seasons(id) on delete cascade,
  design_json  jsonb       not null,
  fingerprint  text        not null, -- visual hash (size+colors+zipper), used for grouping
  submitted_at timestamptz not null default now(),
  unique(user_id, season_id)         -- one submission per email per season
);

-- ── Row Level Security ────────────────────────────────────────────────────
alter table public.seasons enable row level security;
alter table public.design_submissions enable row level security;

create policy "seasons_public_read"
  on public.seasons for select using (true);

create policy "submissions_insert"
  on public.design_submissions for insert
  with check (auth.uid() = user_id);

create policy "submissions_update"
  on public.design_submissions for update
  using (auth.uid() = user_id);

create policy "submissions_read_own"
  on public.design_submissions for select
  using (auth.uid() = user_id);

-- ── RPC: top designs for a season (aggregate only — no user data exposed) ─
create or replace function public.get_top_designs(p_season_id uuid, p_limit int default 3)
returns table(design_json jsonb, count bigint)
language sql security definer stable as $$
  select design_json, count(*) as count
  from public.design_submissions
  where season_id = p_season_id
  group by design_json
  order by count desc
  limit p_limit;
$$;

grant execute on function public.get_top_designs to anon, authenticated;

-- ── RPC: launched design (top 1 from most recently closed season) ─────────
create or replace function public.get_launched_design()
returns table(design_json jsonb, season_name text, count bigint)
language sql security definer stable as $$
  select d.design_json, s.name as season_name, count(*) as count
  from public.design_submissions d
  join public.seasons s on s.id = d.season_id
  where s.is_active = false and s.ended_at is not null
  group by d.design_json, s.name, s.ended_at
  order by s.ended_at desc, count desc
  limit 1;
$$;

grant execute on function public.get_launched_design to anon, authenticated;

-- ── Starter season (edit name as needed) ─────────────────────────────────
insert into public.seasons (name, is_active)
values ('Spring 2026', true);

-- ── To close a season and open the next one ───────────────────────────────
-- update public.seasons set is_active = false, ended_at = now() where name = 'Spring 2026';
-- insert into public.seasons (name, is_active) values ('Summer 2026', true);
