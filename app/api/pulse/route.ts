import { getAdminSession, getKidSession } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { challengerIdFromCookie } from "@/lib/sportsbook/players";
import { ipFromRequest } from "@/lib/rate-limit";
import { isBot, isUuid, rowsFromBatch, type Who } from "@/lib/analytics/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Site analytics intake. The tracker in the root layout posts small batches
 * here. Spec: docs/ANALYTICS-SPEC.md.
 *
 * It always answers 204, even when it drops the batch, so nothing about the
 * rules leaks and the browser never retries.
 */

const done = () => new Response(null, { status: 204 });

// Best effort flood guard. The address is only held in memory for a minute
// and is never written to the database.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 240;
const seen = new Map<string, { n: number; resetAt: number }>();

function overLimit(ip: string, count: number) {
  const now = Date.now();
  if (seen.size > 5000) for (const [k, v] of seen) if (v.resetAt < now) seen.delete(k);
  const hit = seen.get(ip);
  if (!hit || hit.resetAt < now) {
    seen.set(ip, { n: count, resetAt: now + WINDOW_MS });
    return false;
  }
  hit.n += count;
  return hit.n > MAX_PER_WINDOW;
}

function sameSite(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function whoIsThis(): Promise<Who> {
  const who: Who = { family: false, player_id: null, games_session_id: null };
  try {
    who.family = !!(await getKidSession());
  } catch {
    // SESSION_SECRET missing: nobody is family
  }
  // A name is only ever tied to a Run It Back player who said they're 13 or
  // older. Players under 13, and anyone in the games (which never ask age),
  // stay an unnamed random id.
  try {
    const id = await challengerIdFromCookie();
    if (isUuid(id)) {
      const { data } = await createServiceClient().from("sb_players").select("age_band, deleted_at").eq("id", id).maybeSingle();
      if (data && data.age_band === "13_plus" && !data.deleted_at) who.player_id = id;
    }
  } catch {
    // no player
  }
  return who;
}

export async function POST(req: Request) {
  try {
    if (!sameSite(req) || isBot(req.headers.get("user-agent"))) return done();

    // Dad looking at his own site shouldn't move the numbers.
    const admin = await getAdminSession().catch(() => null);
    if (admin) return done();

    const text = await req.text();
    if (text.length > 20_000) return done();
    const body: unknown = JSON.parse(text);

    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const rows = rowsFromBatch(body, await whoIsThis(), host);
    if (!rows.length || overLimit(ipFromRequest(req), rows.length)) return done();

    const { error } = await createServiceClient().from("site_events").insert(rows);
    if (error) console.error(JSON.stringify({ scope: "analytics.pulse", err: error.message }));
  } catch (e) {
    console.error(JSON.stringify({ scope: "analytics.pulse", err: String(e) }));
  }
  return done();
}
