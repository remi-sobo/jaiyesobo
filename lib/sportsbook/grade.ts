/**
 * Grading and scoring. Pure functions over box scores so the client, the
 * nightly job and any test all agree. The AI never decides a result.
 */

import type { TeamCode } from "@/lib/nba/teams";
import type { ItemResult, ItemSpec, PlayerRef, SbItem, SbPick, StatKey } from "./types";

export type PlayerLine = {
  person_id: number;
  name: string;
  team: TeamCode;
  played: boolean;
  pts: number;
  reb: number;
  ast: number;
  fg3m: number;
  stl: number;
  blk: number;
};

export type GameBox = {
  game_id: string;
  /** 1 scheduled, 2 live, 3 final. */
  status: number;
  postponed: boolean;
  tip_at: string;
  home: TeamCode;
  away: TeamCode;
  home_score: number | null;
  away_score: number | null;
  /** Empty until the box score is stored. */
  players: PlayerLine[];
};

export type GradeContext = {
  games: Map<string, GameBox>;
  /** Every game in the week, for week long items. */
  weekGames: GameBox[];
  /** True once the week's last day is over. */
  weekOver: boolean;
  /** The grading clock, in ms. Graders read this instead of the wall clock. */
  now: number;
  /** When the week ended (its row's last day plus one, Pacific midnight), in ms. */
  weekEnd: number;
};

/**
 * How long a result that needs player lines waits for ESPN's box score before
 * it is given up on. Counted from the week's end for Weekly Leader and from the
 * game's tip-off for Closest Guess. ESPN sometimes never provides the lines.
 */
export const BOX_GRACE_MS = 36 * 3_600_000;

const NO_BOX = "No box score available";

export type GradeOutcome =
  | { state: "pending" }
  | { state: "void"; display: string }
  | { state: "graded"; result: ItemResult };

export function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findPlayer(game: GameBox, ref: { person_id: number | null; name: string; team: TeamCode }): PlayerLine | null {
  if (ref.person_id) {
    const hit = game.players.find((p) => p.person_id === ref.person_id);
    if (hit) return hit;
  }
  const want = normName(ref.name);
  const team = game.players.filter((p) => p.team === ref.team);
  return (
    team.find((p) => normName(p.name) === want) ??
    // Last name plus first initial, for "Victor Wembanyama" vs "V. Wembanyama" style differences.
    team.find((p) => {
      const a = normName(p.name).split(" ");
      const b = want.split(" ");
      return a[a.length - 1] === b[b.length - 1] && a[0]?.[0] === b[0]?.[0];
    }) ??
    null
  );
}

const final = (g: GameBox | undefined) => !!g && g.status === 3 && g.home_score !== null && g.away_score !== null;

function score(g: GameBox, team: TeamCode): number {
  return team === g.home ? g.home_score! : g.away_score!;
}

function opp(g: GameBox, team: TeamCode): TeamCode {
  return team === g.home ? g.away : g.home;
}

function finalLine(g: GameBox): string {
  return `Final: ${g.away} ${g.away_score}, ${g.home} ${g.home_score}`;
}

/** Waits for one game. Postponed means void. */
function needGame(ctx: GradeContext, id: string): GameBox | "void" | null {
  const g = ctx.games.get(id);
  if (!g) return null;
  if (g.postponed) return "void";
  return final(g) ? g : null;
}

/**
 * The one lookup every player-stat grader goes through. A non-final game waits
 * (null). A final game with no player lines waits until 36h after tip-off, then
 * is "nobox" (no result can ever be computed). A player who didn't play is "void".
 */
function playerLine(ctx: GradeContext, ref: PlayerRef): PlayerLine | "void" | "nobox" | null {
  const g = needGame(ctx, ref.game_id);
  if (g === "void") return "void";
  if (!g) return null;
  if (g.players.length === 0) return ctx.now >= Date.parse(g.tip_at) + BOX_GRACE_MS ? "nobox" : null;
  const p = findPlayer(g, ref);
  return !p || !p.played ? "void" : p;
}

function playerStat(ctx: GradeContext, ref: PlayerRef, stat: StatKey): { value: number; line: PlayerLine } | "void" | "nobox" | null {
  const p = playerLine(ctx, ref);
  return p === null || p === "void" || p === "nobox" ? p : { value: p[stat], line: p };
}

const ok = (winners: string[], display: string, actual: number | null = null): GradeOutcome => ({
  state: "graded",
  result: { winners, display, actual },
});

