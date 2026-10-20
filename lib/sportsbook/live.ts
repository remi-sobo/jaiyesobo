import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { gradeWeek, syncBoxes, syncGames } from "./data";
import type { SbWeek } from "./types";
import { pacificDate } from "./weeks";

const KEY = "sportsbook_last_sync";
const EVERY_MS = 10 * 60_000;

/**
 * Live results without a fast cron. When someone loads a Sportsbook page,
 * check (after the response is sent) whether any graded-by-code pick has
 * tipped off but isn't graded yet. If so, and the last sync was 10+ minutes
 * ago, pull today's scores and box scores from ESPN and grade what's done.
 * The nightly cron is still the safety net.
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
  const { count } = await db
    .from("sb_items")
    .select("id", { count: "exact", head: true })
    .in("week_id", live.map((w) => w.id))
    .eq("status", "open")
    .neq("type", "custom")
    .lte("locks_at", now.toISOString());
  if (!count) return;

  // Claim the slot first so a burst of visitors doesn't all sync at once.
  await db.from("app_config").upsert({ key: KEY, value: { at: now.toISOString() } }, { onConflict: "key" });
  const yesterday = pacificDate(new Date(now.getTime() - 86_400_000));
  await syncGames(yesterday, pacificDate(now));
  await syncBoxes(15);
  for (const w of live) await gradeWeek(w, now);
}
