import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Context) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const supa = createServiceClient();
  const { error } = await supa
    .from("completions")
    .update({ reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("Review mark failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
