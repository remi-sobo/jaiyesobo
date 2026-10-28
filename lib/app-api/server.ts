import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getItemsForWeeks, getPicks, getPlayers, listWeeks, seasonSummary, type Board } from "@/lib/sportsbook/data";
import { loadReactions, type ReactionMap } from "@/lib/sportsbook/fans";
import { pickPoints } from "@/lib/sportsbook/grade";
import { HEADLINE, HEADLINE_NAME, memberIds, myLeagues, type LeagueWithCount } from "@/lib/sportsbook/leagues";
import { housePickReactions } from "@/lib/sportsbook/reactions";
import { closestRival, topRivals, weekTotals, type Rival } from "@/lib/sportsbook/rivals";
import { canPostTalk, loadTalk, playerFlags } from "@/lib/sportsbook/safety";
import { ITEM_TYPE_LABEL, type SbItem, type SbPick, type SbPlayerWithCode, type SbWeek } from "@/lib/sportsbook/types";
import { loadWeekView, type WeekView } from "@/lib/sportsbook/view";
import { SB_SEASON, weekRangeLabel } from "@/lib/sportsbook/weeks";
import { rankAt } from "./rank";
import type {
  AgeBand,
  ApiBoard,
  ApiBoardRow,
  ApiCrowd,
  ApiHousePick,
  ApiItem,
  ApiLeague,
  ApiPlayer,
  ApiResults,
  ApiRival,
  ApiWeek,
  PushSettings,
} from "./types";

/**
 * Builders that turn the sportsbook data into app API shapes. Shared by the app
 * routes and the website so both show the same numbers.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jaiyesobo.com";

export type PlayerRow = SbPlayerWithCode & {
  age_band: AgeBand | null;
  has_pass: boolean;
  pass_season: string | null;
  push_enabled: PushSettings | null;
  deleted_at: string | null;
};

const PLAYER_COLS = "id, kind, display_name, code, hidden, age_band, has_pass, pass_season, push_enabled, deleted_at";

export async function loadPlayer(id: string): Promise<PlayerRow | null> {
  const { data } = await createServiceClient().from("sb_players").select(PLAYER_COLS).eq("id", id).maybeSingle();
  return (data as PlayerRow | null) ?? null;
}

const DEFAULT_PUSH: PushSettings = { lock: true, reveal: true, graded: true, recap: true };

export function apiPlayer(p: PlayerRow): ApiPlayer {
  return {
    id: p.id,
    display_name: p.display_name,
    code: p.code,
    kind: p.kind,
    age_band: p.age_band,
    has_pass: p.has_pass && p.pass_season === SB_SEASON,
    pass_season: p.pass_season,
    push_enabled: { ...DEFAULT_PUSH, ...(p.push_enabled ?? {}) },
    can_talk: canPostTalk({ id: p.id, kind: p.kind, age_band: p.age_band, deleted_at: p.deleted_at, hidden: p.hidden }),
  };
}

export function inviteUrl(code: string, fromCode?: string | null): string {
  return `${SITE}/runitback/l/${code}${fromCode ? `?from=${encodeURIComponent(fromCode)}` : ""}`;
}

export function apiLeague(l: LeagueWithCount, me: PlayerRow): ApiLeague {
  // No ?from=: the player code is a login credential, so it must never ride on a shareable link.
  return { id: l.id, name: l.name, code: l.code, members: l.members, is_commissioner: l.commissioner_id === me.id, invite_url: inviteUrl(l.code) };
}

export async function apiLeagues(me: PlayerRow): Promise<ApiLeague[]> {
  return (await myLeagues(me.id)).map((l) => apiLeague(l, me));
}

/** Stable anonymous id for reactions from the app, so one player is one reaction. */
export function appVisitor(playerId: string): string {
  return crypto.createHash("sha256").update(`app:${playerId}`).digest("hex").slice(0, 32);
}

/* Weeks */

function crowdFor(item: SbItem, picks: SbPick[]): ApiCrowd {
  const mine = picks.filter((p) => p.item_id === item.id && (p.choice !== null || p.guess !== null));
  const total = mine.length;
  if (item.type === "closest") {
    const gs = mine.map((p) => p.guess).filter((g): g is number => g !== null);
    return { total, split: {}, avg: gs.length ? Math.round((gs.reduce((a, b) => a + b, 0) / gs.length) * 10) / 10 : null };
  }
  const split: Record<string, number> = {};
  for (const o of item.options) {
    const n = mine.filter((p) => p.choice === o.key).length;
    split[o.key] = total ? Math.round((n / total) * 100) : 0;
  }
  return { total, split, avg: null };
}

