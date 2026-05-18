/**
 * Supabase queries for Blind Rank. Topics live on game_content with
 * content_type='blind_rank_topic'. Plays live on the standard plays table.
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { BlindRankTopicPayload } from "./blind-rank";

export type BlindRankTopicRow = {
  id: string;
  game_slug: "blind-rank";
  content_type: "blind_rank_topic";
  status: "draft" | "live" | "archived" | "community_submitted";
  verification_status: "pending" | "verified" | "rejected";
  payload: BlindRankTopicPayload;
  created_at: string;
};

const SELECT =
  "id, game_slug, content_type, status, verification_status, payload, created_at";

export async function getAllBlindRankTopics(): Promise<BlindRankTopicRow[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select(SELECT)
    .eq("game_slug", "blind-rank")
    .eq("content_type", "blind_rank_topic")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BlindRankTopicRow[];
}

export async function getLiveBlindRankTopics(): Promise<BlindRankTopicRow[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select(SELECT)
    .eq("game_slug", "blind-rank")
    .eq("content_type", "blind_rank_topic")
    .eq("status", "live")
    .eq("verification_status", "verified")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BlindRankTopicRow[];
}

export async function getBlindRankTopicById(
  id: string
): Promise<BlindRankTopicRow | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .select(SELECT)
    .eq("id", id)
    .eq("game_slug", "blind-rank")
    .eq("content_type", "blind_rank_topic")
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as BlindRankTopicRow) ?? null;
}
