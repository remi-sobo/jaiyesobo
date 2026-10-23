/*
  Migration 027: Sobo Sportsbook tiles.

  From week 2 the slate is grouped into tiles (Big Matchups, Player Battles,
  Fantasy Showdown, Higher or Lower, Yes or No, Wild Cards), about 5 picks each.
  Fantasy points subtract turnovers, so box scores store them now.

  Both changes only add columns. Week 1 items keep a null category and still
  show the old way.
*/

alter table sb_items add column if not exists category text
  check (category is null or category in ('matchups', 'battles', 'fantasy', 'higher_lower', 'yes_no', 'wild'));

alter table nba_player_games add column if not exists tov int not null default 0;
