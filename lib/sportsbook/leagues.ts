import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { ActionError } from "./actions";
import { isClean } from "./players";
import { SB_SEASON } from "./weeks";

/**
 * Private leagues. Everyone is in the headline league, Beat Jaiye & Remi,
 * automatically; it isn't a row. Joining a league is always free. Creating one
 * needs this season's pass (or an admin, until the pass ships).
 */

const db = () => createServiceClient();

export const MAX_LEAGUE_SIZE = 50;
export const HEADLINE = "headline";
export const HEADLINE_NAME = "Beat Jaiye & Remi";

export type League = {
  id: string;
  name: string;
  code: string;
  commissioner_id: string;
  season: string;
  archived: boolean;
  created_at: string;
};

export type LeagueWithCount = League & { members: number };

const LEAGUE_COLS = "id, name, code, commissioner_id, season, archived, created_at";

const CODE_WORDS = ["CREW", "SQUAD", "FAM", "BENCH", "HUDDLE", "GYM", "CORNER", "BLOCK", "TEAM", "CIRCLE", "TABLE"];

export function newLeagueCode(): string {
  return `${CODE_WORDS[crypto.randomInt(CODE_WORDS.length)]}-${crypto.randomInt(1000, 10000)}`;
}

export function normalizeLeagueCode(v: string): string {
  return v.trim().toUpperCase().replace(/\s+/g, "").replace(/^([A-Z]+)(\d{4})$/, "$1-$2");
}

export type LeagueNameCheck = { ok: true; name: string } | { ok: false; error: string };

export function checkLeagueName(raw: unknown): LeagueNameCheck {
  if (typeof raw !== "string") return { ok: false, error: "Name your league." };
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 3) return { ok: false, error: "League names need at least 3 letters." };
  if (name.length > 30) return { ok: false, error: "Keep it to 30 characters." };
  if (!/^[\p{L}\p{N} .'&_-]+$/u.test(name)) return { ok: false, error: "Letters, numbers and spaces only." };
  if (!isClean(name)) return { ok: false, error: "Pick a different name." };
  if (name.toLowerCase().replace(/[^a-z]/g, "").includes("beatjaiye")) return { ok: false, error: "That name is taken." };
  return { ok: true, name };
}

export async function getLeague(id: string): Promise<League | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("sb_leagues").select(LEAGUE_COLS).eq("id", id).eq("archived", false).maybeSingle();
  return (data as League | null) ?? null;
}

export async function getLeagueByCode(code: string): Promise<League | null> {
  const { data } = await db().from("sb_leagues").select(LEAGUE_COLS).eq("code", normalizeLeagueCode(code)).eq("archived", false).maybeSingle();
  return (data as League | null) ?? null;
}

/** Active member ids of a league, in join order. */
export async function memberIds(leagueId: string): Promise<string[]> {
  const { data, error } = await db()
    .from("sb_league_members")
    .select("player_id")
    .eq("league_id", leagueId)
    .eq("removed", false)
    .order("joined_at");
  if (error) throw error;
  return (data ?? []).map((r) => r.player_id as string);
}

export async function isMember(leagueId: string, playerId: string): Promise<boolean> {
  const { data } = await db()
    .from("sb_league_members")
    .select("player_id")
    .eq("league_id", leagueId)
    .eq("player_id", playerId)
    .eq("removed", false)
    .maybeSingle();
  return !!data;
}

/** The leagues a player is in this season, with member counts. */
export async function myLeagues(playerId: string): Promise<LeagueWithCount[]> {
  const supa = db();
  const { data: rows, error } = await supa.from("sb_league_members").select("league_id").eq("player_id", playerId).eq("removed", false);
  if (error) throw error;
  const ids = (rows ?? []).map((r) => r.league_id as string);
  if (ids.length === 0) return [];
  const { data: leagues } = await supa.from("sb_leagues").select(LEAGUE_COLS).in("id", ids).eq("archived", false).order("created_at");
  const { data: counts } = await supa.from("sb_league_members").select("league_id").in("league_id", ids).eq("removed", false);
  const n = new Map<string, number>();
  for (const c of counts ?? []) n.set(c.league_id as string, (n.get(c.league_id as string) ?? 0) + 1);
  return ((leagues ?? []) as League[]).map((l) => ({ ...l, members: n.get(l.id) ?? 0 }));
}

/** Everyone who shares at least one league with this player. */
export async function leagueMateIds(playerId: string): Promise<Set<string>> {
  const leagues = await myLeagues(playerId);
  const out = new Set<string>();
  for (const l of leagues) for (const id of await memberIds(l.id)) if (id !== playerId) out.add(id);
  return out;
}

async function canCreate(playerId: string): Promise<boolean> {
  const { data } = await db().from("sb_players").select("has_pass, pass_season, deleted_at, age_band").eq("id", playerId).maybeSingle();
  if (!data || data.deleted_at) return false;
  if (data.age_band !== "13_plus") return false;
  return !!data.has_pass && data.pass_season === SB_SEASON;
}

