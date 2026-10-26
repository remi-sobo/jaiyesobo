/**
 * Sportsbook weeks run Sunday 12:00am to Saturday 11:59pm Pacific. Sunday
 * is the transition day: the previous week closes and the new week opens
 * on the same Sunday morning, right after Saturday night's final games.
 * Week 1 of 2026-27 is the week of opening night.
 */

export const SB_SEASON = "2026-27";
/** Sunday of opening week, Pacific. */
export const SB_SEASON_START = "2026-10-18";

const TZ = "America/Los_Angeles";

/** Today's date in Pacific time as YYYY-MM-DD. */
export function pacificDate(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

export type WeekWindow = { week_number: number; starts_on: string; ends_on: string };

export function weekWindow(n: number): WeekWindow {
  const starts_on = addDays(SB_SEASON_START, (n - 1) * 7);
  return { week_number: n, starts_on, ends_on: addDays(starts_on, 6) };
}

/** Week number for a Pacific date. Before opening week counts as week 1. */
export function weekNumberFor(pacificIso: string): number {
  return Math.max(1, Math.floor(daysBetween(SB_SEASON_START, pacificIso) / 7) + 1);
}

export function currentWeekNumber(now: Date = new Date()): number {
  return weekNumberFor(pacificDate(now));
}

/** UTC instants that bound a week, for comparing against tip times. */
export function weekBounds(w: WeekWindow): { start: Date; end: Date } {
  return { start: pacificMidnight(w.starts_on), end: pacificMidnight(addDays(w.ends_on, 1)) };
}

/** The UTC instant of 12:00am Pacific on a date, DST aware. */
export function pacificMidnight(iso: string): Date {
  // Try both offsets and keep the one that lands on midnight Pacific.
  for (const off of [7, 8]) {
    const d = new Date(`${iso}T${String(off).padStart(2, "0")}:00:00Z`);
    const hour = Number(d.toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }));
    if (hour === 0 || hour === 24) return d;
  }
  return new Date(`${iso}T08:00:00Z`);
}

/** "Oct 19 to Oct 25" */
export function weekRangeLabel(w: { starts_on: string; ends_on: string }): string {
  const f = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${f(w.starts_on)} to ${f(w.ends_on)}`;
}

/** "Tue 7:30pm" in Pacific. */
export function tipLabel(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { weekday: "short", timeZone: TZ });
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ })
    .replace(" ", "")
    .toLowerCase();
  return `${day} ${time}`;
}

/** The request time, read once on the server and passed down so renders stay pure. */
export function requestNow(): number {
  return Date.now();
}

export function weekSlug(n: number): string {
  return `week-${n}`;
}

export function parseWeekSlug(s: string): number | null {
  const m = /^week-(\d{1,2})$/.exec(s);
  return m ? Number(m[1]) : null;
}
