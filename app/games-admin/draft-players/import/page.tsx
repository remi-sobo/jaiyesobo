import Link from "next/link";
import { getAllDraftTeams } from "@/lib/draft-data";
import DraftImportForm from "@/components/games-admin/draft-import-form";

export const dynamic = "force-dynamic";

export default async function DraftImportPage() {
  const teams = await getAllDraftTeams();
  return (
    <main className="max-w-[900px] mx-auto px-6 lg:px-10 py-12">
      <div className="mb-8">
        <Link
          href="/games-admin/draft-players"
          className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
        >
          ← All teams
        </Link>
      </div>
      <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(1.75rem,3.5vw,2.5rem)] tracking-[-0.02em] leading-tight mb-3">
        Bulk import <span className="italic font-normal text-[var(--color-red)]">players.</span>
      </h1>
      <p className="text-[var(--color-warm-mute)] mb-10 max-w-[60ch] leading-relaxed">
        Paste a JSON array of players from <code className="font-[family-name:var(--font-jetbrains)] text-[var(--color-bone)]">data/draft-players-pending/&lt;team&gt;.json</code>.
        Existing player names for the chosen team are skipped automatically (idempotent).
      </p>

      <DraftImportForm
        teams={teams.map((t) => ({
          slug: t.draft_team_slug,
          label: `${t.payload.city} ${t.payload.name} (${t.payload.abbreviation})`,
        }))}
      />
    </main>
  );
}
