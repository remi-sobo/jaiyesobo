-- Crossword — fifth game in the /games platform.
--
-- Reuses word_pack content (every published word pack can have a crossword
-- grid generated from its words + hints). The generated grid lives on the
-- pack's payload as `crossword_grid`. No new content_type.
--
-- plays.payload = { pack_id, theme_slug, time_ms?, completed_at?, filled?: ... }
-- plays.result  = { time_ms, correct_cells, total_cells, perfect, roast }

insert into games (slug, title, description, status) values
  ('crossword', 'Crossword', 'Themed NBA crosswords built from word packs.', 'live')
on conflict (slug) do nothing;

-- Per-user streak counter (mirrors trivia_streaks shape).
-- "Streak" = consecutive days with at least one perfect crossword.
create table if not exists crossword_streaks (
  user_id uuid primary key references users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_completed_date date,
  last_completed_at timestamptz,
  updated_at timestamptz default now()
);

create index if not exists crossword_streaks_user_idx on crossword_streaks(user_id);
