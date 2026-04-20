import { NextResponse } from "next/server";
import { setKidSession } from "@/lib/session";
import { getRateLimitState, recordAttempt, identifierFor, MAX_FAILED } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const identifier = identifierFor("kid", req);
  const limit = await getRateLimitState(identifier);
  if (limit.locked) {
    return NextResponse.json(
      { error: "locked_out", retryAt: limit.retryAt, remainingTries: 0 },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const pin = (body as { pin?: unknown })?.pin;
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "bad_format" }, { status: 400 });
  }
  const expected = process.env.JAIYE_PIN;
  if (!expected || pin !== expected) {
    await new Promise((r) => setTimeout(r, 350));
    await recordAttempt(identifier, false);
    const remaining = Math.max(0, MAX_FAILED - (limit.recentFails + 1));
    return NextResponse.json(
      { error: "wrong_pin", remainingTries: remaining },
      { status: 401 }
    );
  }
  await setKidSession();
  await recordAttempt(identifier, true);
  return NextResponse.json({ ok: true });
}
