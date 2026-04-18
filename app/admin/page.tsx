import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="max-w-[720px] mx-auto px-6 py-16">
      <div className="pb-6 mb-8 border-b border-[var(--color-line)]">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-2">
          Admin · Signed in
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold tracking-tight">
          Plan the <span className="italic font-normal text-[var(--color-red)]">week.</span>
        </h1>
      </div>
      <div className="p-6 rounded border border-[var(--color-line)] bg-[var(--color-warm-surface)]">
        <p className="text-[var(--color-warm-mute)] leading-relaxed">
          The admin dashboard (week planner, uploads queue, Ask Dad inbox, template shelf) lands next session.
          For now you&apos;re authenticated — session cookie is live.
        </p>
      </div>
    </main>
  );
}
