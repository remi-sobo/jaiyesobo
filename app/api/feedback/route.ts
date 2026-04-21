import { NextResponse } from "next/server";
import { getKidSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getJaiye } from "@/lib/data";

const ALLOWED_KIND = new Set(["bug", "idea", "unsure"]);

export async function POST(req: Request) {
  const session = await getKidSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const {
    body: text,
    kind,
    page_url,
    user_agent,
  } = body as { body?: unknown; kind?: unknown; page_url?: unknown; user_agent?: unknown };

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }
  if (text.trim().length > 2000) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }
  const kindClean =
    typeof kind === "string" && ALLOWED_KIND.has(kind) ? (kind as "bug" | "idea" | "unsure") : null;

  const jaiye = await getJaiye();
  if (!jaiye) return NextResponse.json({ error: "no_user" }, { status: 500 });

  const supa = createServiceClient();
  const { error } = await supa.from("feedback").insert({
    submitted_by: jaiye.id,
    body: text.trim(),
    kind: kindClean,
    page_url: typeof page_url === "string" ? page_url.slice(0, 500) : null,
    user_agent: typeof user_agent === "string" ? user_agent.slice(0, 500) : null,
  });
  if (error) {
    console.error(JSON.stringify({ scope: "feedback", msg: "insert_failed", err: error.message }));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