function houseLine(picks: SbPick[], item: SbItem, playerId: string | undefined, locked: boolean, reactions: ReactionMap): ApiHousePick | null {
  if (!playerId) return null;
  const p = picks.find((x) => x.item_id === item.id && x.player_id === playerId);
  return p ? { choice: p.choice, guess: p.guess, is_lock: p.is_lock, talk: p.talk ?? null, ...housePickReactions(reactions, item.id, playerId, locked) } : null;
}

/** A week as the given player sees it. Pass meId null for a signed out view. */
export async function apiWeek(n: number, meId: string | null): Promise<ApiWeek | null> {
  const view = await loadWeekView(n, { viewerId: meId });
  if (!view) return null;
  return buildWeek(view, meId);
}

export async function buildWeek(view: WeekView, meId: string | null): Promise<ApiWeek> {
  const { week, items, picks, now } = view;
  const jaiye = view.players.find((p) => p.kind === "jaiye");
  const remi = view.players.find((p) => p.kind === "remi");
  const lockedIds = items.filter((i) => Date.parse(i.locks_at) <= now || week.status !== "open").map((i) => i.id);
  // Reaction counts for every locked item in one query. The viewer is matched by the same anonymous id POST /react writes.
  const [talk, reactions] = await Promise.all([loadTalk(lockedIds, meId), loadReactions(lockedIds, meId ? appVisitor(meId) : null)]);
  const names = new Map(view.players.map((p) => [p.id, p.display_name]));

  // Points need every pick (closest guess compares all of them), so load the full set.
  const all = await getPicks(items.map((i) => i.id));

  const apiItems: ApiItem[] = items.map((item) => {
    const locked = Date.parse(item.locks_at) <= now || week.status !== "open";
    const mine = meId ? all.find((p) => p.item_id === item.id && p.player_id === meId) : undefined;
    return {
      id: item.id,
      type: item.type,
      type_label: ITEM_TYPE_LABEL[item.type],
      prompt: item.prompt,
      note: item.note,
      points: item.points,
      options: item.options,
      locks_at: item.locks_at,
      locked,
      status: item.status,
      result: item.result,
      my_pick: mine ? { choice: mine.choice, guess: mine.guess, is_lock: mine.is_lock } : null,
      my_points: mine ? pickPoints(item, mine, all) : null,
      house: { jaiye: houseLine(picks, item, jaiye?.id, locked, reactions), remi: houseLine(picks, item, remi?.id, locked, reactions) },
      crowd: locked ? crowdFor(item, all) : null,
      talk: locked
        ? talk.filter((t) => t.item_id === item.id).map((t) => ({ player_id: t.player_id, display_name: names.get(t.player_id) ?? "Player", key: t.key, text: t.text }))
        : [],
    };
  });

  const board = view.board;
  const meRow = meId ? board.findIndex((b) => b.player.id === meId) : -1;
  const upcoming = items.filter((i) => Date.parse(i.locks_at) > now).map((i) => i.locks_at).sort();
  let closest: ApiWeek["closest_rival"] = null;
  if (meId) {
    const mates = new Set<string>();
    for (const l of await myLeagues(meId)) for (const id of await memberIds(l.id)) if (id !== meId) mates.add(id);
    const c = closestRival(board.map((b) => b.score), meId, mates);
    if (c) closest = { player_id: c.player_id, display_name: names.get(c.player_id) ?? "Player", gap: c.gap };
  }

  return {
    season: week.season,
    number: week.week_number,
    status: week.status,
    starts_on: week.starts_on,
    ends_on: week.ends_on,
    label: weekRangeLabel(week),
    submitted: !!meId && view.submitted.includes(meId),
    items: apiItems,
    scores: {
      me: meRow >= 0 ? board[meRow].score.points : meId ? 0 : null,
      jaiye: board.find((b) => b.player.kind === "jaiye")?.score.points ?? 0,
      remi: board.find((b) => b.player.kind === "remi")?.score.points ?? 0,
    },
    rank: meRow >= 0 ? { position: rankAt(board.map((b) => b.score.points), meRow), of: board.length } : null,
    next_lock_at: upcoming[0] ?? null,
    picked: apiItems.filter((i) => i.my_pick && (i.my_pick.choice !== null || i.my_pick.guess !== null)).length,
    recap: week.recap,
    closest_rival: closest,
  };
}


/* Boards */

