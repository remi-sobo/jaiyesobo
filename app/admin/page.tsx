import { requireAdmin } from "@/lib/session";
import { hasDriveConnection } from "@/lib/google/drive";
import ConnectDrive from "@/components/me/connect-drive";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ drive_connected?: string; drive_error?: string }>;
};

export default async function AdminPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { drive_error } = await searchParams;
  const connected = await hasDriveConnection();

  return (
    <main className="max-w-[960px] mx-auto px-6 py-16">
      <div className="pb-6 mb-8 border-b border-[var(--color-line)]">
        <div className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-2">
          Admin · Signed in
        </div>
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl font-semibold tracking-tight">
          Plan the <span className="italic font-normal text-[var(--color-red)]">week.</span>
        </h1>
      </div>

      <div className="mb-10">
        <div className="flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[0.7rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] mb-4">
          <span className="w-8 h-px bg-[var(--color-red)]" />
          Integrations
        </div>
        <ConnectDrive connected={connected} error={drive_error ?? null} />
      </div>

      <div className="p-6 rounded border border-[var(--color-line)] bg-[var(--color-warm-surface)]">
        <p className="text-[var(--color-warm-mute)] leading-relaxed">
          The full admin dashboard (week planner, uploads queue, Ask Dad inbox, template shelf) lands next session.
          For now you&apos;re authenticated — session cookie is live.
        </p>
      </div>
    </main>
  );
}
