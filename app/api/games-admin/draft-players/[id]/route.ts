import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { validatePlayer } from "@/lib/draft-validate";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = new Set(["pending", "verified", "rejected"]);

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

  const { verification_status, payload } = body as {
    verification_status?: unknown;
    payload?: unknown;
  };

  const update: Record<string, unknown> = {};
  if (typeof verification_status === "string" && STATUSES.has(verification_status)) {
    update.verification_status = verification_status;
  }
  if (payload && typeof payload === "object") {
    const v = validatePlayer(payload);
    if (!v.ok) return NextResponse.json({ error: "validation_failed", detail: v.error }, { status: 400 });
    update.payload = v.player;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("game_content")
    .update(update)
    .eq("id", id)
    .eq("content_type", "draft_player");
  if (error) {
    console.error("Draft player update failed:", error);
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
    .eq("content_type", "draft_player");
  if (error) {
    console.error("Draft player delete failed:", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
