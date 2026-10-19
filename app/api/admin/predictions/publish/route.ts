import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getActiveKid } from "@/lib/admin-context";
import { createServiceClient } from "@/lib/supabase/server";
import { getPrediction } from "@/lib/nba/data";
import { isSeasonSlug, missingPicks } from "@/lib/nba/logic";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/predictions/publish { season }
 *
 * Locks the active kid's draft. One update flips status and stamps
 * published_at; the database trigger re-checks every pick and refuses the
 * update if anything is missing, so this can't be skipped from a script.
 */
export async function POST(req: Request) {
  await requireAdmin();

  let body: { season?: unknown };
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
  const row = await getPrediction(kid.id, season);
  if (!row) return NextResponse.json({ error: "no_draft" }, { status: 404 });
  if (row.status === "published") {
    return NextResponse.json({ error: "already_published" }, { status: 409 });
  }

  const missing = missingPicks(row);
  if (missing.length > 0) {
    return NextResponse.json({ error: "incomplete", missing }, { status: 422 });
  }

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("nba_predictions")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("status", "draft")
    .select("published_at")
    .single();

  if (error) {
    console.error(JSON.stringify({ scope: "predictions.publish", err: error.message }));
    return NextResponse.json({ error: "publish_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, published_at: data.published_at });
}
