import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getAllGames } from "@/lib/games/data";
import { getGamesAudience, setGamesAudience, type GamesAudience } from "@/lib/games/audience";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/games/audience/seed
 *
 * Idempotent first-time seed. Writes the default per-kid audience map:
 *   - Jaiye: every game currently in the games table that isn't 'think-tank'
 *     and isn't archived.
 *   - Kemi: ['think-tank'] (Deductive logic puzzles, hosted on kemisobo.com).
 *
 * Subsequent runs MERGE — they don't clobber any manual toggles already in
 * place. They only add slugs Jaiye is missing and ensure 'think-tank' is on
 * Kemi's list.
 */
export async function POST() {
  await requireAdmin();

  const [allGames, current] = await Promise.all([getAllGames(), getGamesAudience()]);

  const baselineJaiye = allGames
    .filter((g) => g.slug !== "think-tank" && g.status !== "archived")
    .map((g) => g.slug);
  const baselineKemi = ["think-tank"];

  const next: GamesAudience = current
    ? {
        jaiye: mergeUnique(current.jaiye, baselineJaiye),
        kemi: mergeUnique(current.kemi, baselineKemi),
      }
    : {
        jaiye: baselineJaiye,
        kemi: baselineKemi,
      };

  await setGamesAudience(next);
  return NextResponse.json({
    ok: true,
    seeded: !current,
    audience: next,
    summary: {
      jaiye_count: next.jaiye.length,
      kemi_count: next.kemi.length,
    },
  });
}

function mergeUnique(a: string[], b: string[]): string[] {
  const set = new Set([...a, ...b]);
  return [...set];
}
