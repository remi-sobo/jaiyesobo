import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { isValidEmail, normalizeEmail } from "./rules";
import { sendEmail } from "./send";
import { logEmail } from "./subscribers";
import { loginEmail } from "./templates";

/**
 * "Email me a login code". A 13+ player whose own email is confirmed can get
 * back in on any device with a 6 digit code (or a one time link on web)
 * instead of their player code.
 *
 * - Only an address on sb_subscribers with relation 'self', confirmed at
 *   least once, linked to a live 13+ challenger counts. Parent addresses
 *   never sign anyone in.
 * - The answer to a request is the same whether or not the address belongs to
 *   anyone, so nobody can use this to check who plays.
 * - Codes and link tokens are stored only as keyed hashes. A code lasts
 *   LOGIN_MINUTES, works once, and locks after MAX_ATTEMPTS wrong tries.
 */

export const LOGIN_MINUTES = 15;
export const MAX_ATTEMPTS = 5;
/** Login emails one address can get per hour. */
export const PER_EMAIL_HOURLY = 3;

const db = () => createServiceClient();

function pepper(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return s;
}

/** Keyed hash so a leaked table can't be turned back into working codes. */
export function hashSecret(kind: "code" | "link", value: string, key = pepper()): string {
  return crypto.createHmac("sha256", key).update(`login:${kind}:${value}`).digest("hex");
}

/** Six digits, leading zeros kept. */
export function newLoginCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function newLinkToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/** Digits only, so "123 456" and "123-456" both work. */
export function cleanCode(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\D/g, "") : "";
}

export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** The live 13+ challenger this confirmed address signs in, if any. */
async function playerForEmail(email: string): Promise<{ id: string; display_name: string } | null> {
  const { data: subs } = await db()
    .from("sb_subscribers")
    .select("player_id")
    .eq("email", email)
    .eq("relation", "self")
    .not("confirmed_at", "is", null)
    .not("player_id", "is", null)
    .limit(1);
  const playerId = subs?.[0]?.player_id as string | undefined;
  if (!playerId) return null;
  const { data: p } = await db()
    .from("sb_players")
    .select("id, display_name")
    .eq("id", playerId)
    .eq("kind", "challenger")
    .eq("age_band", "13_plus")
    .is("deleted_at", null)
    .maybeSingle();
  return (p as { id: string; display_name: string } | null) ?? null;
}

export type RequestResult = { ok: true } | { ok: false; error: string };

/**
 * Sends a login code if the address signs someone in. Always answers `ok`
 * for a valid address, matched or not. Only a bad address or a send that
 * failed for a real player comes back as an error.
 */
export async function requestLoginCode(raw: unknown): Promise<RequestResult> {
  if (!isValidEmail(raw)) return { ok: false, error: "That email doesn't look right." };
  const email = normalizeEmail(raw);
  const player = await playerForEmail(email);
  if (!player) return { ok: true };

  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count } = await db().from("sb_login_codes").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
  // Over the hourly cap: say nothing different, just don't send.
  if ((count ?? 0) >= PER_EMAIL_HOURLY) return { ok: true };

  const code = newLoginCode();
  const linkToken = newLinkToken();
  const { error } = await db().from("sb_login_codes").insert({
    player_id: player.id,
    email,
    code_hash: hashSecret("code", code),
    link_hash: hashSecret("link", linkToken),
    expires_at: new Date(Date.now() + LOGIN_MINUTES * 60_000).toISOString(),
  });
  if (error) throw error;

  const mail = loginEmail({ code, linkToken, name: player.display_name, minutes: LOGIN_MINUTES });
  const result = await sendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text });
  await logEmail({ kind: "login", subscriberId: null, subject: mail.subject, result });
  if (result.status !== "sent") return { ok: false, error: "We couldn't send the email just now. Use your player code, or try again in a bit." };
  return { ok: true };
}

const BAD_CODE = "That code didn't work. Check it, or ask for a new one.";

type CodeRow = { id: string; player_id: string; code_hash: string; attempts: number; expires_at: string; used_at: string | null };

/** Checks a typed code against the newest live code for this address. Returns the player id to sign in. */
export async function verifyLoginCode(rawEmail: unknown, rawCode: unknown): Promise<{ ok: true; playerId: string } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  const code = cleanCode(rawCode);
  if (!isValidEmail(email) || code.length !== 6) return { ok: false, error: BAD_CODE };
  const { data } = await db()
    .from("sb_login_codes")
    .select("id, player_id, code_hash, attempts, expires_at, used_at")
    .eq("email", email)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  const row = (data?.[0] as CodeRow | undefined) ?? null;
  if (!row || row.attempts >= MAX_ATTEMPTS) return { ok: false, error: BAD_CODE };
  if (!sameHash(row.code_hash, hashSecret("code", code))) {
    await db().from("sb_login_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return { ok: false, error: BAD_CODE };
  }
  return claim(row.id, row.player_id);
}

/** The tap to sign in link from the email. */
export async function verifyLoginLink(rawToken: unknown): Promise<{ ok: true; playerId: string } | { ok: false; error: string }> {
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  const expired = "That link has expired or was already used. Ask for a new code.";
  if (token.length < 20 || token.length > 64) return { ok: false, error: expired };
  const { data } = await db()
    .from("sb_login_codes")
    .select("id, player_id, attempts, expires_at, used_at")
    .eq("link_hash", hashSecret("link", token))
    .maybeSingle();
  const row = data as Omit<CodeRow, "code_hash"> | null;
  if (!row || row.used_at || Date.parse(row.expires_at) <= Date.now() || row.attempts >= MAX_ATTEMPTS) return { ok: false, error: expired };
  return claim(row.id, row.player_id);
}

/** Marks a code used (only if nobody beat us to it) and checks the player is still live and 13+. */
async function claim(id: string, playerId: string): Promise<{ ok: true; playerId: string } | { ok: false; error: string }> {
  const { data } = await db().from("sb_login_codes").update({ used_at: new Date().toISOString() }).eq("id", id).is("used_at", null).select("id");
  if (!data?.length) return { ok: false, error: BAD_CODE };
  const { data: p } = await db().from("sb_players").select("id").eq("id", playerId).eq("kind", "challenger").eq("age_band", "13_plus").is("deleted_at", null).maybeSingle();
  if (!p) return { ok: false, error: BAD_CODE };
  // Old rows are only useful for the hourly count; clear anything over a day old.
  await db().from("sb_login_codes").delete().lt("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString());
  return { ok: true, playerId };
}
