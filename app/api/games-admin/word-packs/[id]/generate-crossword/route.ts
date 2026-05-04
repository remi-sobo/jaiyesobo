import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getWordPackById } from "@/lib/games/word-search-data";
import { generateCrossword, crosswordSizeFor } from "@/lib/games/crossword";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/games-admin/word-packs/[id]/generate-crossword
 *
 * Reads the pack's current words, runs the deterministic crossword placer,
 * and writes the resulting layout to payload.crossword_grid. Returns the
 * layout + counts of placed/dropped words so the verify UI can render a
 * preview and warn about anything that fell off.
 *
 * Idempotent — same input ⇒ same grid. Re-runnable any time.
 */
export async function POST(_req: Request, { params }: Ctx) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const pack = await getWordPackById(id);
  if (!pack) {
    return NextResponse.json({ error: "pack_not_found" }, { status: 404 });
  }

  const size = crosswordSizeFor(pack.payload.difficulty);
  const layout = generateCrossword(pack.payload.words, size);

  if (layout.placed.length < 2) {
    return NextResponse.json(
      {
        error: "placement_failed",
        detail:
          "The placer couldn't lay out enough words to make a real puzzle. Edit the word list (more shared letters help) and try again.",
        placed: layout.placed.length,
        dropped: layout.dropped,
      },
      { status: 422 }
    );
  }

  const supa = createServiceClient();
  const newPayload = { ...pack.payload, crossword_grid: layout };
  const { error } = await supa
    .from("game_content")
    .update({ payload: newPayload })
    .eq("id", id)
    .eq("game_slug", "word-search")
    .eq("content_type", "word_pack");
  if (error) {
    console.error(
      JSON.stringify({ scope: "games-admin.word-packs.generate-crossword", err: error.message })
    );
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    layout,
    placed_count: layout.placed.length,
    dropped: layout.dropped,
  });
}
