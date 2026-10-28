import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { gradeWeek, pushGraded, syncBoxes, syncGames } from "./data";
import { sendPush } from "./push";
import type { SbWeek } from "./types";
import { SB_SEASON, pacificDate } from "./weeks";

const KEY = "sportsbook_last_sync";
const EVERY_MS = 10 * 60_000;
/**
 * A "picks are in" push older than this is stale, so it's skipped. Kept short
 * so a sync that catches several tip-off waves after a gap sends only the
 * current one instead of a burst.
 */
const REVEAL_MAX_AGE_MS = 20 * 60_000;

/**
 * Live results without a fast cron. When someone loads a Sportsbook page,
 * check (after the response is sent) whether any graded-by-code pick has
 * tipped off but isn't graded yet. If so, and the last sync was 10+ minutes
 * ago, pull today's scores and box scores from ESPN and grade what's done.
 * The nightly cron is still the safety net. Once that's done, it also tells
 * players that picks are revealed for any tip-off it just found.
 */
export function scheduleLiveSync() {
  after(async () => {
    try {
      await maybeSync();
    } catch (e) {
      console.error(JSON.stringify({ scope: "sportsbook.live", err: String(e) }));
    }
  });
}

async function maybeSync(now = new Date()) {
  const db = createServiceClient();
  const { data: last } = await db.from("app_config").select("value").eq("key", KEY).maybeSingle();
  const lastAt = Date.parse(String((last?.value as { at?: string } | null)?.at ?? ""));
  if (Number.isFinite(lastAt) && now.getTime() - lastAt < EVERY_MS) return;

  const { data: weeks } = await db
    .from("sb_weeks")
    .select("id, season, week_number, starts_on, ends_on, status, recap, finalized_at")
    .in("status", ["open", "graded"]);
  const live = (weeks ?? []) as SbWeek[];
  if (live.length === 0) return;
  const { data: locked } = await db
    .from("sb_items")
    .select("week_id, locks_at")
    .in("week_id", live.map((w) => w.id))
    .eq("status", "open")
    .neq("type", "custom")
    .lte("locks_at", now.toISOString());
  if (!locked?.length) return;

  // Claim the slot first so a burst of visitors doesn't all sync at once.
  await db.from("app_config").upsert({ key: KEY, value: { at: now.toISOString() } }, { onConflict: "key" });
  try {
    const yesterday = pacificDate(new Date(now.getTime() - 86_400_000));
    await syncGames(yesterday, pacificDate(now));
    await syncBoxes(15);
    for (const w of live) await gradeWeek(w, now);
  } finally {
    // Daytime caller for the graded push: the nightly cron lands in quiet hours.
    try { await pushGraded(); } catch { /* push never blocks the sync */ }
    // Whether or not ESPN cooperated: the reveal only depends on the lock time.
    await pushReveals(locked, live, now);
  }
}

/**
 * "Picks are in", once per tip-off time per week (sendPush's marker makes
 * repeat syncs no-ops). Runs after grading so it never delays it, and never throws.
 */
async function pushReveals(locked: { week_id: string; locks_at: string }[], weeks: SbWeek[], now: Date) {
  try {
    const weekNumber = new Map(weeks.map((w) => [w.id, w.week_number]));
    const groups = new Map<string, { week: number; at: string }>();
    for (const { week_id, locks_at } of locked) {
      const week = weekNumber.get(week_id);
      const t = new Date(locks_at);
      if (week === undefined || Number.isNaN(t.getTime()) || now.getTime() - t.getTime() > REVEAL_MAX_AGE_MS) continue;
      const at = t.toISOString();
      groups.set(`${week}:${at}`, { week, at });
    }
    for (const { week, at } of [...groups.values()].sort((a, b) => a.at.localeCompare(b.at))) {
      await sendPush(
        "reveal",
        { title: "Picks are in", body: "See what Jaiye and Remi took.", data: { route: "/" } },
        `reveal:${SB_SEASON}:${week}:${at}`,
      );
    }
  } catch (e) {
    console.error(JSON.stringify({ scope: "sportsbook.live", push: "reveal", err: String(e) }));
  }
}
