/*
  Migration 033: site analytics.

  One row per thing a visitor does on the public site: a page view, time on a
  page, a click, how far they read, what they watched. Spec:
  docs/ANALYTICS-SPEC.md.

  No IP address, location or user agent is stored. visitor_id is a random id
  the browser keeps for itself. player_id and games_session_id are only set
  when that browser already has a Run It Back player or a games nickname.

  Only adds. RLS is on with no policies: only server routes using the service
  role can read or write it, same as the sb_ tables.
*/

create table if not exists site_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor_id uuid not null,
  session_id uuid not null,
  type text not null check (type in ('pageview', 'engage', 'click', 'read', 'watch')),
  path text not null,
  target text,
  label text,
  detail text,
  value int,
  referrer text,
  device text check (device in ('phone', 'tablet', 'computer')),
  /* true when the browser asked not to be tracked: the id only lasts for that tab */
  private boolean not null default false,
  /* true for Jaiye's and Kemi's signed in browsers */
  family boolean not null default false,
  player_id uuid references sb_players(id) on delete set null,
  games_session_id uuid references anon_sessions(id) on delete set null
);

create index if not exists site_events_created_idx on site_events (created_at);
create index if not exists site_events_visitor_idx on site_events (visitor_id, created_at);

alter table site_events enable row level security;
