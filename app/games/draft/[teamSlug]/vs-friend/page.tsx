import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GameShell from "@/components/games/game-shell";
import LocalDraftGame from "@/components/games/draft/local-draft-game";
import { getDraftTeamBySlug } from "@/lib/draft-data";

type Props = { params: Promise<{ teamSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { teamSlug } = await params;
  const team = await getDraftTeamBySlug(teamSlug);
  if (!team) return { title: "Not found — Jaiye's Games" };
  const label = `${team.payload.city} ${team.payload.name}`;
  return {
    title: `${label} 2-player draft — Jaiye's Games`,
    description: `Two players, one franchise. Snake draft from the all-time ${label} pool.`,
  };
}

export const dynamic = "force-dynamic";

export default async function DraftFriendPage({ params }: Props) {
  const { teamSlug } = await params;
  const team = await getDraftTeamBySlug(teamSlug);
  if (!team) return notFound();

  return (
    <GameShell liveLabel={`2P · ${team.payload.abbreviation}`}>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-8">
        <Link
          href="/games/draft?mode=friend"
          className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] uppercase tracking-[0.25em] text-[var(--color-mute)] hover:text-[var(--color-bone)] transition-colors"
        >
          ← Pick a different team
        </Link>
      </div>
      <LocalDraftGame teamSlug={teamSlug} team={team.payload} />
    </GameShell>
  );
}
