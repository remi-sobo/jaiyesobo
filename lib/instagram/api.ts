import { createServiceClient } from "@/lib/supabase/server";

/**
 * Instagram API with Unified Login, for @onthecourt_pod only.
 * https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/authentication
 *
 * New Meta apps can't use plain Instagram Login. Unified Login goes through
 * Facebook Login for Business with a login configuration (META_LOGIN_CONFIG_ID)
 * that asks for the Instagram account and instagram_basic +
 * instagram_manage_comments. The code exchange returns a Business Integration
 * System User token on graph.facebook.com. Our configuration sets it to never
 * expire; if Meta ever returns an expiry, getConnection() shows it and the
 * cron warns before it runs out. No Facebook Page needed.
 */

const VERSION = "v27.0";
const GRAPH = `https://graph.facebook.com/${VERSION}`;
const NEVER = "2999-12-31T00:00:00Z";

function appId() {
  const v = process.env.META_APP_ID;
  if (!v) throw new Error("META_APP_ID not set");
  return v;
}
function appSecret() {
  const v = process.env.META_APP_SECRET;
  if (!v) throw new Error("META_APP_SECRET not set");
  return v;
}
function configId() {
  const v = process.env.META_LOGIN_CONFIG_ID;
  if (!v) throw new Error("META_LOGIN_CONFIG_ID not set");
  return v;
}

export function instagramConfigured(): boolean {
  return !!process.env.META_APP_ID && !!process.env.META_APP_SECRET && !!process.env.META_LOGIN_CONFIG_ID;
}

export function buildInstagramAuthUrl(redirectUri: string, state: string): string {
  const u = new URL(`https://www.facebook.com/${VERSION}/dialog/oauth`);
  u.searchParams.set("client_id", appId());
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("config_id", configId());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("override_default_response_type", "true");
  u.searchParams.set("state", state);
  return u.toString();
}

/** An error Instagram answered with (4xx), so we know the call did not take effect. */
export class IgRejected extends Error {}

async function igFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000), cache: "no-store" });
  const j = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok || j.error) {
    const msg = j.error?.message ?? `${res.status}`;
    if (res.status >= 400 && res.status < 500) throw new IgRejected(`Instagram API: ${msg}`);
    throw new Error(`Instagram API: ${msg}`);
  }
  return j;
}

/** Code from the OAuth callback -> system user token + the Instagram account, saved to ig_token. */
export async function connectWithCode(code: string, redirectUri: string): Promise<{ username: string }> {
  const u = new URL(`${GRAPH}/oauth/access_token`);
  u.searchParams.set("client_id", appId());
  u.searchParams.set("client_secret", appSecret());
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("code", code);
  const tok = await igFetch<{ access_token: string; expires_in?: number }>(u.toString());

  // With this token /me is the system user, not Instagram; the account comes from here.
  const a = new URL(`${GRAPH}/me/assigned_instagram_accounts`);
  a.searchParams.set("fields", "id,username");
  a.searchParams.set("access_token", tok.access_token);
  const accts = await igFetch<{ data?: { id: string; username?: string }[] }>(a.toString());
  const first = accts.data?.[0];
  if (!first) throw new Error("No Instagram account was shared with the app");

  let username = first.username;
  if (!username) {
    const p = new URL(`${GRAPH}/${first.id}`);
    p.searchParams.set("fields", "username");
    p.searchParams.set("access_token", tok.access_token);
    username = (await igFetch<{ username: string }>(p.toString())).username;
  }

  const expiresAt = tok.expires_in ? new Date(Date.now() + tok.expires_in * 1000).toISOString() : NEVER;
  const supa = createServiceClient();
  const { error } = await supa.from("ig_token").upsert({
    id: 1,
    access_token: tok.access_token,
    ig_user_id: first.id,
    username,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Saving Instagram token failed: ${error.message}`);
  return { username };
}

export type IgConnection = { username: string; igUserId: string; expiresAt: string; never: boolean };

export async function getConnection(): Promise<IgConnection | null> {
  const supa = createServiceClient();
  const { data } = await supa.from("ig_token").select("username, ig_user_id, expires_at").eq("id", 1).maybeSingle();
  if (!data) return null;
  return {
    username: data.username,
    igUserId: data.ig_user_id,
    expiresAt: data.expires_at,
    never: new Date(data.expires_at).getUTCFullYear() >= 2999,
  };
}

/** Days until the token expires, for the cron's early warning. Null when it never does. */
export async function tokenDaysLeft(): Promise<number | null> {
  const c = await getConnection();
  if (!c || c.never) return null;
  return (new Date(c.expiresAt).getTime() - Date.now()) / 864e5;
}

export async function getToken(): Promise<{ token: string; igUserId: string; username: string }> {
  const supa = createServiceClient();
  const { data, error } = await supa.from("ig_token").select("*").eq("id", 1).maybeSingle();
  if (error || !data) throw new Error("Instagram is not connected");
  if (new Date(data.expires_at).getTime() < Date.now()) throw new Error("Instagram token expired");
  return { token: data.access_token, igUserId: data.ig_user_id, username: data.username };
}

export type IgMedia = {
  id: string;
  caption?: string;
  permalink?: string;
  thumbnail_url?: string;
  media_url?: string;
  media_type?: string;
  timestamp?: string;
};

export type IgComment = {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  replies: { id: string; username: string }[];
};

export async function listRecentMedia(token: string, igUserId: string, limit = 12): Promise<IgMedia[]> {
  const u = new URL(`${GRAPH}/${igUserId}/media`);
  u.searchParams.set("fields", "id,caption,permalink,thumbnail_url,media_url,media_type,timestamp");
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("access_token", token);
  const j = await igFetch<{ data: IgMedia[] }>(u.toString());
  return j.data ?? [];
}

export async function listComments(token: string, mediaId: string): Promise<IgComment[]> {
  const u = new URL(`${GRAPH}/${mediaId}/comments`);
  u.searchParams.set("fields", "id,text,username,timestamp,replies{id,username}");
  u.searchParams.set("limit", "50");
  u.searchParams.set("access_token", token);
  const j = await igFetch<{ data: Array<Omit<IgComment, "replies"> & { replies?: { data: { id: string; username: string }[] } }> }>(u.toString());
  return (j.data ?? []).map((c) => ({
    id: c.id,
    text: c.text ?? "",
    username: c.username ?? "",
    timestamp: c.timestamp,
    replies: c.replies?.data ?? [],
  }));
}

export async function replyToComment(token: string, commentId: string, message: string): Promise<string> {
  const body = new URLSearchParams({ message, access_token: token });
  const j = await igFetch<{ id: string }>(`${GRAPH}/${commentId}/replies`, { method: "POST", body });
  return j.id;
}

export async function hideComment(token: string, commentId: string): Promise<void> {
  const body = new URLSearchParams({ hide: "true", access_token: token });
  await igFetch<{ success?: boolean }>(`${GRAPH}/${commentId}`, { method: "POST", body });
}
