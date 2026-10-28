/**
 * Sobo Sportsbook shapes. Each item carries a machine readable `spec` so
 * grading is plain code over box scores, never the AI.
 */

import type { TeamCode } from "@/lib/nba/teams";

export type StatKey = "pts" | "reb" | "ast" | "fg3m" | "stl" | "blk";

export const STAT_LABEL: Record<StatKey, string> = {
  pts: "points",
  reb: "rebounds",
  ast: "assists",
  fg3m: "3s made",
  stl: "steals",
  blk: "blocks",
};

export type PlayerRef = {
  /** NBA personId when we know it. Name plus team is the fallback match. */
  person_id: number | null;
  name: string;
  team: TeamCode;
  game_id: string;
};

/** Grading spec per item type. */
export type ItemSpec =
  | { type: "winner"; game_id: string }
  | { type: "spread"; game_id: string; team: TeamCode; line: number }
  | { type: "total"; game_id: string; line: number }
  | { type: "team_total"; game_id: string; team: TeamCode; line: number }
  | { type: "player_ou"; player: PlayerRef; stat: StatKey; line: number }
  | { type: "h2h"; players: [PlayerRef, PlayerRef]; stat: StatKey }
  | { type: "yes_no"; player: PlayerRef; check: "triple_double" | "double_double" | "at_least"; stat?: StatKey; threshold?: number }
  | { type: "margin"; game_id: string; team: TeamCode }
  | { type: "week_wins"; team: TeamCode; game_ids: string[]; buckets: Array<[number, number]> }
  | { type: "weekly_leader"; stat: StatKey; candidates: Array<{ person_id: number | null; name: string; team: TeamCode }> }
  | { type: "closest"; game_id: string; measure: "total_points" | "total_3s" | "team_points"; team?: TeamCode }
  | { type: "upset"; picks: Array<{ team: TeamCode; game_id: string }> }
  | { type: "custom" };

export type ItemType = ItemSpec["type"];

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  winner: "Winner",
  spread: "Spread",
  total: "Over/Under",
  team_total: "Team Total",
  player_ou: "Higher or Lower",
  h2h: "Head to Head",
  yes_no: "Yes or No",
  margin: "Margin",
  week_wins: "Week Long",
  weekly_leader: "Weekly Leader",
  closest: "Closest Guess",
  upset: "Upset Special",
  custom: "Jaiye's Prop",
};

export const DEFAULT_POINTS: Record<ItemType, number> = {
  winner: 1,
  spread: 2,
  total: 2,
  team_total: 2,
  player_ou: 2,
  h2h: 2,
  yes_no: 3,
  margin: 3,
  week_wins: 3,
  weekly_leader: 3,
  closest: 3,
  upset: 5,
  custom: 2,
};

export type ItemOption = { key: string; label: string; team?: TeamCode };

export type ItemResult = {
  /** Winning option keys. For closest, the actual number goes in `actual`. */
  winners: string[];
  actual: number | null;
  /** Short human line, like "Final: POR 112, SAC 108" or "Wemby had 14 rebounds". */
  display: string;
};

export type ItemStatus = "open" | "graded" | "void";

export type SbItem = {
  id: string;
  week_id: string;
  sort: number;
  type: ItemType;
  prompt: string;
  note: string | null;
  options: ItemOption[];
  points: number;
  spec: ItemSpec;
  locks_at: string;
  status: ItemStatus;
  result: ItemResult | null;
};

export type SbPick = {
  item_id: string;
  player_id: string;
  choice: string | null;
  guess: number | null;
  is_lock: boolean;
  /** One line of trash talk. Jaiye and Remi only. */
  talk?: string | null;
};

export type PlayerKind = "remi" | "jaiye" | "challenger";

export type SbPlayer = {
  id: string;
  kind: PlayerKind;
  display_name: string;
  hidden: boolean;
};

/** Only for admin screens. The code is a login credential: never pass this shape to a client component. */
export type SbPlayerWithCode = SbPlayer & { code: string | null };

export type WeekStatus = "draft" | "open" | "graded" | "final";

export type SbWeek = {
  id: string;
  season: string;
  week_number: number;
  starts_on: string;
  ends_on: string;
  status: WeekStatus;
  recap: string | null;
  finalized_at: string | null;
};
