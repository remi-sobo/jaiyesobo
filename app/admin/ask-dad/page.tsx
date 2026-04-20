import { requireAdmin } from "@/lib/session";
import { ensureJaiye, getQuestions } from "@/lib/admin-data";
import AskDadQueue from "@/components/admin/ask-dad-queue";

export const dynamic = "force-dynamic";

export default async function AskDadPage() {
  await requireAdmin();
  const jaiye = await ensureJaiye();
  const questions = await getQuestions(jaiye.id, 90);

  const pending = questions.filter((q) => q.status === "pending");
  const answered = questions.filter((q) => q.status === "answered");

  return (
    <main className="p-8 lg:p-10 pb-24 max-w-[880px]">
      <div className="pb-6 mb-8 border-b border-[var(--color-line)]">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
          Admin · {pending.length} pending · {answered.length} answered
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-3xl tracking-[-0.02em]">
          Ask <span className="italic font-normal text-[var(--color-red)]">Dad.</span>
        </h1>
      </div>

      <AskDadQueue pending={pending} answered={answered} />
    </main>
  );
}
