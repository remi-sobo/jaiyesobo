import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { validatePlayerArray } from "@/lib/draft-validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { teamSlug, players } = body as { teamSlug?: unknown; players?: unknown };
  if (typeof teamSlug !== "string" || teamSlug.trim().length === 0) {
    return NextResponse.json({ error: "missing_team_slug" }, { status: 400 });
  }

  const validation = validatePlayerArray(players);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "validation_failed", errors: validation.errors },
      { status: 400 }
    );
  }

  const supa = createServiceClient();

  // Verify the team exists
  const { data: team } = await supa
    .from("game_content")
    .select("id")
    .eq("game_slug", "draft")
    .eq("content_type", "draft_team")
    .eq("draft_team_slug", teamSlug)
    .maybeSingle();
  if (!team) {
    return NextResponse.json({ error: "team_not_found" }, { status: 404 });
  }

  // Pre-fetch existing player names for idempotency
  const { data: existing } = await supa
    .from("game_content")
    .select("payload")
    .eq("game_slug", "draft")
    .eq("content_type", "draft_player")
    .eq("draft_team_slug", teamSlug);
  const existingNames = new Set(
    (existing ?? [])
      .map((r) => (r as { payload: { name?: string } }).payload?.name)
      .filter((n): n is string => typeof n === "string")
      .map((n) => n.toLowerCase().trim())
  );

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const player of validation.players) {
    const key = player.name.toLowerCase().trim();
    if (existingNames.has(key)) {
      skipped++;
      continue;
    }
    const { error } = await supa.from("game_content").insert({
      game_slug: "draft",
      content_type: "draft_player",
      draft_team_slug: teamSlug,
      payload: player,
      status: "live",
      verification_status: "pending",
      created_by_curator: false,
    });
    if (error) {
      errors.push(`${player.name}: ${error.message}`);
      continue;
    }
    existingNames.add(key);
    inserted++;
  }

  return NextResponse.json({ inserted, skipped, errors });
}
