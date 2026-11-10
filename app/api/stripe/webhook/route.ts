import { NextResponse } from "next/server";
import Stripe from "stripe";
import { grantPass } from "@/lib/sportsbook/pass";
import { SB_SEASON } from "@/lib/sportsbook/weeks";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST /api/stripe/webhook  Stripe says a checkout was paid; turn on that player's pass. No cookie here, the signature is the auth. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error(JSON.stringify({ scope: "pass.webhook", err: "STRIPE_WEBHOOK_SECRET not set" }));
    return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 503 });
  }
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(body, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    const playerId = session.metadata?.player_id;
    if (session.payment_status === "paid" && session.metadata?.season === SB_SEASON && playerId && UUID.test(playerId)) {
      try {
        await grantPass(playerId, { stripe_session_id: session.id });
      } catch (e) {
        // A non-2xx makes Stripe retry, and the grant is idempotent.
        console.error(JSON.stringify({ scope: "pass.webhook", playerId, session: session.id, err: String(e) }));
        return NextResponse.json({ error: "Couldn't switch the pass on." }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ received: true });
}
