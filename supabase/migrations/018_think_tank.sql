-- Think Tank — first Kemi-specific lesson type (deductive logic puzzles).
-- Puzzles are stored as game_content rows, namespaced by game_slug='think-tank'
-- with content_type='think_tank_puzzle'. Each task that runs a Think Tank
-- lesson has metadata.puzzle_id pointing at a game_content row.

-- 1. Register 'think-tank' as a game so the FK on game_content.game_slug holds.
--    Add an 'internal' status so we can keep Think Tank out of the public
--    games index (it's a lesson backend, not a public game).
alter table games drop constraint if exists games_status_check;
alter table games add constraint games_status_check
  check (status in ('live', 'beta', 'archived', 'internal'));

insert into games (slug, title, description, status) values
  ('think-tank', 'Think Tank', 'Deductive logic puzzles for Kemi.', 'internal')
on conflict (slug) do nothing;

-- 2. Index for the puzzle-by-status lookup the lesson runner does.
create index if not exists game_content_think_tank_idx
  on game_content(game_slug, content_type, status)
  where content_type = 'think_tank_puzzle';

-- 3. Per-user solve log. One row per (user, puzzle) — replaying the same puzzle
--    bumps `attempts` rather than inserting a duplicate (handled in the API,
--    enforced by the unique index here).
create table if not exists think_tank_solves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  puzzle_id uuid references game_content(id) not null,
  task_id uuid references tasks(id),
  solved_at timestamptz default now(),
  attempts int default 1,
  used_hints int default 0,
  unique(user_id, puzzle_id)
);

create index if not exists think_tank_solves_user_idx
  on think_tank_solves(user_id, solved_at desc);

-- 4. Tasks gain a generic metadata jsonb column. Lesson tasks use it to point
--    at a specific puzzle: { "puzzle_id": "<uuid>" }. Other lesson types can
--    store their own per-task config here too.
alter table tasks add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists tasks_metadata_puzzle_idx
  on tasks((metadata->>'puzzle_id'))
  where metadata ? 'puzzle_id';
