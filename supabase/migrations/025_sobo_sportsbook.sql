/*
  Migration 025: Sobo Sportsbook.

  A weekly NBA pick'em: Jaiye vs Remi plus anyone who joins with a display name.
  Spec: docs/SOBO-SPORTSBOOK-SPEC.md.

  Tables
    nba_games, nba_player_games   local copy of schedule, scores and box scores
    sb_players                    Jaiye, Remi and challengers
    sb_weeks, sb_items, sb_picks  weekly slates, the picks in them, and everyone's answers
    sb_reactions                  emoji reactions on revealed picks (fixed set, no free text)
    sb_votes                      fans voting on who wins the week, Jaiye or Remi

  Rules enforced here, for every role including the service role:
    1. A pick can't be added, changed or removed once its item locks (tip-off),
       or unless the week is open.
    2. One Lock of the Week per player per week.
    3. A final week, its items and its picks can never change.

  RLS: everything is read and written through server routes with the service
  role. The public keys can read the NBA tables and published weeks only.
  Picks and players are never readable with the public keys, so nobody can
  peek at a pick before it locks.
*/

create table if not exists nba_games (
  game_id text primary key,
  season text not null,
  tip_at timestamptz not null,
  home text not null,
  away text not null,
  home_score int,
  away_score int,
  status int not null default 1,          /* 1 scheduled, 2 live, 3 final */
  postponed boolean not null default false,
  has_box boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists nba_games_tip_idx on nba_games (tip_at);

create table if not exists nba_player_games (
  game_id text not null references nba_games(game_id) on delete cascade,
  person_id bigint not null,
  name text not null,
  team text not null,
  played boolean not null default false,
  pts int not null default 0,
  reb int not null default 0,
  ast int not null default 0,
  fg3m int not null default 0,
  stl int not null default 0,
  blk int not null default 0,
  primary key (game_id, person_id)
);
create index if not exists nba_player_games_person_idx on nba_player_games (person_id);

create table if not exists sb_players (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('remi', 'jaiye', 'challenger')),
  user_id uuid references users(id),
  display_name text not null check (char_length(display_name) between 1 and 20),
  code text unique,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists sb_players_one_house on sb_players (kind) where kind in ('remi', 'jaiye');

create table if not exists sb_weeks (
  id uuid primary key default gen_random_uuid(),
  season text not null,
  week_number int not null check (week_number between 1 and 40),
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'graded', 'final')),
  recap text,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season, week_number)
);

create table if not exists sb_items (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references sb_weeks(id) on delete cascade,
  sort int not null default 0,
  type text not null,
  prompt text not null,
  note text,
  options jsonb not null default '[]',
  points int not null check (points between 1 and 10),
  spec jsonb not null,
  locks_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'graded', 'void')),
  result jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sb_items_week_idx on sb_items (week_id, sort);

create table if not exists sb_picks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references sb_items(id) on delete cascade,
  player_id uuid not null references sb_players(id) on delete cascade,
  choice text,
  guess numeric,
  is_lock boolean not null default false,
  talk text check (talk is null or char_length(talk) <= 80),  /* Jaiye's and Remi's trash talk */
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, player_id)
);
create index if not exists sb_picks_player_idx on sb_picks (player_id);

/* Visitors are an anonymous browser id from a cookie. One of each emoji per visitor per pick. */
create table if not exists sb_reactions (
  item_id uuid not null references sb_items(id) on delete cascade,
  player_id uuid not null references sb_players(id) on delete cascade,
  emoji text not null check (emoji in ('fire', 'laugh', 'cold', 'clown', 'target')),
  visitor text not null,
  created_at timestamptz not null default now(),
  primary key (item_id, player_id, emoji, visitor)
);

create table if not exists sb_votes (
  week_id uuid not null references sb_weeks(id) on delete cascade,
  visitor text not null,
  choice text not null check (choice in ('jaiye', 'remi')),
  created_at timestamptz not null default now(),
  primary key (week_id, visitor)
);

/* A final week is frozen: no changes to the week, its items or its picks. */
create or replace function sb_weeks_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'final' then
      raise exception 'sb_weeks: a final week is locked' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.status = 'final' then
    raise exception 'sb_weeks: a final week is locked' using errcode = 'P0001';
  end if;
  if new.status = 'final' and new.finalized_at is null then
    new.finalized_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists sb_weeks_guard on sb_weeks;
create trigger sb_weeks_guard before insert or update or delete on sb_weeks
  for each row execute function sb_weeks_guard();

create or replace function sb_items_guard()
returns trigger language plpgsql as $$
declare
  st text;
begin
  select status into st from sb_weeks where id = coalesce(new.week_id, old.week_id);
  if st = 'final' then
    raise exception 'sb_items: a final week is locked' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists sb_items_guard on sb_items;
create trigger sb_items_guard before insert or update or delete on sb_items
  for each row execute function sb_items_guard();

/* Picks: only while the week is open and before the item locks. One lock per player per week. */
create or replace function sb_picks_guard()
returns trigger language plpgsql as $$
declare
  it record;
  wk text;
  locks int;
begin
  select i.locks_at, i.week_id into it from sb_items i where i.id = coalesce(new.item_id, old.item_id);
  select status into wk from sb_weeks where id = it.week_id;
  if wk is distinct from 'open' then
    raise exception 'sb_picks: this week is not open for picks' using errcode = 'P0001';
  end if;
  if now() >= it.locks_at then
    raise exception 'sb_picks: this pick is locked' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if tg_op = 'UPDATE' and (new.item_id <> old.item_id or new.player_id <> old.player_id) then
    raise exception 'sb_picks: cannot move a pick' using errcode = 'P0001';
  end if;
  if new.is_lock then
    select count(*) into locks
    from sb_picks p join sb_items i on i.id = p.item_id
    where p.player_id = new.player_id and i.week_id = it.week_id and p.is_lock and p.id <> new.id;
    if locks > 0 then
      raise exception 'sb_picks: only one Lock of the Week' using errcode = 'P0001';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists sb_picks_guard on sb_picks;
create trigger sb_picks_guard before insert or update or delete on sb_picks
  for each row execute function sb_picks_guard();

alter table nba_games enable row level security;
alter table nba_player_games enable row level security;
alter table sb_players enable row level security;
alter table sb_weeks enable row level security;
alter table sb_items enable row level security;
alter table sb_picks enable row level security;
alter table sb_reactions enable row level security;
alter table sb_votes enable row level security;

drop policy if exists "NBA games are public" on nba_games;
create policy "NBA games are public" on nba_games for select to anon, authenticated using (true);
drop policy if exists "NBA box scores are public" on nba_player_games;
create policy "NBA box scores are public" on nba_player_games for select to anon, authenticated using (true);
drop policy if exists "Published weeks are public" on sb_weeks;
create policy "Published weeks are public" on sb_weeks for select to anon, authenticated using (status <> 'draft');
drop policy if exists "Published items are public" on sb_items;
create policy "Published items are public" on sb_items for select to anon, authenticated
  using (exists (select 1 from sb_weeks w where w.id = week_id and w.status <> 'draft'));
