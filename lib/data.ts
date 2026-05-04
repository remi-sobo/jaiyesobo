import { createServiceClient } from "@/lib/supabase/server";

export type CompletionType = "photo" | "reflection" | "check" | "photo_and_reflection" | "lesson";

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
  lesson_slug: string | null;
  scheduled_time: string | null;
  scheduled_end_time: string | null;
  estimated_minutes: number | null;
  sort_order: number;
  completion: { id: string; completed_at: string; reflection: string | null } | null;
};

export type DadNote = { id: string; date: string; body: string };

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getJaiye() {
  // Now that there's more than one kid, filter by display_name explicitly.
  // Pre-Phase 3 this used `.eq("role", "kid").limit(1)`, which would
  // non-deterministically return either kid once Kemi exists.
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("users")
    .select("id, display_name, role")
    .eq("role", "kid")
    .eq("display_name", "Jaiye")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTasksForDay(userId: string, date: string): Promise<Task[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("tasks")
    .select("*, completions(id, completed_at, reflection, deleted_at)")
    .eq("user_id", userId)
    .eq("date", date)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const allCompletions = (row.completions ?? []) as {
      id: string;
      completed_at: string;
      reflection: string | null;
      deleted_at: string | null;
    }[];
    // Only count active (non-deleted) completions as "done"
    const active = allCompletions.filter((c) => !c.deleted_at);
    const { completions: _drop, ...rest } = row as typeof row & { completions: unknown };
    void _drop;
    return { ...(rest as Omit<Task, "completion">), completion: active[0] ?? null };
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

