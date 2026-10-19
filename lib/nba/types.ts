/**
 * NBA prediction data shapes. These keys are fixed so a later phase can score
 * picks against real results without a schema change. Never rename them.
 *
 * Team codes: the 30 three letter codes in lib/nba/teams.ts (POR, OKC, ...).
 *
 * standings: { west: TeamCode[15], east: TeamCode[15] }, index 0 is the 1 seed.
 *
 * play_in keys (value is { winner }):
 *   W-PI-7v8    7 seed vs 8 seed. Winner is the 7 seed.
 *   W-PI-9v10   9 seed vs 10 seed. Loser is out.
 *   W-PI-LAST   loser of W-PI-7v8 vs winner of W-PI-9v10. Winner is the 8 seed.
 *   E-PI-7v8, E-PI-9v10, E-PI-LAST   same for the East.
 *
 * bracket keys (value is { winner, games } where games is 4, 5, 6 or 7):
 *   W-R1-1v8, W-R1-4v5, W-R1-3v6, W-R1-2v7   first round
 *   W-R2-TOP    winner of 1v8 vs winner of 4v5
 *   W-R2-BOT    winner of 3v6 vs winner of 2v7
 *   W-CF        West finals
 *   E-R1-1v8, E-R1-4v5, E-R1-3v6, E-R1-2v7, E-R2-TOP, E-R2-BOT, E-CF
 *   FINALS      W-CF winner vs E-CF winner
 *
 * awards keys (value is { player, team }):
 *   mvp, dpoy, roy, smoy, mip, clutch, coy, cup,
 *   west_finals_mvp, east_finals_mvp, finals_mvp
 *   cup is a team pick only, so its player is always "".
 */

import type { TeamCode } from "./teams";

export type Side = "W" | "E";

export const PLAY_IN_KEYS = [
  "W-PI-7v8", "W-PI-9v10", "W-PI-LAST",
  "E-PI-7v8", "E-PI-9v10", "E-PI-LAST",
] as const;
export type PlayInKey = (typeof PLAY_IN_KEYS)[number];

export const SERIES_KEYS = [
  "W-R1-1v8", "W-R1-4v5", "W-R1-3v6", "W-R1-2v7", "W-R2-TOP", "W-R2-BOT", "W-CF",
  "E-R1-1v8", "E-R1-4v5", "E-R1-3v6", "E-R1-2v7", "E-R2-TOP", "E-R2-BOT", "E-CF",
  "FINALS",
] as const;
export type SeriesKey = (typeof SERIES_KEYS)[number];

export const AWARD_KEYS = [
  "mvp", "dpoy", "roy", "smoy", "mip", "clutch", "coy", "cup",
  "west_finals_mvp", "east_finals_mvp", "finals_mvp",
] as const;
export type AwardKey = (typeof AWARD_KEYS)[number];

export type SeriesGames = 4 | 5 | 6 | 7;

export type Standings = { west: TeamCode[]; east: TeamCode[] };
export type PlayInPicks = Partial<Record<PlayInKey, { winner: TeamCode }>>;
export type BracketPicks = Partial<Record<SeriesKey, { winner: TeamCode; games: SeriesGames | null }>>;
export type AwardPick = { player: string; team: TeamCode | null };
export type AwardPicks = Partial<Record<AwardKey, AwardPick>>;

/** The editable part of a prediction. Mirrors the jsonb columns. */
export type PredictionPicks = {
  standings: Standings;
  play_in: PlayInPicks;
  bracket: BracketPicks;
  awards: AwardPicks;
  hot_take: string;
};

export type PredictionRow = PredictionPicks & {
  id: string;
  user_id: string;
  season: string;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string | null;
};

export type AwardDef = {
  key: AwardKey;
  label: string;
  /** cup is a team pick, everything else takes a name. */
  kind: "player" | "coach" | "team";
};

export const AWARDS: AwardDef[] = [
  { key: "mvp", label: "MVP", kind: "player" },
  { key: "dpoy", label: "Defensive Player of the Year", kind: "player" },
  { key: "roy", label: "Rookie of the Year", kind: "player" },
  { key: "smoy", label: "Sixth Man of the Year", kind: "player" },
  { key: "mip", label: "Most Improved Player", kind: "player" },
  { key: "clutch", label: "Clutch Player of the Year", kind: "player" },
  { key: "coy", label: "Coach of the Year", kind: "coach" },
  { key: "cup", label: "NBA Cup Champion", kind: "team" },
  { key: "west_finals_mvp", label: "West Finals MVP", kind: "player" },
  { key: "east_finals_mvp", label: "East Finals MVP", kind: "player" },
  { key: "finals_mvp", label: "NBA Finals MVP", kind: "player" },
];

export const HOT_TAKE_MAX = 140;
