import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/games/draft-wheel/register
 *
 * Idempotent: ensures the 'draft-wheel' row exists in the games table so it
 * appears on the /games hub. This is the runtime equivalent of migration
 * 019_draft_wheel.sql.
 */
export async function POST() {
  await requireAdmin();

  const supa = createServiceClient();
  const { data: existing } = await supa
    .from("games")
    .select("slug, status")
    .eq("slug", "draft-wheel")
    .maybeSingle();

  if (existing) {
    if (existing.status !== "live") {
      const { error: upErr } = await supa
        .from("games")
        .update({ status: "live" })
        .eq("slug", "draft-wheel");
      if (upErr) {
        return NextResponse.json({ error: "promote_failed", detail: upErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, created: false, promoted: true });
    }
    return NextResponse.json({ ok: true, created: false, note: "Already live" });
  }

  const { error } = await supa.from("games").insert({
    slug: "draft-wheel",
    title: "Draft Wheel",
    description: "Spin the team. Pick the best at the spot. AI calls it.",
    status: "live",
  });
  if (error) {
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, created: true });
}
