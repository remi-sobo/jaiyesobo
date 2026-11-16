import { EVENT_TYPES, type Device, type EventType, type NewSiteEvent, type WireBatch } from "./types";

/** Cleaning and checking of what the browser sends. No database, no cookies: easy to test. */

export const MAX_EVENTS_PER_BATCH = 25;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIVATE_AREAS = ["/admin", "/me", "/games-admin", "/api"];
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|scrapy|facebookexternalhit|pingdom/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT.test(userAgent);
}

/** True for the parts of the site we never record. */
export function isPrivatePath(path: string): boolean {
  return PRIVATE_AREAS.some((a) => path === a || path.startsWith(`${a}/`));
}

/**
 * A path that is safe to store: no query string, no hash, and no secrets.
 * League invite codes and game share tokens are masked. Returns null when
 * the path is not one of ours to record.
 */
export function cleanPath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  let path = raw.split(/[?#]/)[0].slice(0, 200);
  if (path.length > 1) path = path.replace(/\/+$/, "") || "/";
  if (isPrivatePath(path)) return null;
  path = path.replace(/^\/runitback\/l\/[^/]+/, "/runitback/l/:code");
  path = path.replace(/^\/games\/share\/[^/]+/, "/games/share/:token");
  return path;
}

/** Trims, squeezes whitespace and caps the length. Empty becomes null. */
export function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.replace(/\s+/g, " ").trim().slice(0, max);
  return t || null;
}

/** Where a click goes, without its query string. Inside links are run through cleanPath. */
export function cleanTarget(raw: unknown): string | null {
  const t = cleanText(raw, 300);
  if (!t) return null;
  const bare = t.split(/[?#]/)[0];
  if (bare.startsWith("/")) return cleanPath(bare) ?? "(private)";
  return bare;
}

/** Just the site name of a referrer, like "instagram.com". */
export function cleanReferrer(raw: unknown, ownHost: string | null): string | null {
  const t = cleanText(raw, 300);
  if (!t) return null;
  try {
    const host = new URL(t.includes("://") ? t : `https://${t}`).hostname.replace(/^www\./, "").toLowerCase();
    if (!host || (ownHost && host === ownHost.replace(/^www\./, "").split(":")[0].toLowerCase())) return null;
    return host.slice(0, 80);
  } catch {
    return null;
  }
}

export function deviceFor(width: unknown): Device | null {
  if (typeof width !== "number" || !Number.isFinite(width) || width <= 0) return null;
  if (width < 760) return "phone";
  if (width < 1100) return "tablet";
  return "computer";
}

function cleanValue(type: EventType, raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const n = Math.round(raw);
  if (n < 0) return null;
  if (type === "read") return Math.min(100, n);
  // Seconds. Nobody watches one thing for more than four hours.
  return Math.min(4 * 3600, n);
}

export type Who = { family: boolean; player_id: string | null; games_session_id: string | null };

/**
 * Turns one request body into rows to insert. Anything malformed is dropped
 * rather than failing the batch, so one bad event never loses the rest.
 */
export function rowsFromBatch(body: unknown, who: Who, ownHost: string | null): NewSiteEvent[] {
  if (!body || typeof body !== "object") return [];
  const b = body as Partial<WireBatch>;
  if (!isUuid(b.v) || !isUuid(b.s) || !Array.isArray(b.e)) return [];
  const isPrivate = b.x === true;
  const device = deviceFor(b.w);
  const rows: NewSiteEvent[] = [];
  for (const e of b.e.slice(0, MAX_EVENTS_PER_BATCH)) {
    if (!e || typeof e !== "object") continue;
    const type = e.t;
    if (!EVENT_TYPES.includes(type)) continue;
    const path = cleanPath(e.p);
    if (!path) continue;
    rows.push({
      visitor_id: b.v.toLowerCase(),
      session_id: b.s.toLowerCase(),
      type,
      path,
      target: type === "click" ? cleanTarget(e.k) : cleanText(e.k, 200),
      label: cleanText(e.l, 120),
      detail: cleanText(e.d, 20),
      value: cleanValue(type, e.n),
      referrer: type === "pageview" ? cleanReferrer(e.r, ownHost) : null,
      device,
      private: isPrivate,
      family: who.family,
      // A browser that asked not to be tracked is never tied to a name.
      player_id: isPrivate ? null : who.player_id,
      games_session_id: isPrivate ? null : who.games_session_id,
    });
  }
  return rows;
}
