import { createServiceClient } from "@/lib/supabase/server";

export type CompletionType = "photo" | "reflection" | "check" | "photo_and_reflection";

export type Task = {
  id: string;
  user_id: string;
  date: string;
  title: string;
  description: string | null;
  type: "homeschool" | "habit" | "chore" | "ball" | "family" | "other";
  subject: string | null;
  link: string | null;
  requires_photo: boolean;
  completion_type: CompletionType;
  reflection_prompt: string | null;
  sort_order: number;
  completion: { id: string; completed_at: string; reflection: string | null } | null;
};

export type DadNote = { id: string; date: string; body: string };

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getJaiye() {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("users")
    .select("id, display_name, role")
    .eq("role", "kid")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTasksForDay(userId: string, date: string): Promise<Task[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("tasks")
    .select("*, completions(id, completed_at, reflection)")
    .eq("user_id", userId)
    .eq("date", date)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const completions = (row.completions ?? []) as {
      id: string;
      completed_at: string;
      reflection: string | null;
    }[];
    const { completions: _drop, ...rest } = row as typeof row & { completions: unknown };
    void _drop;
    return { ...(rest as Omit<Task, "completion">), completion: completions[0] ?? null };
  });
}

export async function getDadNoteForDay(date: string): Promise<DadNote | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("dad_notes")
    .select("id, date, body")
    .eq("date", date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPendingQuestionCount(userId: string): Promise<number> {
  const supa = createServiceClient();
  const { count, error } = await supa
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("asked_by", userId)
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

/**
 * Consecutive days (walking back from today) where ≥80% of tasks were completed.
 * Today counts only if it's already at ≥80%.
 */
export async function getStreak(userId: string): Promise<number> {
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
