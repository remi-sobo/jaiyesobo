import { createServiceClient } from "@/lib/supabase/server";
import { getItems, getWeek, listWeeks } from "./data";
import type { SbItem, SbWeek } from "./types";
import { SB_SEASON, currentWeekNumber, pacificMidnight, pacificWeekday, weekBounds, weekWindow } from "./weeks";

/**
 * Weekly autopilot. Saturday the next week drafts itself, Remi approves it
 * with one tap, and it goes live Sunday at 6:00pm Pacific. Anything not
 * approved goes live anyway when the week starts (Monday 12:00am Pacific).
 *
 * No cron of its own: the nightly job drafts and opens, the weekly job and the
 * live sync (after page views) open, and approving opens right away if the
 * time has already come. Everything here is safe to run any number of times
 * and never throws into its caller.
 *
 * Import note: `actions.ts` and `data.ts` both load this file lazily, and this
 * file loads `actions.ts` lazily, so there is no import cycle.
 */

const db = () => createServiceClient();

/** How long before a week's first midnight it can open: Sunday 6:00pm Pacific. */
const OPEN_LEAD_MS = 6 * 3_600_000;

export const APPROVED_KEY = (n: number) => `sb_approved:${SB_SEASON}:${n}`;

/** Pure: the later of Sunday 6:00pm Pacific before the week and the previous week's last pick lock. */
export function opensAt(week: Pick<SbWeek, "starts_on">, prevLastLock: Date | null): Date {
  const evening = new Date(pacificMidnight(week.starts_on).getTime() - OPEN_LEAD_MS);
  if (prevLastLock && prevLastLock.getTime() > evening.getTime()) return prevLastLock;
  return evening;
}

/**
 * Pure: should a draft week open now? Approved weeks open once `opensAt`
 * passes. Everything else opens when the week itself starts.
 */
export function shouldOpen(o: { approved: boolean; now: Date; opensAt: Date; weekStart: Date }): boolean {
  const t = o.now.getTime();
  return (o.approved && t >= o.opensAt.getTime()) || t >= o.weekStart.getTime();
}

/** Pure: Saturday or Sunday in Pacific time, the days the next week gets drafted. */
export function isPrepDay(now: Date): boolean {
  const day = pacificWeekday(now);
  return day === 6 || day === 0;
}

/** The last pick lock of a week's items, or null when there are none. */
export function lastLock(items: Pick<SbItem, "locks_at">[]): Date | null {
  let max = Number.NEGATIVE_INFINITY;
  for (const i of items) {
    const t = Date.parse(i.locks_at);
    if (Number.isFinite(t) && t > max) max = t;
  }
  return Number.isFinite(max) ? new Date(max) : null;
}

/* Approval marker (app_config) */

export async function isApproved(n: number): Promise<boolean> {
  return (await approvedAt(n)) !== null;
}

async function approvedAt(n: number): Promise<string | null> {
  const { data, error } = await db().from("app_config").select("value").eq("key", APPROVED_KEY(n)).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const at = (data.value as { at?: string } | null)?.at;
  return typeof at === "string" ? at : new Date(0).toISOString();
}

/** Remi's one tap. Marks the week approved, then opens it right away if its time has come. */
export async function approveWeek(n: number, now = new Date()): Promise<{ approved: true; opened: number[] }> {
  const { ActionError } = await import("./actions");
  const week = await getWeek(n);
  if (!week) throw new ActionError("Draft this week first.");
  if (week.status !== "draft") throw new ActionError("This week is already open.");
  if ((await getItems(week.id)).length === 0) throw new ActionError("Add some picks first.");
  const { error } = await db()
    .from("app_config")
    .upsert({ key: APPROVED_KEY(n), value: { at: now.toISOString() } }, { onConflict: "key" });
  if (error) throw error;
  return { approved: true, opened: await maybeOpenWeeks(now) };
}

export async function unapproveWeek(n: number): Promise<void> {
  const { error } = await db().from("app_config").delete().eq("key", APPROVED_KEY(n));
  if (error) throw error;
}

