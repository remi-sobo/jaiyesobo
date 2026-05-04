import { NextResponse } from "next/server";
import { ensureCurrentSession, sessionKey } from "@/lib/games/session";
import { createServiceClient } from "@/lib/supabase/server";
import { shareToken } from "@/lib/games/data";
import { getPlayableCrosswordByThemeSlug } from "@/lib/games/crossword-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { theme_slug } = body as { theme_slug?: unknown };
  if (typeof theme_slug !== "string" || theme_slug.trim().length === 0) {
    return NextResponse.json({ error: "missing_theme_slug" }, { status: 400 });
  }

  const pack = await getPlayableCrosswordByThemeSlug(theme_slug);
  if (!pack) {
    return NextResponse.json({ error: "pack_not_found" }, { status: 404 });
  }
  const layout = pack.payload.crossword_grid;
  if (!layout) {
    return NextResponse.json({ error: "no_grid" }, { status: 404 });
  }

  const session = await ensureCurrentSession();
  const { user_id, anon_session_id } = sessionKey(session);

  const supa = createServiceClient();
  const token = shareToken();
  const { data, error } = await supa
    .from("plays")
    .insert({
      game_slug: "crossword",
      user_id,
      anon_session_id,
      payload: {
        pack_id: pack.id,
        theme_slug: pack.payload.theme_slug,
        title: pack.payload.title,
        subtitle: pack.payload.subtitle,
        difficulty: pack.payload.difficulty,
        size: layout.size,
        team_slug: pack.payload.team_slug,
        total_cells: layout.placed.reduce((acc, p) => acc + p.cells.length, 0),
      },
      result: null,
      share_token: token,
    })
    .select("id, share_token")
    .single();

  if (error || !data) {
    console.error(JSON.stringify({ scope: "games.crossword.start", err: error?.message }));
    return NextResponse.json({ error: "play_failed" }, { status: 500 });
  }

  return NextResponse.json({
    play_id: data.id,
    share_token: data.share_token,
    pack: {
      id: pack.id,
      theme_slug: pack.payload.theme_slug,
      title: pack.payload.title,
      subtitle: pack.payload.subtitle,
      difficulty: pack.payload.difficulty,
      team_slug: pack.payload.team_slug,
      layout,
    },
  });
}
