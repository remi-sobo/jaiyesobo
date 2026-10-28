import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const grantPass = vi.fn();
vi.mock("@/lib/sportsbook/pass", () => ({ grantPass: (...a: unknown[]) => grantPass(...a) }));

import { POST } from "@/app/api/stripe/webhook/route";

const SECRET = "whsec_test_secret";
const PLAYER = "0b6f3c1e-9a52-4d8e-8f3a-5c1d2e7a9b40";

function session(over: Record<string, unknown> = {}) {
  return { id: "cs_test_1", object: "checkout.session", payment_status: "paid", metadata: { player_id: PLAYER, season: "2026-27" }, ...over };
}

function call(type: string, object: unknown, sign = true) {
  const payload = JSON.stringify({ id: "evt_1", object: "event", type, data: { object } });
  const headers: Record<string, string> = {};
  if (sign) headers["stripe-signature"] = Stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers }));
}

describe("stripe webhook", () => {
  beforeEach(() => {
    grantPass.mockReset();
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  });

  it("rejects a missing or wrong signature", async () => {
    expect((await call("checkout.session.completed", session(), false)).status).toBe(400);
    const bad = new Request("http://localhost/x", { method: "POST", body: "{}", headers: { "stripe-signature": "t=1,v1=abc" } });
    expect((await POST(bad)).status).toBe(400);
    expect(grantPass).not.toHaveBeenCalled();
  });

  it("grants the pass for a paid session this season", async () => {
    const res = await call("checkout.session.completed", session());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(grantPass).toHaveBeenCalledWith(PLAYER, { stripe_session_id: "cs_test_1" });
  });

  it("grants on a late async payment", async () => {
    await call("checkout.session.async_payment_succeeded", session());
    expect(grantPass).toHaveBeenCalledTimes(1);
  });

  it("ignores unpaid, wrong season, bad ids and other events", async () => {
    await call("checkout.session.completed", session({ payment_status: "unpaid" }));
    await call("checkout.session.completed", session({ metadata: { player_id: PLAYER, season: "2025-26" } }));
    await call("checkout.session.completed", session({ metadata: { player_id: "not-a-uuid", season: "2026-27" } }));
    await call("checkout.session.completed", session({ metadata: null }));
    const other = await call("charge.refunded", { id: "ch_1", object: "charge" });
    expect(other.status).toBe(200);
    expect(grantPass).not.toHaveBeenCalled();
  });

  it("answers 500 so Stripe retries when the grant fails", async () => {
    grantPass.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call("checkout.session.completed", session())).status).toBe(500);
  });
});
