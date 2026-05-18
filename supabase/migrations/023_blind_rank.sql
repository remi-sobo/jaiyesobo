-- Blind Rank — ninth game in the /games platform.
--
-- Solo ranking puzzle. Player picks a topic, sees 5 of 10 items one at a time
-- in random order, commits each to a slot (#1–#5) with no take-backs. After
-- the 5th lock, the AI's canonical ranking is revealed and the player's
-- placements are scored strict-positionally against the canonical ranking
-- of the 5 pulled items.
--
-- Topics are stored as game_content with content_type='blind_rank_topic'.
-- Each payload contains:
--   { title, subtitle, category, difficulty, pool_size,
--     items: [{name, rank, fact}] }  -- pool_size between 8 and 12
--
-- plays.payload = BlindRankPlayPayload (see lib/games/blind-rank.ts)
-- plays.result  = BlindRankResult

-- 1. Register the game. Schema is (slug, title, description, status).
insert into games (slug, title, description, status)
select 'blind-rank', 'Blind Rank', 'One at a time. No take-backs.', 'live'
where not exists (select 1 from games where slug = 'blind-rank');

-- 2. Fast lookup of verified, live topics for the picker.
create index if not exists game_content_blind_rank_idx
  on game_content(game_slug, content_type, status, verification_status)
  where content_type = 'blind_rank_topic';

-- 3. Add 'blind-rank' to Jaiye's games_audience so it surfaces on his hub.
update app_config
set value = jsonb_set(
  value,
  '{jaiye}',
  case
    when (value->'jaiye') ? 'blind-rank' then value->'jaiye'
    else (value->'jaiye') || '["blind-rank"]'::jsonb
  end
)
where key = 'games_audience';
