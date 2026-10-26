/*
  Migration 027: Run It Back Picks growth.

  Private leagues, preset trash talk, reports and mutes, app sessions, and the
  player fields the iPhone app needs. Spec: docs/RUN-IT-BACK-APP-SPEC.md.

  Only adds. Nothing existing is dropped, renamed or rewritten.

  Tables
    sb_leagues, sb_league_members   private leagues and who is in them
    sb_trash_talk                   one preset line per player per revealed pick
    sb_reports, sb_mutes            safety
    sb_app_sessions                 iPhone app sign-ins (only a hash of the token is stored)

  Rivalries and season records are computed from picks the same way season
  standings already are, so there is no score table to keep in sync.

  RLS is on for every new table with no policies: only server routes using the
  service role can read or write them.
*/

/* Player fields for the app, the pass and account deletion */
alter table sb_players add column if not exists age_band text check (age_band in ('13_plus', 'under_13'));
alter table sb_players add column if not exists has_pass boolean not null default false;
alter table sb_players add column if not exists pass_season text;
alter table sb_players add column if not exists pass_purchased_at timestamptz;
alter table sb_players add column if not exists push_token text;
alter table sb_players add column if not exists push_enabled jsonb not null
  default '{"lock": true, "reveal": true, "graded": true, "recap": true}';
alter table sb_players add column if not exists platform text not null default 'web' check (platform in ('web', 'ios'));
alter table sb_players add column if not exists deleted_at timestamptz;
alter table sb_players add column if not exists last_seen_at timestamptz;

/* Leagues */
create table if not exists sb_leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 30),
  code text not null unique,
  commissioner_id uuid not null references sb_players(id),
  season text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists sb_league_members (
  league_id uuid not null references sb_leagues(id) on delete cascade,
  player_id uuid not null references sb_players(id) on delete cascade,
  invited_by uuid references sb_players(id) on delete set null,
  removed boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (league_id, player_id)
);
create index if not exists sb_league_members_player_idx on sb_league_members (player_id);

/* A league holds at most 50 active players. */
create or replace function sb_league_members_cap()
returns trigger language plpgsql as $$
declare
  n int;
begin
  if new.removed then return new; end if;
  select count(*) into n from sb_league_members
  where league_id = new.league_id and not removed and player_id <> new.player_id;
  if n >= 50 then
    raise exception 'sb_league_members: this league is full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists sb_league_members_cap on sb_league_members;
create trigger sb_league_members_cap before insert or update on sb_league_members
  for each row execute function sb_league_members_cap();

/* Preset trash talk: only after the pick locks, one line per player per pick */
create table if not exists sb_trash_talk (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references sb_items(id) on delete cascade,
  player_id uuid not null references sb_players(id) on delete cascade,
  line_key text not null check (line_key ~ '^[a-z_]{2,32}$'),
  created_at timestamptz not null default now(),
  unique (item_id, player_id)
);

create or replace function sb_trash_talk_guard()
returns trigger language plpgsql as $$
declare
  locks timestamptz;
begin
  select locks_at into locks from sb_items where id = new.item_id;
  if locks is null or now() < locks then
    raise exception 'sb_trash_talk: wait until tip-off' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists sb_trash_talk_guard on sb_trash_talk;
create trigger sb_trash_talk_guard before insert or update on sb_trash_talk
  for each row execute function sb_trash_talk_guard();

/* Safety */
create table if not exists sb_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references sb_players(id) on delete set null,
  target_player_id uuid not null references sb_players(id) on delete cascade,
  context text not null check (context in ('name', 'talk', 'league_name')),
  ref_id uuid,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists sb_reports_open_idx on sb_reports (target_player_id) where not resolved;

create table if not exists sb_mutes (
  player_id uuid not null references sb_players(id) on delete cascade,
  muted_player_id uuid not null references sb_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, muted_player_id)
);

/* App sign-ins */
create table if not exists sb_app_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references sb_players(id) on delete cascade,
  token_hash text not null unique,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
create index if not exists sb_app_sessions_player_idx on sb_app_sessions (player_id);

alter table sb_leagues enable row level security;
alter table sb_league_members enable row level security;
alter table sb_trash_talk enable row level security;
alter table sb_reports enable row level security;
alter table sb_mutes enable row level security;
alter table sb_app_sessions enable row level security;
