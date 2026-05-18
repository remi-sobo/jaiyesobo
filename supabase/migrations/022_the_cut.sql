-- The Cut — eighth game in the /games platform.
--
-- "Keep 4, Cut 4". Player sees 8 items in random order. Four belong together
-- based on a hidden criterion; four are imposters. Player picks 4 to keep.
--
-- Cut sets are stored as game_content with content_type='cut_set'. Each
-- payload contains:
--   { title, easy_prompt, hard_prompt, category, difficulty,
--     criterion_summary, items: [{name, is_keep, fact}] } -- exactly 4 keeps
--
-- plays.payload = { set_id, mode: 'easy'|'hard', items: [{name}], criterion? }
-- plays.result  = { score, correct_keeps, wrong_keeps, missed_keeps,
--                   all_items_with_facts, criterion_summary }

-- 1. Register the game. Schema is (slug, title, description, status).
insert into games (slug, title, description, status)
select 'the-cut', 'The Cut', 'Keep four. Cut four. Don''t blink.', 'live'
where not exists (select 1 from games where slug = 'the-cut');

-- 2. Fast lookup of verified, live cut sets for the random-pick query.
create index if not exists game_content_the_cut_idx
  on game_content(game_slug, content_type, status, verification_status)
  where content_type = 'cut_set';

-- 3. Add 'the-cut' to Jaiye's games_audience so it surfaces on his hub.
update app_config
set value = jsonb_set(
  value,
  '{jaiye}',
  case
    when (value->'jaiye') ? 'the-cut' then value->'jaiye'
    else (value->'jaiye') || '["the-cut"]'::jsonb
  end
)
where key = 'games_audience';
