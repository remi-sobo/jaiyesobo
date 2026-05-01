import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GameShell from "@/components/games/game-shell";
import DraftGame from "@/components/games/draft/draft-game";
import { getDraftTeamBySlug } from "@/lib/draft-data";

type Props = { params: Promise<{ teamSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { teamSlug } = await params;
  const team = await getDraftTeamBySlug(teamSlug);
  if (!team) return { title: "Not found — Jaiye's Games" };
  const label = `${team.payload.city} ${team.payload.name}`;
  return {
    title: `Draft the ${label} — Jaiye's Games`,
    description: `Snake draft 5 starters from the all-time ${label} pool. Beat the AI.`,
  };
}

export const dynamic = "force-dynamic";

export default async function DraftTeamGamePage({ params }: Props) {
  const { teamSlug } = await params;
  const team = await getDraftTeamBySlug(teamSlug);
  if (!team) return notFound();

  return (
    <GameShell liveLabel={`Drafting · ${team.payload.abbreviation}`}>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-8">
        <Link
          href="/games/draft"
          className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)] hover:text-[var(--color-bone)] transition-colors"
        >
          ← Pick a different team
        </Link>
      </div>
      <DraftGame teamSlug={teamSlug} team={team.payload} />
    </GameShell>
  );
}
