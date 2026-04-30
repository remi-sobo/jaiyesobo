export type TimeSlot = {
  time: string; // "HH:MM"
  label: string; // "8:00 AM"
  hour: number;
  minute: number;
};

export type TimeAnchor = {
  id: string;
  user_id: string;
  date: string | null;
  start_time: string; // "HH:MM:SS" or "HH:MM"
  end_time: string;
  title: string;
  subtitle: string | null;
  emoji: string;
  recurring_pattern: string | null;
  created_at?: string;
};

export const DEFAULT_DAY_START = "07:00";
export const DEFAULT_DAY_END = "18:00";
export const SLOT_INTERVAL_MINUTES = 30;
export const DEFAULT_TASK_MINUTES = 30;

export function generateTimeSlots(start = DEFAULT_DAY_START, end = DEFAULT_DAY_END): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  for (let m = startMin; m < endMin; m += SLOT_INTERVAL_MINUTES) {
    const time = fromMinutes(m);
    slots.push({
      time,
      label: formatTimeLabel(time),
      hour: Math.floor(m / 60),
      minute: m % 60,
    });
  }
  return slots;
}

export function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const isPm = h >= 12;
  const hr12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr12}:${String(m).padStart(2, "0")} ${isPm ? "PM" : "AM"}`;
}

export function shortTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const isPm = h >= 12;
  const hr12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (m === 0) return `${hr12}${isPm ? "p" : "a"}`;
  return `${hr12}:${String(m).padStart(2, "0")}${isPm ? "p" : "a"}`;
}

/** Normalise "HH:MM:SS" → "HH:MM". */
export function normTime(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export function toMinutes(time: string): number {
  const t = normTime(time);
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutes(time: string, minutes: number): string {
  return fromMinutes(toMinutes(time) + minutes);
}

/** Check if `slot` falls inside `[start, end)`. */
export function slotInRange(slotTime: string, start: string, end: string): boolean {
  const t = toMinutes(slotTime);
  return t >= toMinutes(start) && t < toMinutes(end);
}

/** True when the slot is the FIRST minute of an event (i.e. event starts here). */
export function slotIsStartOf(slotTime: string, start: string): boolean {
  return toMinutes(slotTime) === toMinutes(start);
}

const DOW_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Return only anchors that apply to the given local date. */
export function expandAnchorsForDate(anchors: TimeAnchor[], date: Date): TimeAnchor[] {
  const dow = date.getDay();
  const dowKey = DOW_KEYS[dow];
  const isWeekday = dow >= 1 && dow <= 5;
  const dateIso = isoLocalDate(date);
  return anchors.filter((a) => {
    if (a.date) return a.date === dateIso;
    const p = (a.recurring_pattern ?? "").trim().toLowerCase();
    if (!p) return false;
    if (p === "daily") return true;
    if (p === "weekdays") return isWeekday;
    return p
      .split(",")
      .map((s) => s.trim())
      .includes(dowKey);
  });
}

export function isoLocalDate(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export type CoverageEvent = {
  kind: "anchor" | "task";
  start: string;
  end: string;
};

type ScheduledLike = {
  scheduled_time: string | null;
  scheduled_end_time?: string | null;
  estimated_minutes: number | null;
};

/** End time a task occupies on the timeline (kid-chosen end, or floor fallback). */
export function effectiveEndTime(task: ScheduledLike): string | null {
  if (!task.scheduled_time) return null;
  if (task.scheduled_end_time) return normTime(task.scheduled_end_time);
  const floor = task.estimated_minutes ?? DEFAULT_TASK_MINUTES;
  return addMinutes(normTime(task.scheduled_time), floor);
}

function buildEvents(anchors: TimeAnchor[], scheduledTasks: ScheduledLike[]): CoverageEvent[] {
  const events: CoverageEvent[] = [];
  for (const a of anchors) {
    events.push({ kind: "anchor", start: normTime(a.start_time), end: normTime(a.end_time) });
  }
  for (const t of scheduledTasks) {
    if (!t.scheduled_time) continue;
    const end = effectiveEndTime(t);
    if (!end) continue;
    events.push({ kind: "task", start: normTime(t.scheduled_time), end });
  }
  return events;
}

/** Start slots where a task of at least `floorMinutes` fits without overlap. */
export function findAvailableSlots(
  floorMinutes: number,
  anchors: TimeAnchor[],
  scheduledTasks: ScheduledLike[],
  daySlots: TimeSlot[],
  dayStart = DEFAULT_DAY_START,
  dayEnd = DEFAULT_DAY_END
): TimeSlot[] {
  const need = Math.max(1, Math.ceil(floorMinutes / SLOT_INTERVAL_MINUTES));
  const events = buildEvents(anchors, scheduledTasks);

  const isCovered = (time: string): boolean => {
    for (const e of events) {
      if (slotInRange(time, e.start, e.end)) return true;
    }
    return false;
  };

  const dayEndMin = toMinutes(dayEnd);
  const out: TimeSlot[] = [];
  for (const slot of daySlots) {
    const startMin = toMinutes(slot.time);
    const endMin = startMin + need * SLOT_INTERVAL_MINUTES;
    if (endMin > dayEndMin) continue;
    let ok = true;
    for (let i = 0; i < need; i++) {
      const t = fromMinutes(startMin + i * SLOT_INTERVAL_MINUTES);
      if (isCovered(t)) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(slot);
  }
  void dayStart;
  return out;
}

/**
 * Given a chosen start time and floor, return valid END times — the floor end
 * plus every 30-min step up until the next conflict (or end of day).
 * The smallest valid end is `start + floor`. The first conflict caps the rest.
 */
export function findAvailableEndTimes(
  startTime: string,
  floorMinutes: number,
  anchors: TimeAnchor[],
  scheduledTasks: ScheduledLike[],
  dayEnd = DEFAULT_DAY_END
): string[] {
  const events = buildEvents(anchors, scheduledTasks);
  const startMin = toMinutes(startTime);
  const minEndMin = startMin + Math.max(SLOT_INTERVAL_MINUTES, floorMinutes);
  const dayEndMin = toMinutes(dayEnd);

  // Find the earliest conflict that begins AT or AFTER startMin.
  let nextConflictStart = dayEndMin;
  for (const e of events) {
    const eStart = toMinutes(e.start);
    if (eStart >= startMin && eStart < nextConflictStart) nextConflictStart = eStart;
  }

  // Valid ends: minEndMin, minEndMin + 30, ..., up to nextConflictStart, all snapped to 30-min slots.
  const out: string[] = [];
  for (let m = minEndMin; m <= Math.min(nextConflictStart, dayEndMin); m += SLOT_INTERVAL_MINUTES) {
    out.push(fromMinutes(m));
  }
  return out;
}
