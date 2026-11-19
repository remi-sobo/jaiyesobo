import crypto from "node:crypto";

/**
 * Signed picker links for the morning email. A token opens one batch's
 * comments for 72 hours, nothing else. Revoking the batch (ig_batches.revoked_at)
 * kills it early. Format: base64url(JSON) + "." + base64url(HMAC-SHA256), signed
 * with SESSION_SECRET under its own "ig-replies:" prefix so it can't be swapped
 * for any other token on the site.
 */

export const PICKER_TTL_MS = 72 * 60 * 60 * 1000;

type Payload = { b: string; exp: number };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return s;
}

const mac = (body: string) => crypto.createHmac("sha256", secret()).update(`ig-replies:${body}`).digest("base64url");

export function createPickerToken(batchId: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ b: batchId, exp: now + PICKER_TTL_MS } satisfies Payload)).toString("base64url");
  return `${body}.${mac(body)}`;
}

export function verifyPickerToken(token: string | null | undefined, now = Date.now()): { batchId: string } | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = mac(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (typeof p.b !== "string" || typeof p.exp !== "number" || p.exp < now) return null;
    return { batchId: p.b };
  } catch {
    return null;
  }
}
