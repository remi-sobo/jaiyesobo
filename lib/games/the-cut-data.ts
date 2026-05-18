/**
 * Supabase queries for The Cut. All rows live on game_content with
 * content_type='cut_set'. Plays live on the standard plays table.
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { CutSetPayload } from "./the-cut";

export type CutSetRow = {
  id: string;
  game_slug: "the-cut";
  content_type: "cut_set";
  status: "draft" | "live" | "archived" | "community_submitted";
  verification_status: "pending" | "verified" | "rejected";
  payload: CutSetPayload;
  created_at: string;
};

const SELECT = "id, game_slug, content_type, status, verification_status, payload, created_at";

export async function getAllCutSets(): Promise<CutSetRow[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select(SELECT)
    .eq("game_slug", "the-cut")
    .eq("content_type", "cut_set")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CutSetRow[];
}

export async function getLiveCutSets(): Promise<CutSetRow[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select(SELECT)
    .eq("game_slug", "the-cut")
    .eq("content_type", "cut_set")
    .eq("status", "live")
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CutSetRow[];
}

export async function getCutSetById(id: string): Promise<CutSetRow | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select(SELECT)
    .eq("id", id)
    .eq("game_slug", "the-cut")
    .eq("content_type", "cut_set")
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as CutSetRow) ?? null;
}

/** Pick a random verified+live cut set. Returns null if the pool is empty. */
export async function pickRandomVerifiedCutSet(): Promise<CutSetRow | null> {
  const live = await getLiveCutSets();
  if (live.length === 0) return null;
  return live[Math.floor(Math.random() * live.length)];
}
