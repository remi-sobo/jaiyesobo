import { createServiceClient } from "@/lib/supabase/server";
import { ipFromRequest } from "@/lib/rate-limit";

/**
 * Per IP hourly caps for anything that creates rows from the open internet:
 * joins, code restores, reports, league creation. Uses the pin_attempts table
 * the site already has for this.
 */
export const LIMITS = {
  join: 5,
  restore: 10,
  report: 20,
  league: 10,
  league_join: 30,
} as const;

export type LimitKind = keyof typeof LIMITS;

/** Records an attempt and says whether this IP is over its hourly cap. */
export async function overLimit(req: Request, kind: LimitKind): Promise<boolean> {
  const supa = createServiceClient();
  const identifier = `sportsbook:${kind}:${ipFromRequest(req)}`;
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count } = await supa
    .from("pin_attempts")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .gte("attempted_at", since);
  if ((count ?? 0) >= LIMITS[kind]) return true;
  await supa.from("pin_attempts").insert({ identifier, successful: false });
  return false;
}
