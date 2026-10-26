import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * iPhone app sign-ins. The app keeps a random token in the iOS keychain and
 * sends it as `Authorization: Bearer <token>`. Only the SHA-256 of the token is
 * stored, so a database leak can't be replayed as a sign-in.
 */

const db = () => createServiceClient();

export function newToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Pulls a well formed bearer token out of a request, or null. */
export function bearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(h.trim());
  return m ? m[1] : null;
}

export async function createSession(playerId: string): Promise<string> {
  const token = newToken();
  const { error } = await db().from("sb_app_sessions").insert({ player_id: playerId, token_hash: hashToken(token) });
  if (error) throw error;
  await db().from("sb_players").update({ platform: "ios", last_seen_at: new Date().toISOString() }).eq("id", playerId);
  return token;
}

/** The player id behind a token, if the session is live and the account isn't deleted. */
export async function playerForToken(token: string): Promise<string | null> {
  const supa = db();
  const { data } = await supa
    .from("sb_app_sessions")
    .select("id, player_id, revoked, last_used_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data || data.revoked) return null;
  const { data: p } = await supa.from("sb_players").select("id, deleted_at").eq("id", data.player_id).maybeSingle();
  if (!p || p.deleted_at) return null;
  // Touch at most once an hour so reads stay cheap.
  if (Date.now() - Date.parse(data.last_used_at as string) > 3_600_000) {
    const now = new Date().toISOString();
    await supa.from("sb_app_sessions").update({ last_used_at: now }).eq("id", data.id);
    await supa.from("sb_players").update({ last_seen_at: now }).eq("id", data.player_id);
  }
  return data.player_id as string;
}

export async function revokeSession(token: string): Promise<void> {
  await db().from("sb_app_sessions").update({ revoked: true }).eq("token_hash", hashToken(token));
}
