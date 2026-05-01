import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fire-and-forget: log a query that returned 0 results so we can later
 * back-fill missing aliases. Non-blocking — client doesn't wait.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }
  const { team_slug, query } = body as { team_slug?: unknown; query?: unknown };
  if (typeof query !== "string" || query.trim().length === 0 || query.length > 80) {
    return NextResponse.json({ ok: true });
  }

  const supa = createServiceClient();
  await supa.from("draft_failed_searches").insert({
    search_term: query.trim(),
    team_slug: typeof team_slug === "string" ? team_slug : null,
  });
  return NextResponse.json({ ok: true });
}
