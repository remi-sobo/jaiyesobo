-- Trivia game support: streak tracking + flip game live.

create index if not exists game_content_trivia_difficulty_idx
  on game_content(game_slug, status)
  where game_slug = 'trivia';

create table trivia_streaks (
  identifier text primary key,
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_round_date date,
  last_round_score int,
  total_rounds int not null default 0,
  total_correct int not null default 0,
  updated_at timestamptz default now()
);

update games set status = 'live' where slug = 'trivia';
