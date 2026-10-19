/**
 * Pure bracket logic shared by the builder, the API and the public page.
 * Nothing here touches the database, so the client and server always agree
 * on who plays who.
 */

import { conferenceTeams, isTeamCode, TEAMS, type Conference, type TeamCode } from "./teams";
import {
  AWARD_KEYS,
  AWARDS,
  HOT_TAKE_MAX,
  PLAY_IN_KEYS,
  SERIES_KEYS,
  type AwardPicks,
  type BracketPicks,
  type PlayInKey,
  type PlayInPicks,
  type PredictionPicks,
  type SeriesGames,
  type SeriesKey,
  type Side,
} from "./types";

export const CURRENT_SEASON = "2026-27";

/** Season slugs look like 2026-27. Used to validate URL params. */
export function isSeasonSlug(v: string): boolean {
  return /^\d{4}-\d{2}$/.test(v);
}

export const SIDE_CONF: Record<Side, Conference> = { W: "west", E: "east" };
export const SIDE_LABEL: Record<Side, string> = { W: "West", E: "East" };

export function emptyPicks(): PredictionPicks {
  return {
    standings: { west: conferenceTeams("west"), east: conferenceTeams("east") },
    play_in: {},
    bracket: {},
    awards: {},
    hot_take: "",
  };
}

/* Play-In */

export type Slot = { code: TeamCode; seed: number } | null;

export type PlayInGame = {
  key: PlayInKey;
  label: string;
  note: string;
  a: Slot;
  b: Slot;
  winner: TeamCode | null;
};

function standingsFor(picks: PredictionPicks, side: Side): TeamCode[] {
  return picks.standings[SIDE_CONF[side]];
}

function slotAt(order: TeamCode[], seed: number): Slot {
  const code = order[seed - 1];
  return code ? { code, seed } : null;
}

function winnerIn(winner: TeamCode | undefined, a: Slot, b: Slot): TeamCode | null {
  if (!winner) return null;
  if (a?.code === winner || b?.code === winner) return winner;
  return null;
}

function other(winner: TeamCode | null, a: Slot, b: Slot): Slot {
  if (!winner || !a || !b) return null;
  return a.code === winner ? b : a;
}

function pickedSlot(winner: TeamCode | null, a: Slot, b: Slot): Slot {
  if (!winner) return null;
  return a?.code === winner ? a : b?.code === winner ? b : null;
}

/** The three play-in games for one side, filled in as far as the picks allow. */
export function playInGames(picks: PredictionPicks, side: Side): PlayInGame[] {
  const order = standingsFor(picks, side);
  const k = (s: string) => `${side}-PI-${s}` as PlayInKey;

  const g1a = slotAt(order, 7);
  const g1b = slotAt(order, 8);
  const g1w = winnerIn(picks.play_in[k("7v8")]?.winner, g1a, g1b);

  const g2a = slotAt(order, 9);
  const g2b = slotAt(order, 10);
  const g2w = winnerIn(picks.play_in[k("9v10")]?.winner, g2a, g2b);

  const g3a = other(g1w, g1a, g1b);
  const g3b = pickedSlot(g2w, g2a, g2b);
  const g3w = winnerIn(picks.play_in[k("LAST")]?.winner, g3a, g3b);

  return [
    { key: k("7v8"), label: "Game 1", note: "7 vs 8. Winner is the 7 seed.", a: g1a, b: g1b, winner: g1w },
    { key: k("9v10"), label: "Game 2", note: "9 vs 10. Loser is out.", a: g2a, b: g2b, winner: g2w },
    {
      key: k("LAST"),
      label: "Game 3",
      note: "Loser of Game 1 vs winner of Game 2. Winner is the 8 seed.",
      a: g3a,
      b: g3b,
      winner: g3w,
    },
  ];
}

/** Final playoff seeds 1 through 8 for one side. 7 and 8 come from the play-in. */
export function playoffSeeds(picks: PredictionPicks, side: Side): Slot[] {
  const order = standingsFor(picks, side);
  const [g1, , g3] = playInGames(picks, side);
  const seeds: Slot[] = [];
  for (let s = 1; s <= 6; s++) seeds.push(slotAt(order, s));
  seeds.push(g1.winner ? { code: g1.winner, seed: 7 } : null);
  seeds.push(g3.winner ? { code: g3.winner, seed: 8 } : null);
  return seeds;
}

