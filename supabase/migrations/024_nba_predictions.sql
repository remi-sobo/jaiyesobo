/*
  Migration 024: NBA season predictions.

  One row per kid per season. Picks live in jsonb so a later scoring phase
  can compare them to real results without a schema change. Key names are
  documented at the top of lib/nba/types.ts.

  Locking is enforced here, not just in the UI:
    1. A published row can never be updated or deleted (trigger below).
    2. A row can only become published if every required pick is filled.
  The trigger runs for every role, including the service role the app uses.

  Note: this app signs in with PINs and talks to Supabase with the service
  role, so user_id points at our own users table (like every other kid
  scoped table) rather than auth.users.
*/

create table if not exists nba_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  season text not null check (season ~ '^[0-9]{4}-[0-9]{2}$'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  standings jsonb,
  play_in jsonb,
  bracket jsonb,
  awards jsonb,
  hot_take text check (hot_take is null or char_length(hot_take) <= 140),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, season),
  check ((status = 'published') = (published_at is not null))
);

/* True when every required pick is present. Mirrors missingPicks() in lib/nba/logic.ts. */
create or replace function nba_prediction_is_complete(p nba_predictions)
returns boolean
language plpgsql
immutable
as $$
declare
  k text;
begin
  if p.standings is null
     or jsonb_typeof(p.standings -> 'west') <> 'array'
     or jsonb_typeof(p.standings -> 'east') <> 'array'
     or jsonb_array_length(p.standings -> 'west') <> 15
     or jsonb_array_length(p.standings -> 'east') <> 15 then
    return false;
  end if;

  foreach k in array array['W-PI-7v8','W-PI-9v10','W-PI-LAST','E-PI-7v8','E-PI-9v10','E-PI-LAST'] loop
    if coalesce(p.play_in -> k ->> 'winner', '') = '' then
      return false;
    end if;
  end loop;

  foreach k in array array[
    'W-R1-1v8','W-R1-4v5','W-R1-3v6','W-R1-2v7','W-R2-TOP','W-R2-BOT','W-CF',
    'E-R1-1v8','E-R1-4v5','E-R1-3v6','E-R1-2v7','E-R2-TOP','E-R2-BOT','E-CF',
    'FINALS'
  ] loop
    if coalesce(p.bracket -> k ->> 'winner', '') = ''
       or coalesce(p.bracket -> k ->> 'games', '') not in ('4','5','6','7') then
      return false;
    end if;
  end loop;

  /* Every award needs a name except the NBA Cup, which is a team pick. */
  foreach k in array array['mvp','dpoy','roy','smoy','mip','clutch','coy','west_finals_mvp','east_finals_mvp','finals_mvp'] loop
    if btrim(coalesce(p.awards -> k ->> 'player', '')) = '' then
      return false;
    end if;
  end loop;

  /* Every award needs a team except Coach of the Year. */
  foreach k in array array['mvp','dpoy','roy','smoy','mip','clutch','cup','west_finals_mvp','east_finals_mvp','finals_mvp'] loop
    if coalesce(p.awards -> k ->> 'team', '') = '' then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function nba_predictions_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'published' then
      raise exception 'nba_predictions: published picks are locked forever' using errcode = 'P0001';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.status = 'published' then
    raise exception 'nba_predictions: published picks are locked forever' using errcode = 'P0001';
  end if;

  if new.status = 'published' then
    if not nba_prediction_is_complete(new) then
      raise exception 'nba_predictions: cannot publish with missing picks' using errcode = 'P0001';
    end if;
    /* Server clock, not the caller's. */
    new.published_at := now();
  else
    new.published_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists nba_predictions_guard on nba_predictions;
create trigger nba_predictions_guard
  before insert or update or delete on nba_predictions
  for each row execute function nba_predictions_guard();

/*
  RLS. Anyone can read published rows. Nobody writes through the public
  keys: drafts are saved by the admin API with the service role, after the
  admin PIN check, scoped to the active kid.
*/
alter table nba_predictions enable row level security;

drop policy if exists "Published predictions are public" on nba_predictions;
create policy "Published predictions are public"
  on nba_predictions for select
  to anon, authenticated
  using (status = 'published');
