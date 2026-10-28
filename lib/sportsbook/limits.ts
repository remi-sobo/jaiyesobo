import { createServiceClient } from "@/lib/supabase/server";
import { ipFromRequest } from "@/lib/rate-limit";

/**
 * Per IP hourly caps for anything that creates rows from the open internet:
 * joins, code restores, reports, league creation, and the chatty app routes
 * (picks, talk, reactions, mutes, name changes). Uses the pin_attempts table
 * the site already has for this.
 */
export const LIMITS = {
  join: 5,
  restore: 10,
  report: 20,
  league: 10,
  league_join: 30,
  pick: 240,
  talk: 60,
  react: 120,
  mute: 60,
  name: 10,
} as const;

export type LimitKind = keyof typeof LIMITS;

/**
 * Records an attempt and says whether this IP is over its hourly cap. It
 * inserts first and counts second, so parallel requests see each other, and it
 * fails closed: any database error counts as over the limit.
 */
export async function overLimit(req: Request, kind: LimitKind): Promise<boolean> {
  try {
    const supa = createServiceClient();
    const identifier = `sportsbook:${kind}:${ipFromRequest(req)}`;
    const since = new Date(Date.now() - 60 * 60_000).toISOString();
    const { error: insertError } = await supa.from("pin_attempts").insert({ identifier, successful: false });
    if (insertError) return true;
    const { count, error } = await supa
      .from("pin_attempts")
      .select("id", { count: "exact", head: true })
      .eq("identifier", identifier)
      .gte("attempted_at", since);
    if (error || count === null) return true;
    return count > LIMITS[kind];
  } catch {
    return true;
  }
}