export function gradeItem(item: Pick<SbItem, "spec" | "options" | "locks_at">, ctx: GradeContext): GradeOutcome {
  const spec = item.spec as ItemSpec;
  switch (spec.type) {
    case "winner": {
      const g = needGame(ctx, spec.game_id);
      if (g === "void") return { state: "void", display: "Game postponed" };
      if (!g || !final(g)) return { state: "pending" };
      const w = g.home_score! > g.away_score! ? g.home : g.away;
      return ok([w], finalLine(g));
    }
    case "upset": {
      const won: string[] = [];
      for (const p of spec.picks) {
        const g = ctx.games.get(p.game_id);
        if (!g) return { state: "pending" };
        if (g.postponed) continue;
        if (!final(g)) return { state: "pending" };
        if (score(g, p.team) > score(g, opp(g, p.team))) won.push(p.team);
      }
      return ok(won, won.length ? `Upsets that hit: ${won.join(", ")}` : "No upsets hit");
    }
    case "spread": {
      const g = needGame(ctx, spec.game_id);
      if (g === "void") return { state: "void", display: "Game postponed" };
      if (!g || !final(g)) return { state: "pending" };
      const margin = score(g, spec.team) - score(g, opp(g, spec.team));
      return ok([margin > spec.line ? "yes" : "no"], `${finalLine(g)}. ${spec.team} by ${margin}.`, margin);
    }
    case "total": {
      const g = needGame(ctx, spec.game_id);
      if (g === "void") return { state: "void", display: "Game postponed" };
      if (!g || !final(g)) return { state: "pending" };
      const t = g.home_score! + g.away_score!;
      return ok([t > spec.line ? "over" : "under"], `${finalLine(g)}. Total ${t}.`, t);
    }
    case "team_total": {
      const g = needGame(ctx, spec.game_id);
      if (g === "void") return { state: "void", display: "Game postponed" };
      if (!g || !final(g)) return { state: "pending" };
      const t = score(g, spec.team);
      return ok([t > spec.line ? "over" : "under"], `${spec.team} scored ${t}.`, t);
    }
    case "margin": {
      const g = needGame(ctx, spec.game_id);
      if (g === "void") return { state: "void", display: "Game postponed" };
      if (!g || !final(g)) return { state: "pending" };
      const m = score(g, spec.team) - score(g, opp(g, spec.team));
      const key = m <= 0 ? "other" : m <= 5 ? "1-5" : m <= 10 ? "6-10" : "11+";
      return ok([key], `${finalLine(g)}.`, m);
    }
    case "player_ou": {
      const s = playerStat(ctx, spec.player, spec.stat);
      if (s === "void") return { state: "void", display: `${spec.player.name} didn't play` };
      if (s === "nobox") return { state: "void", display: NO_BOX };
      if (!s) return { state: "pending" };
      return ok([s.value > spec.line ? "over" : "under"], `${spec.player.name} had ${s.value}.`, s.value);
    }
    case "h2h": {
      const a = playerStat(ctx, spec.players[0], spec.stat);
      const b = playerStat(ctx, spec.players[1], spec.stat);
      if (a === "void" || b === "void") return { state: "void", display: "One of them didn't play" };
      if (a === "nobox" || b === "nobox") return { state: "void", display: NO_BOX };
      if (!a || !b) return { state: "pending" };
      const [pa, pb] = spec.players;
      const disp = `${pa.name} ${a.value}, ${pb.name} ${b.value}.`;
      if (a.value === b.value) return { state: "void", display: `Tie. ${disp}` };
      return ok([a.value > b.value ? "a" : "b"], disp);
    }
    case "yes_no": {
      const g = needGame(ctx, spec.player.game_id);
      if (g === "void") return { state: "void", display: "Game postponed" };
      const p = playerLine(ctx, spec.player);
      if (p === "nobox") return { state: "void", display: NO_BOX };
      if (p === null) return { state: "pending" };
      if (p === "void") return { state: "void", display: `${spec.player.name} didn't play` };
      const cats = [p.pts, p.reb, p.ast, p.stl, p.blk].filter((v) => v >= 10).length;
      let yes = false;
      if (spec.check === "triple_double") yes = cats >= 3;
      else if (spec.check === "double_double") yes = cats >= 2;
      else if (spec.stat && spec.threshold != null) yes = p[spec.stat] >= spec.threshold;
      return ok([yes ? "yes" : "no"], `${p.name}: ${p.pts} pts, ${p.reb} reb, ${p.ast} ast.`);
    }
    case "week_wins": {
      let wins = 0;
      for (const id of spec.game_ids) {
        const g = ctx.games.get(id);
        if (!g) return { state: "pending" };
        if (g.postponed) continue;
        if (!final(g)) return { state: "pending" };
        if (score(g, spec.team) > score(g, opp(g, spec.team))) wins++;
      }
      const i = spec.buckets.findIndex(([lo, hi]) => wins >= lo && wins <= hi);
      return ok([String(Math.max(0, i))], `${spec.team} won ${wins} this week.`, wins);
    }
    case "weekly_leader": {
      if (!ctx.weekOver) return { state: "pending" };
      // Only games after the pick locked, and only ones a candidate's team played in.
      const lockMs = Date.parse(item.locks_at);
      const teams = new Set<TeamCode>(spec.candidates.map((c) => c.team));
      const games = ctx.weekGames.filter(
        (g) => !g.postponed && Date.parse(g.tip_at) >= lockMs && (teams.has(g.home) || teams.has(g.away)),
      );
      const ready = games.filter((g) => g.status === 3 && g.players.length > 0);
      if (ready.length < games.length) {
        // Some relevant game isn't final, or is final without player lines.
        if (ctx.now < ctx.weekEnd + BOX_GRACE_MS) return { state: "pending" };
        if (ready.length === 0) return { state: "void", display: NO_BOX };
      }
      const best = spec.candidates.map((c) => {
        let top = -1;
        for (const g of ready) {
          if (g.home !== c.team && g.away !== c.team) continue;
          const p = findPlayer(g, c);
          if (p?.played) top = Math.max(top, p[spec.stat]);
        }
        return top;
      });
      const max = Math.max(...best);
      if (max < 0) return { state: "void", display: "None of them played" };
      const winners = best.map((v, i) => (v === max ? String(i) : null)).filter((v): v is string => v !== null);
      const names = winners.map((i) => spec.candidates[Number(i)].name).join(" and ");
      return ok(winners, `${names} with ${max}.`, max);
    }
    case "closest": {
      const g = needGame(ctx, spec.game_id);
      if (g === "void") return { state: "void", display: "Game postponed" };
      if (!g || !final(g)) return { state: "pending" };
      let actual: number;
      if (spec.measure === "total_points") actual = g.home_score! + g.away_score!;
      else if (spec.measure === "team_points" && spec.team) actual = score(g, spec.team);
      else {
        // total_3s needs player lines: wait for them, then give up 36h after tip-off.
        if (g.players.length === 0) {
          return ctx.now >= Date.parse(g.tip_at) + BOX_GRACE_MS ? { state: "void", display: NO_BOX } : { state: "pending" };
        }
        actual = g.players.reduce((s, p) => s + p.fg3m, 0);
      }
      return ok([], `The answer was ${actual}.`, actual);
    }
    case "custom":
      // Graded by hand from admin.
      return { state: "pending" };
  }
}

