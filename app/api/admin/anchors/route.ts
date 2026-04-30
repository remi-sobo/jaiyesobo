import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { ensureJaiye } from "@/lib/admin-data";
import { getAllAnchorsForUser, createAnchor } from "@/lib/anchors";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const jaiye = await ensureJaiye();
  const anchors = await getAllAnchorsForUser(jaiye.id);
  return NextResponse.json({ anchors });
}

export async function POST(req: Request) {
  const s = await getAdminSession();
  if (!s) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const {
    date,
    start_time,
    end_time,
    title,
    subtitle,
    emoji,
    recurring_pattern,
  } = body as Record<string, unknown>;

  if (typeof start_time !== "string" || typeof end_time !== "string" || typeof title !== "string") {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const isOneTime = !recurring_pattern;
  const isRecurring = !!recurring_pattern;
  if (isOneTime && typeof date !== "string") {
    return NextResponse.json({ error: "date_required_for_one_time" }, { status: 400 });
  }
  if (isRecurring && date) {
    return NextResponse.json({ error: "date_must_be_null_for_recurring" }, { status: 400 });
  }

  const jaiye = await ensureJaiye();
  try {
    const anchor = await createAnchor({
      user_id: jaiye.id,
      date: typeof date === "string" ? date : null,
      start_time,
      end_time,
      title,
      subtitle: typeof subtitle === "string" ? subtitle : null,
      emoji: typeof emoji === "string" && emoji.length > 0 ? emoji : "🔒",
      recurring_pattern: typeof recurring_pattern === "string" ? recurring_pattern : null,
    });
    return NextResponse.json({ anchor });
  } catch (err) {
    console.error(JSON.stringify({ scope: "anchors.create", err: String(err) }));
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
}
