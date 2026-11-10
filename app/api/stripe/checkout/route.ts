import { NextResponse } from "next/server";
import Stripe from "stripe";
import { overLimit } from "@/lib/sportsbook/limits";
import { SEASON_PASS_CENTS, hasPass } from "@/lib/sportsbook/pass";
import { getChallenger } from "@/lib/sportsbook/players";
import { SB_SEASON } from "@/lib/sportsbook/weeks";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jaiyesobo.com";

/** POST /api/stripe/checkout  Starts a Season Pass checkout for this browser's player. Returns { url }, or { already } if they have it. */
export async function POST(req: Request) {
  const me = await getChallenger();
  if (!me) return NextResponse.json({ error: "Join or use your code first." }, { status: 401 });
  // Leagues need a 13+ player (canCreate), so never sell the pass to anyone else.
  const { data: ageRow } = await createServiceClient().from("sb_players").select("age_band").eq("id", me.id).maybeSingle();
  if (ageRow?.age_band !== "13_plus") return NextResponse.json({ error: "The Season Pass is for players 13 and up." }, { status: 403 });
  if (await overLimit(req, "pass")) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  try {
    if (await hasPass(me.id)) return NextResponse.json({ already: true });
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 503 });
    const session = await new Stripe(key).checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: SEASON_PASS_CENTS,
            product_data: { name: "Run It Back Picks · Season Pass", description: "Start your own leagues this season." },
          },
          quantity: 1,
        },
      ],
      client_reference_id: me.id,
      metadata: { player_id: me.id, season: SB_SEASON },
      success_url: `${SITE}/runitback/pass?done=1`,
      cancel_url: `${SITE}/runitback/pass`,
    });
    if (!session.url) throw new Error("Stripe returned no checkout url");
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error(JSON.stringify({ scope: "pass.checkout", playerId: me.id, err: String(e) }));
    return NextResponse.json({ error: "Couldn't start checkout. Try again." }, { status: 500 });
  }
}
