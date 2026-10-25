-- Permit Watch Sarasota — run once in the Supabase SQL editor.

-- ---------------------------------------------------------------
-- Permits scraped from the City of Sarasota FTG portal
-- ---------------------------------------------------------------
create table if not exists public.permits (
  id                 uuid primary key default gen_random_uuid(),
  app_id             text not null unique,          -- e.g. 2027-000757
  source_guid        text,                          -- portal record id (Inquiry.aspx?id=...)
  permit_number      text,
  app_type           text,                          -- e.g. Over the Counter Permit, Building/Zoning Permit
  subtype            text,                          -- e.g. Roofing, Pool, Windows
  work_type          text,                          -- e.g. ALTERATIONS/REPAIRS - RESIDENTIAL
  description        text,
  status             text,
  applied_date       date,
  issued_date        date,
  address            text,
  city               text,
  zip                text,
  owner_name         text,
  owner_address      text,
  contractor_company text,
  contractor_name    text,
  contractor_phone   text,
  contractor_license text,
  contractor_address text,
  contractor_mailing_address text,
  contractor_fax     text,
  contractor_city_registration text,
  parcel_address     text,
  legal_description  text,
  review_status      text,
  plans_review_status text,
  fields             jsonb,                         -- every non-empty field from the city page, by section
  valuation          numeric,
  tags               text[] not null default '{}',  -- landscaping | fence | pool | gutters | blinds
  tag_reasons        jsonb  not null default '{}',  -- { "gutters": "Re-roof" }
  detail_url         text,
  detail_scraped_at  timestamptz,
  detail_failures    int not null default 0,          -- consecutive failed attempts to read the detail page
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  status_changed_at  timestamptz,
  raw                jsonb
);

create index if not exists permits_applied_idx  on public.permits (applied_date desc);
create index if not exists permits_first_seen_idx on public.permits (first_seen_at desc);
create index if not exists permits_zip_idx      on public.permits (zip);
create index if not exists permits_tags_idx     on public.permits using gin (tags);

-- ---------------------------------------------------------------
-- One profile per signed-in user
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text,
  trade               text check (trade in ('landscaping','fence','pool','gutters','blinds')),
  zips                text[] not null default '{}',
  digest_enabled      boolean not null default true,
  stripe_customer_id  text unique,
  subscription_status text,          -- mirrors Stripe: active, trialing, past_due, canceled...
  current_period_end  timestamptz,
  last_digest_at      timestamptz,
  created_at          timestamptz not null default now()
);

-- Create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Scraper run log (shown in the dashboard header)
-- ---------------------------------------------------------------
create table if not exists public.scrape_runs (
  id          bigint generated always as identity primary key,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  listed      int default 0,
  inserted    int default 0,
  updated     int default 0,
  error       text
);

-- ---------------------------------------------------------------
-- Row level security
-- Permits and run logs are read only on the server (service role) after the
-- app has checked the visitor's subscription, so no public policies exist.
-- Users can read their own profile; all writes go through server code.
-- ---------------------------------------------------------------
alter table public.permits     enable row level security;
alter table public.profiles    enable row level security;
alter table public.scrape_runs enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
