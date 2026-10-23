/**
 * Grading and scoring. Pure functions over box scores so the client, the
 * nightly job and any test all agree. The AI never decides a result.
 */

import type { TeamCode } from "@/lib/nba/teams";
import type { ItemResult, ItemSpec, MostStat, PlayerRef, SbItem, SbPick, StatKey } from "./types";

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
  /** Turnovers. 0 for games stored before migration 027. */
  tov: number;
};

/** One decimal, so 52.3 shows like the apps do. */
export function fantasyPoints(p: Pick<PlayerLine, "pts" | "reb" | "ast" | "stl" | "blk" | "tov">): number {
  return Math.round((p.pts + 1.2 * p.reb + 1.5 * p.ast + 3 * p.stl + 3 * p.blk - (p.tov ?? 0)) * 10) / 10;
}

export function statValue(p: PlayerLine, stat: MostStat): number {
  return stat === "fantasy" ? fantasyPoints(p) : p[stat];
}

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
  /** True once the week's Sunday is over. */
  weekOver: boolean;
};

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

function playerStat(ctx: GradeContext, ref: PlayerRef, stat: StatKey): { value: number; line: PlayerLine } | "void" | null {
  const g = needGame(ctx, ref.game_id);
  if (g === "void") return "void";
  if (!g || g.players.length === 0) return null;
  const p = findPlayer(g, ref);
  if (!p || !p.played) return "void";
  return { value: p[stat], line: p };
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
      if (!s) return { state: "pending" };
      return ok([s.value > spec.line ? "over" : "under"], `${spec.player.name} had ${s.value}.`, s.value);
    }
    case "h2h": {
      const a = playerStat(ctx, spec.players[0], spec.stat);
      const b = playerStat(ctx, spec.players[1], spec.stat);
      if (a === "void" || b === "void") return { state: "void", display: "One of them didn't play" };
      if (!a || !b) return { state: "pending" };
      const [pa, pb] = spec.players;
      const disp = `${pa.name} ${a.value}, ${pb.name} ${b.value}.`;
      if (a.value === b.value) return { state: "void", display: `Tie. ${disp}` };
      return ok([a.value > b.value ? "a" : "b"], disp);
    }
    case "most":
      return gradeMost(spec, item.locks_at, ctx);
    case "yes_no": {
      const g = needGame(ctx, spec.player.game_id);
      if (g === "void") return { state: "void", display: "Game postponed" };
      if (!g || g.players.length === 0) return { state: "pending" };
      const p = findPlayer(g, spec.player);
      if (!p || !p.played) return { state: "void", display: `${spec.player.name} didn't play` };
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
      // Only games after the pick locked count.
      const lockMs = Date.parse(item.locks_at);
      const games = ctx.weekGames.filter((g) => Date.parse(g.tip_at) >= lockMs);
      if (games.some((g) => !g.postponed && (g.status !== 3 || g.players.length === 0))) return { state: "pending" };
      const best = spec.candidates.map((c) => {
        let top = -1;
        for (const g of games) {
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
        if (g.players.length === 0) return { state: "pending" };
        actual = g.players.reduce((s, p) => s + p.fg3m, 0);
      }
      return ok([], `The answer was ${actual}.`, actual);
    }
    case "custom":
      // Graded by hand from admin.
      return { state: "pending" };
  }
}

function gradeMost(spec: Extract<ItemSpec, { type: "most" }>, locksAt: string, ctx: GradeContext): GradeOutcome {
  const values: number[] = [];
  if (spec.scope === "game") {
    for (const ref of spec.players) {
      const g = needGame(ctx, ref.game_id);
      if (g === "void") return { state: "void", display: "Game postponed" };
      if (!g || g.players.length === 0) return { state: "pending" };
      const p = findPlayer(g, ref);
      if (!p || !p.played) return { state: "void", display: `${ref.name} didn't play` };
      values.push(statValue(p, spec.stat));
    }
  } else {
    // Week long: every game from the lock to Sunday. A missed game counts as 0.
    const lockMs = Date.parse(locksAt);
    const games = ctx.weekGames.filter((g) => Date.parse(g.tip_at) >= lockMs && !g.postponed);
    for (const ref of spec.players) {
      const theirs = games.filter((g) => g.home === ref.team || g.away === ref.team);
      if (theirs.some((g) => g.status !== 3 || g.players.length === 0)) return { state: "pending" };
      if (!ctx.weekOver && theirs.length === 0) return { state: "pending" };
      let total = 0;
      let played = 0;
      for (const g of theirs) {
        const p = findPlayer(g, ref);
        if (p?.played) {
          total += statValue(p, spec.stat);
          played++;
        }
      }
      if (played === 0) return { state: "void", display: `${ref.name} didn't play this week` };
      values.push(Math.round(total * 10) / 10);
    }
  }
  const disp = spec.players.map((p, i) => `${p.name} ${values[i]}`).join(", ") + (spec.scope === "week" ? " this week." : ".");
  const max = Math.max(...values);
  const winners = values.map((v, i) => (v === max ? String(i) : null)).filter((v): v is string => v !== null);
  if (winners.length === spec.players.length) return { state: "void", display: `Tie. ${disp}` };
  return ok(winners, disp, max);
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

/** Points one pick earned. Null means not graded yet. */
export function pickPoints(item: SbItem, pick: SbPick, allPicks: SbPick[]): number | null {
  if (item.status === "void") return 0;
  if (item.status !== "graded" || !item.result) return null;
  let base = 0;
  let right = false;
  if (item.type === "closest") {
    const actual = item.result.actual;
    if (actual == null || pick.guess == null) return pick.is_lock ? -item.points : 0;
    const guesses = allPicks.filter((p) => p.item_id === item.id && p.guess != null).map((p) => Math.abs(p.guess! - actual));
    const best = Math.min(...guesses);
    const mine = Math.abs(pick.guess - actual);
    right = mine === best;
    base = right ? (mine === 0 ? item.points * 2 : item.points) : 0;
  } else {
    right = !!pick.choice && item.result.winners.includes(pick.choice);
    base = right ? item.points : 0;
  }
  if (pick.is_lock) return right ? base * 2 : -item.points;
  return base;
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
