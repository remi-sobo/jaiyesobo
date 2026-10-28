/**
 * Run It Back Picks app API: every request and response shape.
 *
 * Shared by the server (app/api/app/v1) and the iPhone app (mobile/). Keep this
 * file free of Next.js, Supabase and Node imports so the app can import it.
 *
 * Base URL: https://jaiyesobo.com/api/app/v1
 * Auth: `Authorization: Bearer <token>` from /session/join or /session/restore.
 * Errors: non 2xx with { error: string } written for a person to read.
 */

export type ApiError = { error: string };
export type ApiOk = { ok: true };

export type AgeBand = "13_plus" | "under_13";
export type PlayerKind = "remi" | "jaiye" | "challenger";
export type WeekStatus = "draft" | "open" | "graded" | "final";
export type ItemStatus = "open" | "graded" | "void";

export type PushSettings = { lock: boolean; reveal: boolean; graded: boolean; recap: boolean };

export type ApiPlayer = {
  id: string;
  display_name: string;
  /** Player code, like HOOP-7342. Restores the account on another device or on the website. */
  code: string | null;
  kind: PlayerKind;
  age_band: AgeBand | null;
  has_pass: boolean;
  pass_season: string | null;
  push_enabled: PushSettings;
  /** Players who haven't confirmed they're 13 or older can't post trash talk or create leagues, and get no push alerts. */
  can_talk: boolean;
};

/* Sessions */

export type JoinRequest = { name: string; age_band: AgeBand };
export type RestoreRequest = { code: string };
export type SessionResponse = { token: string; player: ApiPlayer };

/* Me */

export type MeResponse = {
  player: ApiPlayer;
  leagues: ApiLeague[];
  season: string;
  /** Ids of the players this player has muted, so the app can offer "Unmute". */
  muted: string[];
};
export type MePatch = {
  display_name?: string;
  /** Only settable once, when null. */
  age_band?: AgeBand;
  /** Expo push token, like ExponentPushToken[xxxx]. null turns push off for this account. */
  push_token?: string | null;
  push_enabled?: Partial<PushSettings>;
};

/* Weeks and picks */

export type ApiOption = { key: string; label: string; team?: string };

export type ApiPick = { choice: string | null; guess: number | null; is_lock: boolean };

export type ApiHousePick = ApiPick & { talk: string | null };

export type ApiTalk = { player_id: string; display_name: string; key: string; text: string };

export type ApiCrowd = {
  /** How many players picked this. */
  total: number;
  /** Share per option key, 0 to 100, rounded. Empty for closest guess. */
  split: Record<string, number>;
  /** Average guess, for closest guess. */
  avg: number | null;
};

export type ApiItem = {
  id: string;
  type: string;
  type_label: string;
  prompt: string;
  note: string | null;
  points: number;
  options: ApiOption[];
  locks_at: string;
  locked: boolean;
  status: ItemStatus;
  result: { winners: string[]; actual: number | null; display: string } | null;
  my_pick: ApiPick | null;
  /** Points this pick earned or lost, once graded. null while pending. */
  my_points: number | null;
  /** Jaiye's and Remi's picks, once they submit or the pick locks. Otherwise null. */
  house: { jaiye: ApiHousePick | null; remi: ApiHousePick | null };
  /** Only after the pick locks. */
  crowd: ApiCrowd | null;
  /** Only after the pick locks. Muted and hidden players left out. */
  talk: ApiTalk[];
};

export type ApiWeek = {
  season: string;
  number: number;
  status: WeekStatus;
  starts_on: string;
  ends_on: string;
  /** "Oct 27 to Nov 2" */
  label: string;
  submitted: boolean;
  items: ApiItem[];
  scores: { me: number | null; jaiye: number; remi: number };
  /** Your place on the Beat Jaiye & Remi board this week. */
  rank: { position: number; of: number } | null;
  next_lock_at: string | null;
  picked: number;
  recap: string | null;
  /** The league mate whose total is nearest yours this week. */
  closest_rival: { player_id: string; display_name: string; gap: number } | null;
};

