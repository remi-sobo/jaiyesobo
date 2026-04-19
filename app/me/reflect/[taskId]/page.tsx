import { notFound, redirect } from "next/navigation";
import { requireKid } from "@/lib/session";
import { createServiceClient } from "@/lib/supabase/server";
import { calculateStreak } from "@/lib/streak";
import { getJaiye } from "@/lib/data";
import ReflectionFlow from "@/components/me/reflection-flow";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ taskId: string }> };

export default async function ReflectPage({ params }: PageProps) {
  await requireKid();
  const { taskId } = await params;

  const jaiye = await getJaiye();
  if (!jaiye) notFound();

  const supa = createServiceClient();
  const { data: task } = await supa
    .from("tasks")
    .select("id, title, description, subject, completion_type, reflection_prompt, user_id, completions(id)")
    .eq("id", taskId)
    .maybeSingle();

  if (!task) notFound();
  if (task.user_id !== jaiye.id) notFound();
  if (task.completion_type !== "reflection") {
    redirect(
      task.completion_type === "photo" || task.completion_type === "photo_and_reflection"
        ? `/me/upload/${task.id}`
        : "/me"
    );
  }
  if (((task.completions ?? []) as { id: string }[]).length > 0) {
    redirect("/me");
  }

  const streak = await calculateStreak(jaiye.id);

  return (
    <ReflectionFlow
      task={{
        id: task.id,
        title: task.title,
        description: task.description,
        subject: task.subject,
        reflection_prompt: task.reflection_prompt,
      }}
      streak={streak}
    />
  );
}
