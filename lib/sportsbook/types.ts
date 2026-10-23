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

/** Fantasy points: points 1, rebounds 1.2, assists 1.5, steals 3, blocks 3, turnovers -1. */
export type MostStat = StatKey | "fantasy";

export const MOST_STAT_LABEL: Record<MostStat, string> = { ...STAT_LABEL, fantasy: "fantasy points" };

export const FANTASY_RULES = "Points 1, rebounds 1.2, assists 1.5, steals 3, blocks 3, turnovers minus 1.";

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
  /**
   * Who gets the most of a stat, 2 to 4 players. "game": each player in the
   * game on their ref. "week": totals over every game from lock to Sunday.
   */
  | { type: "most"; players: PlayerRef[]; stat: MostStat; scope: "game" | "week" }
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
  most: "Who Gets More",
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
  most: 2,
  yes_no: 3,
  margin: 3,
  week_wins: 3,
  weekly_leader: 3,
  closest: 3,
  upset: 5,
  custom: 2,
};

/** From week 2, picks come in tiles of about 5. */
export type Category = "matchups" | "battles" | "fantasy" | "higher_lower" | "yes_no" | "wild";

export const CATEGORIES: Category[] = ["matchups", "battles", "fantasy", "higher_lower", "yes_no", "wild"];

export const CATEGORY_INFO: Record<Category, { title: string; blurb: string; points: string; types: ItemType[] }> = {
  matchups: {
    title: "Big Matchups",
    blurb: "The best games of the week. Good teams, close games. Who wins?",
    points: "1 pt each",
    types: ["winner"],
  },
  battles: {
    title: "Player Battles",
    blurb: "Two players. Who gets more? Points, boards, dimes, 3s. Some go all week.",
    points: "2 pts each",
    types: ["most", "h2h"],
  },
  fantasy: {
    title: "Fantasy Showdown",
    blurb: "Pick who puts up the biggest fantasy night.",
    points: "3 pts each",
    types: ["most"],
  },
  higher_lower: {
    title: "Higher or Lower",
    blurb: "One number. Over or under?",
    points: "2 pts each",
    types: ["player_ou", "team_total", "total"],
  },
  yes_no: {
    title: "Yes or No",
    blurb: "Big moments. Is it happening or not?",
    points: "3 pts each",
    types: ["yes_no", "spread"],
  },
  wild: {
    title: "Wild Cards",
    blurb: "Upsets, guesses and week long calls. Big points.",
    points: "3 to 5 pts",
    types: ["upset", "closest", "week_wins", "weekly_leader", "margin", "custom"],
  },
};

/** Points by tile. Wild Cards go by type: the Upset Special is worth 5. */
export function categoryPoints(category: Category, type: ItemType): number {
  switch (category) {
    case "matchups":
      return 1;
    case "battles":
    case "higher_lower":
      return 2;
    case "fantasy":
    case "yes_no":
      return 3;
    case "wild":
      return type === "upset" ? 5 : 3;
  }
}

/** The tile an item belongs in, for week 1 items that were made before tiles. */
export function categoryOf(item: Pick<SbItem, "category" | "type" | "spec">): Category {
  if (item.category) return item.category;
  if (item.type === "most" && item.spec.type === "most" && item.spec.stat === "fantasy") return "fantasy";
  return CATEGORIES.find((c) => CATEGORY_INFO[c].types.includes(item.type)) ?? "wild";
}

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
  /** Null for week 1, which came before tiles. */
  category: Category | null;
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
  code: string | null;
  hidden: boolean;
};

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
