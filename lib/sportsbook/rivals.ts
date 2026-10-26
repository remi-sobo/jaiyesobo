import { scoreWeek, type PlayerWeekScore } from "./grade";
import type { SbItem, SbPick, SbPlayer, SbWeek } from "./types";

/**
 * Rivalries: your season record against the people you play with. Built from
 * final weeks only, the same way season standings are, so the numbers always
 * match the boards. Everything here is pure so it can be tested without a database.
 */

/** weekNumber → playerId → that player's score. Only players who made a pick that week. */
export type WeekTotals = Map<number, Map<string, PlayerWeekScore>>;

export function weekTotals(weeks: SbWeek[], items: SbItem[], picks: SbPick[]): WeekTotals {
  const out: WeekTotals = new Map();
  for (const w of weeks.filter((x) => x.status === "final").sort((a, b) => a.week_number - b.week_number)) {
    const wItems = items.filter((i) => i.week_id === w.id);
    const ids = new Set(wItems.map((i) => i.id));
    const wPicks = picks.filter((p) => ids.has(p.item_id));
    const players = [...new Set(wPicks.map((p) => p.player_id))];
    const scores = scoreWeek(wItems, wPicks, players);
    out.set(w.week_number, new Map(scores.map((s) => [s.player_id, s])));
  }
  return out;
}

export type RivalWeek = { week: number; me: number; them: number; result: "W" | "L" | "T" };

export type RivalRecord = {
  wins: number;
  losses: number;
  ties: number;
  weeks: RivalWeek[];
  /** Positive: wins in a row. Negative: losses in a row. 0: last week was a tie or no weeks. */
  streak: number;
};

/** A vs B, week by week, in every final week they both played. Ties are ties: no lock tiebreak head to head. */
export function rivalRecord(totals: WeekTotals, me: string, them: string): RivalRecord {
  const weeks: RivalWeek[] = [];
  for (const [week, scores] of totals) {
    const a = scores.get(me);
    const b = scores.get(them);
    if (!a || !b) continue;
    weeks.push({ week, me: a.points, them: b.points, result: a.points > b.points ? "W" : a.points < b.points ? "L" : "T" });
  }
  weeks.sort((x, y) => x.week - y.week);
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const r = weeks[i].result;
    if (r === "T") break;
    if (streak === 0) streak = r === "W" ? 1 : -1;
    else if ((streak > 0 && r === "W") || (streak < 0 && r === "L")) streak += streak > 0 ? 1 : -1;
    else break;
  }
  return {
    wins: weeks.filter((w) => w.result === "W").length,
    losses: weeks.filter((w) => w.result === "L").length,
    ties: weeks.filter((w) => w.result === "T").length,
    weeks,
    streak,
  };
}

export type Rival = { player: SbPlayer; record: RivalRecord; sharedLeague: boolean };

/**
 * The rivals to show: Jaiye and Remi first (unless that's you), then the people
 * you've shared the most weeks with. League mates win ties, then the closer record.
 */
export function topRivals(
  totals: WeekTotals,
  meId: string,
  players: SbPlayer[],
  leagueMateIds: Set<string>,
  limit = 8,
): Rival[] {
  const visible = players.filter((p) => !p.hidden && p.id !== meId);
  const all = visible.map((p) => ({ player: p, record: rivalRecord(totals, meId, p.id), sharedLeague: leagueMateIds.has(p.id) }));
  const house = all.filter((r) => r.player.kind !== "challenger").sort((a, b) => (a.player.kind === "jaiye" ? -1 : b.player.kind === "jaiye" ? 1 : 0));
  const others = all
    .filter((r) => r.player.kind === "challenger" && r.record.weeks.length > 0)
    .sort(
      (a, b) =>
        b.record.weeks.length - a.record.weeks.length ||
        Number(b.sharedLeague) - Number(a.sharedLeague) ||
        Math.abs(a.record.wins - a.record.losses) - Math.abs(b.record.wins - b.record.losses) ||
        a.player.display_name.localeCompare(b.player.display_name),
    );
  return [...house, ...others.slice(0, Math.max(0, limit))];
}

/** The player nearest your live total this week among a set of players (your league mates). */
export function closestRival(live: PlayerWeekScore[], meId: string, candidateIds: Set<string>): { player_id: string; gap: number } | null {
  const me = live.find((s) => s.player_id === meId);
  if (!me) return null;
  let best: { player_id: string; gap: number } | null = null;
  for (const s of live) {
    if (s.player_id === meId || !candidateIds.has(s.player_id)) continue;
    const gap = s.points - me.points;
    if (!best || Math.abs(gap) < Math.abs(best.gap)) best = { player_id: s.player_id, gap };
  }
  return best;
}