/* Playoffs */

export type Round = "R1" | "R2" | "CF" | "FINALS";

export type Series = {
  key: SeriesKey;
  side: Side | null;
  round: Round;
  label: string;
  /** The higher seed sits on top. */
  top: Slot;
  bottom: Slot;
  winner: TeamCode | null;
  games: SeriesGames | null;
};

const R1_PAIRS: Array<[string, number, number]> = [
  ["1v8", 1, 8],
  ["4v5", 4, 5],
  ["3v6", 3, 6],
  ["2v7", 2, 7],
];

function ordered(a: Slot, b: Slot): [Slot, Slot] {
  if (a && b && b.seed < a.seed) return [b, a];
  return [a, b];
}

function buildSeries(
  key: SeriesKey,
  side: Side | null,
  round: Round,
  label: string,
  a: Slot,
  b: Slot,
  bracket: BracketPicks,
): Series {
  const [top, bottom] = round === "FINALS" ? [a, b] : ordered(a, b);
  const pick = bracket[key];
  const winner = winnerIn(pick?.winner, top, bottom);
  return { key, side, round, label, top, bottom, winner, games: winner ? pick?.games ?? null : null };
}

function winnerSlot(s: Series): Slot {
  return pickedSlot(s.winner, s.top, s.bottom);
}

export type Bracket = Record<SeriesKey, Series>;

/** Every series, with teams filled in as far as the picks allow. */
export function deriveBracket(picks: PredictionPicks): Bracket {
  const out = {} as Bracket;
  for (const side of ["W", "E"] as Side[]) {
    const seeds = playoffSeeds(picks, side);
    const name = SIDE_LABEL[side];
    for (const [id, hi, lo] of R1_PAIRS) {
      const key = `${side}-R1-${id}` as SeriesKey;
      out[key] = buildSeries(key, side, "R1", `${name} R1, ${hi} vs ${lo}`, seeds[hi - 1], seeds[lo - 1], picks.bracket);
    }
    const top = `${side}-R2-TOP` as SeriesKey;
    out[top] = buildSeries(top, side, "R2", `${name} Semis, top half`,
      winnerSlot(out[`${side}-R1-1v8` as SeriesKey]), winnerSlot(out[`${side}-R1-4v5` as SeriesKey]), picks.bracket);
    const bot = `${side}-R2-BOT` as SeriesKey;
    out[bot] = buildSeries(bot, side, "R2", `${name} Semis, bottom half`,
      winnerSlot(out[`${side}-R1-3v6` as SeriesKey]), winnerSlot(out[`${side}-R1-2v7` as SeriesKey]), picks.bracket);
    const cf = `${side}-CF` as SeriesKey;
    out[cf] = buildSeries(cf, side, "CF", `${name} Finals`, winnerSlot(out[top]), winnerSlot(out[bot]), picks.bracket);
  }
  out.FINALS = buildSeries("FINALS", null, "FINALS", "NBA Finals",
    winnerSlot(out["W-CF"]), winnerSlot(out["E-CF"]), picks.bracket);
  return out;
}

export function champion(picks: PredictionPicks): TeamCode | null {
  return deriveBracket(picks).FINALS.winner;
}

/** "4-2" for a team that wins in 6. */
export function seriesScore(games: SeriesGames | null): string {
  return games ? `4-${games - 4}` : "";
}

/** "POR in 6" */
export function seriesLine(s: Series): string {
  if (!s.winner) return "";
  return s.games ? `${s.winner} in ${s.games}` : s.winner;
}

export function loserOf(s: Series): Slot {
  return other(s.winner, s.top, s.bottom);
}

/* Cascade */

export type Cleared = { playIn: number; bracket: number };

/**
 * Drops any pick whose team is no longer in that slot. Runs top down, so a
 * cleared first round series also clears the semis it fed.
 */
