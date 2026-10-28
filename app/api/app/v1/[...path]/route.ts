import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { ActionError, savePick, submitPicks } from "@/lib/sportsbook/actions";
import { toggleReaction, isReactionKey } from "@/lib/sportsbook/fans";
import {
  HEADLINE,
  archiveLeague,
  createLeague,
  getLeague,
  getLeagueByCode,
  isMember,
  joinLeague,
  leaveLeague,
  memberIds,
  myLeagues,
  removeMember,
  renameLeague,
} from "@/lib/sportsbook/leagues";
import { overLimit } from "@/lib/sportsbook/limits";
import { challengerByCode, checkDisplayName, createChallenger, isAgeBand } from "@/lib/sportsbook/players";
import { rivalRecord, topRivals } from "@/lib/sportsbook/rivals";
import { deleteAccount, deleteTalk, fileReport, isReportContext, mutedBy, playerFlags, postTalk, setMute } from "@/lib/sportsbook/safety";
import { scheduleLiveSync } from "@/lib/sportsbook/live";
import { bearerToken, createSession, playerForToken, revokeSession } from "@/lib/sportsbook/sessions";
import { TALK_KEYS, TALK_LINES } from "@/lib/sportsbook/talk";
import { featuredWeekNumber, loadWeekView } from "@/lib/sportsbook/view";
import { getPicks, getWeek, listWeeks } from "@/lib/sportsbook/data";
import {
  apiLeague,
  apiLeagues,
  apiPlayer,
  apiResults,
  apiRival,
  apiRivals,
  apiWeek,
  appVisitor,
  loadPlayer,
  loadRivalData,
  seasonBoardFor,
  weekBoardFor,
  type PlayerRow,
} from "@/lib/app-api/server";
import type {
  ApiLeagueDetail,
  ApiLeagueMember,
  InviteResponse,
  MeResponse,
  RecapResponse,
  SessionResponse,
  TalkLinesResponse,
} from "@/lib/app-api/types";
import { SB_SEASON } from "@/lib/sportsbook/weeks";

/**
 * The iPhone app's API. One handler so every route shares auth, errors and
 * logging. Shapes live in lib/app-api/types.ts; docs/RUN-IT-BACK-APP-SPEC.md
 * section 3.3 lists the routes.
 */

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };
type Body = Record<string, unknown>;

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
const ok = () => json({ ok: true });

async function body(req: Request): Promise<Body> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Body) : {};
  } catch {
    return {};
  }
}

async function auth(req: Request): Promise<PlayerRow> {
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, "Sign in first.");
  const id = await playerForToken(token);
  if (!id) throw new HttpError(401, "Your sign in expired. Sign in again with your player code.");
  const p = await loadPlayer(id);
  if (!p || p.deleted_at) throw new HttpError(401, "Sign in first.");
  return p;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const uuid = (v: unknown) => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : "");

async function weekNumber(raw: string | undefined): Promise<number> {
  if (raw && /^\d{1,2}$/.test(raw)) return Number(raw);
  const n = await featuredWeekNumber();
  if (!n) throw new HttpError(404, "No week is published yet.");
  return n;
}

async function leagueFor(me: PlayerRow, id: string) {
  if (!id || id === HEADLINE) return null;
  const league = await getLeague(id);
  if (!league || !(await isMember(league.id, me.id))) throw new HttpError(404, "League not found.");
  return league;
}

/**
 * Grade live picks for app-only players, the way web page renders do. Fire and
 * forget: scheduleLiveSync runs after the response and is throttled by a
 * 10 minute DB slot in lib/sportsbook/live.ts, so this is safe on every read.
 * It must never be able to break a request, hence the catch.
 */
function kickLiveSync() {
  try {
    scheduleLiveSync();
  } catch (e) {
    console.error(JSON.stringify({ scope: "app.v1.live_sync", err: String(e) }));
  }
}

