import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GameShell from "@/components/games/game-shell";
import GoatRosterGame from "@/components/games/goat-roster/goat-roster-game";
import { getDraftTeamBySlug, getPlayersForTeam } from "@/lib/draft-data";
import { toRosterPlayer, type RosterPlayer } from "@/lib/goat-roster";

type Props = { params: Promise<{ teamSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { teamSlug } = await params;
  const team = await getDraftTeamBySlug(teamSlug);
  if (!team) return { title: "Not found — Jaiye's Games" };
  const label = `${team.payload.city} ${team.payload.name}`;
  return {
    title: `Build the ${label} GOAT Roster — Jaiye's Games`,
    description: `Pick 5 starters from the all-time ${label} pool. AI scores your lineup.`,
  };
}

export const dynamic = "force-dynamic";

export default async function GoatRosterTeamPage({ params }: Props) {
  const { teamSlug } = await params;
  const team = await getDraftTeamBySlug(teamSlug);
  if (!team) return notFound();

  const all = await getPlayersForTeam(teamSlug);
  const verified = all.filter((p) => p.verification_status === "verified" && p.status === "live");
  const pool: RosterPlayer[] = verified.map((r) => toRosterPlayer(r.id, r.payload));

  if (pool.length < 5) {
    return (
      <GameShell>
        <main className="max-w-[640px] mx-auto px-6 py-24 text-center">
          <h1 className="font-[family-name:var(--font-fraunces)] font-semibold text-2xl mb-3">
            This pool isn&apos;t ready yet.
          </h1>
          <p className="text-[var(--color-mute)] mb-8">
            Need at least 5 verified players. {team.payload.city} {team.payload.name} has {pool.length}.
          </p>
          <Link
            href="/games/goat-roster"
            className="bg-[var(--color-red)] text-[var(--color-bone)] font-[family-name:var(--font-jetbrains)] text-xs uppercase tracking-[0.2em] px-6 py-3.5 rounded-sm hover:bg-[var(--color-red-bright)] transition-colors"
          >
            ← Pick another team
          </Link>
        </main>
      </GameShell>
    );
  }

  return (
    <GameShell liveLabel={`Building · ${team.payload.abbreviation}`}>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-8">
        <Link
          href="/games/goat-roster"
          className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)] hover:text-[var(--color-bone)] transition-colors"
        >
          ← Pick a different team
        </Link>
      </div>
      <GoatRosterGame teamSlug={teamSlug} team={team.payload} pool={pool} />
    </GameShell>
  );
}
