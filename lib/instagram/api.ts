import { createServiceClient } from "@/lib/supabase/server";

/**
 * Instagram API with Instagram Login, for @onthecourt_pod only.
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 *
 * Scopes: instagram_business_basic (read media and comments) and
 * instagram_business_manage_comments (reply and hide). The long-lived token
 * lasts 60 days; the daily cron refreshes it when it has 10 days or less left.
 */

const GRAPH = "https://graph.instagram.com";
export const IG_SCOPES = ["instagram_business_basic", "instagram_business_manage_comments"];
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

function appId() {
  const v = process.env.INSTAGRAM_APP_ID;
  if (!v) throw new Error("INSTAGRAM_APP_ID not set");
  return v;
}
function appSecret() {
  const v = process.env.INSTAGRAM_APP_SECRET;
  if (!v) throw new Error("INSTAGRAM_APP_SECRET not set");
  return v;
}

export function instagramConfigured(): boolean {
  return !!process.env.INSTAGRAM_APP_ID && !!process.env.INSTAGRAM_APP_SECRET;
}

export function buildInstagramAuthUrl(redirectUri: string, state: string): string {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("client_id", appId());
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", IG_SCOPES.join(","));
  u.searchParams.set("state", state);
  return u.toString();
}

/** An error Instagram answered with (4xx), so we know the call did not take effect. */
export class IgRejected extends Error {}

async function igFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000), cache: "no-store" });
  const j = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } | string; error_message?: string };
  if (!res.ok || (j as { error?: unknown }).error) {
    const e = (j as { error?: { message?: string } | string; error_message?: string });
    const msg = typeof e.error === "string" ? e.error_message ?? e.error : e.error?.message ?? `${res.status}`;
    if (res.status >= 400 && res.status < 500) throw new IgRejected(`Instagram API: ${msg}`);
    throw new Error(`Instagram API: ${msg}`);
  }
  return j;
}

/** Code from the OAuth callback -> long-lived token, saved to ig_token. */
export async function connectWithCode(code: string, redirectUri: string): Promise<{ username: string }> {
  const form = new URLSearchParams({
    client_id: appId(),
    client_secret: appSecret(),
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  // The docs show both a flat object and { data: [ ... ] }; accept either.
  type Short = { access_token: string; user_id: number | string };
  const raw = await igFetch<Short & { data?: Short[] }>("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body: form,
  });
  const short = raw.data?.[0] ?? raw;
  if (!short.access_token) throw new Error("Instagram API: no access token in the code exchange");
  const longUrl = new URL(`${GRAPH}/access_token`);
  longUrl.searchParams.set("grant_type", "ig_exchange_token");
  longUrl.searchParams.set("client_secret", appSecret());
  longUrl.searchParams.set("access_token", short.access_token);
  const long = await igFetch<{ access_token: string; expires_in: number }>(longUrl.toString());
  const me = await getMe(long.access_token);
  await saveToken(long.access_token, long.expires_in, me.user_id, me.username);
  return { username: me.username };
}

async function getMe(token: string): Promise<{ user_id: string; username: string }> {
  const u = new URL(`${GRAPH}/me`);
  u.searchParams.set("fields", "user_id,username");
  u.searchParams.set("access_token", token);
  const j = await igFetch<{ user_id: string | number; username: string }>(u.toString());
  return { user_id: String(j.user_id), username: j.username };
}

async function saveToken(token: string, expiresIn: number, igUserId: string, username: string) {
  const supa = createServiceClient();
  const { error } = await supa.from("ig_token").upsert({
    id: 1,
    access_token: token,
    ig_user_id: igUserId,
    username,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Saving Instagram token failed: ${error.message}`);
}

export type IgConnection = { username: string; igUserId: string; expiresAt: string };

/** Days until the token expires, for the cron's early warning. */
export async function tokenDaysLeft(): Promise<number | null> {
  const c = await getConnection();
  return c ? (new Date(c.expiresAt).getTime() - Date.now()) / 864e5 : null;
}

export async function getConnection(): Promise<IgConnection | null> {
  const supa = createServiceClient();
  const { data } = await supa.from("ig_token").select("username, ig_user_id, expires_at").eq("id", 1).maybeSingle();
  if (!data) return null;
  return { username: data.username, igUserId: data.ig_user_id, expiresAt: data.expires_at };
}

/** The current token, refreshed first if it has 10 days or less left. */
export async function getToken(): Promise<{ token: string; igUserId: string; username: string }> {
  const supa = createServiceClient();
  const { data, error } = await supa.from("ig_token").select("*").eq("id", 1).maybeSingle();
  if (error || !data) throw new Error("Instagram is not connected");
  const expires = new Date(data.expires_at).getTime();
  if (expires < Date.now()) throw new Error("Instagram token expired");
  if (expires - Date.now() <= TEN_DAYS_MS) {
    try {
      const u = new URL(`${GRAPH}/refresh_access_token`);
      u.searchParams.set("grant_type", "ig_refresh_token");
      u.searchParams.set("access_token", data.access_token);
      const j = await igFetch<{ access_token: string; expires_in: number }>(u.toString());
      await saveToken(j.access_token, j.expires_in, data.ig_user_id, data.username);
      return { token: j.access_token, igUserId: data.ig_user_id, username: data.username };
    } catch (e) {
      // The current token still works; keep using it and let the cron warn.
      console.error(JSON.stringify({ scope: "instagram", step: "refresh", error: String(e) }));
    }
  }
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

export async function listRecentMedia(token: string, limit = 12): Promise<IgMedia[]> {
  const u = new URL(`${GRAPH}/me/media`);
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
