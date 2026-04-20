import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Context) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { answer } = body as { answer?: unknown };
  if (typeof answer !== "string" || answer.trim().length === 0) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supa = createServiceClient();
  const { error } = await supa
    .from("questions")
    .update({
      answer: answer.trim(),
      answered_at: new Date().toISOString(),
      status: "answered",
      seen_at: null,
    })
    .eq("id", id);
  if (error) {
    console.error("Question reply failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
