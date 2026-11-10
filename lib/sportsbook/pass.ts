import { createServiceClient } from "@/lib/supabase/server";
import { SB_SEASON } from "./weeks";

export const SEASON_PASS_CENTS = 199;

/** Whether this player holds the pass for the current season. Throws on a database error so callers never charge twice by mistake. */
export async function hasPass(playerId: string): Promise<boolean> {
  const { data, error } = await createServiceClient().from("sb_players").select("has_pass, pass_season").eq("id", playerId).maybeSingle();
  if (error) throw error;
  return !!data?.has_pass && data.pass_season === SB_SEASON;
}

/** Turn the pass on for this season. Idempotent; challengers only. */
export async function grantPass(playerId: string, source: { stripe_session_id: string }): Promise<void> {
  const { data, error } = await createServiceClient()
    .from("sb_players")
    .update({ has_pass: true, pass_season: SB_SEASON, pass_purchased_at: new Date().toISOString() })
    .eq("id", playerId)
    .eq("kind", "challenger")
    .is("deleted_at", null)
    // Skip a row that already has this season's pass.
    .or(`has_pass.eq.false,pass_season.is.null,pass_season.neq.${SB_SEASON}`)
    .select("id");
  if (error) throw error;
  if (data && data.length > 0) console.log(JSON.stringify({ scope: "pass", playerId, session: source.stripe_session_id }));
}
