// Typed route helpers for /api/app/v1. The server-side types are imported
// through the @shared alias (../lib/app-api/types.ts), so a request and
// response shape only needs to be written once.
import type {
  ApiBoard,
  ApiOk,
  ApiWeek,
  JoinRequest,
  MeResponse,
  PickRequest,
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

/** GET /me — current player, their leagues, the active season. 401 if signed out. */
export function getMe(signal?: AbortSignal): Promise<MeResponse> {
  return appApi<MeResponse>("/me", { signal });
}

/** GET /week/current — this week's slate with the viewer's picks + scoreboard. 401 if signed out. */
export function getCurrentWeek(signal?: AbortSignal): Promise<ApiWeek> {
  return appApi<ApiWeek>("/week/current", { signal });
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