async function handle(method: string, path: string[], req: Request): Promise<Response> {
  const [a, b, c, d] = path;
  const route = `${method} /${path.map((p, i) => (i > 0 && /^[0-9a-f-]{36}$/i.test(p) ? ":id" : p)).join("/")}`;

  switch (true) {
    /* Sessions */
    case route === "POST /session/join": {
      const bd = await body(req);
      const check = checkDisplayName(bd.name);
      if (!check.ok) throw new HttpError(400, check.error);
      if (!isAgeBand(bd.age_band)) throw new HttpError(400, "Tell us if you're 13 or older.");
      if (await overLimit(req, "join")) throw new HttpError(429, "Too many new players from here. Try later.");
      const { id } = await createChallenger(check.name, bd.age_band);
      const token = await createSession(id);
      const p = (await loadPlayer(id))!;
      return json({ token, player: apiPlayer(p) } satisfies SessionResponse, 201);
    }
    case route === "POST /session/restore": {
      const bd = await body(req);
      if (await overLimit(req, "restore")) throw new HttpError(429, "Too many tries. Wait a bit.");
      const id = await challengerByCode(str(bd.code));
      if (!id) throw new HttpError(404, "No player with that code.");
      const token = await createSession(id);
      const p = (await loadPlayer(id))!;
      return json({ token, player: apiPlayer(p) } satisfies SessionResponse);
    }
    case route === "DELETE /session": {
      const token = bearerToken(req);
      if (token) await revokeSession(token);
      return ok();
    }

    /* Public */
    case method === "GET" && a === "invite" && !!b: {
      const league = await getLeagueByCode(b);
      if (!league) throw new HttpError(404, "That invite doesn't work anymore.");
      // ?from= used to resolve a player code to a name, which let anyone test codes for free. Codes are login credentials; inviter attribution needs a non-secret id first.
      const inviter: InviteResponse["inviter"] = null;
      // A hidden (reported) commissioner's league name could be the thing that got them hidden, so don't show it to strangers.
      const commissioner = await playerFlags(league.commissioner_id);
      const name = !commissioner || commissioner.hidden ? "A private league" : league.name;
      return json({ league: { name, code: league.code, members: (await memberIds(league.id)).length }, inviter, week: await featuredWeekNumber() } satisfies InviteResponse);
    }
    case route === "GET /talk/lines":
      return json({ lines: TALK_KEYS.map((k) => ({ key: k, text: TALK_LINES[k] })) } satisfies TalkLinesResponse);
  }

  /* Everything below needs a signed in player. */
  const me = await auth(req);

  // Reads that show results or standings: week, board, results, a league.
  if (method === "GET" && (a === "week" || a === "board" || a === "results" || route === "GET /leagues/:id")) kickLiveSync();

  switch (true) {
    case route === "GET /me":
      return json({ player: apiPlayer(me), leagues: await apiLeagues(me), season: SB_SEASON, muted: [...(await mutedBy(me.id))] } satisfies MeResponse);
    case route === "PATCH /me": {
      const bd = await body(req);
      const patch: Record<string, unknown> = {};
      if (bd.display_name !== undefined) {
        if (await overLimit(req, "name")) throw new HttpError(429, "Slow down a little.");
        const check = checkDisplayName(bd.display_name);
        if (!check.ok) throw new HttpError(400, check.error);
        patch.display_name = check.name;
      }
      // Accounts made before the age question can answer it once. Anyone who already has an answer keeps it.
      let ageBand = me.age_band;
      if (me.age_band === null && isAgeBand(bd.age_band)) {
        ageBand = bd.age_band;
        patch.age_band = bd.age_band;
        if (bd.age_band !== "13_plus") patch.push_token = null;
      }
      if (bd.push_token !== undefined) {
        if (bd.push_token === null) patch.push_token = null;
        else if (ageBand !== "13_plus") patch.push_token = null;
        else if (/^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$/.test(str(bd.push_token))) patch.push_token = bd.push_token;
        else throw new HttpError(400, "That push token doesn't look right.");
      }
      if (bd.push_enabled && typeof bd.push_enabled === "object") {
        const cur = apiPlayer(me).push_enabled;
        const next = { ...cur };
        for (const k of ["lock", "reveal", "graded", "recap"] as const) {
          const v = (bd.push_enabled as Record<string, unknown>)[k];
          if (typeof v === "boolean") next[k] = v;
        }
        patch.push_enabled = next;
      }
      if (Object.keys(patch).length) {
        const { error } = await createServiceClient().from("sb_players").update(patch).eq("id", me.id);
        if (error) throw error;
      }
      const p = (await loadPlayer(me.id))!;
      return json({ player: apiPlayer(p), leagues: await apiLeagues(p), season: SB_SEASON, muted: [...(await mutedBy(p.id))] } satisfies MeResponse);
    }
    case route === "DELETE /me":
      await deleteAccount(me.id);
      return ok();

    /* Weeks and picks */
    case method === "GET" && a === "week": {
      // /week/current or /week/{season}/{n}
      const n = await weekNumber(b === "current" ? undefined : c);
      if (b !== "current" && b !== SB_SEASON) throw new HttpError(404, "Week not found.");
      const w = await apiWeek(n, me.id);
      if (!w) throw new HttpError(404, "Week not found.");
      return json(w);
    }
    case route === "POST /picks": {
      if (await overLimit(req, "pick")) throw new HttpError(429, "Slow down a little.");
      const bd = await body(req);
      await savePick(uuid(bd.item_id), me.id, {
        choice: bd.choice === null ? null : typeof bd.choice === "string" ? bd.choice : undefined,
        guess: bd.guess === null ? null : typeof bd.guess === "number" ? bd.guess : undefined,
        is_lock: typeof bd.is_lock === "boolean" ? bd.is_lock : undefined,
      });
      return ok();
    }
    case route === "POST /picks/submit": {
      const bd = await body(req);
      const n = typeof bd.week === "number" ? bd.week : 0;
      if (!n) throw new HttpError(400, "Which week?");
      await submitPicks(n, me.id);
      return ok();
    }

    /* Boards */
    case route === "GET /board": {
      const url = new URL(req.url);
      const league = await leagueFor(me, url.searchParams.get("league") ?? HEADLINE);
      if (url.searchParams.get("span") === "season") return json(await seasonBoardFor(me.id, league));
      const n = await weekNumber(url.searchParams.get("week") ?? undefined);
      const view = await loadWeekView(n, { viewerId: me.id });
      if (!view) throw new HttpError(404, "Week not found.");
      return json(await weekBoardFor(view, me.id, league));
    }

    /* Leagues */
    case route === "GET /leagues":
      return json({ leagues: await apiLeagues(me) });
    case route === "POST /leagues": {
      const bd = await body(req);
      if (await overLimit(req, "league")) throw new HttpError(429, "Too many leagues from here. Try later.");
      const league = await createLeague(me.id, bd.name);
      const withCount = (await myLeagues(me.id)).find((l) => l.id === league.id)!;
      return json({ league: apiLeague(withCount, me) }, 201);
    }
    case route === "POST /leagues/join": {
      const bd = await body(req);
      if (await overLimit(req, "league_join")) throw new HttpError(429, "Too many tries. Wait a bit.");
      const inviter = str(bd.from) ? await challengerByCode(str(bd.from)) : null;
      const league = await joinLeague(me.id, str(bd.code), inviter);
      const withCount = (await myLeagues(me.id)).find((l) => l.id === league.id)!;
      return json({ league: apiLeague(withCount, me) });
    }
    case route === "GET /leagues/:id": {
      const league = await leagueFor(me, b);
      if (!league) throw new HttpError(404, "League not found.");
      const withCount = (await myLeagues(me.id)).find((l) => l.id === league.id)!;
      const n = await featuredWeekNumber();
      const view = n ? await loadWeekView(n, { viewerId: me.id }) : null;
      const ids = await memberIds(league.id);
      const isComm = league.commissioner_id === me.id;
      let pickedIds = new Set<string>();
      if (isComm && view) {
        const all = await getPicks(view.items.map((i) => i.id));
        pickedIds = new Set(all.filter((p) => p.choice !== null || p.guess !== null).map((p) => p.player_id));
      }
      const { data: ps } = await createServiceClient().from("sb_players").select("id, display_name, hidden").in("id", ids);
      const names = new Map((ps ?? []).map((p) => [p.id as string, p.hidden && p.id !== me.id ? "Player" : (p.display_name as string)]));
      const members: ApiLeagueMember[] = ids.map((id) => ({
        player_id: id,
        display_name: names.get(id) ?? "Player",
        is_commissioner: id === league.commissioner_id,
        picked_this_week: isComm && view?.week.status === "open" ? pickedIds.has(id) : null,
      }));
      return json({
        league: apiLeague(withCount, me),
        week: view ? await weekBoardFor(view, me.id, league) : null,
        season: await seasonBoardFor(me.id, league),
        members,
      } satisfies ApiLeagueDetail);
    }
    case route === "PATCH /leagues/:id": {
      if (await overLimit(req, "name")) throw new HttpError(429, "Slow down a little.");
      const bd = await body(req);
      await renameLeague(me.id, b, bd.name);
      return ok();
    }
    case route === "DELETE /leagues/:id":
      await archiveLeague(me.id, b);
      return ok();
    case route === "POST /leagues/:id/leave":
      await leaveLeague(me.id, b);
      return ok();
    case route === "DELETE /leagues/:id/members/:id":
      await removeMember(me.id, b, d);
      return ok();
    case route === "POST /leagues/:id/nudge": {
      const league = await leagueFor(me, b);
      if (!league || league.commissioner_id !== me.id) throw new HttpError(403, "Only the commissioner can nudge.");
      // Push alerts ship in Phase 3. Until then a nudge sends nothing.
      return json({ ok: true, sent: 0 });
    }

    /* Rivals */
    case route === "GET /rivals":
      return json({ rivals: await apiRivals(me.id) });
    case route === "GET /rivals/:id": {
      const { totals, players, mates } = await loadRivalData(me.id);
      const them = players.find((p) => p.id === b && (!p.hidden || p.kind !== "challenger"));
      if (!them || them.id === me.id) throw new HttpError(404, "Player not found.");
      const listed = topRivals(totals, me.id, players, mates, 1000).find((r) => r.player.id === them.id);
      const rival = listed ?? { player: them, record: rivalRecord(totals, me.id, them.id), sharedLeague: mates.has(them.id) };
      return json({ rival: apiRival(rival), weeks: rival.record.weeks });
    }

    /* Monday results */
    case method === "GET" && a === "results": {
      // /results/current is the latest graded or final week; /results/{season}/{n} is a specific one.
      let n: number;
      if (b === "current" || !b) {
        const done = (await listWeeks()).filter((w) => w.status === "graded" || w.status === "final").sort((x, y) => y.week_number - x.week_number)[0];
        if (!done) throw new HttpError(404, "Results show up once the first week is graded.");
        n = done.week_number;
      } else n = await weekNumber(c);
      const r = await apiResults(n, me.id);
      if (!r) throw new HttpError(404, "Results show up once the week is graded.");
      return json(r);
    }
    case route === "GET /recap/current": {
      const n = await featuredWeekNumber();
      let week = n ? await getWeek(n) : null;
      if (week && !week.recap && n && n > 1) week = await getWeek(n - 1);
      return json({ week: week?.week_number ?? null, text: week?.recap ?? null, audio_url: null } satisfies RecapResponse);
    }

    /* Talk, reactions, safety */
    case route === "POST /talk": {
      if (await overLimit(req, "talk")) throw new HttpError(429, "Slow down a little.");
      const bd = await body(req);
      if (bd.key === null) await deleteTalk(me.id, uuid(bd.item_id));
      else await postTalk(me.id, uuid(bd.item_id), bd.key);
      return ok();
    }
    case route === "POST /react": {
      if (await overLimit(req, "react")) throw new HttpError(429, "Slow down a little.");
      const bd = await body(req);
      if (!isReactionKey(bd.emoji)) throw new HttpError(400, "Pick a reaction.");
      try {
        await toggleReaction(uuid(bd.item_id), uuid(bd.player_id), bd.emoji, appVisitor(me.id));
      } catch {
        throw new HttpError(400, "You can react once picks are revealed.");
      }
      return ok();
    }
    case route === "POST /report": {
      const bd = await body(req);
      if (!isReportContext(bd.context)) throw new HttpError(400, "What are you reporting?");
      if (await overLimit(req, "report")) throw new HttpError(429, "Too many reports. Wait a bit.");
      await fileReport(me.id, uuid(bd.player_id), bd.context, uuid(bd.ref_id) || null);
      return ok();
    }
    case route === "POST /mute": {
      if (await overLimit(req, "mute")) throw new HttpError(429, "Slow down a little.");
      const bd = await body(req);
      await setMute(me.id, uuid(bd.player_id), bd.muted !== false);
      return ok();
    }
  }
  throw new HttpError(404, "Not found.");
}

async function run(method: string, req: Request, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  try {
    return await handle(method, path, req);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof ActionError) return json({ error: e.message }, 400);
    console.error(JSON.stringify({ scope: "app.v1", method, path: path.join("/"), err: String(e) }));
    return json({ error: "Something went wrong." }, 500);
  }
}

export const GET = (req: Request, ctx: Ctx) => run("GET", req, ctx);
export const POST = (req: Request, ctx: Ctx) => run("POST", req, ctx);
export const PATCH = (req: Request, ctx: Ctx) => run("PATCH", req, ctx);
export const DELETE = (req: Request, ctx: Ctx) => run("DELETE", req, ctx);
