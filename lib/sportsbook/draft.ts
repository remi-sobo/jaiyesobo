/**
 * AI slate drafting. The model chooses matchups, players and lines from
 * real data we hand it (schedule, rosters, season averages). Everything it
 * returns is validated against that data before it becomes an item, so a
 * made up game, team or player never reaches the slate.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { TEAMS, isTeamCode, type TeamCode } from "@/lib/nba/teams";
import { fetchGamesWithInfo, fetchRoster, type EspnGameInfo, type RosterPlayer } from "./espn";
import { getGamesBetween, upsertGames } from "./data";
import { fantasyPoints } from "./grade";
import {
  CATEGORY_INFO,
  DEFAULT_POINTS,
  MOST_STAT_LABEL,
  STAT_LABEL,
  categoryPoints,
  CATEGORIES,
  type Category,
  type ItemOption,
  type ItemSpec,
  type ItemType,
  type MostStat,
  type PlayerRef,
  type StatKey,
} from "./types";
import { pacificDate, tipLabel, weekBounds, weekWindow, type WeekWindow } from "./weeks";

const MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-6"];

export type DraftItem = {
  category: Category | null;
  type: ItemType;
  prompt: string;
  note: string | null;
  options: ItemOption[];
  points: number;
  spec: ItemSpec;
  locks_at: string;
};

type Game = { game_id: string; tip_at: string; home: TeamCode; away: TeamCode };

type PlayerInfo = RosterPlayer & {
  gp: number;
  pts: number;
  reb: number;
  ast: number;
  fg3m: number;
  stl: number;
  blk: number;
  fpts: number;
  last5: number | null;
};

export type SlateContext = {
  week: WeekWindow;
  games: Game[];
  players: Map<number, PlayerInfo>;
  records: Map<TeamCode, { w: number; l: number }>;
  /** Odds, TV and ESPN records by game id, when ESPN has them. */
  info: Map<string, EspnGameInfo>;
  favorites: { teams: TeamCode[]; players: string[] };
};

export type SportsbookSettings = { fav_teams: TeamCode[]; fav_players: string[] };

