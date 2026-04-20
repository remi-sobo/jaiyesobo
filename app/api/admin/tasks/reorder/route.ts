import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { orderedIds } = body as { orderedIds?: unknown };
  if (!Array.isArray(orderedIds) || orderedIds.some((x) => typeof x !== "string")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supa = createServiceClient();
  const updates = (orderedIds as string[]).map((id, idx) =>
    supa.from("tasks").update({ sort_order: (idx + 1) * 10 }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const firstErr = results.find((r) => r.error);
  if (firstErr?.error) {
    console.error("Reorder failed:", firstErr.error);
    return NextResponse.json({ error: "reorder_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
