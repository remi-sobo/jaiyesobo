import { createServiceClient } from "@/lib/supabase/server";

/**
 * Server-side push for the iPhone app, through Expo's push service.
 *
 * The app schedules its own "1 hour to tip-off" reminder on the phone, so the
 * server never sends `lock`. It sends the three alerts that need the server:
 * picks revealed at tip-off, a week graded, and Jaiye's recap.
 *
 * Every send is keyed by a marker in `app_config` (same table the live sync
 * throttle uses), so the several places that can trigger a push (nightly cron,
 * weekly cron, live sync, admin recap) are safe to overlap.
 */

export type PushKind = "reveal" | "graded" | "recap";
export type PushMessage = { title: string; body: string; data?: Record<string, string> };
export type PushResult = { sent: number; skipped: "marker" | "no-recipients" | "quiet" | null; errors: number };

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100;
const TIMEOUT_MS = 10_000;
const PAGE = 1000;
const PREVIEW_MAX = 90;

type Ticket = { status?: string; message?: string; details?: { error?: string } };

/**
 * The first ~90 characters of a recap for a push body: whitespace collapsed,
 * cut at a word boundary, "…" added if anything was cut. Always under 90 chars.
 */
export function recapPreview(text: string): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length < PREVIEW_MAX) return s;
  const room = PREVIEW_MAX - 2; // leaves space for the ellipsis
  let head = s.slice(0, room);
  if (!/\s/.test(s.charAt(room))) {
    const at = head.lastIndexOf(" ");
    // One giant word: hard cut, but never through the middle of an emoji.
    head = at > 0 ? head.slice(0, at) : head.replace(/[\uD800-\uDBFF]$/, "");
  }
  return `${head.replace(/[\s,;:.–—-]+$/, "")}…`;
}

/** Unique Expo tokens of players who are reachable and haven't turned this kind off. */
async function recipientTokens(kind: PushKind): Promise<string[]> {
  const db = createServiceClient();
  const tokens = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("sb_players")
      .select("push_token, push_enabled")
      .not("push_token", "is", null)
      .is("deleted_at", null)
      .eq("hidden", false)
      .eq("age_band", "13_plus")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const p of data ?? []) {
      // Same rule as coalesce(push_enabled->>kind, 'true') <> 'false': null means all on.
      const on = (p.push_enabled as Record<string, unknown> | null)?.[kind];
      if (p.push_token && String(on ?? "true") !== "false") tokens.add(p.push_token as string);
    }
    if ((data ?? []).length < PAGE) break;
  }
  return [...tokens];
}

/** Send one push to every opted-in player, at most once per marker. Never throws; returns what happened. */
export async function sendPush(kind: PushKind, message: PushMessage, marker: string): Promise<PushResult> {
  const finish = (r: PushResult, extra: Record<string, unknown> = {}): PushResult => {
    console.log(JSON.stringify({ scope: "push", kind, marker, ...r, ...extra }));
    return r;
  };
  try {
    // Quiet hours, Pacific: skip without claiming the marker so a later caller
    // (the live sync on the first app open of the morning) sends it instead.
    const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }).format(new Date()));
    if (hour < 8 || hour >= 22) return finish({ sent: 0, skipped: "quiet", errors: 0 });

    const db = createServiceClient();
    const key = `push:${marker}`;

    const { data: seen, error: seenErr } = await db.from("app_config").select("key").eq("key", key).maybeSingle();
    if (seenErr) throw seenErr;
    if (seen) return finish({ sent: 0, skipped: "marker", errors: 0 });

    const tokens = await recipientTokens(kind);

    // Claim the marker before sending so a crash mid-send can't double-send on
    // retry. Insert-or-ignore, so of two overlapping callers only one gets the row.
    // Claimed even with nobody to send to: a player who signs up later shouldn't
    // get a stale "picks are in" from before they joined.
    const at = new Date().toISOString();
    const { data: claimed, error: claimErr } = await db
      .from("app_config")
      .upsert({ key, value: { at, kind, sent: 0 } }, { onConflict: "key", ignoreDuplicates: true })
      .select("key");
    if (claimErr) throw claimErr;
    if (!claimed?.length) return finish({ sent: 0, skipped: "marker", errors: 0 });
    if (tokens.length === 0) return finish({ sent: 0, skipped: "no-recipients", errors: 0 });

    let sent = 0;
    let errors = 0;
    let firstError: string | undefined;
    const dead: string[] = [];
    for (let i = 0; i < tokens.length; i += CHUNK) {
      const chunk = tokens.slice(i, i + CHUNK);
      try {
        const res = await fetch(EXPO_URL, {
          method: "POST",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: JSON.stringify(
            chunk.map((to) => ({ to, title: message.title, body: message.body, data: message.data, sound: "default" })),
          ),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const json = (await res.json().catch(() => null)) as { data?: Ticket[] } | null;
        if (!res.ok || !Array.isArray(json?.data)) {
          errors += chunk.length;
          firstError ??= `http ${res.status}`;
          continue;
        }
        const tickets = json.data;
        chunk.forEach((token, k) => {
          const t = tickets[k];
          if (t?.status === "ok") sent++;
          else if (t?.details?.error === "DeviceNotRegistered") dead.push(token);
          else {
            errors++;
            firstError ??= t?.details?.error ?? t?.message ?? "no ticket";
          }
        });
      } catch (e) {
        errors += chunk.length;
        firstError ??= String(e);
      }
    }

    // Tokens Expo says are gone (app deleted, push turned off at the OS): stop sending to them.
    if (dead.length) {
      try {
        const { error } = await db.from("sb_players").update({ push_token: null }).in("push_token", dead);
        if (error) throw error;
      } catch (e) {
        firstError ??= `prune failed: ${String(e)}`;
      }
    }
    try {
      await db.from("app_config").update({ value: { at, kind, sent } }).eq("key", key);
    } catch {
      // The marker already exists; the count is only for humans reading it.
    }
    return finish({ sent, skipped: null, errors }, { recipients: tokens.length, pruned: dead.length, firstError });
  } catch (e) {
    console.error(JSON.stringify({ scope: "push", kind, marker, err: String(e) }));
    return { sent: 0, skipped: null, errors: 1 };
  }
}
