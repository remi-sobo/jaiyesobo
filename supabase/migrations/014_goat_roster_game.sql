-- GOAT Roster: single-player roster builder. Reuses the draft_player pool
-- from migration 013. AI judges the lineup of 5.

insert into games (slug, title, description, status) values
  ('goat-roster', 'GOAT Roster', 'Pick 5 starters from a franchise''s all-time pool. AI scores your lineup.', 'beta')
on conflict (slug) do nothing;