function rowsFromWeek(board: Board[], meId: string | null, members: Set<string> | null): ApiBoardRow[] {
  const jaiye = board.find((b) => b.player.kind === "jaiye")?.score.points;
  const remi = board.find((b) => b.player.kind === "remi")?.score.points;
  const shown = board.filter((b) => !members || members.has(b.player.id) || b.player.kind !== "challenger");
  const memberPoints = shown.filter((b) => !members || members.has(b.player.id)).map((b) => b.score.points);
  return shown.map((b) => {
    const ghost = !!members && !members.has(b.player.id);
    return {
      player_id: b.player.id,
      display_name: b.player.display_name,
      kind: b.player.kind,
      rank: memberPoints.filter((p) => p > b.score.points).length + 1,
      points: b.score.points,
      correct: b.score.correct,
      wrong: b.score.wrong,
      weeks_won: 0,
      beat_jaiye: b.player.kind === "challenger" && jaiye !== undefined && b.score.points > jaiye,
      beat_remi: b.player.kind === "challenger" && remi !== undefined && b.score.points > remi,
      is_me: b.player.id === meId,
      ghost,
    };
  });
}

function headlineWeek(rows: ApiBoardRow[]): string {
  const players = rows.filter((r) => r.kind === "challenger" && !r.ghost);
  if (players.length === 0) return "Nobody's on the board yet. Be first.";
  const bj = players.filter((r) => r.beat_jaiye).length;
  const br = players.filter((r) => r.beat_remi).length;
  return `${bj} of ${players.length} ${players.length === 1 ? "player is" : "players are"} ahead of Jaiye this week. ${br} ahead of Remi.`;
}

export async function weekBoardFor(view: WeekView, meId: string | null, league: { id: string; name: string } | null): Promise<ApiBoard> {
  const members = league ? new Set(await memberIds(league.id)) : null;
  const rows = rowsFromWeek(view.board, meId, members);
  return {
    league: league ?? { id: HEADLINE, name: HEADLINE_NAME },
    span: "week",
    week: view.week.week_number,
    headline: headlineWeek(rows),
    rows,
    me: rows.find((r) => r.is_me) ?? null,
  };
}

export async function seasonBoardFor(meId: string | null, league: { id: string; name: string } | null): Promise<ApiBoard> {
  const weeks = await listWeeks();
  const finals = weeks.filter((w) => w.status === "final");
  const items = await getItemsForWeeks(finals.map((w) => w.id));
  const [picks, players] = await Promise.all([getPicks(items.map((i) => i.id)), getPlayers()]);
  const summary = seasonSummary(weeks, items, picks, players);
  const members = league ? new Set(await memberIds(league.id)) : null;
  const jaiye = summary.rows.find((r) => r.player.kind === "jaiye")?.points ?? 0;
  const remi = summary.rows.find((r) => r.player.kind === "remi")?.points ?? 0;
  const shown = summary.rows.filter((r) => !members || members.has(r.player.id) || r.player.kind !== "challenger");
  const memberPoints = shown.filter((r) => !members || members.has(r.player.id)).map((r) => r.points);
  const rows: ApiBoardRow[] = shown.map((r) => ({
    player_id: r.player.id,
    display_name: r.player.display_name,
    kind: r.player.kind,
    rank: memberPoints.filter((p) => p > r.points).length + 1,
    points: r.points,
    correct: r.weeksPlayed,
    wrong: 0,
    weeks_won: r.weeksWon,
    beat_jaiye: r.player.kind === "challenger" && r.points > jaiye,
    beat_remi: r.player.kind === "challenger" && r.points > remi,
    is_me: r.player.id === meId,
    ghost: !!members && !members.has(r.player.id),
  }));
  const ch = rows.filter((r) => r.kind === "challenger" && !r.ghost);
  const headline =
    finals.length === 0
      ? "Season standings start once Week 1 is final."
      : `${ch.filter((r) => r.beat_jaiye).length} of ${ch.length} ahead of Jaiye this season. ${ch.filter((r) => r.beat_remi).length} ahead of Remi.`;
  return {
    league: league ?? { id: HEADLINE, name: HEADLINE_NAME },
    span: "season",
    week: null,
    headline,
    rows,
    me: rows.find((r) => r.is_me) ?? null,
  };
}

/* Rivals */

export async function loadRivalData(meId: string) {
  const weeks = await listWeeks();
  const finals = weeks.filter((w) => w.status === "final");
  const items = await getItemsForWeeks(finals.map((w) => w.id));
  const [picks, players] = await Promise.all([getPicks(items.map((i) => i.id)), getPlayers()]);
  const mates = new Set<string>();
  for (const l of await myLeagues(meId)) for (const id of await memberIds(l.id)) if (id !== meId) mates.add(id);
  return { totals: weekTotals(weeks, items, picks), players, mates };
}

export function apiRival(r: Rival): ApiRival {
  return {
    player_id: r.player.id,
    display_name: r.player.display_name,
    kind: r.player.kind,
    wins: r.record.wins,
    losses: r.record.losses,
    ties: r.record.ties,
    streak: r.record.streak,
    shared_league: r.sharedLeague,
  };
}

