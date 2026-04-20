import { createServiceClient } from "@/lib/supabase/server";
import { subjectKeyFor, type SubjectKey } from "@/lib/subjects";

export type PhotoEntry = {
  completion_id: string;
  task_id: string;
  task_title: string;
  subject: string | null;
  type: string;
  subjectKey: SubjectKey;
  completed_at: string;
  month: string; // "April 2026"
  drive_id: string;
  thumbnail: string | null;
};

const MONTH_FMT: Intl.DateTimeFormatOptions = { month: "long", year: "numeric" };

export async function getAllPhotos(userId: string): Promise<PhotoEntry[]> {
  const supa = createServiceClient();
  const { data, error } = await supa
    .from("completions")
    .select(
      "id, completed_at, photo_drive_ids, photo_thumbnails, tasks!inner(id, title, subject, type, user_id)"
    )
    .order("completed_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    completed_at: string;
    photo_drive_ids: string[] | null;
    photo_thumbnails: string[] | null;
    tasks: { id: string; title: string; subject: string | null; type: string; user_id: string };
  }[];

  const out: PhotoEntry[] = [];
  for (const r of rows) {
    if (r.tasks.user_id !== userId) continue;
    const ids = r.photo_drive_ids ?? [];
    const thumbs = r.photo_thumbnails ?? [];
    for (let i = 0; i < ids.length; i++) {
      const d = new Date(r.completed_at);
      out.push({
        completion_id: r.id,
        task_id: r.tasks.id,
        task_title: r.tasks.title,
        subject: r.tasks.subject,
        type: r.tasks.type,
        subjectKey: subjectKeyFor(r.tasks.subject, r.tasks.type),
        completed_at: r.completed_at,
        month: d.toLocaleDateString("en-US", MONTH_FMT),
        drive_id: ids[i],
        thumbnail: thumbs[i] ?? null,
      });
    }
  }
  return out;
}
