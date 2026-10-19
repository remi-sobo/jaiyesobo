import { createServiceClient } from "@/lib/supabase/server";
import { sanitizePicks } from "./logic";
import type { PredictionRow } from "./types";

const COLUMNS = "id, user_id, season, status, standings, play_in, bracket, awards, hot_take, published_at, updated_at";

type DbRow = {
  id: string;
  user_id: string;
  season: string;
  status: "draft" | "published";
  standings: unknown;
  play_in: unknown;
  bracket: unknown;
  awards: unknown;
  hot_take: string | null;
  published_at: string | null;
  updated_at: string | null;
};

function toRow(r: DbRow): PredictionRow {
  const picks = sanitizePicks(r);
  return {
    ...picks,
    id: r.id,
    user_id: r.user_id,
    season: r.season,
    status: r.status,
    published_at: r.published_at,
    updated_at: r.updated_at,
  };
}

/** A kid's row for a season, draft or published. Admin only. */
export async function getPrediction(userId: string, season: string): Promise<PredictionRow | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("nba_predictions")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("season", season)
    .maybeSingle();
  if (error) throw error;
  return data ? toRow(data as DbRow) : null;
}

/** A published prediction for a season. Drafts never leave the admin. */
export async function getPublishedPrediction(userId: string, season: string): Promise<PredictionRow | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("nba_predictions")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("season", season)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data ? toRow(data as DbRow) : null;
}

/** The newest published season, for the /predictions landing page. */
export async function getLatestPublishedPrediction(userId: string): Promise<PredictionRow | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("nba_predictions")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("status", "published")
    .order("season", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toRow(data as DbRow) : null;
}
