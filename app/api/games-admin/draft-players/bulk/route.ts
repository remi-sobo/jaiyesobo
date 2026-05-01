import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["pending", "verified", "rejected"]);

/**
 * Bulk update verification_status for many players at once.
 * Body: { ids: string[], verification_status: 'verified' | 'rejected' | 'pending' }
 */
export async function POST(req: Request) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { ids, verification_status } = body as { ids?: unknown; verification_status?: unknown };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "no_ids" }, { status: 400 });
  }
  if (typeof verification_status !== "string" || !STATUSES.has(verification_status)) {
    return NextResponse.json({ error: "bad_status" }, { status: 400 });
  }
  const idStrs = ids.filter((id): id is string => typeof id === "string");

  const supa = createServiceClient();
  const { error } = await supa
    .from("game_content")
    .update({ verification_status })
    .eq("content_type", "draft_player")
    .in("id", idStrs);
  if (error) {
    console.error("Bulk verify failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count: idStrs.length });
}
