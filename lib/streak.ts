import { createServiceClient } from "@/lib/supabase/server";

/**
 * Consecutive days walking back from today where at least 80% of tasks for
 * that day have a completion. Today counts only if today is already ≥80%.
 * Returns 0 when there's no qualifying day.
 */
export async function calculateStreak(userId: string): Promise<number> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("tasks")
    .select("date, completions(id)")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) throw error;

  const byDate = new Map<string, { total: number; done: number }>();
  for (const row of data ?? []) {
    const entry = byDate.get(row.date) ?? { total: 0, done: 0 };
    entry.total += 1;
    if ((row.completions as { id: string }[] | null)?.length) entry.done += 1;
    byDate.set(row.date, entry);
  }

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    const entry = byDate.get(key);
    if (!entry) break;
    if (entry.done / entry.total < 0.8) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