/* Saturday: draft next week */

export type PrepResult = { week: number; drafted: number; skipped?: string; error?: string };

/**
 * Saturday and Sunday (Pacific): if next week has no slate yet, the AI drafts
 * it. A week that is already open, or already has picks, is left alone, so
 * Remi's edits are never overwritten. Never throws.
 */
export async function prepNextWeek(now = new Date()): Promise<PrepResult> {
  const n = currentWeekNumber(now) + 1;
  if (!isPrepDay(now)) return { week: n, drafted: 0, skipped: "not-prep-day" };
  try {
    const week = await getWeek(n);
    if (week && week.status !== "draft") return { week: n, drafted: 0, skipped: "not-draft" };
    if (week && (await getItems(week.id)).length > 0) return { week: n, drafted: 0, skipped: "already-drafted" };
    const { draftWeek } = await import("./actions");
    const count = await draftWeek(n);
    console.log(JSON.stringify({ scope: "sportsbook.autopilot", step: "draft", week: n, count }));
    return { week: n, drafted: count };
  } catch (e) {
    console.error(JSON.stringify({ scope: "sportsbook.autopilot", step: "draft", week: n, err: String(e) }));
    return { week: n, drafted: 0, skipped: "error", error: String(e) };
  }
}

/* Sunday 6pm / Monday 12am: open drafted weeks */

/**
 * Opens every draft week that has picks and whose time has come: approved and
 * past `opensAt`, or past the week's own start (the fallback). Never throws;
 * returns the week numbers it opened.
 */
export async function maybeOpenWeeks(now = new Date()): Promise<number[]> {
  const opened: number[] = [];
  try {
    const weeks = await listWeeks();
    const drafts = weeks.filter((w) => w.status === "draft").sort((a, b) => a.week_number - b.week_number);
    for (const week of drafts) {
      try {
        const start = weekBounds(week).start;
        // opensAt is never earlier than six hours before the start, so most
        // page views stop here without another query.
        if (now.getTime() < start.getTime() - OPEN_LEAD_MS) continue;
        const items = await getItems(week.id);
        if (items.length === 0) continue;
        const prev = weeks.find((w) => w.week_number === week.week_number - 1);
        const at = opensAt(week, prev ? lastLock(await getItems(prev.id)) : null);
        const approved = await isApproved(week.week_number);
        if (!shouldOpen({ approved, now, opensAt: at, weekStart: start })) continue;
        const { openWeek } = await import("./actions");
        await openWeek(week.week_number);
        opened.push(week.week_number);
        console.log(JSON.stringify({ scope: "sportsbook.autopilot", step: "open", week: week.week_number, approved }));
      } catch (e) {
        console.error(JSON.stringify({ scope: "sportsbook.autopilot", step: "open", week: week.week_number, err: String(e) }));
      }
    }
  } catch (e) {
    console.error(JSON.stringify({ scope: "sportsbook.autopilot", step: "open", err: String(e) }));
  }
  return opened;
}

/* Admin */

export type AutopilotStatus = {
  week: number;
  status: SbWeek["status"] | "none";
  items: number;
  approved: boolean;
  approvedAt: string | null;
  /** ISO. When an approved week goes live. */
  opensAt: string;
  /** ISO. When the week goes live even if nobody approves. */
  fallbackAt: string;
};

export async function autopilotStatus(n: number): Promise<AutopilotStatus> {
  const week = await getWeek(n);
  const w = week ?? weekWindow(n);
  const items = week ? await getItems(week.id) : [];
  const prev = week ? await getWeek(n - 1) : null;
  const at = opensAt(w, prev ? lastLock(await getItems(prev.id)) : null);
  const approvedStamp = await approvedAt(n);
  return {
    week: n,
    status: week?.status ?? "none",
    items: items.length,
    approved: approvedStamp !== null,
    approvedAt: approvedStamp,
    opensAt: at.toISOString(),
    fallbackAt: weekBounds(w).start.toISOString(),
  };
}
