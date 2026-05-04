-- Word Search — fourth game in the /games platform.
-- Word packs reuse game_content with content_type='word_pack'.
-- Plays reuse the existing plays table with game_slug='word-search'.
-- payload = { pack_id, theme_slug, words: [...], time_ms?, words_found?: [], completed_at? }
-- result  = { time_ms, words_found_count, total_words, perfect, roast }

insert into games (slug, title, description, status) values
  ('word-search', 'Word Search', 'Themed NBA word search puzzles. Drag, find, beat the clock.', 'live')
on conflict (slug) do nothing;

-- Fast lookup of word packs by team
create index if not exists game_content_word_pack_idx
  on game_content(game_slug, content_type, status, draft_team_slug)
  where content_type = 'word_pack';
