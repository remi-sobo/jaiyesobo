import { createServiceClient } from "@/lib/supabase/server";
import { ActionError } from "./actions";
import { isTalkKey, talkText, type TalkKey } from "./talk";

/**
 * Trash talk, reports, mutes and account deletion. The only things a player can
 * put on the page are a display name, a league name and a preset talk line, so
 * those are the only things that can be reported.
 */

const db = () => createServiceClient();

/** Open reports on one player before their name is hidden pending review. */
export const AUTO_HIDE_AT = 3;

export type PlayerFlags = {
  id: string;
  kind: string;
  age_band: string | null;
  deleted_at: string | null;
  hidden: boolean;
};

export async function playerFlags(id: string): Promise<PlayerFlags | null> {
  const { data } = await db().from("sb_players").select("id, kind, age_band, deleted_at, hidden").eq("id", id).maybeSingle();
  return (data as PlayerFlags | null) ?? null;
}

/** Under 13 players can play and react but can't post talk or run leagues. */
export function canPostTalk(p: PlayerFlags | null): boolean {
  return !!p && !p.deleted_at && !p.hidden && p.age_band !== "under_13";
}

export async function postTalk(playerId: string, itemId: string, key: unknown): Promise<void> {
  if (!isTalkKey(key)) throw new ActionError("Pick one of the lines.");
  const me = await playerFlags(playerId);
  if (!canPostTalk(me)) throw new ActionError("Trash talk isn't on for this player.");
  const supa = db();
  const { data: mine } = await supa.from("sb_picks").select("item_id").eq("item_id", itemId).eq("player_id", playerId).maybeSingle();
  if (!mine) throw new ActionError("Make the pick to talk about it.");
  const { error } = await supa.from("sb_trash_talk").upsert({ item_id: itemId, player_id: playerId, line_key: key }, { onConflict: "item_id,player_id" });
  if (error) throw new ActionError(error.message.includes("tip-off") ? "Talk opens at tip-off." : "Couldn't post that.");
}

export async function deleteTalk(playerId: string, itemId: string): Promise<void> {
  await db().from("sb_trash_talk").delete().eq("item_id", itemId).eq("player_id", playerId);
}

export type TalkLine = { item_id: string; player_id: string; key: TalkKey | string; text: string; created_at: string };

/** Talk on these picks, minus hidden players and anyone this viewer muted. */
export async function loadTalk(itemIds: string[], viewerId: string | null): Promise<TalkLine[]> {
  if (itemIds.length === 0) return [];
  const supa = db();
  const { data } = await supa.from("sb_trash_talk").select("item_id, player_id, line_key, created_at").in("item_id", itemIds).order("created_at");
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const playerIds = [...new Set(rows.map((r) => r.player_id as string))];
  const { data: ps } = await supa.from("sb_players").select("id, hidden, deleted_at").in("id", playerIds);
  const gone = new Set((ps ?? []).filter((p) => p.hidden || p.deleted_at).map((p) => p.id as string));
  const muted = viewerId ? await mutedBy(viewerId) : new Set<string>();
  return rows
    .filter((r) => !gone.has(r.player_id as string) && !muted.has(r.player_id as string))
    .map((r) => ({ item_id: r.item_id as string, player_id: r.player_id as string, key: r.line_key as string, text: talkText(r.line_key as string) ?? "", created_at: r.created_at as string }))
    .filter((r) => r.text);
}

export async function mutedBy(playerId: string): Promise<Set<string>> {
  const { data } = await db().from("sb_mutes").select("muted_player_id").eq("player_id", playerId);
  return new Set((data ?? []).map((r) => r.muted_player_id as string));
}

export async function setMute(playerId: string, target: string, muted: boolean): Promise<void> {
  if (playerId === target) throw new ActionError("You can't mute yourself.");
  if (muted) {
    const { error } = await db().from("sb_mutes").upsert({ player_id: playerId, muted_player_id: target }, { onConflict: "player_id,muted_player_id" });
    if (error) throw error;
  } else {
    await db().from("sb_mutes").delete().eq("player_id", playerId).eq("muted_player_id", target);
  }
}

export type ReportContext = "name" | "talk" | "league_name";

export function isReportContext(v: unknown): v is ReportContext {
  return v === "name" || v === "talk" || v === "league_name";
}

/**
 * Files a report. Jaiye and Remi can't be auto hidden. At AUTO_HIDE_AT open
 * reports from different people, the player is hidden until Remi reviews it.
 */
