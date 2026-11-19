-- Commute departure notice: settings, push subscriptions and send log.
-- RLS is on with no policies: only the server (secret key) can read or write.

create table if not exists public.commute_settings (
  kind text primary key check (kind in ('morning', 'evening')),
  departure_time time not null,
  ars_id text not null,
  route_name text not null,
  station_name text not null,
  lon double precision not null,
  lat double precision not null,
  lead_minutes integer not null default 10 check (lead_minutes between 1 and 120),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.dispatch_log (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('morning', 'evening')),
  service_date date not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  success_count integer,
  total_count integer,
  unique (kind, service_date)
);

alter table public.commute_settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.dispatch_log enable row level security;

create extension if not exists pg_cron;
create extension if not exists pg_net;
