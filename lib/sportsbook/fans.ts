import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { isReactionKey, REACTIONS, type ReactionKey } from "./reactions";

export { isReactionKey, REACTIONS, type ReactionKey };

/**
 * Fan extras: emoji reactions on revealed picks and the weekly "who wins"
 * vote. No free text anywhere, so nothing needs moderating. A visitor is an
 * anonymous random id kept in a cookie.
 */

const COOKIE = "sb_visitor";

export async function getVisitor(create: boolean): Promise<string | null> {
  const c = await cookies();
  const existing = c.get(COOKIE)?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
  if (!create) return null;
  const id = crypto.randomBytes(16).toString("hex");
  c.set(COOKIE, id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return id;
}

/** reactions[`${item_id}:${player_id}`][emoji] = count, plus which ones this visitor gave. */
export type ReactionMap = Record<string, { counts: Partial<Record<ReactionKey, number>>; mine: ReactionKey[] }>;

export async function loadReactions(itemIds: string[], visitor: string | null): Promise<ReactionMap> {
  const out: ReactionMap = {};
  if (itemIds.length === 0) return out;
  const { data } = await createServiceClient().from("sb_reactions").select("item_id, player_id, emoji, visitor").in("item_id", itemIds);
  for (const r of data ?? []) {
    const k = `${r.item_id}:${r.player_id}`;
    const slot = (out[k] ??= { counts: {}, mine: [] });
    const e = r.emoji as ReactionKey;
    slot.counts[e] = (slot.counts[e] ?? 0) + 1;
    if (visitor && r.visitor === visitor) slot.mine.push(e);
  }
  return out;
}

/** Turns a reaction on or off. Only for picks that are already revealed. */
export async function toggleReaction(itemId: string, playerId: string, emoji: ReactionKey, visitor: string): Promise<void> {
  const supa = createServiceClient();
  const { data: item } = await supa.from("sb_items").select("locks_at").eq("id", itemId).maybeSingle();
  if (!item || Date.parse(item.locks_at) > Date.now()) throw new Error("not_revealed");
  const { data: pick } = await supa.from("sb_picks").select("item_id").eq("item_id", itemId).eq("player_id", playerId).maybeSingle();
  if (!pick) throw new Error("no_pick");
  const key = { item_id: itemId, player_id: playerId, emoji, visitor };
  const { data: had } = await supa.from("sb_reactions").select("emoji").match(key).maybeSingle();
  if (had) await supa.from("sb_reactions").delete().match(key);
  else await supa.from("sb_reactions").insert(key);
}

export type VoteTally = { jaiye: number; remi: number; mine: "jaiye" | "remi" | null };

export async function loadVotes(weekId: string, visitor: string | null): Promise<VoteTally> {
  const { data } = await createServiceClient().from("sb_votes").select("choice, visitor").eq("week_id", weekId);
  const t: VoteTally = { jaiye: 0, remi: 0, mine: null };
  for (const v of data ?? []) {
    if (v.choice === "jaiye") t.jaiye++;
    else if (v.choice === "remi") t.remi++;
    if (visitor && v.visitor === visitor) t.mine = v.choice as "jaiye" | "remi";
  }
  return t;
}

export async function castVote(weekId: string, choice: "jaiye" | "remi", visitor: string): Promise<void> {
  const supa = createServiceClient();
  const { data: week } = await supa.from("sb_weeks").select("status").eq("id", weekId).maybeSingle();
  if (week?.status !== "open") throw new Error("closed");
  const { error } = await supa.from("sb_votes").upsert({ week_id: weekId, visitor, choice }, { onConflict: "week_id,visitor" });
  if (error) throw error;
}
