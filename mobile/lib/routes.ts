// Typed route helpers for /api/app/v1. The server-side types are imported
// through the @shared alias (../lib/app-api/types.ts), so a request and
// response shape only needs to be written once.
import type {
  ApiBoard,
  ApiLeague,
  ApiLeagueDetail,
  ApiOk,
  ApiWeek,
  CreateLeagueRequest,
  JoinLeagueRequest,
  JoinRequest,
  LeaguePatch,
  MePatch,
  MeResponse,
  MuteRequest,
  PickRequest,
  RecapResponse,
  ReportRequest,
  RestoreRequest,
  SessionResponse,
  SubmitRequest,
  TalkLinesResponse,
  TalkRequest,
} from "@shared/types";
import { appApi, setToken } from "@/lib/api";

export type { ApiOk, ApiWeek, MeResponse, SessionResponse, TalkLinesResponse };

/** POST /session/join — fresh account from name + age. Stores the token. */
export async function joinSession(req: JoinRequest): Promise<SessionResponse> {
  const res = await appApi<SessionResponse>("/session/join", { method: "POST", body: req, anonymous: true });
  await setToken(res.token);
  return res;
}

/** POST /session/restore — bring an existing account onto this phone with its code. */
export async function restoreSession(req: RestoreRequest): Promise<SessionResponse> {
  const res = await appApi<SessionResponse>("/session/restore", { method: "POST", body: req, anonymous: true });
  await setToken(res.token);
  return res;
}

/** DELETE /session — revoke this phone's token server-side. Call before clearing it locally. */
export function signOut(): Promise<ApiOk> {
  return appApi<ApiOk>("/session", { method: "DELETE" });
}

/** GET /me — current player, their leagues, the active season. 401 if signed out. */
export function getMe(signal?: AbortSignal): Promise<MeResponse> {
  return appApi<MeResponse>("/me", { signal });
}

/** PATCH /me — change name, push settings, or push token. Returns the fresh /me payload. */
export function patchMe(req: MePatch): Promise<MeResponse> {
  return appApi<MeResponse>("/me", { method: "PATCH", body: req });
}

/** DELETE /me — delete the account. */
export function deleteMe(): Promise<ApiOk> {
  return appApi<ApiOk>("/me", { method: "DELETE" });
}

/** GET /week/current — this week's slate with the viewer's picks + scoreboard. 401 if signed out. */
export function getCurrentWeek(signal?: AbortSignal): Promise<ApiWeek> {
  return appApi<ApiWeek>("/week/current", { signal });
}

/** GET /recap/current — Jaiye's recap for this week, or last week's while this one is still being written. */
export function getRecap(signal?: AbortSignal): Promise<RecapResponse> {
  return appApi<RecapResponse>("/recap/current", { signal });
}

/** GET /board — the Beat Jaiye & Remi board. Omit league for the headline board, omit week for the current one. */
export function getBoard(
  q: { span: "week" | "season"; week?: number; league?: string },
  signal?: AbortSignal,
): Promise<ApiBoard> {
  const params = new URLSearchParams({ span: q.span });
  if (q.week !== undefined) params.set("week", String(q.week));
  if (q.league !== undefined) params.set("league", q.league);
  return appApi<ApiBoard>(`/board?${params.toString()}`, { signal });
}

/** GET /talk/lines — the preset trash-talk list. Public, no auth needed. */
export function getTalkLines(signal?: AbortSignal): Promise<TalkLinesResponse> {
  return appApi<TalkLinesResponse>("/talk/lines", { anonymous: true, signal });
}

/**
 * POST /picks — save or clear one pick. `undefined` leaves a field alone;
 * `null` clears it. Returns {ok:true} on success; 400 for closed/locked
 * weeks or invalid options.
 */
export function savePick(req: PickRequest): Promise<ApiOk> {
  return appApi<ApiOk>("/picks", { method: "POST", body: req });
}

/** POST /picks/submit — lock in every pick for the week. */
export function submitPicks(req: SubmitRequest): Promise<ApiOk> {
  return appApi<ApiOk>("/picks/submit", { method: "POST", body: req });
}

/** POST /talk — set or clear my preset line on a locked item. key null removes it. */
export function postTalk(req: TalkRequest): Promise<ApiOk> {
  return appApi<ApiOk>("/talk", { method: "POST", body: req });
}

/** POST /report — flag a player's name, a talk line, or a league name. 429 when rate-limited. */
export function reportPlayer(req: ReportRequest): Promise<ApiOk> {
  return appApi<ApiOk>("/report", { method: "POST", body: req });
}

/** POST /mute — hide (or unhide) a player's name and talk lines for the viewer. */
export function mutePlayer(req: MuteRequest): Promise<ApiOk> {
  return appApi<ApiOk>("/mute", { method: "POST", body: req });
}

/** GET /leagues — leagues the viewer belongs to. */
export function getLeagues(signal?: AbortSignal): Promise<{ leagues: ApiLeague[] }> {
  return appApi<{ leagues: ApiLeague[] }>("/leagues", { signal });
}

/** POST /leagues — start a league. Needs the Season Pass; 400 with a message otherwise. */
export function createLeague(req: CreateLeagueRequest): Promise<{ league: ApiLeague }> {
  return appApi<{ league: ApiLeague }>("/leagues", { method: "POST", body: req });
}

/** POST /leagues/join — join with a league code like WORD-1234. */
export function joinLeague(req: JoinLeagueRequest): Promise<{ league: ApiLeague }> {
  return appApi<{ league: ApiLeague }>("/leagues/join", { method: "POST", body: req });
}

/** GET /leagues/:id — league, its week and season boards, and members. */
export function getLeague(id: string, signal?: AbortSignal): Promise<ApiLeagueDetail> {
  return appApi<ApiLeagueDetail>(`/leagues/${encodeURIComponent(id)}`, { signal });
}

/** PATCH /leagues/:id — rename. Commissioner only. */
export function renameLeague(id: string, req: LeaguePatch): Promise<ApiOk> {
  return appApi<ApiOk>(`/leagues/${encodeURIComponent(id)}`, { method: "PATCH", body: req });
}

/** DELETE /leagues/:id — archive for everyone. Commissioner only. */
export function archiveLeague(id: string): Promise<ApiOk> {
  return appApi<ApiOk>(`/leagues/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** POST /leagues/:id/leave — members only; commissioners get a 400. */
export function leaveLeague(id: string): Promise<ApiOk> {
  return appApi<ApiOk>(`/leagues/${encodeURIComponent(id)}/leave`, { method: "POST" });
}

/** DELETE /leagues/:id/members/:playerId — remove a member. Commissioner only. */
export function removeMember(id: string, playerId: string): Promise<ApiOk> {
  return appApi<ApiOk>(`/leagues/${encodeURIComponent(id)}/members/${encodeURIComponent(playerId)}`, {
    method: "DELETE",
  });
}
