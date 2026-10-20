/**
 * ESPN's public NBA endpoints. Free, no key, and reachable from Vercel
 * (NBA's own cdn.nba.com refuses server requests). Everything is parsed
 * defensively and mapped to our three letter team codes.
 */

import { isTeamCode, type TeamCode } from "@/lib/nba/teams";
import type { PlayerLine } from "./grade";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";

/** ESPN uses a few short codes that differ from ours. */
const FROM_ESPN: Record<string, TeamCode> = {
  GS: "GSW",
  NY: "NYK",
  SA: "SAS",
  NO: "NOP",
  UTAH: "UTA",
  WSH: "WAS",
};

export function teamFromEspn(abbr: string | undefined): TeamCode | null {
  if (!abbr) return null;
  const up = abbr.toUpperCase();
  const code = FROM_ESPN[up] ?? up;
  return isTeamCode(code) ? code : null;
}

export function espnAbbr(team: TeamCode): string {
  const hit = Object.entries(FROM_ESPN).find(([, v]) => v === team);
  return (hit ? hit[0] : team).toLowerCase();
}

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`ESPN ${res.status} for ${url}`);
  return res.json();
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export type EspnGame = {
  game_id: string;
  tip_at: string;
  home: TeamCode;
  away: TeamCode;
  home_score: number | null;
  away_score: number | null;
  status: 1 | 2 | 3;
  postponed: boolean;
};

function parseEvent(e: unknown): EspnGame | null {
  const ev = obj(e);
  const comp = obj(arr(ev.competitions)[0]);
  const teams = arr(comp.competitors).map(obj);
  const home = teams.find((c) => c.homeAway === "home");
  const away = teams.find((c) => c.homeAway === "away");
  const h = teamFromEspn(obj(home?.team).abbreviation as string);
  const a = teamFromEspn(obj(away?.team).abbreviation as string);
  if (!h || !a || typeof ev.id !== "string") return null;
  const type = obj(obj(ev.status ?? comp.status).type);
  const name = String(type.name ?? "");
  const state = String(type.state ?? "pre");
  const postponed = /POSTPONED|CANCELED|CANCELLED|SUSPENDED/.test(name);
  const status: 1 | 2 | 3 = type.completed === true || state === "post" ? 3 : state === "in" ? 2 : 1;
  const num = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number(v));
  return {
    game_id: ev.id,
    tip_at: new Date(String(ev.date)).toISOString(),
    home: h,
    away: a,
    home_score: status === 1 || postponed ? null : num(home?.score),
    away_score: status === 1 || postponed ? null : num(away?.score),
    status: postponed ? 1 : status,
    postponed,
  };
}

/** Games between two dates (YYYY-MM-DD, inclusive). ESPN takes one day per request. */
export async function fetchGames(fromIso: string, toIso: string): Promise<EspnGame[]> {
  const days: string[] = [];
  for (let d = new Date(`${fromIso}T12:00:00Z`); d <= new Date(`${toIso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10).replaceAll("-", ""));
  }
  const seen = new Map<string, EspnGame>();
  const results = await Promise.all(
    days.map((day) => getJson(`${BASE}/scoreboard?dates=${day}&limit=100`).catch(() => null)),
  );
  for (const r of results) {
    for (const g of arr(obj(r).events).map(parseEvent)) if (g) seen.set(g.game_id, g);
  }
  return [...seen.values()];
}

const STAT_KEYS = {
  pts: "points",
  reb: "rebounds",
  ast: "assists",
  stl: "steals",
  blk: "blocks",
  fg3: "threePointFieldGoalsMade-threePointFieldGoalsAttempted",
  min: "minutes",
} as const;

/** Every player line from a finished game's box score. */
export async function fetchBox(gameId: string): Promise<PlayerLine[]> {
  const json = obj(await getJson(`${BASE}/summary?event=${encodeURIComponent(gameId)}`));
  const out: PlayerLine[] = [];
  for (const side of arr(obj(json.boxscore).players).map(obj)) {
    const team = teamFromEspn(obj(side.team).abbreviation as string);
    if (!team) continue;
    const block = obj(arr(side.statistics)[0]);
    const keys = arr(block.keys).map(String);
    const at = (k: string) => keys.indexOf(k);
    for (const row of arr(block.athletes).map(obj)) {
      const ath = obj(row.athlete);
      const id = Number(ath.id);
      if (!Number.isFinite(id)) continue;
      const stats = arr(row.stats).map(String);
      const val = (k: string) => {
        const i = at(k);
        const n = i >= 0 ? parseInt(stats[i] ?? "", 10) : NaN;
        return Number.isFinite(n) ? n : 0;
      };
      const fg3 = at(STAT_KEYS.fg3) >= 0 ? parseInt((stats[at(STAT_KEYS.fg3)] ?? "0").split("-")[0], 10) || 0 : 0;
      const played = row.didNotPlay !== true && stats.length > 0 && val(STAT_KEYS.min) > 0;
      out.push({
        person_id: id,
        name: String(ath.displayName ?? ""),
        team,
        played,
        pts: val(STAT_KEYS.pts),
        reb: val(STAT_KEYS.reb),
        ast: val(STAT_KEYS.ast),
        fg3m: fg3,
        stl: val(STAT_KEYS.stl),
        blk: val(STAT_KEYS.blk),
      });
    }
  }
  return out;
}

export type RosterPlayer = { person_id: number; name: string; team: TeamCode; position: string; injured: boolean };

/** Current roster, so player props use real players on real teams. */
export async function fetchRoster(team: TeamCode): Promise<RosterPlayer[]> {
  const json = obj(await getJson(`${BASE}/teams/${espnAbbr(team)}/roster`));
  // NBA rosters come back flat; some sports group them. Handle both.
  const raw = arr(json.athletes).flatMap((a) => {
    const o = obj(a);
    return Array.isArray(o.items) ? arr(o.items) : [a];
  });
  return raw
    .map(obj)
    .map((a) => ({
      person_id: Number(a.id),
      name: String(a.displayName ?? a.fullName ?? ""),
      team,
      position: String(obj(a.position).abbreviation ?? ""),
      injured: arr(a.injuries).length > 0,
    }))
    .filter((p) => Number.isFinite(p.person_id) && p.name);
}
