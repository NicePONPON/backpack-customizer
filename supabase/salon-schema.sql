-- ============ Salon catalogue schema ============

create table if not exists salon_admins (
  email text primary key
);

create table if not exists salon_products (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('hair','decorations','others')),
  name text not null,
  description text not null default '',
  price numeric not null check (price >= 0),
  currency text not null default 'SZL',
  photos text[] not null default '{}',
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists salon_shops (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('hair','decorations','others')),
  shop_name text not null,
  online_url text,
  map_address text,
  google_maps_url text,
  sort_order int not null default 0
);

-- keep updated_at fresh
create or replace function salon_touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists salon_products_touch on salon_products;
create trigger salon_products_touch before update on salon_products
for each row execute function salon_touch_updated_at();

-- ============ RLS ============
alter table salon_products enable row level security;
alter table salon_shops enable row level security;
alter table salon_admins enable row level security;

-- helper: is the current user an admin?
create or replace function salon_is_admin() returns boolean as $$
  select exists (
    select 1 from salon_admins a
    where a.email = (auth.jwt() ->> 'email')
  );
$$ language sql security definer stable;

-- public read of published products; admins read all
drop policy if exists "salon products public read" on salon_products;
create policy "salon products public read" on salon_products
for select to anon, authenticated
using (is_published = true or salon_is_admin());

-- admins write products
drop policy if exists "salon products admin write" on salon_products;
create policy "salon products admin write" on salon_products
for all to authenticated
using (salon_is_admin()) with check (salon_is_admin());

-- public read of all shops
drop policy if exists "salon shops public read" on salon_shops;
create policy "salon shops public read" on salon_shops
for select to anon, authenticated using (true);

-- admins write shops
drop policy if exists "salon shops admin write" on salon_shops;
create policy "salon shops admin write" on salon_shops
for all to authenticated
using (salon_is_admin()) with check (salon_is_admin());

-- admins can read the admin list (to self-check); no public read
drop policy if exists "salon admins self read" on salon_admins;
create policy "salon admins self read" on salon_admins
for select to authenticated
using (email = (auth.jwt() ->> 'email'));

-- ============ Storage bucket ============
insert into storage.buckets (id, name, public)
values ('salon', 'salon', true)
on conflict (id) do nothing;

-- public read of salon objects
drop policy if exists "salon storage public read" on storage.objects;
create policy "salon storage public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'salon');

-- admins write salon objects
drop policy if exists "salon storage admin write" on storage.objects;
create policy "salon storage admin write" on storage.objects
for all to authenticated
using (bucket_id = 'salon' and salon_is_admin())
with check (bucket_id = 'salon' and salon_is_admin());

-- ============ Seed first admin (EDIT THIS EMAIL) ============
insert into salon_admins (email) values ('chrisliao1990@gmail.com')
on conflict (email) do nothing;
