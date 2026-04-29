import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

export const GAMES_COOKIE = "jaiye_games_session";
const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

export type AnonSession = {
  id: string;
  cookie_id: string;
  display_name: string;
  created_at: string;
  last_seen_at: string;
};

export type GameUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_adult: boolean;
  parental_consent_at: string | null;
  created_at: string;
};

export type CurrentSession =
  | { kind: "auth"; user: GameUser }
  | { kind: "anon"; session: AnonSession }
  | null;

/**
 * Server-component-safe: reads the cookie if present, returns the existing
 * session or null. Does NOT create a new session (that requires a route
 * handler so we can write the Set-Cookie response header).
 */
export async function getCurrentSession(): Promise<CurrentSession> {
  const c = await cookies();
  const cookieId = c.get(GAMES_COOKIE)?.value;
  if (!cookieId) return null;

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("anon_sessions")
    .select("*")
    .eq("cookie_id", cookieId)
    .maybeSingle();
  if (error || !data) return null;
  return { kind: "anon", session: data as AnonSession };
}

/**
 * Route-handler-safe: returns the existing session or creates a new anon
 * session, sets the cookie, and returns it. Must be called from a Route
 * Handler or Server Action so the cookie can be written.
 */
export async function ensureCurrentSession(): Promise<CurrentSession & {}> {
  const c = await cookies();
  const cookieId = c.get(GAMES_COOKIE)?.value;
  const supa = createServiceClient();

  if (cookieId) {
    const { data } = await supa
      .from("anon_sessions")
      .select("*")
      .eq("cookie_id", cookieId)
      .maybeSingle();
    if (data) {
      // Best-effort touch — fire and forget
      supa
        .from("anon_sessions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("cookie_id", cookieId)
        .then(() => undefined);
      return { kind: "anon", session: data as AnonSession };
    }
  }

  const newCookieId = randomUUID();
  const { data, error } = await supa
    .from("anon_sessions")
    .insert({ cookie_id: newCookieId })
    .select()
    .single();
  if (error || !data) {
    throw new Error(`Failed to create anon session: ${error?.message ?? "unknown"}`);
  }

  c.set(GAMES_COOKIE, newCookieId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SEC,
  });

  return { kind: "anon", session: data as AnonSession };
}

export function sessionKey(s: CurrentSession): { user_id: string | null; anon_session_id: string | null } {
  if (!s) return { user_id: null, anon_session_id: null };
  if (s.kind === "auth") return { user_id: s.user.id, anon_session_id: null };
  return { user_id: null, anon_session_id: s.session.id };
}