export type PickRequest = { item_id: string; choice?: string | null; guess?: number | null; is_lock?: boolean };
export type SubmitRequest = { week: number };

/* Boards */

export type ApiBoardRow = {
  player_id: string;
  display_name: string;
  kind: PlayerKind;
  rank: number;
  points: number;
  /** Week boards: picks right and wrong. Season boards: weeks played. */
  correct: number;
  wrong: number;
  weeks_won: number;
  beat_jaiye: boolean;
  beat_remi: boolean;
  is_me: boolean;
  /** Jaiye or Remi shown on a league board they aren't in: "would be #3 here". */
  ghost: boolean;
};

export type ApiBoard = {
  league: { id: string; name: string };
  span: "week" | "season";
  week: number | null;
  /** "4 of 9 players beat Jaiye this week. 2 beat Remi." */
  headline: string;
  rows: ApiBoardRow[];
  me: ApiBoardRow | null;
};

/* Leagues */

export type ApiLeague = {
  id: string;
  name: string;
  code: string;
  members: number;
  is_commissioner: boolean;
  invite_url: string;
};

export type ApiLeagueMember = {
  player_id: string;
  display_name: string;
  is_commissioner: boolean;
  /** Commissioner view only: has this person made a pick this week. */
  picked_this_week: boolean | null;
};

export type ApiLeagueDetail = {
  league: ApiLeague;
  week: ApiBoard | null;
  season: ApiBoard;
  members: ApiLeagueMember[];
};

export type CreateLeagueRequest = { name: string };
export type JoinLeagueRequest = { code: string; from?: string };
export type LeaguePatch = { name: string };
export type NudgeRequest = { player_id?: string };
export type NudgeResponse = { ok: true; sent: number };

/* Rivals */

export type ApiRival = {
  player_id: string;
  display_name: string;
  kind: PlayerKind;
  wins: number;
  losses: number;
  ties: number;
  /** Positive: wins in a row. Negative: losses in a row. */
  streak: number;
  shared_league: boolean;
};

export type ApiRivalWeek = { week: number; me: number; them: number; result: "W" | "L" | "T" };
export type ApiRivalDetail = { rival: ApiRival; weeks: ApiRivalWeek[] };

/* Monday results */

export type ApiResults = {
  week: number;
  status: WeekStatus;
  scores: { me: number | null; jaiye: number; remi: number };
  you_beat: { jaiye: boolean; remi: boolean };
  beat_jaiye: { count: number; names: string[] };
  beat_remi: { count: number; names: string[] };
  players: number;
  record: { right: number; wrong: number };
  lock: { prompt: string; hit: boolean; points: number } | null;
  rivals: Array<{ player_id: string; display_name: string; me: number; them: number; result: "W" | "L" | "T" }>;
  leagues: Array<{ id: string; name: string; rank: number; prev_rank: number | null; of: number }>;
  best_call: { prompt: string; points: number; crowd_pct: number | null } | null;
  worst_miss: { prompt: string; points: number } | null;
};

/* Talk, reactions, safety */

export type TalkLinesResponse = { lines: Array<{ key: string; text: string }> };
export type TalkRequest = { item_id: string; key: string | null };
export type ReactRequest = { item_id: string; player_id: string; emoji: "fire" | "laugh" | "cold" | "clown" | "target" };
export type ReportRequest = { player_id: string; context: "name" | "talk" | "league_name"; ref_id?: string };
export type MuteRequest = { player_id: string; muted: boolean };

/* Public */

export type InviteResponse = {
  league: { name: string; code: string; members: number };
  inviter: { display_name: string } | null;
  week: number | null;
};

export type RecapResponse = { week: number | null; text: string | null; audio_url: string | null };
