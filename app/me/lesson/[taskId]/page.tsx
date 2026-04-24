import type { Metadata } from "next";
import Link from "next/link";
import { requireKid } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { getJaiye } from "@/lib/data";
import { getLesson } from "@/lib/lessons";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Jaiye · Lesson",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ taskId: string }> };

export default async function LessonPage({ params }: Props) {
  const { taskId } = await params;
  await requireKid(`/me/lesson/${taskId}`);
  const jaiye = await getJaiye();
  if (!jaiye) redirect("/me");

  const supa = createServiceClient();
  const { data: task, error } = await supa
    .from("tasks")
    .select("id, title, user_id, completion_type, lesson_slug, completions(id, deleted_at)")
    .eq("id", taskId)
    .maybeSingle();

  if (error || !task) return <NotReady message="This lesson isn't ready yet. Tell Dad." />;
  if (task.user_id !== jaiye.id) redirect("/me");
  if (task.completion_type !== "lesson" || !task.lesson_slug) {
    return <NotReady message="This task isn't a lesson." />;
  }

  const activeCompletion =
    (task.completions as { id: string; deleted_at: string | null }[] | null)?.find((c) => !c.deleted_at) ?? null;
  if (activeCompletion) return <AlreadyDone />;

  const lesson = getLesson(task.lesson_slug);
  if (!lesson) return <NotReady message="This lesson isn't ready yet. Tell Dad." />;

  const LessonComponent = lesson.component;
  return <LessonComponent taskId={task.id} />;
}

function NotReady({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-3xl tracking-[-0.02em] mb-3">
        Hmm.
      </h1>
      <p className="text-[var(--color-warm-bone)] italic font-[family-name:var(--font-fraunces)] mb-8 max-w-[40ch]">
        {message}
      </p>
      <Link
        href="/me"
        className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors"
      >
        Back to Today
      </Link>
    </main>
  );
}

function AlreadyDone() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-3xl tracking-[-0.02em] mb-3">
        You already <span className="italic font-normal text-[var(--color-red)]">finished this one.</span>
      </h1>
      <p className="text-[var(--color-warm-bone)] italic font-[family-name:var(--font-fraunces)] mb-8 max-w-[40ch]">
        Want to see your answers? Ask Dad — they&apos;re in his inbox.
      </p>
      <Link
        href="/me"
        className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-soft)] transition-colors"
      >
        Back to Today
      </Link>
    </main>
  );
}
