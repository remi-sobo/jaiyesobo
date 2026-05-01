import Link from "next/link";
import { notFound } from "next/navigation";
import { getDraftTeamBySlug, getPlayersForTeam } from "@/lib/draft-data";
import DraftTeamDetail from "@/components/games-admin/draft-team-detail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ teamSlug: string }> };

export default async function DraftTeamPage({ params }: Props) {
  const { teamSlug } = await params;
  const team = await getDraftTeamBySlug(teamSlug);
  if (!team) return notFound();
  const players = await getPlayersForTeam(teamSlug);

  const counts = {
    total: players.length,
    pending: players.filter((p) => p.verification_status === "pending").length,
    verified: players.filter((p) => p.verification_status === "verified").length,
    rejected: players.filter((p) => p.verification_status === "rejected").length,
  };

  return (
    <main className="max-w-[1200px] mx-auto px-6 lg:px-10 py-12">
      <div className="mb-6">
        <Link
          href="/games-admin/draft-players"
          className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] uppercase tracking-[0.25em] text-[var(--color-warm-mute)] hover:text-[var(--color-bone)] transition-colors"
        >
          ← All teams
        </Link>
      </div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8 pb-8 border-b border-[var(--color-line)]">
        <div>
          <div
            className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] mb-2"
            style={{ color: team.payload.primary_color }}
          >
            {team.payload.abbreviation} · est. {team.payload.founded}
          </div>
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-[clamp(2rem,4vw,3rem)] tracking-[-0.02em] leading-tight">
            {team.payload.city} {team.payload.name}
          </h1>
          <div className="flex gap-4 mt-3 font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.2em]">
            <span className="text-[var(--color-bone)]">{counts.total} total</span>
            <span className="text-[var(--color-amber)]">{counts.pending} pending</span>
            <span className="text-[var(--color-green)]">{counts.verified} verified</span>
            {counts.rejected > 0 && (
              <span className="text-[var(--color-red-soft)]">{counts.rejected} rejected</span>
            )}
          </div>
        </div>
        <Link
          href="/games-admin/draft-players/import"
          className="border border-[var(--color-line-strong)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-5 py-3 rounded-sm hover:border-[var(--color-bone)] transition-colors text-center whitespace-nowrap"
        >
          + Import more
        </Link>
      </div>

      <DraftTeamDetail teamSlug={teamSlug} initial={players} />
    </main>
  );
}
