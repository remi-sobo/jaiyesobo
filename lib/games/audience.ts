/**
 * Per-kid game audience.
 *
 * Stored in `app_config` (key='games_audience') as a JSON blob:
 *   { "jaiye": ["top-five", "trivia", ...], "kemi": ["think-tank"] }
 *
 * Each /games hub (jaiyesobo.com or kemisobo.com) reads this config and
 * filters the games table down to its own kid's slug list. When the config
 * row is missing entirely (cold start, fresh DB), Jaiye's hub falls back
 * to "all live/beta games" (original behaviour) and Kemi's hub shows
 * nothing.
 */

import { createServiceClient } from "@/lib/supabase/server";

export const KID_SLUGS = ["jaiye", "kemi"] as const;
export type KidSlug = (typeof KID_SLUGS)[number];

export type GamesAudience = Record<KidSlug, string[]>;

const CONFIG_KEY = "games_audience";

const EMPTY: GamesAudience = { jaiye: [], kemi: [] };

/**
 * Read the audience config. Returns null if not yet seeded.
 */
export async function getGamesAudience(): Promise<GamesAudience | null> {
  const supa = createServiceClient();
  const { data } = await supa
    .from("app_config")
    .select("value")
    .eq("key", CONFIG_KEY)
    .maybeSingle();
  if (!data?.value || typeof data.value !== "object") return null;
  return normalize(data.value as Partial<GamesAudience>);
}

/**
 * Idempotent: ensures the config row exists. Pass an explicit shape to
 * overwrite, otherwise seeds defaults: every existing live/beta game on
 * jaiyesobo, plus think-tank scoped to kemi only.
 */
export async function setGamesAudience(next: GamesAudience): Promise<void> {
  const supa = createServiceClient();
  const { error } = await supa
    .from("app_config")
    .upsert({ key: CONFIG_KEY, value: next }, { onConflict: "key" });
  if (error) throw error;
}

/**
 * Toggle a single (game, kid) pair on or off in the audience map. Returns
 * the resulting full audience.
 */
export async function toggleGameKid(
  game_slug: string,
  kid: KidSlug,
  on: boolean
): Promise<GamesAudience> {
  const current = (await getGamesAudience()) ?? EMPTY;
  const next: GamesAudience = {
    jaiye: [...current.jaiye],
    kemi: [...current.kemi],
  };
  const list = next[kid];
  const has = list.includes(game_slug);
  if (on && !has) list.push(game_slug);
  if (!on && has) next[kid] = list.filter((s) => s !== game_slug);
  await setGamesAudience(next);
  return next;
}

function normalize(v: Partial<GamesAudience>): GamesAudience {
  return {
    jaiye: Array.isArray(v.jaiye) ? v.jaiye.filter((s) => typeof s === "string") : [],
    kemi: Array.isArray(v.kemi) ? v.kemi.filter((s) => typeof s === "string") : [],
  };
}
