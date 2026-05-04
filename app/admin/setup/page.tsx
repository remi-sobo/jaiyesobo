import { requireAdmin } from "@/lib/session";
import { getAllKids } from "@/lib/admin-context";
import SeedKemiPanel from "@/components/admin/seed-kemi-panel";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  await requireAdmin();
  const kids = await getAllKids();
  const kemiExists = kids.some((k) => k.display_name.toLowerCase() === "kemi");

  return (
    <main className="p-8 lg:p-10 pb-24 max-w-[960px]">
      <div className="pb-6 mb-8 border-b border-[var(--color-line)]">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.2em] text-[var(--color-warm-mute)] mb-2">
          Admin · Setup
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-3xl tracking-[-0.02em]">
          Setup<span className="italic font-normal text-[var(--color-red)]">.</span>
        </h1>
        <p className="text-[var(--color-warm-mute)] mt-3 max-w-[60ch] leading-relaxed">
          One-time-ish maintenance actions. Safe to run more than once — every
          action here is idempotent.
        </p>
      </div>

      <SeedKemiPanel />

      <div className="mt-6 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)]">
        {kemiExists
          ? "✓ Kemi user exists — re-running step 1 will skip; steps 2 and 3 are still re-runnable."
          : "Kemi user not yet created — run step 1 first."}
      </div>
    </main>
  );
}
