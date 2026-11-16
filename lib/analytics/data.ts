import { createServiceClient } from "@/lib/supabase/server";
import { games } from "@/lib/content/games";
import type { SiteEvent } from "./types";
import { dayKey, dayKeys, rangeFor, summarize, totals, visitorHandle, type PersonRow, type Summary, type Totals } from "./summarize";

/** Loads what /admin/analytics shows. Server only. */

const PAGE = 1000;
const MAX_ROWS = 60_000;
const KEEP_DAYS = 400;

const COLUMNS =
  "id, created_at, visitor_id, session_id, type, path, target, label, detail, value, referrer, device, private, family, player_id, games_session_id";

async function loadEvents(sinceIso: string, visitorId?: string): Promise<{ events: SiteEvent[]; capped: boolean }> {
  const supa = createServiceClient();
  const events: SiteEvent[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let q = supa.from("site_events").select(COLUMNS).gte("created_at", sinceIso);
    if (visitorId) q = q.eq("visitor_id", visitorId);
    const { data, error } = await q.order("id", { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    events.push(...((data ?? []) as SiteEvent[]));
    if (!data || data.length < PAGE) return { events, capped: false };
  }
  return { events, capped: true };
}

export type GameRow = { slug: string; title: string; plays: number; players: number };

async function loadGamePlays(sinceIso: string, days: Set<string>): Promise<GameRow[]> {
  const supa = createServiceClient();
  const bySlug = new Map<string, { plays: number; players: Set<string> }>();
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supa
      .from("plays")
      .select("game_slug, anon_session_id, user_id, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const p of data ?? []) {
      if (!days.has(dayKey(p.created_at as string))) continue;
      const slug = p.game_slug as string;
      let g = bySlug.get(slug);
      if (!g) bySlug.set(slug, (g = { plays: 0, players: new Set() }));
      g.plays++;
      g.players.add((p.anon_session_id ?? p.user_id ?? "?") as string);
    }
    if (!data || data.length < PAGE) break;
  }
  const title = (slug: string) => games.find((g) => g.slug === slug)?.title ?? slug;
  return [...bySlug].map(([slug, g]) => ({ slug, title: title(slug), plays: g.plays, players: g.players.size })).sort((a, b) => b.plays - a.plays);
}

/** Display names for the visitors who already gave us one. */
async function loadNames(people: Pick<PersonRow, "visitorId" | "playerId" | "gamesSessionId" | "family">[]): Promise<Record<string, { name: string; kind: string }>> {
  const supa = createServiceClient();
  const playerIds = [...new Set(people.map((p) => p.playerId).filter((v): v is string => !!v))];
  const gameIds = [...new Set(people.map((p) => p.gamesSessionId).filter((v): v is string => !!v))];
  const [players, gamers] = await Promise.all([
    playerIds.length
      ? supa.from("sb_players").select("id, display_name").in("id", playerIds).is("deleted_at", null)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
    gameIds.length
      ? supa.from("anon_sessions").select("id, display_name").in("id", gameIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
  ]);
  const playerName = new Map((players.data ?? []).map((p) => [p.id as string, p.display_name as string]));
  const gamerName = new Map((gamers.data ?? []).map((p) => [p.id as string, p.display_name as string]));

  const names: Record<string, { name: string; kind: string }> = {};
  for (const p of people) {
    const player = p.playerId ? playerName.get(p.playerId) : undefined;
    const gamer = p.gamesSessionId ? gamerName.get(p.gamesSessionId) : undefined;
    if (player) names[p.visitorId] = { name: player, kind: "Run It Back player" };
    else if (gamer && gamer !== "Anonymous") names[p.visitorId] = { name: gamer, kind: "Games nickname" };
    else if (p.family) names[p.visitorId] = { name: "Family", kind: "Signed in to /me" };
    else names[p.visitorId] = { name: visitorHandle(p.visitorId), kind: "No name" };
  }
  return names;
}

export type Dashboard = {
  range: ReturnType<typeof rangeFor>;
  summary: Summary;
  previous: Totals;
  games: GameRow[];
  names: Record<string, { name: string; kind: string }>;
  familyHidden: number;
  capped: boolean;
};

export async function loadDashboard(rangeKey: string | undefined, includeFamily: boolean, now = new Date()): Promise<Dashboard> {
  const range = rangeFor(rangeKey);
  const days = dayKeys(now, range.days);
  const before = dayKeys(now, range.days, range.days);
  // One extra day of slack so the oldest Pacific day is fully covered.
  const sinceIso = new Date(now.getTime() - (range.days * 2 + 1) * 86_400_000).toISOString();

  // Old rows go once they are past 13 months. Fire and forget.
  void createServiceClient()
    .from("site_events")
    .delete()
    .lt("created_at", new Date(now.getTime() - KEEP_DAYS * 86_400_000).toISOString())
    .then(() => {});

  const daySet = new Set(days);
  const beforeSet = new Set(before);
  const [{ events, capped }, gameRows] = await Promise.all([loadEvents(sinceIso), loadGamePlays(sinceIso, daySet).catch(() => [])]);

  const inRange = events.filter((e) => daySet.has(dayKey(e.created_at)));
  const familyHidden = includeFamily ? 0 : new Set(inRange.filter((e) => e.family).map((e) => e.visitor_id)).size;
  const keep = (e: SiteEvent) => includeFamily || !e.family;

  const summary = summarize(inRange.filter(keep), days);
  const previous = totals(events.filter((e) => beforeSet.has(dayKey(e.created_at)) && keep(e)));
  const names = await loadNames(summary.people);
  return { range, summary, previous, games: gameRows, names, familyHidden, capped };
}

export async function loadVisitor(visitorId: string, now = new Date()) {
  const sinceIso = new Date(now.getTime() - KEEP_DAYS * 86_400_000).toISOString();
  const { events } = await loadEvents(sinceIso, visitorId);
  if (!events.length) return null;
  const summary = summarize(events, []);
  const person = summary.people[0];
  const names = await loadNames([person]);
  const newestFirst = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { person, name: names[visitorId], events: newestFirst, summary };
}
