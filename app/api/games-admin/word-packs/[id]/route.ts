import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizePackPayload } from "@/lib/games/word-search-data";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = new Set(["draft", "live", "archived"]);
const VERIFICATION = new Set(["pending", "verified", "rejected"]);

export async function PATCH(req: Request, { params }: Ctx) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { payload, status, verification_status } = body as {
    payload?: unknown;
    status?: unknown;
    verification_status?: unknown;
  };

  const update: Record<string, unknown> = {};
  if (payload !== undefined) {
    const v = normalizePackPayload(payload);
    if (!v.ok) {
      return NextResponse.json({ error: "validation_failed", detail: v.error }, { status: 400 });
    }
    update.payload = v.payload;
    update.draft_team_slug = v.payload.team_slug;
  }
  if (typeof status === "string" && STATUSES.has(status)) {
    update.status = status;
  }
  if (typeof verification_status === "string" && VERIFICATION.has(verification_status)) {
    update.verification_status = verification_status;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("game_content")
    .update(update)
    .eq("id", id)
    .eq("game_slug", "word-search")
    .eq("content_type", "word_pack");
  if (error) {
    console.error(
      JSON.stringify({ scope: "games-admin.word-packs.patch", err: error.message })
    );
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const supa = createServiceClient();
  const { error } = await supa
    .from("game_content")
    .delete()
    .eq("id", id)
    .eq("game_slug", "word-search")
    .eq("content_type", "word_pack");
  if (error) {
    console.error(JSON.stringify({ scope: "games-admin.word-packs.delete", err: error.message }));
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
