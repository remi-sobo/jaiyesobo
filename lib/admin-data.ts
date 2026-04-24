import { createServiceClient } from "@/lib/supabase/server";
import { isoDate, weekDays, addDays, today } from "@/lib/week";
import { getJaiye, type Task } from "@/lib/data";

export type DayBucket = {
  date: string;
  label: string;
  shortLabel: string;
  isToday: boolean;
  isWeekend: boolean;
  tasks: Task[];
};

export type WeekStatus = { status: "draft" | "published"; published_at: string | null };

export async function getWeekTasks(userId: string, weekStart: Date): Promise<DayBucket[]> {
  const days = weekDays(weekStart);
  const supa = createServiceClient();
  const startIso = isoDate(days[0]);
  const endIso = isoDate(days[6]);

  const { data, error } = await supa
    .from("tasks")
    .select("*, completions(id, completed_at, reflection, deleted_at)")
    .eq("user_id", userId)
    .gte("date", startIso)
    .lte("date", endIso)
    .order("date", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const byDate = new Map<string, Task[]>();
  for (const row of data ?? []) {
    const allCompletions = (row.completions ?? []) as {
      id: string;
      completed_at: string;
      reflection: string | null;
      deleted_at: string | null;
    }[];
    const active = allCompletions.filter((c) => !c.deleted_at);
    const { completions: _c, ...rest } = row as typeof row & { completions: unknown };
    void _c;
    const task: Task = { ...(rest as Omit<Task, "completion">), completion: active[0] ?? null };
    const arr = byDate.get(task.date) ?? [];
    arr.push(task);
    byDate.set(task.date, arr);
  }

  const todayIsoStr = isoDate(today());
  return days.map((d) => {
    const iso = isoDate(d);
    return {
      date: iso,
      label: d.toLocaleDateString("en-US", { weekday: "long" }),
      shortLabel: d.toLocaleDateString("en-US", { weekday: "short" }),
      isToday: iso === todayIsoStr,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      tasks: byDate.get(iso) ?? [],
    };
  });
}

export async function getWeekStatus(weekStartDate: string): Promise<WeekStatus> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("week_status")
    .select("status, published_at")
    .eq("week_start_date", weekStartDate)
    .maybeSingle();
  if (error) throw error;
  return data ?? { status: "draft", published_at: null };
}

export async function getWeeklyBrief(weekStartDate: string): Promise<string> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("weekly_briefs")
    .select("body_markdown")
    .eq("week_start_date", weekStartDate)
    .maybeSingle();
  if (error) throw error;
  return data?.body_markdown ?? "";
}

export async function getDadNoteBody(date: string): Promise<string> {
  const supa = createServiceClient();
  const { data, error } = await supa.from("dad_notes").select("body").eq("date", date).maybeSingle();
  if (error) throw error;
  return data?.body ?? "";
}

export type PendingUpload = {
  completion_id: string;
  task_id: string;
  task_title: string;
  subject: string | null;
  type: string;
  completed_at: string;
  date: string;
  photo_drive_ids: string[];
  photo_thumbnails: string[];
  reflection: string | null;
  reviewed_at: string | null;
};

export async function getPendingUploads(userId: string, daysBack = 2): Promise<PendingUpload[]> {
  const supa = createServiceClient();
  const since = isoDate(addDays(today(), -daysBack));
  const { data, error } = await supa
    .from("completions")
    .select(
      "id, completed_at, reviewed_at, photo_drive_ids, photo_thumbnails, reflection, tasks!inner(id, title, subject, type, user_id, date)"
    )
    .gte("completed_at", `${since}T00:00:00`)
    .order("completed_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    completed_at: string;
    reviewed_at: string | null;
    photo_drive_ids: string[] | null;
    photo_thumbnails: string[] | null;
    reflection: string | null;
    tasks: { id: string; title: string; subject: string | null; type: string; user_id: string; date: string };
  }[];

  return rows
    .filter((r) => r.tasks.user_id === userId)
    .filter((r) => (r.photo_drive_ids ?? []).length > 0)
    .map((r) => ({
      completion_id: r.id,
      task_id: r.tasks.id,
      task_title: r.tasks.title,
      subject: r.tasks.subject,
      type: r.tasks.type,
      completed_at: r.completed_at,
      date: r.tasks.date,
      photo_drive_ids: r.photo_drive_ids ?? [],
      photo_thumbnails: r.photo_thumbnails ?? [],
      reflection: r.reflection,
      reviewed_at: r.reviewed_at,
    }));
}

export type LessonCompletion = {
  completion_id: string;
  task_id: string;
  task_title: string;
  subject: string | null;
  lesson_slug: string | null;
  completed_at: string;
  responses: Record<string, unknown>;
  reviewed_at: string | null;
};

