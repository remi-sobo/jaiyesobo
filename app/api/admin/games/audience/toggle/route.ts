import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { KID_SLUGS, type KidSlug, toggleGameKid } from "@/lib/games/audience";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/games/audience/toggle
 *   Body: { game_slug: string, kid: "jaiye" | "kemi", on: boolean }
 *   Returns: { ok, audience }
 *
 * Flips a single game's visibility on a single kid's hub. Used by the
 * admin grid UI on /admin/setup.
 */
export async function POST(req: Request) {
  await requireAdmin();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { game_slug, kid, on } = body as {
    game_slug?: unknown;
    kid?: unknown;
    on?: unknown;
  };
  if (
    typeof game_slug !== "string" ||
    typeof on !== "boolean" ||
    !KID_SLUGS.includes(kid as KidSlug)
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const audience = await toggleGameKid(game_slug, kid as KidSlug, on);
    return NextResponse.json({ ok: true, audience });
  } catch (err) {
    return NextResponse.json(
      { error: "toggle_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