export async function apiRivals(meId: string): Promise<ApiRival[]> {
  const { totals, players, mates } = await loadRivalData(meId);
  return topRivals(totals, meId, players, mates).map(apiRival);
}

/* Monday results */

export async function apiResults(n: number, meId: string): Promise<ApiResults | null> {
  const view = await loadWeekView(n, { viewerId: meId });
  if (!view || view.week.status === "draft" || view.week.status === "open") return null;
  const all = await getPicks(view.items.map((i) => i.id));
  const board = view.board;
  const jaiye = board.find((b) => b.player.kind === "jaiye")?.score.points ?? 0;
  const remi = board.find((b) => b.player.kind === "remi")?.score.points ?? 0;
  const me = board.find((b) => b.player.id === meId)?.score ?? null;
  const ch = board.filter((b) => b.player.kind === "challenger");
  const beatJ = ch.filter((b) => b.score.points > jaiye);
  const beatR = ch.filter((b) => b.score.points > remi);

  const myPicks = all.filter((p) => p.player_id === meId);
  const scored = myPicks
    .map((p) => {
      const item = view.items.find((i) => i.id === p.item_id);
      if (!item) return null;
      const pts = pickPoints(item, p, all);
      if (pts === null || item.status === "void") return null;
      const crowd = item.type === "closest" ? null : crowdFor(item, all).split[p.choice ?? ""] ?? null;
      return { item, pick: p, pts, crowd };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  const rights = scored.filter((s) => s.pts > 0).sort((a, b) => b.pts - a.pts || (a.crowd ?? 100) - (b.crowd ?? 100));
  const wrongs = scored.filter((s) => s.pts <= 0).sort((a, b) => a.pts - b.pts);
  const lock = scored.find((s) => s.pick.is_lock);

  // Rivals: how you did against each of your top rivals this week.
  const { totals, players, mates } = await loadRivalData(meId);
  const rivals = topRivals(totals, meId, players, mates, 6)
    .map((r) => {
      const them = board.find((b) => b.player.id === r.player.id)?.score.points;
      if (them === undefined || !me) return null;
      return { player_id: r.player.id, display_name: r.player.display_name, me: me.points, them, result: (me.points > them ? "W" : me.points < them ? "L" : "T") as "W" | "L" | "T" };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  // League ranks: season standings through this week vs through last week.
  const leagues: ApiResults["leagues"] = [];
  const myL = await myLeagues(meId);
  if (myL.length) {
    const weeks = await listWeeks();
    const through = (k: number) => weeks.filter((w) => w.week_number <= k).map((w) => (w.week_number === n ? { ...w, status: "final" as const } : w));
    const finalsNow = through(n).filter((w) => w.status === "final");
    const items = await getItemsForWeeks(finalsNow.map((w) => w.id));
    const picks = await getPicks(items.map((i) => i.id));
    const now = seasonSummary(through(n), items, picks, players);
    const before = seasonSummary(through(n - 1), items, picks, players);
    for (const l of myL) {
      const ids = new Set(await memberIds(l.id));
      const rankIn = (rows: typeof now.rows) => {
        const list = rows.filter((r) => ids.has(r.player.id));
        const i = list.findIndex((r) => r.player.id === meId);
        return i < 0 ? null : list.filter((r) => r.points > list[i].points).length + 1;
      };
      const r = rankIn(now.rows);
      if (r !== null) leagues.push({ id: l.id, name: l.name, rank: r, prev_rank: n > 1 ? rankIn(before.rows) : null, of: ids.size });
    }
  }

  return {
    week: n,
    status: view.week.status,
    scores: { me: me?.points ?? null, jaiye, remi },
    you_beat: { jaiye: !!me && me.points > jaiye, remi: !!me && me.points > remi },
    beat_jaiye: { count: beatJ.length, names: beatJ.slice(0, 5).map((b) => b.player.display_name) },
    beat_remi: { count: beatR.length, names: beatR.slice(0, 5).map((b) => b.player.display_name) },
    players: ch.length,
    record: { right: me?.correct ?? 0, wrong: me?.wrong ?? 0 },
    lock: lock ? { prompt: lock.item.prompt, hit: lock.pts > 0, points: lock.pts } : null,
    rivals,
    leagues,
    best_call: rights[0] ? { prompt: rights[0].item.prompt, points: rights[0].pts, crowd_pct: rights[0].crowd } : null,
    worst_miss: wrongs[0] ? { prompt: wrongs[0].item.prompt, points: wrongs[0].pts } : null,
  };
}

export async function canTalk(playerId: string): Promise<boolean> {
  return canPostTalk(await playerFlags(playerId));
}

export type { SbWeek };
