import crypto from "node:crypto";
import { isUuid } from "./rules";

/**
 * Signed, URL safe tokens for email links. A token says "this link is for
 * subscriber X, for this one purpose". Confirm links expire in 7 days; manage
 * links (preferences and unsubscribe) never do, because an unsubscribe link in
 * an old email has to keep working. A confirm token also carries `v`, the
 * subscriber row's `updated_at` (epoch ms) when it was issued; it only works
 * while the row is unchanged.
 *
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256). Signed with
 * SESSION_SECRET.
 */

export type TokenPurpose = "confirm" | "manage";
export type TokenPayload = { sid: string; purpose: TokenPurpose; exp?: number; v?: number };

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return s;
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

function mac(body: string): string {
  return crypto.createHmac("sha256", secret()).update(`email:${body}`).digest("base64url");
}

/** `exp` is epoch milliseconds. Confirm tokens default to 7 days from now; manage tokens get none. */
export function sign(p: { sid: string; purpose: TokenPurpose; exp?: number; v?: number }, now = Date.now()): string {
  const payload: TokenPayload = { sid: p.sid, purpose: p.purpose };
  const exp = p.exp ?? (p.purpose === "confirm" ? now + SEVEN_DAYS_MS : undefined);
  if (exp !== undefined) payload.exp = exp;
  if (p.v !== undefined) payload.v = p.v;
  const body = b64(JSON.stringify(payload));
  return `${body}.${mac(body)}`;
}

/** The payload if the token is genuine, unexpired and (when given) for this purpose. Otherwise null. Never throws. */
export function verify(token: unknown, purpose?: TokenPurpose, now = Date.now()): TokenPayload | null {
  try {
    if (typeof token !== "string" || token.length > 600) return null;
    const [body, sig, extra] = token.split(".");
    if (!body || !sig || extra !== undefined) return null;
    const expected = Buffer.from(mac(body));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<TokenPayload>;
    if (typeof p.sid !== "string" || (p.purpose !== "confirm" && p.purpose !== "manage")) return null;
    if (purpose && p.purpose !== purpose) return null;
    if (p.exp !== undefined && (typeof p.exp !== "number" || p.exp < now)) return null;
    if (p.v !== undefined && typeof p.v !== "number") return null;
    return { sid: p.sid, purpose: p.purpose, ...(p.exp !== undefined ? { exp: p.exp } : {}), ...(p.v !== undefined ? { v: p.v } : {}) };
  } catch {
    return null;
  }
}

/** Like `verify`, but also requires the subscriber id to be a uuid, so a token for anything else (the test newsletter's "test") never reaches the database. */
export function verifyForDb(token: unknown, purpose: TokenPurpose, now = Date.now()): TokenPayload | null {
  const t = verify(token, purpose, now);
  return t && isUuid(t.sid) ? t : null;
}

/** True when a confirm token's version is the row's current `updated_at`. A token with no version never matches. */
export function versionMatches(v: number | undefined, rowUpdatedAt: string | number | Date | null | undefined): boolean {
  if (typeof v !== "number" || rowUpdatedAt === null || rowUpdatedAt === undefined) return false;
  const ms = rowUpdatedAt instanceof Date ? rowUpdatedAt.getTime() : typeof rowUpdatedAt === "number" ? rowUpdatedAt : Date.parse(rowUpdatedAt);
  return Number.isFinite(ms) && ms === v;
}
