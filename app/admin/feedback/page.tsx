import { requireAdmin } from "@/lib/session";
import { ensureJaiye, getFeedback } from "@/lib/admin-data";
import FeedbackList from "@/components/admin/feedback-list";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  await requireAdmin();
  const jaiye = await ensureJaiye();
  const items = await getFeedback(jaiye.id, 200);

  const newCount = items.filter((i) => i.status === "new" && !i.archived_at).length;

  return (
    <main className="p-8 lg:p-10 pb-24 max-w-[960px]">
      <div className="pb-6 mb-8 border-b border-[var(--color-line)]">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
          Admin · {newCount} new · {items.length} total
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-3xl tracking-[-0.02em]">
          Feedback from <span className="italic font-normal text-[var(--color-red)]">Jaiye.</span>
        </h1>
      </div>

      <FeedbackList items={items} />
    </main>
  );
}