/* Scoring */

export type PlayerWeekScore = {
  player_id: string;
  points: number;
  correct: number;
  wrong: number;
  /** null when no lock set or the lock isn't graded yet. */
  lockHit: boolean | null;
};

/**
 * Points one pick earned. Null means not graded yet.
 *
 * Right pays `item.points`, wrong costs `item.points`, and a Lock doubles both
 * the gain and the loss. A perfect Closest guess still carries its 2× bonus,
 * which the Lock then stacks on top of.
 */
export function pickPoints(item: SbItem, pick: SbPick, allPicks: SbPick[]): number | null {
  if (item.status === "void") return 0;
  if (item.status !== "graded" || !item.result) return null;
  const mult = pick.is_lock ? 2 : 1;
  if (item.type === "closest") {
    const actual = item.result.actual;
    if (actual == null) return 0;
    if (pick.guess == null) return -item.points * mult;
    const guesses = allPicks.filter((p) => p.item_id === item.id && p.guess != null).map((p) => Math.abs(p.guess! - actual));
    const best = Math.min(...guesses);
    const mine = Math.abs(pick.guess - actual);
    if (mine !== best) return -item.points * mult;
    const base = mine === 0 ? item.points * 2 : item.points;
    return base * mult;
  }
  const right = !!pick.choice && item.result.winners.includes(pick.choice);
  return (right ? item.points : -item.points) * mult;
}

export function isPickRight(item: SbItem, pick: SbPick, allPicks: SbPick[]): boolean | null {
  const pts = pickPoints(item, pick, allPicks);
  if (pts === null || item.status === "void") return null;
  return pts > 0;
}

export function scoreWeek(items: SbItem[], picks: SbPick[], playerIds: string[]): PlayerWeekScore[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return playerIds.map((pid) => {
    const s: PlayerWeekScore = { player_id: pid, points: 0, correct: 0, wrong: 0, lockHit: null };
    for (const p of picks) {
      if (p.player_id !== pid) continue;
      const item = byId.get(p.item_id);
      if (!item) continue;
      const pts = pickPoints(item, p, picks);
      if (pts === null || item.status === "void") continue;
      s.points += pts;
      if (pts > 0) s.correct++;
      else s.wrong++;
      if (p.is_lock) s.lockHit = pts > 0;
    }
    return s;
  });
}

/** Winner of a set of scores. Lock hit breaks a points tie; still tied means no winner. */
export function weekWinner(scores: PlayerWeekScore[]): string | null {
  if (scores.length === 0) return null;
  const max = Math.max(...scores.map((s) => s.points));
  let top = scores.filter((s) => s.points === max);
  if (top.length > 1) {
    const locked = top.filter((s) => s.lockHit === true);
    if (locked.length >= 1) top = locked;
  }
  return top.length === 1 ? top[0].player_id : null;
}