export async function getSettings(): Promise<SportsbookSettings> {
  const { data } = await createServiceClient().from("app_config").select("value").eq("key", "sportsbook_settings").maybeSingle();
  const v = (data?.value ?? {}) as Partial<SportsbookSettings>;
  return {
    fav_teams: (v.fav_teams ?? ["SAS"]).filter(isTeamCode),
    fav_players: (v.fav_players ?? []).filter((p): p is string => typeof p === "string"),
  };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Site copy never uses em dashes, en dashes or double hyphens. */
export function cleanCopy(s: string): string {
  return s
    .replace(/\s*(--|[\u2013\u2014])\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .trim();
}
/** Every line ends in .5 so nobody ties. */
export const half = (n: number) => Math.floor(n) + 0.5;

export async function buildContext(weekNumber: number, now = new Date()): Promise<SlateContext> {
  const week = weekWindow(weekNumber);
  const { start, end } = weekBounds(week);
  const fresh = await fetchGamesWithInfo(week.starts_on, week.ends_on);
  await upsertGames(fresh.map((f) => f.game));
  const info = new Map(fresh.map((f) => [f.game.game_id, f.info]));
  const soon = new Date(now.getTime() + 30 * 60_000);
  const games = (await getGamesBetween(start, end))
    .filter((g) => !g.postponed && new Date(g.tip_at) > soon)
    .map((g) => ({ game_id: g.game_id, tip_at: g.tip_at, home: g.home as TeamCode, away: g.away as TeamCode }));

  const teams = [...new Set(games.flatMap((g) => [g.home, g.away]))];
  const rosters = (await Promise.all(teams.map((t) => fetchRoster(t).catch(() => [])))).flat();

  const db = createServiceClient();
  const ids = rosters.map((p) => p.person_id);
  type Line = { person_id: number; played: boolean; pts: number; reb: number; ast: number; fg3m: number; stl: number; blk: number; tov: number; game_id: string };
  const lines: Line[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db
      .from("nba_player_games")
      .select("person_id, played, pts, reb, ast, fg3m, stl, blk, tov, game_id")
      .in("person_id", ids.slice(i, i + 200))
      .eq("played", true);
    lines.push(...((data ?? []) as Line[]));
  }
  const { data: done } = await db.from("nba_games").select("game_id, tip_at, home, away, home_score, away_score").eq("status", 3);
  const order = new Map((done ?? []).map((g) => [g.game_id, g.tip_at as string]));

  const players = new Map<number, PlayerInfo>();
  for (const p of rosters) {
    const mine = lines
      .filter((l) => Number(l.person_id) === p.person_id)
      .sort((a, b) => (order.get(b.game_id) ?? "").localeCompare(order.get(a.game_id) ?? ""));
    const gp = mine.length;
    const avg = (k: "pts" | "reb" | "ast" | "fg3m" | "stl" | "blk") => (gp ? r1(mine.reduce((s, l) => s + l[k], 0) / gp) : 0);
    const last = mine.slice(0, 5);
    players.set(p.person_id, {
      ...p,
      gp,
      pts: avg("pts"),
      reb: avg("reb"),
      ast: avg("ast"),
      fg3m: avg("fg3m"),
      stl: avg("stl"),
      blk: avg("blk"),
      fpts: gp ? r1(mine.reduce((s, l) => s + fantasyPoints(l), 0) / gp) : 0,
      last5: last.length ? r1(last.reduce((s, l) => s + l.pts, 0) / last.length) : null,
    });
  }

  const records = new Map<TeamCode, { w: number; l: number }>();
  for (const g of done ?? []) {
    const h = g.home as TeamCode;
    const a = g.away as TeamCode;
    const hw = (g.home_score ?? 0) > (g.away_score ?? 0);
    for (const [t, won] of [[h, hw], [a, !hw]] as Array<[TeamCode, boolean]>) {
      const r = records.get(t) ?? { w: 0, l: 0 };
      if (won) r.w++;
      else r.l++;
      records.set(t, r);
    }
  }

  const s = await getSettings();
  return { week, games, players, records, info, favorites: { teams: s.fav_teams, players: s.fav_players } };
}

/** Games the team still plays this week, from the drafting window. */
function gamesLeft(ctx: SlateContext, team: TeamCode): number {
  return ctx.games.filter((g) => g.home === team || g.away === team).length;
}

function contextText(ctx: SlateContext, avoid: string[]): string {
  const rec = (t: TeamCode, espn: string | null | undefined) => {
    if (espn) return espn;
    const r = ctx.records.get(t);
    return r ? `${r.w}-${r.l}` : "0-0";
  };
  const games = ctx.games
    .map((g) => {
      const i = ctx.info.get(g.game_id);
      const extra = [i?.odds ? `line ${i.odds}` : null, i?.over_under ? `total ${i.over_under}` : null, i?.tv ? `national TV ${i.tv}` : null]
        .filter(Boolean)
        .join(", ");
      return `${g.game_id} | ${pacificDate(new Date(g.tip_at))} ${tipLabel(g.tip_at)} PT | ${g.away} (${rec(g.away, i?.away_record)}) at ${g.home} (${rec(g.home, i?.home_record)})${extra ? ` | ${extra}` : ""}`;
    })
    .join("\n");
  const teams = [...new Set(ctx.games.flatMap((g) => [g.home, g.away]))].sort();
  const perTeam = teams.map((t) => `${t} ${gamesLeft(ctx, t)}`).join(", ");
  const byTeam = new Map<TeamCode, PlayerInfo[]>();
  for (const p of ctx.players.values()) byTeam.set(p.team, [...(byTeam.get(p.team) ?? []), p]);
  const rosters = [...byTeam.entries()]
    .map(([team, ps]) => {
      const top = ps
        .filter((p) => !p.injured)
        .sort((a, b) => b.fpts - a.fpts || b.pts - a.pts || a.name.localeCompare(b.name))
        .slice(0, 9)
        .map((p) =>
          p.gp
            ? `${p.person_id} ${p.name} ${p.position}: ${p.gp}gp ${p.pts}pts ${p.reb}reb ${p.ast}ast ${p.fg3m}3pm ${p.stl}stl ${p.blk}blk ${p.fpts}fantasy${p.last5 !== null ? ` last5 ${p.last5}pts` : ""}`
            : `${p.person_id} ${p.name} ${p.position}: no games yet`,
        )
        .join("\n  ");
      return `${team} ${TEAMS[team].city} ${TEAMS[team].name}:\n  ${top}`;
    })
    .join("\n");
  return `WEEK ${ctx.week.week_number} (${ctx.week.starts_on} to ${ctx.week.ends_on}).

GAMES (id | date and tip | matchup with records | line, total and national TV when posted):
${games}

GAMES LEFT THIS WEEK PER TEAM: ${perTeam}

ROSTERS (person_id name position: this season's averages; fantasy = points + 1.2 reb + 1.5 ast + 3 stl + 3 blk - turnovers). Injured players are left out.
${rosters}

JAIYE'S FAVORITE TEAMS: ${ctx.favorites.teams.join(", ") || "none"}
JAIYE'S FAVORITE PLAYERS: ${ctx.favorites.players.join(", ") || "none"}

ALREADY ON THE SLATE OR USED LAST WEEK (don't repeat these):
${avoid.join("\n") || "none"}`;
}

const VOICE = `VOICE: You are writing as Jaiye, a confident 9 year old Black kid from East Palo Alto who loves hoops. Short sentences. Simple words a 4th grader uses. Swagger and confidence, playful trash talk, but never mean and never a caricature: no forced slang, at most one slang word. Sounds like a kid texting his friends, not a TV announcer or a grown up. No words like slate, matchup narrative, storyline, compelling, showdown, clash, or poised.`;

const SYSTEM = `You build picks for the Sobo Sportsbook, a no-money NBA pick'em between Jaiye and his dad Remi (plus friends). Always call them Jaiye and Remi. Make it fun, varied and fair, like the best prop menus on real betting apps, but kid friendly.

Item types you can use (each tile tells you which ones it allows):
- winner: who wins a game. Needs game_id.
- spread: does "team" win by more than "line"? Use the favorite. Needs game_id, team, line.
- total: game total points over/under "line". Needs game_id, line.
- team_total: one team's points over/under "line". Needs game_id, team, line.
- player_ou: a player's stat over/under "line". Needs game_id, player (person_id, name, team), stat, line.
- most: which player gets the most of a stat. Needs players (2 to 4, each with person_id, name, team, game_id), stat ("pts", "reb", "ast", "fg3m", "stl", "blk" or "fantasy") and scope. scope "game": each player's stat in the game you attach them to. scope "week": each player's total over all their games this week, so their teams must have the SAME number of games left (see GAMES LEFT THIS WEEK PER TEAM).
- yes_no: needs game_id, player, check ("triple_double", "double_double", or "at_least" with stat and threshold). Make it about 30 to 50 percent likely.
- margin: how much does "team" (the favorite) win by: 1 to 5, 6 to 10, 11+, or does the other team win. Needs game_id, team.
- week_wins: how many games "team" wins this week. Needs team (one with 3 or more games this week).
- weekly_leader: which of 4 players has the biggest single game this week in "stat". Needs candidates (4, with person_id, name, team) and stat.
- closest: guess a number, closest wins. Needs game_id, measure ("total_points", "total_3s", or "team_points" with team).
- upset: pick one underdog to win outright. Needs upset_picks: 3 underdogs from different games on the SAME day, each {team, game_id}.

Rules:
- Use ONLY game ids, teams and person_ids from the data. Never invent a player. A player must play in the game you attach them to.
- It is early in the season, so records are small. Also use what you know about how good teams were last season and their offseason moves.
- Lines come from the numbers: player lines near their season or last 5 average, spreads from the posted line or from team strength and home court (about 2.5 points), totals from the posted total or around 215 to 235. Every line ends in .5.
- Spread items across different days of the week so there is something to watch most nights.
- Feature Jaiye's favorite teams and players when they play, but not every item.
- prompt: the question on the card, short and punchy, no more than 90 characters. Plain words, like "Knicks or Celtics?" or "Who gets more boards, Sabonis or Gobert?"
- note: one line from Jaiye about the pick, no more than 120 characters, like "Wemby is a cheat code on the boards." No money talk.
- Never use em dashes, en dashes or double hyphens (--).
- ${VOICE}`;

/** What each tile asks the model for. */
const TILE_ASK: Record<Category, string> = {
  matchups: `TILE: Big Matchups. Write 7 "winner" items, each a different game. Only the best, closest games of the week: two good teams that are close in strength, where you really don't know who wins. Never a good team against a bad team. If a line is posted, stay under 6 points. National TV games get a bump. Spread them across the week. prompt like "Knicks or Celtics?". note says why it's close.`,
  battles: `TILE: Player Battles. Write 7 "most" items with exactly 2 players each. Two players with close averages in that stat, so it's a real coin flip. Mix the stats: no more than 2 about points, and use rebounds, assists, 3s, and blocks or steals too. Make 2 of them scope "week" (who gets more this week) with players whose teams have the same number of games left; the prompt should say "this week". The rest are scope "game", and the two players should play on the same night (same game is best). Use different players in every item.`,
  fantasy: `TILE: Fantasy Showdown. Write 7 "most" items with stat "fantasy" and 3 or 4 players each. Stars with close fantasy averages, all playing on the same night (scope "game"), different nights for different items. You may make 1 of them scope "week" if all the players' teams have the same number of games left. prompt like "Who has the biggest fantasy night Tuesday?" Use different players in every item.`,
  higher_lower: `TILE: Higher or Lower. Write 7 items: mostly "player_ou" (mix points, rebounds, assists and 3s, not all points), plus at most 1 "team_total" or "total". Lines close to the average so it's a real 50/50.`,
  yes_no: `TILE: Yes or No. Write 7 items: mostly "yes_no" (double doubles, triple doubles, "at_least" big numbers like 35 points, 15 rebounds, 5 threes, 4 blocks), plus at most 1 "spread". About 30 to 50 percent likely each.`,
  wild: `TILE: Wild Cards. Write exactly 1 "upset", exactly 1 "closest", then 4 more from "week_wins", "weekly_leader" and "margin" (at least one of each if you can).`,
};

const PlayerSchema = z.object({ person_id: z.number(), name: z.string(), team: z.string(), game_id: z.string().optional() });

const AiItem = z.object({
  type: z.enum(["winner", "spread", "total", "team_total", "player_ou", "most", "yes_no", "margin", "week_wins", "weekly_leader", "closest", "upset"]),
  prompt: z.string(),
  note: z.string(),
  game_id: z.string().optional(),
  team: z.string().optional(),
  line: z.number().optional(),
  stat: z.enum(["pts", "reb", "ast", "fg3m", "stl", "blk", "fantasy"]).optional(),
  scope: z.enum(["game", "week"]).optional(),
  player: PlayerSchema.optional(),
  players: z.array(PlayerSchema).optional(),
  check: z.enum(["triple_double", "double_double", "at_least"]).optional(),
  threshold: z.number().optional(),
  candidates: z.array(PlayerSchema).optional(),
  measure: z.enum(["total_points", "total_3s", "team_points"]).optional(),
  upset_picks: z.array(z.object({ team: z.string(), game_id: z.string() })).optional(),
});
type AiItem = z.infer<typeof AiItem>;

async function askModel<T extends z.ZodTypeAny>(schema: T, system: string, prompt: string): Promise<z.infer<T>> {
  let last: unknown;
  for (const model of MODELS) {
    try {
      const { object } = await generateObject({ model: anthropic(model), schema, system, prompt });
      return object as z.infer<T>;
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

/* Turning AI output into real, checked items */

function teamName(t: TeamCode) {
  return `${TEAMS[t].city} ${TEAMS[t].name}`;
}

function gameOf(ctx: SlateContext, id: string | undefined): Game | null {
  return ctx.games.find((g) => g.game_id === id) ?? null;
}

function plays(g: Game, t: TeamCode) {
  return g.home === t || g.away === t;
}

/** Finds a real player for an AI reference, by id first and then by name. */
function realPlayer(ctx: SlateContext, p: { person_id: number; name: string; team?: string } | undefined): PlayerInfo | null {
  if (!p) return null;
  const byId = ctx.players.get(p.person_id);
  if (byId) return byId;
  const want = p.name.toLowerCase().trim();
  return [...ctx.players.values()].find((x) => x.name.toLowerCase() === want) ?? null;
}

function gameForPlayer(ctx: SlateContext, pl: PlayerInfo, hint?: string): Game | null {
  const g = gameOf(ctx, hint);
  if (g && plays(g, pl.team)) return g;
  return ctx.games.find((x) => plays(x, pl.team)) ?? null;
}

const ref = (p: PlayerInfo, g: Game): PlayerRef => ({ person_id: p.person_id, name: p.name, team: p.team, game_id: g.game_id });

export function toDraftItem(ai: AiItem, ctx: SlateContext, category: Category | null = null): DraftItem | null {
  if (category && !CATEGORY_INFO[category].types.includes(ai.type)) return null;
  const base = {
    category,
    type: ai.type as ItemType,
    prompt: cleanCopy(ai.prompt).slice(0, 140),
    note: ai.note ? cleanCopy(ai.note).slice(0, 200) || null : null,
    points: category ? categoryPoints(category, ai.type) : DEFAULT_POINTS[ai.type],
  };
  const team = ai.team && isTeamCode(ai.team.toUpperCase()) ? (ai.team.toUpperCase() as TeamCode) : null;
  const line = typeof ai.line === "number" ? half(ai.line) : null;
  const ou = (l: number): ItemOption[] => [
    { key: "over", label: `Over ${l}` },
    { key: "under", label: `Under ${l}` },
  ];
  const yesNo: ItemOption[] = [
    { key: "yes", label: "Yes" },
    { key: "no", label: "No" },
  ];
  const stat: StatKey = ai.stat && ai.stat !== "fantasy" ? ai.stat : "pts";

  switch (ai.type) {
    case "winner": {
      const g = gameOf(ctx, ai.game_id);
      if (!g) return null;
      // Big Matchups are close games only. A posted line over 6 is a mismatch.
      const spread = ctx.info.get(g.game_id)?.spread;
      if (category === "matchups" && typeof spread === "number" && spread > 6.5) return null;
      return {
        ...base,
        options: [
          { key: g.away, label: teamName(g.away), team: g.away },
          { key: g.home, label: teamName(g.home), team: g.home },
        ],
        spec: { type: "winner", game_id: g.game_id },
        locks_at: g.tip_at,
      };
    }
    case "spread": {
      const g = gameOf(ctx, ai.game_id);
      if (!g || !team || !plays(g, team) || line === null || line <= 0) return null;
      return {
        ...base,
        options: [
          { key: "yes", label: `${team} by ${Math.ceil(line)}+`, team },
          { key: "no", label: "No" },
        ],
        spec: { type: "spread", game_id: g.game_id, team, line },
        locks_at: g.tip_at,
      };
    }
    case "total": {
      const g = gameOf(ctx, ai.game_id);
      if (!g || line === null) return null;
      return { ...base, options: ou(line), spec: { type: "total", game_id: g.game_id, line }, locks_at: g.tip_at };
    }
    case "team_total": {
      const g = gameOf(ctx, ai.game_id);
      if (!g || !team || !plays(g, team) || line === null) return null;
      return { ...base, options: ou(line), spec: { type: "team_total", game_id: g.game_id, team, line }, locks_at: g.tip_at };
    }
    case "player_ou": {
      const pl = realPlayer(ctx, ai.player);
      if (!pl || line === null) return null;
      const g = gameForPlayer(ctx, pl, ai.game_id ?? ai.player?.game_id);
      if (!g) return null;
      return { ...base, options: ou(line), spec: { type: "player_ou", player: ref(pl, g), stat, line }, locks_at: g.tip_at };
    }
    case "most": {
      const want: MostStat = ai.stat ?? "pts";
      const scope = ai.scope ?? "game";
      const ps = (ai.players ?? [])
        .map((p) => {
          const pl = realPlayer(ctx, p);
          const g = pl ? gameForPlayer(ctx, pl, p.game_id) : null;
          return pl && g ? { pl, g } : null;
        })
        .filter((x): x is { pl: PlayerInfo; g: Game } => !!x)
        .filter((x, i, all) => all.findIndex((y) => y.pl.person_id === x.pl.person_id) === i)
        .slice(0, 4);
      if (ps.length < 2 || ps.length !== (ai.players ?? []).length) return null;
      if (category === "battles" && ps.length !== 2) return null;
      if (category === "fantasy" && (ps.length < 3 || want !== "fantasy")) return null;
      let locks: string;
      if (scope === "week") {
        // Fair only when everyone has the same number of games left.
        const counts = ps.map((x) => gamesLeft(ctx, x.pl.team));
        if (counts[0] < 2 || counts.some((c) => c !== counts[0])) return null;
        locks = ctx.games.filter((g) => ps.some((x) => plays(g, x.pl.team))).map((g) => g.tip_at).sort()[0];
      } else {
        locks = ps.map((x) => x.g.tip_at).sort()[0];
      }
      return {
        ...base,
        options: ps.map((x, i) => ({ key: String(i), label: x.pl.name, team: x.pl.team })),
        spec: { type: "most", players: ps.map((x) => ref(x.pl, x.g)), stat: want, scope },
        locks_at: locks,
      };
    }
    case "yes_no": {
      const pl = realPlayer(ctx, ai.player);
      if (!pl) return null;
      const g = gameForPlayer(ctx, pl, ai.game_id ?? ai.player?.game_id);
      if (!g) return null;
      const check = ai.check ?? "double_double";
      if (check === "at_least" && (!ai.stat || ai.stat === "fantasy" || typeof ai.threshold !== "number")) return null;
      return {
        ...base,
        options: yesNo,
        spec: { type: "yes_no", player: ref(pl, g), check, stat: check === "at_least" ? stat : undefined, threshold: ai.threshold },
        locks_at: g.tip_at,
      };
    }
    case "margin": {
      const g = gameOf(ctx, ai.game_id);
      if (!g || !team || !plays(g, team)) return null;
      const other = g.home === team ? g.away : g.home;
      return {
        ...base,
        options: [
          { key: "1-5", label: `${team} by 1 to 5`, team },
          { key: "6-10", label: `${team} by 6 to 10`, team },
          { key: "11+", label: `${team} by 11+`, team },
          { key: "other", label: `${other} wins`, team: other },
        ],
        spec: { type: "margin", game_id: g.game_id, team },
        locks_at: g.tip_at,
      };
    }
    case "week_wins": {
      if (!team) return null;
      const games = ctx.games.filter((g) => plays(g, team));
      if (games.length < 2) return null;
      const n = games.length;
      const buckets: Array<[number, number]> =
        n === 2 ? [[0, 0], [1, 1], [2, 2]] : n === 3 ? [[0, 1], [2, 2], [3, 3]] : [[0, 1], [2, 2], [3, n]];
      const label = ([lo, hi]: [number, number]) =>
        lo === hi ? `${lo} ${lo === 1 ? "win" : "wins"}` : hi >= n && lo > 0 ? `${lo}+ wins` : `${lo} or ${hi} wins`;
      return {
        ...base,
        options: buckets.map((b, i) => ({ key: String(i), label: label(b) })),
        spec: { type: "week_wins", team, game_ids: games.map((g) => g.game_id), buckets },
        locks_at: games[0].tip_at,
      };
    }
    case "weekly_leader": {
      const cands = (ai.candidates ?? [])
        .map((c) => realPlayer(ctx, c))
        .filter((p): p is PlayerInfo => !!p)
        .filter((p, i, all) => all.findIndex((x) => x.person_id === p.person_id) === i)
        .slice(0, 4);
      if (cands.length < 3) return null;
      const first = ctx.games.find((g) => cands.some((c) => plays(g, c.team)));
      if (!first) return null;
      return {
        ...base,
        options: cands.map((c, i) => ({ key: String(i), label: c.name, team: c.team })),
        spec: { type: "weekly_leader", stat, candidates: cands.map((c) => ({ person_id: c.person_id, name: c.name, team: c.team })) },
        locks_at: first.tip_at,
      };
    }
    case "closest": {
      const g = gameOf(ctx, ai.game_id);
      const measure = ai.measure ?? "total_points";
      if (!g) return null;
      if (measure === "team_points" && (!team || !plays(g, team))) return null;
      return {
        ...base,
        options: [],
        spec: { type: "closest", game_id: g.game_id, measure, team: team ?? undefined },
        locks_at: g.tip_at,
      };
    }
    case "upset": {
      const picks = (ai.upset_picks ?? [])
        .map((p) => ({ team: p.team.toUpperCase(), g: gameOf(ctx, p.game_id) }))
        .filter((p): p is { team: TeamCode; g: Game } => isTeamCode(p.team) && !!p.g && plays(p.g, p.team as TeamCode))
        .filter((p, i, all) => all.findIndex((x) => x.g.game_id === p.g.game_id) === i)
        .slice(0, 4);
      if (picks.length < 2) return null;
      const lock = picks.map((p) => p.g.tip_at).sort()[0];
      return {
        ...base,
        options: picks.map((p) => ({
          key: p.team,
          label: `${teamName(p.team)} over ${p.g.home === p.team ? p.g.away : p.g.home}`,
          team: p.team,
        })),
        spec: { type: "upset", picks: picks.map((p) => ({ team: p.team, game_id: p.g.game_id })) },
        locks_at: lock,
      };
    }
  }
}

export const TILE_SIZE = 5;

/** The best 5 from what came back, keeping each tile's rules. */
function pickFive(category: Category, items: DraftItem[]): DraftItem[] {
  const out: DraftItem[] = [];
  const seenGames = new Set<string>();
  const seenPrompts = new Set<string>();
  const has = (t: ItemType) => out.some((i) => i.type === t);
  // Wild Cards always lead with the Upset Special and the closest guess.
  const ordered =
    category === "wild"
      ? [...items.filter((i) => i.type === "upset"), ...items.filter((i) => i.type === "closest"), ...items.filter((i) => i.type !== "upset" && i.type !== "closest")]
      : items;
  for (const it of ordered) {
    if (out.length >= TILE_SIZE) break;
    const key = it.prompt.toLowerCase();
    if (seenPrompts.has(key)) continue;
    if (category === "matchups") {
      const g = (it.spec as { game_id: string }).game_id;
      if (seenGames.has(g)) continue;
      seenGames.add(g);
    }
    if (category === "wild" && (it.type === "upset" || it.type === "closest") && has(it.type)) continue;
    seenPrompts.add(key);
    out.push(it);
  }
  return out.sort((a, b) => a.locks_at.localeCompare(b.locks_at));
}

/** Drafts one tile of 5. Tries twice before giving up. */
export async function draftTile(ctx: SlateContext, category: Category, avoid: string[] = []): Promise<DraftItem[]> {
  if (ctx.games.length === 0) throw new Error("No upcoming games this week.");
  // Structured output rejects array length rules, so counts are checked in code.
  const schema = z.object({ items: z.array(AiItem) });
  let best: DraftItem[] = [];
  for (let attempt = 0; attempt < 2 && best.length < TILE_SIZE; attempt++) {
    const retry = attempt ? `\n\nLast try only ${best.length} were usable. Follow the tile rules exactly and only use ids from the data.` : "";
    const out = await askModel(schema, SYSTEM, `${contextText(ctx, avoid)}\n\n${TILE_ASK[category]}${retry}`);
    const items = out.items.map((a) => toDraftItem(a, ctx, category)).filter((i): i is DraftItem => i !== null);
    const five = pickFive(category, [...best, ...items]);
    if (five.length > best.length) best = five;
  }
  if (best.length < 3) throw new Error(`${CATEGORY_INFO[category].title}: only ${best.length} usable picks came back. Try that tile again.`);
  return best;
}

/** Every tile at once. Tiles that fail are reported so they can be redone alone. */
export async function draftTiles(ctx: SlateContext, avoid: string[] = []): Promise<{ items: DraftItem[]; failed: string[] }> {
  const results = await Promise.allSettled(CATEGORIES.map((c) => draftTile(ctx, c, avoid)));
  const items: DraftItem[] = [];
  const failed: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") items.push(...r.value);
    else failed.push(CATEGORY_INFO[CATEGORIES[i]].title);
  });
  if (items.length === 0) throw new Error("The AI couldn't build any tiles. Try again.");
  return { items, failed };
}

/** One replacement item for a tile. */
export async function draftOne(ctx: SlateContext, avoid: string[], category: Category, type?: ItemType): Promise<DraftItem> {
  const schema = z.object({ items: z.array(AiItem) });
  const like = type && type !== "custom" ? ` Make them type "${type}".` : "";
  const out = await askModel(
    schema,
    SYSTEM,
    `${contextText(ctx, avoid)}

${TILE_ASK[category]}

Actually write just 3 items for this tile.${like} Each must be different from everything in the "already on the slate" list.`,
  );
  const items = out.items.map((a) => toDraftItem(a, ctx, category)).filter((i): i is DraftItem => i !== null);
  if (!items[0]) throw new Error("Couldn't make a replacement. Try again.");
  return items[0];
}

/* Monday recap */

export async function writeRecap(input: {
  week: number;
  board: Array<{ name: string; points: number; correct: number; wrong: number; lockHit: boolean | null }>;
  items: Array<{ prompt: string; result: string; jaiye: string; remi: string; jaiyeRight: boolean | null; remiRight: boolean | null }>;
  challengers: number;
}): Promise<string> {
  const prompt = `Week ${input.week} of the Sobo Sportsbook is done. Write the recap.

LEADERBOARD:
${input.board.map((b) => `${b.name}: ${b.points} pts (${b.correct} right, ${b.wrong} wrong, lock ${b.lockHit === null ? "none" : b.lockHit ? "hit" : "missed"})`).join("\n")}

PICKS (Jaiye vs Remi):
${input.items.map((i) => `${i.prompt} | result: ${i.result} | Jaiye: ${i.jaiye}${i.jaiyeRight === null ? "" : i.jaiyeRight ? " (right)" : " (wrong)"} | Remi: ${i.remi}${i.remiRight === null ? "" : i.remiRight ? " (right)" : " (wrong)"}`).join("\n")}

${input.challengers} challengers played this week.`;
  let last: unknown;
  for (const model of MODELS) {
    try {
      const { text } = await generateText({
        model: anthropic(model),
        system: `You write the Monday recap for the Sobo Sportsbook, a no-money NBA pick'em between Jaiye and his dad Remi, plus friends. Write it as Jaiye, in first person ("I", "me", "my dad"). VOICE: You are writing as Jaiye, a confident 9 year old Black kid from East Palo Alto who loves hoops. Short sentences. Simple words a 4th grader uses. Swagger and confidence, playful trash talk, but never mean and never a caricature: no forced slang, at most one slang word. Sounds like a kid texting his friends, not a TV announcer or a grown up. No words like slate, matchup narrative, storyline, compelling, showdown, clash, or poised. 4 to 6 short sentences: who won the week and by how much, my best call, my worst miss, one fun stat, and a line about next week. If I lost, own it and talk a little trash about next week. Name challengers only if one of them won. No money talk. Plain text, no markdown, no em dashes, en dashes or double hyphens.`,
        prompt,
      });
      return cleanCopy(text);
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export function statLabel(s: MostStat) {
  return s === "fantasy" ? MOST_STAT_LABEL.fantasy : STAT_LABEL[s];
}
