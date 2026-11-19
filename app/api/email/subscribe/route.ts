import { NextResponse } from "next/server";
import { subscribe } from "@/lib/email/subscribers";
import { isValidEmail } from "@/lib/email/rules";
import { getChallenger } from "@/lib/sportsbook/players";
import { overLimit } from "@/lib/sportsbook/limits";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/email/subscribe { email, under13?, newsletter?, results?, source? }
 *
 * The fan box and the website's players. A signed in player's id is attached
 * from their cookie, and their age band (not anything in the body) decides
 * whether a parent has to say yes. Always answers the same way for a valid
 * address, whether or not it was already on the list.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!isValidEmail(body.email)) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  if (await overLimit(req, "email")) return NextResponse.json({ error: "Too many tries from here. Try again later." }, { status: 429 });

  const me = await getChallenger();
  let ageBand: string | null | undefined;
  if (me) {
    const { data } = await createServiceClient().from("sb_players").select("age_band").eq("id", me.id).maybeSingle();
    ageBand = (data?.age_band as string | null | undefined) ?? null;
  }
  // The fan box has no results to send: a visitor who isn't a player only gets the newsletter unless they ask.
  const wantResults = body.results === undefined ? !!me : body.results === true;
  const wantNewsletter = body.newsletter === undefined ? true : body.newsletter === true;
  const res = await subscribe({
    email: body.email,
    playerId: me?.id ?? null,
    ageBand,
    under13: body.under13 === true,
    source: me ? "web-player" : body.source === "join" ? "web-join" : "fan-box",
    wantResults,
    wantNewsletter,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true, status: res.status });
}
