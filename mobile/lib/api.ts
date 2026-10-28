// Thin wrapper around /api/app/v1. The base URL comes from Expo's
// extra.apiBaseUrl (app.json) and can be overridden at runtime by the
// EXPO_PUBLIC_API_BASE_URL env var — set it to a Vercel preview URL when
// pointing a build at a non-prod backend.
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "runitback.session.v1";

const configuredBase =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ??
  ((Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl);

if (!configuredBase) {
  throw new Error("Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL or app.json extra.apiBaseUrl.");
}

// The hosted web build at /runitback/app must talk to the origin that serves
// it: production talks to production, and a Vercel preview talks to its own
// preview backend. `expo start --web` runs on localhost, so it keeps using the
// configured base above.
function resolveBase(configured: string): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") return origin;
  }
  return configured;
}

export const API_BASE_URL = `${resolveBase(configuredBase).replace(/\/$/, "")}/api/app/v1`;

// SecureStore (the Keychain) is phone-only. In the browser the token lives in
// localStorage instead. Private windows and blocked site data can make it throw,
// so the token is held in memory for the tab when that happens.
const onWeb = Platform.OS === "web";
let memoryToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (onWeb) {
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return memoryToken;
    }
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (onWeb) {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
      memoryToken = null;
    } catch {
      memoryToken = token;
    }
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (onWeb) {
    memoryToken = null;
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Nothing stored, nothing to clear.
    }
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message?: string) {
    super(message ?? `App API ${status}`);
    this.name = "ApiError";
  }
}

type RequestOpts = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** When true, don't send the session token even if we have one. */
  anonymous?: boolean;
  /** AbortSignal for cancellation (TanStack Query passes one). */
  signal?: AbortSignal;
};

/**
 * Call an /api/app/v1 route. Returns the parsed JSON body on 2xx; throws
 * ApiError otherwise so TanStack Query can surface failures the usual way.
 */
export async function appApi<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!opts.anonymous) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    signal: opts.signal,
  });
  const text = await res.text();
  const parsed = text.length ? safeJsonParse(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, parsed);
  }
  return parsed as T;
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
