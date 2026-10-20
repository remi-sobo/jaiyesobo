/*
  Migration 026: Sobo Sportsbook "Submit my picks".

  When Jaiye or Remi submits, their picks for that week are locked for good
  and shown on the public page. The trigger enforces it for every role.
*/

create table if not exists sb_submissions (
  week_id uuid not null references sb_weeks(id) on delete cascade,
  player_id uuid not null references sb_players(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  primary key (week_id, player_id)
);
alter table sb_submissions enable row level security;

create or replace function sb_picks_submitted_guard()
returns trigger language plpgsql as $$
declare
  wk uuid;
begin
  select week_id into wk from sb_items where id = coalesce(new.item_id, old.item_id);
  if exists (
    select 1 from sb_submissions s
    where s.week_id = wk and s.player_id = coalesce(new.player_id, old.player_id)
  ) then
    raise exception 'sb_picks: these picks are submitted and locked' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists sb_picks_submitted_guard on sb_picks;
create trigger sb_picks_submitted_guard before insert or update or delete on sb_picks
  for each row execute function sb_picks_submitted_guard();
