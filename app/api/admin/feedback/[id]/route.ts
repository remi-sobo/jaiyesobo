import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = new Set(["new", "in_progress", "fixed", "closed"]);

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { status, reply, archived } = body as {
    status?: unknown;
    reply?: unknown;
    archived?: unknown;
  };

  const update: Record<string, unknown> = {};
  if (typeof status === "string" && STATUSES.has(status)) {
    update.status = status;
  }
  if (typeof reply === "string" && reply.trim().length > 0) {
    update.dad_reply = reply.trim();
    update.dad_replied_at = new Date().toISOString();
    update.seen_by_kid_at = null; // reset so it surfaces on kid Today
    if (!update.status) update.status = "in_progress";
  }
  if (archived === true) {
    update.archived_at = new Date().toISOString();
  } else if (archived === false) {
    update.archived_at = null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { error } = await supa.from("feedback").update(update).eq("id", id);
  if (error) {
    console.error("Feedback update failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
