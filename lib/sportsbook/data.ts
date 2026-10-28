import { createServiceClient } from "@/lib/supabase/server";
import type { TeamCode } from "@/lib/nba/teams";
import { fetchBox, fetchGames } from "./espn";
import { gradeItem, scoreWeek, weekWinner, type GameBox, type PlayerWeekScore } from "./grade";
import { sendPush, type PushResult } from "./push";
import type { ItemSpec, SbItem, SbPick, SbPlayer, SbWeek } from "./types";
import { SB_SEASON, pacificDate, weekBounds, weekWindow } from "./weeks";

const supa = () => createServiceClient();

/* NBA sync */

export async function syncGames(fromIso: string, toIso: string): Promise<number> {
  const games = await fetchGames(fromIso, toIso);
  if (games.length === 0) return 0;
  const { error } = await supa()
    .from("nba_games")
    .upsert(
      games.map((g) => ({ ...g, season: SB_SEASON, updated_at: new Date().toISOString() })),
      { onConflict: "game_id" },
    );
  if (error) throw error;
  return games.length;
}

/** Stores box scores for finished games that don't have one yet. */
export async function syncBoxes(limit = 30): Promise<number> {
  const db = supa();
  const { data, error } = await db
    .from("nba_games")
    .select("game_id")
    .eq("status", 3)
    .eq("has_box", false)
    .eq("postponed", false)
    .order("tip_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  let n = 0;
  for (const { game_id } of data ?? []) {
    try {
      const lines = await fetchBox(game_id);
      if (lines.length === 0) continue;
      await db.from("nba_player_games").delete().eq("game_id", game_id);
      const { error: insErr } = await db
        .from("nba_player_games")
        .insert(lines.map((l) => ({ ...l, game_id })));
      if (insErr) throw insErr;
      await db.from("nba_games").update({ has_box: true }).eq("game_id", game_id);
      n++;
    } catch (e) {
      console.error(JSON.stringify({ scope: "sportsbook.box", game_id, err: String(e) }));
    }
  }
  return n;
}

type GameRow = Omit<GameBox, "players"> & { has_box: boolean };

export async function getGamesBetween(start: Date, end: Date): Promise<GameRow[]> {
  const { data, error } = await supa()
    .from("nba_games")
    .select("game_id, tip_at, home, away, home_score, away_score, status, postponed, has_box")
    .gte("tip_at", start.toISOString())
    .lt("tip_at", end.toISOString())
    .order("tip_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GameRow[];
}

/** Games plus player lines, keyed by game id. */
export async function loadBoxes(gameIds: string[]): Promise<Map<string, GameBox>> {
  const out = new Map<string, GameBox>();
  if (gameIds.length === 0) return out;
  const db = supa();
  const { data: games, error } = await db
    .from("nba_games")
    .select("game_id, tip_at, home, away, home_score, away_score, status, postponed")
    .in("game_id", gameIds);
  if (error) throw error;
  for (const g of games ?? []) out.set(g.game_id, { ...(g as Omit<GameBox, "players">), players: [] });
  const { data: lines, error: lErr } = await db
    .from("nba_player_games")
    .select("game_id, person_id, name, team, played, pts, reb, ast, fg3m, stl, blk")
    .in("game_id", gameIds);
  if (lErr) throw lErr;
  for (const l of lines ?? []) out.get(l.game_id)?.players.push({ ...l, person_id: Number(l.person_id) } as GameBox["players"][number]);
  return out;
}

/* Weeks, items, picks */

const WEEK_COLS = "id, season, week_number, starts_on, ends_on, status, recap, finalized_at";
const ITEM_COLS = "id, week_id, sort, type, prompt, note, options, points, spec, locks_at, status, result";

export async function getWeek(n: number, season = SB_SEASON): Promise<SbWeek | null> {
  const { data, error } = await supa().from("sb_weeks").select(WEEK_COLS).eq("season", season).eq("week_number", n).maybeSingle();
  if (error) throw error;
  return (data as SbWeek | null) ?? null;
}

export async function listWeeks(season = SB_SEASON): Promise<SbWeek[]> {
  const { data, error } = await supa().from("sb_weeks").select(WEEK_COLS).eq("season", season).order("week_number");
  if (error) throw error;
  return (data ?? []) as SbWeek[];
}

export async function getItems(weekId: string): Promise<SbItem[]> {
  const { data, error } = await supa().from("sb_items").select(ITEM_COLS).eq("week_id", weekId).order("sort");
  if (error) throw error;
  return (data ?? []) as SbItem[];
}

export async function getItemsForWeeks(weekIds: string[]): Promise<SbItem[]> {
  if (weekIds.length === 0) return [];
  const { data, error } = await supa().from("sb_items").select(ITEM_COLS).in("week_id", weekIds);
  if (error) throw error;
  return (data ?? []) as SbItem[];
}

export async function getPicks(itemIds: string[]): Promise<SbPick[]> {
  if (itemIds.length === 0) return [];
  const out: SbPick[] = [];
  // Chunk so a full season of item ids stays under URL limits.
  for (let i = 0; i < itemIds.length; i += 150) {
    const { data, error } = await supa()
      .from("sb_picks")
      .select("item_id, player_id, choice, guess, is_lock, talk")
      .in("item_id", itemIds.slice(i, i + 150));
    if (error) throw error;
    out.push(...((data ?? []) as SbPick[]).map((p) => ({ ...p, guess: p.guess === null ? null : Number(p.guess) })));
  }
  return out;
}

/** Players who submitted (and locked) their picks for a week. Empty if migration 026 isn't in yet. */
export async function getSubmissions(weekId: string): Promise<string[]> {
  const { data, error } = await supa().from("sb_submissions").select("player_id").eq("week_id", weekId);
  if (error) return [];
  return (data ?? []).map((r) => r.player_id as string);
}

export async function getPlayers(): Promise<SbPlayer[]> {
  const { data, error } = await supa().from("sb_players").select("id, kind, display_name, hidden").order("created_at");
  if (error) throw error;
  return (data ?? []) as SbPlayer[];
}

/* Grading */

function specGameIds(spec: ItemSpec): string[] {
  switch (spec.type) {
    case "winner":
    case "spread":
    case "total":
    case "team_total":
    case "margin":
    case "closest":
      return [spec.game_id];
    case "player_ou":
    case "yes_no":
      return [spec.player.game_id];
    case "h2h":
      return spec.players.map((p) => p.game_id);
    case "week_wins":
      return spec.game_ids;
    case "upset":
      return spec.picks.map((p) => p.game_id);
    default:
      return [];
  }
}

/** Grades every open item in a week that can be decided. Returns how many changed. */
export async function gradeWeek(week: SbWeek, now = new Date()): Promise<number> {
  if (week.status === "final" || week.status === "draft") return 0;
  const items = await getItems(week.id);
  const open = items.filter((i) => i.status === "open" && i.type !== "custom");
  const bounds = weekBounds(weekWindow(week.week_number));
  const weekOver = now >= bounds.end;

  const needsWeek = open.some((i) => i.type === "weekly_leader");
  const weekGameRows = needsWeek ? await getGamesBetween(bounds.start, bounds.end) : [];
  const ids = new Set<string>([...open.flatMap((i) => specGameIds(i.spec)), ...weekGameRows.map((g) => g.game_id)]);
  const boxes = await loadBoxes([...ids]);
  const ctx = { games: boxes, weekGames: weekGameRows.map((g) => boxes.get(g.game_id)!).filter(Boolean), weekOver };

  let changed = 0;
  for (const item of open) {
    const out = gradeItem(item, ctx);
    if (out.state === "pending") continue;
    const patch =
      out.state === "void"
        ? { status: "void", result: { winners: [], actual: null, display: out.display } }
        : { status: "graded", result: out.result };
    const { error } = await supa().from("sb_items").update(patch).eq("id", item.id);
    if (error) throw error;
    changed++;
  }
  if (weekOver && week.status === "open") {
    await supa().from("sb_weeks").update({ status: "graded" }).eq("id", week.id);
  }
  return changed;
}

/**
 * Tells players the latest graded (or final) week is done. Keyed by week, so
 * it sends once however many jobs call it. Never throws; null if nothing to announce.
 */
export async function pushGraded(): Promise<PushResult | null> {
  try {
    const done = (await listWeeks()).filter((w) => w.status === "graded" || w.status === "final");
    if (done.length === 0) return null;
    const n = Math.max(...done.map((w) => w.week_number));
    return await sendPush(
      "graded",
      { title: `Week ${n} is graded`, body: "See how you did against Jaiye and Remi.", data: { route: "/results" } },
      `graded:${SB_SEASON}:${n}`,
    );
  } catch (e) {
    console.error(JSON.stringify({ scope: "push", kind: "graded", err: String(e) }));
    return null;
  }
}

/** The nightly job: refresh recent games and box scores, then grade open weeks. */
export async function nightlySync(now = new Date()) {
  const today = pacificDate(now);
  const back = pacificDate(new Date(now.getTime() - 4 * 86_400_000));
  const ahead = pacificDate(new Date(now.getTime() + 9 * 86_400_000));
  const games = await syncGames(back, ahead);
  const boxes = await syncBoxes();
  const { data: weeks } = await supa().from("sb_weeks").select(WEEK_COLS).in("status", ["open", "graded"]);
  let graded = 0;
  for (const w of (weeks ?? []) as SbWeek[]) graded += await gradeWeek(w, now);
  const push = await pushGraded();
  return { today, games, boxes, graded, push };
}

/* Standings */

export type Board = {
  player: SbPlayer;
  score: PlayerWeekScore;
};

export function weekBoard(items: SbItem[], picks: SbPick[], players: SbPlayer[]): Board[] {
  const visible = players.filter((p) => !p.hidden);
  const active = visible.filter((p) => p.kind !== "challenger" || picks.some((k) => k.player_id === p.id));
  const scores = scoreWeek(items, picks, active.map((p) => p.id));
  return active
    .map((player, i) => ({ player, score: scores[i] }))
    .sort((a, b) => b.score.points - a.score.points || a.player.display_name.localeCompare(b.player.display_name));
}

export type SeasonRow = {
  player: SbPlayer;
  points: number;
  weeksWon: number;
  weeksPlayed: number;
  beatRemi: number;
  beatJaiye: number;
  bestWeek: number;
  locksHit: number;
  locksSet: number;
  streak: number;
};

export type SeasonSummary = {
  rows: SeasonRow[];
  jaiyeVsRemi: { jaiye: number; remi: number; ties: number };
  weekly: Array<{ week: number; jaiye: number; remi: number; winner: string | null }>;
};

/** Season standings from finalized weeks only, so points are official. */
export function seasonSummary(weeks: SbWeek[], items: SbItem[], picks: SbPick[], players: SbPlayer[]): SeasonSummary {
  const finals = weeks.filter((w) => w.status === "final").sort((a, b) => a.week_number - b.week_number);
  const rows = new Map<string, SeasonRow>();
  for (const p of players.filter((p) => !p.hidden)) {
    rows.set(p.id, { player: p, points: 0, weeksWon: 0, weeksPlayed: 0, beatRemi: 0, beatJaiye: 0, bestWeek: 0, locksHit: 0, locksSet: 0, streak: 0 });
  }
  const remi = players.find((p) => p.kind === "remi");
  const jaiye = players.find((p) => p.kind === "jaiye");
  const jaiyeVsRemi = { jaiye: 0, remi: 0, ties: 0 };
  const weekly: SeasonSummary["weekly"] = [];

  for (const w of finals) {
    const wItems = items.filter((i) => i.week_id === w.id);
    const ids = new Set(wItems.map((i) => i.id));
    const wPicks = picks.filter((p) => ids.has(p.item_id));
    const board = weekBoard(wItems, wPicks, players);
    const winner = weekWinner(board.map((b) => b.score));
    const rScore = board.find((b) => b.player.id === remi?.id)?.score;
    const jScore = board.find((b) => b.player.id === jaiye?.id)?.score;
    for (const b of board) {
      const r = rows.get(b.player.id);
      if (!r) continue;
      r.points += b.score.points;
      r.weeksPlayed++;
      r.bestWeek = Math.max(r.bestWeek, b.score.points);
      if (b.score.lockHit !== null) {
        r.locksSet++;
        if (b.score.lockHit) r.locksHit++;
      }
      if (winner === b.player.id) {
        r.weeksWon++;
        r.streak++;
      } else {
        r.streak = 0;
      }
      if (b.player.kind === "challenger") {
        if (rScore && b.score.points > rScore.points) r.beatRemi++;
        if (jScore && b.score.points > jScore.points) r.beatJaiye++;
      }
    }
    if (rScore && jScore) {
      const h2h = weekWinner([jScore, rScore]);
      if (h2h === jaiye?.id) jaiyeVsRemi.jaiye++;
      else if (h2h === remi?.id) jaiyeVsRemi.remi++;
      else jaiyeVsRemi.ties++;
    }
    weekly.push({
      week: w.week_number,
      jaiye: jScore?.points ?? 0,
      remi: rScore?.points ?? 0,
      winner: winner ? players.find((p) => p.id === winner)?.display_name ?? null : null,
    });
  }
  const list = [...rows.values()]
    .filter((r) => r.weeksPlayed > 0 || r.player.kind !== "challenger")
    .sort((a, b) => b.points - a.points || b.weeksWon - a.weeksWon);
  return { rows: list, jaiyeVsRemi, weekly };
}

export type { TeamCode };
