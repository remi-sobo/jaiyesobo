import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeBlindRankTopicPayload } from "@/lib/games/blind-rank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: {
    payload?: unknown;
    status?: string;
    verification_status?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.payload !== undefined) {
    const normalized = normalizeBlindRankTopicPayload(body.payload);
    if (!normalized.ok) {
      return NextResponse.json(
        { error: "validation_failed", detail: normalized.error },
        { status: 400 }
      );
    }
    update.payload = normalized.payload;
  }

  if (body.status !== undefined) {
    if (!["draft", "live", "archived"].includes(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    update.status = body.status;
  }

  if (body.verification_status !== undefined) {
    if (
      !["pending", "verified", "rejected"].includes(body.verification_status)
    ) {
      return NextResponse.json(
        { error: "invalid_verification_status" },
        { status: 400 }
      );
    }
    update.verification_status = body.verification_status;
  }

  if (update.status === "live" || update.verification_status === "verified") {
    const supa = createServiceClient();
    const { data: existing } = await supa
      .from("game_content")
      .select("payload")
      .eq("id", id)
      .eq("game_slug", "blind-rank")
      .eq("content_type", "blind_rank_topic")
      .maybeSingle();
    const merged = (update.payload as unknown) ?? existing?.payload;
    const valid = normalizeBlindRankTopicPayload(merged);
    if (!valid.ok) {
      return NextResponse.json(
        { error: "cannot_publish_invalid_topic", detail: valid.error },
        { status: 400 }
      );
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("game_content")
    .update(update)
    .eq("id", id)
    .eq("game_slug", "blind-rank")
    .eq("content_type", "blind_rank_topic");
  if (error) {
    console.error(
      JSON.stringify({ scope: "games-admin.blind-rank.patch", err: error.message })
    );
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
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
    .eq("game_slug", "blind-rank")
    .eq("content_type", "blind_rank_topic");
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
