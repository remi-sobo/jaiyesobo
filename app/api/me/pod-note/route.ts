import { NextResponse } from "next/server";
import { getAdminSession, getKidSession } from "@/lib/session";
import { savePodNote } from "@/lib/sportsbook/pod-notes";
import { SB_SEASON } from "@/lib/sportsbook/weeks";

export const dynamic = "force-dynamic";

const KEY_RE = /^[a-z]+(\.[a-z0-9]+)+$/;

/** POST /api/me/pod-note { week, key, answer }: saves one On The Court prep answer. Kid or parent session. */
export async function POST(req: Request) {
  const session = (await getKidSession()) ?? (await getAdminSession());
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { week, key, answer } = body;
  if (typeof week !== "number" || !Number.isInteger(week) || week < 1 || week > 40) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof key !== "string" || key.length > 80 || !KEY_RE.test(key)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof answer !== "string" || answer.length > 4000) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    await savePodNote(SB_SEASON, week, key, answer);
  } catch (e) {
    console.error(JSON.stringify({ scope: "me.pod-note", err: String(e) }));
    return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