/** Creates a league with this player as commissioner and first member. */
export async function createLeague(playerId: string, rawName: unknown, opts: { admin?: boolean } = {}): Promise<League> {
  const check = checkLeagueName(rawName);
  if (!check.ok) throw new ActionError(check.error);
  if (!opts.admin && !(await canCreate(playerId))) throw new ActionError("Creating a league comes with the Season Pass.");
  const supa = db();
  const { count } = await supa
    .from("sb_leagues")
    .select("id", { count: "exact", head: true })
    .eq("commissioner_id", playerId)
    .eq("archived", false);
  if ((count ?? 0) >= 10 && !opts.admin) throw new ActionError("You can run up to 10 leagues.");
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supa
      .from("sb_leagues")
      .insert({ name: check.name, code: newLeagueCode(), commissioner_id: playerId, season: SB_SEASON })
      .select(LEAGUE_COLS)
      .single();
    if (error?.code === "23505") continue;
    if (error || !data) throw error ?? new Error("league insert failed");
    const { error: mErr } = await supa.from("sb_league_members").insert({ league_id: data.id, player_id: playerId });
    if (mErr) throw mErr;
    return data as League;
  }
  throw new ActionError("Couldn't make that league. Try again.");
}

/** Joins by code. Rejoining after leaving works. Joining twice is a no-op. */
export async function joinLeague(playerId: string, rawCode: string, invitedBy: string | null = null): Promise<League> {
  const league = await getLeagueByCode(rawCode);
  if (!league) throw new ActionError("No league with that code.");
  const supa = db();
  const { data: existing } = await supa
    .from("sb_league_members")
    .select("removed")
    .eq("league_id", league.id)
    .eq("player_id", playerId)
    .maybeSingle();
  if (existing && !existing.removed) return league;
  if (existing?.removed) {
    // Removed by the commissioner: only they can add you back.
    throw new ActionError("You're not in this league anymore. Ask the commissioner.");
  }
  const { error } = await supa
    .from("sb_league_members")
    .insert({ league_id: league.id, player_id: playerId, invited_by: invitedBy && invitedBy !== playerId ? invitedBy : null });
  if (error) {
    if (error.message.includes("full")) throw new ActionError("This league is full.");
    if (error.code === "23505") return league;
    throw error;
  }
  return league;
}

export async function leaveLeague(playerId: string, leagueId: string): Promise<void> {
  const league = await getLeague(leagueId);
  if (!league) throw new ActionError("League not found.");
  if (league.commissioner_id === playerId) throw new ActionError("Commissioners can't leave. Hand it off or archive the league.");
  // Only active members can leave. A removed member's row stays so they can't rejoin by themselves.
  const { data, error } = await db()
    .from("sb_league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("player_id", playerId)
    .eq("removed", false)
    .select("player_id");
  if (error) throw error;
  if (!data?.length) throw new ActionError("You're not in this league.");
}

async function requireCommissioner(playerId: string, leagueId: string, admin = false): Promise<League> {
  const league = await getLeague(leagueId);
  if (!league) throw new ActionError("League not found.");
  if (!admin && league.commissioner_id !== playerId) throw new ActionError("Only the commissioner can do that.");
  return league;
}

export async function renameLeague(playerId: string, leagueId: string, rawName: unknown, admin = false): Promise<void> {
  await requireCommissioner(playerId, leagueId, admin);
  const check = checkLeagueName(rawName);
  if (!check.ok) throw new ActionError(check.error);
  const { error } = await db().from("sb_leagues").update({ name: check.name }).eq("id", leagueId);
  if (error) throw error;
}

export async function removeMember(playerId: string, leagueId: string, target: string, admin = false): Promise<void> {
  const league = await requireCommissioner(playerId, leagueId, admin);
  if (target === league.commissioner_id) throw new ActionError("The commissioner stays in the league.");
  const { error } = await db().from("sb_league_members").update({ removed: true }).eq("league_id", leagueId).eq("player_id", target);
  if (error) throw error;
}

export async function archiveLeague(playerId: string, leagueId: string, admin = false): Promise<void> {
  await requireCommissioner(playerId, leagueId, admin);
  const { error } = await db().from("sb_leagues").update({ archived: true }).eq("id", leagueId);
  if (error) throw error;
}

/** Admin list: every active league with size and commissioner name. */
export async function allLeagues(): Promise<Array<LeagueWithCount & { commissioner: string }>> {
  const supa = db();
  const { data: leagues } = await supa.from("sb_leagues").select(LEAGUE_COLS).eq("archived", false).order("created_at", { ascending: false });
  const list = (leagues ?? []) as League[];
  if (list.length === 0) return [];
  const { data: counts } = await supa.from("sb_league_members").select("league_id").in("league_id", list.map((l) => l.id)).eq("removed", false);
  const { data: owners } = await supa.from("sb_players").select("id, display_name").in("id", [...new Set(list.map((l) => l.commissioner_id))]);
  const n = new Map<string, number>();
  for (const c of counts ?? []) n.set(c.league_id as string, (n.get(c.league_id as string) ?? 0) + 1);
  const names = new Map((owners ?? []).map((o) => [o.id as string, o.display_name as string]));
  return list.map((l) => ({ ...l, members: n.get(l.id) ?? 0, commissioner: names.get(l.commissioner_id) ?? "Player" }));
}
