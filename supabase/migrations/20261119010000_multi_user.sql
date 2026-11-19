-- Multi-user: every row belongs to one auth user. Existing single-user data is discarded
-- (spec commute-notice-accounts: the owner signs up again and re-enters settings).
-- RLS is on with no policies: only the server (secret key) reads or writes, always scoped by user_id.

drop table if exists public.dispatch_log;
drop table if exists public.push_subscriptions;
drop table if exists public.commute_settings;

create table public.commute_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('morning', 'evening')),
  departure_time time not null,
  ars_id text not null,
  route_name text not null,
  station_name text not null,
  lon double precision not null,
  lat double precision not null,
  lead_minutes integer not null default 10 check (lead_minutes between 1 and 120),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

create table public.dispatch_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('morning', 'evening')),
  service_date date not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  success_count integer,
  total_count integer,
  unique (user_id, kind, service_date)
);

create table public.widget_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

alter table public.commute_settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.dispatch_log enable row level security;
alter table public.widget_tokens enable row level security;
