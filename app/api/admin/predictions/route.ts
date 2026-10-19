import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getActiveKid } from "@/lib/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { getPrediction } from "@/lib/nba/data";
import { isSeasonSlug, sanitizePicks } from "@/lib/nba/logic";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/predictions { season, picks }
 *
 * Autosave for the builder. Always writes a draft for the active kid. The
 * picks are cleaned and re-checked here, so a stale tab can't save a pick
 * for a team that isn't in that slot anymore. Published rows are refused
 * here and again by the database trigger.
 */
export async function PUT(req: Request) {
  await requireAdmin();

  let body: { season?: unknown; picks?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const season = typeof body.season === "string" ? body.season : "";
  if (!isSeasonSlug(season)) {
    return NextResponse.json({ error: "bad_season" }, { status: 400 });
  }

  const kid = await getActiveKid();
  const existing = await getPrediction(kid.id, season);
  if (existing?.status === "published") {
    return NextResponse.json({ error: "locked" }, { status: 409 });
  }

  const picks = sanitizePicks(body.picks);
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("nba_predictions")
    .upsert(
      {
        user_id: kid.id,
        season,
        status: "draft",
        standings: picks.standings,
        play_in: picks.play_in,
        bracket: picks.bracket,
        awards: picks.awards,
        hot_take: picks.hot_take || null,
      },
      { onConflict: "user_id,season" },
    )
    .select("updated_at")
    .single();

  if (error) {
    console.error(JSON.stringify({ scope: "predictions.save", err: error.message }));
    const locked = error.message.includes("locked");
    return NextResponse.json({ error: locked ? "locked" : "save_failed" }, { status: locked ? 409 : 500 });
  }
  return NextResponse.json({ ok: true, updated_at: data.updated_at });
}
