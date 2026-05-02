/**
 * Shared types + turn helpers for The Draft Room game.
 * Kept separate from lib/draft-data (which is admin/curator side).
 */

import type { DraftPosition, DraftPlayerPayload, DraftTeamPayload } from "@/lib/draft-data";

export type DraftSide = "human" | "ai";

/** A single player in the live pool (sent to client at game start). */
export type DraftPoolPlayer = {
  id: string;
  name: string;
  search_aliases: string[];
  primary_position: DraftPosition;
  secondary_positions: DraftPosition[];
  team_stint: { years: string; peak_label: string; is_iconic: boolean };
};

export type DraftPick = {
  side: DraftSide;
  player_id: string;
  player_name: string;
  primary_position: DraftPosition;
  reason?: string; // populated for AI picks
  round: number;       // 1..5
  pick_number: number; // 1..10 overall
};

export type DraftMode = "vs-ai" | "vs-friend";

/** When mode === "vs-friend", `human` is Player 1 and `ai` is Player 2. */
export type PlayerNames = { human: string; ai: string };

export type DraftPlayPayload = {
  team_slug: string;
  team: DraftTeamPayload; // city/name/abbreviation/primary_color/founded
  starts: DraftSide;
  picks: DraftPick[];
  /** Defaults to "vs-ai" when missing (backward-compat for plays predating
   * Stage 3). In vs-friend mode the AI is never invoked for picks; both
   * sides come from human submissions. The judge still scores the matchup. */
  mode?: DraftMode;
  /** Required when mode === "vs-friend"; otherwise ignored. */
  player_names?: PlayerNames;
};

/** Display label for a side, given the mode + (optional) names.
 *  Use this anywhere the UI says "You" / "Claude". */
export function sideLabel(side: DraftSide, payload: Pick<DraftPlayPayload, "mode" | "player_names">): string {
  if (payload.mode === "vs-friend" && payload.player_names) {
    return side === "human" ? payload.player_names.human : payload.player_names.ai;
  }
  return side === "human" ? "You" : "Claude";
}

export type DraftJudgement = {
  winner: DraftSide | "tie";
  human_grade: string;  // "A-", "B+", etc
  ai_grade: string;
  human_summary: string; // why their roster is good/flawed (1-2 sentences)
  ai_summary: string;
  verdict: string;       // overall closing line (one sentence)
  /** Best-of-7 playoff series score from the winner's POV, e.g. "4-2".
   * For ties the LLM returns "3-3" (or similar). Optional for backward-compat
   * with verdicts judged before the playoff-series feature shipped. */
  series_score?: string;
  /** Short, fun narrative (1-3 sentences) of what happened in the series —
   * which game flipped it, who showed up when it mattered. Optional for
   * backward-compat. */
  series_story?: string;
};

export const PICKS_PER_SIDE = 5;
export const TOTAL_PICKS = PICKS_PER_SIDE * 2;

/**
 * Snake order: starter goes first in odd rounds (1,3,5), second in even rounds (2,4).
 *   pickIndex 0..9 → side
 */
export function turnAt(pickIndex: number, starts: DraftSide): DraftSide {
  if (pickIndex < 0 || pickIndex >= TOTAL_PICKS) {
    throw new Error(`pickIndex out of range: ${pickIndex}`);
  }
  const round = Math.floor(pickIndex / 2); // 0..4
  const positionInRound = pickIndex % 2;   // 0 = first this round, 1 = second
  const startsThisRound: DraftSide =
    round % 2 === 0 ? starts : flip(starts);
  return positionInRound === 0 ? startsThisRound : flip(startsThisRound);
}

export function flip(side: DraftSide): DraftSide {
  return side === "human" ? "ai" : "human";
}

/** Whose turn it is given the picks-so-far array. Returns null if draft is over. */
export function nextTurn(picks: DraftPick[], starts: DraftSide): DraftSide | null {
  if (picks.length >= TOTAL_PICKS) return null;
  return turnAt(picks.length, starts);
}

/** Round number (1-indexed) for a 0-indexed pickIndex. */
export function roundFor(pickIndex: number): number {
  return Math.floor(pickIndex / 2) + 1;
}

/** Convert a stored player payload + id to a pool player. */
export function toPoolPlayer(id: string, p: DraftPlayerPayload): DraftPoolPlayer {
  return {
    id,
    name: p.name,
    search_aliases: p.search_aliases,
    primary_position: p.primary_position,
    secondary_positions: p.secondary_positions ?? [],
    team_stint: p.team_stint,
  };
}
