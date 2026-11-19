/**
 * Run It Back weeks run Monday 12:00am to Sunday 11:59pm Pacific. Monday
 * is the transition day: the previous week closes and the new week opens
 * on the same Monday morning, right after Sunday night's final games.
 * Week 1 of 2026-27 is the week of opening night.
 *
 * `weekWindow` only decides the dates of a week that doesn't exist yet.
 * Everything that reads a week's dates takes the stored row (`SbWeek`), so
 * a week can run on its own dates: Weeks 1 and 2 were created Sunday to
 * Saturday (Oct 18 to 24, Oct 25 to 31) and keep that, and Week 3 was
 * opened late and runs Tuesday Nov 3 to Sunday Nov 8.
 */

export const SB_SEASON = "2026-27";
/** Monday of opening week, Pacific. */
export const SB_SEASON_START = "2026-10-19";

const TZ = "America/Los_Angeles";

/** Today's date in Pacific time as YYYY-MM-DD. */
export function pacificDate(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** Weekday in Pacific time, 0 = Sunday ... 6 = Saturday. */
export function pacificWeekday(d: Date = new Date()): number {
  const name = d.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short" });
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Which week's results email may go out now: only the week that just ended,
 * once it is final. That's this week on Sunday night (it closes right after
 * the last game) or last week from Monday on. Its recap is waited
 * on for up to 36 hours after it went final, then it goes without. Older weeks
 * that were finalized late are never emailed: people only want last week's
 * results and this week's picks.
 */
export function resultsWeekToSend(
  weeks: Array<{ week_number: number; status: string; finalized_at: string | null; recap: string | null }>,
  now: Date = new Date(),
): number | null {
  const current = currentWeekNumber(now);
  // This week, when it closed Sunday night right after its last game; otherwise last week.
  for (const n of [current, current - 1]) {
    const w = weeks.find((x) => x.week_number === n);
    if (!w || w.status !== "final" || !w.finalized_at) continue;
    const age = now.getTime() - Date.parse(w.finalized_at);
    if (age < 0 || age >= 7 * DAY_MS) continue;
    if (!w.recap && age <= 1.5 * DAY_MS) return null;
    return w.week_number;
  }
  return null;
}

/**
 * A week is over at midnight Pacific after its Sunday, or sooner: once every
 * game on its schedule (postponed ones aside) is final. That lets the week
 * close, recap and email right after Sunday's last game.
 */
export function weekIsOver(bounds: { start: Date; end: Date }, games: Array<{ tip_at: string; status: number; postponed: boolean }>, now = new Date()): boolean {
  if (now >= bounds.end) return true;
  const played = games.filter((g) => !g.postponed);
  if (played.length === 0) return false;
  // The last game has to be on the last day: a schedule we only half know never closes a week early.
  const lastTip = Math.max(...played.map((g) => Date.parse(g.tip_at)));
  if (bounds.end.getTime() - lastTip > 24 * 3_600_000) return false;
  return played.every((g) => g.status === 3);
}
