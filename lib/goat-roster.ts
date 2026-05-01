/**
 * Shared types for GOAT Roster — the single-player roster builder.
 * Reuses the verified draft_player pool. No game state on server during play;
 * picks only persist when the user submits for judgment.
 */

import type { DraftPosition, DraftPlayerPayload, DraftTeamPayload } from "@/lib/draft-data";

export type RosterPlayer = {
  id: string;
  name: string;
  primary_position: DraftPosition;
  secondary_positions: DraftPosition[];
  team_stint: { years: string; peak_label: string; is_iconic: boolean };
};

export type RosterPick = {
  player_id: string;
  player_name: string;
  primary_position: DraftPosition;
};

export type GoatRosterPlayPayload = {
  team_slug: string;
  team: DraftTeamPayload;
  picks: RosterPick[]; // exactly 6 — 5 starters + sixth man
};

export type RosterPickVerdict = {
  name: string;
  verdict: "elite" | "smart" | "reach" | "questionable";
};

export type GoatRosterVerdict = {
  score: number;       // 1..100
  grade: string;       // letter grade like "A-", "B+", "S"
  take: string;        // overall verdict, ≤45 words
  per_pick: RosterPickVerdict[];
  vibe: string;        // one-line vibe check, ≤12 words
};

export const ROSTER_SIZE = 6;
export const STARTERS = 5;
/** Slot labels for display. Slots 1-5 are starters, slot 6 is the sixth man. */
export const SLOT_LABELS = ["Starter 1", "Starter 2", "Starter 3", "Starter 4", "Starter 5", "6th Man"] as const;

export function toRosterPlayer(id: string, p: DraftPlayerPayload): RosterPlayer {
  return {
    id,
    name: p.name,
    primary_position: p.primary_position,
    secondary_positions: p.secondary_positions ?? [],
    team_stint: p.team_stint,
  };
}

/** Quick balance check: count positions across the roster. */
export function countPositions(picks: RosterPick[]): { G: number; F: number; C: number } {
  const counts = { G: 0, F: 0, C: 0 };
  for (const p of picks) counts[p.primary_position] += 1;
  return counts;
}

/** True if at least 1 of each position. Used for soft hint, not a hard block. */
export function isBalanced(picks: RosterPick[]): boolean {
  const c = countPositions(picks);
  return c.G >= 1 && c.F >= 1 && c.C >= 1;
}
