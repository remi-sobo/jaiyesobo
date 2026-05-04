import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireKid } from "@/lib/session";
import { getJaiye } from "@/lib/data";
import { createServiceClient } from "@/lib/supabase/server";
import TaskDetail from "@/components/me/task-detail";
import type { Task } from "@/lib/data";

export const metadata: Metadata = {
  title: "Jaiye · Task",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ taskId: string }> };

export default async function TaskPage({ params }: Props) {
  const { taskId } = await params;
  await requireKid(`/me/task/${taskId}`);
  const jaiye = await getJaiye();
  if (!jaiye) redirect("/me");

  const supa = createServiceClient();
  const { data: row, error } = await supa
    .from("tasks")
    .select("*, completions(id, completed_at, reflection, deleted_at, photo_thumbnails)")
    .eq("id", taskId)
    .maybeSingle();
  if (error || !row) redirect("/me");
  if (row.user_id !== jaiye.id) redirect("/me");

  const allCompletions = (row.completions ?? []) as {
    id: string;
    completed_at: string;
    reflection: string | null;
    deleted_at: string | null;
    photo_thumbnails: string[] | null;
  }[];
  const active = allCompletions.filter((c) => !c.deleted_at)[0] ?? null;

  const { completions: _drop, ...rest } = row as typeof row & { completions: unknown };
  void _drop;
  const task = { ...(rest as Omit<Task, "completion">), completion: active } as Task;

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)] text-[var(--color-bone)]">
      <TaskDetail task={task} />
    </div>
  );
}
