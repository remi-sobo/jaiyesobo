import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { generateCutSet } from "@/lib/games/the-cut-generate";
import { isCutSetDifficulty } from "@/lib/games/the-cut";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type Body = {
  criterion?: string;
  difficulty?: string;
  category?: string;
};

export async function POST(req: Request) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const criterion = typeof body.criterion === "string" ? body.criterion.trim() : "";
  if (!criterion) return NextResponse.json({ error: "missing_criterion" }, { status: 400 });

  const difficulty = isCutSetDifficulty(body.difficulty) ? body.difficulty : "medium";
  const category =
    typeof body.category === "string" && body.category.trim().length > 0
      ? body.category.trim()
      : "general";

  const generated = await generateCutSet({ criterion, difficulty, category });
  if (!generated.ok) {
    console.error(
      JSON.stringify({ scope: "games-admin.cut-sets.generate", err: generated.error })
    );
    return NextResponse.json({ error: "ai_failed", detail: generated.error }, { status: 502 });
  }

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("game_content")
    .insert({
      game_slug: "the-cut",
      content_type: "cut_set",
      payload: generated.payload,
      status: "draft",
      verification_status: "pending",
      created_by_curator: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(
      JSON.stringify({ scope: "games-admin.cut-sets.generate.insert", err: error?.message })
    );
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, payload: generated.payload });
}