export function reconcile(picks: PredictionPicks): { picks: PredictionPicks; cleared: Cleared } {
  const play_in: PlayInPicks = {};
  let playInCleared = 0;
  for (const side of ["W", "E"] as Side[]) {
    // Recompute game by game, feeding the cleaned picks forward.
    const work: PredictionPicks = { ...picks, play_in };
    for (const key of [`${side}-PI-7v8`, `${side}-PI-9v10`, `${side}-PI-LAST`] as PlayInKey[]) {
      const raw = picks.play_in[key];
      if (!raw) continue;
      work.play_in[key] = raw;
      const game = playInGames(work, side).find((g) => g.key === key)!;
      if (!game.winner) {
        delete work.play_in[key];
        playInCleared++;
      }
    }
  }

  const bracket: BracketPicks = {};
  let bracketCleared = 0;
  const base: PredictionPicks = { ...picks, play_in, bracket };
  for (const key of SERIES_KEYS) {
    const raw = picks.bracket[key];
    if (!raw) continue;
    bracket[key] = raw;
    if (!deriveBracket(base)[key].winner) {
      delete bracket[key];
      bracketCleared++;
    }
  }

  return {
    picks: { ...picks, play_in, bracket },
    cleared: { playIn: playInCleared, bracket: bracketCleared },
  };
}

/* Validation */

export type Missing = { step: "playin" | "playoffs" | "awards"; label: string };

export function missingPicks(picks: PredictionPicks): Missing[] {
  const out: Missing[] = [];
  for (const side of ["W", "E"] as Side[]) {
    for (const g of playInGames(picks, side)) {
      if (!g.winner) out.push({ step: "playin", label: `${SIDE_LABEL[side]} Play-In ${g.label}` });
    }
  }
  const b = deriveBracket(picks);
  for (const key of SERIES_KEYS) {
    const s = b[key];
    if (!s.winner) out.push({ step: "playoffs", label: `${s.label}: pick a winner` });
    else if (!s.games) out.push({ step: "playoffs", label: `${s.label}: how many games?` });
  }
  for (const def of AWARDS) {
    const a = picks.awards[def.key];
    if (def.kind !== "team" && !a?.player.trim()) out.push({ step: "awards", label: `${def.label}: name` });
    if (def.kind !== "coach" && !a?.team) out.push({ step: "awards", label: `${def.label}: team` });
  }
  return out;
}

export function isComplete(picks: PredictionPicks): boolean {
  return missingPicks(picks).length === 0;
}

/* Sanitizing untrusted input (API bodies and old rows) */

function cleanOrder(v: unknown, conf: Conference): TeamCode[] {
  const expected = conferenceTeams(conf);
  if (!Array.isArray(v) || v.length !== expected.length) return expected;
  const set = new Set(v);
  if (set.size !== expected.length || !expected.every((c) => set.has(c))) return expected;
  return v as TeamCode[];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function sanitizePicks(input: unknown): PredictionPicks {
  const src = asRecord(input);
  const standings = asRecord(src.standings);

  const play_in: PlayInPicks = {};
  const rawPlayIn = asRecord(src.play_in);
  for (const key of PLAY_IN_KEYS) {
    const winner = asRecord(rawPlayIn[key]).winner;
    if (isTeamCode(winner)) play_in[key] = { winner };
  }

  const bracket: BracketPicks = {};
  const rawBracket = asRecord(src.bracket);
  for (const key of SERIES_KEYS) {
    const pick = asRecord(rawBracket[key]);
    if (!isTeamCode(pick.winner)) continue;
    const g = Number(pick.games);
    bracket[key] = { winner: pick.winner, games: g >= 4 && g <= 7 ? (g as SeriesGames) : null };
  }

  const awards: AwardPicks = {};
  const rawAwards = asRecord(src.awards);
  for (const key of AWARD_KEYS) {
    const pick = asRecord(rawAwards[key]);
    const player = key === "cup" ? "" : typeof pick.player === "string" ? pick.player.slice(0, 60) : "";
    const team = isTeamCode(pick.team) ? pick.team : null;
    if (player || team) awards[key] = { player, team };
  }

  const hot_take = typeof src.hot_take === "string" ? src.hot_take.slice(0, HOT_TAKE_MAX) : "";

  return reconcile({
    standings: { west: cleanOrder(standings.west, "west"), east: cleanOrder(standings.east, "east") },
    play_in,
    bracket,
    awards,
    hot_take,
  }).picks;
}

export function teamLabel(code: TeamCode): string {
  const t = TEAMS[code];
  return `${t.city} ${t.name}`;
}

/** "Oct 19, 2026" in Pacific time, since that's where he locks them in. */
export function formatLockDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
}
