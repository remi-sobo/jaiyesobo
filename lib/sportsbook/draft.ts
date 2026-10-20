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
import { fetchRoster, type RosterPlayer } from "./espn";
import { getGamesBetween, syncGames } from "./data";
import { DEFAULT_POINTS, ITEM_TYPE_LABEL, STAT_LABEL, type ItemOption, type ItemSpec, type ItemType, type PlayerRef, type StatKey } from "./types";
import { tipLabel, weekBounds, weekWindow, type WeekWindow } from "./weeks";

const MODELS = ["claude-sonnet-5-5", "claude-sonnet-4-6"];

export type DraftItem = {
  type: ItemType;
  prompt: string;
  note: string | null;
  options: ItemOption[];
  points: number;
  spec: ItemSpec;
  locks_at: string;
};

type Game = { game_id: string; tip_at: string; home: TeamCode; away: TeamCode };

type PlayerInfo = RosterPlayer & { gp: number; pts: number; reb: number; ast: number; fg3m: number; last5: number | null };

export type SlateContext = {
  week: WeekWindow;
  games: Game[];
  players: Map<number, PlayerInfo>;
  records: Map<TeamCode, { w: number; l: number }>;
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
/** Every line ends in .5 so nobody ties. */
export const half = (n: number) => Math.floor(n) + 0.5;

export async function buildContext(weekNumber: number, now = new Date()): Promise<SlateContext> {
  const week = weekWindow(weekNumber);
  const { start, end } = weekBounds(week);
  await syncGames(week.starts_on, week.ends_on);
  const soon = new Date(now.getTime() + 30 * 60_000);
  const games = (await getGamesBetween(start, end))
    .filter((g) => !g.postponed && new Date(g.tip_at) > soon)
    .map((g) => ({ game_id: g.game_id, tip_at: g.tip_at, home: g.home as TeamCode, away: g.away as TeamCode }));

  const teams = [...new Set(games.flatMap((g) => [g.home, g.away]))];
  const rosters = (await Promise.all(teams.map((t) => fetchRoster(t).catch(() => [])))).flat();

  const db = createServiceClient();
  const ids = rosters.map((p) => p.person_id);
  const lines: Array<{ person_id: number; played: boolean; pts: number; reb: number; ast: number; fg3m: number; game_id: string }> = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db
      .from("nba_player_games")
      .select("person_id, played, pts, reb, ast, fg3m, game_id")
      .in("person_id", ids.slice(i, i + 200))
      .eq("played", true);
    lines.push(...((data ?? []) as typeof lines));
  }
  const { data: done } = await db.from("nba_games").select("game_id, tip_at, home, away, home_score, away_score").eq("status", 3);
  const order = new Map((done ?? []).map((g) => [g.game_id, g.tip_at as string]));

  const players = new Map<number, PlayerInfo>();
  for (const p of rosters) {
    const mine = lines
      .filter((l) => Number(l.person_id) === p.person_id)
      .sort((a, b) => (order.get(b.game_id) ?? "").localeCompare(order.get(a.game_id) ?? ""));
    const gp = mine.length;
    const avg = (k: "pts" | "reb" | "ast" | "fg3m") => (gp ? r1(mine.reduce((s, l) => s + l[k], 0) / gp) : 0);
    const last = mine.slice(0, 5);
    players.set(p.person_id, {
      ...p,
      gp,
      pts: avg("pts"),
      reb: avg("reb"),
      ast: avg("ast"),
      fg3m: avg("fg3m"),
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
  return { week, games, players, records, favorites: { teams: s.fav_teams, players: s.fav_players } };
}

function contextText(ctx: SlateContext, avoid: string[]): string {
  const rec = (t: TeamCode) => {
    const r = ctx.records.get(t);
    return r ? `${r.w}-${r.l}` : "0-0";
  };
  const games = ctx.games
    .map((g) => `${g.game_id} | ${tipLabel(g.tip_at)} PT | ${g.away} (${rec(g.away)}) at ${g.home} (${rec(g.home)})`)
    .join("\n");
  const byTeam = new Map<TeamCode, PlayerInfo[]>();
  for (const p of ctx.players.values()) byTeam.set(p.team, [...(byTeam.get(p.team) ?? []), p]);
  const rosters = [...byTeam.entries()]
    .map(([team, ps]) => {
      const top = ps
        .filter((p) => !p.injured)
        .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name))
        .slice(0, 9)
        .map((p) =>
          p.gp
            ? `${p.person_id} ${p.name} ${p.position}: ${p.gp}gp ${p.pts}pts ${p.reb}reb ${p.ast}ast ${p.fg3m}3pm${p.last5 !== null ? ` last5 ${p.last5}pts` : ""}`
            : `${p.person_id} ${p.name} ${p.position}: no games yet`,
        )
        .join("\n  ");
      return `${team} ${TEAMS[team].city} ${TEAMS[team].name}:\n  ${top}`;
    })
    .join("\n");
  return `WEEK ${ctx.week.week_number} (${ctx.week.starts_on} to ${ctx.week.ends_on}).

GAMES (id | tip | matchup with records):
${games}

ROSTERS (person_id name position: season averages). Injured players are left out.
${rosters}

JAIYE'S FAVORITE TEAMS: ${ctx.favorites.teams.join(", ") || "none"}
JAIYE'S FAVORITE PLAYERS: ${ctx.favorites.players.join(", ") || "none"}

AVOID REPEATING THESE (recent prompts):
${avoid.join("\n") || "none"}`;
}

const SYSTEM = `You build the weekly slate for the Sobo Sportsbook, a no-money NBA pick'em between Jaiye and his dad Remi (plus friends). Always call them Jaiye and Remi. Make it fun, varied and fair, like the best prop menus on real betting apps, but kid friendly.

Item types you can use:
- winner: who wins a game. Needs game_id.
- spread: does "team" win by more than "line"? Use the favorite. Needs game_id, team, line.
- total: game total points over/under "line". Needs game_id, line.
- team_total: one team's points over/under "line". Needs game_id, team, line.
- player_ou: a player's stat over/under "line". Needs game_id, player (person_id, name, team), stat, line.
- h2h: which of two players gets more of a stat. Needs players (2, each with person_id, name, team, game_id), stat. Pick two stars with similar averages.
- yes_no: needs game_id, player, check ("triple_double", "double_double", or "at_least" with stat and threshold). Make it about 30 to 50 percent likely.
- margin: how much does "team" (the favorite) win by: 1 to 5, 6 to 10, 11+, or does the other team win. Needs game_id, team.
- week_wins: how many games "team" wins this week. Needs team (one with 3 or more games this week).
- weekly_leader: which of 4 players has the biggest single game this week in "stat". Needs candidates (4, with person_id, name, team) and stat.
- closest: guess a number, closest wins. Needs game_id, measure ("total_points", "total_3s", or "team_points" with team).
- upset: pick one underdog to win outright. Needs upset_picks: 3 underdogs from different games on the SAME day, each {team, game_id}.

Rules:
- Use ONLY game ids, teams and person_ids from the data. Never invent a player. A player must play in the game you attach them to.
- Lines come from the numbers: player lines near their season or last 5 average, spreads from records and home court (about 2.5 points), totals around 215 to 235 unless the data says otherwise. Every line ends in .5.
- Early in the season (players with no games yet) lean on winner, h2h, week_wins and weekly_leader, and set player lines from what you know about last season.
- Spread items across different days of the week so there is something to watch most nights.
- Feature Jaiye's favorite teams and players when they play, but not every item.
- prompt: the question on the card, short and punchy, no more than 90 characters.
- note: one fun line on why it's interesting, no more than 120 characters. Kid friendly, no gambling talk about money.
- Never use em dashes or en dashes.`;

const PlayerSchema = z.object({ person_id: z.number(), name: z.string(), team: z.string(), game_id: z.string().optional() });

const AiItem = z.object({
  type: z.enum(["winner", "spread", "total", "team_total", "player_ou", "h2h", "yes_no", "margin", "week_wins", "weekly_leader", "closest", "upset"]),
  prompt: z.string(),
  note: z.string(),
  game_id: z.string().optional(),
  team: z.string().optional(),
  line: z.number().optional(),
  stat: z.enum(["pts", "reb", "ast", "fg3m", "stl", "blk"]).optional(),
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

export function toDraftItem(ai: AiItem, ctx: SlateContext): DraftItem | null {
  const base = {
    type: ai.type as ItemType,
    prompt: ai.prompt.trim().slice(0, 140),
    note: ai.note?.trim().slice(0, 200) || null,
    points: DEFAULT_POINTS[ai.type],
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
  const stat: StatKey = ai.stat ?? "pts";

  switch (ai.type) {
    case "winner": {
      const g = gameOf(ctx, ai.game_id);
      if (!g) return null;
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
    case "h2h": {
      const ps = (ai.players ?? []).slice(0, 2).map((p) => {
        const pl = realPlayer(ctx, p);
        const g = pl ? gameForPlayer(ctx, pl, p.game_id) : null;
        return pl && g ? { pl, g } : null;
      });
      if (ps.length !== 2 || !ps[0] || !ps[1] || ps[0].pl.person_id === ps[1].pl.person_id) return null;
      const [a, b] = ps as Array<{ pl: PlayerInfo; g: Game }>;
      return {
        ...base,
        options: [
          { key: "a", label: a.pl.name, team: a.pl.team },
          { key: "b", label: b.pl.name, team: b.pl.team },
        ],
        spec: { type: "h2h", players: [ref(a.pl, a.g), ref(b.pl, b.g)], stat },
        locks_at: a.g.tip_at < b.g.tip_at ? a.g.tip_at : b.g.tip_at,
      };
    }
    case "yes_no": {
      const pl = realPlayer(ctx, ai.player);
      if (!pl) return null;
      const g = gameForPlayer(ctx, pl, ai.game_id ?? ai.player?.game_id);
      if (!g) return null;
      const check = ai.check ?? "double_double";
      if (check === "at_least" && (!ai.stat || typeof ai.threshold !== "number")) return null;
      return {
        ...base,
        options: yesNo,
        spec: { type: "yes_no", player: ref(pl, g), check, stat: ai.stat, threshold: ai.threshold },
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

/** Drafts a full slate. Throws if the AI can't produce at least 8 valid items. */
export async function draftSlate(ctx: SlateContext, avoid: string[] = []): Promise<DraftItem[]> {
  if (ctx.games.length === 0) throw new Error("No upcoming games this week.");
  // Structured output rejects array length rules, so counts are checked in code below.
  const schema = z.object({ items: z.array(AiItem) });
  const out = await askModel(
    schema,
    SYSTEM,
    `${contextText(ctx, avoid)}

Build this week's slate: 11 or 12 items, at least 6 different types, exactly one "upset". Order them by when they lock.`,
  );
  const items = out.items.map((a) => toDraftItem(a, ctx)).filter((i): i is DraftItem => i !== null);
  const upsets = items.filter((i) => i.type === "upset");
  const cleaned = items.filter((i) => i.type !== "upset" || i === upsets[0]).slice(0, 12);
  if (cleaned.length < 8) throw new Error(`Only ${cleaned.length} usable picks came back. Try again.`);
  return cleaned.sort((a, b) => a.locks_at.localeCompare(b.locks_at));
}

/** One replacement item, optionally of a given type. */
export async function draftOne(ctx: SlateContext, avoid: string[], type?: ItemType): Promise<DraftItem> {
  const schema = z.object({ items: z.array(AiItem) });
  const want = type && type !== "custom" ? `of type "${type}" (${ITEM_TYPE_LABEL[type]})` : "of a type that isn't already overused in the avoid list";
  const out = await askModel(
    schema,
    SYSTEM,
    `${contextText(ctx, avoid)}

Write 3 alternative items ${want}. Each must be different from everything in the avoid list.`,
  );
  const items = out.items.map((a) => toDraftItem(a, ctx)).filter((i): i is DraftItem => i !== null);
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
        system: `You write the Monday recap for the Sobo Sportsbook, a no-money NBA pick'em between Jaiye and his dad Remi, plus friends. Always call them Jaiye and Remi, never Dad. Sound like a fun sports radio host. 4 to 6 short sentences: who won the week and by how much, the best call, the worst miss, one fun stat, and a line hyping next week. Name challengers only if one of them won. Kid friendly, no money talk. Plain text, no markdown, no em dashes or en dashes.`,
        prompt,
      });
      return text.trim().replace(/[\u2013\u2014]/g, ",");
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export function statLabel(s: StatKey) {
  return STAT_LABEL[s];
}
