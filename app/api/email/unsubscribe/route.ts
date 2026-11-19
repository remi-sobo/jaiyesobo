import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/email/subscribers";

export const dynamic = "force-dynamic";

/**
 * POST /api/email/unsubscribe?t=<manage token>
 *
 * The one click unsubscribe that mail apps call from the List-Unsubscribe
 * header. A GET never unsubscribes (link scanners open links): it sends the
 * person to the preferences page, where one button does it.
 */
export async function POST(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  try {
    const ok = await unsubscribe(t);
    return NextResponse.json(ok ? { ok: true } : { error: "invalid_link" }, { status: ok ? 200 : 400 });
  } catch (e) {
    console.error(JSON.stringify({ scope: "email.unsubscribe", err: String(e) }));
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  return NextResponse.redirect(new URL(`/email/preferences?t=${encodeURIComponent(t)}`, req.url), 303);
}
