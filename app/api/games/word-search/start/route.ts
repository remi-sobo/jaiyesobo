import { NextResponse } from "next/server";
import { ensureCurrentSession, sessionKey } from "@/lib/games/session";
import { createServiceClient } from "@/lib/supabase/server";
import { shareToken } from "@/lib/games/data";
import { getWordPackByThemeSlug } from "@/lib/games/word-search-data";

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

  const pack = await getWordPackByThemeSlug(theme_slug);
  if (!pack || pack.status !== "live" || pack.verification_status !== "verified") {
    return NextResponse.json({ error: "pack_not_found" }, { status: 404 });
  }

  const session = await ensureCurrentSession();
  const { user_id, anon_session_id } = sessionKey(session);

  const supa = createServiceClient();
  const token = shareToken();
  const { data, error } = await supa
    .from("plays")
    .insert({
      game_slug: "word-search",
      user_id,
      anon_session_id,
      payload: {
        pack_id: pack.id,
        theme_slug: pack.payload.theme_slug,
        title: pack.payload.title,
        subtitle: pack.payload.subtitle,
        difficulty: pack.payload.difficulty,
        grid_size: pack.payload.grid_size,
        team_slug: pack.payload.team_slug,
        words: pack.payload.words.map((w) => w.word),
        words_found: [] as string[],
      },
      result: null,
      share_token: token,
    })
    .select("id, share_token")
    .single();

  if (error || !data) {
    console.error(JSON.stringify({ scope: "games.word-search.start", err: error?.message }));
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
      grid_size: pack.payload.grid_size,
      team_slug: pack.payload.team_slug,
      words: pack.payload.words,
    },
  });
}
