import { getItems, getItemsForWeeks, getPicks, getPlayers, getSubmissions, getWeek, listWeeks, seasonSummary, weekBoard, type Board, type SeasonSummary } from "./data";
import { weekWinner } from "./grade";
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
  /** Total challengers with at least one pick this week. */
  challengerCount: number;
};

/**
 * Loads a week for display. Public viewers see:
 *  - Jaiye's and Remi's picks once they tap Submit (locked and public), or at tip-off.
 *  - Challengers' picks right away. Everyone can see what everyone picked.
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
    : all.filter((p) => !houseIds.has(p.player_id) || shown.has(p.player_id) || lockedIds.has(p.item_id));
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

export type ArchiveWeek = {
  week: SbWeek;
  itemCount: number;
  gradedCount: number;
  challengerCount: number;
  jaiyePoints: number;
  remiPoints: number;
  headToHead: "jaiye" | "remi" | "tie" | null;
  topChallenger: { name: string; points: number; beatJaiye: boolean; beatRemi: boolean } | null;
};

export type ArchiveView = {
  weeks: ArchiveWeek[];
  summary: SeasonSummary;
  jaiyeName: string;
  remiName: string;
};

/**
 * The archive view: every published week with its scores, winner and top
 * challenger. Open and graded weeks appear alongside finals so a visitor can
 * flip back to any week that already happened, including the one in progress.
 */
export async function loadArchive(): Promise<ArchiveView | null> {
  const [allWeeks, players] = await Promise.all([listWeeks(), getPlayers()]);
  const weeks = allWeeks.filter((w) => w.status !== "draft").sort((a, b) => b.week_number - a.week_number);
  if (weeks.length === 0) return null;

  const items = await getItemsForWeeks(weeks.map((w) => w.id));
  const picks = await getPicks(items.map((i) => i.id));
  const summary = seasonSummary(allWeeks, items, picks, players);

  const jaiye = players.find((p) => p.kind === "jaiye");
  const remi = players.find((p) => p.kind === "remi");

  const rows: ArchiveWeek[] = weeks.map((w) => {
    const wItems = items.filter((i) => i.week_id === w.id);
    const itemIds = new Set(wItems.map((i) => i.id));
    const wPicks = picks.filter((p) => itemIds.has(p.item_id));
    const board = weekBoard(wItems, wPicks, players);
    const jScore = board.find((b) => b.player.id === jaiye?.id)?.score;
    const rScore = board.find((b) => b.player.id === remi?.id)?.score;
    const challengers = board.filter((b) => b.player.kind === "challenger");
    const top = challengers.sort((a, b) => b.score.points - a.score.points)[0];
    const h2h =
      jScore && rScore
        ? weekWinner([jScore, rScore]) === jaiye?.id
          ? "jaiye"
          : weekWinner([jScore, rScore]) === remi?.id
            ? "remi"
            : jScore.points === rScore.points
              ? "tie"
              : null
        : null;
    return {
      week: w,
      itemCount: wItems.length,
      gradedCount: wItems.filter((i) => i.status === "graded" || i.status === "void").length,
      challengerCount: challengers.length,
      jaiyePoints: jScore?.points ?? 0,
      remiPoints: rScore?.points ?? 0,
      headToHead: h2h,
      topChallenger: top
        ? {
            name: top.player.display_name,
            points: top.score.points,
            beatJaiye: !!jScore && top.score.points > jScore.points,
            beatRemi: !!rScore && top.score.points > rScore.points,
          }
        : null,
    };
  });

  return {
    weeks: rows,
    summary,
    jaiyeName: jaiye?.display_name ?? "Jaiye",
    remiName: remi?.display_name ?? "Remi",
  };
}
