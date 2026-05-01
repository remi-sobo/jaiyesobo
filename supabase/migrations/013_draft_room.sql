-- The Draft Room — reuses game_content from /games platform.
-- New content_types: 'draft_player' and 'draft_team'.

create index if not exists game_content_type_idx
  on game_content(game_slug, content_type, status);

alter table game_content
  add column if not exists verification_status text default 'pending'
  check (verification_status in ('pending', 'verified', 'rejected'));

alter table game_content add column if not exists draft_team_slug text;

create index if not exists draft_player_team_idx
  on game_content(draft_team_slug, status, verification_status)
  where content_type = 'draft_player';

create table if not exists draft_failed_searches (
  id uuid primary key default gen_random_uuid(),
  search_term text not null,
  team_slug text,
  occurred_at timestamptz default now(),
  resolved_at timestamptz
);

create index if not exists draft_failed_searches_unresolved_idx
  on draft_failed_searches(occurred_at)
  where resolved_at is null;
