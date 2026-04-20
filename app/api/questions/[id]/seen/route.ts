import { NextResponse } from "next/server";
import { getKidSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Context) {
  const session = await getKidSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const supa = createServiceClient();
  const { error } = await supa
    .from("questions")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("Question seen failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
