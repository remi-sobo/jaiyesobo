import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { validatePlayerArray } from "@/lib/draft-validate";
import type { DraftPlayerPayload } from "@/lib/draft-data";

import hornets from "@/data/draft-players-seed/hornets.json";
import pelicans from "@/data/draft-players-seed/pelicans.json";
import pacers from "@/data/draft-players-seed/pacers.json";
import wizards from "@/data/draft-players-seed/wizards.json";
import kings from "@/data/draft-players-seed/kings.json";
import timberwolves from "@/data/draft-players-seed/timberwolves.json";
import clippers from "@/data/draft-players-seed/clippers.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/games/draft-wheel/import-players
 *
 * Bulk-imports the pre-curated rosters for the 7 new franchises directly
 * into game_content as verified draft_player rows. JSON files live in
 * /data/draft-players-seed/ and are imported at build time so the
 * payload travels with the lambda.
 *
 * Idempotent: existing player names per team (case-insensitive) are skipped.
 */

const TEAM_FILES: Record<string, unknown[]> = {
  hornets,
  pelicans,
  pacers,
  wizards,
  kings,
  timberwolves,
  clippers,
};

type ImportResult = {
  slug: string;
  inserted: number;
  skipped: number;
  errors: string[];
  team_missing?: boolean;
  validation_failed?: string[];
};

export async function POST() {
  await requireAdmin();
  const supa = createServiceClient();

  const results: ImportResult[] = [];

  for (const [slug, payload] of Object.entries(TEAM_FILES)) {
    const validation = validatePlayerArray(payload);
    if (!validation.ok) {
      results.push({
        slug,
        inserted: 0,
        skipped: 0,
        errors: [],
        validation_failed: validation.errors.slice(0, 5),
      });
      continue;
    }

    // Confirm team exists in DB.
    const { data: team } = await supa
      .from("game_content")
      .select("id")
      .eq("game_slug", "draft")
      .eq("content_type", "draft_team")
      .eq("draft_team_slug", slug)
      .maybeSingle();
    if (!team) {
      results.push({ slug, inserted: 0, skipped: 0, errors: [], team_missing: true });
      continue;
    }

    // Pre-fetch existing player names for idempotency.
    const { data: existing } = await supa
      .from("game_content")
      .select("payload")
      .eq("game_slug", "draft")
      .eq("content_type", "draft_player")
      .eq("draft_team_slug", slug);
    const existingNames = new Set(
      (existing ?? [])
        .map((r) => (r as { payload: { name?: string } }).payload?.name)
        .filter((n): n is string => typeof n === "string")
        .map((n) => n.toLowerCase().trim())
    );

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const player of validation.players as DraftPlayerPayload[]) {
      const k = player.name.toLowerCase().trim();
      if (existingNames.has(k)) {
        skipped++;
        continue;
      }
      const { error } = await supa.from("game_content").insert({
        game_slug: "draft",
        content_type: "draft_player",
        draft_team_slug: slug,
        payload: player,
        status: "live",
        verification_status: "verified",
        created_by_curator: false,
      });
      if (error) {
        errors.push(`${player.name}: ${error.message}`);
        continue;
      }
      existingNames.add(k);
      inserted++;
    }
    results.push({ slug, inserted, skipped, errors });
  }

  const totals = results.reduce(
    (acc, r) => ({
      inserted: acc.inserted + r.inserted,
      skipped: acc.skipped + r.skipped,
      errors: acc.errors + r.errors.length,
    }),
    { inserted: 0, skipped: 0, errors: 0 }
  );
  const teamsMissing = results.filter((r) => r.team_missing).length;
  const ok = teamsMissing === 0 && totals.errors === 0;

  return NextResponse.json({
    ok,
    totals,
    teams_missing: teamsMissing,
    note: teamsMissing > 0 ? "Run seed-teams first — some teams aren't registered yet." : undefined,
    by_team: results,
  });
}
