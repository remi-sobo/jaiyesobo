-- Migration 019: Draft Wheel — game #7.
--
-- Same-room two-player roster-building game. Each round, the wheel spins to
-- randomly assign each player a different NBA franchise. Each player picks
-- the best player at THAT POSITION from THEIR randomly assigned team. After
-- 5 rounds (G1, G2, F1, F2, C) the AI judges who built the better all-time team.
--
-- Reuses the Draft Room data layer (game_content with content_type='draft_team'
-- and 'draft_player'). No new content tables needed — picks live in plays.payload.
--
-- plays.payload = DraftWheelPlayPayload (see lib/games/draft-wheel.ts)
-- plays.result  = DraftWheelVerdict (Mike Breen JSON)

insert into games (slug, title, description, status) values
  ('draft-wheel', 'Draft Wheel', 'Spin the team. Pick the best at the spot. AI calls it.', 'live')
on conflict (slug) do nothing;
