import { getItems, getItemsForWeeks, getPicks, getPlayers, getSubmissions, getWeek, listWeeks, seasonSummary, weekBoard, type Board, type SeasonSummary } from "./data";
import type { SbItem, SbPick, SbPlayer, SbWeek } from "./types";
import { currentWeekNumber } from "./weeks";

export type WeekView = {
  week: SbWeek;
  items: SbItem[];
  picks: SbPick[];
  players: SbPlayer[];
  board: Board[];
  /** Players who submitted their picks this week. Their picks are locked and public. */
  submitted: string[];
  /** When this view was loaded. Components use it instead of reading the clock. */
  now: number;
  /** Total challengers with at least one pick this week, including ones whose picks are still hidden. */
  challengerCount: number;
};

/**
 * Loads a week for display. Public viewers see:
 *  - Jaiye's and Remi's picks once they tap Submit (locked and public), or at tip-off.
 *  - Challengers' picks only after tip-off, so friends can't copy each other.
 *  - Their own picks, always.
 */
export async function loadWeekView(n: number, opts: { admin?: boolean; viewerId?: string | null } = {}): Promise<WeekView | null> {
  const week = await getWeek(n);
  if (!week) return null;
  if (!opts.admin && week.status === "draft") return null;
  const [items, players, submitted] = await Promise.all([getItems(week.id), getPlayers(), getSubmissions(week.id)]);
  const all = await getPicks(items.map((i) => i.id));
  const now = Date.now();
  const lockedIds = new Set(items.filter((i) => Date.parse(i.locks_at) <= now || week.status !== "open").map((i) => i.id));
  const houseIds = new Set(players.filter((p) => p.kind !== "challenger").map((p) => p.id));
  const shown = new Set(submitted.filter((id) => houseIds.has(id)));
  const picks = opts.admin
    ? all
    : all.filter((p) => lockedIds.has(p.item_id) || p.player_id === opts.viewerId || shown.has(p.player_id));
  const visiblePlayers = opts.admin ? players : players.filter((p) => !p.hidden || p.id === opts.viewerId);
  const challengerCount = new Set(all.filter((p) => players.find((x) => x.id === p.player_id)?.kind === "challenger").map((p) => p.player_id)).size;
  return { week, items, picks, players: visiblePlayers, board: weekBoard(items, all, visiblePlayers), challengerCount, submitted, now };
}

/** The week the public page leads with: this week once it's open, otherwise the last published one. */
export async function featuredWeekNumber(): Promise<number | null> {
  const weeks = (await listWeeks()).filter((w) => w.status !== "draft");
  if (weeks.length === 0) return null;
  const now = currentWeekNumber();
  const best = weeks.filter((w) => w.week_number <= now).sort((a, b) => b.week_number - a.week_number)[0];
  return (best ?? weeks[0]).week_number;
}

export async function loadSeason(): Promise<{ weeks: SbWeek[]; summary: SeasonSummary }> {
  const weeks = await listWeeks();
  const finals = weeks.filter((w) => w.status === "final");
  const items = await getItemsForWeeks(finals.map((w) => w.id));
  const [picks, players] = await Promise.all([getPicks(items.map((i) => i.id)), getPlayers()]);
  return { weeks, summary: seasonSummary(weeks, items, picks, players) };
}
