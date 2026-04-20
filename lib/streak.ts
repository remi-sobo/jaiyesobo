import { createServiceClient } from "@/lib/supabase/server";
import { getStreakRules } from "@/lib/config";

export type StreakResult = { current: number; best: number };

/**
 * Current streak: consecutive qualifying days walking back from today.
 * Best streak: longest run of qualifying days in the history.
 *
 * A day "qualifies" if:
 *   - It has at least one task that day AND completion ratio ≥ threshold, OR
 *   - weekdays_only=true and the day is Sat/Sun — it's a skip (doesn't count, doesn't break)
 *
 * Today counts toward current streak only if it's already ≥ threshold.
 */
export async function calculateStreak(userId: string): Promise<StreakResult> {
  const rules = await getStreakRules();
  const supa = createServiceClient();

  const { data, error } = await supa
    .from("tasks")
    .select("date, completions(id)")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  if (error) throw error;

  const byDate = new Map<string, { total: number; done: number }>();
  for (const row of data ?? []) {
    const entry = byDate.get(row.date) ?? { total: 0, done: 0 };
    entry.total += 1;
    if ((row.completions as { id: string }[] | null)?.length) entry.done += 1;
    byDate.set(row.date, entry);
  }

  const isWeekend = (iso: string): boolean => {
    const dow = new Date(`${iso}T00:00:00`).getDay();
    return dow === 0 || dow === 6;
  };

  const qualifies = (entry: { total: number; done: number } | undefined): boolean => {
    if (!entry || entry.total === 0) return false;
    return entry.done / entry.total >= rules.completion_threshold;
  };

  // Current streak: walk backwards from today
  let current = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (;;) {
    const iso = cursor.toISOString().slice(0, 10);
    if (rules.weekdays_only && isWeekend(iso)) {
      // Skip — doesn't break, doesn't count
      cursor.setDate(cursor.getDate() - 1);
      // But only if we've already started a streak, otherwise keep walking back
      if (current === 0 && !byDate.has(iso)) {
        // Edge: today is a weekend and no prior qualifying weekday exists yet
        // Continue walking back to find the most recent weekday
        continue;
      }
      continue;
    }
    const entry = byDate.get(iso);
    if (!entry) break;
    if (!qualifies(entry)) break;
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Best streak: scan sorted dates
  const sortedDates = Array.from(byDate.keys()).sort();
  let best = 0;
  let run = 0;
  for (const iso of sortedDates) {
    const entry = byDate.get(iso);
    if (rules.weekdays_only && isWeekend(iso)) continue;
    if (qualifies(entry)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  if (current > best) best = current;

  return { current, best };
}
