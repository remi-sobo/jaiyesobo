/**
 * Draft Wheel — types, slot/position helpers, spin logic.
 *
 * Each game is 5 rounds: G1, G2, F1, F2, C. The wheel spins a fresh random team
 * for EACH player at the start of every round. The player picks the best
 * player at the slot's position from their randomly assigned team. AI judges
 * the matchup at the end (Mike Breen voice with random-team context).
 *
 * Reuses Draft Room's player data (game_content where content_type='draft_player').
 */

import type { DraftPosition, DraftPlayerPayload, DraftTeamPayload } from "@/lib/draft-data";

export type WheelSide = "a" | "b";

/** The five lineup slots, in round order. */
export const WHEEL_SLOTS = ["G1", "G2", "F1", "F2", "C"] as const;
export type WheelSlot = (typeof WHEEL_SLOTS)[number];

export const TOTAL_ROUNDS = WHEEL_SLOTS.length;

/** Map a slot to its underlying position (G/F/C). */
export function positionForSlot(slot: WheelSlot): DraftPosition {
  if (slot === "G1" || slot === "G2") return "G";
  if (slot === "F1" || slot === "F2") return "F";
  return "C";
}

/** A single locked pick. */
export type WheelPick = {
  player_id: string;
  player_name: string;
  peak_label: string;
  primary_position: DraftPosition;
};

/** Per-round assignment for one player. */
export type WheelTeamAssignment = {
  team_slug: string;
  team: DraftTeamPayload;
  /** True if this team came from a re-roll (not the original spin). */
  rerolled?: boolean;
};

/** A round in the play payload. */
export type WheelRound = {
  index: number; // 0..4
  slot: WheelSlot;
  position: DraftPosition;
  a: WheelTeamAssignment | null; // null until /spin
  b: WheelTeamAssignment | null;
  pick_a: WheelPick | null; // null until A locks
  pick_b: WheelPick | null;
};

export type WheelPlayerNames = { a: string; b: string };

export type WheelRerollState = { a: boolean; b: boolean };

/** Stored on plays.payload for game_slug='draft-wheel'. */
export type DraftWheelPlayPayload = {
  player_names: WheelPlayerNames;
  /**
   * 5 round records. Created up-front (length 5) so the schema is stable;
   * `a/b` and `pick_*` fill in as the game progresses.
   */
  rounds: WheelRound[];
  /** Re-roll tokens still available. true = available, false = spent. */
  rerolls_available: WheelRerollState;
  /**
   * All team_slugs that have been assigned at any point this game (including
   * teams that were later re-rolled away). Used to keep spins/re-rolls unique.
   */
  used_team_slugs: string[];
};

/** AI verdict shape stored on plays.result. */
export type DraftWheelVerdict = {
  winner: WheelSide | "tie";
  a_grade: string;
  b_grade: string;
  a_summary: string;
  b_summary: string;
  /** Optional per-slot calls — Mike Breen one-liner per round. */
  slot_calls?: { slot: WheelSlot; winner: WheelSide | "even"; line: string }[];
  verdict: string;
  series_score?: string;
  series_story?: string;
};

/* ----------------------------- helpers ----------------------------- */

/** Whose turn is it in the given round. A goes first; B goes after A locks. */
export function turnFor(round: WheelRound): WheelSide | null {
  if (!round.a || !round.b) return null; // teams not assigned yet
  if (!round.pick_a) return "a";
  if (!round.pick_b) return "b";
  return null;
}

/** Index of the active round (first not-yet-completed), or -1 if all done. */
export function activeRoundIndex(rounds: WheelRound[]): number {
  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i];
    if (!r.pick_a || !r.pick_b) return i;
  }
  return -1;
}

/** True if all 5 rounds have both picks locked. */
export function isComplete(payload: DraftWheelPlayPayload): boolean {
  if (payload.rounds.length !== TOTAL_ROUNDS) return false;
  return payload.rounds.every((r) => !!r.pick_a && !!r.pick_b);
}

/** Build the empty `rounds` skeleton at game start. */
export function buildInitialRounds(): WheelRound[] {
  return WHEEL_SLOTS.map((slot, i) => ({
    index: i,
    slot,
    position: positionForSlot(slot),
    a: null,
    b: null,
    pick_a: null,
    pick_b: null,
  }));
}

/**
 * Draw two distinct random teams from the available pool, neither of which
 * has been used yet this game.
 *
 * Throws if fewer than 2 unused teams remain.
 */
export function spinWheel(
  availableTeams: readonly string[],
  usedTeamSlugs: ReadonlySet<string>
): { a: string; b: string } {
  const pool = availableTeams.filter((s) => !usedTeamSlugs.has(s));
  if (pool.length < 2) {
    throw new Error("not_enough_teams");
  }
  const shuffled = shuffleInPlace([...pool]);
  return { a: shuffled[0], b: shuffled[1] };
}

/** Pull one random unused team for a single side (re-roll path). */
export function pickReplacementTeam(
  availableTeams: readonly string[],
  usedTeamSlugs: ReadonlySet<string>
): string {
  const pool = availableTeams.filter((s) => !usedTeamSlugs.has(s));
  if (pool.length < 1) throw new Error("not_enough_teams");
  return pool[Math.floor(Math.random() * pool.length)];
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Filter a team's verified player pool down to those eligible for a slot's
 * position — primary OR secondary position match. Excludes anyone already
 * picked by either player this game (across all slots).
 */
export function eligiblePlayersForSlot(
  pool: { id: string; payload: DraftPlayerPayload }[],
  position: DraftPosition,
  pickedIds: ReadonlySet<string>
): { id: string; payload: DraftPlayerPayload }[] {
  return pool.filter((row) => {
    if (pickedIds.has(row.id)) return false;
    const p = row.payload;
    if (p.primary_position === position) return true;
    if (Array.isArray(p.secondary_positions) && p.secondary_positions.includes(position)) {
      return true;
    }
    return false;
  });
}

/** Convenience: collect all picked player ids across the game. */
export function pickedIdsAcrossGame(rounds: WheelRound[]): Set<string> {
  const out = new Set<string>();
  for (const r of rounds) {
    if (r.pick_a) out.add(r.pick_a.player_id);
    if (r.pick_b) out.add(r.pick_b.player_id);
  }
  return out;
}

/** Display label for a side, given the names. */
export function nameFor(side: WheelSide, names: WheelPlayerNames): string {
  return side === "a" ? names.a : names.b;
}