export async function fileReport(reporterId: string | null, target: string, context: ReportContext, refId: string | null): Promise<void> {
  if (reporterId && reporterId === target) throw new ActionError("You can't report yourself.");
  const supa = db();
  const t = await playerFlags(target);
  if (!t) throw new ActionError("Player not found.");
  if (reporterId) {
    const { data: dupe } = await supa
      .from("sb_reports")
      .select("id")
      .eq("reporter_id", reporterId)
      .eq("target_player_id", target)
      .eq("resolved", false)
      .limit(1);
    if (dupe && dupe.length) return;
  }
  const { error } = await supa.from("sb_reports").insert({ reporter_id: reporterId, target_player_id: target, context, ref_id: refId });
  if (error) throw error;
  if (t.kind !== "challenger") return;
  const { data: open } = await supa.from("sb_reports").select("reporter_id").eq("target_player_id", target).eq("resolved", false);
  const distinct = new Set((open ?? []).map((r) => r.reporter_id ?? "anon"));
  if (distinct.size >= AUTO_HIDE_AT) await supa.from("sb_players").update({ hidden: true }).eq("id", target);
}

export type OpenReport = {
  target_player_id: string;
  display_name: string;
  hidden: boolean;
  count: number;
  contexts: string[];
  latest: string;
};

/** Admin queue: open reports grouped by player, most reported first. */
export async function openReports(): Promise<OpenReport[]> {
  const supa = db();
  const { data } = await supa.from("sb_reports").select("target_player_id, context, created_at").eq("resolved", false).order("created_at", { ascending: false });
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.map((r) => r.target_player_id as string))];
  const { data: ps } = await supa.from("sb_players").select("id, display_name, hidden").in("id", ids);
  const byId = new Map((ps ?? []).map((p) => [p.id as string, p]));
  return ids
    .map((id) => {
      const mine = rows.filter((r) => r.target_player_id === id);
      const p = byId.get(id);
      return {
        target_player_id: id,
        display_name: (p?.display_name as string) ?? "Player",
        hidden: !!p?.hidden,
        count: mine.length,
        contexts: [...new Set(mine.map((r) => r.context as string))],
        latest: mine[0].created_at as string,
      };
    })
    .sort((a, b) => b.count - a.count);
}

/** Admin: close every open report on a player, optionally unhiding them. */
export async function resolveReports(target: string, unhide: boolean): Promise<void> {
  const supa = db();
  await supa.from("sb_reports").update({ resolved: true }).eq("target_player_id", target).eq("resolved", false);
  if (unhide) await supa.from("sb_players").update({ hidden: false }).eq("id", target).eq("kind", "challenger");
}

/**
 * Deletes a challenger's account. Their name, code, push token, sign-ins,
 * league spots, talk and mutes go. Past picks stay without a name so other
 * players' points (closest guess compares everyone) don't change.
 * Leagues they ran pass to the longest standing member, or close if empty.
 */
export async function deleteAccount(playerId: string): Promise<void> {
  const supa = db();
  const me = await playerFlags(playerId);
  if (!me || me.kind !== "challenger") throw new ActionError("This account can't be deleted here.");
  if (me.deleted_at) return;

  const { data: owned } = await supa.from("sb_leagues").select("id").eq("commissioner_id", playerId).eq("archived", false);
  for (const l of owned ?? []) {
    const { data: next } = await supa
      .from("sb_league_members")
      .select("player_id")
      .eq("league_id", l.id)
      .eq("removed", false)
      .neq("player_id", playerId)
      .order("joined_at")
      .limit(1)
      .maybeSingle();
    if (next) await supa.from("sb_leagues").update({ commissioner_id: next.player_id }).eq("id", l.id);
    else await supa.from("sb_leagues").update({ archived: true }).eq("id", l.id);
  }
  await supa.from("sb_league_members").delete().eq("player_id", playerId);
  await supa.from("sb_trash_talk").delete().eq("player_id", playerId);
  await supa.from("sb_mutes").delete().or(`player_id.eq.${playerId},muted_player_id.eq.${playerId}`);
  await supa.from("sb_app_sessions").delete().eq("player_id", playerId);
  const { error } = await supa
    .from("sb_players")
    .update({
      display_name: "Deleted player",
      code: null,
      hidden: true,
      push_token: null,
      age_band: null,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", playerId);
  if (error) throw error;
}