export async function getLessonCompletions(userId: string, daysBack = 60): Promise<LessonCompletion[]> {
  const supa = createServiceClient();
  const since = isoDate(addDays(today(), -daysBack));
  const { data, error } = await supa
    .from("completions")
    .select(
      "id, completed_at, reviewed_at, lesson_responses, deleted_at, tasks!inner(id, title, subject, user_id, completion_type, lesson_slug)"
    )
    .gte("completed_at", `${since}T00:00:00`)
    .order("completed_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    completed_at: string;
    reviewed_at: string | null;
    lesson_responses: Record<string, unknown> | null;
    deleted_at: string | null;
    tasks: {
      id: string;
      title: string;
      subject: string | null;
      user_id: string;
      completion_type: string;
      lesson_slug: string | null;
    };
  }[];

  return rows
    .filter((r) => r.tasks.user_id === userId)
    .filter((r) => !r.deleted_at)
    .filter((r) => r.tasks.completion_type === "lesson" && r.lesson_responses)
    .map((r) => ({
      completion_id: r.id,
      task_id: r.tasks.id,
      task_title: r.tasks.title,
      subject: r.tasks.subject,
      lesson_slug: r.tasks.lesson_slug,
      completed_at: r.completed_at,
      responses: r.lesson_responses ?? {},
      reviewed_at: r.reviewed_at,
    }));
}

export type Question = {
  id: string;
  asked_by: string;
  body: string;
  asked_at: string;
  answered_at: string | null;
  answer: string | null;
  status: "pending" | "answered";
  seen_at: string | null;
};

export async function getQuestions(userId: string, sinceDays = 30): Promise<Question[]> {
  const supa = createServiceClient();
  const since = isoDate(addDays(today(), -sinceDays));
  const { data, error } = await supa
    .from("questions")
    .select("*")
    .eq("asked_by", userId)
    .gte("asked_at", `${since}T00:00:00`)
    .order("asked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Question[];
}

/** For the kid Today page: the one unread answered question to surface, if any. */
export async function getUnseenAnswer(userId: string): Promise<Question | null> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("questions")
    .select("*")
    .eq("asked_by", userId)
    .eq("status", "answered")
    .is("seen_at", null)
    .order("answered_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Question | null) ?? null;
}

export async function getSidebarCounts(userId: string) {
  const supa = createServiceClient();
  const [uploads, asks, feedback] = await Promise.all([
    getPendingUploads(userId, 2),
    (async () => {
      const { count } = await supa
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("asked_by", userId)
        .eq("status", "pending");
      return count ?? 0;
    })(),
    (async () => {
      try {
        const { count } = await supa
          .from("feedback")
          .select("id", { count: "exact", head: true })
          .eq("submitted_by", userId)
          .eq("status", "new")
          .is("archived_at", null);
        return count ?? 0;
      } catch {
        return 0;
      }
    })(),
  ]);
  return {
    uploadsCount: uploads.filter((u) => !u.reviewed_at).length,
    pendingQuestions: asks,
    newFeedback: feedback,
  };
}

export type FeedbackEntry = {
  id: string;
  body: string;
  kind: "bug" | "idea" | "unsure" | null;
  page_url: string | null;
  user_agent: string | null;
  submitted_at: string;
  status: "new" | "in_progress" | "fixed" | "closed";
  dad_reply: string | null;
  dad_replied_at: string | null;
  seen_by_kid_at: string | null;
  archived_at: string | null;
};

export async function getFeedback(userId: string, limit = 100): Promise<FeedbackEntry[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("feedback")
    .select("*")
    .eq("submitted_by", userId)
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FeedbackEntry[];
}

export type UnseenDadReply = {
  kind: "question" | "feedback";
  id: string;
  body: string;
  reply: string;
  replied_at: string;
};

/** Feedback reply that the kid hasn't seen yet. */
export async function getUnseenFeedbackReply(userId: string): Promise<UnseenDadReply | null> {
  try {
    const supa = createServiceClient();
    const { data, error } = await supa
      .from("feedback")
      .select("id, body, dad_reply, dad_replied_at")
      .eq("submitted_by", userId)
      .is("seen_by_kid_at", null)
      .not("dad_reply", "is", null)
      .order("dad_replied_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data || !data.dad_reply) return null;
    return {
      kind: "feedback",
      id: data.id,
      body: data.body,
      reply: data.dad_reply,
      replied_at: data.dad_replied_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Return the set of weekStart dates that are published.
 * Used by the kid Today page to filter out tasks whose weeks are still draft.
 */
export async function isDatePublished(date: string): Promise<boolean> {
  // Compute week start for this date
  const d = new Date(`${date}T00:00:00`);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  const ws = isoDate(d);

  const supa = createServiceClient();
  const { data, error } = await supa
    .from("week_status")
    .select("status")
    .eq("week_start_date", ws)
    .maybeSingle();
  if (error) throw error;
  return data?.status === "published";
}

export async function ensureJaiye() {
  const j = await getJaiye();
  if (!j) throw new Error("Jaiye user not found — run npx tsx scripts/seed.ts");
  return j;
}
