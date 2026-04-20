/**
 * Week math — Mon-Sun weeks, ISO-ish, local time.
 */

export function isoDate(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function todayIso(): string {
  return isoDate(today());
}

/** Monday of the week containing `d`. */
export function weekStart(d: Date = today()): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  const dow = copy.getDay(); // Sunday = 0
  const diff = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

/** Returns 7 Date objects Mon..Sun starting from `start`. */
export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** ISO week number (1-53). */
export function isoWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  return 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 24 * 3600 * 1000));
}

export function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function monthDayLabel(d: Date): string {
  return `${d.toLocaleDateString("en-US", { month: "long" })} ${d.getDate()}`;
}

export function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

export function sameDayAs(a: Date, b: Date): boolean {
  return isoDate(a) === isoDate(b);
}
