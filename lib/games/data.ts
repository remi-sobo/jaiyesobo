import { createServiceClient } from "@/lib/supabase/server";
import { getGamesAudience, type KidSlug } from "@/lib/games/audience";

export type Game = {
  slug: string;
  title: string;
  description: string;
  status: "live" | "beta" | "archived";
  created_at: string;
};

export type GameContent = {
  id: string;
  game_slug: string;
  content_type: string;
  payload: Record<string, unknown>;
  status: "draft" | "live" | "archived" | "community_submitted";
  difficulty: number;
  created_at: string;
};

export type Play = {
  id: string;
  game_slug: string;
  user_id: string | null;
  anon_session_id: string | null;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  share_token: string | null;
  created_at: string;
};

export async function getAllGames(): Promise<Game[]> {
  const supa = createServiceClient();
  const { data, error } = await supa.from("games").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []) as Game[];
}

/**
 * Games that should appear on the given kid's /games hub. Reads the
 * `app_config['games_audience']` blob to determine which slugs are scoped
 * to that kid, then resolves them against the games table.
 *
 * Fallback when the config is missing entirely: for `jaiye` we surface
 * every non-internal game (preserves the pre-multi-kid behaviour); for
 * `kemi` we return [] (curated experience, opt-in only).
 */
export async function getGamesForKid(kid: KidSlug): Promise<Game[]> {
  const [all, audience] = await Promise.all([getAllGames(), getGamesAudience()]);
  if (!audience) {
    if (kid === "jaiye") {
      return all.filter((g) => g.status === "live" || g.status === "beta");
    }
    return [];
  }
  const allowed = new Set(audience[kid] ?? []);
  return all.filter((g) => allowed.has(g.slug));
}

export async function getGame(slug: string): Promise<Game | null> {
  const supa = createServiceClient();
  const { data } = await supa.from("games").select("*").eq("slug", slug).maybeSingle();
  return (data as Game) ?? null;
}

/** Returns today's daily-feature content row for a game; falls back to a
 *  random `live` row if no daily feature exists yet. */
export async function getTodayContent(gameSlug: string): Promise<GameContent | null> {
  const supa = createServiceClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: feature } = await supa
    .from("daily_features")
    .select("content_id")
    .eq("date", todayIso)
    .eq("game_slug", gameSlug)
    .maybeSingle();

  if (feature?.content_id) {
    const { data } = await supa
      .from("game_content")
      .select("*")
      .eq("id", feature.content_id)
      .maybeSingle();
    if (data) return data as GameContent;
  }

  // Fallback: random live row
  const { data: liveRows } = await supa
    .from("game_content")
    .select("*")
    .eq("game_slug", gameSlug)
    .eq("status", "live");
  if (!liveRows || liveRows.length === 0) return null;
  const random = liveRows[Math.floor(Math.random() * liveRows.length)];
  return random as GameContent;
}

export async function getPlayByToken(token: string): Promise<Play | null> {
  const supa = createServiceClient();
  const { data } = await supa
    .from("plays")
    .select("*")
    .eq("share_token", token)
    .maybeSingle();
  return (data as Play) ?? null;
}

export async function getPlayById(id: string): Promise<Play | null> {
  const supa = createServiceClient();
  const { data } = await supa.from("plays").select("*").eq("id", id).maybeSingle();
  return (data as Play) ?? null;
}

/** Generate an 8-char nanoid-style share token using URL-safe alphabet. */
export function shareToken(len = 8): string {
  const ALPHA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  const buf = new Uint8Array(len);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < len; i++) out += ALPHA[buf[i] % ALPHA.length];
  return out;
}
